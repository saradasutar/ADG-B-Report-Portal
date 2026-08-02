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

