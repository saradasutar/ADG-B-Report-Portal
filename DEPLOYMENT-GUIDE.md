# ADG(B) Report Submission Portal — Deployment Guide

This guide is written for a non-coder. Nothing needs to be installed on your computer.

## What the portal does

- Head Office can add or remove report subjects.
- Adding a subject automatically creates/reuses a folder with the same name inside the designated Drive folder.
- Each sub-office uploads with its own security code.
- Only PDF files up to 8 MB are accepted.
- Files are renamed with the office name and submission time.
- The portal matrix shows the latest submission status.
- Every submission is recorded automatically in a Google Sheet database.
- Removing a subject never deletes its existing folder, files, or history.

## Part A — Set up the Google Apps Script backend

1. Sign in to the Google account that owns or can edit the main Drive folder. For your setup, use `theutkal@gmail.com`.
2. Open [Google Apps Script](https://script.google.com/) and select **New project**.
3. Change the project name to **ADG(B) Report Submission Portal Backend**.
4. Open the existing `Code.gs` file in the editor and delete its sample content.
5. Open the supplied `Code.gs` file, copy everything, and paste it into the Apps Script editor.
6. Confirm that this line contains the correct main folder ID:

   ```javascript
   ROOT_FOLDER_ID: '1Dna4xHyOSfH1-0Oq9tJ2xfmlmEaJlHRF',
   ```

7. Find the function named `setPortalSecurityCodes()`. Replace all six values beginning with `CHANGE-` with your own private codes:

   - `HEAD_OFFICE`: only for O/o ADG(B)
   - `CEB`: for CE(B)
   - `CEHAL`: for CE(HAL)
   - `SEPD`: for SE&PD
   - `SEMYSORE`: for SE(Mysore)
   - `SEHUBLI`: for SE(Hubli)

   Use different codes for every office. Do not share the Head Office code with sub-offices.

8. Click **Save**.
9. From the function selector near the top, select `setupPortal`, then click **Run**.
10. Google will ask for authorization. Select the correct Google account, review the permissions and allow them.
11. Wait until the execution log says the setup is complete.
12. Select `setPortalSecurityCodes` from the function selector and click **Run** once.

The backend will create:

- a Google Sheet named **ADG(B) Portal Database** inside the main folder;
- a **Subjects** sheet;
- a **Submissions** sheet; and
- the five initial subject folders, reusing any folder that already has the same name.

## Part B — Deploy the Apps Script as a Web app

1. In Apps Script, click **Deploy** → **New deployment**.
2. Click the gear icon and choose **Web app**.
3. Enter a description such as **Portal version 1**.
4. Set **Execute as** to **Me**.
5. Set **Who has access** to **Anyone**.
6. Click **Deploy** and complete authorization if requested.
7. Copy the Web app URL. It must end with `/exec`.

Keep the Apps Script project and its deployment under the account that has access to the Drive folder. Sub-offices do not need access to the Apps Script project or the Drive folder.

## Part C — Connect `index.html` to Apps Script

1. Open the supplied `index.html` file in any text editor or directly in the GitHub file editor.
2. Search for this exact text:

   ```javascript
   PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE
   ```

3. Replace only that text with the `/exec` URL copied in Part B. Keep the quotation marks.

   Example:

   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
   ```

4. Save the file.

## Part D — Publish on GitHub Pages

1. Sign in to GitHub and open your repository **ADG-B-Report-Portal** under the `saradasutar` account.
2. If the repository does not exist, click **New repository**, name it `ADG-B-Report-Portal`, choose **Public**, and create it.
3. Click **Add file** → **Upload files**.
4. Upload `index.html` to the top level of the repository, then commit the change.
5. Open **Settings** → **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch **main**, folder **/(root)**, then click **Save**.
8. Wait a few minutes and open:

   `https://saradasutar.github.io/ADG-B-Report-Portal/`

The orange setup warning must disappear after the correct Apps Script URL is saved in `index.html` and GitHub Pages has refreshed.

## Part E — Test before sharing

1. Open the GitHub Pages link in a private/incognito browser window.
2. Confirm the heading says **System ready**.
3. Click one Upload button.
4. Select a small test PDF and enter that office's code.
5. Submit it and confirm the cell changes to **Submitted**.
6. Check the corresponding subject folder in Google Drive.
7. Confirm the file name starts with the office name.
8. Open **ADG(B) Portal Database** → **Submissions** and confirm that a row was added.
9. Open **Administrator**, sign in with the Head Office code, add a test subject and confirm that its Drive folder appears.
10. Remove the test subject from the portal and confirm its Drive folder remains untouched.

## Updating the backend later

After making any change to `Code.gs`:

1. Save the Apps Script project.
2. Open **Deploy** → **Manage deployments**.
3. Click the pencil/edit icon for the current Web app.
4. Under **Version**, choose **New version**.
5. Click **Deploy**.

The existing `/exec` URL normally remains unchanged.

## Common problems

### Portal says “Setup required”

The placeholder in `index.html` has not been replaced with the full Apps Script `/exec` URL, or GitHub Pages has not finished updating.

### Portal cannot connect to the database

Confirm the Web app is deployed with **Execute as: Me** and **Who has access: Anyone**. Also make sure you used the `/exec` URL, not the `/dev` testing URL.

### “Apps Script account cannot access the configured Google Drive folder”

The account that deployed the Web app does not have edit access to folder ID `1Dna4xHyOSfH1-0Oq9tJ2xfmlmEaJlHRF`.

### “Portal security codes have not been configured”

Replace all six sample codes in `setPortalSecurityCodes()` and run that function once.

### Upload remains busy and then times out

First try a smaller PDF. The supplied portal permits a maximum of 8 MB. Then confirm that the current Apps Script deployment contains the latest `Code.gs` version.

### Folder or database does not appear

Run `setupPortal()` once from the Apps Script editor and authorize the correct Google account.

## Security notes

- Never place office security codes inside `index.html` or the GitHub repository.
- Share each office code separately with that office.
- Change codes periodically by updating the six values and rerunning `setPortalSecurityCodes()`.
- If an office code is exposed, change that code immediately and redeploy only if `Code.gs` itself was changed.
- Keep the Head Office code restricted to portal administrators.



---

## V17.7.65+ — Existing installation upgrade and historical archive verification

> This section is for an **already deployed** portal. Do not re-run initial setup, reset office codes, recreate the database, or publish a new Web app URL merely to upgrade the frontend. Preserve the active Google Sheet and Drive records.

### 1. Confirm your current deployment

1. Open the live GitHub Pages portal and check that the report matrix, Submission Register, analytics, and recent submissions are visible.
2. In Google Apps Script, open the **existing** portal backend project. Back up its full code, script properties, deployment details, and the spreadsheet ID before editing.
3. Confirm the existing Web app **/exec** deployment matches the URL configured in the frontend. Do not paste or share security codes in GitHub or public issue reports.
4. The archive frontend added in V17.7.65 expects backend actions named `adminArchiveList` and `adminArchiveView`. They must be implemented and deployed in the existing backend. The backend implementation was **not verified from the public repository**, so these actions must be checked before claiming archive access works.
5. If compatible backend changes have already been installed, edit the **existing** Web app deployment, select **New version**, and deploy. Keep the same Web app deployment and URL.
6. If the backend lacks these routes, do not replace it with an older sample Code.gs: obtain and review a compatible backend patch, test it against a backup or test environment, then deploy it.

### 2. Administrator-only historical archive acceptance test

Use test submissions or non-sensitive records, and avoid sharing security codes, protected URLs, or PDF contents outside the authorized office.

| Test | Expected result |
|---|---|
| Open Historical Archive without administrator authentication | Archive must not open or expose records |
| Open it after administrator authentication | Archive panel is available |
| Load an earlier reporting month | `adminArchiveList` returns that cycle's authorized records, without disclosing records from other cycles |
| Search and filter by office/status | Displayed rows and counts match the returned dataset |
| Click View PDF | `adminArchiveView` issues an authorized short-lived link, and the PDF opens only for authorized access |
| Attempt expired/reused archive link | The authorization expires as designed; no permanent public file sharing is introduced |
| Supply an invalid submission ID or different cycle | Backend rejects the request |
| Log out and try opening an old archive link | Access remains controlled by the backend, not merely hidden in the frontend |
| Submit a new current-month test PDF | Submission still records correctly in Drive, Sheet and matrix |
| Open Submission Register and download CSV as admin | Current-cycle records, totals, and access control remain correct |

**Important:** Merely hiding a button in a public GitHub Pages frontend is not an authorization control. Every archive action must validate administrator credentials and scope on the server. Do not return unrestricted Drive sharing URLs, tokens or credentials in public page source.

### 3. Record test outcomes before enabling office-wide use

Record the test date, frontend GitHub commit, Apps Script deployment version, test month, tester, pass/fail for each test, and any issue found. Keep this operational verification record in a restricted location, **not** in the public GitHub repository if it contains office or document details.

### 4. Troubleshooting

- **Archive unavailable / unsupported**: confirm `adminArchiveList` exists in the deployed backend, that the backend returns an `ok` response with a `records` array, and that the existing Web app was redeployed to a new version.
- **Archive rows load but PDFs do not open**: verify `adminArchiveView` authorizes the specified `cycleKey` and `submissionId`, returns a valid authorized viewer URL, and that the user explicitly clicks the provided secure link.
- **Wrong month / missing records**: verify the reporting cycle is computed in **Asia/Kolkata**, and confirm whether the backend uses submission month or reporting month. Never relabel current-cycle snapshot data as historical event records.
- **Admin access fails**: confirm backend authentication and deployment permissions; do not insert the administrator code into `index.html`.
- **Regression after deployment**: restore the previous Web app version using deployment management, then investigate against the backed-up code and data.

### 5. Next development after archive passes

Implement pending-report deadlines and reminders only after the above acceptance tests pass. Define due dates per subject/reporting frequency, keep reminder recipients in the private backend, prevent duplicate reminders, and add a dry-run mode before scheduling production triggers.



---

## V17.7.70 — Persist Office Review records in the existing Sheet (integration required)

The frontend now includes **Load saved reviews** and **Save to Sheet** in Office Analytics. **They are not operational until a compatible, private backend has been installed and deployed.** The frontend requires a successful load before save, so unsynchronized drafts cannot overwrite existing reviews by accident.

A proposed Apps Script add-on is in `backend/OfficeReviewBackendV17770.gs` (repository code only; no secrets). **Do not paste it into a live deployment unreviewed.** It deliberately fails closed until connected to two existing backend functions.

### Required steps, in order

1. Back up the live Apps Script code, project configuration and existing portal database. Do not reset or re-create the spreadsheet.
2. Read `backend/OfficeReviewBackendV17770.gs`; copy it into a **new .gs file inside the existing Apps Script project**, not as a replacement for `Code.gs`.
3. Implement **`adgbReviewRequireAdmin_`** using the current backend's real HEAD_OFFICE session/code validation. It must reject a forged or expired token, including one sent from public GitHub Pages.
4. Implement **`adgbReviewSpreadsheet_`** using the existing portal database spreadsheet accessor/ID, not `SpreadsheetApp.create`.
5. Before production, validate each `officeId` against the existing office registry on the server. The supplied add-on validates syntax and batch duplicates but cannot know your backend's actual office registry.
6. Add two cases in the live request router, adapting your router's request/response conventions:
   - `adminOfficeReviewList` → `adgbOfficeReviewList_(request)`
   - `adminOfficeReviewSave` → `adgbOfficeReviewSave_(request)`
7. Test in an isolated copy/test backend. Verify invalid credentials, forged office IDs, mismatched reporting cycles, simultaneous saves, reload after saving, and duplicate entries.
8. Only then deploy a **new version of the existing Apps Script Web app**, preserving its /exec URL. On first authorized read/write, the add-on creates **one new tab called OfficeReviews** inside the **existing spreadsheet**. It does not create a new spreadsheet.
9. Sign in as admin, open Office Analytics, click **Load saved reviews**, edit a remark, then **Save to Sheet**. Verify the confirmation count, refresh, and load again. Use Export CSV as a backup before refresh if any request fails.

### Security and scope

- Office review data is sensitive operational information. Do not add it to GitHub, URL query parameters or localStorage.
- Do not equate a visible Administrator label with verified backend authorization; the private backend must enforce it for every request.
- The add-on writes current-cycle office-level reviews only. It does not yet provide per-report remarks, multi-user conflict resolution, or a historical review edit UI.
- Existing report uploads, archive actions, emails and submissions must continue passing regression tests. Roll back the deployment version if any fail.



---

## V17.7.72 — Office Review History & Audit Trail

The administrator review screen now has a read-only **Review History & Audit Trail** panel with a reporting-month selector, office filter, time, administrator, and before/after details. Saving a review requires a deployed V17.7.72 backend. The frontend refuses to save with older backend releases that cannot record audit events.

### Upgrade an existing installation safely

1. Back up your **existing Apps Script project**, plus the existing ADG(B) Portal Database spreadsheet. Keep a copy of your current working Code.gs.
2. Use the private integrated backend file supplied in this ChatGPT conversation, named **ADGB_Code_gs_V17_7_72_Integrated.txt**. Do not substitute an older repository sample backend.
3. In the **existing Apps Script project**, replace only the contents of Code.gs with that entire integrated file, **after confirming your working project matches the supplied V17.7.70 baseline**.
4. **Remove any separately pasted OfficeReviewBackendV17770.gs add-on** before redeployment, to avoid duplicate global functions. Leave unrelated working project files alone.
5. Click **Save**. Do **not** run `setupPortal()` or `setPortalSecurityCodes()`; the existing database and existing configured login settings must be preserved.
6. Choose **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**. Update the **existing** deployment; do not create a new one.
7. Sign in to the portal with an Administrator login, then open **Office Analytics → Load saved reviews**. Make a small test change, select **Save to Sheet**, and confirm the success message reports one changed office.
8. Select the new **Review History & Audit Trail → Load history**. Verify the administrator, timestamp, changed field, old value, and new value. Save an unchanged review again and confirm no additional history event is created.
9. Refresh, reload saved reviews, and verify your changes still appear. Test that an office-only account cannot view review history or save Office Reviews.

### Where data is kept

The same existing database spreadsheet is used. There are **two tabs**, not two spreadsheets:

- `OfficeReviews` — latest Office Review per office and reporting cycle (already used by V17.7.70).
- `OfficeReviewAudit` — appended change-event records with before/after values, verified administrator identity, and time (new).

### Important limits

- Audit entries are appended **before** updating the current review sheet. Google Sheets cannot atomically commit to both tabs, so an audit event can reflect an attempted change if the subsequent update fails. Confirm the current record when reviewing incidents.
- Old review changes made **before** this feature was deployed are not retroactively available as audit history.
- The review feature is **office-level** for the current month; it is not a per-report audit.
- The history panel can view previous months, but the editor allows updates only to the current reporting month.
- If Save reports an expired or conflicting version, **export your draft**, refresh, and load saved reviews before retrying.
- Never commit the complete private Apps Script backend or employee/office review content to this public GitHub repository.



---

## V17.7.73 — Export and print the loaded Office Review Audit History

The **Review History & Audit Trail** section under **Office Analytics** now offers **Export loaded CSV** and **Print loaded history**.

### Usage

1. Sign in with an active Administrator account.
2. Open **Office Analytics → Review History & Audit Trail**.
3. Choose the reporting month and optional office, then select **Load history**.
4. If **Load more** appears, use it to retrieve additional matching records before exporting.
5. Select **Export loaded CSV** or **Print loaded history**.

**Scope:** Both outputs include **only records actually loaded on the page**, not an unseen entire month or the whole database. The filenames and print heading distinguish this. CSV uses formula-injection protection and correctly quotes multiline text. The printed history shows old and new values for each changed field.

**Security:** Audit data remains in memory in the browser while the page is open, rather than being stored in GitHub or browser local storage. Treat downloaded/printed files as restricted office records. Server-side authorization is still required for history retrieval.

**Deployment:** This upgrade changes only GitHub `index.html`. **No new Google Apps Script backend deployment is needed if the V17.7.72 backend is already installed and operating.** If V17.7.72 is not yet installed, first complete its existing-backend deployment and test audit history. Do not rerun `setupPortal()` or `setPortalSecurityCodes()`.



---

## V17.7.74 — Office Analytics usability and mobile layout

This frontend-only update adds a compact **office-wise compliance overview** in Office Analytics. Administrators and authorized viewers can sort office cards by **most pending**, **most overdue**, **highest completion**, or **office name**. The cards calculate percentage submitted from the same *current-cycle* statuses already shown in the portal. They clearly distinguish pending and overdue counts.

The existing administrator-only **Office Review & Follow-up** section retains its current-cycle review status and target-date summaries. The presentation is more compact on phones and uses larger editable fields for easier entry. This change does **not** alter Apps Script routes, send emails, or create a Google Sheet.

**Important historical limitation:** The current backend snapshot is not sufficient to establish full prior-month expected counts reliably. The page deliberately does **not** invent historic completion percentages or call the current-cycle data a month-on-month trend. Adding verified historical trends later requires a suitable archived expected/submitted dataset.

### To see the changes

1. Open the existing Report Portal URL and refresh the page.
2. Select **Office Analytics** and view the new office cards.
3. Use **Sort offices** to change the order; the compliance figures remain unchanged.
4. On a phone, verify that cards stack neatly and the review form remains readable.
5. For persisted review remarks and audit history, ensure the previously prepared **V17.7.72 backend** has been deployed and tested. No new backend deployment is required for V17.7.74 itself.



---

## V17.7.75 — Month-wise compliance evidence and snapshots

**What is new:** Office Analytics includes an administrator-only month-wise chart and table. The **Recorded submissions** column is reconstructed from the final logged event for each office/report/month in the existing `Submissions` tab. This number is **not** a compliance percentage or total expected reports.

The **Capture current-cycle snapshot** button records a dated, server-calculated expected and submitted total, with office breakdown, in a new tab `Compliance_Snapshots` **inside the existing ADG(B) Portal Database spreadsheet**. It does **not** create another spreadsheet.

### Easiest backend installation (required once for V17.7.75)

1. Download **ADGB_Code_gs_V17_7_75_Integrated.txt** from the ChatGPT response. It is a complete backend, based on the earlier integrated V17.7.72 file.
2. Back up your existing Apps Script `Code.gs` and the database spreadsheet before replacing anything. Verify that your live backend matches the previous V17.7.72 integrated version. If it has newer independent changes, merge them rather than overwriting.
3. Open the **existing** Apps Script project and replace only `Code.gs` with the new integrated content. Preserve unrelated files and all script properties. If you also pasted a separate older Office Review add-on containing duplicate functions, remove that duplicate.
4. Save, then use **Deploy → Manage deployments → Edit → New version → Deploy**, keeping the current `/exec` URL. **Do not run `setupPortal()` or `setPortalSecurityCodes()`.**
5. Log into the portal as Administrator, choose **Office Analytics → Load verified trends**. Select 6, 12 or 24 months.
6. Click **Capture current-cycle snapshot**, then click again to confirm. Check that the new `Compliance_Snapshots` tab is created in the **existing** spreadsheet.
7. Reload trends. The current month shows a dated as-of percentage; older months with no captured denominator show only recorded final submissions, with compliance marked **Not available**.

### Important interpretation and testing

- **Snapshot percent** is the percentage when the snapshot was taken, **not necessarily the end-of-month value**. A new capture later in the month can update the latest shown point, but previous captures stay in the same tab.
- Historic submission event counts are **distinct recorded final report/office outcomes**; they cannot by themselves tell how many reports should have been submitted that month.
- The historical record may not include every older obligation or offline submission. Never relabel these data as certified month-end compliance.
- Only logged-in Administrator sessions can read or capture these history data; backend enforcement is required. Public and office-only accounts cannot call these endpoints successfully.
- Verify one known month against the `Submissions` sheet, one month without a snapshot, and one current-cycle snapshot. Also verify normal uploading, removal, login, and archive actions still work.
- No background capture trigger or automatic emails are enabled in this upgrade.



---

## V17.7.76 — Check backend readiness (no data changes)

The GitHub frontend now includes **Office Analytics → System readiness → Check backend**, visible to recognized administrators. This checks five capabilities using **read requests only**:

- Current portal dashboard connection.
- Current-cycle Office Review loading.
- Current-cycle administrator review audit history.
- Compliance trend retrieval.
- Earlier-cycle historical archive listing.

Each result clearly shows **passed** or **unavailable / access denied**. The check does **not** submit or remove PDFs, send reminder emails, capture compliance snapshots, save review remarks, edit records, or change security settings. It also does not establish that those write functions are working: perform separately authorized functional tests.

### Easy test

1. Open the live portal after GitHub Pages refreshes.
2. Log in as Administrator and select **Office Analytics**.
3. Select **Check backend** under **System readiness**.
4. Review all five results. If Review, Audit, or Trends fails, confirm that the **V17.7.75 integrated Apps Script backend** was deployed to a new version of the **existing** web app.
5. If **Historical archive** fails, note that the prepared V17.7.75 integrated backend may lack the separate `adminArchiveList` route. Do not declare archive operational without deploying and testing a compatible backend archive implementation. Preserve the existing database and authentication settings when fixing it.
6. Test a small authorized PDF upload and normal office login separately: these are intentionally **not** exercised by this read-only checker.

No new Sheet, script deployment, or scheduled trigger is needed for this **frontend-only** update. Do not rerun `setupPortal()` or `setPortalSecurityCodes()`.



---

## V17.7.77 — Historical Archive Backend Completed (deployment required)

The historical archive frontend now has a matching private Apps Script backend in the **complete integrated file** `ADGB_Code_gs_V17_7_77_Integrated.txt`, supplied in the accompanying ChatGPT conversation. This full file builds on the V17.7.75 integrated backend. **It is intentionally not committed to this public GitHub repository.**

The two routes are:

- `adminArchiveList` — administrator-only list for an earlier reporting month. Reads the existing `Submissions` event log and returns only the **final recorded status per office/report**. Never includes a Drive file ID or an unrestricted Drive URL.
- `adminArchiveView` — administrator-only PDF lookup for a precise historical cycle and current final submission ID. Rejects removed reports, physical-only receipts without PDFs, missing/trashed files, non-PDFs, and files exceeding the established viewer limit. Returns a **temporary, single-use, approximately 90-second** secure-viewer link using the portal's existing PDF viewer.

### Easy installation

1. Back up the existing Apps Script `Code.gs` and existing portal spreadsheet.
2. Open the existing Apps Script project. If its Code.gs is the previously issued **V17.7.75 integrated backend**, replace that file's contents with the complete **V17.7.77 integrated backend**. If the live project has independent changes, merge those changes instead of overwriting.
3. If an older separate Office Review add-on duplicates functions already incorporated in Code.gs, remove only that duplicate; leave unrelated project files untouched.
4. Save, then **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the existing deployment and `/exec` URL.
5. Do **not** run `setupPortal()` or `setPortalSecurityCodes()`.

### Acceptance tests

Sign in as Head Office Administrator. Open **Historical Archive**, choose an earlier month, and select **Load archive**. Check that (a) the rows agree with the final status in the Submissions log, (b) PDF View opens only for a currently recorded submitted PDF, and (c) old/removed/physical-only/trashed files cannot be viewed. Try the same operations without an ADMIN login and verify they are rejected. Recheck new report uploads, Office Reviews, audit history, and compliance trends. The **System readiness** check can be run as an additional **read-only** confirmation.

**Limitations:** Old rows missing a trustworthy reporting month cannot always be reconstructed; the archive does not enumerate all replacement events, only the latest state of each office/report for that month. Viewing a PDF never makes the Drive file public. A short-lived viewer URL is still a bearer secret; do not share it. The backend files were syntax checked and tested using mocked APIs, but **real Apps Script authorization, Drive access and deployment are not verified until these acceptance tests pass**.



---

## V17.7.78 — Prevent false-positive System Readiness results

The administrator-only **Office Analytics → System readiness → Check backend** now verifies each endpoint's **expected response structure**, not merely an `ok: true` flag.

- Office Reviews must return an array of review records with office identifiers.
- Audit History must return a record array.
- Compliance Trends must return a record array with valid cycle keys.
- Historical Archive must return the records for the **requested prior month**.
- The dashboard connection must have completed successfully.

A result can be **Unavailable** if the Apps Script deployment is older, the administrator login expired, or a route responds without the expected schema. Failed checks do **not** imply data loss. These are strictly read-only checks and do not prove actual upload, save, email or PDF-viewing functionality.

**Upgrade:** V17.7.78 is a GitHub frontend-only change. No new spreadsheet, trigger or Apps Script redeployment is required solely for the checker. The complete integrated **V17.7.77** backend remains the required baseline for all five capabilities. Deploy and test it separately if your live backend is older.



---

## V17.7.79 — One-click office pending report drill-down

In **Office Analytics**, each office's compliance card now has a **View N pending reports** button. It opens the existing **Submission Register** already filtered to that specific office and **Pending**, with the search box cleared. It preserves all existing dashboard data and permissions, and does not create, edit, remove, or submit reports.

Pending items in that register now sort by action priority: **overdue first**, then **due today**, then other dated pending items, then pending reports needing date review or without a due date. No deadline is invented for a report with no configured deadline.

**How to check:** Open the portal, select Office Analytics, click **View pending reports** for CE(B), CE(HAL), SE&PD, SE(Mysore), or SE(Hubli). Confirm the Submission Register opens for the selected office, displays only its pending items, and puts overdue items first. For an office with zero pending reports, the action is disabled. On mobile, the button uses the card width.

**Deployment:** GitHub frontend-only. No new Apps Script version, spreadsheet, or backend route required. This code was checked for JavaScript syntax, but live browser acceptance testing is still needed.



---

## V17.7.80 — Consolidated Action Required view

The frontend adds a **⚑ Action Required** item in both navigation areas. It opens a **single current-cycle pending-report register across all five offices**, based on the portal's existing verified submission statuses.

The new view displays an all-offices pending summary and supports these filters:

- **Office:** all offices or CE(B), CE(HAL), SE&PD, SE(Mysore), SE(Hubli).
- **Priority:** all pending, overdue, due today, upcoming dated deadline, verify deadline, or no deadline.
- **Search:** report subject, reporting type, or office.

Rows are sorted automatically: **overdue first → due today → upcoming deadline → verify date → no deadline**. Within a priority, dated items come first. **No deadline is invented when none has been recorded**.

Only recognized administrators see **Print action list (admin)**. It prints exactly the current filtered rows, with reporting-cycle date, office and priority, using the portal's existing secure print region. The view itself follows the portal's existing dashboard access policy. It does not grant access to hidden data or create any new backend route.

### Quick check

1. Open the Report Portal and choose **⚑ Action Required** from either navigation area.
2. Confirm the pending total, overdue count and due-today count match the current Submission Register.
3. Filter an office, change the priority, and search a known report name. The table should immediately update.
4. If logged in as Administrator, choose **Print action list (admin)** and verify that the printout contains only matching rows.
5. Open and close **Submission Register**, **Office Analytics**, and **Historical Archive** to confirm the panels do not overlap.

**Deployment:** GitHub frontend only. No new spreadsheet, Apps Script code, trigger or Drive change. JavaScript syntax was checked on the committed source; live browser acceptance testing is still required.


---

## V17.7.81 — Office Scorecard & Scheduled Moving Notice Board

The GitHub frontend includes a ranked five-office comparison scorecard in **Office Analytics**, and a moving red-text notice banner on a pale-yellow background at the top of the dashboard. The scorecard ranks offices with active expected reports by **highest completion percentage, fewer overdue items, then fewer pending items**. Exact ties share the same rank; zero-obligation offices show no rank. These rankings reflect only the **current** reporting cycle.

### Administrator notices and targeted pending information

The new **Office Analytics → Moving Notice Board — Administrator** manager allows up to **12** scheduled notices. The administrator can specify notice text (up to 220 characters), whether it is enabled, display start/end in **Asia/Kolkata (IST)**, and the audience: Everyone permitted to view the portal or one of the five offices. Administrators can edit/delete existing notices; deleting uses confirmation.

A separate **Include live office-wise pending counts** toggle and five checkboxes permit the administrator to select which offices' pending totals run in the moving strip. Each authenticated **OFFICE** account receives only its own permitted office count and targeted messages; an **ADMIN** account may receive counts for all selected offices. VIEWER and guest sessions never receive office-specific counts or private targeted notices. Only server-authorized notices are delivered; the browser does not determine its own permissions.

The strip has a **Pause/Resume** button and respects reduced-motion accessibility preferences. Counts are calculated from the *currently loaded* status register, not from guesswork.

### Deployment (backend REQUIRED for notices)

1. Back up your existing live Google Apps Script `Code.gs` and database spreadsheet.
2. Use the complete private backend file **ADGB_Code_gs_V17_7_81_Integrated.txt** from the accompanying ChatGPT response. It is based on **V17.7.77**. **If your live backend has separate new changes, merge rather than overwrite.**
3. In the **same existing Apps Script project**, replace Code.gs with the complete integrated code. Remove only any older separately pasted add-on that duplicates functions included in the integrated file.
4. Save, then **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the original `/exec` URL.
5. **Do not run** `setupPortal()` or `setPortalSecurityCodes()`.
6. Refresh the Portal, log in as Administrator and open **Office Analytics**. The scorecard itself is frontend-only.
7. Under **Moving Notice Board — Administrator**, select **Load notices and settings**. Create a test notice scheduled for the current time, choose an office audience, and save. It appears near the top of the dashboard for the authorized audience.
8. Activate pending-display settings if desired, save, and test by signing in separately as two different office accounts. Neither should see another office's *targeted* notices or pending counts. Verify guest and VIEWER accounts do not see office-specific counts.
9. Test expiration, pause/resume, notice edits and deletes. Also verify normal submissions, archive view, user login, review/audit and compliance trends.

### Storage and limits

- Notice configuration uses **existing Apps Script Script Properties** key `ADGB_NOTICE_CONFIG_V1` (not a new spreadsheet, tab or Drive file).
- New backend routes: GET `action=noticeBoard` (audience-filtered read), POST `action=adminNoticeBoardManage` (server-authorized list/save/delete/settings).
- Administrator changes require an active **ADMIN session**, not a public office PIN. Office and guest sessions cannot administer notices.
- **Everyone** announcements may be visible to the public when the portal is configured for PUBLIC_VIEW. Do not include confidential or personnel-specific information in general notices.
- The frontend may briefly show no notices before the new backend has been deployed or when login is unavailable; it never invents announcements.
- The moving pending counts are a live awareness aid and are not a certified historical compliance report.

The integrated backend passed JavaScript syntax and isolated access/scheduling tests. The GitHub frontend passed JavaScript syntax validation. **Live Google Apps Script deployment and browser acceptance remain pending.** Avoid committing the private integrated Code.gs to this public repository.



---

## V17.7.82 — Administrator controls moving notice speed

In **Office Analytics → Moving Notice Board — Administrator**, load the existing notices/settings and use the new **Moving text speed** slider, with values **1 (slowest) to 10 (fastest)**. The default is **5 (normal)**. The slider previews the speed immediately on the current administrator's banner; select **Save pending-display settings** to persist the speed for other viewers and subsequent sessions.

The speed controls the complete moving notice strip, including scheduled announcements and the viewer's permitted office-wise pending counts. The backend stores `scrollSpeed` alongside existing notice configuration in the same `ADGB_NOTICE_CONFIG_V1` Script Properties record. Older saved notice settings without this field default to speed 5. The server validates the saved speed as a whole number from 1 to 10 and requires an authenticated Administrator session to modify it.

**Deployment required:** Download the privately supplied **ADGB_Code_gs_V17_7_82_Integrated.txt** file and follow the accompanying easy guide. It is a complete Code.gs replacement based on the previous **V17.7.81** integrated backend, so first back up your current Apps Script project and merge any additional live changes rather than overwriting them. Save, then update the **existing web-app deployment** with a new version. Do not run `setupPortal()` or `setPortalSecurityCodes()`.

**Test:** Save speed 2, reload settings and confirm 2 remains; then try speed 9 and compare the banner movement on both desktop and mobile. The pause control still works. A viewer with a reduced-motion preference may see no animation regardless of speed. No spreadsheet, Sheet tab, trigger or Drive change is needed.

