# Task Tracker — 项目健康度与遗漏审查

**审查日期：** 2026-10-21（MYT）  
**仓库：** `jaronhoh/Task-Tracker` / `main`  
**性质：** 文档及代码静态审查（READ-ONLY）；**不是**生产发布、数据修复、用户批准的新业务需求或完成的运行测试。

## 1. 执行摘要

截至本次 GitHub 检查，最新发布记录为 **ChatGPT Sites Version 15**（2026-10-19 16:24:47 MYT），项目 `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`；见 `docs/PROJECT_STATUS.md` 开头的部署记录。CR-020/021 经 PR #18 合并；最后提供直接证据的 CI 为 92 passed / 0 failed（Run 39219104492）；生产发布前后记录的 32 Tasks、6 Customers、2 Log Time、Sequence=33、Revision=171 逐行逐字段一致，Owner-only policy 未改变。

**结论：已交付功能基线完整，但仍不应标记为“生产级可靠性全面验收完成”。** 目前缺少对重要失败场景、恢复演练、长期可维护性和实际使用体验的系统性关门验收；有若干可从源代码直接看到的 Auto Save 细节需要重现测试和改进。

这里的 **P0/P1/P2 是待处理建议的优先级，不是已发生故障的宣告**。本次仅查 GitHub 仓库和既有部署/CI 记录，**没有通过 Sites 原生管理工具重新读取当前生产版本或 D1，也没有在生产环境运行操作**。

## 2. 已确认完成（以版本记录为依据）

- Phase 1 Task Tracker：任务/客户管理、状态与 Weekly/Status/All 视图、关键字搜索、Task Tracker 编辑及 Excel Export、Malaysia week/time 处理。
- Phase 2 Log Time：独立 Work Space、共享 Customer、关联或 one-off Custom Task、Date/Start/End 与 Time Spent 聚合、Activity、复制与编辑描述/备注/Tracker Link、Today/This Week/All、Accordion 分组、关键字 Search/Clear。
- CR-017～019：Edit Log Time 普通字段 Auto Save，Date/Start/End 一并 Save Time；Double Click/Enter 打开编辑窗口。
- CR-020/021：Accordion 标题日期与 Hours 以 `|` 分隔；五列 Log Time 表格，不显示 Actions / Edit / Delete，后端现有 DELETE API 未被移除。
- D1：现有数据通过跨记录的事务性 revision CAS；Log Time 禁止同一天的时段重叠并允许相邻时段；历史 Closed/Deleted 链接保留用于累计与修正。
- 版本 15 生产验证记录覆盖日期视觉、五列、选中/双击/Enter、桌面 Light/Dark、近 400px mobile、完整 D1 对比和 Owner-only policy。**生产环境成功写入 Auto Save/Save Time 未直接测试；其成功写入证据来自隔离 Chromium/D1 CI。**

## 3. 待处理问题及建议

### P0 / 立即确认的权限与发布边界

**SEC-01 — GitHub Repository 的实际可见性为 Public；与 Sites Owner-only 是两个独立权限。**  
**证据：** GitHub `get_repo` 当前返回 `visibility: public`；`PROJECT_STATUS.md` 记录 Sites 为 Owner-only。二者并不冲突，但**Private Sites 不会自动保护 GitHub 仓库内容**。如果公开代码与项目文档并非预期，应由 Owner 审查仓库可见性、历史提交中的业务名称/数据、测试样本和任何潜在凭据，并决定是否改为 Private。**没有发现凭据泄露的证据，本次也没有进行机密扫描；不要声称数据已经泄漏。** 在权限意图确认前，不要自动修改仓库权限或重写 Git 历史。

**DEPLOY-01 — 发布记录与当前活跃部署之间的时间差。**  
**证据：** 最近的可核查 GitHub 发布报告是 v15（10/19）。需要在 Sites 的原生部署管理界面单独确认**当前** Version、URL、Owner-only policy、DB Binding 与 production health；GitHub 文档不能当作实时部署 API。无须重发 v15，除非核对发现版本漂移。

### P1 / 下一轮稳定性优先解决

**REL-01 — Auto Save 成功后刷新失败的提示被清除（静态代码发现，需回归验证）。**  
**证据：** `sites/react-d1/frontend/src/LogTime.tsx` 的 `autoSave()` 在 `onSaved()` 失败时 `setError('Saved successfully, but refreshing the table failed...')`，但随后成功分支无条件 `setError('')`，会清掉该提示并显示 Saved。  
**影响：** 记录已保存而 UI 未刷新时，用户可能误认为页面已经同步；属于提示/状态一致性缺陷，不是已证实的数据损坏。  
**建议：** 明确区分 `persisted`、`refresh failed`、`save failed`；保留可见提示及显式重试；使用故障注入验证 API PATCH 成功而 refresh 失败的路径。

