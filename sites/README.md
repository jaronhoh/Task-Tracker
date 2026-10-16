# Existing Sites React/D1 source snapshot

This directory contains the existing Task Tracker React/Vinext/D1 source, separate from historical root Express code.

Baseline deployed Sites source: `28874794e28ddc0e2bfa6c698a7b33fbd37cca8b` (Version 6).
Candidate local source commit: `ef390b5ef15637233d56a801a6246fafd8e275b0`, NOT pushed to Sites and NOT deployed. Browser acceptance is blocked; see `react-d1/docs/UI_CORRECTION_CANDIDATE_2026-10-16.md`.

161 tracked UTF-8 source/config/test files are mirrored. Generated `tsconfig.tsbuildinfo` and `package-lock.json` are excluded; this is a source snapshot, not a byte-identical repository backup or a deployable release archive. Production data, credentials, node_modules and runtime state are excluded. Nested historical assessment documents describe earlier migrations; the candidate report governs current acceptance status.

The `.openai/hosting.json` preserves the existing project ID and D1 binding; never register a replacement Site or run production database migrations/seeding from this snapshot. Root GitHub source is not the Sites deployment source. Do not deploy until real-browser acceptance and production preservation checks pass.
