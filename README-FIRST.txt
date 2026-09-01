ADG(B) REPORT SUBMISSION PORTAL — V17.2 SECURITY TIMEOUT

NEW ADMINISTRATOR PATH
Administration → Security Settings

ADMIN CAN SELECT
5 / 10 / 15 / 20 / 30 minutes

DEFAULT
30 minutes

BEHAVIOUR
- One-minute warning before automatic sign-out.
- "Stay signed in" button immediately resets the timer.
- "Sign out now" button available in the warning.
- Genuine activity resets the timer:
  click / pointer / keyboard / touch / scroll.
- Setting applies to every username/password user.
- Public View has no login timeout because there is no signed-in session.
- Backend session has only a maximum five-minute safety grace beyond the
  selected idle timeout if the browser timer is suspended.
- Browser/tab session token remains in sessionStorage, so closing the tab
  does not preserve a login for reopening.

EXISTING FEATURES RETAINED
- Public View / Login Required / Admin Only modes.
- Concerned-office credential protection for public office actions.
- Fast Data Engine.
- Turbo login.
- Raw Data.
- Target / Reminder.
- User permissions.
- Favicon and premium colourful UI.

GITHUB — upload these files to repository root
index.html
portal-v172.js
sticky-v172.js
adgb-v172.svg
adgb-v172.png
adgb-v172.ico

APPS SCRIPT
Replace Code.gs.
Save.
Deploy → Manage deployments → Edit → New version → Deploy.

DO NOT run setupPortal().
DO NOT run setPortalSecurityCodes().

EXPECTED
FE v17.2 | BE v17.2
