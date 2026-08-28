(() => {
  'use strict';

  const RAW_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzDXfkgXAd5WMHErA-qHn4ZMcQV-Irx4Yeg-HNgZJKKJ-RpNcAiDbpyJx_4uyJvKwIzxg/exec';

  const RAW_FRONTEND_VERSION = '15.14';


  /* =====================================================================
   * V15.12 LOGIN + USER MANAGEMENT
   * ===================================================================== */
  const AUTH_TOKEN_KEY = 'adgbPortalSessionTokenV1512';
  const AUTH_USERNAME_KEY = 'adgbPortalRememberedUsernameV1512';
  const AUTH_IDLE_MS = 10 * 60 * 1000;

  const authState = {
    token: sessionStorage.getItem(AUTH_TOKEN_KEY) || '',
    user: null,
    idleTimer: null,
    pendingOfficeId: '',
    users: [],
    editingUserId: '',
    backendVersion: 'checking…'
  };

  window.ADGB_AUTH = {
    get token() { return authState.token; },
    get user() { return authState.user; },
    get role() { return authState.user?.role || ''; },
    get officeId() { return authState.user?.officeId || ''; },
    get permissions() { return authState.user?.permissions || {}; },
    get isAdmin() { return authState.user?.role === 'ADMIN'; },
    get isViewer() { return authState.user?.role === 'VIEWER'; },
    can(permission) {
      if (authState.user?.role === 'ADMIN') return true;
      if (
        permission === 'stickyView' &&
        authState.user?.permissions?.stickyManage === true
      ) return true;
      return authState.user?.permissions?.[permission] === true;
    },
    credentialFor(officeId, permission) {
      if (!authState.token || !authState.user) return '';
      if (authState.user.role === 'ADMIN') return 'SESSION:' + authState.token;
      if (permission && !this.can(permission)) return '';
      if (this.can('allOffices')) return 'SESSION:' + authState.token;
      if (
        authState.user.officeId === String(officeId || '').toUpperCase()
      ) {
        return 'SESSION:' + authState.token;
      }
      return '';
    },
    legacyCredentialFor(officeId) {
      if (!authState.token || !authState.user) return '';
      if (authState.user.role === 'ADMIN') return 'SESSION:' + authState.token;
      if (
        authState.user.role === 'OFFICE' &&
        authState.user.officeId === String(officeId || '').toUpperCase()
      ) {
        return 'SESSION:' + authState.token;
      }
      return '';
    }
  };

  // Hide the portal immediately until the session is verified.
  document.documentElement.classList.add('adgb-auth-locking');

  function injectAuthStyles() {
    if (document.getElementById('adgbAuthStyles')) return;

    const style = document.createElement('style');
    style.id = 'adgbAuthStyles';
    style.textContent = `
      html.adgb-auth-locking body > :not(#adgbAuthRoot){visibility:hidden!important}
      #adgbAuthRoot{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:20px;background:
        radial-gradient(circle at 15% 18%,rgba(14,165,233,.18),transparent 27%),
        radial-gradient(circle at 84% 78%,rgba(15,118,110,.18),transparent 30%),
        linear-gradient(135deg,#e8f4f8,#f8fbfd 48%,#edf8f4)}
      #adgbAuthRoot[hidden]{display:none!important}
      .adgb-login-shell{width:min(920px,100%);min-height:520px;display:grid;grid-template-columns:1.05fr .95fr;overflow:hidden;border:1px solid #cddde7;border-radius:26px;background:#fff;box-shadow:0 30px 90px rgba(8,47,73,.22)}
      .adgb-login-brand{position:relative;overflow:hidden;padding:58px;display:flex;flex-direction:column;justify-content:center;color:#fff;background:linear-gradient(145deg,#073a5b,#075985 50%,#0f766e)}
      .adgb-login-brand::after{content:"";position:absolute;width:310px;height:310px;border-radius:50%;right:-130px;top:-120px;background:rgba(103,232,249,.18)}
      .adgb-login-mark{width:64px;height:64px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.35);border-radius:20px;background:rgba(255,255,255,.11);font:900 14px Arial;margin-bottom:34px}
      .adgb-login-brand small{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#bae6fd}
      .adgb-login-brand h1{position:relative;z-index:1;margin:10px 0 18px;font-family:Georgia,serif;font-size:42px;line-height:1.08}
      .adgb-login-brand p{position:relative;z-index:1;margin:0;max-width:450px;color:#d8eff8;font-size:14px;line-height:1.65}
      .adgb-login-panel{padding:54px;display:flex;align-items:center;background:linear-gradient(160deg,#fff,#f7fbfd)}
      .adgb-login-form{width:100%}
      .adgb-login-form .kicker{color:#087f70;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      .adgb-login-form h2{margin:8px 0 7px;color:#123b55;font-family:Georgia,serif;font-size:34px}
      .adgb-login-form>p{margin:0 0 26px;color:#677c89;font-size:13px;line-height:1.55}
      .adgb-auth-field{display:grid;gap:7px;margin:15px 0}
      .adgb-auth-field span{color:#36566a;font-size:11px;font-weight:850}
      .adgb-auth-field input,.adgb-auth-field select{width:100%;height:48px;border:1px solid #cadbe5;border-radius:12px;padding:0 13px;background:#fff;color:#17394f;outline:0}
      .adgb-auth-field input:focus,.adgb-auth-field select:focus{border-color:#0ea5e9;box-shadow:0 0 0 4px rgba(14,165,233,.11)}
      .adgb-password-wrap{position:relative}.adgb-password-wrap input{padding-right:68px}.adgb-password-wrap button{position:absolute;right:7px;top:7px;height:34px;border:0;border-radius:8px;padding:0 10px;background:#edf5f8;color:#075985;font-size:10px;font-weight:900}
      .adgb-remember{display:flex;align-items:center;gap:8px;margin:12px 0 5px;color:#607785;font-size:11px}.adgb-remember input{width:15px;height:15px}
      .adgb-auth-error{min-height:20px;margin:7px 0;color:#b91c1c;font-size:11px;font-weight:800}
      .adgb-login-submit{width:100%;height:50px;border:0;border-radius:12px;background:linear-gradient(135deg,#075985,#0f766e);color:#fff;font-weight:900;box-shadow:0 10px 24px rgba(7,89,133,.2)}
      .adgb-login-version{margin-top:14px;display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;color:#79909d;font-size:9px;font-weight:800}
      .adgb-version-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border:1px solid #c7dbe7;border-radius:999px;background:#f5fafc;color:#456577;font-size:9px;font-weight:900}
      .adgb-version-chip strong{color:#075985}
      .adgb-login-secondary{display:flex;justify-content:center;margin-top:9px}
      .adgb-cache-clear{min-height:34px;border:1px solid #d5e1e8;border-radius:10px;padding:0 12px;background:#fff;color:#4b6473;font-size:9px;font-weight:900}
      .adgb-cache-clear:hover{background:#f4f9fb;border-color:#aac9d9}
      .adgb-inside-version{display:flex;align-items:center;gap:4px;padding:0 4px}
      .adgb-inside-version .adgb-version-chip{padding:4px 7px;font-size:8px}
      .adgb-user-bar{position:fixed;right:14px;top:72px;z-index:85;display:flex;align-items:center;gap:6px;padding:5px;border:1px solid #cbdbe5;border-radius:999px;background:rgba(255,255,255,.95);box-shadow:0 7px 20px rgba(30,64,90,.13);backdrop-filter:blur(8px)}
      .adgb-user-bar[hidden]{display:none!important}
      .adgb-user-chip{display:flex;align-items:center;gap:7px;padding:3px 8px 3px 4px}.adgb-user-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#0f766e;color:#fff;font-size:10px;font-weight:900}
      .adgb-user-copy{display:grid;line-height:1.05}.adgb-user-copy strong{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#17394f;font-size:10px}.adgb-user-copy small{margin-top:3px;color:#6d8290;font-size:8px}
      .adgb-user-action{height:31px;border:1px solid #d3e0e8;border-radius:999px;padding:0 10px;background:#fff;color:#275064;font-size:9px;font-weight:900}.adgb-user-action.manage{color:#51408b;border-color:#c9bbe3;background:#faf7ff}.adgb-user-action.logout{color:#9b2532;border-color:#e7b5bb;background:#fff7f8}
      .adgb-user-modal{position:fixed;inset:0;z-index:20100;display:grid;place-items:center;padding:18px;background:rgba(6,30,46,.72)}
      .adgb-user-modal[hidden]{display:none!important}
      .adgb-user-sheet{width:min(950px,100%);max-height:calc(100vh - 36px);overflow:auto;border-radius:18px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.3)}
      .adgb-user-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid #dce6ec;background:linear-gradient(110deg,#edf7ff,#f3ebff,#edf9f4)}
      .adgb-user-head h2{margin:0;color:#183f58;font-family:Georgia,serif;font-size:23px}.adgb-user-head p{margin:3px 0 0;color:#657b89;font-size:10px}
      .adgb-user-close{width:34px;height:34px;border:0;border-radius:50%;background:#fff;color:#345366;font-size:20px}
      .adgb-user-body{padding:14px}
      .adgb-user-form{display:grid;grid-template-columns:1.2fr 1.4fr .9fr 1.1fr 1.2fr auto;gap:8px;align-items:end;padding:12px;border:1px solid #d7e3ea;border-radius:12px;background:#f9fcfd}
      .adgb-user-form label{display:grid;gap:4px;color:#526b79;font-size:9px;font-weight:850}.adgb-user-form input,.adgb-user-form select{height:36px;border:1px solid #cbdbe5;border-radius:8px;padding:0 9px;background:#fff;font-size:10px}
      .adgb-user-form button{height:36px;border:0;border-radius:8px;padding:0 12px;background:#075985;color:#fff;font-size:10px;font-weight:900}
      .adgb-user-form .cancel-edit{border:1px solid #cbdbe5;background:#fff;color:#355468}
      .adgb-user-help{grid-column:1/-1;margin:0;color:#6b7f8b;font-size:9px}
      .adgb-user-error{grid-column:1/-1;min-height:16px;color:#b91c1c;font-size:10px;font-weight:800}
      .adgb-permissions{grid-column:1/-1;padding:10px;border:1px solid #d8e3ea;border-radius:10px;background:#fff}
      .adgb-permissions>strong{display:block;margin-bottom:7px;color:#294e63;font-size:10px}
      .adgb-permission-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      .adgb-permission-grid label{display:flex;align-items:center;gap:6px;min-height:31px;padding:5px 7px;border:1px solid #e0e8ed;border-radius:8px;background:#f9fcfd;color:#486473;font-size:9px;font-weight:800}
      .adgb-permission-grid input{width:14px!important;height:14px!important}
      .adgb-user-list{margin-top:12px;display:grid;gap:7px}
      .adgb-user-row{display:grid;grid-template-columns:minmax(160px,1.25fr) minmax(120px,1fr) 100px 130px 90px auto;gap:8px;align-items:center;padding:9px 10px;border:1px solid #dce6ec;border-radius:10px;background:#fff}
      .adgb-user-row:nth-child(even){background:#f8fbfd}.adgb-user-row strong{font-size:11px;color:#17394f}.adgb-user-row small{display:block;margin-top:2px;color:#718590;font-size:8px}.adgb-user-role{font-size:9px;font-weight:900;color:#4d438a}.adgb-user-status{font-size:9px;font-weight:900}.adgb-user-status.active{color:#08744f}.adgb-user-status.inactive{color:#b42318}
      .adgb-user-row button{height:29px;border:1px solid #cbdbe5;border-radius:7px;padding:0 8px;background:#fff;color:#31546a;font-size:8.5px;font-weight:900}.adgb-user-row button.delete{color:#a41414;border-color:#e3a7a7;background:#fff6f6}
      .adgb-auth-hidden-code{display:none!important}
      .adgb-role-blocked{opacity:.42!important;cursor:not-allowed!important;filter:grayscale(.45)}
      @media(max-width:760px){
        .adgb-login-shell{grid-template-columns:1fr;min-height:0}.adgb-login-brand{display:none}.adgb-login-panel{padding:32px 22px}.adgb-user-bar{top:66px;right:8px;max-width:calc(100vw - 16px)}.adgb-user-copy strong{max-width:95px}.adgb-user-action{padding:0 8px}
        .adgb-user-form{grid-template-columns:1fr 1fr}.adgb-permission-grid{grid-template-columns:1fr 1fr}.adgb-user-form button{width:100%}.adgb-user-row{grid-template-columns:1fr 1fr}.adgb-user-row>*:last-child{grid-column:1/-1}
      }
    `;
    document.head.appendChild(style);
  }

  function injectAuthMarkup() {
    if (document.getElementById('adgbAuthRoot')) return;

    const root = document.createElement('div');
    root.id = 'adgbAuthRoot';
    root.innerHTML = `
      <div class="adgb-login-shell">
        <section class="adgb-login-brand">
          <div class="adgb-login-mark">CPWD</div>
          <small>Government of India · CPWD Bengaluru</small>
          <h1>ADG(B) Report<br>Submission Portal</h1>
          <p>Secure access for Head Office, sub-offices and authorised viewers. Your permissions are applied automatically after sign-in.</p>
        </section>
        <section class="adgb-login-panel">
          <form class="adgb-login-form" id="adgbLoginForm">
            <span class="kicker">Secure access</span>
            <h2>Welcome</h2>
            <p>Enter the username and password assigned by the Administrator.</p>
            <label class="adgb-auth-field"><span>Username</span><input id="adgbLoginUsername" type="text" autocomplete="username" required placeholder="Enter username"></label>
            <label class="adgb-auth-field"><span>Password</span><div class="adgb-password-wrap"><input id="adgbLoginPassword" type="password" autocomplete="current-password" required placeholder="Enter password"><button id="adgbShowPassword" type="button">Show</button></div></label>
            <label class="adgb-remember"><input id="adgbRememberUsername" type="checkbox"> Remember username on this device</label>
            <div class="adgb-auth-error" id="adgbLoginError"></div>
            <button class="adgb-login-submit" id="adgbLoginSubmit" type="submit">Sign in</button>
            <div class="adgb-login-version">
              <span class="adgb-version-chip">FE <strong id="adgbLoginFeVersion">v15.14</strong></span>
              <span class="adgb-version-chip">BE <strong id="adgbLoginBeVersion">checking…</strong></span>
            </div>
            <div class="adgb-login-secondary">
              <button class="adgb-cache-clear" id="adgbClearPortalCache" type="button">↻ Clear portal cache</button>
            </div>
          </form>
        </section>
      </div>
    `;

    const userBar = document.createElement('div');
    userBar.id = 'adgbUserBar';
    userBar.className = 'adgb-user-bar';
    userBar.hidden = true;
    userBar.innerHTML = `
      <div class="adgb-user-chip">
        <span class="adgb-user-avatar" id="adgbUserAvatar">U</span>
        <span class="adgb-user-copy"><strong id="adgbUserName">User</strong><small id="adgbUserRole">Signed in</small></span>
      </div>
      <div class="adgb-inside-version">
        <span class="adgb-version-chip">FE <strong>v15.14</strong></span>
        <span class="adgb-version-chip">BE <strong id="adgbInsideBeVersion">checking…</strong></span>
      </div>
      <button class="adgb-user-action manage" id="adgbManageUsers" type="button" hidden>Users</button>
      <button class="adgb-user-action logout" id="adgbLogout" type="button">Sign out</button>
    `;

    const usersModal = document.createElement('div');
    usersModal.id = 'adgbUsersModal';
    usersModal.className = 'adgb-user-modal';
    usersModal.hidden = true;
    usersModal.innerHTML = `
      <section class="adgb-user-sheet" role="dialog" aria-modal="true" aria-labelledby="adgbUsersTitle">
        <header class="adgb-user-head">
          <div><h2 id="adgbUsersTitle">Manage portal users</h2><p>Administrator can create users and change username, password, role, office or account status.</p></div>
          <button class="adgb-user-close" id="adgbUsersClose" type="button">×</button>
        </header>
        <div class="adgb-user-body">
          <form class="adgb-user-form" id="adgbUserForm">
            <label><span>Username</span><input id="adgbUserUsername" maxlength="40" required placeholder="username"></label>
            <label><span>Display name</span><input id="adgbUserDisplayName" maxlength="80" required placeholder="Name / Office"></label>
            <label><span>Role</span><select id="adgbUserRoleSelect"><option value="VIEWER">Viewer / Other</option><option value="OFFICE">Office</option><option value="ADMIN">Admin</option></select></label>
            <label id="adgbUserOfficeField"><span>Office</span><select id="adgbUserOffice"><option value="">Select office</option><option value="HEAD_OFFICE">O/o ADG(B)</option><option value="CEB">CE(B)</option><option value="CEHAL">CE(HAL)</option><option value="SEPD">SE&PD</option><option value="SEMYSORE">SE(Mysore)</option><option value="SEHUBLI">SE(Hubli)</option></select></label>
            <label><span>Password</span><input id="adgbUserPassword" type="password" minlength="6" placeholder="New user: required"></label>
            <button id="adgbUserSave" type="submit">Add user</button>
            <label style="display:flex;align-items:center;gap:6px;grid-column:1/2"><input id="adgbUserActive" type="checkbox" checked style="width:auto;height:auto"> Active</label>
            <button class="cancel-edit" id="adgbUserCancelEdit" type="button" hidden>Cancel edit</button>
            <div class="adgb-permissions">
              <strong>Permissions controlled by Administrator</strong>
              <div class="adgb-permission-grid">
                <label><input type="checkbox" data-auth-permission="reportUpload"> Upload / replace reports</label>
                <label><input type="checkbox" data-auth-permission="reportViewFile"> Open submitted PDFs</label>
                <label><input type="checkbox" data-auth-permission="reportRemove"> Remove own reports</label>
                <label><input type="checkbox" data-auth-permission="rawEdit"> Edit Raw Data values</label>
                <label><input type="checkbox" data-auth-permission="subjectManage"> Manage report subjects</label>
                <label><input type="checkbox" data-auth-permission="rawStructureManage"> Manage Raw Data rows</label>
                <label><input type="checkbox" data-auth-permission="stickyView"> View Target / Reminder</label>
                <label><input type="checkbox" data-auth-permission="stickyManage"> Manage Target / Reminder</label>
                <label><input type="checkbox" data-auth-permission="allOffices"> Allow actions for all offices</label>
              </div>
            </div>
            <p class="adgb-user-help">All users can view the complete dashboard. Office action permissions apply only to the assigned office unless “Allow actions for all offices” is enabled. When editing an existing user, leave Password blank to keep the current password.</p>
            <div class="adgb-user-error" id="adgbUserError"></div>
          </form>
          <div class="adgb-user-list" id="adgbUserList"></div>
        </div>
      </section>
    `;

    document.body.append(root, userBar, usersModal);

    const remembered = localStorage.getItem(AUTH_USERNAME_KEY) || '';
    document.getElementById('adgbLoginUsername').value = remembered;
    document.getElementById('adgbRememberUsername').checked = Boolean(remembered);

    document.getElementById('adgbLoginForm').addEventListener('submit', handlePortalLogin);
    document.getElementById('adgbShowPassword').addEventListener('click', toggleLoginPassword);
    document.getElementById('adgbClearPortalCache').addEventListener('click', clearPortalCache);
    document.getElementById('adgbLogout').addEventListener('click', () => logoutPortal(true));
    document.getElementById('adgbManageUsers').addEventListener('click', openUserManager);
    document.getElementById('adgbUsersClose').addEventListener('click', closeUserManager);
    document.getElementById('adgbUserForm').addEventListener('submit', saveManagedUser);
    document.getElementById('adgbUserCancelEdit').addEventListener('click', resetUserEditor);
    document.getElementById('adgbUserRoleSelect').addEventListener('change', updateUserOfficeField);
    document.getElementById('adgbUserList').addEventListener('click', handleUserListAction);
    usersModal.addEventListener('mousedown', event => {
      if (event.target === usersModal) closeUserManager();
    });

    // Capture the office before the existing portal handler opens its modal.
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-upload]');
      if (button) authState.pendingOfficeId = String(button.dataset.office || '').toUpperCase();
    }, true);

    observeExistingPortalModals();
  }

  function authPost(action, data = {}) {
    return new Promise((resolve, reject) => {
      const requestNonce = rawNonce();
      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const field = document.createElement('textarea');

      frame.name = 'adgbAuthFrame_' + requestNonce.replace(/[^A-Za-z0-9]/g, '');
      frame.style.display = 'none';
      form.method = 'POST';
      form.action = RAW_SCRIPT_URL;
      form.target = frame.name;
      form.style.display = 'none';
      field.name = 'payload';
      field.value = JSON.stringify({ action, nonce: requestNonce, ...data });
      form.appendChild(field);

      let finished = false;
      let pollTimer = null;

      const timer = setTimeout(() => {
        finish(new Error('The login request could not be confirmed.'));
      }, 45000);

      function finish(error, result) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (pollTimer) clearTimeout(pollTimer);
        window.removeEventListener('message', onMessage);
        setTimeout(() => { form.remove(); frame.remove(); }, 0);
        error ? reject(error) : resolve(result);
      }

      function onMessage(event) {
        const packet = event.data;
        if (
          packet?.source !== 'ADGB_PORTAL' ||
          packet?.data?.nonce !== requestNonce
        ) return;

        const result = packet.data;
        result.ok
          ? finish(null, result)
          : finish(new Error(result.message || 'Request failed.'));
      }

      async function pollReceipt() {
        if (finished) return;
        try {
          const receipt = await rawJsonp('receipt', { nonce: requestNonce });
          if (receipt && !receipt.pending) {
            receipt.ok
              ? finish(null, receipt)
              : finish(new Error(receipt.message || 'Request failed.'));
            return;
          }
        } catch (ignore) {}
        if (!finished) pollTimer = setTimeout(pollReceipt, 1200);
      }

      window.addEventListener('message', onMessage);
      document.body.append(frame, form);
      form.submit();
      pollTimer = setTimeout(pollReceipt, 1000);
    });
  }

  async function initialisePortalAuth() {
    injectAuthStyles();
    injectAuthMarkup();
    loadAuthBackendVersion().catch(() => {});

    if (authState.token) {
      try {
        const result = await authPost('sessionCheck', {
          sessionToken: authState.token
        });
        if (result.backendVersion) setAuthBackendVersion(result.backendVersion);
        setAuthenticatedUser(result.user);
        return;
      } catch (ignore) {
        authState.token = '';
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }

    showLoginPage();
  }

  async function handlePortalLogin(event) {
    event.preventDefault();

    const username = document.getElementById('adgbLoginUsername').value.trim();
    const password = document.getElementById('adgbLoginPassword').value;
    const errorBox = document.getElementById('adgbLoginError');
    const button = document.getElementById('adgbLoginSubmit');

    errorBox.textContent = '';

    if (!username || !password) {
      errorBox.textContent = 'Enter username and password.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Signing in…';

    try {
      const result = await authPost('login', { username, password });

      if (result.backendVersion) setAuthBackendVersion(result.backendVersion);
      authState.token = String(result.token || '');
      sessionStorage.setItem(AUTH_TOKEN_KEY, authState.token);

      if (document.getElementById('adgbRememberUsername').checked) {
        localStorage.setItem(AUTH_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(AUTH_USERNAME_KEY);
      }

      document.getElementById('adgbLoginPassword').value = '';
      setAuthenticatedUser(result.user);

    } catch (error) {
      errorBox.textContent = error.message || 'Sign-in failed.';
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in';
    }
  }

  function setAuthenticatedUser(user) {
    authState.user = user || null;

    if (!authState.user) {
      showLoginPage();
      return;
    }

    document.documentElement.classList.remove('adgb-auth-locking');
    document.getElementById('adgbAuthRoot').hidden = true;

    const userBar = document.getElementById('adgbUserBar');
    userBar.hidden = false;

    const name = authState.user.displayName || authState.user.username || 'User';
    document.getElementById('adgbUserName').textContent = name;
    document.getElementById('adgbUserAvatar').textContent =
      name.trim().charAt(0).toUpperCase() || 'U';

    const officeName = officeNameForAuth(authState.user.officeId);
    document.getElementById('adgbUserRole').textContent =
      authState.user.role === 'ADMIN'
        ? 'Administrator'
        : authState.user.role === 'OFFICE'
          ? (officeName || 'Office user')
          : 'View only';

    document.getElementById('adgbManageUsers').hidden =
      authState.user.role !== 'ADMIN';

    resetIdleLogout();
    bindIdleEvents();
    applyRolePermissions();

    window.dispatchEvent(new CustomEvent('adgb-auth-changed', {
      detail: { user: authState.user }
    }));
  }

  function showLoginPage(message = '') {
    clearTimeout(authState.idleTimer);
    authState.user = null;

    document.documentElement.classList.add('adgb-auth-locking');
    document.getElementById('adgbAuthRoot').hidden = false;
    document.getElementById('adgbUserBar').hidden = true;
    document.getElementById('adgbLoginError').textContent = message;

    setTimeout(() => {
      const input = document.getElementById('adgbLoginUsername');
      if (input && !input.value) input.focus();
      else document.getElementById('adgbLoginPassword')?.focus();
    }, 50);

    window.dispatchEvent(new CustomEvent('adgb-auth-changed', {
      detail: { user: null }
    }));
  }

  async function logoutPortal(showMessage) {
    const token = authState.token;

    authState.token = '';
    authState.user = null;
    sessionStorage.removeItem(AUTH_TOKEN_KEY);

    if (token) {
      authPost('logout', { sessionToken: token }).catch(() => {});
    }

    showLoginPage(showMessage ? 'You have been signed out.' : '');
  }

  function resetIdleLogout() {
    clearTimeout(authState.idleTimer);
    if (!authState.user) return;

    authState.idleTimer = setTimeout(() => {
      logoutPortal(false);
      document.getElementById('adgbLoginError').textContent =
        'Signed out after 10 minutes of inactivity.';
    }, AUTH_IDLE_MS);
  }

  let idleEventsBound = false;
  function bindIdleEvents() {
    if (idleEventsBound) return;
    idleEventsBound = true;

    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(name => {
      window.addEventListener(name, resetIdleLogout, { passive: true });
    });
  }


  function setAuthBackendVersion(version) {
    authState.backendVersion = String(version || 'checking…');

    const loginBe = document.getElementById('adgbLoginBeVersion');
    const insideBe = document.getElementById('adgbInsideBeVersion');

    if (loginBe) loginBe.textContent = 'v' + authState.backendVersion.replace(/^v/i, '');
    if (insideBe) insideBe.textContent = 'v' + authState.backendVersion.replace(/^v/i, '');
  }

  async function loadAuthBackendVersion() {
    try {
      const data = await rawJsonp('ping');
      if (data?.backendVersion) setAuthBackendVersion(data.backendVersion);
    } catch (ignore) {
      const loginBe = document.getElementById('adgbLoginBeVersion');
      const insideBe = document.getElementById('adgbInsideBeVersion');
      if (loginBe) loginBe.textContent = 'offline';
      if (insideBe) insideBe.textContent = 'offline';
    }
  }

  async function clearPortalCache() {
    const button = document.getElementById('adgbClearPortalCache');
    if (button) {
      button.disabled = true;
      button.textContent = 'Clearing…';
    }

    try {
      authState.token = '';
      authState.user = null;

      // Clear only this portal's stored login/layout keys.
      [localStorage, sessionStorage].forEach(storage => {
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (
            key &&
            (
              key.startsWith('adgbPortal') ||
              key.startsWith('adgbReportSticky')
            )
          ) {
            keys.push(key);
          }
        }
        keys.forEach(key => storage.removeItem(key));
      });

      // Remove cached responses belonging to this GitHub Pages repository only.
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          try {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
              if (request.url.includes('/ADG-B-Report-Portal/')) {
                await cache.delete(request);
              }
            }
          } catch (ignore) {}
        }
      }

      // Remove service workers scoped to this repository, if any.
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            if (String(registration.scope || '').includes('/ADG-B-Report-Portal/')) {
              await registration.unregister();
            }
          }
        } catch (ignore) {}
      }

      const url = new URL(window.location.href);
      url.searchParams.set('_fresh', Date.now().toString());
      window.location.replace(url.toString());

    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = '↻ Clear portal cache';
      }
      const box = document.getElementById('adgbLoginError');
      if (box) box.textContent = 'Portal cache could not be fully cleared. Please refresh once.';
    }
  }

  function toggleLoginPassword() {
    const input = document.getElementById('adgbLoginPassword');
    const button = document.getElementById('adgbShowPassword');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? 'Show' : 'Hide';
  }


  function defaultAuthPermissionsForRole(role) {
    role = String(role || '').toUpperCase();

    if (role === 'ADMIN') {
      return {
        reportUpload: true,
        reportViewFile: true,
        reportRemove: true,
        rawEdit: true,
        subjectManage: true,
        rawStructureManage: true,
        stickyView: true,
        stickyManage: true,
        allOffices: true
      };
    }

    if (role === 'OFFICE') {
      return {
        reportUpload: true,
        reportViewFile: true,
        reportRemove: true,
        rawEdit: true,
        subjectManage: false,
        rawStructureManage: false,
        stickyView: false,
        stickyManage: false,
        allOffices: false
      };
    }

    return {
      reportUpload: false,
      reportViewFile: false,
      reportRemove: false,
      rawEdit: false,
      subjectManage: false,
      rawStructureManage: false,
      stickyView: false,
      stickyManage: false,
      allOffices: false
    };
  }

  function authCan(permission) {
    if (!authState.user) return false;
    if (authState.user.role === 'ADMIN') return true;
    return authState.user.permissions?.[permission] === true;
  }

  function authCanForOffice(permission, officeId) {
    if (!authCan(permission)) return false;
    if (authState.user?.role === 'ADMIN') return true;
    if (authCan('allOffices')) return true;

    return (
      String(authState.user?.officeId || '').toUpperCase() ===
      String(officeId || '').toUpperCase()
    );
  }

  function readUserPermissionEditor() {
    const permissions = {};
    document.querySelectorAll('[data-auth-permission]').forEach(input => {
      permissions[input.dataset.authPermission] = input.checked;
    });
    return permissions;
  }

  function writeUserPermissionEditor(permissions, role) {
    const values = {
      ...defaultAuthPermissionsForRole(role),
      ...(permissions || {})
    };

    document.querySelectorAll('[data-auth-permission]').forEach(input => {
      input.checked = values[input.dataset.authPermission] === true;
      input.disabled = String(role || '').toUpperCase() === 'ADMIN';
    });
  }

  function permissionSummary(permissions, role) {
    if (String(role || '').toUpperCase() === 'ADMIN') return 'Full control';

    const labels = {
      reportUpload: 'Upload',
      reportViewFile: 'Open PDFs',
      reportRemove: 'Remove',
      rawEdit: 'Raw edit',
      subjectManage: 'Subjects',
      rawStructureManage: 'Raw rows',
      stickyView: 'Sticky view',
      stickyManage: 'Sticky manage',
      allOffices: 'All offices'
    };

    const selected = Object.keys(labels).filter(key => permissions?.[key] === true);
    return selected.length ? selected.map(key => labels[key]).join(' · ') : 'View only';
  }

  function officeNameForAuth(id) {
    return {
      HEAD_OFFICE: 'O/o ADG(B)',
      CEB: 'CE(B)',
      CEHAL: 'CE(HAL)',
      SEPD: 'SE&PD',
      SEMYSORE: 'SE(Mysore)',
      SEHUBLI: 'SE(Hubli)'
    }[String(id || '').toUpperCase()] || '';
  }

  function authCanUseOffice(officeId, permission = 'reportUpload') {
    return authCanForOffice(permission, officeId);
  }

  function applyRolePermissions() {
    if (!authState.user) return;

    const isAdmin = authState.user.role === 'ADMIN';
    const adminButton = document.getElementById('adminButton');
    if (adminButton) adminButton.hidden = !authCan('subjectManage');

    document.querySelectorAll('[data-upload]').forEach(button => {
      const officeId = String(button.dataset.office || '').toUpperCase();
      const allowed =
        authCanForOffice('reportUpload', officeId) ||
        authCanForOffice('reportViewFile', officeId) ||
        authCanForOffice('reportRemove', officeId);

      button.disabled = !allowed;
      button.classList.toggle('adgb-role-blocked', !allowed);

      if (!allowed) {
        button.title = 'You can view the dashboard, but your account has no action permission for this office.';
      }
    });

    applyRawRolePermissions();
  }

  function observeExistingPortalModals() {
    const matrix = document.getElementById('matrixContent');
    if (matrix) {
      new MutationObserver(applyRolePermissions).observe(matrix, {
        childList: true,
        subtree: true
      });
    }

    const uploadBackdrop = document.getElementById('uploadBackdrop');
    if (uploadBackdrop) {
      new MutationObserver(() => {
        if (!uploadBackdrop.classList.contains('hidden')) {
          prepareUploadModalForLogin();
        }
      }).observe(uploadBackdrop, { attributes: true, attributeFilter: ['class'] });
    }

    const adminBackdrop = document.getElementById('adminBackdrop');
    if (adminBackdrop) {
      new MutationObserver(() => {
        if (!adminBackdrop.classList.contains('hidden')) {
          prepareAdminModalForLogin();
        }
      }).observe(adminBackdrop, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function prepareUploadModalForLogin() {
    const officeId = authState.pendingOfficeId;
    const code = document.getElementById('officeCode');

    if (!code || !officeId) return;

    const canUpload = authCanForOffice('reportUpload', officeId);
    const canView = authCanForOffice('reportViewFile', officeId);
    const canRemove = authCanForOffice('reportRemove', officeId);
    const canAny = canUpload || canView || canRemove;

    const credential = canAny
      ? ('SESSION:' + authState.token)
      : '';

    code.value = credential;

    const field = code.closest('.field');
    if (field) {
      field.classList.toggle('adgb-auth-hidden-code', Boolean(credential));
    }

    const dropZone = document.getElementById('reportDropZone');
    const submit = document.getElementById('uploadSubmit');
    const view = document.getElementById('viewReportButton');
    const remove = document.getElementById('removeReportButton');

    if (dropZone && !canUpload) dropZone.classList.add('hidden');
    if (submit && !canUpload) submit.classList.add('hidden');
    if (view && !canView) view.classList.add('hidden');
    if (remove && !canRemove) remove.classList.add('hidden');

    const note = document.getElementById('uploadPrivacyNote');
    if (note) {
      note.textContent = canAny
        ? 'Signed in as ' +
          (authState.user.displayName || authState.user.username) +
          '. Your account permissions are applied automatically.'
        : 'You can view the dashboard, but you do not have permission to act on this office.';
    }
  }

  function prepareAdminModalForLogin() {
    if (!authCan('subjectManage')) return;

    const code = document.getElementById('adminCode');
    const form = document.getElementById('adminLoginForm');

    if (!code || !form) return;

    code.value = 'SESSION:' + authState.token;

    const field = code.closest('.field');
    if (field) field.classList.add('adgb-auth-hidden-code');

    // Existing portal admin form only stores the credential locally,
    // so submit it automatically for a signed-in Administrator.
    setTimeout(() => {
      if (!document.getElementById('adminPanel')?.classList.contains('hidden')) return;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 20);
  }

  async function openUserManager() {
    if (authState.user?.role !== 'ADMIN') return;

    document.getElementById('adgbUsersModal').hidden = false;
    document.body.style.overflow = 'hidden';
    resetUserEditor();
    await loadManagedUsers();
  }

  function closeUserManager() {
    document.getElementById('adgbUsersModal').hidden = true;
    document.body.style.overflow = '';
    resetUserEditor();
  }

  async function loadManagedUsers() {
    const list = document.getElementById('adgbUserList');
    list.innerHTML = '<div style="padding:18px;text-align:center;color:#6b7f8b;font-size:10px">Loading users…</div>';

    try {
      const result = await authPost('adminListUsers', {
        sessionToken: authState.token
      });
      authState.users = Array.isArray(result.users) ? result.users : [];
      renderManagedUsers();
    } catch (error) {
      list.innerHTML =
        '<div style="padding:18px;color:#b91c1c;font-size:10px;font-weight:800">' +
        rawHtml(error.message || 'Users could not be loaded.') +
        '</div>';
    }
  }

  function renderManagedUsers() {
    const list = document.getElementById('adgbUserList');

    if (!authState.users.length) {
      list.innerHTML = '<div style="padding:18px;text-align:center;color:#6b7f8b">No users found.</div>';
      return;
    }

    list.innerHTML = authState.users.map(user => `
      <div class="adgb-user-row">
        <span><strong>${rawHtml(user.displayName || user.username)}</strong><small>@${rawHtml(user.username)}</small></span>
        <span>${rawHtml(user.role === 'OFFICE' ? (officeNameForAuth(user.officeId) || user.officeId) : (user.role === 'ADMIN' ? 'All offices' : 'Dashboard viewer'))}<small>${rawHtml(permissionSummary(user.permissions, user.role))}</small></span>
        <span class="adgb-user-role">${rawHtml(user.role)}</span>
        <span><small>Last login</small>${rawHtml(user.lastLogin || 'Not yet')}</span>
        <span class="adgb-user-status ${user.active ? 'active' : 'inactive'}">${user.active ? 'ACTIVE' : 'INACTIVE'}</span>
        <span style="display:flex;gap:5px;justify-content:flex-end">
          <button type="button" data-auth-edit-user="${rawAttr(user.id)}">Edit</button>
          <button class="delete" type="button" data-auth-delete-user="${rawAttr(user.id)}">Delete</button>
        </span>
      </div>
    `).join('');
  }

  function handleUserListAction(event) {
    const edit = event.target.closest('[data-auth-edit-user]');
    const remove = event.target.closest('[data-auth-delete-user]');

    if (edit) {
      editManagedUser(edit.dataset.authEditUser);
      return;
    }

    if (remove) {
      deleteManagedUser(remove.dataset.authDeleteUser);
    }
  }

  function editManagedUser(id) {
    const user = authState.users.find(item => item.id === id);
    if (!user) return;

    authState.editingUserId = id;
    document.getElementById('adgbUserUsername').value = user.username || '';
    document.getElementById('adgbUserDisplayName').value = user.displayName || '';
    document.getElementById('adgbUserRoleSelect').value = user.role || 'VIEWER';
    document.getElementById('adgbUserOffice').value = user.officeId || '';
    document.getElementById('adgbUserPassword').value = '';
    document.getElementById('adgbUserPassword').placeholder = 'Leave blank to keep current';
    document.getElementById('adgbUserActive').checked = user.active !== false;
    writeUserPermissionEditor(user.permissions, user.role);
    document.getElementById('adgbUserSave').textContent = 'Save changes';
    document.getElementById('adgbUserCancelEdit').hidden = false;
    updateUserOfficeField();
    document.getElementById('adgbUserUsername').focus();
  }

  function resetUserEditor() {
    authState.editingUserId = '';
    const form = document.getElementById('adgbUserForm');
    if (!form) return;
    form.reset();
    document.getElementById('adgbUserActive').checked = true;
    document.getElementById('adgbUserRoleSelect').value = 'VIEWER';
    writeUserPermissionEditor(defaultAuthPermissionsForRole('VIEWER'), 'VIEWER');
    document.getElementById('adgbUserPassword').placeholder = 'New user: required';
    document.getElementById('adgbUserSave').textContent = 'Add user';
    document.getElementById('adgbUserCancelEdit').hidden = true;
    document.getElementById('adgbUserError').textContent = '';
    updateUserOfficeField();
  }

  function updateUserOfficeField() {
    const role = document.getElementById('adgbUserRoleSelect')?.value || 'VIEWER';
    const field = document.getElementById('adgbUserOfficeField');

    if (field) {
      field.style.visibility = role === 'OFFICE' ? 'visible' : 'hidden';
    }

    if (!authState.editingUserId || role === 'ADMIN') {
      writeUserPermissionEditor(defaultAuthPermissionsForRole(role), role);
    } else {
      document.querySelectorAll('[data-auth-permission]').forEach(input => {
        input.disabled = role === 'ADMIN';
      });
    }
  }

  async function saveManagedUser(event) {
    event.preventDefault();

    const errorBox = document.getElementById('adgbUserError');
    const button = document.getElementById('adgbUserSave');

    const payload = {
      sessionToken: authState.token,
      userId: authState.editingUserId,
      username: document.getElementById('adgbUserUsername').value.trim(),
      displayName: document.getElementById('adgbUserDisplayName').value.trim(),
      role: document.getElementById('adgbUserRoleSelect').value,
      officeId: document.getElementById('adgbUserOffice').value,
      password: document.getElementById('adgbUserPassword').value,
      active: document.getElementById('adgbUserActive').checked,
      permissions: readUserPermissionEditor()
    };

    errorBox.textContent = '';

    if (!payload.userId && !payload.password) {
      errorBox.textContent = 'Enter a password for the new user.';
      return;
    }

    button.disabled = true;
    button.textContent = payload.userId ? 'Saving…' : 'Adding…';

    try {
      await authPost('adminSaveUser', payload);
      resetUserEditor();
      await loadManagedUsers();

      // Re-check current session in case Admin changed their own name/username.
      const checked = await authPost('sessionCheck', {
        sessionToken: authState.token
      });
      setAuthenticatedUser(checked.user);

    } catch (error) {
      errorBox.textContent = error.message || 'User could not be saved.';
    } finally {
      button.disabled = false;
      button.textContent = authState.editingUserId ? 'Save changes' : 'Add user';
    }
  }

  async function deleteManagedUser(id) {
    const user = authState.users.find(item => item.id === id);
    if (!user) return;

    if (!confirm('Delete user "' + (user.displayName || user.username) + '"?')) return;

    try {
      await authPost('adminDeleteUser', {
        sessionToken: authState.token,
        userId: id
      });
      await loadManagedUsers();
    } catch (error) {
      document.getElementById('adgbUserError').textContent =
        error.message || 'User could not be deleted.';
    }
  }

  function applyRawRolePermissions() {
    if (!authState.user) return;

    const canStructure = authCan('rawStructureManage');

    const addButton = document.getElementById('rawAddItemButton');
    if (addButton) addButton.hidden = !canStructure;

    document.querySelectorAll(
      '[data-raw-edit-item="1"], [data-raw-add-subrow="1"], [data-raw-delete-subrow="1"]'
    ).forEach(button => {
      button.hidden = !canStructure;
    });

    document.querySelectorAll('[data-raw-cell="1"]').forEach(button => {
      const officeId = String(button.dataset.officeId || '').toUpperCase();
      const allowed = authCanForOffice('rawEdit', officeId);

      button.disabled = !allowed;
      button.classList.toggle('adgb-role-blocked', !allowed);
    });
  }


  window.addEventListener('adgb-auth-changed', () => {
    setTimeout(applyRolePermissions, 0);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseRawDataFeature);
  } else {
    initialiseRawDataFeature();
  }
})();
