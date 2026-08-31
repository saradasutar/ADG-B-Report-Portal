ADG(B) REPORT SUBMISSION PORTAL — V17.1 ACCESS CONTROL

FULL PACKAGE

GITHUB ROOT:
- index.html
- portal-v171.js
- sticky-v171.js
- adgb-v171.svg
- adgb-v171.png
- adgb-v171.ico

GOOGLE APPS SCRIPT:
- Code.gs

NEW ADMIN -> ACCESS CONTROL
After Administrator username/password login, a new Access button appears.

MODES
1. PUBLIC VIEW
   Anyone with the URL can see report subjects, submitted/pending status,
   summary and office status.
   Upload/View/Replace/Remove can be allowed only after concerned office
   PIN/password verification.
   Public Raw Data and submitted timestamps are separately controlled.
   Direct linked PDF/Drive URLs are NOT exposed to anonymous viewers.

2. LOGIN REQUIRED
   Username/password is required to open the dashboard.
   Office PIN alone cannot bypass login mode.
   Existing role and permission controls apply.

3. ADMIN ONLY
   Administrator username/password only.
   Useful for maintenance or temporary restriction.

ALWAYS LOGIN-PROTECTED
- Users
- Access Control
- Current Files / Drive folder
- Subject management
- Raw Data editing / structure
- Target / Reminder management

DEFAULT AFTER DEPLOYMENT
LOGIN REQUIRED.
Nothing becomes public until Administrator changes it.

INSTALL
GITHUB:
Upload/replace the 6 GitHub files listed above.

APPS SCRIPT:
1. Replace Code.gs
2. Save
3. Deploy > Manage deployments > Edit > New version > Deploy
4. Do NOT run setupPortal()
5. Do NOT run setPortalSecurityCodes()

EXPECTED:
FE v17.1 | BE v17.1
