# 性能统计 · dsh-performance-stats

DeepSeek Harness（DSH）Web 侧边栏插件：把本机会话日志折成一块性能总览，回答三个问题——**用了多少 Token、时间花在云端还是本地、现在是哪台机器在跑**。

安装后在左侧边栏「自动化任务」之后出现「性能统计」，点开是主栏面板，不占用当前会话。

## 功能

- **总览 KPI**：今日用量、千问 Token Plan 额度、区间总用量、性能概览（平均每轮 / 工具错误率 / 输出速度）
- **用量时间线**：两种模式
  - **典型**：只取当前区间内 Token 用量最多的 10 天，铺满宽度
  - **遍历**：每天一个槽位，天数多时横向滚动逐日查看
  - 按天堆叠输入 / 缓存读取 / 缓存写入 / 输出 Token；当日总量以「万」为单位；下侧明细含 Token 拆分、会话数、轮次与**缓存命中率**
- **耗时构成**：按「云端模型调用 / 本地工具执行 / 等待与其它」三组着色并给出各组合计，明细包括
  - 云端 **TTFT 首字延迟（网络 RTT + 服务端排队）**，附平均首字延迟
  - 云端 **解码 Decode（流式生成）**
  - 云端调度与重试
  - 本地命令执行（pwsh / run_code）、本地文件与检索 I/O、外网工具（web_search / web_fetch）、子智能体与等待、其它工具
  - 等待与其它（轮次间隙）
  - 底部附平均每轮、每个活跃日与当前内存压力
- **运行状态**：刷新时做一次 300ms 采样，显示进程 CPU、系统 CPU、内存、RSS / 堆、运行中会话、核心数、PID、负载
- **会话性能**：默认按区间 Token 从多到少，可切换最近 / 今日 / 轮次；支持搜索与「含子智能体」；点击行打开会话
- **千问 Token Plan**：套餐名、总额度、已用比例、剩余 Credits、重置日期与剩余天数；仅在首次打开或点击「更新额度」时调用本机 CLI
- **无定时器**：所有更新由点击驱动，面板关闭后不做任何后台采样

## 安装

要求：DSH 2.0.x（Web 或桌面端），Node 侧无需额外依赖。

方式一（推荐）：DSH「插件」页 → **添加插件** → 选择本目录。

方式二：让 Agent 调用插件管理器安装本地目录：

```text
plugin_manager install_bundle target=<本目录绝对路径>
```

安装完成后刷新页面，侧边栏出现「性能统计」。

> 修改代码后，需要在插件页把 `include:dsh-performance-stats` 关闭再打开（或重启 DSH）才会加载新模块。

## 千问 Token Plan（可选）

额度卡片依赖本机 `qianwen` CLI：

```bash
npm install -g @qianwenai/qianwen-cli@latest
qianwen auth login
```

未安装或未登录时只有额度卡片提示错误，其余统计照常工作。查询通过 Host 可执行文件运行，单次通常 20–40 秒；成功结果会缓存，直到下次点击「更新额度」。

## 数据来源与隐私

- **Token**：只取会话日志中模型实际返回的 `assistant/message.usage` 与 `compaction/summary.usage`，不做估算；fork 继承的前缀不重复计入。
- **TTFT / 解码**：由 `assistant/message.data.stream` 的 `time0` 与 `dt` 计算；TTFT 指 `step/start` 到首个流式 chunk。
- **每日 / 每会话**：按事件时间归入本地日历日。
- **运行状态**：刷新请求内一次性采样 300ms，不做历史曲线。
- **隐私**：全部数据在本机读取与计算，不上传；不读取对话正文，不访问网络（额度查询除外）。

## HTTP 接口

两条路由注册在 Host Web 服务的同一前缀下：

```text
GET /api/performance-stats/snapshot
GET /api/performance-stats/plan
GET /api/performance-stats/plan?refresh=1
```

`/snapshot` 返回总量、每日桶、会话行、模型汇总、运行状态与告警；`/plan` 无 `refresh=1` 时只返回缓存。

## 目录结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 端：会话扫描、按 revision 复用、路由、运行状态采样、额度缓存 |
| `client.js` | 面板 UI：KPI、时间线、耗时构成、运行状态、会话表；中英文字典与样式 |
| `lib/fold.js` | 纯事件折叠：Token、轮次、步、工具耗时分类、TTFT/解码、每日桶 |
| `lib/cpu.js` | 300ms CPU / 内存采样 |
| `lib/qwen.js` | 千问 CLI 调用、解析与额度缓存 |
| `locale/{en,zh}.json` | 插件管理器显示的标题与说明 |
| `icon.svg` | 侧边栏与插件列表图标 |

## 已知限制

- 已存会话超过 500 个时只统计最近创建的 500 个，并在面板顶部告警。
- 首次刷新需要读完所有已存日志；之后只读取有变化的日志（按持久化 revision）。
- 千问额度查询依赖本机 CLI 登录状态，单次耗时通常 20–40 秒。
- 运行状态是刷新时的一次性采样，不是历史监控。

## License

[MIT](LICENSE) © 2026 baisauce