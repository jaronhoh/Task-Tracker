# PRD 文档

## 0. 文档信息

| 字段 | 内容 |
|------|------|
| 产品名称 | Task Tracker |
| 版本 | Phase 1 PRD |
| 负责人 | Product / Project Team |
| 来源定型稿 | Phase 1/01-产品定义/06-最终定型稿.md |
| UI 设计基准 | shadcn/ui |
| 开发目标 | Vibe.Power Apps |
| 最后更新时间 | 2026-10-15 |

## 1. 项目背景与范围

### 1.1 背景

Task Tracker 是一个独立 Web App，用于记录、跟进和每周汇报工作任务。产品采用 Single Page HTML + JavaScript、SQLite 与 DataTables，提供 Microsoft Lists / Power Apps 风格的任务表格体验。

本 PRD 以冻结版产品定型稿为主要事实来源。

### 1.2 目标

- 建立统一的 Task 记录方式。
- 支持 Task 建立、编辑、状态管理及历史查看。
- 支持 Weekly Task 与 Current Week Status 周期性工作查看。
- 支持 Customer 管理。
- 支持 REST API Task CRUD。
- 支持当前 View Excel Export。
- 支持 Show All Data 的 Edit Time，以修正 Created / End 并维持 End 与 Status 一致。
- 由 Vibe.Power Apps 负责后续开发落地。
- UI 采用 shadcn/ui 作为主要设计与组件基准。

### 1.3 成功指标

Phase 1 应至少满足：

1. 用户能够建立并维护 Task。
2. Weekly Task 与 Current Week Status 能按既定规则正确显示。
3. Deleted Task 不从数据库物理删除，并可通过 Show All Data 恢复。
4. Customer 可在 Task 流程内维护，最多16个且颜色唯一。
5. REST API 能完成 Task CRUD。
6. 每个 View 能导出当前显示结果。
7. Edit Time 不产生 Active Status + non-empty End 的不一致数据。
8. UI 与交互符合已选定的 shadcn/ui 设计体系。
9. PRD 能作为 Vibe.Power Apps 的实现依据。

### 1.4 MVP 范围

- Task Management
- Weekly Task
- Current Week Status
- Show All Data
- Global Search
- Customer Add/Edit
- REST API Task CRUD
- Excel Export
- Show All Data Edit Time

### 1.5 暂缓范围

- Phase 2
- Bulk Action
- 独立 Customer Management 页面
- Physical Delete
- 复杂权限体系

## 2. 用户与场景

### 2.1 用户角色

Phase 1 不定义复杂权限体系。

| 用户/对象 | 说明 |
|-----------|------|
| Task 使用者 | 建立、编辑、查看、搜索和导出 Task |
| 外部调用方 | 通过 REST API 进行 Task CRUD |
| Vibe.Power Apps | Phase 1 的开发实现方 |

### 2.2 核心场景

1. 建立 Task。
2. 编辑 Task 并自动保存。
3. 查看 Weekly Task。
4. 查看 Current Week Status。
5. 搜索全部历史 Task。
6. Add/Edit Customer。
7. 使用 REST API 操作 Task。
8. 导出当前 View。
9. 使用 Edit Time 修正 Created / End。

### 2.3 用户故事

- 作为 Task 使用者，我希望快速建立 Task，以记录工作事项。
- 作为 Task 使用者，我希望编辑 Task 后自动保存，减少重复操作。
- 作为 Task 使用者，我希望查看本周新任务及历史未完成任务。
- 作为 Task 使用者，我希望按当前周的 Status 查看任务分布。
- 作为 Task 使用者，我希望搜索历史 Task。
- 作为 Task 使用者，我希望在需要时维护 Customer。
- 作为 Task 使用者，我希望导出当前 View 供周报或其他用途使用。
- 作为 Task 使用者，我希望在 Show All Data 修正 Created / End，并由系统保证 End 与 Status 一致。

## 3. 产品流程总览

```mermaid
flowchart TD
    V["View Tabs"] --> N["New Task"]
    V --> E["Select Task Row"]
    V --> S["Search"]
    V --> X["Export Excel"]
    V --> A["Show All Data"]
    E --> D["Edit Task Dialog"]
    D --> L["Status Lifecycle"]
    A --> T["Edit Time"]
    T --> C["Closed / Deleted Confirmation"]
```

## 4. UI 与开发基准

