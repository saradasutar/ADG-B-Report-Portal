ADG(B) REPORT SUBMISSION PORTAL — V17.6.3
LIVE SUBMITTED STATUS + ADMIN AUTO-CREATE SCHEDULE FIX

FIX 1 — SUBMITTED MUST SHOW IMMEDIATELY
After a successful upload:
- Backend writes Current_Status.
- SpreadsheetApp.flush() commits the status before the success response.
- Frontend immediately changes that exact cell to Submitted.
- Dashboard then performs an uncached fresh bootstrap to verify the status.
- Summary cards and office Submitted/Pending counts update immediately.
- The normal cached fast path is still used for ordinary dashboard loads.

This directly addresses:
Upload succeeds / green success toast appears / dashboard still shows Upload.

FIX 2 — ADMIN CHOOSES AUTO-CREATE MODE PER SUBJECT
For every new or existing subject, Admin can choose:
1. One-time
2. Monthly only
3. Monthly + Quarterly (QE)

Monthly only:
- Monthly row every month.
- Example September cycle:
  Probity for the Month of Aug,2026

Monthly + Quarterly (QE):
- Monthly row every month.
- QE row also appears on the quarter-end opening rule.
- Example:
  Probity for QE Sep,2026

The Admin stores only the base subject, e.g. Probity.

FIX 3 — VERSION DISPLAY
The visible FE badge is now correctly V17.6.3 instead of remaining hard-coded
as V17.6.

V17.6 QUARTER RULE RETAINED
QE subject opens only on the last calendar date of Apr/Jun/Sep/Dec.

DATA SAFETY
- Existing Submissions preserved.
- Existing Drive PDFs preserved.
- Users/passwords preserved.
- Office codes preserved.
- Security Settings preserved.
- No setup reset required.

GITHUB ROOT
index.html
portal-v1763.js
sticky-v1763.js
adgb-v1763.svg
adgb-v1763.png
adgb-v1763.ico

APPS SCRIPT
Code.gs

INSTALL
1. Replace/upload the six GitHub files.
2. Replace Code.gs.
3. Save.
4. Deploy → Manage deployments → Edit → New version → Deploy.
5. DO NOT run setupPortal().
6. DO NOT run setPortalSecurityCodes().
7. Hard refresh once: Ctrl+Shift+R.

EXPECTED AFTER REFRESH
FE v17.6.3 | BE v17.6.3
