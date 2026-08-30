ADG(B) REPORT SUBMISSION PORTAL — V17.0 FULL PACKAGE

THIS ZIP IS COMPLETE.

GITHUB FILES — upload these to repository root:
1. index.html
2. portal-v170.js
3. sticky-v170.js
4. adgb-v170.svg
5. adgb-v170.png
6. adgb-v170.ico

APPS SCRIPT:
7. Code.gs

WHAT WAS CORRECTED
- index.html is INCLUDED.
- index.html already references the correct new JS filenames.
- index.html already references the correct favicon filenames.
- No manual index editing is required.
- White-header override removed.
- ADG(B) Report Submission Portal is now high-contrast white text on a
  navy/indigo/teal premium header.
- Favicon included.
- One-time old cache/service-worker cleanup included.
- V16.9 cache-proof approach retained with NEW physical V17 filenames.
- Fast Data Engine retained.
- Turbo login retained.
- Raw Data fix retained.
- Workflow Details remains removed.
- Lazy Target/Reminder retained.

INSTALL
A. GITHUB
   Upload the six GitHub files above and commit.

B. APPS SCRIPT
   Replace Code.gs.
   Save.
   Deploy > Manage deployments > Edit > New version > Deploy.
   DO NOT run setupPortal().
   DO NOT run setPortalSecurityCodes().

EXPECTED
FE v17.0 | BE v17.0
