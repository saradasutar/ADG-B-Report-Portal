# ADG(B) Report Portal — Platform Readiness Audit & 9.8 Acceptance Gate
Date: 2026-11-07 | Scope: live GitHub frontend (main), saved integrated backend V17.7.92, supplied screenshots.
Status: **static/code review only; NOT a production certification, vulnerability scan, or live Google Drive inventory.**

## Baseline observations
- GitHub Pages frontend: `index.html` (approx. 416k characters), plus `portal-v1767.js` (~180k) and `sticky-v1767.js` (~69k). Many layers of responsive layout overrides.
- Working version visually confirmed by owner: V17.7.99 frontend. Saved backend is V17.7.92; deployed Apps Script version not independently confirmed.
- Current five offices are named/hardcoded in backend's `OFFICES` registry; extension requires more than changing the page title.
- Existing built-in features include current-cycle submission matrix, login/public modes, 20 feature controls, notice board, historical archive, review/audit, compliance tracking, raw data, reminders, and administrator health endpoint.
- Server checks exist for many actions. A complete endpoint-by-endpoint authorization audit and live negative tests are still required.
- Backend `getDatabase_` can create/recover a database if not already configured. Do not invoke setup/recovery during migration discovery.
- A document-link upload path uses `ANYONE_WITH_LINK` permissions: confirm this is approved for the document classification and office data policy before broader rollout.
- Backend restricts PDF uploads to 8 MB at this baseline, not an arbitrary 20 MB.
- Existing README/deployment instructions are first-install oriented and may be unsafe for updating a working deployment. Do not rerun initial setup.

## Target deliverables (ONE coordinated release, staged)
### 1. Reliability & security (release blockers)
1. Inventory all POST/GET actions; enforce session, role, office scope, feature gate and parameter validation on server; do not rely on frontend hidden controls.
2. Audit PDF view links and file-sharing defaults. Prefer private, authorized access where policy requires; avoid exposing personnel/report files via anonymous links.
3. Standardize handling of sensitive tokens/codes; prevent credentials in URLs, logs or public GitHub; review account recovery and expiration.
4. Add structured error event records, sanitization, correlation IDs and retention period; never log passwords, PDFs, security codes or session tokens.
5. Add duplicate-submit/idempotency test for uploads, remove/re-upload, partial failure, archive and concurrent administrators.
6. Add explicit `PORTAL_INSTANCE_ID` and environment (staging/production) validation to prevent pointing two portals to the same spreadsheet by accident.
7. Test all administrator, office, viewer and anonymous user paths, including forbidden actions, on the ACTUAL deployment.
8. Backup/restore drill with integrity counts, original file IDs, sheet IDs and sample view/upload checks.

### 2. User experience (not at expense of data integrity)
9. Consolidate duplicated CSS rules in stages; preserve all five offices on desktop and accessible mobile matrix.
10. Distinct public/home, office/report-entry, viewer/read-only and admin/control layouts with a shared design system.
11. Simplify header and cycle selector; use one consistent navigation set and a single full-width/focus switch.
12. Office status: use compact progress bars; pending/submitted counts must derive from live current-cycle data, with timestamp.
13. Sticky report name + accessible horizontal controls; keyboard navigation, touch hit targets, visible focus and print-safe styles.
14. Search and filter state should remain intact when user switches view; prevent accidental changes when refreshing data.
15. Indicate when figures are loading, stale or unavailable; never present default zero as confirmed data.
16. Ensure error/success states are readable in both login-free and login views; contrast, reduced-motion, zoom and screen-reader review.
17. Reduce unnecessary page reloads, request fan-out, duplicated bootstrap calls and unbounded DOM rendering.

### 3. Administrator operations
18. Admin Control Centre: visible save action, unsaved warning, server-conflict handling, confirm / reload verification and audit of changes.
19. Admin Health: *read-only* database access and known-sheet checks; label absent error-history metrics as unavailable.
20. Feature enable/disable must be a restriction, never a grant of permission; preserve hard role ceilings.
21. Email reminders and moving notices: per-office targeting, expiration, rate controls, opt-out/disable, admin tests.
22. One-click export of **non-sensitive** configuration summary and audit evidence; no secrets or private Drive IDs in public output.
23. Operator runbook: deployment, rollback, cache-busting, emergency revoke, owner succession and incident escalation.

