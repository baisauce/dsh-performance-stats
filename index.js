/**
 * Host half of the performance panel.
 *
 * Reads every stored conversation through `sessionQuery` (live-preferred),
 * folds committed provider usage into session and daily buckets, samples the
 * Host process once per explicit refresh, and serves two routes to the panel:
 *
 *   GET /api/performance-stats/snapshot      sessions, daily buckets, runtime
 *   GET /api/performance-stats/plan          cached Qianwen Token Plan reading
 *   GET /api/performance-stats/plan?refresh=1  run the qianwen CLI once
 *
 * The panel never polls. The snapshot route reuses unchanged persisted logs by
 * revision, and the plan route never starts the CLI without `refresh=1`.
 *
 * @module dsh-performance-stats
 */

import { buildSnapshot, applyFoldEvent, createFoldState, finishFold } from './lib/fold.js'
import { sampleCpu } from './lib/cpu.js'
import { queryPlan } from './lib/qwen.js'

/** Stable Cordis plugin name. */
export const name = 'dsh-performance-stats'

/** The Web carrier owns the route registry this prefix lives in. */
export const inject = ['webServer']

/** Exact route prefix inside the Host Web server. */
export const ROUTE_PREFIX = '/api/performance-stats'

/** Upper bound on stored conversations read in one refresh. */
const MAX_SESSIONS = 500

/** Concurrent stored-log reads. */
const READ_CONCURRENCY = 4

/** Whether one `agent/status` payload describes a running turn. */
function isRunning(status) {
  if (typeof status === 'string') return status === 'running'
  if (status !== null && typeof status === 'object') {
    const kind = status.kind ?? status.status
    if (typeof kind === 'string') return kind === 'running'
  }
  return false
}

/** Run `fn` over `items` with bounded concurrency, preserving input order. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

/** List stored conversations through whichever session service this profile mounts. */
async function listStoredSessions(ctx) {
  const query = ctx.get('sessionQuery')
  if (query !== undefined && typeof query.listSessions === 'function') {
    const records = await query.listSessions()
    return {
      source: 'sessionQuery',
      records: records.map((record) => ({
        id: String(record.header?.id ?? ''),
        live: record.live === true,
        header: record.header,
      })),
    }
  }

  const persistence = ctx.get('sessionPersistence')
  if (persistence !== undefined && typeof persistence.list === 'function') {
    const snapshots = await persistence.list({})
    return {
      source: 'sessionPersistence',
      records: snapshots.map((snapshot) => ({
        id: String(snapshot.header?.id ?? ''),
        live: false,
        header: snapshot.header,
      })),
    }
  }

  return { source: 'none', records: [] }
}

/**
 * Persisted revision per session, used to reuse an unchanged fold.
 * Returns `null` when this profile cannot report revisions.
 */
async function listRevisions(ctx) {
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined || typeof persistence.list !== 'function') return null
  try {
    const snapshots = await persistence.list({})
    const revisions = new Map()
    for (const snapshot of snapshots) {
      const id = snapshot?.header?.id
      if (id === undefined || id === null) continue
      const revision = snapshot.revision
      if (revision === undefined || revision === null) continue
      revisions.set(String(id), String(revision))
    }
    return revisions
  } catch {
    return null
  }
}

/** Read one stored conversation's complete event log. */
async function readStoredSession(ctx, id) {
  const query = ctx.get('sessionQuery')
  if (query !== undefined && typeof query.readSession === 'function') {
    const snapshot = await query.readSession(id)
    return {
      header: snapshot.session ?? snapshot.header ?? {},
      events: snapshot.events ?? [],
      inheritedEventCount: Number(snapshot.inheritedEventCount) || 0,
    }
  }

  const persistence = ctx.get('sessionPersistence')
  if (persistence !== undefined && typeof persistence.open === 'function') {
    const handle = await persistence.open(id, 'read')
    try {
      const result = await handle.read()
      return {
        header: handle.header ?? {},
        events: result.events ?? [],
        inheritedEventCount: Number(handle.inheritedEventCount) || 0,
      }
    } finally {
      await handle.close()
    }
  }

  throw new Error('该 profile 没有挂载会话存储服务')
}

/**
 * Latest folded title for sessions whose log carried no `session/title` event.
 * Operational failures are isolated per session by the query service.
 */
async function readTitles(ctx, ids) {
  const titles = new Map()
  const query = ctx.get('sessionQuery')
  if (ids.length === 0 || query === undefined || typeof query.readTitleSnapshots !== 'function') return titles
  try {
    const results = await query.readTitleSnapshots(ids)
    for (const result of results) {
      if (result?.status !== 'fulfilled') continue
      const title = result.value?.title?.title
      if (typeof title === 'string' && title.length > 0) titles.set(String(result.sessionId), title)
    }
  } catch {
    // A title is cosmetic; the session row still renders with its id.
  }
  return titles
}

/**
 * Folded conversations with a revision-keyed reuse cache.
 *
 * The cache lives in memory and is refreshed only when `collect()` is called by
 * an explicit panel request. There is no TTL and no background scan.
 */
