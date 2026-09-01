ADG(B) REPORT SUBMISSION PORTAL — V17.3 RECURRING SUBJECTS

NEW: ADMIN SUBJECT SCHEDULE

For each report subject, Admin can save:
1. Monthly
2. Monthly + Quarterly

MONTHLY
- The subject opens automatically every month.
- Every new month starts fresh as Pending for every concerned office.
- The previous month's Submitted status does NOT carry forward.
- Historical submissions remain preserved.

MONTHLY + QUARTERLY
- The normal Monthly row still opens every month.
- In April, June, September and December, a SECOND row opens automatically:
  <Subject Name> — Quarterly (Previous Quarter)
- Monthly and Quarterly upload status are separate.

QUARTERLY MONTHS
April / June / September / December

ADMIN USE
Administrator > Manage report subjects

For a new subject:
- Enter Subject name.
- Choose Automatic schedule:
  Monthly
  OR
  Monthly + Quarterly
- Save subject.

For an existing subject:
- Open Administrator.
- Select Schedule beside the required subject.
- Choose Monthly or Monthly + Quarterly.
- Save schedule.

DRIVE FOLDER ORGANISATION
Every upload is organised automatically as:

Subject
  > YYYY
    > MM-Month
      > Monthly
      > Quarterly - Previous Quarter

MONTHLY ROLLOVER
V17.3 makes Current_Status cycle-aware.
Example:
- August report Submitted
- On 1 September, September automatically starts Pending
- August submission remains preserved in Submissions and Drive

DATA MIGRATION
- Existing Subjects are preserved.
- Existing active subjects default to Monthly.
- Existing Submissions are preserved.
- Older submissions are interpreted as Monthly.
- Current_Status is rebuilt once from historical Submissions.
- No old report PDF is deleted.

EXISTING FEATURES RETAINED
- Public View / Login Required / Admin Only
- Concerned-office PIN/password protection
- Administration > Security Settings
- 5 / 10 / 15 / 20 / 30 minute timeout
- 30-minute default
- 1-minute inactivity warning
- Fast Data Engine
- Turbo login
- Raw Data
- Target / Reminder
- User permissions
- Favicon and premium colourful UI

GITHUB — upload these files to repository root:
index.html
portal-v173.js
sticky-v173.js
adgb-v173.svg
adgb-v173.png
adgb-v173.ico

APPS SCRIPT:
Replace Code.gs
Save
Deploy > Manage deployments > Edit > New version > Deploy

DO NOT RUN:
setupPortal()
setPortalSecurityCodes()

FIRST V17.3 LOAD
The backend upgrades the Subjects, Submissions and Current_Status schemas once,
then rebuilds the lightweight current-status index from preserved history.

EXPECTED
FE v17.3 | BE v17.3
