# Task Tracker — Release, D1 Recovery and Operations Checklist

## Current release decision — 2026-11-05: existing Sites functionality confirmed; no extra deployment requested

The user has confirmed that the **existing Task Tracker Site already contains the features they need**. The previously attempted release of merged PR #20 through the original Site source-sync process is **no longer requested**. This is a **functional user confirmation**, not proof of a new native Sites deployment or of GitHub/Sites source-SHA equality.

**No deployment is scheduled for this change.** Do not run the release, version-save, migration, backup, source sync or production data-altering steps in this runbook merely because PR #20 is merged. This runbook remains the checklist **if and when a future deployment is actually requested**.

Last Work read-only native observation (relayed by the user) was Sites v15, Owner-only, D1 binding `DB` and production D1 `tasks=36`, `customers=6`, `log_time=49`, `app_sequence=1 / value 37`, `app_revision=1 / value 286`. There was **no new version published** during the attempted release; this baseline is not a recoverable backup. Native Sites ↔ GitHub source-commit equivalence remains unverified. The user's current functional confirmation must not be converted into a claim that Sites is running the merged PR source.

Keep real backup/restore and non-Owner authenticated access acceptance as separately tracked unverified operational items; they **do not justify repeatedly requesting a deployment that the user says is unnecessary**. See [current project status](../PROJECT_STATUS.md).

---

> **Scope:** Existing owner-only ChatGPT Sites project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, URL `https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/`. Updated 2026-11-05. **This document is a runbook, not evidence that backup, restore, access or monitoring actions have been performed.**

## 1. Baseline and permissions (H0)

- Before changing any release, read current GitHub `main` and `docs/PROJECT_STATUS.md`, inspect **actual** native Sites project/version, authenticated frontend, D1 `DB` binding, environment revision, access-policy revision and owner-only allowlist.
- GitHub repository visibility currently reports **Public**; Sites Owner-only is independent. Owner must decide whether public code/history is intentional. Review credentials/test fixtures before any publication; never post real customer/task/log rows or tokens in GitHub or CI artifacts. Changing GitHub visibility/history needs explicit owner authorization.
- Verify API resources are protected using **read-only, non-owner/anonymous negative checks**, including `/api/tasks`, `/api/customers`, `/api/log-time` and health route policy. Record HTTP status and check that no sensitive JSON rows are disclosed; do not expose an actual owner's session or data. Authorization must be verified at the actual deployed Site, not inferred from code-only unit tests.

### CR-024 — internal API access gate (approved requirement; not yet verified)