function createSessionCache(ctx, runningIds) {
  /** @type {Map<string, {revision: string | null, fold: object, at: number}>} */
  const entries = new Map()
  /** @type {Promise<object> | null} */
  let inflight = null

  async function collectOnce() {
    const warnings = []
    const listed = await listStoredSessions(ctx)
    const revisions = await listRevisions(ctx)
    if (listed.source === 'none') warnings.push('该 profile 没有挂载会话存储服务，暂时读不到会话日志')

    const available = listed.records.filter((record) => record.id.length > 0)
    if (available.length > MAX_SESSIONS) {
      warnings.push(`已存会话超过 ${MAX_SESSIONS} 个，只统计了最近创建的 ${MAX_SESSIONS} 个`)
    }
    const records = [...available]
      .sort((left, right) => (Number(right.header?.createdAt) || 0) - (Number(left.header?.createdAt) || 0))
      .slice(0, MAX_SESSIONS)
    const recordById = new Map(records.map((record) => [record.id, record]))
    const ids = new Set()
    let scanned = 0
    let reused = 0
    const rows = []

    await mapLimit(records, READ_CONCURRENCY, async (record) => {
      const id = record.id
      ids.add(id)
      const cached = entries.get(id)
      const revision = record.live ? null : revisions?.get(id) ?? null

      if (cached !== undefined && !record.live && revision !== null && cached.revision === revision) {
        reused += 1
        rows.push(cached.fold)
        return
      }

      try {
        const { header, events, inheritedEventCount } = await readStoredSession(ctx, id)
        const normalizedHeader = header !== null && typeof header === 'object' ? { ...header, id: header.id || id } : { id }
        const state = createFoldState({ header: normalizedHeader, inheritedEventCount })
        for (const event of events) applyFoldEvent(state, event)
        const fold = finishFold(state)
        entries.set(id, { revision, fold, at: Date.now() })
        scanned += 1
        rows.push(fold)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`读取会话 ${id.slice(0, 8)} 失败：${message}`)
        if (cached !== undefined) {
          reused += 1
          rows.push(cached.fold)
        }
      }
    })

    // Drop conversations that disappeared from the corpus.
    for (const id of entries.keys()) {
      if (!ids.has(id)) entries.delete(id)
    }

    // Fill titles that no stored title event supplied.
    const missing = rows.filter((row) => typeof row.title !== 'string' || row.title.length === 0).map((row) => String(row.sessionId))
    if (missing.length > 0) {
      const titles = await readTitles(ctx, missing)
      for (const row of rows) {
        const title = titles.get(String(row.sessionId))
        if (title !== undefined) row.title = title
      }
    }

    // Availability is current, not part of the cached fold.
    for (const row of rows) {
      const record = recordById.get(String(row.sessionId))
      if (record !== undefined) {
        row.live = record.live
        row.running = runningIds.get(String(row.sessionId)) === true
      }
    }

    return { rows, source: listed.source, scanned, reused, warnings }
  }

  return {
    collect() {
      if (inflight !== null) return inflight
      inflight = collectOnce().finally(() => {
        inflight = null
      })
      return inflight
    },
    clear() {
      entries.clear()
    },
  }
}

/** Write one JSON response, tolerating a client that already went away. */
function sendJson(res, status, value) {
  if (res.destroyed || res.writableEnded) return
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

/**
 * Mount the two routes, the availability tracker, and teardown.
 *
 * @param {object} ctx
 */
export function apply(ctx) {
  const runningIds = new Map()

  ctx.on('agent/status', (payload) => {
    const id = payload?.agent?.id
    if (id === undefined || id === null) return
    runningIds.set(String(id), isRunning(payload.status))
  })

  ctx.on('agent/disposed', (payload) => {
    const id = payload?.agent?.id
    if (id !== undefined && id !== null) runningIds.delete(String(id))
  })

  ctx.on('session/disposed', (session) => {
    const id = session?.id
    if (id !== undefined && id !== null) runningIds.delete(String(id))
  })

  const cache = createSessionCache(ctx, runningIds)
  ctx.effect(() => () => cache.clear(), 'dsh-performance-stats: session cache')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const sub = url.pathname.startsWith(ROUTE_PREFIX)
          ? url.pathname.slice(ROUTE_PREFIX.length) || '/'
          : url.pathname
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'method-not-allowed' })
          return
        }

        if (sub === '/snapshot') {
          // Sample the process first, so the reading describes the refresh itself.
          const cpu = await sampleCpu({ sampleMs: 300 })
          const result = await cache.collect()
          const snapshot = buildSnapshot({
            sessions: result.rows,
            generatedAt: Date.now(),
            source: result.source,
            scanned: result.scanned,
            reused: result.reused,
            live: result.rows.filter((row) => row.live === true).length,
            running: result.rows.filter((row) => row.running === true).length,
            warnings: result.warnings,
            cpu,
          })
          sendJson(res, 200, snapshot)
          return
        }

        if (sub === '/plan') {
          const force = url.searchParams.get('refresh') === '1'
          sendJson(res, 200, await queryPlan(force))
          return
        }

        sendJson(res, 404, { error: 'not-found', path: sub })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger?.warn?.(`[dsh-performance-stats] route failed: ${message}`)
        sendJson(res, 500, { error: message })
      }
    },
  }), 'dsh-performance-stats: HTTP routes')
}