### 4.1 UI Design System

Phase 1 UI 以 **shadcn/ui** 为主要设计与组件基准。

要求：

- 优先使用 shadcn/ui 提供的组件与设计模式。
- 保持整体视觉、间距、Typography、表单、Dialog、Button、Dropdown、Table、Tabs、Badge 等组件的一致性。
- 允许根据 Task Tracker 需求进行组件组合与样式定制。
- UI 不以旧式 Microsoft Lists / Power Apps 视觉作为最终设计规范；Microsoft Lists / Power Apps 仅作为业务使用方式和信息密度的参考。
- 后续 Prototype 与 Development 应以 shadcn/ui 当前官方设计体系为准。

shadcn/ui 官方文档：urlshadcn/uihttps://ui.shadcn.com

### 4.2 Development Target

Phase 1 的实际开发目标为 **Vibe.Power Apps**。

PRD 应：

- 使用清晰、可实现的 UI 与交互描述。
- 明确页面、组件、状态、数据和验收行为。
- 避免依赖只存在于设计稿中的隐性行为。
- 让 Vibe.Power Apps 能根据 PRD 直接实现和验证功能。

## 5. 模块概览

| ID | 模块 | 范围 |
|----|------|------|
| F01 | Task Management | Task 建立、编辑、状态与自动保存 |
| F02 | Task Views & Search | 三个 View 与 Global Search |
| F03 | Customer Management | Customer Add/Edit 与固定颜色 |
| F04 | Task Time Management | Edit Time 与 End/Status 一致性 |
| F05 | Integration & Export | REST API 与 Excel Export |

## 6. 功能需求

### 6.1 F01 Task Management

#### 6.1.1 F01-01 New Task

**1. 功能目标**

允许 Task 使用者建立 Task，并由系统生成 Task ID 与 Created 时间。

**2. 流程与页面交互**

| 页面/区域 | 入口 | 关键组件 | 退出/下一步 |
|-----------|------|----------|-------------|
| 当前 View | 点击 `+ New Task` | Button | 打开 New Task Dialog |
| New Task Dialog | 从当前 View 打开 | 居中 Dialog，宽度约 800px；表单字段；Create、Cancel、X | Create 成功后关闭并刷新当前列表；Cancel/X 关闭且不建立记录 |

**3. 状态说明**

| 状态 | 触发条件 | UI/系统行为 |
|------|----------|-------------|
| 编辑中 | 打开 New Task Dialog | 用户填写表单；尚未建立记录 |
| 验证失败 | 必填字段为空或输入不符合限制 | 显示字段验证提示，不建立记录 |
| 创建成功 | 用户点击 Create 且验证通过 | 保存 Task、关闭 Dialog、刷新当前 View |
| 已取消 | 用户点击 Cancel 或 X | 关闭 Dialog，不保存草稿、不建立记录 |

**4. 业务规则**

1. Customer Name 与 Task Title 为必填字段。
2. Task Title 为单行文本，最多 100 个字符。
3. Task Description 为可选单行文本，最多 255 个字符。
4. Note 为可选多行文本，最多 1000 个字符。
5. Status 默认值为 `KIV`。
6. Task ID 由系统生成，格式为 `TSK-0001`、`TSK-0002`，必须唯一、永久且不得重复使用。
7. Created 由系统以当前 Malaysia Time (UTC+8) 生成。
8. 新 Task 的 End 初始为 NULL。
9. New Task 不采用 Auto Save；只有点击 Create 且验证通过后才建立记录。
10. Customer 下拉列表及 Customer 新增/编辑行为由 F03 定义。

**5. 数据要求**

| 对象 | 字段 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| Task | Task ID | String | 是 | 系统生成；唯一、永久、不重复使用 |
| Task | Customer Name | Customer reference | 是 | 从 Customer 下拉列表选择 |
| Task | Task Title | String(100) | 是 | 单行 |
| Task | Task Description | String(255) | 否 | 单行 |
| Task | Note | String(1000) | 否 | 多行 |
| Task | Created | DateTime | 系统生成 | Malaysia Time UTC+8 |
| Task | End | Nullable DateTime | 否 | 初始为 NULL |
| Task | Status | Enum/String | 是 | 默认 KIV |

**6. 验收标准**