**REL-02 — Linked → Custom Task 在 Custom Title 最终确认前就会清除关联（静态代码发现，需产品/QA 决策）。**  
**证据：** `LogTime.tsx` 的 `switchToCustom()` 立即 `autoSave({taskId:null})`，即使用户尚未输入正式 Custom Task Title；现有已保存 `taskTitle` 会暂时沿用原 Task 名。  
**影响：** 点击 `+ Add Custom Task` 后关闭/取消，仍可能已经把原关联解除，Task Tracker Time Spent 随之变化。这是否符合“选择即保存”的预期**尚未经过用户确认**。  
**建议：** 在隔离 D1 验证切换/取消/离开/失败行为；建议将取消关联与已验证的 Custom Title 作为一个原子操作，或明确提示已经保存且提供撤回机制；不要擅自改变业务规则。

**REL-03 — 新建 Log Time 的 POST 成功而表格 Refresh 失败会被当成保存失败（静态代码发现）。**  
**证据：** `LogTime.tsx` `create()` 将 `await api(POST)` 和 `await onSaved()` 包在同一 `try/catch`；刷新失败直接进入 `Save failed` 提示。  
**影响：** 用户可能误以为记录未存入数据库而重新提交；现有重叠校验有助于防止同时间重复，但用户体验和判错仍不准确。  
**建议：** 将写入结果与刷新结果分开显示；前端保存成功后即记录 ID 并允许 Retry Refresh，避免重复 POST。测试模拟 POST 201 后 GET 失败/超时。

**DATA-01 — 未找到定期备份与独立恢复演练的已完成证据。**  
**证据：** 发布时的“前后只读 D1 快照 + saved Sites Version”证明无意外修改，不等同可恢复的**定期数据备份**；现有 README 仅提保留 backup/rollback 路径。  
**建议：** 确认 Sites/D1 实际支持的合法备份/导出方式、加密保管、保留周期、Owner 操作权限；在隔离数据库实演恢复及行数/UUID/时区/Sequence/Revision 一致性；严禁将真实客户数据提交到 public GitHub。分清**回滚前端版本**与**恢复数据库数据**的能力。

**QA-01 — 非 Owner / 未授权 API 的拒绝访问未在本次发布记录中展示负向验收证据。**  
**证据：** Owner-only 配置核对通过，但这只能证明策略配置与发布一致，不能单凭此证明所有 HTTP 入口在匿名/非 Owner 情况下都拒绝访问。  
**建议：** 以不含真实数据的无写入方法验证匿名/非 Owner 对 Site/API/相关资源被阻断；记录响应和访问政策，避免泄露业务数据。

**UX-01 — 移除表格 Edit 按钮后，真实触屏用户如何进入 Edit 仍需独立可用性确认。**  
**证据：** 当前 row 仅有 `onDoubleClick` 和 keyboard Enter 打开 Edit（single click 只选中）；已有 390px Chromium 测试与约 400px 生产布局检查，但不等于针对真实手机触控的可发现性/稳定性验收。  
**建议：** 真正触屏设备验证双击手势、滚动冲突、聚焦和编辑成功；若发现操作困难，提出**不恢复 Actions Column**的方案供 Owner 选择（例如触控专用明确编辑入口），勿未经批准改变单击语义。

### P2 / 改善长期维护与用户体验

**DOC-01 — README/PRD 的现时性不足。**  
仓库根 `README.md` 仍以 Phase 1/SQLite/旧托管模式为主；`sites/react-d1/README.md` 仍包含迁移初期的旧测试数量和原始界面描述；Phase 2 PRD 第 7/8 节保存了 v12/v13 时代状态，早期 F05 仍列出 Actions 列，但第 9 节已覆盖。  
**建议：** README 首页明确“当前生产系统 = Sites React + D1 v15”，将旧方案标为 Legacy；PRD 增设**当前生效规则索引**而非删除历史记录；`PROJECT_STATUS.md` 设简短 Current State + Open Risks + Version History 目录，提高跨新会话交接质量。

**PERF-01 — 扩容及长时间运行场景尚缺基准。**  
**证据：** `db/repository.mjs` 每次 mutation 会完整读取任务/客户/log_time，并基于快照生成 diff；`GET /api/tasks` 为每个任务扫描所有 Log Time 计算 Time Spent。当前发布记录的数据量很小（32 Tasks / 2 Logs），其正确性不能代表千级日志性能。`sites/react-d1/README.md` 亦承认大历史量需要分页并尚未进行生产规模负载测试。  
**建议：** 合成数据 100 / 1,000 / 10,000 Logs，测 GET、写入、Search、滚动、Time Spent、并发冲突及 D1 配额；需要时再设计分页、查询索引与 SQL 聚合，不要为目前的微量数据盲目重构。

