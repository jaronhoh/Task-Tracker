# PRD Addendum — Closed This Week Visibility (2026-10-16)

## Purpose
Ensure tasks closed during the current Malaysia week remain visible in both Weekly Task and Current Week Status. This is a targeted business-rule fix; do not change unrelated UI or data persistence.

## Week and timestamps
Use Malaysia Time (UTC+08:00), Monday 00:00 inclusive to the next Monday 00:00 exclusive. The existing **End** timestamp represents the completion/closure timestamp when Status is Closed. Do not substitute Created for End when determining when an older task was closed.

## Weekly Task
- **Carry Over:** tasks created before this week that remain active, **or** were Closed during this week (End falls in this week).
- **New This Week:** tasks created during this week and not Deleted, including tasks Closed this week.
- A task belongs to exactly one group, determined by its Created date.
- Tasks created before this week and Closed before this week are excluded.
- A task Closed this week must remain visible, including its Closed status and End value.

## Current Week Status
- Keep the four existing status categories and their ordering: Work in Progress, Pending with Customer, KIV, Closed.
- Use the same current-week task scope as Weekly Task, so Closed tasks are included in the **Closed** group, including older tasks whose End falls in this week.
- Do not change the grouping algorithm beyond correcting the shared task eligibility rule.

## Existing behavior to preserve
Keep Task ID, Customer Name, Task Title, Task Description, Note, Created, End, Status; search, edit, sorting, export to Excel, summary counts and other views. Deleted records remain excluded from these two tabs. Show All Data remains unchanged.

## Acceptance scenarios
1. TSK-0001: Created last week; End this week; Status Closed → Weekly Task **Carry Over (1)**; Current Week Status **Closed**.
2. TSK-0002: Created this week; End this week; Status Closed → Weekly Task **New This Week (1)**; Current Week Status **Closed**.
3. Both tasks above → Current Week Status **Closed (2)**; weekly total **2**.
4. Older task Closed before this week → excluded from both weekly views.
5. Older active task → Carry Over; new active task → New This Week.
6. A task created this week but Closed this week stays in New This Week.
7. Boundary tests: End at Monday 00:00 belongs to new week; End at next Monday 00:00 does not belong to previous week.
8. Search and summary counts reflect the same filtered rows.