- [ ] AC-F01-01-01：点击 `+ New Task` 后，显示居中、约 800px 宽的 Dialog。
- [ ] AC-F01-01-02：Customer Name 或 Task Title 为空时，不允许创建，并显示验证提示。
- [ ] AC-F01-01-03：Task Title 超过 100 个字符时，系统阻止超限输入或拒绝提交并提示。
- [ ] AC-F01-01-04：Task Description 最多 255 个字符，Note 最多 1000 个字符。
- [ ] AC-F01-01-05：创建成功的 Task 获得唯一且按既定格式生成的 Task ID。
- [ ] AC-F01-01-06：新 Task 的 Status 为 KIV、Created 为当前 Malaysia Time、End 为 NULL。
- [ ] AC-F01-01-07：点击 Create 成功后 Dialog 关闭，当前列表刷新。
- [ ] AC-F01-01-08：点击 Cancel 或 X 后不建立 Task。

**7. 权限**

| 角色/对象 | 权限 | 说明 |
|-----------|------|------|
| Task 使用者 | Create | Phase 1 不定义复杂权限体系 |
| 外部调用方 | 不在本功能范围 | API 创建规则由 F05 定义 |

#### 6.1.2 F01-02 Edit Task

**1. 功能目标**

允许 Task 使用者编辑 Task 的业务字段，并在字段失焦时自动保存。

**2. 流程与页面交互**

| 页面/区域 | 入口 | 关键组件 | 退出/下一步 |
|-----------|------|----------|-------------|
| Task List Row | 点击整行 | 可点击数据行 | 打开该 Task 的 Edit Task Dialog |
| Edit Task Dialog | 点击 Task 行 | 居中 Dialog，宽度约 800px；可编辑字段；只读字段；X/Close | 字段 Blur 后保存；关闭后刷新当前列表 |

**3. 状态说明**

| 状态 | 触发条件 | UI/系统行为 |
|------|----------|-------------|
| 查看/编辑 | 打开已有 Task | 显示字段值；系统字段只读 |
| 字段已修改 | 用户更改可编辑字段 | 暂存该字段的输入值，等待 Blur |
| 保存中 | 修改字段发生 Blur | 保存该字段；避免重复提交同一未完成请求 |
| 保存成功 | 后端保存成功 | 显示已保存状态或采用不打断操作的反馈 |
| 保存失败 | 后端拒绝或请求失败 | 明确告知保存失败，不得静默丢弃；保留输入值并允许重试 |

**4. 业务规则**

1. 点击 Task 数据行打开 Edit Task Dialog。
2. 可编辑字段：Customer Name、Task Title、Task Description、Note、Status。
3. 只读字段：Task ID、Created、End。
4. 任一可编辑字段发生修改并 Blur 后，系统立即保存该字段。
5. 不提供 Save Button。
6. 点击 X/Close 直接关闭 Dialog，不额外显示 Save Confirmation。
7. 关闭 Dialog 后刷新当前 Task List。
8. Created 与 End 不可通过普通 Edit Task 修改；时间修正只能通过 F04 的 Edit Time。
9. Status 更新必须执行 F01-03 的 End 联动规则。
10. Customer 选择与维护规则由 F03 定义。

**5. 数据要求**

| 对象 | 字段 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| Task | Task ID | String | 是 | 只读 |
| Task | Customer Name | Customer reference | 是 | 可编辑 |
| Task | Task Title | String(100) | 是 | 可编辑 |
| Task | Task Description | String(255) | 否 | 可编辑 |
| Task | Note | String(1000) | 否 | 可编辑 |
| Task | Created | DateTime | 是 | 只读；仅 F04 可修正 |
| Task | End | Nullable DateTime | 否 | 只读；仅 F04 可修正 |
| Task | Status | Enum/String | 是 | 可编辑 |

**6. 验收标准**

- [ ] AC-F01-02-01：点击 Task 行后，打开对应 Task 的 Edit Task Dialog。
- [ ] AC-F01-02-02：Task ID、Created、End 显示为只读。
- [ ] AC-F01-02-03：Customer Name、Task Title、Task Description、Note、Status 可编辑。
- [ ] AC-F01-02-04：可编辑字段修改后 Blur，系统自动保存，不需要点击 Save。
- [ ] AC-F01-02-05：必填字段不符合规则时，不保存无效值，并向用户显示原因。
- [ ] AC-F01-02-06：保存失败时用户可见错误，输入值不会被静默丢弃。
- [ ] AC-F01-02-07：点击 X/Close 不显示 Save Confirmation；关闭后当前列表刷新。
- [ ] AC-F01-02-08：普通 Edit Task 不能修改 Created 或 End。

