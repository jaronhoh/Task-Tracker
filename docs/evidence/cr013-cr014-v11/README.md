# CR-013 / CR-014 — Version 11 browser evidence

- Production: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/
- Sites Source Commit: `26653c37071a4641473495f4fa8928bae2ee67fe`.
- Code PR: [#10](https://github.com/jaronhoh/Task-Tracker/pull/10), GitHub merge `aaef4770335b6c5424fd367a52856dbbc994c77a`.
- [Passing Chromium CI](https://github.com/jaronhoh/Task-Tracker/actions/runs/39013525276): 14 React, 56 API/D1/weekly, 8 browser scenarios; 78 passed, zero failed.
- Full artifact [12093917062](https://github.com/jaronhoh/Task-Tracker/actions/runs/39013525276/artifacts/12093917062), SHA256 `c60dd712ca39847a4704e231be07aa2a1b047c73f394e2616b385d7ee6e4f92c`. Contains all 16 new requirement screenshots and other regression evidence.

## Exact viewport / theme acceptance

| Viewport | Light | Dark |
| --- | --- | --- |
| 1440px | [Screenshot](light-1440-status-collapsed.png) | [Screenshot](dark-1440-status-collapsed.png) |
| 390px | [Screenshot](light-390-status-collapsed.png) | [Screenshot](dark-390-status-collapsed.png) |

These Chromium screenshots use isolated task fixtures, including many customers and unresolved customer references to exercise overflow. They are not screenshots of production data. They show summaries while collapsed, one-row geometry, and visible controls; tests also verify all counts, color dots, search/filter/tab changes, data refresh, keyboard scrolling and Enter/Space toggles. [Browser log](browser.log).

## Live production verification

[Version 10 baseline](production-v10-before.jpg), [Version 11 Light](production-v11-light.jpg), [Version 11 Dark](production-v11-dark.jpg), [interaction results](production-browser.json).
Production screenshots use the cloud browser's desktop viewport; exact mobile/desktop dimensions are covered by the CI matrix above.

Live status totals: Work in Progress 17 (JXM 10, VSTECS 5, MySelf 2); Pending with Customer 1 (MMM 1); KIV 3 (VSTECS 3); Closed 4 (JXM 3, MySelf 1).
The live interactions only changed UI state. Full-row D1 before/after comparison preserved tasks 32, customers 6, sequence next_value 33 and revision 149 including token; access policy unchanged.

First CI 39013384982 failed during an animated-color assertion and is not acceptance. The retry retains that assertion and waits for the transition to finish. Review is transparently recorded as implementing-agent self-review, not independent approval.
