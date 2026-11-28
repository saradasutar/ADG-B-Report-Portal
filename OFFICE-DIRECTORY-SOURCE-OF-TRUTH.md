# Office Directory — Single Source of Truth

## Rule
The Office Directory Manager is the authoritative source for parent-office names, office names, permanent office IDs, controlling-office relationships, active/inactive status and display order.

## Consumer pages
- `office-directory.html`: administrator interface to maintain the directory.
- `8cpc.html`: for administrators, loads the live directory through the authenticated `ipDirectoryBootstrap` action and derives parent-office names and active sub-office choices from it. It does not maintain a separate hard-coded CE(HAL) or CE(B) list.
- `information-projects.html`: loads the same authenticated master directory and renders reporting streams and office cards dynamically. It displays a clear sync error instead of silently showing a stale manually maintained list.

## Change procedure
1. Add, rename, transfer, reorder or deactivate an office only in Office Directory Manager.
2. Do not hard-code office names or sub-office arrays in project landing pages, 8th CPC forms, access-control selectors, reports or print templates.
3. Consumer pages must obtain directory data from `ipDirectoryBootstrap` (or a documented versioned directory API) and filter active offices by `parentOfficeId`.
4. Preserve permanent Office IDs when renaming an office. A transfer must use the directory's transfer workflow; do not simulate it by changing labels.
5. If the master directory cannot be loaded, show an explicit error or a clearly identified backend fallback. Never silently replace it with a stale local list.
6. After changes, verify Office Directory Manager, Information Projects, 8th CPC entry dropdowns, Access Control, parent-office review and compiled/printed reports.

## Data integrity
- Historical submissions retain the Office ID and office-name snapshot stored with the submission.
- Renaming an office changes its current display name; it must not rewrite historical records unless an administrator explicitly requests a separate migration.
- Main-office own-data reporting units must be represented as explicit active directory entries when they are intended to submit independently.
- Consolidation must include only records accepted by the applicable verification workflow and must avoid counting the same reporting unit twice.

## Deployment note
The two GitHub Pages consumer updates are deployed by GitHub Pages automatically. Any change to backend directory actions or Google Apps Script storage requires a separate Apps Script deployment.