**7. 权限**

| 角色/对象 | 权限 | 说明 |
|-----------|------|------|
| Task 使用者 | View/Edit | Phase 1 不定义复杂权限体系 |
| 外部调用方 | 不在本功能范围 | API 更新规则由 F05 定义 |

#### 6.1.3 F01-03 Status Lifecycle

**1. 功能目标**

定义 Task 的状态集合、状态转换及 Status 与 End 字段之间必须维持的一致性。

**2. 流程与页面交互**

| 页面/区域 | 入口 | 关键组件 | 退出/下一步 |
|-----------|------|----------|-------------|
| New Task Dialog | 创建 Task | Status Select | 默认 KIV |
| Edit Task Dialog | 编辑 Task | Status Select | 选择新 Status 后按本功能规则保存 |
| Task List | 查看任务 | Status Badge | 显示当前 Status；具体 View 过滤由 F02 定义 |

**3. 状态说明**

| Status | 分类 | 进入该状态时的 End 行为 |
|--------|------|-------------------------|
| Work in Progress | Active | End 清为 NULL |
| Pending with Customer | Active | End 清为 NULL |
| KIV | Active | End 清为 NULL |
| Closed | Terminal-like business status | End 设置为当前 Malaysia Time |
| Deleted | Logical Delete | End 设置为当前 Malaysia Time |

**4. 业务规则**

1. 系统固定提供五种 Status：Work in Progress、Pending with Customer、KIV、Closed、Deleted。
2. 新 Task 默认 Status 为 KIV。
3. 任何 Status 均可直接转换到其他任意 Status。
4. Active Status 包括 Work in Progress、Pending with Customer、KIV。
5. Active Status 转为 Closed 或 Deleted 时，End 更新为当前 Malaysia Time (UTC+8)。
6. Closed 转为 Deleted 时，End 更新为当前 Deleted 时间。
7. Deleted 转为 Closed 时，End 更新为当前 Closed 时间。
8. Closed 或 Deleted 转为任意 Active Status 时，End 清为 NULL。
9. 必须保证 Active Status 的 End 为 NULL；Closed / Deleted 的 End 必须有值。
10. Status 与 End 的一致性必须由系统端强制执行，不能只依赖 UI 控制。
11. Deleted 是 Logical Delete，不执行物理删除。记录保留在 SQLite，并可在 Show All Data 中恢复。
12. Status 颜色：Work in Progress 为绿色、Pending with Customer 为橙色、KIV 为蓝色、Closed 为红色、Deleted 为灰色/黑色。具体颜色值应在 UI 实现时保持一致。
13. Status 在 Weekly Views 的显示与过滤规则由 F02 定义。

**5. 数据要求**

| 对象 | 字段 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| Task | Status | Enum/String | 是 | 五种固定值之一 |
| Task | End | Nullable DateTime | 依 Status | Active 必须 NULL；Closed/Deleted 必须有值 |

**6. 验收标准**

- [ ] AC-F01-03-01：系统仅提供规定的五种 Status。
- [ ] AC-F01-03-02：新建 Task 默认 KIV。
- [ ] AC-F01-03-03：任意 Status 可以直接转换到其他任意 Status。
- [ ] AC-F01-03-04：Active 转 Closed 时，End 更新为当前 Malaysia Time。
- [ ] AC-F01-03-05：Active 转 Deleted 时，End 更新为当前 Malaysia Time。
- [ ] AC-F01-03-06：Closed 转 Deleted 或 Deleted 转 Closed 时，End 更新为此次状态变更的当前时间。
- [ ] AC-F01-03-07：Closed/Deleted 转 Active 时，End 清为 NULL。
- [ ] AC-F01-03-08：系统拒绝或自动纠正 Active Status + non-NULL End 的不一致数据。
- [ ] AC-F01-03-09：系统拒绝或自动纠正 Closed/Deleted + NULL End 的不一致数据。
- [ ] AC-F01-03-10：将 Status 改为 Deleted 不会物理删除 Task 记录。

**7. 权限**

