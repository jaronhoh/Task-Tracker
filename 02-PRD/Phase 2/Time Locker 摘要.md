# Phase 2 — Time Locker 摘要

## 1. 定位

Phase 2 暂不进入正式 PRD 写作。

Time Locker 建立在 Phase 1 Task Tracker 之上，重点不是重新建立任务，而是让使用者从 Phase 1 的 Task Tracker 中取得/认领一个 Task，并记录实际执行该 Task 的开始与结束时间。

## 2. 核心概念

Phase 1 负责：

- Task 的建立与管理
- Task 的状态与周报查看
- Task 的历史记录

Phase 2 Time Locker 负责：

- 从 Phase 1 Task Tracker 取得一个 Task
- 开始执行 Task 时记录 Start Time
- 完成执行时记录 End Time
- 形成 Task 的实际执行时间记录

因此，Phase 2 应以 Phase 1 的 Task 作为基础数据来源，而不是建立另一套独立 Task。

## 3. 初步使用流程

```text
Phase 1 Task Tracker
        ↓
选择 / 认领 Task
        ↓
Start
        ↓
执行 Task
        ↓
End
        ↓
形成 Time Locker 记录
```

## 4. UI 方向

初步方向类似 Microsoft Lists：

- 以列表 / 表格方式显示 Task。
- 用户可以从 Task 列表中选择要处理的 Task。
- 对 Task 执行「开始」操作。
- 执行中的 Task 保留 Start Time。
- 完成后执行「结束」操作并记录 End Time。
- Time Locker 的核心是记录 Task 的实际执行时间。

## 5. 与 Phase 1 的关系

Phase 2 依赖 Phase 1 的 Task 数据。

概念上：

```text
Phase 1
Task
├── Task ID
├── Customer
├── Task Title
├── Status
└── ...

          ↓ 取得 / 认领

Phase 2
Time Locker
├── Task ID
├── Start Time
├── End Time
└── 实际执行时间
```

Phase 2 不应在当前阶段重新定义 Phase 1 已经确定的 Task 基础资料。

## 6. 当前暂不确定内容

以下内容目前只作为 Phase 2 后续讨论方向，不视为已确认需求：

- 一个用户同时能否 Locker 多个 Task。
- Task 是否需要明确的「Claim / Assigned」状态。
- Start 后是否允许暂停 / Resume。
- 一个 Task 是否可以产生多段 Time Locker 记录。
- End 后是否允许重新 Start。
- Time Locker 是否影响 Phase 1 Task Status。
- 多用户同时操作同一个 Task 时的规则。
- Time Locker 的时间统计 / 报表方式。
- 是否需要手动修正 Start / End。
- 是否需要审核或锁定时间记录。
- 是否需要导出 Time Locker 数据。

## 7. Phase 2 范围原则

目前只保留以下高层方向：

> **Phase 2 = 基于 Phase 1 Task Tracker 的 Task Claim + Start / End Time Tracking。**

正式 PRD、模块拆分、数据模型、状态流转及验收标准将在 Phase 2 正式启动时另行定义。

## 8. 状态

**Phase 2 摘要：已记录**

**正式 PRD：尚未开始**

**当前不影响 Phase 1 PRD。**
