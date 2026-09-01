ADG(B) REPORT SUBMISSION PORTAL — V17.6.5
QE LAST-DATE CORRECTION + GRAY DISABLED SUBJECT ROWS

QE DATE CORRECTION
The quarterly subject now requires BOTH:
- a configured quarterly month (Apr / Jun / Sep / Dec), AND
- the LAST calendar date of that month.

Therefore on 01-Sep-2026:
Probity for QE Sep,2026 MUST NOT appear.

On 30-Sep-2026:
Probity for QE Sep,2026 appears automatically.

Backend enforcement matches the screen:
an early direct attempt to use a quarterly instance is rejected before the
last calendar date.

DISABLED SUBJECT APPEARANCE
When Administrator chooses Disable submissions:
- the COMPLETE subject row becomes visibly gray on desktop;
- the COMPLETE subject card becomes visibly gray on mobile;
- the subject is also gray in the Administrator subject list;
- pending offices show Closed;
- already-submitted reports remain viewable;
- new upload/replace activity remains disabled.

EXISTING V17.6.4 STATUS ENGINE FIX RETAINED
- successful Submitted status remains persistent;
- append-only Submissions remains authoritative for current-cycle status;
- stale/duplicate Current_Status rows cannot reverse a new submission.

ADMIN AUTO-CREATE OPTIONS
- One-time
- Monthly only
- Monthly + Quarterly (QE)

GITHUB ROOT
index.html
portal-v1765.js
sticky-v1765.js
adgb-v1765.svg
adgb-v1765.png
adgb-v1765.ico

APPS SCRIPT
Code.gs

INSTALL
1. Replace/upload all six GitHub files.
2. Replace Code.gs.
3. Save.
4. Deploy → Manage deployments → Edit → New version → Deploy.
5. DO NOT run setupPortal().
6. DO NOT run setPortalSecurityCodes().
7. Hard refresh once: Ctrl+Shift+R.

EXPECTED
FE v17.6.5 | BE v17.6.5
