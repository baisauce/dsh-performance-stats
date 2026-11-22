/**
 * One-shot CPU / memory sampling for the manual performance refresh.
 *
 * This module deliberately starts no interval. A sample only exists while a
 * snapshot request is being answered, so the panel performs no background work
 * between user clicks.
 *
 * @module dsh-performance-stats/cpu
 */

import os from 'node:os'

/** Resolve after one delay. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Snapshot per-core CPU times, or an empty list when the platform exposes none. */
function cpuTimes() {
  const cpus = os.cpus()
  if (!Array.isArray(cpus) || cpus.length === 0) return []
  return cpus.map((cpu) => ({ ...cpu.times }))
}

/** Summed busy and total milliseconds across two per-core snapshots. */
function deltas(before, after) {
  let idle = 0
  let total = 0
  const length = Math.min(before.length, after.length)
  for (let index = 0; index < length; index += 1) {
    const left = before[index]
    const right = after[index]
    const idleDelta = (right.idle ?? 0) - (left.idle ?? 0)
    const totalDelta =
      ((right.user ?? 0) - (left.user ?? 0)) +
      ((right.nice ?? 0) - (left.nice ?? 0)) +
      ((right.sys ?? 0) - (left.sys ?? 0)) +
      ((right.irq ?? 0) - (left.irq ?? 0)) +
      idleDelta
    idle += Math.max(0, idleDelta)
    total += Math.max(0, totalDelta)
  }
  return { idle, total }
}

/** Round to one decimal place without pulling in a formatting dependency. */
function oneDecimal(value) {
  return Math.round(Number(value) * 10) / 10
}

/**
 * Sample process and system utilization over a short window.
 *
 * The process figure is single-core equivalent (100% = one full core), while
 * the system figure is the whole machine's busy share.
 *
 * @param {{sampleMs?: number}} [options]
 */
export async function sampleCpu({ sampleMs = 300 } = {}) {
  const startedAt = Date.now()
  const processStart = process.cpuUsage()
  const systemStart = cpuTimes()
  await delay(sampleMs)
  const processDelta = process.cpuUsage(processStart)
  const systemEnd = cpuTimes()
  const elapsed = Math.max(1, Date.now() - startedAt)
  const { idle, total } = deltas(systemStart, systemEnd)

  const processPercent = ((processDelta.user + processDelta.system) / 1000 / elapsed) * 100
  const systemPercent = total > 0 ? (1 - idle / total) * 100 : 0
  const memory = process.memoryUsage()
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const load = os.loadavg()

  return {
    sampledAt: Date.now(),
    sampleMs: elapsed,
    processPercent: oneDecimal(Math.max(0, processPercent)),
    systemPercent: oneDecimal(Math.min(100, Math.max(0, systemPercent))),
    cores: os.cpus().length || null,
    load1: Number.isFinite(load[0]) ? oneDecimal(load[0]) : null,
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      systemUsed: Math.max(0, totalMemory - freeMemory),
      systemTotal: totalMemory,
    },
    pid: process.pid,
    node: process.version,
    uptimeSec: Math.round(process.uptime()),
  }
}