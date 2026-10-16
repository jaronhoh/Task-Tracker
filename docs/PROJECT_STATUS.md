# Task Tracker — Project Status & Handoff

> **Single source of truth for project progress and cross-conversation handoff.**
> Update this file whenever development, testing, merging, deployment, or production verification changes. Read it at the beginning of a new ChatGPT/Codex conversation.
>
> Last updated: **2026-10-16** (Malaysia, UTC+08:00)
> Project: `jaronhoh/Task-Tracker` · Default branch: `main`

## Current status

**Badge enhancement (PR #4):** GitHub Actions run #38847758925 **passed**; PR #4 squash-merged into `main` at `c29db45dae9e9d0c0685b8171fcbb51dae7c9630`. **Sites deployment not verified / not performed in this interaction.** Existing production Version 4 remains the last user-reported release.


| Area | Status | Evidence / detail |
| --- | --- | --- |
| Closed This Week PRD | Completed | `docs/PRD_CLOSED_THIS_WEEK_VISIBILITY_2026-10-16.md` |
| Implementation | Completed | `app/public/app.js` |
| Regression tests | Passed | GitHub Actions Run #91, commit `4608faf` |
| PR #3 | Merged | Squash merge commit `6b14576bbc0a7a886cf222f8e28bbdef2e1e00d0` |
| Production Sites deployment | **Succeeded — Version 4** | User-provided deployment report; source commit `6b14576` |
| Post-deployment verification | **Passed (reported)** | User reports 62 tests passed and data integrity verified |

**Production URL:** https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/

**Important evidence distinction:** GitHub PR/CI details were verified through GitHub. The Sites deployment status, Version 4, 62 passing tests, and production data counts were **reported by the user** on 2026-10-16; they were not independently checked through a Sites management tool in this conversation.

## Latest release: Version 4 — Closed This Week visibility

**Business requirement:** A task closed during the current Malaysia week must appear in Weekly Task and Current Week Status, even when created in a prior week.

**Week boundary:** Monday 00:00 inclusive → next Monday 00:00 exclusive, Malaysia UTC+08:00.

| Scenario | Weekly Task | Current Week Status |
| --- | --- | --- |
| Created before this week; End/Closed this week | Carry Over | Closed |
| Created this week; End/Closed this week | New This Week | Closed |
| Created before this week; End/Closed before this week | Excluded | Excluded |
| Deleted task | Excluded | Excluded |

Use `End` as the closure timestamp. Preserve all unrelated behaviors and existing data.

### GitHub implementation / test trail

- PRD: `docs/PRD_CLOSED_THIS_WEEK_VISIBILITY_2026-10-16.md`
- Implementation: `app/public/app.js`
- Regression tests: `app/test/weekly.test.js`
- Feature branch: `fix/closed-this-week-visible-20261016`
- Pull request: https://github.com/jaronhoh/Task-Tracker/pull/3
- Successful GitHub Actions run: https://github.com/jaronhoh/Task-Tracker/actions/runs/38842064835
- Tested feature commit: `4608faf2fdf141c2566bc77604d27c605ecf7f09`
- Squash merge to `main`: `6b14576bbc0a7a886cf222f8e28bbdef2e1e00d0`
- GitHub Actions run #91: JavaScript syntax, API tests, and Chromium browser acceptance tests **all succeeded**.
- Earlier CI attempts failed due to overly escaped regular expressions in newly added test assertions; those assertions were corrected before the successful run.

### Sites release report (provided by user)

- Deployment result: `succeeded`
- Online version: **Version 4**
- Source commit: `6b14576`
- Weekly Task / Current Week Status fix: **live**
- Release verification: **62 tests passed**
- Production data preserved: **32 tasks**, customer records, and task-number sequence
- Existing production URL, configuration, and access permissions preserved

## Handoff instructions — REQUIRED

At the **start** of every new ChatGPT / Codex conversation working on Task Tracker:

1. Read this file from GitHub `main` **first**.
2. Check the latest GitHub commit, open PRs, and relevant GitHub Actions results; do not assume this document is newer than GitHub.
3. If the work involves production, check the Sites deployment/version using available Sites tools or ask for an explicit deployment report. **Do not equate GitHub merge with Sites deployment.**
4. Confirm current status and the next action before editing code.
5. Preserve production data, customer records, task-number sequence, Site URL, settings, and access permissions.
6. Update this file **in the same workflow** whenever a PR is opened/merged, tests change state, a release is deployed, or a blocking issue appears.
7. Record the source of each status: `GitHub verified`, `Sites verified`, or `User reported`. Never label a reported status as independently verified.
8. Add a dated entry to the change log below; keep historical entries rather than overwriting them.
9. For feature work, maintain the PRD separately under `docs/`; this file tracks **delivery state**, not the full product specification.

## In-progress change — Colored Group Count Badges (2026-10-16)

- Status: **Implementation and GitHub Actions tests passed; PR review/merge and Sites deployment pending.**
- Branch: `feat/status-count-color-badges-20261016`
- PRD: `docs/PRD_STATUS_COUNT_BADGES_2026-10-16.md`
- Scope: pill-shaped, status-colored numeric count badges in Weekly Task and Current Week Status group headings; no business logic or database changes.
- CI: **passed** — GitHub Actions run `38847047408`, source commit `a51be08f820428d807961b30e6bdc30d9197c46d` (API tests and browser acceptance tests).\n- Next: review/merge PR #4, deploy existing Site, verify production data, update this log.
- Last confirmed production release remains **Version 4** (user reported).

## Next actions

- No outstanding implementation or deployment action for Version 4 **based on the user-provided release report**.
- For the next feature or bug fix: write/update PRD → create feature branch → implement → test (API + UI) → review PR → merge → deploy existing Site → verify data preservation → update this file.
- If future checks reveal production discrepancies, open a new issue/PR and log it here.

## Change log

| Date (MYT) | Event | Status | Source |
| --- | --- | --- | --- |
| 2026-10-16 | Closed This Week PRD, implementation, and regression tests added | Completed | GitHub verified |
| 2026-10-16 | CI Run #91 passed including API and browser tests | Passed | GitHub verified |
| 2026-10-16 | PR #3 squash-merged into `main` as `6b14576` | Merged | GitHub verified |
| 2026-10-16 | Sites Version 4 deployment, 62 tests, 32 tasks and related data preserved | Succeeded (reported) | User reported |
| 2026-10-16 | Colored group count badges PRD and implementation added to feature branch; not yet deployed | In progress | GitHub verified |
| 2026-10-16 | Created persistent project status / handoff record | Completed | GitHub commit of this file |

## Update template for future entries

```md
### YYYY-MM-DD — <short title>
- Change / PRD:
- Branch / PR:
- Test results (link):
- Merge commit:
- Sites version / deployment result:
- Production verification / data preservation:
- Status source (GitHub verified / Sites verified / User reported):
- Open issues / next action:
```
