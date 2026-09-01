ADG(B) REPORT SUBMISSION PORTAL — V17.6.6
QE OPENS AUTOMATICALLY IN THE MONTH AFTER QUARTER END

CORRECTED RULE

Quarter ended March:
01-Apr -> QE Mar

Quarter ended June:
01-Jul -> QE Jun

Quarter ended September:
01-Oct -> QE Sep

Quarter ended December:
01-Jan of next year -> QE Dec

EXAMPLE — PROBITY

On 01-Sep-2026:
Probity for the Month of Aug,2026
NO "Probity for QE Sep,2026" row.

On 01-Oct-2026:
Probity for the Month of Sep,2026
Probity for QE Sep,2026

The QE row remains available during the October submission cycle; it is not a
one-day-only row.

JANUARY YEAR ROLLOVER
On 01-Jan-2027:
Probity for the Month of Dec,2026
Probity for QE Dec,2026

ADMIN AUTO-CREATE OPTIONS
- One-time
- Monthly only
- Monthly + Quarterly (QE)

For Monthly + Quarterly (QE), Admin stores only the base subject. The portal
creates the appropriate Monthly and QE rows automatically.

MIGRATION
Existing Monthly+Quarterly subjects that previously stored 4,6,9,12 are safely
normalized to the new opening months:
1,4,7,10

No historical Submissions or Drive PDFs are deleted.

DISABLED SUBJECT APPEARANCE RETAINED
Disabled subject rows remain visibly gray on desktop, mobile and Admin list.

STATUS ENGINE RETAINED
V17.6.4/V17.6.5 persistent Submitted-status fixes remain in place.

GITHUB ROOT
index.html
portal-v1766.js
sticky-v1766.js
adgb-v1766.svg
adgb-v1766.png
adgb-v1766.ico

APPS SCRIPT
Code.gs

INSTALL
1. Replace/upload all six GitHub files.
2. Replace Code.gs.
3. Save.
4. Deploy -> Manage deployments -> Edit -> New version -> Deploy.
5. DO NOT run setupPortal().
6. DO NOT run setPortalSecurityCodes().
7. Hard refresh once: Ctrl+Shift+R.

EXPECTED
FE v17.6.6 | BE v17.6.6
