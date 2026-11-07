# Operations design — One Drive root & reusable office portals
**Planning only. No Drive files or live databases have been moved or created.**

## A. Proposed Drive layout
```text
CPWD Report Portal Platform/          [single master folder, private]
  00_Platform_Admin/                   [private access inventory, disaster recovery]
    Instance_Register                [one small configuration register, optional; no report data]
    Migration_Manifest               [IDs, parent IDs, owner, verified status; private]
    Backups/                          [dated read-only exports / backup manifests]
  01_ADG_Bengaluru/                   [existing production instance]
    Database/                          [move existing database file BY ID only after validation]
    Reports/
      Current_Cycle/
      Historical_Cycles/
      Attachments/
    Notices_And_Exports/
    Audit_Exports/
  02_Office_Or_Section_A/             [new future instance]
    Database/
    Reports/
    Notices_And_Exports/
    Audit_Exports/
  03_Office_Or_Section_B/
    Database/
    Reports/
    Notices_And_Exports/
    Audit_Exports/
  99_Recovery_And_Staging/
```
The single parent folder is an organizational container. **Each office retains its own restricted permissions and dedicated database/folder subtree.** A master folder with broad editor/viewer access is NOT recommended for confidential reports. If Drive inheritance or sharing policy would expose office data, use separate secured roots instead of insisting on a single parent.

Keep Google Apps Script projects private and separately deployed; GitHub Pages hosts **static frontend only**.

## B. Inventory before moving anything
Read-only inventory columns:
`instanceId, itemType, objectId, name, currentParentId, desiredParentId, ownerOrDrive, sharingScope, referenceSource, linkedSheetColumn, moveEligible, dryRunStatus, moveStatus, verifiedAt, rollbackParentId`.
Never include actual IDs in a publicly shared CSV, repository or screenshot.

Reconcile:
- Script Properties database ID and root folder ID
- Current database spreadsheet ID, tab names/row counts, headers, latest cycle
- Every subject -> folder association
- Every submission event -> Drive file ID, URL, original/archived status
- Linked-subject PDF IDs, office email/notice configuration, archive and compliance evidence
- App Script deployment, web app permission mode, connected frontend origin
- Any existing report folders outside the expected tree, including legacy/recovery folders

Manifest is stored privately and backed up.

## C. Migration gates
0. Freeze write activity for a brief planned maintenance interval (communicate to offices); preserve rollback path.
1. Snapshot all IDs and parent paths and verify permission policy.
2. Back up the database + latest Code.gs, Script Properties (securely), and critical file inventory.
3. Dry run; produce count of discovered, matched, unmatched, duplicate and ambiguous records.
4. Create planned destination folders (do NOT auto-share across offices).
5. Move ONE disposable authorized test file and verify access, ID, link and automatic retrieval; reverse the move.
6. Move one noncritical folder/file, check references and office permissions.
7. Move remaining verified objects in controlled batches; capture source/destination parent IDs.
8. Validate no missing/unlinked records, archive access, current-cycle uploads/view/download.
9. Run portal end-to-end checks in public / office / admin sessions.
10. Complete release signoff; retain original backups and rollback manifest.
11. Rollback by restoring original parent IDs (where possible) and original config; pause on permission or ownership errors. **Do not delete files to fix errors.**

Moving in Google Drive may require ownership/edit permission on current parent; shared-drive moves can change access/ownership. Verify before migration.

## D. Instance registry (schema example, NO real IDs)
```json
{
  "instanceId": "OFFICE_ALPHA",
  "displayName": "Office Alpha Report Portal",
  "environment": "staging",
  "driveRootFolderId": "SET_PRIVATELY",
  "databaseSpreadsheetId": "SET_PRIVATELY",
  "timeZone": "Asia/Kolkata",
  "officeRegistry": [
    {"officeId": "ALPHA_A", "label": "Section A", "active": true},
    {"officeId": "ALPHA_B", "label": "Section B", "active": true}
  ],
  "frontEnd": {"repo": "office-alpha-report-portal", "scriptUrl": "SET_PRIVATELY"},
  "defaultRolePreset": "login-required",
  "separateCredentials": true
}
```
Store IDs/URLs and credentials privately; do not publish a complete live manifest on GitHub. Frontend can safely receive only a narrowly scoped public bootstrap subset.

## E. Tenant isolation rules
- Prefer **one deployment + one spreadsheet + one report root + separate login/Script Properties per office/section** initially. Less complex and safer than multiple tenants inside the current shared spreadsheet.
- Configure office registry and report subjects per instance; office IDs are stable identifiers, not labels.
- Never use code that infers an office from a URL query parameter without server session checks.
- Retain current ADG(B) as production/reference system; test first new office using sandbox Drive folders and new accounts.
- Configuration versioning and schema migrations should be additive, reversible and audited; no hardcoded set of six security codes for newly onboarded offices.
- Platform admin may monitor all portals via **non-sensitive heartbeat summaries**, never by granting users the parent-folder contents.

## F. Recommended rollout after portal hardening
1. Staging demonstration for one small section, separate Drive and sheet.
2. Prepare its office labels, roles and report subject schedule.
3. Test report upload, removal, viewing, overdue due-date and PDF permissions.
4. Prove that a user from the section cannot view ADG(B) or another section.
5. Train administrator with checklist; store private setup receipt.
6. Only after acceptance, repeat from clean versioned release template.

## G. Non-negotiable operations rules
- No new spreadsheet in the **existing ADG(B) production instance** merely to perform the upgrade.
- Creating a new portal for a genuinely separate office necessarily needs its own store if isolation is desired.
- No migration or first-time setup via `setupPortal()` on existing production.
- No copying production accounts, passwords, token hashes or Script Properties to another portal.
- No promises of single-click cloning before provision, access and rollback tests pass.
