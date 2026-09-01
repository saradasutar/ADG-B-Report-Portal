ADG(B) REPORT SUBMISSION PORTAL — V17.6.4
PERMANENT SUBMITTED-STATUS ENGINE FIX

SYMPTOM FIXED
Upload succeeds → cell shows Submitted briefly → after fresh reload it changes
back to Upload/Pending.

WHY THIS COULD HAPPEN
Older portal upgrades could leave duplicate/stale rows in Current_Status.
The upload updated one Current_Status row, but a later stale duplicate could
win on the following read. Therefore the frontend's successful local status
was replaced by old data.

V17.6.4 FIXES THE STATUS ENGINE AT FOUR LEVELS

1. Current_Status WRITE
Every row having the same Status Key is updated, not only the first match.

2. Current_Status READ
If duplicate rows exist, the row with the newest Updated At wins.

3. APPEND-ONLY SUBMISSIONS = FINAL AUTHORITY
For the current month, the dashboard overlays Current_Status with the latest
event from the append-only Submissions history. A real new Submitted event
therefore cannot be changed back to Pending by an older Current_Status row.

4. SUCCESS READ-BACK
Before Apps Script returns "submitted successfully", it reads the status back
and confirms that the exact subject+office is Submitted.

FRONTEND SAFETY
A backend-confirmed upload/remove is protected on screen for two minutes while
any late stale browser/backend response finishes. Once the server returns the
same state, the temporary protection removes itself automatically.

LEGACY ALREADY-SUBMITTED REPAIR
The compatibility promotion is rerun once under the new V1764 marker. It never
deletes historical Submissions or Drive PDFs and never overwrites a real newer
current-cycle state.

ADMIN AUTO-CREATE OPTIONS RETAINED
Per subject:
- One-time
- Monthly only
- Monthly + Quarterly (QE)

V17.6 QUARTER RULE RETAINED
QE row opens only on the last calendar date of Apr / Jun / Sep / Dec.

GITHUB ROOT
index.html
portal-v1764.js
sticky-v1764.js
adgb-v1764.svg
adgb-v1764.png
adgb-v1764.ico

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
FE v17.6.4 | BE v17.6.4

TEST
Upload one PDF.
The button must change to Submitted and remain Submitted after:
- 5 seconds
- manual Refresh
- Ctrl+R
- reopening the portal