| 角色/对象 | 权限 | 说明 |
|-----------|------|------|
| Task 使用者 | Change Status | 通过 New/Edit Task 操作 |
| 外部调用方 | 不在本功能范围 | API Status 更新规则由 F05 定义 |

#### 6.1.4 F01-04 Auto Save

**1. 功能目标**

让编辑中的 Task 字段在失焦时自动保存，同时避免无效数据或保存失败被静默忽略。

**2. 流程与页面交互**

| 页面/区域 | 入口 | 关键组件 | 退出/下一步 |
|-----------|------|----------|-------------|
| Edit Task Dialog | 修改可编辑字段 | Input、Textarea、Select | Blur 后保存该字段 |
| 字段保存反馈 | 保存请求进行中/完成/失败 | Inline status / Toast | 成功继续编辑；失败显示错误并允许重试 |

**3. 状态说明**

| 状态 | 触发条件 | UI/系统行为 |
|------|----------|-------------|
| 未修改 | 字段值未改变 | 不发起保存 |
| 待保存 | 字段值发生改变 | 保留当前输入值 |
| 保存中 | 字段 Blur | 提交字段变更 |
| 已保存 | 请求成功 | 更新本地数据状态 |
| 保存失败 | 请求失败或验证失败 | 显示可理解的错误，保留输入供修正/重试 |

**4. 业务规则**

1. Auto Save 适用于已有 Task 的可编辑字段。
2. 字段值未改变时，不发起无意义的保存请求。
3. 字段 Blur 后保存；Status 变更必须同时应用 F01-03 的 End 规则。
4. New Task 不使用 Auto Save；必须点击 Create。
5. Task ID、Created、End 不参与普通 Auto Save 编辑。
6. 保存成功与失败必须有清晰的用户反馈；不得将失败呈现为成功。
7. 关闭 Dialog 不显示 Save Confirmation。若保存请求仍在进行中，界面必须避免造成数据尚未保存却已成功保存的误导；实现需确保请求结果可被正确处理。

**5. 数据要求**

| 对象 | 字段 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| Task | 可编辑业务字段 | 按各字段定义 | 依字段 | 修改后 Blur 保存 |
| Task | Status / End | Enum/String + Nullable DateTime | 依状态规则 | Status 保存时联动 End |

**6. 验收标准**

- [ ] AC-F01-04-01：没有实际字段变更时，不触发保存请求。
- [ ] AC-F01-04-02：已有 Task 的可编辑字段 Blur 后自动保存。
- [ ] AC-F01-04-03：New Task 在点击 Create 前不会被保存。
- [ ] AC-F01-04-04：保存成功与失败均有清楚反馈。
- [ ] AC-F01-04-05：保存失败时不显示成功状态，输入值保留以便修正或重试。
- [ ] AC-F01-04-06：Status 保存与 End 的联动规则一致。
- [ ] AC-F01-04-07：普通 Auto Save 不允许修改 Task ID、Created、End。

**7. 权限**

| 角色/对象 | 权限 | 说明 |
|-----------|------|------|
| Task 使用者 | Edit fields | 仅限可编辑字段 |
| 外部调用方 | 不在本功能范围 | API 更新由 F05 定义 |

#### 6.1.5 F01-05 Task Lifecycle

**1. 功能目标**

定义 Task 从建立、日常编辑、状态变更到逻辑删除/恢复的生命周期边界。

**2. 流程与页面交互**

| 页面/区域 | 入口 | 关键组件 | 退出/下一步 |
|-----------|------|----------|-------------|
| New Task | `+ New Task` | Create Dialog | 建立 KIV Task |
| Edit Task | 点击 Task 行 | Edit Dialog | 编辑字段或改变 Status |
| Status Lifecycle | 修改 Status | Status Select | 自动维护 End |
| Show All Data | 进入历史数据 View | Task Table | 可查看 Deleted Task 并通过 Status 恢复；View 细节由 F02 定义 |

**3. 状态说明**

```mermaid
stateDiagram-v2
    [*] --> KIV: Create
    state "Work in Progress" as WIP
    state "Pending with Customer" as PWC
    state "KIV" as KIV
    state "Closed" as Closed
    state "Deleted" as Deleted
    KIV --> WIP
    KIV --> PWC
    KIV --> Closed
    KIV --> Deleted
    WIP --> KIV
    WIP --> PWC
    WIP --> Closed
    WIP --> Deleted
    PWC --> KIV
    PWC --> WIP
    PWC --> Closed
    PWC --> Deleted
    Closed --> KIV
    Closed --> WIP
    Closed --> PWC
    Closed --> Deleted
    Deleted --> KIV
    Deleted --> WIP
    Deleted --> PWC
    Deleted --> Closed
```

