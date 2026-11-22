window.__ModuleLoader__.load({
  id: 'dsh-performance-stats',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'performance'
    const NS = 'dsh-performance-stats'
    const SNAPSHOT_URL = '/api/performance-stats/snapshot'
    const PLAN_URL = '/api/performance-stats/plan'
    const SNAPSHOT_API = 1
    const DAY_MS = 86_400_000

    const BUCKETS = ['input', 'cacheRead', 'cacheWrite', 'output']
    const toolCategoryKeys = ['command', 'file', 'network', 'agent', 'other']
    const BUCKET_LABELS = {
      input: 'chart.legend.input',
      output: 'chart.legend.output',
      cacheRead: 'chart.legend.cacheRead',
      cacheWrite: 'chart.legend.cacheWrite',
    }
    const BUCKET_COLORS = {
      input: 'var(--perf-blue)',
      output: 'var(--perf-green)',
      cacheRead: 'var(--perf-amber)',
      cacheWrite: 'var(--perf-amber2)',
    }

    const EN = {
      'panel.title': 'Performance',
      'panel.subtitle': 'Updated {time} · {sessions} conversations · source {source}',
      'panel.never': 'Not loaded yet',
      'panel.manual': 'Updates only when you open this panel or press Refresh',
      'panel.refresh': 'Refresh',
      'panel.refreshing': 'Refreshing…',
      'panel.refreshHint': 'Refresh conversation data and the Qianwen quota',
      'panel.refreshHintBusy': 'Refresh conversation data; the quota query is already running',
      'panel.scanned': 'scanned {n} logs',
      'panel.reused': 'reused {n}',
      'panel.loading': 'Reading conversation logs…',
      'panel.loadingHint': 'The first refresh scans every stored log; later refreshes only read what changed.',
      'panel.warnings': 'Some data could not be read ({n})',
      'panel.range.today': 'Today',
      'panel.range.7d': '7 days',
      'panel.range.30d': '30 days',
      'panel.range.all': 'All',
      'panel.sourceFallback': 'session storage',
      'unit.tokens': 'tokens',
      'unit.credits': 'Credits',
      'unit.perTurn': 'per turn',
      'unit.tokPerSec': 'tok/s',
      'unit.steps': 'steps',

      'kpi.today': "Today's usage",
      'kpi.todayHint': '{input} input · {output} output · {cache} cache read',
      'kpi.todayDetail': '{requests} requests · {turns} turns · {sessions} conversations',
      'kpi.total': 'Usage in range',
      'kpi.totalHint': '{input} input · {output} output · {cache} cache read',
      'kpi.totalDetail': '{sessions} conversations · {turns} turns · {tools} tool calls',
      'kpi.perf': 'Performance',
      'kpi.perfHint': 'Average turn {duration} · tool error rate {rate}',
      'kpi.perfDetail': '{speed} output · {running} running',
      'kpi.plan': 'Qianwen Token Plan',
      'kpi.planHint': '{plan} · {used}% used',
      'kpi.planDetail': 'Resets {date} · {days} days left',
      'kpi.planUpdated': 'Updated {time}',
      'kpi.planNotLoaded': 'Not queried',
      'kpi.planLoading': 'Querying…',
      'kpi.planFailed': 'Query failed',
      'kpi.planQuery': 'Query quota',
      'kpi.planRetry': 'Retry',
      'kpi.planRefresh': 'Update quota',
      'kpi.planSlow': 'qianwen CLI usually takes 20–40 s',
      'kpi.planUsedOf': 'Used {used} of {total} Credits',
      'kpi.planNote': 'The plan quota is counted in Credits, separately from session tokens.',
      'kpi.planUnavailable': 'Quota unavailable',
      'kpi.planPrevious': 'Showing the last successful reading',

      'chart.timeline': 'Token usage timeline',
      'chart.requests': '{n} requests',
      'chart.legend.input': 'Input',
      'chart.legend.output': 'Output',
      'chart.legend.cacheRead': 'Cache read',
      'chart.legend.cacheWrite': 'Cache write',
      'chart.empty': 'No token usage in this range yet.',
      'chart.peak': 'Peak {date} · {tokens}',
      'chart.selected': '{date} · {tokens} tokens · {sessions} conversations · {turns} turns',
      'chart.perMillion': 'Per 1M tokens',

      'daily.title': 'Daily usage',
      'daily.hint': 'Newest first',
      'daily.row': '{sessions} conversations · {turns} turns',
      'daily.empty': 'No daily usage yet.',

      'time.title': 'Time composition',
      'time.model': 'Model calls',
      'time.tool': 'Tool execution',
      'time.wait': 'Waiting & other',
      'time.total': '{duration} active',
      'time.avgTurn': 'Avg turn {duration}',
      'time.avgDay': 'Per active day {duration}',
      'time.empty': 'No timed activity in this range yet.',
      'time.ttft': 'Cloud TTFT (network RTT + service queue)',
      'time.ttftAvg': 'avg {duration}',
      'time.decode': 'Cloud decode (streaming generation)',
      'time.modelOther': 'Cloud scheduling & retries',
      'time.cmd': 'Local commands (pwsh / run_code)',
      'time.file': 'Local file & search I/O',
      'time.network': 'Internet tools (web_search / web_fetch)',
      'time.agent': 'Subagents & waiting',
      'time.otherTool': 'Other tools',
      'time.cloudGroup': 'Cloud model calls',
      'time.localGroup': 'Local tool execution',
      'time.waitGroup': 'Waiting & other',
      'chart.topDays': 'top {n} days by usage',
      'time.memPressure': 'Memory pressure {pct} ({used} / {total})',
      'chart.mode.typical': 'Typical',
      'chart.mode.browse': 'Each day',
      'chart.hitRate': 'Cache hit {pct}',
      'dist.title': 'Workspace & subagents',
      'dist.subShare': 'Subagents {pct} of tokens',
      'dist.main': 'Main sessions',
      'dist.sub': 'Subagents',
      'dist.workspaces': 'By workspace',
      'dist.other': 'Other workspaces',
      'dist.none': 'No workspace',
      'dist.empty': 'No token usage in this range yet.',

      'runtime.title': 'Runtime',
      'runtime.process': 'Process CPU',
      'runtime.system': 'System CPU',
      'runtime.memory': 'Memory (RSS)',
      'runtime.systemMemory': 'System memory',
      'runtime.running': 'Running conversations',
      'runtime.runningOf': '{running} / {total} conversations',
      'runtime.heap': 'Heap {used} / {total}',
      'runtime.cores': 'CPU cores',
      'runtime.sampled': 'Sampled {ms} ms on refresh · no background sampling',
      'runtime.sampledAt': 'Sampled at {time}',
      'runtime.empty': 'Runtime sample unavailable.',
      'runtime.load': 'Load 1m',
      'runtime.node': 'Node {version} · PID {pid}',

      'sessions.title': 'Conversation performance',
      'sessions.count': '{n} conversations',
      'sessions.sortedByTokens': 'sorted by tokens, high to low',
      'sessions.search': 'Search title, workspace, or model',
      'sessions.sort.recent': 'Recent',
      'sessions.sort.tokens': 'Tokens',
      'sessions.sort.today': 'Today',
      'sessions.sort.turns': 'Turns',
      'sessions.includeSubagents': 'Include subagents',
      'sessions.col.session': 'Conversation',
      'sessions.col.tokens': 'Range tokens',
      'sessions.col.turns': 'Turns',
      'sessions.col.tools': 'Tools',
      'sessions.col.avg': 'Avg turn',
      'sessions.avgHint': 'Wall time per turn, including tools and waiting',
      'sessions.col.today': 'Today',
      'sessions.col.last': 'Last active',
      'sessions.empty': 'No conversations match this filter.',
      'sessions.subagent': 'Subagent',
      'sessions.running': 'Running',
      'sessions.open': 'Open conversation',
      'sessions.turnsSub': '{n} steps',
      'sessions.toolsSub': '{rate} errors',
      'sessions.speedSub': '{speed} tok/s',
      'sessions.speedHint': 'Estimated from model-call wall time',
      'sessions.unknownTitle': 'Untitled conversation',
      'sessions.unknownWorkspace': 'No workspace',
      'sessions.noModel': 'Unknown model',
      'sessions.lastJustNow': 'just now',
      'sessions.minutesAgo': '{n}m ago',
      'sessions.hoursAgo': '{n}h ago',
      'sessions.yesterday': 'Yesterday',

      'error.title': 'Could not load performance data',
      'error.retry': 'Retry',
      'error.version': 'The Host returned a snapshot version this panel does not understand. Restart DSH and try again.',
      'error.plan': 'Quota query failed',
      'error.planHint': 'The last successful reading is still shown.',
      'error.planNotAuth': 'Not signed in — run qianwen auth login in a terminal',
      'error.planNoCli': 'Qianwen CLI not found — npm install -g @qianwenai/qianwen-cli@latest',

      'footer.manual': 'No scheduled refresh. Token counts come from committed session logs.',
      'footer.qwen': 'Quota is read on the first panel open and when you press Update quota; the qianwen CLI can take 20–40 s.',
      'common.dash': '—',
    }

    const ZH = {
      'panel.title': '性能统计',
      'panel.subtitle': '更新于 {time} · {sessions} 个会话 · 数据源 {source}',
      'panel.never': '尚未加载',
      'panel.manual': '仅在你打开面板或点击刷新时更新',
      'panel.refresh': '刷新',
      'panel.refreshing': '刷新中…',
      'panel.refreshHint': '刷新会话数据与千问额度',
      'panel.refreshHintBusy': '刷新会话数据；额度查询正在进行',
      'panel.scanned': '已扫描 {n} 份日志',
      'panel.reused': '复用 {n} 份',
      'panel.loading': '正在读取会话日志…',
      'panel.loadingHint': '首次刷新会扫描全部日志，之后只读取有变化的日志。',
      'panel.warnings': '部分数据未能读取（{n}）',
      'panel.range.today': '今天',
      'panel.range.7d': '7 天',
      'panel.range.30d': '30 天',
      'panel.range.all': '全部',
      'panel.sourceFallback': '会话存储',
      'unit.tokens': 'Token',
      'unit.credits': 'Credits',
      'unit.perTurn': '每轮',
      'unit.tokPerSec': 'tok/s',
      'unit.steps': '步',

      'kpi.today': '今日用量',
      'kpi.todayHint': '输入 {input} · 输出 {output} · 缓存读取 {cache}',
      'kpi.todayDetail': '{requests} 次请求 · {turns} 轮 · {sessions} 个会话',
      'kpi.total': '区间总用量',
      'kpi.totalHint': '输入 {input} · 输出 {output} · 缓存读取 {cache}',
      'kpi.totalDetail': '{sessions} 个会话 · {turns} 轮 · {tools} 次工具调用',
      'kpi.perf': '性能概览',
      'kpi.perfHint': '平均每轮 {duration} · 工具错误率 {rate}',
      'kpi.perfDetail': '{speed} 输出 · {running} 个会话运行中',
      'kpi.plan': '千问 Token Plan',
      'kpi.planHint': '{plan} · 已用 {used}%',
      'kpi.planDetail': '{date} 重置 · 剩余 {days} 天',
      'kpi.planUpdated': '更新于 {time}',
      'kpi.planNotLoaded': '未查询',
      'kpi.planLoading': '查询中…',
      'kpi.planFailed': '查询失败',
      'kpi.planQuery': '查询额度',
      'kpi.planRetry': '重试',
      'kpi.planRefresh': '更新额度',
      'kpi.planSlow': 'qianwen CLI 通常需要 20–40 秒',
      'kpi.planUsedOf': '已用 {used} / 共 {total} Credits',
      'kpi.planNote': '套餐额度单位是 Credits，与会话 Token 分开统计。',
      'kpi.planUnavailable': '额度不可用',
      'kpi.planPrevious': '仍显示上一次成功读取的额度',

      'chart.timeline': '用量时间线',
      'chart.requests': '{n} 次请求',
      'chart.legend.input': '输入',
      'chart.legend.output': '输出',
      'chart.legend.cacheRead': '缓存读取',
      'chart.legend.cacheWrite': '缓存写入',
      'chart.empty': '该区间还没有 Token 用量。',
      'chart.peak': '峰值 {date} · {tokens}',
      'chart.selected': '{date} · {tokens} Token · {sessions} 个会话 · {turns} 轮',
      'chart.perMillion': '每 1M Token',

      'daily.title': '每日消耗',
      'daily.hint': '按日期倒序',
      'daily.row': '{sessions} 个会话 · {turns} 轮',
      'daily.empty': '还没有每日用量。',

      'time.title': '耗时构成',
      'time.model': '模型调用',
      'time.tool': '工具执行',
      'time.wait': '等待与其它',
      'time.total': '活跃时长 {duration}',
      'time.avgTurn': '平均每轮 {duration}',
      'time.avgDay': '每个活跃日 {duration}',
      'time.empty': '该区间还没有可统计的耗时。',
      'time.ttft': '云端 TTFT 首字延迟（网络 RTT + 服务端排队）',
      'time.ttftAvg': '平均 {duration}',
      'time.decode': '云端解码 Decode（流式生成）',
      'time.modelOther': '云端调度与重试',
      'time.cmd': '本地命令执行（pwsh / run_code）',
      'time.file': '本地文件与检索 I/O',
      'time.network': '外网工具（web_search / web_fetch）',
      'time.agent': '子智能体与等待',
      'time.otherTool': '其它工具',
      'time.cloudGroup': '云端模型调用',
      'time.localGroup': '本地工具执行',
      'time.waitGroup': '等待与其它',
      'chart.topDays': '取用量最多的 {n} 天',
      'time.memPressure': '内存压力 {pct}（{used} / {total}）',
      'chart.mode.typical': '典型',
      'chart.mode.browse': '遍历',
      'chart.hitRate': '缓存命中 {pct}',
      'dist.title': '工作区 / 子智能体',
      'dist.subShare': '子智能体占 {pct} Token',
      'dist.main': '主会话',
      'dist.sub': '子智能体',
      'dist.workspaces': '按工作区',
      'dist.other': '其它工作区',
      'dist.none': '无工作区',
      'dist.empty': '该区间还没有 Token 用量。',

      'runtime.title': '运行状态',
      'runtime.process': '进程 CPU',
      'runtime.system': '系统 CPU',
      'runtime.memory': '内存（RSS）',
      'runtime.systemMemory': '系统内存',
      'runtime.running': '运行中会话',
      'runtime.runningOf': '{running} / {total} 个会话',
      'runtime.heap': '堆 {used} / {total}',
      'runtime.cores': 'CPU 核心',
      'runtime.sampled': '刷新时采样 {ms} 毫秒 · 无后台采样',
      'runtime.sampledAt': '采样于 {time}',
      'runtime.empty': '暂无运行状态采样。',
      'runtime.load': '1 分钟负载',
      'runtime.node': 'Node {version} · PID {pid}',

      'sessions.title': '会话性能',
      'sessions.count': '{n} 个会话',
      'sessions.sortedByTokens': '按 Token 从多到少',
      'sessions.search': '搜索标题、工作区或模型',
      'sessions.sort.recent': '最近',
      'sessions.sort.tokens': '用量',
      'sessions.sort.today': '今日',
      'sessions.sort.turns': '轮次',
      'sessions.includeSubagents': '含子智能体',
      'sessions.col.session': '会话',
      'sessions.col.tokens': '区间 Token',
      'sessions.col.turns': '轮次',
      'sessions.col.tools': '工具',
      'sessions.col.avg': '平均每轮',
      'sessions.avgHint': '每轮实际耗时，含工具执行与等待',
      'sessions.col.today': '今日',
      'sessions.col.last': '最近活动',
      'sessions.empty': '没有符合条件的会话。',
      'sessions.subagent': '子智能体',
      'sessions.running': '运行中',
      'sessions.open': '打开会话',
      'sessions.turnsSub': '{n} 步',
      'sessions.toolsSub': '{rate} 错误',
      'sessions.speedSub': '{speed} tok/s',
      'sessions.speedHint': '按模型调用耗时估算',
      'sessions.unknownTitle': '未命名会话',
      'sessions.unknownWorkspace': '无工作区',
      'sessions.noModel': '未知模型',
      'sessions.lastJustNow': '刚刚',
      'sessions.minutesAgo': '{n} 分钟前',
      'sessions.hoursAgo': '{n} 小时前',
      'sessions.yesterday': '昨天',

      'error.title': '无法加载性能数据',
      'error.retry': '重试',
      'error.version': 'Host 返回的快照版本与面板不匹配，请重启 DSH 后重试。',
      'error.plan': '额度查询失败',
      'error.planHint': '仍显示上一次成功读取的额度。',
      'error.planNotAuth': '未登录 — 请在终端运行 qianwen auth login',
      'error.planNoCli': '未找到千问 CLI — 请运行 npm install -g @qianwenai/qianwen-cli@latest',

      'footer.manual': '没有定时刷新。Token 数来自会话日志中模型实际返回的用量。',
      'footer.qwen': '首次打开面板或点击「更新额度」时读取额度；qianwen CLI 通常需要 20–40 秒。',
      'common.dash': '—',
    }

    const CSS = `
.perf-root{
  box-sizing:border-box;height:100%;max-height:100%;min-height:0;flex:1 1 auto;overflow-y:auto;overflow-x:hidden;
  background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);
  font-size:13px;line-height:1.45;
  --perf-blue:var(--dsw-alias-brand-primary,#3b82f6);
  --perf-green:var(--dsw-alias-state-success-primary,#22c55e);
  --perf-amber:var(--dsw-alias-state-warn-primary,#d97706);
  --perf-amber2:var(--dsw-alias-state-idle-primary,#94a3b8);
  --perf-red:var(--dsw-alias-state-error-primary,#ef4444);
  --perf-track:color-mix(in srgb,var(--dsw-alias-label-secondary) 14%,transparent);
  --perf-card:var(--dsw-alias-bg-layer-1);
  --perf-border:var(--dsw-alias-border-l1);
  --perf-muted:var(--dsw-alias-label-secondary);
  --perf-tertiary:var(--dsw-alias-label-tertiary);
}
.perf-root::-webkit-scrollbar{width:8px;height:8px}
.perf-root::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 24%,transparent);border-radius:8px}
.perf-shell{max-width:1180px;margin:0 auto;padding:26px 28px 38px;display:flex;flex-direction:column;gap:15px}
.perf-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.perf-header-main{min-width:0}
.perf-title{font-size:21px;font-weight:650;letter-spacing:-.01em;margin:0;line-height:1.25}
.perf-sub{color:var(--perf-muted);font-size:11.5px;margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.perf-sub-sep{opacity:.45}
.perf-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.perf-seg{display:inline-flex;gap:2px;padding:3px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--perf-border);border-radius:9px}
.perf-seg button{
  appearance:none;border:0;background:transparent;color:var(--perf-muted);font:inherit;font-size:11.5px;
  padding:4px 9px;border-radius:6px;cursor:pointer;white-space:nowrap;
}
.perf-seg button:hover{color:var(--dsw-alias-label-primary)}
.perf-seg button[data-active="true"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--perf-border)}
.perf-btn{
  appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  border:1px solid var(--perf-border);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font:inherit;font-size:11.5px;font-weight:550;border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap;
}
.perf-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.perf-btn:disabled{opacity:.55;cursor:default}
.perf-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.perf-btn-primary:hover{filter:brightness(1.05);background:var(--dsw-alias-brand-primary)}
.perf-btn-small{padding:4px 8px;font-size:11px;border-radius:7px}
.perf-spin{animation:perf-spin 1s linear infinite}
@keyframes perf-spin{to{transform:rotate(360deg)}}
.perf-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.perf-card{background:var(--perf-card);border:1px solid var(--perf-border);border-radius:12px;padding:15px 17px;min-width:0}
.perf-kpi{display:flex;flex-direction:column;min-height:132px}
.perf-kpi-label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--perf-muted);font-weight:550}
.perf-kpi-value{font-size:27px;font-weight:650;letter-spacing:-.02em;line-height:1.15;margin-top:9px;display:flex;align-items:baseline;gap:6px;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.perf-kpi-value[data-small="true"]{font-size:22px}
.perf-kpi-unit{font-size:11.5px;font-weight:500;color:var(--perf-tertiary);letter-spacing:0}
.perf-kpi-hint{font-size:11px;color:var(--perf-muted);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.perf-kpi-detail{font-size:10.5px;color:var(--perf-tertiary);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.perf-kpi-spacer{flex:1 1 auto}
.perf-plan-line{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}
.perf-plan-bar{height:5px;border-radius:999px;background:var(--perf-track);overflow:hidden;flex:1 1 auto}
.perf-plan-fill{height:100%;border-radius:999px;background:var(--perf-green)}
.perf-plan-fill[data-tone="warn"]{background:var(--perf-amber)}
.perf-plan-fill[data-tone="error"]{background:var(--perf-red)}
.perf-plan-action{
  appearance:none;border:0;background:transparent;color:var(--dsw-alias-brand-primary);
  font:inherit;font-size:10.5px;font-weight:600;cursor:pointer;padding:0;white-space:nowrap;
}
.perf-plan-action:hover{text-decoration:underline}
.perf-plan-action:disabled{opacity:.5;cursor:default;text-decoration:none}
.perf-plan-error{font-size:10.5px;color:var(--perf-red);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.perf-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:11px}
.perf-card-title{font-size:13px;font-weight:600;letter-spacing:.01em}
.perf-card-sub{font-size:11px;color:var(--perf-tertiary)}
.perf-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:10.5px;color:var(--perf-muted)}
.perf-legend span{display:inline-flex;align-items:center;gap:5px}
.perf-dot{width:7px;height:7px;border-radius:2px;display:inline-block;flex:0 0 auto}
.perf-chart{overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
.perf-chart svg{display:block;width:100%;height:auto;min-width:720px;overflow:visible}
.perf-chart.is-scroll svg{min-width:0;max-width:none}
.perf-chart text{font-family:inherit}
.perf-day-summary{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;border-top:1px solid var(--perf-border);margin-top:11px;padding-top:10px;font-size:11px;color:var(--perf-muted)}
.perf-day-summary b{color:var(--dsw-alias-label-primary);font-weight:600}
.perf-day-summary .perf-split-chip{display:inline-flex;align-items:center;gap:4px}
.perf-split{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(0,.82fr);gap:12px}
.perf-stack{display:flex;flex-direction:column;gap:12px;min-width:0}
.perf-comp-bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:var(--perf-track);margin-top:12px}
.perf-comp-bar span{display:block;height:100%}
.perf-group-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:9px;font-size:10.5px;color:var(--perf-tertiary)}
.perf-group-legend span{display:inline-flex;align-items:center;gap:5px}
.perf-group-legend b{color:var(--perf-muted);font-weight:600;font-variant-numeric:tabular-nums}
.perf-comp-legend{display:flex;flex-direction:column;gap:6px;margin-top:11px;font-size:11px}
.perf-comp-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto 42px;gap:8px;align-items:center}
.perf-comp-row b{font-weight:600;font-variant-numeric:tabular-nums}
.perf-comp-row em{font-style:normal;color:var(--perf-tertiary);text-align:right;font-variant-numeric:tabular-nums}
.perf-comp-foot{display:flex;gap:14px;flex-wrap:wrap;font-size:10.5px;color:var(--perf-tertiary);margin-top:11px;border-top:1px solid var(--perf-border);padding-top:9px}
.perf-dist-split{display:flex;height:6px;border-radius:999px;overflow:hidden;background:var(--perf-track);margin-top:10px}
.perf-dist-split span{display:block;height:100%}
.perf-dist-list{display:flex;flex-direction:column;gap:7px;margin-top:10px;font-size:11px}
.perf-dist-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center}
.perf-dist-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--perf-muted)}
.perf-dist-val{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-weight:550}
.perf-dist-track{grid-column:1/-1;height:4px;border-radius:999px;background:var(--perf-track);overflow:hidden}
.perf-dist-fill{height:100%;border-radius:999px;background:var(--perf-blue)}
.perf-dist-fill[data-tone="sub"]{background:var(--perf-amber)}
.perf-daily{max-height:286px;overflow:auto;display:flex;flex-direction:column;gap:1px;padding-right:2px}
.perf-daily-row{
  appearance:none;display:grid;grid-template-columns:70px minmax(0,1fr) 74px;gap:10px;align-items:center;
  border:0;background:transparent;color:inherit;text-align:left;font:inherit;padding:6px 7px;border-radius:7px;cursor:pointer;width:100%;
}
.perf-daily-row:hover{background:var(--dsw-alias-bg-layer-2)}
.perf-daily-row[data-active="true"]{background:var(--dsw-alias-bg-layer-2)}
.perf-daily-row:focus-visible,.perf-session-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.perf-daily-date{font-size:11px;color:var(--perf-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.perf-daily-bar{height:4px;border-radius:999px;background:var(--perf-track);overflow:hidden;margin-top:4px}
.perf-daily-fill{height:100%;background:var(--perf-blue);border-radius:999px;opacity:.85}
.perf-daily-num{font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.perf-daily-num small{display:block;color:var(--perf-tertiary);font-size:9.5px;font-weight:400;margin-top:1px}
.perf-runtime-top{display:flex;align-items:flex-end;gap:10px;margin-top:2px}
.perf-runtime-big{font-size:32px;font-weight:650;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.perf-runtime-big small{font-size:13px;font-weight:500;color:var(--perf-tertiary);letter-spacing:0;margin-left:2px}
.perf-runtime-label{font-size:10.5px;color:var(--perf-tertiary);padding-bottom:4px}
.perf-runtime-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-top:13px}
.perf-gauge-label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--perf-muted)}
.perf-gauge-label b{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}
.perf-gauge-track{height:4px;border-radius:999px;background:var(--perf-track);overflow:hidden;margin-top:5px}
.perf-gauge-fill{height:100%;border-radius:999px;background:var(--perf-blue)}
.perf-gauge-fill[data-tone="green"]{background:var(--perf-green)}
.perf-gauge-fill[data-tone="amber"]{background:var(--perf-amber)}
.perf-gauge-fill[data-tone="red"]{background:var(--perf-red)}
.perf-runtime-note{font-size:10px;color:var(--perf-tertiary);margin-top:12px;line-height:1.5}
.perf-runtime-meta{font-size:10px;color:var(--perf-tertiary);margin-top:4px;font-variant-numeric:tabular-nums}
.perf-sessions-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.perf-sessions-tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.perf-search{
  display:flex;align-items:center;gap:6px;background:var(--dsw-alias-bg-layer-2);
  border:1px solid var(--perf-border);border-radius:7px;padding:4px 8px;min-width:190px;
}
.perf-search input{
  appearance:none;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:11.5px;min-width:0;width:100%;
}
.perf-search input::placeholder{color:var(--perf-tertiary)}
.perf-chip{
  appearance:none;border:1px solid var(--perf-border);background:transparent;color:var(--perf-muted);
  font:inherit;font-size:10.5px;border-radius:999px;padding:4px 9px;cursor:pointer;white-space:nowrap;
}
.perf-chip:hover{color:var(--dsw-alias-label-primary)}
.perf-chip[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:transparent}
.perf-table-head{
  display:grid;grid-template-columns:minmax(180px,2.35fr) 92px 70px 88px 86px 70px 80px;gap:11px;
  padding:0 8px 7px;border-bottom:1px solid var(--perf-border);font-size:10px;color:var(--perf-tertiary);letter-spacing:.02em;
}
.perf-table-head span:not(:first-child){text-align:right}
.perf-session-list{display:flex;flex-direction:column;max-height:470px;overflow:auto}
.perf-session-row{
  appearance:none;display:grid;grid-template-columns:minmax(180px,2.35fr) 92px 70px 88px 86px 70px 80px;gap:11px;align-items:center;
  border:0;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent);
  background:transparent;color:inherit;text-align:left;font:inherit;padding:9px 8px;cursor:pointer;width:100%;border-radius:6px;
}
.perf-session-row:hover{background:var(--dsw-alias-bg-layer-2)}
.perf-session-row:last-child{border-bottom-color:transparent}
.perf-session-main{min-width:0}
.perf-session-title{display:flex;align-items:center;gap:6px;min-width:0;font-size:12.5px;font-weight:550}
.perf-session-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.perf-session-meta{font-size:10px;color:var(--perf-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.perf-live-dot{width:6px;height:6px;border-radius:50%;background:var(--perf-green);flex:0 0 auto;box-shadow:0 0 0 3px color-mix(in srgb,var(--perf-green) 18%,transparent)}
.perf-badge{font-size:9px;line-height:1;color:var(--perf-muted);border:1px solid var(--perf-border);border-radius:4px;padding:2px 4px;flex:0 0 auto;font-weight:500}
.perf-cell{min-width:0;text-align:right;font-variant-numeric:tabular-nums;font-size:11.5px}
.perf-cell b{font-weight:600}
.perf-cell small{display:block;font-size:9.5px;color:var(--perf-tertiary);font-weight:400;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.perf-mini-bar{display:flex;height:3px;border-radius:999px;overflow:hidden;background:var(--perf-track);margin-top:4px}
.perf-mini-bar span{display:block;height:100%}
.perf-empty{padding:26px 12px;text-align:center;color:var(--perf-tertiary);font-size:11.5px}
.perf-error-card{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.perf-error-card p{margin:0;color:var(--perf-muted);font-size:12px}
.perf-banner{
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  border:1px solid color-mix(in srgb,var(--perf-red) 36%,var(--perf-border));
  background:color-mix(in srgb,var(--perf-red) 7%,var(--perf-card));
  border-radius:9px;padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-label-primary);
}
.perf-banner[data-tone="warn"]{border-color:color-mix(in srgb,var(--perf-amber) 40%,var(--perf-border));background:color-mix(in srgb,var(--perf-amber) 8%,var(--perf-card))}
.perf-banner strong{font-weight:600;white-space:nowrap}
.perf-banner span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.perf-loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:70px 20px;color:var(--perf-muted);flex-direction:column}
.perf-loading-title{font-size:13px;color:var(--dsw-alias-label-primary);font-weight:550}
.perf-loading-hint{font-size:11px;color:var(--perf-tertiary);max-width:460px;text-align:center}
.perf-footer{font-size:10px;color:var(--perf-tertiary);display:flex;gap:8px 16px;flex-wrap:wrap;padding-top:2px;line-height:1.55}
.perf-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:1040px){
  .perf-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .perf-split{grid-template-columns:1fr}
  .perf-table-head,.perf-session-row{grid-template-columns:minmax(170px,2fr) 88px 66px 84px 82px 66px}
  .perf-col-last{display:none}
}
@media (max-width:700px){
  .perf-shell{padding:18px 14px 30px}
  .perf-kpis{grid-template-columns:1fr}
  .perf-header-actions{width:100%}
  .perf-table-head,.perf-session-row{grid-template-columns:minmax(0,1.8fr) 64px 52px 60px;gap:8px}
  .perf-col-tools,.perf-col-avg,.perf-col-last{display:none}
  .perf-card{padding:13px 14px}
  .perf-kpi{min-height:112px}
}
`

    /** Empty token buckets. */
    function emptyBuckets() {
      return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    }

    /** Sum every bucket. */
    function sumBuckets(tokens) {
      let total = 0
      for (const bucket of BUCKETS) total += Number(tokens?.[bucket]) || 0
      return total
    }

    /** Add one token record into another. */
    function addBuckets(target, source) {
      for (const bucket of BUCKETS) target[bucket] = (target[bucket] ?? 0) + (Number(source?.[bucket]) || 0)
      return target
    }

    /** Local `YYYY-MM-DD`. */
    function dayKey(value) {
      const date = value instanceof Date ? value : new Date(value)
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${date.getFullYear()}-${month}-${day}`
    }

    /** Parse a local `YYYY-MM-DD` key. */
    function dayDate(key) {
      const [year, month, day] = String(key).split('-').map(Number)
      return new Date(year, (month || 1) - 1, day || 1)
    }

    /** Local midnight epoch of one timestamp. */
    function startOfDay(value) {
      const date = new Date(value)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    /** Add whole local days to a timestamp. */
    function addDays(value, delta) {
      const date = new Date(value)
      date.setDate(date.getDate() + delta)
      return date.getTime()
    }

    /** Grouping integer formatter; locale-independent separators. */
    function fmtInt(value) {
      const number = Math.round(Number(value) || 0)
      return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

/** Always-万 token count for the Chinese UI, e.g. 1523.8万. */
    function fmtWan(value) {
      const number = Number(value) || 0
      if (number === 0) return '0'
      const wan = number / 10_000
      if (wan >= 100) return `${wan.toFixed(0)}万`
      if (wan >= 10) return `${wan.toFixed(1)}万`
      return `${wan.toFixed(2)}万`
    }
    /** Compact token count: 万/亿 for Chinese, K/M/B otherwise. */
    function fmtCompact(value, chinese) {
      const number = Number(value) || 0
      if (number < 1000) return String(Math.round(number))
      if (chinese) {
        if (number >= 100_000_000) return `${(number / 100_000_000).toFixed(2)}亿`
        if (number >= 10_000) return `${(number / 10_000).toFixed(number >= 1_000_000 ? 0 : 1)}万`
        return fmtInt(number)
      }
      if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`
      if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
      return `${(number / 1000).toFixed(1)}K`
    }

    /** One decimal percentage, or an em dash. */
    function fmtPercent(value, digits = 1) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
      return `${Number(value).toFixed(digits)}%`
    }

    /** Compact duration. */
    function fmtDuration(ms) {
      if (ms === null || ms === undefined || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '—'
      const value = Number(ms)
      if (value < 1000) return `${Math.round(value)}ms`
      if (value < 10_000) return `${(value / 1000).toFixed(1)}s`
      if (value < 60_000) return `${Math.round(value / 1000)}s`
      const minutes = Math.floor(value / 60_000)
      const seconds = Math.round((value % 60_000) / 1000)
      if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return `${hours}h ${String(rest).padStart(2, '0')}m`
    }

    /** HH:mm:ss local. */
    function fmtClock(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      const pad = (part) => String(part).padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    /** M/D chart label. */
    function fmtShortDay(key) {
      const date = dayDate(key)
      if (Number.isNaN(date.getTime())) return key
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    /** M月D日 周X for the daily list. */
    function fmtDayLabel(key, chinese) {
      const date = dayDate(key)
      if (Number.isNaN(date.getTime())) return key
      if (chinese) {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六']
        return `${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    }

    /** A reset date, short. */
    function fmtResetDay(value, chinese) {
      if (value === null || value === undefined) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      if (chinese) return `${date.getMonth() + 1}月${date.getDate()}日`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    /** Relative activity label. */
    function fmtRelative(ts, now, t, chinese) {
      if (!ts || !Number.isFinite(Number(ts))) return '—'
      const diff = Math.max(0, now - Number(ts))
      const minutes = Math.floor(diff / 60_000)
      if (minutes < 1) return t('sessions.lastJustNow')
      if (minutes < 60) return t('sessions.minutesAgo', { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('sessions.hoursAgo', { n: hours })
      const then = new Date(Number(ts))
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const yesterday = addDays(today.getTime(), -1)
      if (startOfDay(Number(ts)) === yesterday) return t('sessions.yesterday')
      if (then.getFullYear() === new Date(now).getFullYear()) {
        return chinese ? `${then.getMonth() + 1}月${then.getDate()}日` : then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      return chinese
        ? `${then.getFullYear()}年${then.getMonth() + 1}月${then.getDate()}日`
        : then.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    /** Simple translation helper; zh gets its own dictionary, everything else English. */
    function translate(active, key, vars) {
      const chinese = String(active || '').toLowerCase().startsWith('zh')
      const dict = chinese ? ZH : EN
      let text = dict[key] ?? EN[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value))
        }
      }
      return text
    }

    /** Active locale id from the Client locale service, with a safe fallback. */
    function readActiveLocale(locale) {
      try {
        const snapshot = locale?.getSnapshot?.() ?? locale?.getLocale?.()
        return snapshot?.active ?? 'en'
      } catch {
        return 'en'
      }
    }

    /** Subscribe a component to locale changes. */
    function useActiveLocale(locale) {
      const [active, setActive] = React.useState(() => readActiveLocale(locale))
      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setActive(readActiveLocale(locale)))
      }, [locale])
      return active
    }

    /** First local day key of a range, or null for all time. */
    function rangeStartKey(range, now) {
      if (range === 'all') return null
      const days = range === 'today' ? 0 : range === '7d' ? 6 : 29
      return dayKey(startOfDay(addDays(now, -days)))
    }

    /** Empty aggregate day bucket. */
    function emptyAggregate() {
      return {
        tokens: emptyBuckets(),
        tokenTotal: 0,
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
    }

    /** Aggregate a list of day buckets. */
    function aggregateDays(days) {
      const total = emptyAggregate()
      for (const day of days) {
        addBuckets(total.tokens, day.tokens)
        total.tokenTotal += Number(day.tokenTotal) || 0
        total.turns += Number(day.turns) || 0
        total.closedTurns += Number(day.closedTurns) || 0
        total.steps += Number(day.steps) || 0
        total.toolCalls += Number(day.toolCalls) || 0
        total.toolErrors += Number(day.toolErrors) || 0
        total.requests += Number(day.requests) || 0
        total.userMessages += Number(day.userMessages) || 0
        total.outputTokens += Number(day.outputTokens) || 0
        total.activeMs += Number(day.activeMs) || 0
        total.toolMs += Number(day.toolMs) || 0
        total.modelMs += Number(day.modelMs) || 0
        total.ttftMs += Number(day.ttftMs) || 0
        total.ttftCount += Number(day.ttftCount) || 0
        total.decodeMs += Number(day.decodeMs) || 0
        for (const key of toolCategoryKeys) {
          total.toolMsByCategory[key] = (total.toolMsByCategory[key] ?? 0) + (Number(day.toolMsByCategory?.[key]) || 0)
        }
      }
      return total
    }

    /** Fill missing calendar days so the chart keeps an even time axis. */
    function fillDays(days, range, startKey, todayKey) {
      const byDay = new Map(days.map((day) => [day.day, day]))
      const blank = (day) => ({
        day,
        tokens: emptyBuckets(),
        tokenTotal: 0,
        sessions: 0,
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
      })
      if (range === 'all') return [...days]
      const result = []
      let cursor = startKey ?? todayKey
      const stop = todayKey
      for (let guard = 0; guard < 800; guard += 1) {
        result.push(byDay.get(cursor) ?? blank(cursor))
        if (cursor >= stop) break
        cursor = dayKey(addDays(dayDate(cursor).getTime(), 1))
      }
      return result
    }

    /** Per-session metrics restricted to the selected range. */
    function sessionRange(session, range, startKey) {
      if (range === 'all') {
        return {
          tokens: session.tokens,
          tokenTotal: session.tokenTotal,
          turns: session.turns,
          closedTurns: session.closedTurns,
          steps: session.steps,
          toolCalls: session.toolCalls,
          toolErrors: session.toolErrors,
          outputTokens: session.outputTokens,
          activeMs: session.activeMs,
          modelMs: session.modelMs,
          ttftMs: session.ttftMs ?? 0,
          ttftCount: session.ttftCount ?? 0,
          decodeMs: session.decodeMs ?? 0,
          toolMsByCategory: { ...(session.toolMsByCategory ?? {}) },
          avgTurnMs: session.avgTurnMs,
          outputPerSec: session.outputPerSec,
        }
      }
      const days = (session.days ?? []).filter((day) => day.day >= startKey)
      const total = emptyAggregate()
      for (const day of days) {
        addBuckets(total.tokens, day.tokens)
        total.tokenTotal += Number(day.tokenTotal) || 0
        total.turns += Number(day.turns) || 0
        total.closedTurns += Number(day.closedTurns) || 0
        total.steps += Number(day.steps) || 0
        total.toolCalls += Number(day.toolCalls) || 0
        total.toolErrors += Number(day.toolErrors) || 0
        total.outputTokens += Number(day.outputTokens) || 0
        total.activeMs += Number(day.activeMs) || 0
        total.toolMs += Number(day.toolMs) || 0
        total.modelMs += Number(day.modelMs) || 0
        total.ttftMs += Number(day.ttftMs) || 0
        total.ttftCount += Number(day.ttftCount) || 0
        total.decodeMs += Number(day.decodeMs) || 0
        for (const key of toolCategoryKeys) {
          total.toolMsByCategory[key] = (total.toolMsByCategory[key] ?? 0) + (Number(day.toolMsByCategory?.[key]) || 0)
        }
      }
      total.avgTurnMs = total.closedTurns > 0 ? total.activeMs / total.closedTurns : null
      total.outputPerSec = total.modelMs > 0 ? total.outputTokens / (total.modelMs / 1000) : null
      return total
    }

    /** Token composition segments for a mini bar. */
    function MiniBar({ tokens }) {
      const total = sumBuckets(tokens)
      if (total <= 0) return h('div', { className: 'perf-mini-bar' })
      return h(
        'div',
        { className: 'perf-mini-bar', 'aria-hidden': true },
        BUCKETS.map((bucket) => {
          const value = Number(tokens?.[bucket]) || 0
          if (value <= 0) return null
          return h('span', {
            key: bucket,
            style: { width: `${(value / total) * 100}%`, background: BUCKET_COLORS[bucket] },
          })
        }),
      )
    }

    /** Keyboard activation for non-button clickable rows. */
    function activateOnKey(event, action) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        action()
      }
    }

    /** Tiny inline spinner. */
    function Spinner({ size = 14 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          className: 'perf-spin',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, opacity: 0.25 }),
        h('path', {
          d: 'M21 12a9 9 0 0 0-9-9',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2.4,
          strokeLinecap: 'round',
        }),
      )
    }

    /** Refresh glyph. */
    function RefreshIcon({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { display: 'block' } },
        h('path', {
          d: 'M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /** Search glyph. */
    function SearchIcon({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { display: 'block', flex: '0 0 auto' } },
        h('circle', { cx: 11, cy: 11, r: 7, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        h('path', { d: 'm16.5 16.5 4 4', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
      )
    }

    /** KPI card shell. */
    function Kpi({ label, value, unit, hint, detail, children }) {
      return h(
        'section',
        { className: 'perf-card perf-kpi' },
        h('div', { className: 'perf-kpi-label' }, h('span', null, label), children?.top ?? null),
        h(
          'div',
          { className: 'perf-kpi-value', 'data-small': String(value ?? '').length > 9 ? 'true' : 'false' },
          value,
          unit ? h('span', { className: 'perf-kpi-unit' }, unit) : null,
        ),
        hint ? h('div', { className: 'perf-kpi-hint' }, hint) : null,
        detail ? h('div', { className: 'perf-kpi-detail' }, detail) : null,
        children?.body ?? null,
        h('div', { className: 'perf-kpi-spacer' }),
        children?.footer ?? null,
      )
    }

    /** Plan KPI card with its explicit manual update action. */
    function PlanCard({ plan, loading, onRefresh, t, chinese }) {
      const hasNumbers = plan && Number.isFinite(Number(plan.remaining)) && Number.isFinite(Number(plan.total))
      const failed = Boolean(plan && plan.error)
      const querying = loading
      const remaining = hasNumbers ? Number(plan.remaining) : null
      const total = hasNumbers ? Number(plan.total) : null
      const usedPercent = hasNumbers ? Number(plan.usedPct) || 0 : 0
      const remainingPercent = hasNumbers ? Math.max(0, Math.min(100, 100 - usedPercent)) : 0
      const tone = !hasNumbers ? 'warn' : remainingPercent <= 15 ? 'error' : remainingPercent <= 40 ? 'warn' : 'ok'
      const value = hasNumbers
        ? fmtInt(remaining)
        : querying
          ? t('kpi.planLoading')
          : failed
            ? t('kpi.planFailed')
            : t('kpi.planNotLoaded')
      const errorText = failed
        ? plan.error === 'not-authenticated'
          ? t('error.planNotAuth')
          : plan.error === 'no-cli'
            ? t('error.planNoCli')
            : plan.message ?? t('error.plan')
        : null
      const hint = hasNumbers
        ? failed
          ? t('kpi.planPrevious')
          : t('kpi.planHint', { plan: plan.planType ?? 'Token Plan', used: usedPercent.toFixed(1) })
        : querying
          ? t('kpi.planSlow')
          : failed
            ? errorText
            : t('kpi.planSlow')
      const detail = hasNumbers
        ? t('kpi.planDetail', {
            date: fmtResetDay(plan.resetAt, chinese),
            days: plan.daysRemaining ?? '—',
          })
        : null
      const actionLabel = querying
        ? t('kpi.planLoading')
        : hasNumbers
          ? t('kpi.planRefresh')
          : failed
            ? t('kpi.planRetry')
            : t('kpi.planQuery')

      return h(
        'section',
        { className: 'perf-card perf-kpi', title: t('kpi.planNote') },
        h(
          'div',
          { className: 'perf-kpi-label' },
          h('span', null, t('kpi.plan')),
          hasNumbers ? h('span', { className: 'perf-dot', style: { background: BUCKET_COLORS.output } }) : null,
        ),
        h(
          'div',
          { className: 'perf-kpi-value', 'data-small': String(value).length > 9 ? 'true' : 'false' },
          value,
          hasNumbers ? h('span', { className: 'perf-kpi-unit' }, t('unit.credits')) : null,
        ),
        hasNumbers
          ? h(
              'div',
              { className: 'perf-plan-line' },
              h(
                'div',
                { className: 'perf-plan-bar', title: `${remainingPercent.toFixed(1)}%` },
                h('div', {
                  className: 'perf-plan-fill',
                  'data-tone': tone,
                  style: { width: `${remainingPercent}%` },
                }),
              ),
              h('button', { type: 'button', className: 'perf-plan-action', onClick: onRefresh, disabled: querying }, actionLabel),
            )
          : h(
              'div',
              { className: 'perf-plan-line' },
              h(
                'button',
                { type: 'button', className: 'perf-btn perf-btn-small', onClick: onRefresh, disabled: querying },
                querying ? h(Spinner, { size: 11 }) : null,
                actionLabel,
              ),
            ),
        hint ? h('div', { className: 'perf-kpi-hint', title: hint }, hint) : null,
        detail ? h('div', { className: 'perf-kpi-detail' }, detail) : null,
        hasNumbers ? h('div', { className: 'perf-kpi-detail' }, t('kpi.planUsedOf', { used: fmtInt(total * (usedPercent / 100)), total: fmtInt(total) })) : null,
        failed && hasNumbers ? h('div', { className: 'perf-plan-error', title: errorText }, errorText) : null,
        h('div', { className: 'perf-kpi-spacer' }),
        h(
          'div',
          { className: 'perf-kpi-detail', title: hasNumbers && plan.fetchedAt ? t('kpi.planUpdated', { time: fmtClock(Number(plan.fetchedAt)) }) : t('footer.qwen') },
          hasNumbers && plan.fetchedAt
            ? `${t('kpi.planUpdated', { time: fmtClock(Number(plan.fetchedAt)) })}${plan.fromCache ? '' : ''}`
            : t('footer.qwen'),
        ),
      )
    }

    /** Cache read share of the prompt tokens: read / (read + fresh input). */
    function hitRate(tokens) {
      const read = Number(tokens?.cacheRead) || 0
      const miss = Number(tokens?.input) || 0
      return read + miss > 0 ? (read / (read + miss)) * 100 : null
    }

    /** Daily stacked token chart with a hover/selected day summary. */
    function Timeline({ days, t, chinese, selectedDay, onSelect, mode = 'typical', setMode = () => {} }) {
      const [hoveredDay, setHoveredDay] = React.useState(null)
      const baseWidth = 920
      const height = 248
      const left = 54
      const right = 16
      const top = 16
      const bottom = 30
      const browse = mode === 'browse'
      const all = Array.isArray(days) ? days : []
      // Typical keeps only the busiest days, so a long range stays readable.
      const TOP_DAYS = 10
      const shown = browse
        ? all
        : all
            .filter((day) => (Number(day.tokenTotal) || sumBuckets(day.tokens)) > 0)
            .sort((leftDay, rightDay) => (Number(rightDay.tokenTotal) || 0) - (Number(leftDay.tokenTotal) || 0))
            .slice(0, TOP_DAYS)
            .sort((leftDay, rightDay) => (leftDay.day < rightDay.day ? -1 : 1))
      const count = Math.max(1, shown.length)
      // One day slot keeps the same bar width as a typical-mode bar (44px at
      // its cap), so browsing a long range never shows hair-thin columns.
      const barCap = 44
      const slot = Math.round(barCap / 0.58)
      const basePlot = baseWidth - left - right
      // Browse scrolls once those slots no longer fit the plot width.
      const scroll = browse && count * slot > basePlot
      const width = scroll ? left + count * slot + right : baseWidth
      const plotWidth = width - left - right
      const plotHeight = height - top - bottom
      const hasSelection = Boolean(selectedDay) && shown.some((day) => day.day === selectedDay)
      const step = scroll ? slot : plotWidth / count
      const barWidth = Math.max(2, Math.min(barCap, step * 0.58))
      const chartAgg = aggregateDays(shown)
      const max = Math.max(1, ...shown.map((day) => Number(day.tokenTotal) || sumBuckets(day.tokens)))
      const peak = shown.reduce((best, day) => ((Number(day.tokenTotal) || 0) > (Number(best?.tokenTotal) || 0) ? day : best), null)
      const summary =
        shown.find((day) => day.day === selectedDay) ??
        shown.find((day) => day.day === hoveredDay) ??
        peak ??
        (shown.length > 0 ? shown[shown.length - 1] : null)
      const labelEvery = browse ? 1 : Math.max(1, Math.ceil(count / 8))
      const gridLines = [0, 0.25, 0.5, 0.75, 1]

      const bars = shown.map((day, index) => {
        const total = Number(day.tokenTotal) || sumBuckets(day.tokens)
        const x = left + index * step + (step - barWidth) / 2
        let cursor = top + plotHeight
        const segments = []
        for (const bucket of BUCKETS) {
          const value = Number(day.tokens?.[bucket]) || 0
          if (value <= 0) continue
          const segmentHeight = Math.max(1, (value / max) * plotHeight)
          cursor -= segmentHeight
          segments.push(
            h('rect', {
              key: `${day.day}-${bucket}`,
              x,
              y: cursor,
              width: barWidth,
              height: segmentHeight,
              fill: BUCKET_COLORS[bucket],
              opacity: hasSelection && selectedDay !== day.day ? 0.45 : 0.92,
              rx: 1,
            }),
          )
        }
        const active = (hasSelection && selectedDay === day.day) || (hoveredDay && hoveredDay === day.day)
        return h(
          'g',
          {
            key: day.day,
            style: { cursor: 'pointer' },
            onMouseEnter: () => setHoveredDay(day.day),
            onMouseLeave: () => setHoveredDay(null),
            onClick: () => onSelect(day.day),
          },
          h('rect', { x: left + index * step, y: top, width: step, height: plotHeight, fill: 'transparent' }),
          segments,
          active
            ? h('rect', {
                x: x - 2,
                y: top - 3,
                width: barWidth + 4,
                height: plotHeight + 6,
                fill: 'none',
                stroke: 'var(--dsw-alias-brand-primary)',
                strokeWidth: 1,
                rx: 3,
                opacity: 0.8,
              })
            : null,
          h('title', null, `${fmtDayLabel(day.day, chinese)} · ${fmtInt(total)} ${t('unit.tokens')}`),
        )
      })

      return h(
        'section',
        { className: 'perf-card' },
        h(
          'div',
          { className: 'perf-card-head' },
          h(
            'div',
            null,
            h('div', { className: 'perf-card-title' }, t('chart.timeline')),
            h(
              'div',
              { className: 'perf-card-sub' },
              browse
                ? t('chart.requests', { n: fmtInt(chartAgg.requests) })
                : `${t('chart.requests', { n: fmtInt(chartAgg.requests) })} · ${t('chart.topDays', { n: shown.length })}`,
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
            h(
              'div',
              { className: 'perf-seg', role: 'group', 'aria-label': t('chart.timeline') },
              ['typical', 'browse'].map((value) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    'data-active': mode === value ? 'true' : 'false',
                    'aria-pressed': mode === value ? 'true' : 'false',
                    onClick: () => setMode(value),
                  },
                  t(`chart.mode.${value}`),
                ),
              ),
            ),
            h(
              'div',
              { className: 'perf-legend' },
              BUCKETS.map((bucket) =>
                h('span', { key: bucket }, h('i', { className: 'perf-dot', style: { background: BUCKET_COLORS[bucket] } }), t(BUCKET_LABELS[bucket])),
              ),
            ),
          ),
        ),
        shown.length === 0
          ? h('div', { className: 'perf-empty' }, t('chart.empty'))
          : h(
              'div',
              { className: scroll ? 'perf-chart is-scroll' : 'perf-chart' },
              h(
                'svg',
                {
                  viewBox: `0 0 ${width} ${height}`,
                  role: 'img',
                  'aria-label': t('chart.timeline'),
                  style: scroll ? { width: `${width}px`, height: 'auto' } : { width: '100%', height: 'auto' },
                },
                gridLines.map((ratio) =>
                  h(
                    'g',
                    { key: `grid-${ratio}` },
                    h('line', {
                      x1: left,
                      x2: width - right,
                      y1: top + plotHeight * (1 - ratio),
                      y2: top + plotHeight * (1 - ratio),
                      stroke: 'var(--dsw-alias-border-l1)',
                      strokeDasharray: ratio === 0 ? '0' : '3 4',
                      opacity: ratio === 0 ? 1 : 0.65,
                    }),
                    ratio > 0
                      ? h(
                          'text',
                          {
                            x: left - 8,
                            y: top + plotHeight * (1 - ratio) + 3,
                            textAnchor: 'end',
                            fontSize: 10,
                            fill: 'var(--dsw-alias-label-tertiary)',
                          },
                          fmtCompact(max * ratio, chinese),
                        )
                      : null,
                  ),
                ),
                bars,
                shown.map((day, index) => {
                  if (index % labelEvery !== 0 && index !== shown.length - 1) return null
                  return h(
                    'text',
                    {
                      key: `label-${day.day}`,
                      x: left + index * step + step / 2,
                      y: height - 8,
                      textAnchor: 'middle',
                      fontSize: 10,
                      fill: 'var(--dsw-alias-label-tertiary)',
                    },
                    fmtShortDay(day.day),
                  )
                }),
              ),
            ),
        summary
          ? h(
              'div',
              { className: 'perf-day-summary' },
              h('b', null, fmtDayLabel(summary.day, chinese)),
              h('span', null, h('b', null, chinese ? fmtWan(summary.tokenTotal) : fmtInt(summary.tokenTotal)), ' ', t('unit.tokens')),
              BUCKETS.filter((bucket) => bucket !== 'cacheWrite' || Number(summary.tokens?.cacheWrite) > 0).map((bucket) =>
                h(
                  'span',
                  { key: bucket, className: 'perf-split-chip' },
                  h('i', { className: 'perf-dot', style: { background: BUCKET_COLORS[bucket] } }),
                  t(BUCKET_LABELS[bucket]),
                  ' ',
                  h('b', null, fmtCompact(Number(summary.tokens?.[bucket]) || 0, chinese)),
                ),
              ),
              h('span', null, t('daily.row', { sessions: summary.sessions ?? 0, turns: summary.turns ?? 0 })),
              hitRate(summary.tokens) === null ? null : h('span', null, t('chart.hitRate', { pct: fmtPercent(hitRate(summary.tokens), 1) })),
            )
          : null,
      )
    }

    /** Detailed time breakdown: first token, generation, tool categories, waiting. */
    function TimeCompositionCard({ agg, days, cpu, t }) {
      const active = Number(agg.activeMs) || 0
      const model = Number(agg.modelMs) || 0
      const tool = Number(agg.toolMs) || 0
      const ttft = Number(agg.ttftMs) || 0
      const ttftCount = Number(agg.ttftCount) || 0
      const decode = Number(agg.decodeMs) || 0
      const modelOther = Math.max(0, model - ttft - decode)
      const cats = agg.toolMsByCategory ?? {}
      const wait = Math.max(0, active - model - tool)
      const activeDays = (days ?? []).filter((day) => (Number(day.activeMs) || 0) > 0).length
      const pct = (value) => (active > 0 ? (value / active) * 100 : 0)
      const rows = [
        { key: 'ttft', label: t('time.ttft'), value: ttft, color: 'var(--perf-blue)', hint: ttftCount > 0 ? t('time.ttftAvg', { duration: fmtDuration(ttft / ttftCount) }) : null },
        { key: 'decode', label: t('time.decode'), value: decode, color: 'var(--perf-blue)' },
        { key: 'modelOther', label: t('time.modelOther'), value: modelOther, color: 'var(--perf-blue)' },
        { key: 'command', label: t('time.cmd'), value: Number(cats.command) || 0, color: 'var(--perf-amber)' },
        { key: 'file', label: t('time.file'), value: Number(cats.file) || 0, color: 'var(--perf-amber)' },
        { key: 'network', label: t('time.network'), value: Number(cats.network) || 0, color: 'var(--perf-amber)' },
        { key: 'agent', label: t('time.agent'), value: Number(cats.agent) || 0, color: 'var(--perf-amber)' },
        { key: 'other', label: t('time.otherTool'), value: Number(cats.other) || 0, color: 'var(--perf-amber)' },
        { key: 'wait', label: t('time.wait'), value: wait, color: 'var(--perf-tertiary)' },
      ]
        .filter((row) => row.value > 0)
        .sort((left, right) => right.value - left.value)
      const memory = cpu?.memory
      const memPct = memory && memory.systemTotal > 0 ? (memory.systemUsed / memory.systemTotal) * 100 : null
      const avgTurn = (Number(agg.closedTurns) || 0) > 0 ? active / agg.closedTurns : null
      const avgDay = activeDays > 0 ? active / activeDays : null

      return h(
        'section',
        { className: 'perf-card' },
        h(
          'div',
          { className: 'perf-card-head' },
          h('div', { className: 'perf-card-title' }, t('time.title')),
          h('div', { className: 'perf-card-sub' }, t('time.total', { duration: fmtDuration(active) })),
        ),
        active === 0
          ? h('div', { className: 'perf-empty' }, t('time.empty'))
          : h(
              'div',
              null,
              h(
                'div',
                { className: 'perf-comp-bar', 'aria-hidden': true },
                rows.map((row) => h('span', { key: row.key, style: { width: `${pct(row.value)}%`, background: row.color } })),
              ),
              h(
                'div',
                { className: 'perf-group-legend' },
                h('span', null, h('i', { className: 'perf-dot', style: { background: 'var(--perf-blue)' } }), t('time.cloudGroup'), ' ', h('b', null, fmtDuration(model))),
                h('span', null, h('i', { className: 'perf-dot', style: { background: 'var(--perf-amber)' } }), t('time.localGroup'), ' ', h('b', null, fmtDuration(tool))),
                h('span', null, h('i', { className: 'perf-dot', style: { background: 'var(--perf-tertiary)' } }), t('time.waitGroup'), ' ', h('b', null, fmtDuration(wait))),
              ),
              h(
                'div',
                { className: 'perf-comp-legend' },
                rows.map((row) =>
                  h(
                    'div',
                    { key: row.key, className: 'perf-comp-row', title: row.hint ?? undefined },
                    h('i', { className: 'perf-dot', style: { background: row.color } }),
                    h('span', { style: { color: 'var(--perf-muted)' } }, row.label, row.hint ? h('span', { style: { color: 'var(--perf-tertiary)', marginLeft: '6px', fontSize: '10px' } }, row.hint) : null),
                    h('b', null, fmtDuration(row.value)),
                    h('em', null, fmtPercent(pct(row.value), 1)),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'perf-comp-foot' },
                h('span', null, t('time.avgTurn', { duration: fmtDuration(avgTurn) })),
                h('span', null, t('time.avgDay', { duration: fmtDuration(avgDay) })),
                memPct === null
                  ? null
                  : h('span', null, t('time.memPressure', { pct: fmtPercent(memPct, 0), used: fmtBytes(memory.systemUsed), total: fmtBytes(memory.systemTotal) })),
              ),
            ),
      )
    }

    /** Human byte size. */
    function fmtBytes(value) {
      const bytes = Number(value) || 0
      if (bytes < 1024) return `${Math.round(bytes)} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    /** Runtime card: one manual sample, no history. */
    function RuntimeCard({ cpu, totals, t }) {
      if (!cpu) {
        return h(
          'section',
          { className: 'perf-card' },
          h('div', { className: 'perf-card-head' }, h('div', { className: 'perf-card-title' }, t('runtime.title'))),
          h('div', { className: 'perf-empty' }, t('runtime.empty')),
        )
      }
      const processPercent = Number(cpu.processPercent) || 0
      const systemPercent = Number(cpu.systemPercent) || 0
      const memory = cpu.memory ?? {}
      const systemMemoryPercent = memory.systemTotal > 0 ? (memory.systemUsed / memory.systemTotal) * 100 : 0
      const systemTone = systemPercent > 80 ? 'red' : systemPercent > 50 ? 'amber' : 'green'
      return h(
        'section',
        { className: 'perf-card' },
        h(
          'div',
          { className: 'perf-card-head' },
          h('div', { className: 'perf-card-title' }, t('runtime.title')),
          h('div', { className: 'perf-card-sub' }, t('runtime.sampled', { ms: cpu.sampleMs ?? 300 })),
        ),
        h(
          'div',
          { className: 'perf-runtime-top' },
          h('span', { className: 'perf-runtime-big' }, processPercent.toFixed(1), h('small', null, '%')),
          h('span', { className: 'perf-runtime-label' }, t('runtime.process')),
        ),
        h(
          'div',
          { className: 'perf-runtime-grid' },
          h(
            'div',
            null,
            h('div', { className: 'perf-gauge-label' }, h('span', null, t('runtime.system')), h('b', null, `${systemPercent.toFixed(1)}%`)),
            h('div', { className: 'perf-gauge-track' }, h('div', { className: 'perf-gauge-fill', 'data-tone': systemTone, style: { width: `${Math.min(100, systemPercent)}%` } })),
          ),
          h(
            'div',
            null,
            h(
              'div',
              { className: 'perf-gauge-label', title: `${fmtBytes(memory.systemUsed)} / ${fmtBytes(memory.systemTotal)}` },
              h('span', null, t('runtime.systemMemory')),
              h('b', null, `${fmtBytes(memory.systemUsed)} · ${systemMemoryPercent.toFixed(0)}%`),
            ),
            h('div', { className: 'perf-gauge-track' }, h('div', { className: 'perf-gauge-fill', 'data-tone': systemMemoryPercent > 85 ? 'red' : systemMemoryPercent > 65 ? 'amber' : 'green', style: { width: `${Math.min(100, systemMemoryPercent)}%` } })),
          ),
          h(
            'div',
            null,
            h('div', { className: 'perf-gauge-label' }, h('span', null, t('runtime.memory')), h('b', null, fmtBytes(memory.rss))),
            h('div', { className: 'perf-runtime-meta', style: { marginTop: '4px' } }, t('runtime.heap', { used: fmtBytes(memory.heapUsed), total: fmtBytes(memory.heapTotal) })),
          ),
          h(
            'div',
            null,
            h(
              'div',
              { className: 'perf-gauge-label' },
              h('span', null, t('runtime.running')),
              h('b', null, t('runtime.runningOf', { running: totals?.running ?? 0, total: totals?.sessions ?? 0 })),
            ),
            h('div', { className: 'perf-gauge-track' }, h('div', { className: 'perf-gauge-fill', 'data-tone': 'green', style: { width: `${Math.min(100, ((totals?.running ?? 0) / Math.max(1, totals?.sessions ?? 1)) * 100)}%` } })),
          ),
        ),
        h(
          'div',
          { className: 'perf-runtime-note' },
          `${t('runtime.cores')} ${cpu.cores ?? '—'} · ${t('runtime.node', { version: cpu.node ?? '—', pid: cpu.pid ?? '—' })}`,
        ),
        h(
          'div',
          { className: 'perf-runtime-meta' },
          `${t('runtime.sampledAt', { time: fmtClock(cpu.sampledAt) })}${cpu.load1 > 0 ? ` · ${t('runtime.load')} ${cpu.load1}` : ''}`,
        ),
      )
    }

    /** Conversation performance list. */
    function SessionTable({ sessions, t, chinese, now, sort, setSort, search, setSearch, includeSubagents, setIncludeSubagents, openSession }) {
      const needle = String(search || '').trim().toLowerCase()
      const rows = sessions
        .filter((session) => includeSubagents || session.origin !== 'subagent')
        .filter((session) => {
          if (!needle) return true
          return [session.title, session.workspace, session.model, session.sessionId]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle))
        })
        .sort((left, right) => {
          if (sort === 'tokens') return right.range.tokenTotal - left.range.tokenTotal || (right.lastAt ?? 0) - (left.lastAt ?? 0)
          if (sort === 'today') return right.todayTokens - left.todayTokens
          if (sort === 'turns') return right.range.turns - left.range.turns
          return (right.lastAt ?? 0) - (left.lastAt ?? 0)
        })

      return h(
        'section',
        { className: 'perf-card' },
        h(
          'div',
          { className: 'perf-sessions-head' },
          h(
            'div',
            null,
            h('div', { className: 'perf-card-title' }, t('sessions.title')),
            h('div', { className: 'perf-card-sub' }, `${t('sessions.count', { n: rows.length })}${sort === 'tokens' ? ` · ${t('sessions.sortedByTokens')}` : ''}`),
          ),
          h(
            'div',
            { className: 'perf-sessions-tools' },
            h(
              'label',
              { className: 'perf-search' },
              h(SearchIcon, null),
              h('span', { className: 'perf-sr' }, t('sessions.search')),
              h('input', {
                value: search,
                onChange: (event) => setSearch(event.target.value),
                placeholder: t('sessions.search'),
                spellCheck: false,
                'aria-label': t('sessions.search'),
              }),
            ),
            ['tokens', 'recent', 'today', 'turns'].map((value) =>
              h(
                'button',
                {
                  key: value,
                  type: 'button',
                  className: 'perf-chip',
                  'data-active': sort === value ? 'true' : 'false',
                  'aria-pressed': sort === value ? 'true' : 'false',
                  onClick: () => setSort(value),
                },
                t(`sessions.sort.${value}`),
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'perf-chip',
                'data-active': includeSubagents ? 'true' : 'false',
                'aria-pressed': includeSubagents ? 'true' : 'false',
                onClick: () => setIncludeSubagents(!includeSubagents),
              },
              t('sessions.includeSubagents'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'perf-table-head' },
          h('span', { className: 'perf-col-session' }, t('sessions.col.session')),
          h('span', { className: 'perf-col-tokens' }, t('sessions.col.tokens')),
          h('span', { className: 'perf-col-turns' }, t('sessions.col.turns')),
          h('span', { className: 'perf-col-tools' }, t('sessions.col.tools')),
          h('span', { className: 'perf-col-avg' }, t('sessions.col.avg')),
          h('span', { className: 'perf-col-today' }, t('sessions.col.today')),
          h('span', { className: 'perf-col-last' }, t('sessions.col.last')),
        ),
        rows.length === 0
          ? h('div', { className: 'perf-empty' }, t('sessions.empty'))
          : h(
              'div',
              { className: 'perf-session-list' },
              rows.map((session) => {
                const errorRate = session.range.toolCalls > 0 ? (session.range.toolErrors / session.range.toolCalls) * 100 : null
                const speed = session.range.outputPerSec
                return h(
                  'div',
                  {
                    key: session.sessionId,
                    role: 'button',
                    tabIndex: 0,
                    className: 'perf-session-row',
                    onClick: () => openSession?.(session.sessionId),
                    onKeyDown: (event) => activateOnKey(event, () => openSession?.(session.sessionId)),
                    title: t('sessions.open'),
                  },
                  h(
                    'div',
                    { className: 'perf-session-main' },
                    h(
                      'div',
                      { className: 'perf-session-title' },
                      session.running ? h('span', { className: 'perf-live-dot', title: t('sessions.running') }) : null,
                      h('span', { className: 'perf-session-title-text' }, session.title || t('sessions.unknownTitle')),
                      session.origin === 'subagent' ? h('span', { className: 'perf-badge' }, t('sessions.subagent')) : null,
                    ),
                    h(
                      'div',
                      { className: 'perf-session-meta' },
                      `${session.workspace || t('sessions.unknownWorkspace')} · ${String(session.model || t('sessions.noModel')).split('/').slice(-1)[0]}`,
                    ),
                  ),
                  h(
                    'div',
                    { className: 'perf-cell perf-col-tokens' },
                    h('b', null, fmtCompact(session.range.tokenTotal, chinese)),
                    h(MiniBar, { tokens: session.range.tokens }),
                  ),
                  h(
                    'div',
                    { className: 'perf-cell perf-col-turns' },
                    h('b', null, fmtInt(session.range.turns)),
                    h('small', null, t('sessions.turnsSub', { n: fmtInt(session.range.steps) })),
                  ),
                  h(
                    'div',
                    { className: 'perf-cell perf-col-tools' },
                    h('b', null, fmtInt(session.range.toolCalls)),
                    h('small', null, t('sessions.toolsSub', { rate: fmtPercent(errorRate, 0) })),
                  ),
                  h(
                    'div',
                    { className: 'perf-cell perf-col-avg' },
                    h('b', { title: t('sessions.avgHint') }, fmtDuration(session.range.avgTurnMs)),
                    h('small', { title: t('sessions.speedHint') }, speed === null || speed === undefined ? '—' : t('sessions.speedSub', { speed: Number(speed).toFixed(1) })),
                  ),
                  h('div', { className: 'perf-cell perf-col-today' }, session.todayTokens > 0 ? h('b', null, fmtCompact(session.todayTokens, chinese)) : h('span', { style: { color: 'var(--perf-tertiary)' } }, '—')),
                  h('div', { className: 'perf-cell perf-col-last' }, h('small', { style: { marginTop: 0 } }, fmtRelative(session.lastAt, now, t, chinese))),
                )
              }),
            ),
      )
    }

    /** Sidebar icon: ascending bars, drawn with currentColor. */
    function PanelIcon({ size = 24, active = false }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 3.5, y: 13.2, width: 4, height: 7, rx: 1.1, fill: 'currentColor', opacity: active ? 0.7 : 0.48 }),
        h('rect', { x: 10, y: 8.8, width: 4, height: 11.4, rx: 1.1, fill: 'currentColor', opacity: active ? 0.88 : 0.66 }),
        h('rect', { x: 16.5, y: 3.8, width: 4, height: 16.4, rx: 1.1, fill: 'currentColor', opacity: active ? 1 : 0.82 }),
      )
    }

    /**
     * The panel. All data arrives from explicit fetches: on mount (the click
     * that opened the panel) and from the Refresh button. No interval exists.
     */
    function Panel(props) {
      const locale = props.locale ?? null
      const active = useActiveLocale(locale)
      const chinese = String(active || '').toLowerCase().startsWith('zh')
      const t = (key, vars) => translate(active, key, vars)

      const [snapshot, setSnapshot] = React.useState(null)
      const [snapshotError, setSnapshotError] = React.useState(null)
      const [snapshotLoading, setSnapshotLoading] = React.useState(true)
      const [plan, setPlan] = React.useState(null)
      const [planLoading, setPlanLoading] = React.useState(false)
      const [range, setRange] = React.useState('7d')
      const [sort, setSort] = React.useState('tokens')
      const [search, setSearch] = React.useState('')
      const [includeSubagents, setIncludeSubagents] = React.useState(true)
      const [selectedDay, setSelectedDay] = React.useState(null)
      const [timelineMode, setTimelineMode] = React.useState('typical')

      const snapshotAbort = React.useRef(null)
      const planAbort = React.useRef(null)
      const snapshotSeq = React.useRef(0)
      const planSeq = React.useRef(0)

      async function loadSnapshot() {
        const seq = snapshotSeq.current + 1
        snapshotSeq.current = seq
        setSnapshotLoading(true)
        setSnapshotError(null)
        snapshotAbort.current?.abort()
        const controller = new AbortController()
        snapshotAbort.current = controller
        try {
          const response = await fetch(SNAPSHOT_URL, {
            cache: 'no-store',
            signal: controller.signal,
            headers: { accept: 'application/json' },
          })
          const body = await response.json().catch(() => null)
          if (seq !== snapshotSeq.current) return
          if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
          if (!body || body.api !== SNAPSHOT_API) throw new Error(t('error.version'))
          setSnapshot(body)
          setSnapshotError(null)
        } catch (error) {
          if (seq !== snapshotSeq.current || error?.name === 'AbortError') return
          setSnapshotError(error instanceof Error ? error.message : String(error))
        } finally {
          if (seq === snapshotSeq.current) setSnapshotLoading(false)
        }
      }

      async function loadPlan(refresh) {
        const seq = planSeq.current + 1
        planSeq.current = seq
        setPlanLoading(true)
        planAbort.current?.abort()
        const controller = new AbortController()
        planAbort.current = controller
        try {
          const response = await fetch(refresh ? `${PLAN_URL}?refresh=1` : PLAN_URL, {
            cache: 'no-store',
            signal: controller.signal,
            headers: { accept: 'application/json' },
          })
          const body = await response.json().catch(() => null)
          if (seq !== planSeq.current) return null
          if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
          setPlan(body)
          return body
        } catch (error) {
          if (seq !== planSeq.current || error?.name === 'AbortError') return null
          setPlan((current) => ({
            ...(current && Number.isFinite(Number(current.remaining)) ? current : {}),
            error: 'client-error',
            message: error instanceof Error ? error.message : String(error),
          }))
          return null
        } finally {
          if (seq === planSeq.current) setPlanLoading(false)
        }
      }

      React.useEffect(() => {
        let alive = true
        void (async () => {
          const cached = await loadPlan(false)
          if (!alive) return
          // Opening the panel is the click that authorizes one first-time
          // quota query; after that the card stays cached until asked again.
          if (cached === null) void loadPlan(true)
        })()
        void loadSnapshot()
        return () => {
          alive = false
          snapshotSeq.current += 1
          planSeq.current += 1
          snapshotAbort.current?.abort()
          planAbort.current?.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      function refreshAll() {
        if (!snapshotLoading) void loadSnapshot()
        if (!planLoading) void loadPlan(true)
      }

      const now = Date.now()
      const todayKey = dayKey(now)
      const startKey = rangeStartKey(range, now)
      const startTime = startKey === null ? 0 : dayDate(startKey).getTime()
      const allDays = (snapshot?.days ?? []).map((day) => ({
        ...day,
        sessions: day.sessions ?? 0,
      }))
      const rangeDays = startKey === null ? allDays : allDays.filter((day) => day.day >= startKey)
      const chartDays = fillDays(rangeDays, range, startKey, todayKey)
      const rangeAgg = aggregateDays(rangeDays)
      const todayDay = allDays.find((day) => day.day === todayKey) ?? null
      const todayTokens = todayDay?.tokenTotal ?? 0
      const todayRequests = todayDay?.requests ?? 0
      const todayTurns = todayDay?.turns ?? 0
      const todaySessions = todayDay?.sessions ?? 0
      const avgTurnMs = rangeAgg.closedTurns > 0 ? rangeAgg.activeMs / rangeAgg.closedTurns : null
      const toolErrorRate = rangeAgg.toolCalls > 0 ? (rangeAgg.toolErrors / rangeAgg.toolCalls) * 100 : null
      const outputPerSec = rangeAgg.modelMs > 0 ? rangeAgg.outputTokens / (rangeAgg.modelMs / 1000) : null
      const source = snapshot?.source === 'sessionQuery' ? 'sessionQuery' : snapshot?.source === 'sessionPersistence' ? 'sessionPersistence' : t('panel.sourceFallback')

      const sessionRows = snapshot
        ? snapshot.sessions
            .filter((session) => includeSubagents || session.origin !== 'subagent')
            .map((session) => {
              const scoped = sessionRange(session, range, startKey)
              const today = (session.days ?? []).find((day) => day.day === todayKey)
              return {
                ...session,
                range: scoped,
                todayTokens: today?.tokenTotal ?? 0,
              }
            })
            .filter((session) => range === 'all' || (session.lastAt ?? 0) >= startTime || session.range.tokenTotal > 0)
        : []
      const rangeSessionCount = sessionRows.length

      const header = h(
        'header',
        { className: 'perf-header' },
        h(
          'div',
          { className: 'perf-header-main' },
          h('h1', { className: 'perf-title' }, t('panel.title')),
          h(
            'div',
            { className: 'perf-sub' },
            snapshot
              ? h('span', null, t('panel.subtitle', { time: fmtClock(snapshot.generatedAt), sessions: snapshot.totals.sessions, source }))
              : h('span', null, t('panel.never')),
            snapshot ? h('span', { className: 'perf-sub-sep' }, '·') : null,
            snapshot ? h('span', null, t('panel.scanned', { n: snapshot.scanned })) : null,
            snapshot && snapshot.reused > 0 ? h('span', { className: 'perf-sub-sep' }, '·') : null,
            snapshot && snapshot.reused > 0 ? h('span', null, t('panel.reused', { n: snapshot.reused })) : null,
            h('span', { className: 'perf-sub-sep' }, '·'),
            h('span', null, t('panel.manual')),
          ),
        ),
        h(
          'div',
          { className: 'perf-header-actions' },
          h(
            'div',
            { className: 'perf-seg', role: 'group', 'aria-label': t('panel.title') },
            ['today', '7d', '30d', 'all'].map((value) =>
              h(
                'button',
                {
                  key: value,
                  type: 'button',
                  'data-active': range === value ? 'true' : 'false',
                  'aria-pressed': range === value ? 'true' : 'false',
                  onClick: () => setRange(value),
                },
                t(`panel.range.${value}`),
              ),
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'perf-btn perf-btn-primary',
              onClick: refreshAll,
              disabled: snapshotLoading,
              'aria-busy': snapshotLoading ? 'true' : 'false',
              title: planLoading ? t('panel.refreshHintBusy') : t('panel.refreshHint'),
            },
            snapshotLoading ? h(Spinner, { size: 12 }) : h(RefreshIcon, null),
            snapshotLoading ? t('panel.refreshing') : t('panel.refresh'),
          ),
        ),
      )

      if (!snapshot && snapshotLoading) {
        return h(
          'div',
          { className: 'perf-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'perf-shell' },
            header,
            h(
              'div',
              { className: 'perf-card perf-loading' },
              h(Spinner, { size: 20 }),
              h('div', { className: 'perf-loading-title' }, t('panel.loading')),
              h('div', { className: 'perf-loading-hint' }, t('panel.loadingHint')),
            ),
          ),
        )
      }

      if (!snapshot) {
        return h(
          'div',
          { className: 'perf-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'perf-shell' },
            header,
            h(
              'div',
              { className: 'perf-card perf-error-card' },
              h('div', { className: 'perf-card-title' }, t('error.title')),
              h('p', null, snapshotError ?? t('error.version')),
              h('button', { type: 'button', className: 'perf-btn perf-btn-primary', onClick: refreshAll }, t('error.retry')),
            ),
          ),
        )
      }

      const todayHint = t('kpi.todayHint', {
        input: fmtCompact(todayDay?.tokens?.input ?? 0, chinese),
        output: fmtCompact(todayDay?.tokens?.output ?? 0, chinese),
        cache: fmtCompact(todayDay?.tokens?.cacheRead ?? 0, chinese),
      })
      const rangeHint = t('kpi.totalHint', {
        input: fmtCompact(rangeAgg.tokens.input, chinese),
        output: fmtCompact(rangeAgg.tokens.output, chinese),
        cache: fmtCompact(rangeAgg.tokens.cacheRead, chinese),
      })

      return h(
        'div',
        { className: 'perf-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'perf-shell' },
          header,
          snapshotError
            ? h(
                'div',
                { className: 'perf-banner' },
                h('span', { title: snapshotError }, snapshotError),
                h('button', { type: 'button', className: 'perf-btn perf-btn-small', onClick: refreshAll }, t('error.retry')),
              )
            : null,
          (snapshot.warnings ?? []).length > 0
            ? h(
                'div',
                { className: 'perf-banner', 'data-tone': 'warn' },
                h('strong', null, t('panel.warnings', { n: snapshot.warnings.length })),
                h('span', { title: snapshot.warnings.join('\n') }, snapshot.warnings.join('；')),
              )
            : null,
          h(
            'div',
            { className: 'perf-kpis' },
            h(Kpi, {
              label: t('kpi.today'),
              value: fmtCompact(todayTokens, chinese),
              unit: t('unit.tokens'),
              hint: todayHint,
              detail: t('kpi.todayDetail', { requests: fmtInt(todayRequests), turns: fmtInt(todayTurns), sessions: fmtInt(todaySessions) }),
            }),
            h(PlanCard, { plan, loading: planLoading, onRefresh: () => void loadPlan(true), t, chinese }),
            h(Kpi, {
              label: t('kpi.total'),
              value: fmtCompact(rangeAgg.tokenTotal, chinese),
              unit: t('unit.tokens'),
              hint: rangeHint,
              detail: t('kpi.totalDetail', { sessions: fmtInt(rangeSessionCount), turns: fmtInt(rangeAgg.turns), tools: fmtInt(rangeAgg.toolCalls) }),
            }),
            h(Kpi, {
              label: t('kpi.perf'),
              value: fmtDuration(avgTurnMs),
              unit: avgTurnMs === null ? '' : t('unit.perTurn'),
              hint: t('kpi.perfHint', { duration: fmtDuration(avgTurnMs), rate: fmtPercent(toolErrorRate, 1) }),
              detail: t('kpi.perfDetail', {
                speed: outputPerSec === null ? '—' : `${Number(outputPerSec).toFixed(1)} ${t('unit.tokPerSec')}`,
                running: snapshot.totals.running ?? 0,
              }),
            }),
          ),
          h(Timeline, {
            days: chartDays,
            t,
            chinese,
            selectedDay,
            onSelect: (day) => setSelectedDay(day === selectedDay ? null : day),
            mode: timelineMode,
            setMode: setTimelineMode,
          }),
          h(
            'div',
            { className: 'perf-split' },
            h(TimeCompositionCard, { agg: rangeAgg, days: rangeDays, cpu: snapshot.cpu, t }),
            h(RuntimeCard, { cpu: snapshot.cpu, totals: snapshot.totals, t }),
          ),
          h(SessionTable, {
            sessions: sessionRows,
            t,
            chinese,
            now,
            sort,
            setSort,
            search,
            setSearch,
            includeSubagents,
            setIncludeSubagents,
            openSession: (sessionId) => props.openSession?.(sessionId),
          }),
          h(
            'div',
            { className: 'perf-footer' },
            h('span', null, t('footer.manual')),
            h('span', null, t('footer.qwen')),
          ),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const locale = ctx.get('locale') ?? null

        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, { en: EN, zh: ZH }), 'dsh-performance-stats: dictionaries')
        }

        const openSession = (sessionId) => {
          const workspace = ctx.get('uiWorkspace')
          if (workspace && typeof workspace.openSession === 'function') workspace.openSession(sessionId)
        }

        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.panellist',
                  id: PANEL_ID,
                  order: 20,
                  label: (() => {
                    const read = () => {
                      const active = readActiveLocale(locale)
                      return translate(active, 'panel.title')
                    }
                    return read
                  })(),
                },
                PanelIcon,
              ),
            ),
          'dsh-performance-stats: sidebar icon',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register(
                { name: 'main', key: PANEL_ID, inject: () => ({ locale, openSession }) },
                Panel,
              ),
            ),
          'dsh-performance-stats: main panel',
        )
      },
    }
  },
})