- The user approved **Option A**: no public/third-party API product; the authorized React frontend still needs its existing internal `/api/tasks`, `/api/customers`, `/api/log-time` and `/api/health` routes. Do **not** delete them wholesale, expose a new shared public key or embed credentials in frontend code.
- For each API path family (including record-specific GET/PATCH/DELETE, task Time and Customer color), verify the **actual** Sites Owner-only identity boundary covers the route before it reaches D1. If not, use a supported **server-side fail-closed** identity mechanism and re-test; a CORS setting or Origin header alone is not sufficient authentication.
- For anonymous/non-Owner requests, record actual HTTP status and verify sensitive data is not returned. Prove write rejection in isolated D1 or other non-destructive authorized test settings; **do not send uncertain writes to production**. Test Owner browser CRUD and save flows as a positive control.
- Review any real legacy third-party API keys, webhooks, integrations and current public docs for deprecation if found; never invent integration removals. This is an approved change request **CR-024**, tracked in [Issue #24](https://github.com/jaronhoh/Task-Tracker/issues/24); native authorization evidence remains pending in [#21](https://github.com/jaronhoh/Task-Tracker/issues/21).
- **Draft implementation verified in isolated CI:** `lib/request-policy.mjs` is invoked from `lib/handler.mjs` before D1 work and rejects explicit cross-site/same-site Fetch Metadata, invalid/mismatched `Origin`, and non-JSON POST/PATCH. Response headers are `Cache-Control: no-store`, `Cross-Origin-Resource-Policy: same-origin` and `X-Content-Type-Options: nosniff`. The test HTTP harness preserves its actual Host for correct same-origin validation. [CI 41989429042](https://github.com/jaronhoh/Task-Tracker/actions/runs/41989429042) finished green (105 tests); **these controls do not prove authentication**. Requests lacking browser metadata remain possible and must be protected by verified native Sites Owner-only access.
- **Release-blocking native test:** With authorized owner access, inspect current site audience/owner policy and verify every `/api/**` route at the deployed Site. Record real anonymous/non-Owner HTTP status (without copying sensitive JSON to public GitHub). If native Sites does not protect internal API routes, stop the release and obtain a platform-supported server-side identity mechanism; do not create a homemade JS token.
- CR-024 must be **implemented and verified** before the next Sites production release; documentation or CI success alone does not close it.

### CR-024 first actual anonymous production negative check (2026-11-05)

- [Actual GitHub Actions read-only negative test #41990957290](https://github.com/jaronhoh/Task-Tracker/actions/runs/41990957290) made **20 unauthenticated GET requests** to the real existing Site: 10 routes × (ordinary no-cookie headers and spoofable same-origin-shaped headers without credentials). **Every response was HTTP 401**. It did not inspect or log response bodies or execute write methods.
- **What this proves:** the tested external anonymous requests cannot obtain Site HTML or business API JSON by supplying those metadata headers alone. **What it does not prove:** logged-in non-Owner rejection, POST/PATCH/DELETE behavior, actual Site version, owner allowlist, DB binding, backup/restore or deployment. Keep #21, #22, #23 and #24 open until their remaining conditions are independently verified.
- The security probe is safe to repeat via `sites/react-d1/scripts/check-anonymous-sites.mjs`; the GitHub workflow has a weekly Monday 09:15 MYT schedule configured in draft, active only after the change reaches `main`. Do not treat a periodic anonymous check as a real Site Owner login health check.

## 2. CI and controlled release

- Keep change requests and high-risk decisions traceable in PRD and approved. Review PR, changed files, schema diffs, D1 binding and potential secrets; run TypeScript, React/model, API/D1, browser Chromium desktop/mobile × Light/Dark, accessible keyboard/touch checks and necessary fault injection; **failing or unexecuted necessary tests block release**.
- Capture deployed source SHA, real tested head SHA and PR merge SHA. GitHub merge alone is **not** native Sites publish.
- Before publishing, capture complete production **read-only** D1 rows and columns for `tasks`, `customers`, `log_time`, `app_sequence`, `app_revision`, including IDs, timestamps, next_value, revision and token. Compare normalized full-row snapshots or secure hashes, not just counts. Determine current schema and permissions.
- Publish **only into the existing Site**. No new project, seed/reset, physical database replacement or migration without separate approval and tested isolated plan. Preserve URL, owner-only allowlist, secrets, environment revision, DB binding and task ID numbering.
- Verify native deployment succeeded with saved version ID, deployment ID, source, timestamp; validate authenticated UI and read-only health; obtain the same post-publish full D1 snapshot. Compare all fields and rows, plus configuration and permissions; stop/escalate if different unexpectedly. Update `docs/PROJECT_STATUS.md` with actual evidence, never anticipated outcomes.
- On app regression, consider native rollback to last good **saved Site version** after owner approval. A frontend rollback does not restore missing or corrupted D1 data.

## 3. Durable backup and restore drill (DATA-01 / H2)

**Not yet verified for production as of this runbook:** a full deploy-time read-only database snapshot is an integrity check, but not automatically a durable and recoverable backup.

- Ask native Sites/D1 platform which authorized **production D1 export/backup** mechanism is actually supported. Do not assume ordinary SQL dumps or a local database copy work. Confirm backup scope, encryption at rest/in transit, restricted off-repository storage, retention, restore permissions, task data privacy and whether scheduled exports are possible.
- Take an authorized encrypted backup using actual supported platform functionality. Store outside public GitHub, outside CI artifacts and away from app source. Record timestamp/timezone, dataset identifier (not credentials), schema/migration version, table row counts and protected checksum; confirm read-back.
- **Restore only to a detached isolated database**, never overwrite live D1 to test. Compare every restored row/field, UUID, task sequence next_value, revision/token, customer references and Malaysia dates; test core CRUD using isolated dummy data. Record exact elapsed recovery time and any excluded data.
- Set owner-approved RPO/RTO and retention cadence. Until owner has reviewed an actual successful recovery drill, label **backup/recovery NOT VERIFIED**, regardless of a successful Site-version rollback.

## 4. Mistaken Log Time entries (RECOVERY-01)

- The Log Time table intentionally has **no Edit/Delete Actions column**; editing is via double click/keyboard Enter (real mobile touch access needs separate acceptance). The server retains a DELETE endpoint for backward compatibility, but its existence is not authorization to physically delete historical records.
- Prefer correcting a record in the Edit dialog and explicit Save Time for Date/Start/End. Preserve audit context and linked task associations. If overlap constraints prevent safe correction or a truly mistaken entry needs removal, stop and document the exact owner-approved data remedy with a verified backup first; do not reintroduce Delete buttons or issue ad hoc production SQL/API DELETE.

## 5. Monitoring, rollback and performance (H3/H4)

- After releases: authenticated health check, last Site version, active owner-only policy, read-only Task/Customer/Log Time consistency and browser smoke. Avoid anonymous endpoints that disclose internal data.
- Proposed operational cadence **not yet scheduled**: daily read-only health & owner access, weekly backup completion review, monthly isolated restore sample and regression; alert owner on repeated 5xx, backup failure, unauthorized access, data mismatch or unexpected new Site version. Define owner and escalation before enabling automation.
- Test smartphone **real-touch** discovery and edit reliability independently of responsive screenshots and emulated touch. Test Malaysia weekday/weekly rollover at 23:59→00:00 while page stays open and after background tab resume.
- Performance acceptance should use **synthetic** 100, 1,000 and 10,000 Log Time rows in isolated D1, including GET tasks/time-spent, all log views/search, write conflict, pagination/render and D1 quotas. Measure p50/p95, memory and server errors; no SLO is approved yet, so report numbers rather than claiming thresholds passed.
- Reassess legacy React migration PR #2 against current `main` before closing; never merge obsolete migration code blindly. Keep historic PRD in place but clearly mark superseding approved rules.

## 6. Completion record template

| Evidence | Result | Source and timestamp |
|---|---|---|
| GitHub PR merged + passing CI | NOT VERIFIED for current batch | |
| Native Sites active version + owner-only | NOT VERIFIED for current batch | |
| D1 full-row before/after release comparison | NOT VERIFIED for current batch | |
| Actual encrypted backup + isolated restore equality | NOT VERIFIED | |
| Anonymous GET denial (root + 9 API routes, 2 metadata profiles) | VERIFIED 20 × HTTP 401; non-Owner logged-in and writes still NOT VERIFIED | [Actions #41990957290](https://github.com/jaronhoh/Task-Tracker/actions/runs/41990957290), 2026-11-05 15:58 MYT |
| Desktop/mobile real touch and midnight checks | NOT VERIFIED | |
| Synthetic load and recovery time | NOT VERIFIED | |

Do not mark a box passed from this document alone.
