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

## Phase 1 implementation — private backend V17.8.1-staging
Prepared and locally checked **outside public GitHub** on 07 November 2026:
- GET `databaseHealth` requires ADMIN and returns no spreadsheet ID/name. It uses the recorded existing spreadsheet via `SpreadsheetApp.openById`, never database recovery/create.
- GET `stickyHealth` requires ADMIN; checks for an existing sheet without calling its `ensure...` constructor.
- GET `previewFolderNames` requires ADMIN; uses read-only existing database resolution.
- Public `ping` no longer advertises a sensitive folder-preview route.
- Local mocked negative tests passed for anonymous denial and positive tests passed for admin diagnostics.
- The separate admin-only V17.8.0 read-only Drive inventory endpoint remains available in the private package.

**Still blocked**: existing linked-subject document path may set `ANYONE_WITH_LINK` Drive permission; classification/access review is required before enabling this portal across additional offices. No linked-PDF sharing change has been silently applied. Do not treat synthetic tests as live security tests.

The integrated private backend, test harness and release guide are supplied as a separate chat ZIP, **never included in the public repository**. No live Apps Script deployment, Drive migration, office-user provisioning, or production sheet mutation performed.

## Phase 1 — V17.8.2 staging upload replay safeguard (2026-11-07)

- Private integrated backend V17.8.2-staging prepared **outside public GitHub**; adds best-effort protection against replaying the **same frontend upload nonce**.
- Under the existing script lock, a matching completed request returns its cached success response; mismatched file/subject/office reuse is denied.
- CacheService TTL is six hours (subject to early eviction). This is **not** durable exactly-once semantics and does not prevent an intentionally new nonce from creating another upload.
- Local mock tests passed: anonymous diagnostic denial; authorized health read; one file/row/status for repeated nonce; mismatched payload rejected; new upload nonce accepted.
- **Release blockers remain**: report removal currently trashes a PDF before committing the status event; linked-subject PDF path uses ANYONE_WITH_LINK; transaction recovery and authorized PDF-sharing tests are incomplete.
- The V17.8.2 private ZIP includes full Code.gs, local test script and release guide. **Do not commit backend, deploy to production, move Drive contents, or run setupPortal() on the live instance.**

## V17.8.3 staging — removal order hardened (local only)

- A private integrated backend changes removal ordering to: acquire lock → append `Removed` event → update `Current_Status` → flush → verify the exact status event → optionally move the PDF to Trash.
- If the status write fails, the PDF is NOT trashed; the administrator must reconcile the append-only record and index.
- If Drive cleanup fails, the removal response returns `cleanupPending:true` and the PDF remains in Drive. This is a *non-durable flag*, not a cleanup queue.
- A repeat removal when the latest event is already `Removed` is refused rather than risking a second removal.
- Offline Node tests passed for successful removal, repeat removal, status write failure and Trash failure. JavaScript syntax passed.
- **BLOCKERS**: no durable cleanup ledger/reconciliation UI; no fully durable upload deduplication; PDF sharing risk remains; no authorized staging Drive integration tests.
- No live production report, spreadsheet, Drive folder, Apps Script deployment or frontend was modified.

## V17.8.5 private staging PDF open refinement
- Private Apps Script `Code.gs` package prepared outside the public repository, based on V17.8.4-staging.
- Secure PDF landing page attempts **one** automatic `window.open` of the existing one-time token's validated PDF blob. It does not weaken office code checks or change Drive sharing.
- Chrome may block automatic popups; existing manual Open PDF and Download PDF remain as fallback. Intermediate tab may remain open even when auto-open succeeds.
- Offline tests: browser permits popup, browser blocks popup, popup throws exception, token consumption, invalid PDF and expired token — six local tests passed. JavaScript syntax passed.
- No live Apps Script deployment or browser verification performed. Do not consider this a production-security release.

## V17.8.6 (staging only) — read-only recovery diagnostics
- Complete private backend code was prepared from the existing V17.8.5 source and is **not published on GitHub**.
- Added an `adminRecoveryAudit` POST endpoint behind `requirePortalAdminSession_`; uses the existing recorded database ID, existing Submissions and Current_Status tables, and **never** invokes setup or database creation.
- Compares same-cycle event log and status index, returns only mismatch counts and up to 20 **row-number** hints, without PDF URLs, file IDs, credentials or user data.
- Limits audits to 20,000 rows per table. Does not scan historical cross-month fortnightly records.
- Node syntax passed and seven mock tests passed: anonymous denied, empty, matching, mismatched, missing status, orphan status, safety row bound.
- **Still outstanding:** Durable transaction journal, authoritative reconciliation & cleanup queue, per-action live security tests, PDF sharing, Drive master-folder inventory, and deployment of an independent example office.
- Production unchanged and no Drive/Sheet changes made. This audit alone does not warrant 9.8/10 certification.

## V17.8.7 private staging — persistent upload replay and removal cleanup markers
- Full private backend, test script and installation instructions packaged outside public GitHub, based on V17.8.6 with V17.8.5 PDF opening retained.
- Persist same-request upload marker as hashed nonce + file fingerprint in the existing `Submissions` note column Q; under the upload lock, check persisted marker before Drive file creation. A completed same-nonce retry returns recorded success; conflicting office/file or index mismatches block and request manual reconciliation.
- Persist removal cleanup marker `ADGB_REMOVAL_PENDING_V187` in appended removal event before attempting Drive Trash, then `ADGB_REMOVAL_DONE_V187` once cleanup confirmed. Read-only recovery audit counts pending cleanup events.
- Existing GitHub staging branch's admin Recovery Audit preview now surfaces pending-cleanup count. **No production frontend or backend change**.
- Node syntax of integrated Code.gs passed; **10 isolated mocked tests** passed. Real Sheets/Drive failure injection, workload and user-role tests still necessary.
- Limitations: orphan PDF before append is still possible; pending marker might remain after successful Trash if updating marker fails; no autonomous cleanup or reconciliation; source has live root ID and MUST be reconfigured before independent staging; existing linked PDF sharing risk unresolved.

## V17.8.8 consolidated private staging — PDF sharing risk audit and readiness gate
- Private backend package retains V17.8.7 persisted upload replay and pending removal cleanup, V17.8.6 read-only reconciliation, and V17.8.5 direct PDF opening.
- New administrator-session-only `adminPdfSharingAudit` checks existing subject-linked file sharing access and reports aggregate counts (ANYONE_WITH_LINK, private, other, inaccessible, unscanned). It never alters Drive permissions and never returns Drive file identifiers.
- Bounded to 50 Drive file reads per request and 2,000 subject rows; larger workloads require a paginated future audit. Eight isolated local security tests and full backend JS syntax passed; no live Drive behavior verified.
- GitHub **staging** System Health now has a PDF sharing audit button. Production frontend remains unchanged.
- Existing `saveLinkedSubjectPdf_` still sets `DriveApp.Access.ANYONE_WITH_LINK` for new subject-linked PDFs, which can expose documents to anyone possessing their URLs. **Not production-certified for confidential documents**. Do not call this a complete security fix.
- Multi-office JSON sample is a *design-only example*, not a functional new-office installer. Complete folder migration and all remaining security/recovery gates must be validated before deployment.
