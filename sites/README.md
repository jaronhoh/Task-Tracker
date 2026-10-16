# Existing Sites React/D1 application

The active production application source is mirrored under `react-d1/`, separately from historical root Express code.

- Deployed Sites version: **7**, 2026-10-16 15:46:40 MYT.
- Actual pushed Sites Source Commit: `e54f6d43a7533e4be5b3280f0acb365d5cdeb94d`.
- Final browser CI GitHub commit: `097cfcc8d90ffb35fb67255bbab9ec13a61efbf9`, run 38869014957, **70 tests passed**.
- Browser acceptance: 1440px/390px Chromium screenshots and pointer/keyboard tests plus native production browser verification.
- Current source/config/tests and package lock are mirrored. Generated tsconfig.tsbuildinfo, credentials, runtime state, node_modules and production database rows are excluded. Post-deploy documentation/evidence updates are distinct from the immutable deployed Sites commit.
- Evidence ZIP, production screenshot and native browser log: `evidence/2026-10-16/`.
- Full release record: root `docs/PROJECT_STATUS.md`.

Preserve existing `.openai/hosting.json` project ID and D1 binding. Do not register a replacement Site, deploy historical root Express code, or seed/reset/migrate production data. The older candidate report is historical and superseded by the acceptance report.