**4. 业务规则**

1. Task 建立后获得永久 Task ID；Task ID 不因 Status 变化而改变。
2. Task 可以在五种 Status 之间直接转换。
3. Deleted Task 保留于数据库，不执行 Physical Delete。
4. 将 Deleted Task 的 Status 改为任意 Active Status，即恢复为 Active Task，End 清为 NULL。
5. Task 的周归属以 Created 为依据；Created 在普通 Edit Task 中不可修改。
6. Created 的特殊修正由 F04 Edit Time 定义。
7. Task 的周视图和历史列表可见性由 F02 定义。
8. API 触发的生命周期操作由 F05 定义，但必须遵循相同的 Status/End 一致性规则。

**5. 数据要求**

| 对象 | 字段 | 类型 | 必填 | 备注 |
|------|------|------|------|------|
| Task | Task ID | String | 是 | 永久唯一标识 |
| Task | Status | Enum/String | 是 | 生命周期状态 |
| Task | Created | DateTime | 是 | 默认创建时间；周归属依据 |
| Task | End | Nullable DateTime | 依 Status | 终结状态时间 |

**6. 验收标准**

- [ ] AC-F01-05-01：新建 Task 从 KIV 开始。
- [ ] AC-F01-05-02：Task ID 在整个生命周期内保持不变。
- [ ] AC-F01-05-03：Task 可在所有五种 Status 间直接转换。
- [ ] AC-F01-05-04：Deleted Task 记录仍保留在数据库。
- [ ] AC-F01-05-05：Deleted Task 可通过 Status 修改恢复，恢复为 Active 后 End 为 NULL。
- [ ] AC-F01-05-06：普通 Edit Task 不修改 Created；周归属以 Created 为依据。
- [ ] AC-F01-05-07：UI 与 API 的 Status/End 一致性规则相同。

**7. 权限**

| 角色/对象 | 权限 | 说明 |
|-----------|------|------|
| Task 使用者 | Create/View/Edit/Change Status/Logical Delete | Phase 1 不定义复杂权限体系 |
| 外部调用方 | 通过 API 操作 | API 范围及验证由 F05 定义 |

### 6.2 F02 Task Views & Search

待进入 F02 模块详细评审。

### 6.3 F03 Customer Management

待进入 F03 模块详细评审。

### 6.4 F04 Task Time Management

待进入 F04 模块详细评审。

### 6.5 F05 Integration & Export

待进入 F05 模块详细评审。

## 7. 非功能需求

### 7.1 性能需求

Phase 1 暂不定义具体性能指标；后续若出现影响工程实现或验收的性能要求，应进入待决策事项。

### 7.2 时间与时区

系统业务时间统一使用 Malaysia Time (UTC+8)。

### 7.3 数据保留

Deleted Task 为 Logical Delete，Task 记录保留于 SQLite。

### 7.4 可维护性

系统采用 Single Page HTML + JavaScript、SQLite 和 DataTables 的独立 Web App 架构。

### 7.5 UI 一致性

UI 组件和交互模式应优先遵循 shadcn/ui，避免同一功能出现多套不一致的组件行为。

### 7.6 AI / Vibe Development Compatibility

PRD 的页面、组件、业务规则、状态、数据字段及验收标准应保持结构化、明确和可追溯，以便 Vibe.Power Apps 进行 AI-assisted implementation。

## 8. 数据埋点

Phase 1 未定义产品数据埋点需求。

## 9. 异常处理和风险

- Customer 达到16个后，不允许创建新的 Customer。
- Task 建立时 Customer 为必填。
- Active Task 使用 Edit Time 设置 End 时，必须完成 Closed / Deleted 选择。
- 不允许保存 Active Status + non-NULL End 的不一致数据。
- 不允许 Closed/Deleted + NULL End 的不一致数据。
- Deleted Task 不显示在两个 Weekly Views，但必须保留于 Show All Data。
- Physical Delete 不属于 Phase 1。
- 未确认的新增业务规则不得直接写入正式功能正文。
- shadcn/ui 组件具体选型若影响工程实现，应在对应功能模块评审时明确。
