ADG(B) REPORT SUBMISSION PORTAL — V17.6.7
SUBJECT HIDE / SHOW CONTROL

NEW ADMIN FEATURE
Administrator can hide any particular subject from ALL dashboard users.

SUBJECT MANAGEMENT NOW HAS
- Auto-create
- Rename
- Add/Edit PDF link
- Hide from dashboard / Show on dashboard
- Disable submissions / Enable submissions
- Remove

HIDE FROM DASHBOARD
When Admin selects "Hide from dashboard":
- The subject disappears completely from the live dashboard.
- It disappears for Admin dashboard view, offices, viewers and public-view mode.
- It is excluded from Submitted/Pending dashboard totals while hidden.
- Direct office upload/view/remove attempts against that hidden subject are
  blocked by the backend.
- Historical Submissions remain preserved.
- Existing Drive PDFs remain preserved.
- Schedule settings remain preserved.
- The subject remains visible in Administration -> Subject Management with
  a "HIDDEN FROM DASHBOARD" badge.
- Admin can restore it anytime with "Show on dashboard".

DISABLE SUBMISSIONS IS DIFFERENT
Disable submissions:
- The subject stays visible on the dashboard.
- The whole subject row/card remains visibly gray.
- Pending offices show Closed.
- Existing submitted PDFs remain viewable.

Hide from dashboard:
- The entire subject disappears from the dashboard.

EXISTING FEATURES RETAINED
- One-time
- Monthly only
- Monthly + Quarterly (QE)
- QE Sep -> opens automatically from 01 Oct
- Persistent Submitted-status engine
- Gray rows for disabled subjects
- Historical data and PDFs preserved

DATABASE UPGRADE
Subjects sheet gets one additional safe column:
17. Dashboard Visible

Existing subjects are automatically set to TRUE/Visible unless already hidden.

GITHUB ROOT
index.html
portal-v1767.js
sticky-v1767.js
adgb-v1767.svg
adgb-v1767.png
adgb-v1767.ico

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
FE v17.6.7 | BE v17.6.7
