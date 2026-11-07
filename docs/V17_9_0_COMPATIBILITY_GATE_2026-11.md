# ADG(B) V17.9.0 — frontend/backend compatibility gate

Checked: 2026-11-07
Status: **STATIC COMPATIBILITY CONFIRMED; LIVE RELEASE NOT APPROVED**

## What was compared
- Production `main` index.html versus `upgrade/platform-readiness-2026-11`.
- Private V17.9.0 Code.gs file supplied in the consolidated package (kept out of the public repository).
- No live Apps Script administrator credentials were accessed and no PDF permissions were changed.

## Findings
- Staging branch is 23 commits ahead of main at time of comparison; nine files differ, including index.html and new checks/docs.
- Matching backend doPost actions exist for `adminRecoveryAudit`, `adminPdfSharingAudit`, `adminReleaseReadiness`, and `viewSubjectLinkedPdf`.
- Direct submitted-report viewer code remains in the backend, and existing submitted-report UI flow remains in the staged frontend.
- V17.9.0 backend JS syntax passed. Its 13 isolated readiness tests passed. Staging GitHub static gate previously passed.
- `ADGB_PRIVATE_SUBJECT_PDF_V189` must **remain unset/OFF** until the coordinated frontend is deployed and role-specific tests pass.
- The existing subject-linked PDF path can still create public anyone-with-link permissions while private mode is off.
- Release-readiness preflight deliberately returns `readyForProduction:false`, because live role tests, backups/restore, default credential rotation, and confidentiality checks are not verified.
- Attempting to retrieve the public site through external web access did not produce a usable live diagnostic. Treat the user-reported backend deployment and PDF success as separate observations, not independent current verification.

## Minimal manual live acceptance tests before merging the entire PR
1. Confirm portal footer reports `v17.9.0-staging`; verify report counts across all five offices.
2. Test anonymous visitor cannot upload/view/remove restricted documents or invoke admin endpoints.
3. Test every office account can only act within its authorized scope; test admin/reviewer controls and expired sessions.
4. With a disposable test PDF, test direct open/download, duplicate retry, removal and retry, without modifying production records.
5. Run administrator recovery audit, PDF-sharing audit and release preflight against the authorized system; record aggregate results only.
6. Verify backup/restore on a separate spreadsheet and Drive folder, including post-recovery document links.
7. Verify mobile Chrome and desktop browser; test popup blocked and cached frontend behavior.
8. Prepare rollback to the last known-good main commit and previous Apps Script deployment.
9. Only then merge coordinated frontend + backend; explicitly test private subject-PDF mode in isolation before enabling it.

## Merge decision
**DO NOT MERGE YET**. Static compatibility is positive, but insufficient to certify sensitive government-document access. No frontend production change or Drive move performed by this validation.