**UX-02 — 跨 Malaysia 日期/周切换的长期开页更新尚需测试。**  
**证据：** `LogTime.tsx` 的 Today/Week 汇总直接在 React render 时计算，未见跨午夜主动刷新计时器；打开页面后不操作可能继续显示前一日视图直至下一次 render/refresh。  
**建议：** 使用模拟时间验证 23:59→00:00 及星期日→星期一；考虑在 Malaysia 日期边界触发重新计算（不写数据库），并处理后台 tab 恢复。

**PRODUCT-01 — Log Time Excel Export / 按日期范围查询属于候选增强，不是缺陷。**  
目前 Task Tracker 已有 Excel Export，但 Log Time 核心 UI 只有 Today/This Week/All 和 Search，未见 Log Time 专属导出。是否需要工时报表、日期范围筛选，应由 Owner 确认后才入 PRD；不要抢先开发。

**RECOVERY-01 — 删除操作已从 Log Time UI 移除，误录历史记录的修正/撤销路径不清。**  
这是用户明确批准的 CR-021；后端 DELETE 仍存在。本项不是要求重新加入 Actions/Delete 按钮，而是需要明确当输入了错误但与其他日志发生时间冲突、或需纠正历史数据时的安全流程。优先设计仅 Owner 使用的备份/修正说明；任何新增删除 UI 必须先获批准。

**OPS-01 — 发布后持续监测与独立回归。**  
当前 `GET /api/health` 提供连通性，但版本、数据库数据健康、错误率、备份成功与未授权访问是否定期检查，仍需运营计划。CI 仅在代码 PR/指定 push 路径运行；建议轻量发布前 Checklist + 发布后 read-only smoke + 定期备份完整性/授权回归，定义责任与处置。

## 4. 优先执行顺序（建议）

| 阶段 | 目标 | 准入/完成证据 |
| --- | --- | --- |
| **H0 安全与基线确认** | 仓库 Public 是否预期、确认 Sites 当前 v15 / Owner-only / DB binding，核对现有业务数据的只读健康 | Owner 决策、实际 Sites 只读检查、无敏感内容误公开的审查结果 |
| **H1 Auto Save 可靠性** | 修复 REL-01/03，并明确 REL-02 的正确保存语义；追加故障注入测试与保存/刷新状态模型 | CI Green、断网/超时/冲突/切换 Custom Task 测试、无误导提示或无意解除关联 |
| **H2 数据恢复机制** | 备份与隔离 Restore Drill、无权限访问拒绝测试 | 备份有效性、逐字段校验、RTO/RPO 的最低可接受目标、Owner-only API 负向测试 |
| **H3 真实使用验收** | 手机触控操作、跨午夜日期翻转、页面连续运行 | 真机/触控验收和模拟午夜测试，无 UI 编辑障碍 |
| **H4 长期维护** | README/PRD 文档归一、千级日志压力测试、必要时才设计 Log Time 导出 | 可重复交接的文档、性能基准与明确的下一版需求决策 |

**建议第一轮修复优先于新 UI 特性开发。** 如有任何改变用户现有保存/删除/触控行为的决定，应先让 Owner 批准再动业务规则。

## 5. 质量门槛与证据说明

- 审查方式：读取 GitHub `main` 的 `docs/PROJECT_STATUS.md`、`docs/PRD_PHASE2_LOG_TIME_2026-10-19.md`、前端 `LogTime.tsx`、`App.tsx`、`Editors.tsx`、API/service/rules、`db/repository.mjs`、React/UI/D1 tests、CI workflow 和 README；GitHub Repository Metadata。
- 基础提交：`847b7b18ad8ad185c9a94adb7fde062a1f6a35c6`（文档 v15 完成记录），最近实施提交 `bfbd80eab3c9f626134407a73cabcf2bddc8a6ed`（PR #18）。
- 本文的 P0/P1/P2 不是现场事故分级；**源代码中存在的分支逻辑属于可验证发现，实际用户影响仍须用合成数据重现。**
- 没有执行生产写入、部署、DB 修改、仓库权限修改或新的 CI；这是一份改进待办与验收设计。
- GitHub branch protection endpoint 因权限不足未获检查结果，**不能因此假定保护已开启或已关闭**。

## 6. 出口条件：什么叫“项目做好”

1. 用户核心日常流程在真实手机/电脑可操作，数据准确；Work Date、Duration、Status、Customer 与 Time Spent 的跨界规则回归通过。
2. Auto Save 对成功、失败、刷新失败、断网、冲突、关闭弹窗均给出真实状态，不发生无意的任务关联变化。
3. Owner-only 访问不仅配置正确，匿名/非 Owner 的敏感接口访问也经独立拒绝测试。
4. 数据拥有独立可恢复的备份及经过测试的 Restore 程序；前端版本回滚不会丢失或重置 D1。
5. 有可重复的 GitHub → CI → Sites 发布、部署后只读核对、回滚与故障处理 Checklist。
6. 文档和代码对“当前版本/实际技术栈/有效业务规则”的表述一致；历史记录保留且明确归档。
