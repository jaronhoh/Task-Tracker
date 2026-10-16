# Sites deployment and GitHub synchronization

Prepared on 2026-10-16 (Malaysia Time). This branch contains the complete source from the supplied migration archive. Product specifications and the original migration plan remain in the repository. The legacy Express app and its workflows are removed on this branch. Main remains the legacy deployment.

## Validation in this synchronization session

- Inspected the supplied migration assessment and validation report; their prior passing results are historical evidence, not rerun results.
- Node 24.19.0 syntax checks passed for all 28 JavaScript, ESM and CommonJS files.
- Source was scanned for common credential patterns; none were found. Environment files, dependencies, generated build output, databases and local tool state are excluded. The build directory contains required maintained source, not generated output.
- API/D1 execution was attempted but could not start because supertest and miniflare are not installed. npm is unavailable in this desktop runtime. Build, type checks and browser tests were not rerun here. The included GitHub workflow installs locked dependencies and runs those checks.
- This operation synchronizes GitHub source only. No Site deployment or historical-data import is performed.

## Reproduce validation

Use Node 24 and npm in a clean checkout of migration/chatgpt-sites-d1:

```sh
npm ci
npm run build
npx tsc --noEmit
npm test
npx playwright install --with-deps chromium
npm run test:ui
```

The tracked .npmrc enables legacy peer dependency resolution. Review the Sites migration validation workflow before proceeding to deployment.

## Deploy through Sites

1. Use this branch's repository root as the source. Preserve project ID `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979` in `.openai/hosting.json`; confirm ownership and owner-private audience with Sites before deployment. A project ID is not a credential or a live deployment.
2. In a Sites-enabled Codex session, open that existing Site with the Sites source workflow using a fresh source repository write credential supplied through stdin only. Copy this complete GitHub source into the workflow checkout, preserving its Git metadata and local execution profile. Never commit the credential.
3. Install dependencies using the Sites installer. Package through the Sites source workflow with the Sites build helper and remaining validation commands. Retain its verified project ID, commit SHA and archive. The original uploaded ZIP is a development archive, not a verified deployment archive.
4. Save and deploy that verified archive with the owner-private Sites operation. Wait for terminal success and use the returned live URL. GitHub push alone does not publish a Site. If the prior workflow approval restriction recurs, report it and use an environment where the supported workflow is permitted.
5. Confirm D1 binding `DB` and deployment-applied versioned migrations. Verify health, create/edit/delete/restore, customers, Excel export, anonymous rejection, persistence after reload and persistence after redeployment.
6. Import historical data only through a separately validated process described in README, including sequence high-water mark and backup. No existing records are supplied here.

Strict global network-arrival FIFO across Worker isolates remains unverified and is not guaranteed by the current design. See the assessment and validation report for this and the remaining load, clock-boundary and physical-download limitations.
