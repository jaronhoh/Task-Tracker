# PRD — Accordion Groups, Line Tabs, Clickable Status Cards

Date: 2026-10-16

## Objective
Improve Task Tracker navigation without modifying persisted tasks, status definitions, weekly Malaysia time boundaries, APIs, or permissions.

## Requirements
1. Group-by headings in Weekly Task and Current Week Status become accessible accordions. Each group can independently expand/collapse; expanded by default. Counts remain visible and accurately reflect the current search and status filter. Keyboard Enter/Space works via native button.
2. View navigation (Weekly Task, Current Week Status, Show All Data) uses a single-line underline TabsList style with active line, accessible tab semantics, and horizontal overflow on narrow screens.
3. Current Week Status summary cards are clickable single-select filters: All / Work in Progress / Pending with Customer / KIV / Closed. All is default. Clicking the active card again returns to All. Counts represent all in-scope searched tasks (not filtered subset). Group rows only show the selected status when filtered.
4. Status filter resets on changing view. Search applies before status filter. Export follows displayed tasks. No database changes.
5. Preserve task selection/editing, closed-this-week visibility, and existing business logic.

## Acceptance
- Five interactive status cards show accurate counts, All includes all four statuses.
- Accordion collapse hides only that group's task rows, not its count or other groups; expansion restores rows.
- TabsList line indicator follows active view; narrow screens can scroll horizontally.
- Existing tests pass; new interaction regression tests added.
- Sites React/D1 deployment is separate from GitHub legacy Express code and must be verified independently.
