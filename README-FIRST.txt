ADG(B) REPORT SUBMISSION PORTAL — V17.4

SUBJECT SCHEDULE OPTIONS
• One-time — default for new ad-hoc subjects
• Monthly
• Monthly + Quarterly

THE SUBJECT ITSELF AUTOMATICALLY SHOWS ITS REPORTING PERIOD

Monthly example:
Financial Report — September 2026

Quarterly examples:
April     → Financial Report — Q1 (Jan–Mar 2026)
June      → Financial Report — Q2 (Apr–Jun 2026)
September → Financial Report — Q3 (Jul–Sep 2026)
December  → Financial Report — Q4 (Oct–Dec 2026)

One-time example:
VIP Reference Information — One-time · September 2026

ONE-TIME
Admin selects month/year and may optionally set a closing date.
It appears only in the selected month, then automatically disappears from the
live dashboard. History and Drive files remain preserved.

MONTHLY
Automatically appears every month with the current month/year added to the
subject. Each month starts fresh Pending for all offices.

MONTHLY + QUARTERLY
Monthly row appears every month, plus a quarterly row in Apr/Jun/Sep/Dec.
The quarter number and date range are generated automatically.

EXISTING FEATURES RETAINED
Public View / Login Required / Admin Only
Office credential protected actions
Security Settings 5/10/15/20/30 min
30-minute default + 1-minute warning
Fast Data Engine
Raw Data
Target / Reminder
User permissions
Favicon / premium UI

GITHUB ROOT
index.html
portal-v174.js
sticky-v174.js
adgb-v174.svg
adgb-v174.png
adgb-v174.ico

APPS SCRIPT
Code.gs

DEPLOY
Replace files, then Apps Script:
Deploy → Manage deployments → Edit → New version → Deploy

DO NOT run setupPortal().
DO NOT run setPortalSecurityCodes().

EXPECTED
FE v17.4 | BE v17.4
