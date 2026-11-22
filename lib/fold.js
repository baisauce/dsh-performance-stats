/**
 * Pure session-log folding for the performance panel.
 *
 * The Host feeds committed Session events in here; the browser receives the
 * finished snapshot. Nothing in this module touches Cordis, the filesystem, the
 * network, or the clock, so the same numbers can be reproduced offline.
 *
 * Token counts come from the provider's own `assistant/message.usage` and
 * `compaction/summary.usage` records. Nothing is estimated.
 *
 * @module dsh-performance-stats/fold
 */

/** Snapshot payload version. Bump together with the Client's SNAPSHOT_API. */
export const SNAPSHOT_API = 1

/** Token buckets carried through every fold and aggregate. */
export const BUCKETS = ['input', 'output', 'cacheRead', 'cacheWrite']

/**
 * Events that represent conversation work.
 *
 * Bookkeeping events are written when a Session is reopened, so they must not
 * move a conversation's "last active" time.
 */
const ACTIVITY_TYPES = new Set([
  'turn/start',
  'turn/end',
  'step/start',
  'step/end',
  'user/message',
  'assistant/message',
  'tool/call',
  'tool/result',
  'compaction/summary',
])

/** Local calendar day of one epoch-millisecond timestamp, as `YYYY-MM-DD`. */
export function dayKey(time) {
  const date = new Date(time)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** @returns {{input: number, output: number, cacheRead: number, cacheWrite: number}} */
export function emptyTokens() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

/** Sum of every token bucket. */
export function totalOf(tokens) {
  let sum = 0
  for (const bucket of BUCKETS) sum += Number(tokens?.[bucket]) || 0
  return sum
}

/** Copy a token record, defaulting missing buckets to zero. */
export function copyTokens(tokens) {
  const copy = emptyTokens()
  for (const bucket of BUCKETS) copy[bucket] = Number(tokens?.[bucket]) || 0
  return copy
}

/** Add one token record into another in place. */
function addInto(target, source) {
  for (const bucket of BUCKETS) target[bucket] = (target[bucket] ?? 0) + (Number(source?.[bucket]) || 0)
}

/** Display name of a workspace from its directory. */
export function workspaceName(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return null
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  return parts.length === 0 ? null : parts[parts.length - 1]
}

/** `provider/model` identity, or a stable placeholder. */
function modelIdOf(provider, model) {
  const left = typeof provider === 'string' && provider.length > 0 ? provider : 'unknown'
  const right = typeof model === 'string' && model.length > 0 ? model : 'unknown'
  return `${left}/${right}`
}

/** Tool categories used by the detailed time breakdown. */
export const TOOL_CATEGORIES = ['command', 'file', 'network', 'agent', 'other']

/** Coarse category of one tool name, for the time breakdown. */
export function toolCategoryOf(name) {
  const tool = String(name ?? '').toLowerCase()
  if (tool === '') return 'other'
  if (/^(pwsh|bash|run_code|terminal_|terminal$|job_)/.test(tool)) return 'command'
  if (/^(read|write|edit|apply_patch|grep|glob|read_image|office_)/.test(tool)) return 'file'
  if (/^(web_search|web_fetch)$/.test(tool)) return 'network'
  if (/^(subagent|subagent_fork|wait_agent|send_message|list_agents|workflow|spawn_teammate|team_task_|ask_user_question)/.test(tool)) return 'agent'
  return 'other'
}

/** First and last stream timestamps (epoch ms) of one assistant step. */
function streamSpan(stream) {
  let first = null
  let last = null
  for (const record of Array.isArray(stream) ? stream : []) {
    if (record === null || typeof record !== 'object') continue
    const start = typeof record.time0 === 'number' ? record.time0 : typeof record.time === 'number' ? record.time : null
    if (start === null) continue
    const deltas = Array.isArray(record.dt) ? record.dt : null
    const end = deltas === null ? start : start + deltas.reduce((sum, delta) => sum + (Number(delta) || 0), 0)
    if (first === null || start < first) first = start
    if (last === null || end > last) last = end
  }
  return { first, last }
}

/** Normalize one `TokenUsage` record into bucket names. */
function usageBuckets(usage) {
  return {
    input: Number(usage?.inputTokens) || 0,
    output: Number(usage?.outputTokens) || 0,
    cacheRead: Number(usage?.cacheReadTokens) || 0,
    cacheWrite: Number(usage?.cacheWriteTokens) || 0,
  }
}

/**
 * Create the mutable state for one session fold.
 *
 * `inheritedEventCount` is the size of a fork's inherited prefix. Inherited
 * records still carry a title and a model context, but their tokens, turns and
 * wall time belong to the parent conversation and are not counted again here.
 *
 * @param {{header: object, inheritedEventCount?: number, live?: boolean, running?: boolean}} input
 */
export function createFoldState({ header, inheritedEventCount = 0, live = false, running = false }) {
  const createdAt = typeof header?.createdAt === 'number' ? header.createdAt : null
  return {
    sessionId: String(header?.id ?? ''),
    title: null,
    cwd: typeof header?.cwd === 'string' ? header.cwd : null,
    origin: header?.origin === 'subagent' ? 'subagent' : 'session',
    parentSessionId: typeof header?.parentSession === 'string' ? header.parentSession : null,
    createdAt,
    inheritedEventCount: Math.max(0, Number(inheritedEventCount) || 0),
    live,
    running,
    tokens: emptyTokens(),
    /** @type {Map<string, {id: string, provider: string, model: string, tokens: object}>} */
    models: new Map(),
    /** @type {Map<string, object>} */
    days: new Map(),
    current: null,
    turns: 0,
    closedTurns: 0,
    failedTurns: 0,
    steps: 0,
    toolCalls: 0,
    toolErrors: 0,
    userMessages: 0,
    requests: 0,
    compactionTokens: 0,
    activeMs: 0,
    toolMs: 0,
    modelMs: 0,
    outputTokens: 0,
    ttftMs: 0,
    ttftCount: 0,
    decodeMs: 0,
    toolMsByCategory: { command: 0, file: 0, network: 0, agent: 0, other: 0 },
    firstAt: createdAt,
    lastAt: null,
    /** @type {Map<number, number>} */
    openTurns: new Map(),
    /** @type {Map<string, number>} */
    openSteps: new Map(),
    /** @type {Map<string, number>} */
    openCalls: new Map(),
  }
}

/** Get or create one local-day bucket for this session. */
function dayEntryOf(state, time) {
  const key = dayKey(time)
  let day = state.days.get(key)
  if (!day) {
    day = {
      day: key,
      tokens: emptyTokens(),
      turns: 0,
      closedTurns: 0,
      steps: 0,
      toolCalls: 0,
      toolErrors: 0,
      requests: 0,
      userMessages: 0,
      outputTokens: 0,
      activeMs: 0,
      toolMs: 0,
      modelMs: 0,
      ttftMs: 0,
      ttftCount: 0,
      decodeMs: 0,
      toolMsByCategory: { command: 0, file: 0, network: 0, agent: 0, other: 0 },
    }
    state.days.set(key, day)
  }
  return day
}

/** Attribute one usage record to this session, its model, and its local day. */
function addUsage(state, usage, time, provider, model, forSpeed = true) {
  const buckets = usageBuckets(usage)
  addInto(state.tokens, buckets)
  if (forSpeed) state.outputTokens += buckets.output
  state.requests += 1

  const id = modelIdOf(provider, model)
  let entry = state.models.get(id)
  if (!entry) {
    entry = {
      id,
      provider: typeof provider === 'string' && provider.length > 0 ? provider : 'unknown',
      model: typeof model === 'string' && model.length > 0 ? model : 'unknown',
      tokens: emptyTokens(),
    }
    state.models.set(id, entry)
  }
  addInto(entry.tokens, buckets)

  if (typeof time === 'number' && time > 0) {
    const day = dayEntryOf(state, time)
    addInto(day.tokens, buckets)
    day.requests += 1
    if (forSpeed) day.outputTokens += buckets.output
  }
}

/** Whether an event belongs to this session's own (not inherited) history. */
function isOwned(state, event) {
  if (state.inheritedEventCount <= 0) return true
  const seq = Number(event?.seq)
  return Number.isFinite(seq) ? seq >= state.inheritedEventCount : true
}

/**
 * Fold one committed Session event into `state`.
 *
 * Unknown event types are ignored, so a newer Session format degrades instead
 * of throwing. The function mutates and returns the same state reference.
 *
 * @param {ReturnType<typeof createFoldState>} state
 * @param {object} event
 */
export function applyFoldEvent(state, event) {
  if (!event || typeof event.type !== 'string') return state
  const time = typeof event.time === 'number' && event.time > 0 ? event.time : null
  const data = event.data ?? {}

  // Titles and model context can be inherited from a fork's prefix and remain
  // useful for naming and attribution.
  if (event.type === 'session/title') {
    if (typeof data.title === 'string' && data.title.length > 0) state.title = data.title
    return state
  }
  if (event.type === 'model/selection' || event.type === 'request/context') {
    if (typeof data.provider === 'string' || typeof data.model === 'string') {
      state.current = { provider: data.provider, model: data.model }
    }
    return state
  }

  if (!isOwned(state, event)) return state

  if (time !== null) {
    if (state.firstAt === null || time < state.firstAt) state.firstAt = time
    if (ACTIVITY_TYPES.has(event.type) && (state.lastAt === null || time > state.lastAt)) {
      state.lastAt = time
    }
  }

  switch (event.type) {
    case 'turn/start': {
      state.turns += 1
      if (typeof data.turn === 'number') {
        state.openTurns.set(data.turn, time ?? state.lastAt ?? 0)
      }
      if (time !== null) dayEntryOf(state, time).turns += 1
      break
    }
    case 'turn/end': {
      state.closedTurns += 1
      const reasonKind = data.reason?.kind
      if (typeof reasonKind === 'string' && reasonKind !== 'completed') state.failedTurns += 1
      const started = typeof data.turn === 'number' ? state.openTurns.get(data.turn) : undefined
      if (typeof started === 'number') {
        const closed = time ?? state.lastAt
        if (typeof closed === 'number' && closed >= started) {
          const elapsed = closed - started
          state.activeMs += elapsed
          if (time !== null) {
            const day = dayEntryOf(state, time)
            day.closedTurns += 1
            day.activeMs += elapsed
          }
        } else if (time !== null) {
          dayEntryOf(state, time).closedTurns += 1
        }
        state.openTurns.delete(data.turn)
      } else if (time !== null) {
        dayEntryOf(state, time).closedTurns += 1
      }
      break
    }
    case 'step/start': {
      state.steps += 1
      if (typeof data.turn === 'number' && typeof data.step === 'number') {
        state.openSteps.set(`${data.turn}:${data.step}`, time ?? state.lastAt ?? 0)
      }
      if (time !== null) dayEntryOf(state, time).steps += 1
      break
    }
    case 'step/end': {
      if (typeof data.turn === 'number' && typeof data.step === 'number') {
        state.openSteps.delete(`${data.turn}:${data.step}`)
      }
      break
    }
    case 'user/message': {
      state.userMessages += 1
      if (time !== null) dayEntryOf(state, time).userMessages += 1
      break
    }
    case 'tool/call': {
      state.toolCalls += 1
      if (typeof data.callId === 'string') {
        state.openCalls.set(data.callId, { time: time ?? state.lastAt ?? 0, name: data.name })
      }
      if (time !== null) dayEntryOf(state, time).toolCalls += 1
      break
    }
    case 'tool/result': {
      const callId = typeof data.callId === 'string' ? data.callId : data.message?.toolCallId
      if (typeof callId === 'string') {
        const started = state.openCalls.get(callId)
        if (started !== undefined && time !== null && time >= started.time) {
          const elapsed = time - started.time
          const category = toolCategoryOf(started.name)
          state.toolMs += elapsed
          state.toolMsByCategory[category] = (state.toolMsByCategory[category] ?? 0) + elapsed
          const day = dayEntryOf(state, time)
          day.toolMs += elapsed
          day.toolMsByCategory[category] = (day.toolMsByCategory[category] ?? 0) + elapsed
        }
        state.openCalls.delete(callId)
      }
      const failed = data.error != null || data.message?.isError === true
      if (failed) {
        state.toolErrors += 1
        if (time !== null) dayEntryOf(state, time).toolErrors += 1
      }
      break
    }
    case 'assistant/message': {
      const source = data.message?.source ?? {}
      const provider = source.provider ?? state.current?.provider
      const model = source.model ?? state.current?.model
      if (data.usage) addUsage(state, data.usage, time, provider, model)
      if (typeof data.turn === 'number' && typeof data.step === 'number') {
        const key = `${data.turn}:${data.step}`
        const started = state.openSteps.get(key)
        if (typeof started === 'number' && time !== null && time >= started) {
          const elapsed = time - started
          state.modelMs += elapsed
          const day = dayEntryOf(state, time)
          day.modelMs += elapsed
          const span = streamSpan(data.stream)
          if (span.first !== null && span.first >= started) {
            const ttft = span.first - started
            state.ttftMs += ttft
            state.ttftCount += 1
            day.ttftMs += ttft
            day.ttftCount += 1
            if (span.last !== null && span.last >= span.first) {
              const decode = span.last - span.first
              state.decodeMs += decode
              day.decodeMs += decode
            }
          }
        }
        state.openSteps.delete(key)
      }
      break
    }
    case 'compaction/summary': {
      if (data.usage) {
        const buckets = usageBuckets(data.usage)
        state.compactionTokens += totalOf(buckets)
        addUsage(state, data.usage, time, data.provider ?? state.current?.provider, data.model ?? state.current?.model, false)
      }
      break
    }
    default:
      break
  }
  return state
}

/**
 * Project one fold state into the serializable session row sent to the panel.
 *
 * @param {ReturnType<typeof createFoldState>} state
 */
export function finishFold(state) {
  const models = [...state.models.values()]
    .map((entry) => {
      const tokens = copyTokens(entry.tokens)
      return { id: entry.id, provider: entry.provider, model: entry.model, tokens, totalTokens: totalOf(tokens) }
    })
    .sort((left, right) => right.totalTokens - left.totalTokens)

  const days = [...state.days.values()]
    .map((day) => {
      const tokens = copyTokens(day.tokens)
      return {
        day: day.day,
        tokens,
        tokenTotal: totalOf(tokens),
        turns: day.turns,
        closedTurns: day.closedTurns,
        steps: day.steps,
        toolCalls: day.toolCalls,
        toolErrors: day.toolErrors,
        requests: day.requests,
        userMessages: day.userMessages,
        outputTokens: day.outputTokens,
        activeMs: Math.round(day.activeMs),
        toolMs: Math.round(day.toolMs),
        modelMs: Math.round(day.modelMs),
        ttftMs: Math.round(day.ttftMs),
        ttftCount: day.ttftCount,
        decodeMs: Math.round(day.decodeMs),
        toolMsByCategory: Object.fromEntries(TOOL_CATEGORIES.map((key) => [key, Math.round(day.toolMsByCategory[key] ?? 0)])),
      }
    })
    .sort((left, right) => (left.day < right.day ? -1 : 1))

  const tokens = copyTokens(state.tokens)
  const tokenTotal = totalOf(tokens)
  const avgTurnMs = state.closedTurns > 0 ? state.activeMs / state.closedTurns : null
  const outputPerSec = state.modelMs > 0 ? state.outputTokens / (state.modelMs / 1000) : null

  return {
    sessionId: state.sessionId,
    title: state.title,
    cwd: state.cwd,
    workspace: workspaceName(state.cwd),
    origin: state.origin,
    parentSessionId: state.parentSessionId,
    createdAt: state.createdAt,
    firstAt: state.firstAt,
    lastAt: state.lastAt ?? state.createdAt,
    live: state.live === true,
    running: state.running === true,
    tokens,
    tokenTotal,
    model: models.length > 0 ? models[0].id : null,
    models,
    days,
    turns: state.turns,
    closedTurns: state.closedTurns,
    failedTurns: state.failedTurns,
    steps: state.steps,
    toolCalls: state.toolCalls,
    toolErrors: state.toolErrors,
    userMessages: state.userMessages,
    requests: state.requests,
    compactionTokens: state.compactionTokens,
    activeMs: Math.round(state.activeMs),
    toolMs: Math.round(state.toolMs),
    modelMs: Math.round(state.modelMs),
    ttftMs: Math.round(state.ttftMs),
    ttftCount: state.ttftCount,
    decodeMs: Math.round(state.decodeMs),
    toolMsByCategory: Object.fromEntries(TOOL_CATEGORIES.map((key) => [key, Math.round(state.toolMsByCategory[key] ?? 0)])),
    outputTokens: state.outputTokens,
    avgTurnMs: avgTurnMs === null ? null : Math.round(avgTurnMs),
    outputPerSec: outputPerSec === null ? null : Math.round(outputPerSec * 10) / 10,
  }
}

/** Fold one session's event list into a finished row. */
export function foldSession({ header, events, inheritedEventCount = 0, live = false, running = false }) {
  const state = createFoldState({ header, inheritedEventCount, live, running })
  for (const event of events) applyFoldEvent(state, event)
  return finishFold(state)
}

/**
 * Build the whole panel snapshot from finished session rows.
 *
 * @param {object} input
 * @param {Array<object>} input.sessions
 * @param {number} input.generatedAt
 * @param {string} input.source
 * @param {number} input.scanned
 * @param {number} input.reused
 * @param {number} input.live
 * @param {number} input.running
 * @param {string[]} input.warnings
 * @param {object|null} input.cpu
 */
export function buildSnapshot({ sessions, generatedAt, source, scanned, reused, live, running, warnings, cpu }) {
  const totals = emptyTokens()
  /** @type {Map<string, object>} */
  const dayMap = new Map()
  /** @type {Map<string, object>} */
  const modelMap = new Map()
  let turns = 0
  let closedTurns = 0
  let failedTurns = 0
  let steps = 0
  let toolCalls = 0
  let toolErrors = 0
  let userMessages = 0
  let requests = 0
  let compactionTokens = 0
  let activeMs = 0
  let toolMs = 0
  let modelMs = 0
  let outputTokens = 0
  let ttftMs = 0
  let ttftCount = 0
  let decodeMs = 0
  const toolMsByCategory = { command: 0, file: 0, network: 0, agent: 0, other: 0 }

  for (const session of sessions) {
    addInto(totals, session.tokens)
    turns += session.turns
    closedTurns += session.closedTurns
    failedTurns += session.failedTurns
    steps += session.steps
    toolCalls += session.toolCalls
    toolErrors += session.toolErrors
    userMessages += session.userMessages
    requests += session.requests
    compactionTokens += session.compactionTokens
    activeMs += session.activeMs
    toolMs += session.toolMs
    modelMs += session.modelMs
    outputTokens += session.outputTokens
    ttftMs += session.ttftMs
    ttftCount += session.ttftCount
    decodeMs += session.decodeMs
    for (const key of TOOL_CATEGORIES) toolMsByCategory[key] += session.toolMsByCategory?.[key] ?? 0

    for (const model of session.models) {
      let bucket = modelMap.get(model.id)
      if (!bucket) {
        bucket = {
          id: model.id,
          provider: model.provider,
          model: model.model,
          tokens: emptyTokens(),
          totalTokens: 0,
          sessions: 0,
        }
        modelMap.set(model.id, bucket)
      }
      addInto(bucket.tokens, model.tokens)
      bucket.totalTokens += model.totalTokens
      bucket.sessions += 1
    }

    for (const day of session.days) {
      let bucket = dayMap.get(day.day)
      if (!bucket) {
        bucket = {
          day: day.day,
          tokens: emptyTokens(),
          tokenTotal: 0,
          sessions: new Set(),
          turns: 0,
          closedTurns: 0,
          steps: 0,
          toolCalls: 0,
          toolErrors: 0,
          requests: 0,
          userMessages: 0,
          outputTokens: 0,
          activeMs: 0,
          toolMs: 0,
          modelMs: 0,
          ttftMs: 0,
          ttftCount: 0,
          decodeMs: 0,
          toolMsByCategory: { command: 0, file: 0, network: 0, agent: 0, other: 0 },
        }
        dayMap.set(day.day, bucket)
      }
      addInto(bucket.tokens, day.tokens)
      bucket.tokenTotal += day.tokenTotal
      bucket.sessions.add(session.sessionId)
      bucket.turns += day.turns
      bucket.closedTurns += day.closedTurns
      bucket.steps += day.steps
      bucket.toolCalls += day.toolCalls
      bucket.toolErrors += day.toolErrors
      bucket.requests += day.requests
      bucket.userMessages += day.userMessages
      bucket.outputTokens += day.outputTokens
      bucket.activeMs += day.activeMs
      bucket.toolMs += day.toolMs
      bucket.modelMs += day.modelMs
      bucket.ttftMs += day.ttftMs ?? 0
      bucket.ttftCount += day.ttftCount ?? 0
      bucket.decodeMs += day.decodeMs ?? 0
      for (const key of TOOL_CATEGORIES) bucket.toolMsByCategory[key] += day.toolMsByCategory?.[key] ?? 0
    }
  }

  const days = [...dayMap.values()]
    .map((day) => ({
      day: day.day,
      tokens: copyTokens(day.tokens),
      tokenTotal: day.tokenTotal,
      sessions: day.sessions.size,
      turns: day.turns,
      closedTurns: day.closedTurns,
      steps: day.steps,
      toolCalls: day.toolCalls,
      toolErrors: day.toolErrors,
      requests: day.requests,
      userMessages: day.userMessages,
      outputTokens: day.outputTokens,
      activeMs: day.activeMs,
      toolMs: day.toolMs,
      modelMs: day.modelMs,
      ttftMs: day.ttftMs,
      ttftCount: day.ttftCount,
      decodeMs: day.decodeMs,
      toolMsByCategory: { ...day.toolMsByCategory },
    }))
    .sort((left, right) => (left.day < right.day ? -1 : 1))

  const models = [...modelMap.values()].sort((left, right) => right.totalTokens - left.totalTokens)
  const sortedSessions = [...sessions].sort((left, right) => (right.lastAt ?? 0) - (left.lastAt ?? 0))
  const totalTokens = totalOf(totals)
  const avgTurnMs = closedTurns > 0 ? activeMs / closedTurns : null
  const outputPerSec = modelMs > 0 ? outputTokens / (modelMs / 1000) : null

  return {
    api: SNAPSHOT_API,
    generatedAt,
    todayKey: dayKey(generatedAt),
    source,
    scanned,
    reused,
    warnings: Array.isArray(warnings) ? warnings : [],
    totals: {
      tokens: copyTokens(totals),
      tokenTotal: totalTokens,
      sessions: sortedSessions.length,
      live: live ?? sortedSessions.filter((session) => session.live).length,
      running: running ?? sortedSessions.filter((session) => session.running).length,
      turns,
      closedTurns,
      failedTurns,
      steps,
      toolCalls,
      toolErrors,
      userMessages,
      requests,
      compactionTokens,
      activeMs,
      toolMs,
      modelMs,
      outputTokens,
      ttftMs,
      ttftCount,
      decodeMs,
      toolMsByCategory,
      avgTurnMs: avgTurnMs === null ? null : Math.round(avgTurnMs),
      outputPerSec: outputPerSec === null ? null : Math.round(outputPerSec * 10) / 10,
    },
    days,
    models,
    sessions: sortedSessions,
    cpu: cpu ?? null,
  }
}