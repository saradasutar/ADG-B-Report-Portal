ADG(B) REPORT SUBMISSION PORTAL — V17.6.2

FIXED TOGETHER
1. Upload button not opening.
2. Already-submitted reports showing as Pending/Upload.

ROOT CAUSE
Recurring rows use instance IDs (__M / __Q / __O), while parts of the old UI
and legacy Current_Status data still referred to the original base subject ID.

UPLOAD FIX
The clicked row is resolved from the live dashboard subject instances, so
Monthly, Quarterly and One-time buttons open correctly.

ALREADY-SUBMITTED REPAIR
V17.6.2 performs a one-time compatibility repair:
- Reads existing historical Submissions.
- Finds the latest legacy Submitted/Removed event for each subject+office.
- Copies that state into the current Monthly status ONLY if no newer genuine
  current-cycle status exists.
- Does NOT edit/delete historical Submissions.
- Does NOT delete/move Drive PDFs.
- Does NOT overwrite a newer current-cycle upload/removal.
- Runs once only.

It also makes old timestamp parsing safe so one bad timestamp cannot make
Submitted status disappear.

V17.6 QUARTER-END RULE RETAINED
QE report appears only on the last calendar date of Apr/Jun/Sep/Dec.
30-Sep-2026 -> Probity for QE Sep,2026

GITHUB ROOT
index.html
portal-v1762.js
sticky-v1762.js
adgb-v1762.svg
adgb-v1762.png
adgb-v1762.ico

APPS SCRIPT
Code.gs

INSTALL
1. Upload/replace the six GitHub files.
2. Replace Code.gs.
3. Save.
4. Deploy > Manage deployments > Edit > New version > Deploy.
5. DO NOT run setupPortal().
6. DO NOT run setPortalSecurityCodes().
7. Hard refresh once: Ctrl+Shift+R.

The FIRST load after deploying V17.6.2 may be a little slower while the
one-time status compatibility repair runs.

EXPECTED
FE v17.6.2 | BE v17.6.2
