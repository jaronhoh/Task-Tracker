# PRD — Colored Count Badges in Task Group Headers (2026-10-16)

## Purpose
Replace plain parenthesized counts in task group headings with accessible, rounded, custom-color count badges inspired by shadcn/ui Badge custom colors, without adding React or shadcn/ui dependencies.

## Scope
- Weekly Task: show count badges beside **Carry Over** and **New This Week**.
- Current Week Status: show count badges beside **Work in Progress**, **Pending with Customer**, **KIV**, and **Closed**.
- Keep label text unchanged and position the badge immediately after the label.
- Custom status colors: Work in Progress = blue, Pending with Customer = orange, KIV = purple, Closed = green.
- Weekly Task categories use distinct, neutral/blue-violet visual treatments.
- Badges show live counts including zero; accessible text is still the count (not color alone).
- Use vanilla JavaScript + CSS in the existing app; no new UI framework.

## Non-goals
- Do not change task eligibility, status, date/week calculations, filtering, ordering, export, database, or API.
- Do not modify individual task status pills or summary-card count design.
- Do not modify the production Site directly until reviewed and deployed.

## Acceptance criteria
1. Both Weekly Task and Current Week Status group headings show pill-shaped count badges instead of `(17)` or plain numeric text.
2. The count reflects existing filtered/grouped tasks and updates on re-render.
3. Colors map consistently by status and remain readable.
4. Empty groups display `0`.
5. Existing API and UI tests continue passing; add focused regression assertions.
6. Preserve existing production data, Site URL, settings, and access permissions during release.
