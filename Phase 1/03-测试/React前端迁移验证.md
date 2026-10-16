# React 前端迁移验证

日期：2026-10-16（Malaysia Time UTC+08:00）。本报告区分本地自动化、GitHub CI 与完整手工 PRD 验收。

## 基线与执行顺序

- Weekly Task 分组 PR #1 已合并；基线 main：60c89cb73aba9ddc46ebd18efd731d9e586f1766。
- 基线 CI：38823100847，成功；本地原版 API/UI 47 条、Weekly VM 5 条全部通过。
- 先提交 PRD：50843592dcf74d92808614ffc280ee0b22815bb0（docs/react-migration-prd）。PRD 路径：Phase 1/02-PRD/PRD文档.md，迁移要求见 4.3。
- 从文档提交建立 feat/react-shadcn-migration；前端基础及 React 测试提交：1b07e21dcdace374f24b0d1fc2722b59e9954c43。之后接入新入口、补齐 UI 回归并清理旧运行依赖。

## 最终本地结果

本机 Node v24.19.0；项目部署/CI 仍以 Node 22 为基准，CI 结果需单独检查。依赖锁定于 pnpm-lock.yaml。SQLite 原生模块已构建。

| 验证 | 实际结果 | 覆盖 |
|------|----------|------|
| TypeScript 严格检查 + Vite 生产构建 | 通过 | 真实 React/shadcn/Tailwind/TanStack/Lucide 入口；Excel 动态分块 |
| 原有 API 测试 | 44/44 通过 | CRUD、验证、原子性、并发、Customer 关联更新、Status/End、未来 Created、Restore |
| 原有 Weekly VM 测试 | 5/5 通过 | 原始用例断言保持，旧脚本归档于 app/test/fixtures/legacy-app.js，不作为运行入口 |
| 新增 React 模型/渲染/队列测试 | 7/7 通过 | 五个原有分组场景迁移对等覆盖，UTC+08 无时区字符串、串行失败恢复、导出分组 |
| 原有浏览器测试 | 3/3 通过 | 新建/嵌套 Customer、自动保存、四状态分组、关闭确认/取消、Excel、失败保留输入、16 色耗尽、Edit Time 校验 |
| 新增浏览器测试 | 3/3 通过 | 跨时区/窄屏/键盘与焦点；61 条分页/排序/重置/完整 XLSX 内容及单 Sheet；串行保存/重试/不重复 PATCH、Customer 改名/颜色、Deleted Restore |

合计：62 条自动化测试通过，0 失败。窄屏 390px 截图已检查，页面无横向溢出，表格在自身容器内横向滚动。键盘 Enter 打开时阻止默认动作，避免焦点转移后意外触发关闭按钮；Escape 关闭后焦点返回 Edit Task。

## 契约与范围核验

Express 仅将静态入口由 app/public 改为 Vite 生成的 app/dist，删除旧 vendor 路由与未使用的模块路径常量。HttpError 类起的全部业务/API/数据库处理代码与基线一致（仅文件末尾换行差异）。没有 schema 迁移。原有 API 测试未修改。

jQuery/DataTables 从两个 package.json 和运行入口移除。旧 UI 只留测试夹具以继续运行原有分组测试；React 测试和浏览器测试独立覆盖新实现。分组计数使用同一过滤结果与 Malaysia 周界快照；Current Week Status 四分类逻辑保持。Excel 使用过滤后的全部结果，保留分组标题，单 Sheet；61 条分页导出已读回工作簿验证。

CI 工作流新增锁定依赖、类型/构建、React 与新 UI 回归。ZIP 打包工作流改为先构建 app/dist；仅产出构建包，不执行部署。ChatGPT Sites 未修改、未部署；main 未直接修改。

## 限制与待完成事项

- 此报告记录本地结果；最终提交的 Node 22 GitHub CI 状态以 PR 检查为准。
- 既有 PRD 的全部人工测试映射、完整 P0 手工签核及部署持久化验收未在本次全部执行；不能将 62 条自动化等同全部 PRD 用例通过。
- 本次不合并 main、不部署。PR 评审、合并及未来发布仍待执行。
- 现有服务端带 +08:00 的时间输出与 PRD F05 无时区格式之间的历史差异保留；迁移不改变 API，前端兼容两种 Malaysia 时间表示。

## GitHub CI 修订记录

初次最终提交 307a9f4 的 Node 22 CI（38827541277）通过构建、React 7、API/历史分组及 5 条浏览器测试，但 390px 窄屏测试在 Linux 字体下检测到页面横向溢出。已修正 Tabs 的 flex/grid 最小宽度与内部横向滚动约束，保留原测试断言；修复提交的 CI 结果以 PR 最新检查为准。
