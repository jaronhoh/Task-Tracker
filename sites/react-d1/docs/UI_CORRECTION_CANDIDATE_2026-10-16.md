# Sites UI correction candidate — 2026-10-16

Status: NOT ACCEPTED / NOT DEPLOYED. Production remains Version 6.

## Baseline and findings

Existing project: appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979.
Production/source baseline: Version 6 / 28874794e28ddc0e2bfa6c698a7b33fbd37cca8b.
URL: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site
Sites get_site/list_sites independently confirmed Version 6 and owner-only custom access, policy revision 1.

Code-confirmed defects:
- Weekly cards rendered plain spans; no buttons or onClick handlers existed.
- Status card handler always selected the clicked label; re-click never reset to All.
- GroupRows used useState(true) for every group; existing regression explicitly asserted every group open, including empty groups.
- frontend/src/styles.css sets unlayered `* { border-color: #e5e5e5; }`, overriding Tailwind layered `border-transparent` on tab triggers. Triggers retain the `border` utility, creating visible gray edges. The active underline also depended on inherited pseudo-element geometry under a height-constrained scroll container. This is a source/cascade diagnosis, not browser-confirmed rendering evidence.

## Candidate

- Explicit tab geometry, transparent backgrounds, zero top/left/right borders, blue bottom border; accessible focus and single-line horizontal scroll retained.
- Weekly/status summary cards use native full-card buttons and aria-pressed; repeated selection resets to total.
- Counts use searched data before filtering; only selected groups render.
- Nonempty groups open, empty groups close. Search/view keys recompute defaults. Individual toggles retain independent state. Empty/nonempty transitions reset that group.
- Export retains prior scope semantics: all filtered records, independent of accordion collapse; card filtering limits exported groups. All-data sorting/pagination export remains unchanged.
- Added model/render regression and an expanded Playwright release acceptance scenario; revised outdated browser expectations for Closed This Week and empty accordions.
- No API, database, migration, hosting, environment, access or dependency changes.

## Executed checks

- React render/model tests: 13 passed.
- API/D1/weekly regressions: 53 passed, isolated local D1; no production CRUD.
- frontend TypeScript noEmit: passed.
- Sites build helper / production React + Vinext build: passed.
- Browser test JavaScript syntax and git diff whitespace: passed.

## Blocking acceptance

No real-browser execution, screenshot, pointer or keyboard acceptance was performed. No production rendered UI was inspected. `SITES_MANAGED_LINUX_CONTAINER=1`; the Sites skill requires control-browser for QA. Capability discovery found no control-browser skill/tool; executor skill listing also warned that the browser capability root does not exist. Per the Sites skill, no preview server or alternate browser automation was started.

User requires passing real-browser acceptance before deployment. No save-version, deploy, source push, database mutation, data migration, sequence allocation, environment update or access update was performed. No new deployed version or deployment ID exists for this candidate. Before/after production full-row comparison remains required when deployment resumes; historical 32 tasks / 6 customers / sequence=33 are not re-verified by this candidate workflow.

Next: use an environment with supported control-browser; inspect current production UI, run candidate desktop/mobile pointer/keyboard/visual tests and inspect screenshots; fix failures; perform read-only full-row production snapshot, deploy existing project only after acceptance, compare data and access again, and record actual Sites source SHA/version/deployment ID. GitHub source snapshot is not a Sites deployment commit.