### 4. Drive consolidation (separate guarded stage)
24. Read-only discovery of all current database IDs, folder IDs, PDF IDs and Drive parent chains; record owners, permissions and links.
25. Create a **new desired tree only**; do not automatically relocate old folders.
26. Preserve existing IDs, records and sharing; verify ownership/editor rights before any `moveTo` operation.
27. Move one disposable test file, confirm ID, link, viewer access and rollback; only then migrate verified objects in batches.
28. Report moved/not-moved/failed file IDs with timestamps and rollback target; no `setTrashed` or delete in migration.
29. Keep the Apps Script source private (Drive/Apps Script project), the frontend static on GitHub and any published reports governed by office security policy.

### 5. Multi-office productization (separate staging instances)
30. Replace global fixed office list with a validated per-instance office registry. Stable office IDs are never repurposed after data exists.
31. Use an instance manifest: `instanceId`, `name`, `officeRegistry`, `rootFolderId`, `spreadsheetId`, `frontendOrigin`, `scriptDeploymentId`, `featurePreset`.
32. Provision each new portal with a dedicated spreadsheet, Drive root, Script Properties, credentials and deployment.
33. Never copy live Script Properties, sessions, reports, IDs, account lists or PDF links from ADG(B) into another office.
34. Provide staged first-run setup for a new, EMPTY instance only, with duplicate-initialization checks and an installation receipt.
35. Provide office onboarding wizard for authorized admin: office name, office ID, reporting cycle, user role, reminder email, required subject list.
36. Provide reusable public/office/admin presets with backend policy enforcement.
37. Test two simultaneous independent instances to prove data isolation, office-specific notices, reports and login permissions.

## Readiness scorecard — target ≥9.8/10
Scoring: 10 categories × 1.0 point. Target at least 9.8 with NO critical failure.
- Visual polish & desktop density — 1.0
- Mobile/tablet responsiveness — 1.0
- Keyboard/contrast/accessibility — 1.0
- Correctness/current-cycle calculations — 1.0
- File lifecycle and Drive integrity — 1.0
- Permissions, authentication and data privacy — 1.0
- Stability/error recovery/idempotency — 1.0
- Speed & quota management — 1.0
- Admin configuration and supportability — 1.0
- Cross-office cloning, isolation and rollback — 1.0

**Release blockers** even if numeric total exceeds 9.8: unauthorized PDF access, cross-office data leakage, lost report, duplicate/lost submission on retry, unverified rollback, or an instance pointing at the wrong spreadsheet.

## Acceptance test matrix
| Test | Public | Viewer | Office A | Office B | Admin |
|---|---|---|---|---|---|
| Portal/public dashboard in public mode | permitted public fields | permitted | permitted | permitted | permitted |
| Upload | DENY | DENY | own office only | own office only | existing policy |
| View protected PDF | DENY unless explicitly public | role-bound | scope-bound | scope-bound | policy-bound |
| Edit subjects/feature flags/notices | DENY | DENY | DENY | DENY | ALLOW |
| Read other office's protected data | DENY | DENY | DENY | DENY | as configured |
| Disable feature then call backend directly | DENY | DENY | DENY | DENY | per hard policy |
| Session expiry/revocation | cannot act | expired denied | expired denied | expired denied | expired denied |

Run with separate test accounts, browsers, actual approved test PDFs, month-boundary dates (IST), and multiple devices. Keep screenshots, console errors and pass/fail results in private test records.

## Minimum release sequence (one user approval, multiple technical gates)
A. Backup + baseline verification → B. local static tests → C. staging deployment → D. security/role tests → E. UI acceptance → F. Drive dry run → G. rollback rehearsal → H. controlled production release → I. post-release validation.
**One approval is not permission to skip backups, tests, or move/delete production files.**

## Implementation status — staging package (07 Nov 2026)
Completed in the `upgrade/platform-readiness-2026-11` branch:
- Added `config/office-instance.example.json` with non-sensitive, explicit instance and office configuration.
- Added `tools/validate_instance_config.py` to reject duplicate/invalid office IDs and unsafe cross-instance settings in the example.
- Added `tools/check_frontend_scripts.py` for Node JavaScript syntax checks on inline and external frontend scripts.
- Added `.github/workflows/portal-static-checks.yml` to run structural, syntax and instance-validation gates on changes.
- Prepared separate **private** V17.8.0-staging integrated Apps Script code; **not** committed publicly. Adds an admin-only, read-only `adminDriveInventory` route with counts and checks that avoids the database recovery/create path.

Not yet completed: live role tests; per-file Drive parent/permissions inventory; production relocation; dynamic server office-registry refactor; idempotent upload tests; complete cross-instance isolation tests; performance/load tests. None of these are implied to have passed by the existence of the workflow.

For the next implementation, prioritize the actual end-to-end security permission matrix, approved PDF sharing policy, and safe one-instance configuration of the backend before enabling bulk office cloning.
