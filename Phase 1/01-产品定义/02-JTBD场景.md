# 02 JTBD 场景

## JTBD 摘要
当用户需要记录、跟进或汇报工作任务时，希望在一个简单 Task List 中快速建立、搜索、更新和查看任务状态，从而掌握本周工作、Carry Over 及历史记录。

## Job Stories
| ID | 情境 | 要完成的任务 | 期望结果 |
|---|---|---|---|
| J01 | 新工作出现 | 建立 Task | 获得唯一 Task ID 并进入 KIV |
| J02 | 任务进度改变 | 编辑 Task | 最新状态自动保存 |
| J03 | 每周汇报 | 查看 Weekly Task | 掌握 Carry Over / New This Week |
| J04 | 查看本周状态 | 查看 Current Week Status | 掌握四种 Status |
| J05 | 查历史 | Show All Data + Search | 快速找到 Task |
| J06 | 系统集成 | REST API CRUD | 外部系统可管理 Task |
| J07 | 汇报分享 | Export to Excel | 导出当前 View |
| J08 | 新客户出现 | Add Customer | Customer 可立即用于 Task |

## 核心场景
- Task Create / Edit / Logical Delete / Restore
- Weekly Task
- Current Week Status
- Show All Data
- Customer Add/Edit
- REST API
- Excel Export
