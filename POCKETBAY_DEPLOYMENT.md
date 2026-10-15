# PocketBay Deployment Checklist

This repository is prepared for a **Node.js** deployment from the repository root.

## Runtime settings

| Setting | Value |
|---|---|
| App root | Repository root |
| Runtime | Node.js 22 (supported range: Node.js 20–22) |
| Install command | `npm install` |
| Start command | `npm start` |
| Bind address | `0.0.0.0` |
| Port | `PORT` environment variable (default `3000`) |
| Health check | `/api/health` |
| Database path setting | `TASK_TRACKER_DB` |

Official guide: https://pocketbay.com/deploy

## Required before using real data

1. Deploy with the repository root as the project root. Do not deploy the `app/` subdirectory as the root because the deployment `package.json` is at repository root.
2. Confirm the runtime starts and `/api/health` returns HTTP 200.
3. Configure PocketBay persistent storage and set `TASK_TRACKER_DB` to the actual persistent mount path shown by PocketBay. The default `app/data/task-tracker.sqlite` path must **not** be assumed persistent until verified.
4. Create a test Customer and Task, restart or redeploy the app, then confirm the same records still exist. Do not enter real customer/task information before this persistence test passes.
5. Keep the PocketBay app private or password-protected unless public access is explicitly approved. The application itself does not currently implement user authentication or role-based authorization.
6. Run the smoke-test checklist below and save the deployed URL, deployment version, health response, and test result.

## Post-deployment smoke test

- [ ] `/api/health` returns HTTP 200 and reports Malaysia Time (UTC+08:00).
- [ ] Create Task and inline Customer creation work.
- [ ] Edit Task auto-save persists after refresh.
- [ ] Weekly Task and all four Current Week Status groups render.
- [ ] Global Search filters the displayed rows and Clear restores them.
- [ ] Show All Data sorting, pagination, Edit Time, and Deleted restore work.
- [ ] Excel export downloads a correctly named `.xlsx` file.
- [ ] A test Task survives restart/redeploy when using PocketBay persistent storage.
- [ ] App access is private/password-protected.

## Recovery

If a deployment fails, review PocketBay's structured build error, repair hint, and log tail before retrying. Use PocketBay version history/rollback if a later release breaks a previously working deployment. Do not report the project as deployed until the public/private app URL and health check have been verified.
