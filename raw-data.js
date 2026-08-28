(() => {
  'use strict';

  const RAW_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzDXfkgXAd5WMHErA-qHn4ZMcQV-Irx4Yeg-HNgZJKKJ-RpNcAiDbpyJx_4uyJvKwIzxg/exec';

  const RAW_FRONTEND_VERSION = '15.28';


  /* =====================================================================
   * V15.12 LOGIN + USER MANAGEMENT
   * ===================================================================== */
  const AUTH_TOKEN_KEY = 'adgbPortalSessionTokenV1512';
  const AUTH_USERNAME_KEY = 'adgbPortalRememberedUsernameV1512';
  const AUTH_PASSWORD_SESSION_KEY = 'adgbPortalSessionPasswordV1525';
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


  const authHtml = value =>
    String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));

  const rawHtml = authHtml;
  const rawAttr = authHtml;

  function rawNonce() {
    return window.crypto?.randomUUID?.() ||
      (Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  function rawJsonp(action, parameters = {}) {
    return new Promise((resolve, reject) => {
      const callback =
        'adgbAuthJsonp_' +
        rawNonce().replace(/[^A-Za-z0-9_$]/g, '');

      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup(new Error('The portal backend connection timed out.'));
      }, 20000);

      function cleanup(error, data) {
        clearTimeout(timer);
        try { delete window[callback]; } catch { window[callback] = undefined; }
        script.remove();
        error ? reject(error) : resolve(data);
      }

      window[callback] = data => cleanup(null, data);

      script.onerror = () =>
        cleanup(new Error('The Apps Script backend could not be reached.'));

      const query = new URLSearchParams({
        ...parameters,
        action,
        callback,
        _: Date.now()
      });

      script.src = RAW_SCRIPT_URL + '?' + query.toString();
      document.head.appendChild(script);
    });
  }

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

    style.textContent += `
      /* V15.18 — larger, bolder, calmer typography */
      .adgb-login-brand small{
        font-size:12px!important;
        font-weight:900!important;
        letter-spacing:.08em!important;
      }
      .adgb-login-brand h1{
        font-size:46px!important;
        font-weight:800!important;
        line-height:1.08!important;
        letter-spacing:-.015em!important;
      }
      .adgb-login-brand p{
        font-size:15px!important;
        font-weight:650!important;
        line-height:1.65!important;
      }
      .adgb-login-form .kicker{
        font-size:12px!important;
        font-weight:950!important;
      }
      .adgb-login-form h2{
        font-size:39px!important;
        font-weight:800!important;
        letter-spacing:-.01em!important;
      }
      .adgb-login-form>p{
        font-size:14px!important;
        font-weight:600!important;
      }
      .adgb-auth-field span{
        font-size:12px!important;
        font-weight:900!important;
      }
      .adgb-auth-field input,
      .adgb-auth-field select{
        height:54px!important;
        font-size:16px!important;
        font-weight:700!important;
      }
      .adgb-password-wrap button{
        height:40px!important;
        top:7px!important;
        font-size:11px!important;
        font-weight:950!important;
      }
      .adgb-remember{
        font-size:12px!important;
        font-weight:650!important;
      }
      .adgb-auth-error{
        font-size:12px!important;
        font-weight:900!important;
      }
      .adgb-login-submit{
        height:55px!important;
        font-size:16px!important;
        font-weight:950!important;
        letter-spacing:.01em!important;
      }
      .adgb-version-chip{
        font-size:10px!important;
        font-weight:950!important;
      }
      .adgb-cache-clear{
        min-height:37px!important;
        font-size:10px!important;
        font-weight:900!important;
      }

      /* Main dashboard — easy reading without making the layout bulky */
      body{
        font-size:15px!important;
      }
      .brand-copy strong{
        font-size:24px!important;
        font-weight:900!important;
      }
      .brand-copy small{
        font-size:12px!important;
        font-weight:650!important;
      }
      .cycle-label{
        font-size:13px!important;
        font-weight:900!important;
      }
      .cycle-main strong{
        font-size:18px!important;
        font-weight:900!important;
      }
      .system-line{
        font-size:11px!important;
        font-weight:700!important;
      }
      .stat-label{
        font-size:12px!important;
        font-weight:900!important;
      }
      .stat-value{
        font-size:31px!important;
        font-weight:950!important;
      }
      .stat-note{
        font-size:10px!important;
        font-weight:650!important;
      }
      .panel-head h2{
        font-size:23px!important;
        font-weight:900!important;
      }
      .panel-kicker{
        font-size:10px!important;
        font-weight:950!important;
      }
      .office-cycle-row>span:first-child{
        font-size:16px!important;
        font-weight:950!important;
      }
      .office-cycle-status{
        font-size:11px!important;
        font-weight:800!important;
      }
      .matrix-heading-copy p{
        font-size:12px!important;
        font-weight:650!important;
      }
      thead th{
        font-size:14px!important;
        font-weight:900!important;
      }
      tbody th{
        font-size:17px!important;
        font-weight:850!important;
        line-height:1.22!important;
      }
      .upload-button,
      .office-list button{
        font-size:12px!important;
        font-weight:900!important;
      }
      .office-name{
        font-size:15px!important;
        font-weight:950!important;
      }
      .subject-card-title h3{
        font-size:18px!important;
        font-weight:900!important;
      }
      .filter-button,
      .refresh-button{
        font-size:11px!important;
        font-weight:900!important;
      }
      .tool-field{
        font-size:9px!important;
        font-weight:900!important;
      }
      .tool-field input,
      .tool-field select{
        font-size:12px!important;
        font-weight:700!important;
      }
      .other-report-note{
        font-weight:750!important;
      }
      .adgb-user-copy strong{
        font-size:11px!important;
        font-weight:950!important;
      }
      .adgb-user-copy small{
        font-size:9px!important;
        font-weight:750!important;
      }
      .adgb-user-action{
        font-size:9px!important;
        font-weight:950!important;
      }

      @media(max-width:760px){
        .adgb-login-form h2{font-size:34px!important}
        .adgb-login-form>p{font-size:13px!important}
        .adgb-auth-field input{font-size:15px!important}
        .brand-copy strong{font-size:18px!important}
        .cycle-main strong{font-size:16px!important}
        .panel-head h2{font-size:21px!important}
        tbody th{font-size:16px!important}
      }
    `;
    style.textContent += `
      /* V15.19: keep signed-in user controls clear of the open sticky drawer */
      .adgb-user-bar{
        transition:right .18s ease, box-shadow .18s ease!important;
      }
      @media(min-width:1400px){
        body.adgb-sticky-drawer-open .adgb-user-bar{
          right:514px!important;
        }
      }
    `;
    style.textContent += `
      .adgb-drive-link{
        height:31px;
        display:inline-flex;
        align-items:center;
        gap:5px;
        border:1px solid #b9d9c9;
        border-radius:999px;
        padding:0 10px;
        background:#f2fbf6;
        color:#087153;
        font-size:9px;
        font-weight:950;
        cursor:pointer;
        white-space:nowrap;
      }
      .adgb-drive-link:hover{
        background:#e7f8ef;
        border-color:#76bc9a;
      }
      .adgb-drive-link[hidden]{display:none!important}
      @media(max-width:760px){
        .adgb-drive-link{padding:0 8px;font-size:8px}
      }
    `;
    style.textContent += `
      /* V15.24 — compact summary row */
      .stats-grid{
        gap:8px!important;
        margin-bottom:8px!important;
      }
      .stat-card{
        min-height:58px!important;
        padding:7px 12px 6px!important;
        border-radius:8px!important;
      }
      .stat-label{
        font-size:10px!important;
        line-height:1.05!important;
        letter-spacing:.065em!important;
      }
      .stat-value{
        margin-top:1px!important;
        font-size:25px!important;
        line-height:1!important;
      }
      .stat-note{
        margin-top:1px!important;
        font-size:8.5px!important;
        line-height:1.05!important;
      }
      .mini-progress{
        height:4px!important;
        margin-top:3px!important;
      }

      /* Signed-in controls belong to the sticky top header, not the page body. */
      .header-inner{
        min-height:66px!important;
      }
      .adgb-user-bar{
        position:static!important;
        inset:auto!important;
        right:auto!important;
        top:auto!important;
        z-index:auto!important;
        flex:0 0 auto!important;
        margin-left:auto!important;
        box-shadow:0 4px 14px rgba(30,64,90,.10)!important;
        background:rgba(255,255,255,.96)!important;
      }
      .adgb-user-chip{
        padding:2px 7px 2px 3px!important;
      }
      .adgb-user-avatar{
        width:28px!important;
        height:28px!important;
      }
      .adgb-user-copy strong{
        max-width:125px!important;
        font-size:10px!important;
      }
      .adgb-user-copy small{
        font-size:8px!important;
      }
      .adgb-inside-version{
        padding:0 2px!important;
      }
      .adgb-inside-version .adgb-version-chip{
        padding:4px 6px!important;
        font-size:8px!important;
      }
      .adgb-drive-link,
      .adgb-user-action{
        height:30px!important;
      }

      /* Keep the original Head Office Administrator button on the same top row. */
      .header-inner > .admin-button{
        flex:0 0 auto!important;
        margin-left:0!important;
      }

      /* A static header control strip must never be shifted by the sticky drawer. */
      body.adgb-sticky-drawer-open .adgb-user-bar{
        right:auto!important;
      }

      @media(max-width:1250px){
        .header-inner{
          flex-wrap:wrap!important;
          padding:6px 0!important;
          gap:7px!important;
        }
        .adgb-user-bar{
          order:3!important;
          width:100%!important;
          justify-content:flex-end!important;
          margin-left:0!important;
        }
      }

      @media(max-width:760px){
        .stats-grid{
          gap:6px!important;
        }
        .stat-card{
          min-height:54px!important;
          padding:6px 9px!important;
        }
        .stat-value{
          font-size:22px!important;
        }
        .adgb-user-bar{
          position:static!important;
          max-width:100%!important;
          overflow-x:auto!important;
          border-radius:12px!important;
          justify-content:flex-start!important;
        }
      }
    `;
    style.textContent += `
      /* =========================================================
         V15.28 — ULTRA-COMPACT DESKTOP HEADER
         Portal name + cycle + tabs + useful metrics + user actions
         fit in one row on a wide desktop.
         ========================================================= */

      header{
        min-height:0!important;
      }

      .header-inner{
        width:min(1720px,calc(100% - 24px))!important;
        min-height:54px!important;
        height:auto!important;
        gap:7px!important;
        flex-wrap:nowrap!important;
        justify-content:flex-start!important;
        padding:4px 0!important;
      }

      .brand{
        flex:0 1 320px!important;
        gap:8px!important;
      }
      .brand-mark{
        width:34px!important;
        height:34px!important;
      }
      .brand-copy strong{
        font-size:17px!important;
        line-height:1.05!important;
        white-space:nowrap!important;
      }
      .brand-copy small{
        font-size:8.5px!important;
      }

      .adgb-compact-mainbar{
        display:flex;
        align-items:center;
        gap:4px;
        flex:0 0 auto;
        min-width:0;
      }

      .adgb-compact-mainbar .cycle-main{
        min-height:30px!important;
        display:flex!important;
        align-items:center!important;
        gap:4px!important;
        flex-wrap:nowrap!important;
        padding:0 8px!important;
        border:1px solid #d7e3ea!important;
        border-radius:999px!important;
        background:#f8fbfd!important;
      }
      .adgb-compact-mainbar .cycle-label{
        display:none!important;
      }
      .adgb-compact-mainbar .cycle-main strong{
        font-size:10px!important;
        font-weight:950!important;
        white-space:nowrap!important;
      }
      .adgb-compact-mainbar .active-badge{
        padding:2px 5px!important;
        font-size:7px!important;
      }

      .adgb-compact-mainbar .portal-tab,
      .adgb-compact-mainbar .admin-button,
      .adgb-compact-mainbar .refresh-button{
        min-height:30px!important;
        height:30px!important;
        padding:0 9px!important;
        border-radius:8px!important;
        font-size:9px!important;
        font-weight:950!important;
        white-space:nowrap!important;
        box-shadow:none!important;
      }

      .adgb-compact-mainbar .admin-button{
        background:#eef7fb!important;
        color:#0b3b60!important;
        border:1px solid #c6dce8!important;
      }

      .adgb-compact-mainbar .refresh-button{
        width:30px!important;
        min-width:30px!important;
        padding:0!important;
        font-size:15px!important;
      }

      /* The four large cards become one very small metrics group. */
      .header-inner > .stats-grid{
        display:flex!important;
        align-items:center!important;
        gap:2px!important;
        flex:1 1 290px!important;
        min-width:250px!important;
        margin:0!important;
        padding:2px!important;
        border:1px solid #d7e3ea!important;
        border-radius:10px!important;
        background:rgba(255,255,255,.74)!important;
        box-shadow:none!important;
      }

      .header-inner > .stats-grid.hidden{
        display:none!important;
      }

      .header-inner > .stats-grid .stat-card{
        min-height:30px!important;
        height:30px!important;
        flex:1 1 0!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        padding:0 5px!important;
        border:0!important;
        border-right:1px solid #e0e8ed!important;
        border-radius:6px!important;
        box-shadow:none!important;
        overflow:visible!important;
        background:transparent!important;
      }

      .header-inner > .stats-grid .stat-card:last-child{
        border-right:0!important;
      }
      .header-inner > .stats-grid .stat-card::before{
        display:none!important;
      }
      .header-inner > .stats-grid .stat-label{
        display:inline!important;
        font-size:7.5px!important;
        line-height:1!important;
        letter-spacing:.03em!important;
        white-space:nowrap!important;
      }
      .header-inner > .stats-grid .stat-value{
        display:inline!important;
        margin:0!important;
        font-size:17px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      .header-inner > .stats-grid .stat-note,
      .header-inner > .stats-grid .mini-progress{
        display:none!important;
      }

      .adgb-user-bar{
        flex:0 0 auto!important;
        margin-left:auto!important;
        gap:3px!important;
        padding:3px!important;
        border-radius:12px!important;
        box-shadow:none!important;
      }
      .adgb-user-chip{
        gap:5px!important;
        padding:1px 5px 1px 2px!important;
      }
      .adgb-user-avatar{
        width:27px!important;
        height:27px!important;
      }
      .adgb-user-copy strong{
        max-width:90px!important;
        font-size:9px!important;
      }
      .adgb-user-copy small{
        display:none!important;
      }
      .adgb-inside-version{
        gap:2px!important;
      }
      .adgb-inside-version .adgb-version-chip{
        padding:3px 5px!important;
        font-size:7.5px!important;
      }
      .adgb-drive-link,
      .adgb-user-action{
        height:28px!important;
        padding:0 7px!important;
        font-size:8px!important;
      }

      /* Old rows are no longer needed after their useful controls are moved. */
      .cycle-bar.adgb-compacted-away,
      .portal-tabs.adgb-compacted-away{
        display:none!important;
      }

      .page{
        padding-top:5px!important;
      }

      /* 1250-1599: keep compact, allow only a small second line if necessary. */
      @media(min-width:1250px) and (max-width:1599px){
        .header-inner{
          flex-wrap:wrap!important;
          gap:4px!important;
        }
        .brand{
          flex-basis:290px!important;
        }
        .header-inner > .stats-grid{
          flex:1 1 270px!important;
        }
        .adgb-user-bar{
          margin-left:auto!important;
        }
      }

      /* Smaller screens remain tidy rather than squeezed. */
      @media(max-width:1249px){
        .header-inner{
          flex-wrap:wrap!important;
          min-height:0!important;
          padding:5px 0!important;
        }
        .brand{
          flex:1 1 300px!important;
        }
        .adgb-compact-mainbar{
          order:3!important;
          flex:1 1 100%!important;
          overflow-x:auto!important;
        }
        .header-inner > .stats-grid{
          order:4!important;
          flex:1 1 100%!important;
          min-width:0!important;
        }
        .adgb-user-bar{
          order:2!important;
          margin-left:auto!important;
        }
      }

      @media(max-width:760px){
        .brand-copy small{display:none!important}
        .brand-copy strong{font-size:15px!important}
        .adgb-user-copy{display:none!important}
        .adgb-inside-version{display:none!important}
        .header-inner > .stats-grid{
          overflow-x:auto!important;
        }
        .header-inner > .stats-grid .stat-card{
          min-width:80px!important;
        }
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
          <form class="adgb-login-form" id="adgbLoginForm" action="javascript:void(0)">
            <span class="kicker">Secure access</span>
            <h2>Welcome</h2>
            <p>Enter the username and password assigned by the Administrator.</p>
            <label class="adgb-auth-field"><span>Username</span><input id="adgbLoginUsername" type="text" autocomplete="username" required placeholder="Enter username"></label>
            <label class="adgb-auth-field"><span>Password</span><div class="adgb-password-wrap"><input id="adgbLoginPassword" type="password" autocomplete="current-password" required placeholder="Enter password"><button id="adgbShowPassword" type="button">Show</button></div></label>
            <label class="adgb-remember"><input id="adgbRememberUsername" type="checkbox"> Remember username and keep password in this tab</label>
            <div class="adgb-auth-error" id="adgbLoginError"></div>
            <button class="adgb-login-submit" id="adgbLoginSubmit" type="submit">Sign in</button>
            <div class="adgb-login-version">
              <span class="adgb-version-chip">FE <strong id="adgbLoginFeVersion">v15.28</strong></span>
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
        <span class="adgb-version-chip">FE <strong>v15.28</strong></span>
        <span class="adgb-version-chip">BE <strong id="adgbInsideBeVersion">checking…</strong></span>
      </div>
      <button class="adgb-drive-link" id="adgbDriveFolderLink" type="button" hidden title="Open Current Submission Cycle folder">📁 Current files</button>
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
                <label><input type="checkbox" data-auth-permission="driveFolderView"> View Current Submission Cycle folder</label>
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
    const sessionPassword = sessionStorage.getItem(AUTH_PASSWORD_SESSION_KEY) || '';

    document.getElementById('adgbLoginUsername').value = remembered;
    document.getElementById('adgbLoginPassword').value = sessionPassword;
    document.getElementById('adgbRememberUsername').checked =
      Boolean(remembered || sessionPassword);

    document.getElementById('adgbLoginForm').addEventListener('submit', handlePortalLogin);
    document.getElementById('adgbShowPassword').addEventListener('click', toggleLoginPassword);
    document.getElementById('adgbClearPortalCache').addEventListener('click', clearPortalCache);
    document.getElementById('adgbLogout').addEventListener('click', () => logoutPortal(true));
    document.getElementById('adgbManageUsers').addEventListener('click', openUserManager);
    document.getElementById('adgbDriveFolderLink').addEventListener('click', openUploadedDriveFolder);
    document.getElementById('adgbUsersClose').addEventListener('click', closeUserManager);
    document.getElementById('adgbUserForm').addEventListener('submit', saveManagedUser);
    document.getElementById('adgbUserCancelEdit').addEventListener('click', resetUserEditor);
    document.getElementById('adgbUserRoleSelect').addEventListener('change', updateUserOfficeField);
    document.getElementById('adgbUserList').addEventListener('click', handleUserListAction);
    usersModal.addEventListener('mousedown', event => {
      if (event.target === usersModal) closeUserManager();
    });

    // Dock only after Login/Sign-in handlers are safely attached.
    dockUserBarIntoTopHeader();

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

    // Always show Login first. A stale session or offline backend must never
    // expose the dashboard or leave a blank page.
    showLoginPage();
    loadAuthBackendVersion().catch(() => {});

    if (authState.token) {
      try {
        const result = await authPost('sessionCheck', {
          sessionToken: authState.token
        });

        if (result.backendVersion) {
          setAuthBackendVersion(result.backendVersion);
        }

        if (!result.user || !result.user.username) {
          throw new Error('Saved login session could not be confirmed.');
        }

        setAuthenticatedUser(result.user);
        return;
      } catch (ignore) {
        authState.token = '';
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  }

  async function handlePortalLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('adgbLoginUsername');
    const passwordInput = document.getElementById('adgbLoginPassword');
    const rememberInput = document.getElementById('adgbRememberUsername');
    const errorBox = document.getElementById('adgbLoginError');
    const button = document.getElementById('adgbLoginSubmit');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    errorBox.textContent = '';

    if (!username || !password) {
      errorBox.textContent = 'Enter username and password.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Signing in…';

    let provisionalToken = '';

    try {
      const loginResult = await authPost('login', {
        username,
        password
      });

      if (loginResult.backendVersion) {
        setAuthBackendVersion(loginResult.backendVersion);
      }

      provisionalToken = String(loginResult.token || '').trim();

      if (!provisionalToken) {
        throw new Error(
          'Login was accepted but no session was created. Please try once more.'
        );
      }

      /*
       * V15.26:
       * Do not hide the login page yet. Confirm the session/user profile first.
       * This prevents a partial iframe/receipt response from sending the UI
       * back to a blank login form.
       */
      let confirmedUser = loginResult.user || null;

      if (!confirmedUser || !confirmedUser.username) {
        const checked = await authPost('sessionCheck', {
          sessionToken: provisionalToken
        });

        if (checked.backendVersion) {
          setAuthBackendVersion(checked.backendVersion);
        }

        confirmedUser = checked.user || null;
      }

      if (!confirmedUser || !confirmedUser.username) {
        throw new Error(
          'Login succeeded but the user profile could not be confirmed. Please try again.'
        );
      }

      // Save the token only after the user profile has been confirmed.
      authState.token = provisionalToken;
      sessionStorage.setItem(AUTH_TOKEN_KEY, authState.token);

      if (rememberInput.checked) {
        localStorage.setItem(AUTH_USERNAME_KEY, username);
        sessionStorage.setItem(AUTH_PASSWORD_SESSION_KEY, password);
      } else {
        localStorage.removeItem(AUTH_USERNAME_KEY);
        sessionStorage.removeItem(AUTH_PASSWORD_SESSION_KEY);
      }

      // Keep fields intact; the login panel is simply hidden after success.
      usernameInput.value = username;
      passwordInput.value = password;

      setAuthenticatedUser(confirmedUser);

    } catch (error) {
      /*
       * Never clear the user's entries on a failed/partial login.
       * Also remove any provisional token so the next click starts cleanly.
       */
      if (provisionalToken && authState.token !== provisionalToken) {
        authPost('logout', {
          sessionToken: provisionalToken
        }).catch(() => {});
      }

      errorBox.textContent =
        error.message || 'Sign-in failed. Please try again.';

      usernameInput.value = username;
      passwordInput.value = password;
      usernameInput.focus();

    } finally {
      button.disabled = false;
      button.textContent = 'Sign in';
    }
  }

  function dockUserBarIntoTopHeader() {
    const userBar = document.getElementById('adgbUserBar');
    const headerInner = document.querySelector('header .header-inner');

    if (!userBar || !headerInner) return;

    /*
     * IMPORTANT:
     * In index.html the Administrator button is inside <nav>.
     * insertBefore() only accepts a DIRECT child of headerInner.
     * Therefore insert the signed-in strip before the <nav>, never before
     * the nested Administrator button.
     */
    const nav = headerInner.querySelector(':scope > nav');

    try {
      if (nav) {
        headerInner.insertBefore(userBar, nav);
      } else {
        headerInner.appendChild(userBar);
      }
    } catch (error) {
      // Header layout must never be allowed to break Login initialisation.
      headerInner.appendChild(userBar);
    }
  }

  function setAuthenticatedUser(user) {
    authState.user = user || null;

    dockUserBarIntoTopHeader();

    if (!authState.user || !authState.user.username) {
      const loginRoot = document.getElementById('adgbAuthRoot');
      if (loginRoot) loginRoot.hidden = false;

      document.documentElement.classList.add('adgb-auth-locking');

      const errorBox = document.getElementById('adgbLoginError');
      if (errorBox) {
        errorBox.textContent =
          'The user profile could not be loaded. Please sign in again.';
      }
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

    document.getElementById('adgbDriveFolderLink').hidden =
      !authCan('driveFolderView');

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

    const rememberedUsername =
      localStorage.getItem(AUTH_USERNAME_KEY) || '';
    const rememberedPassword =
      sessionStorage.getItem(AUTH_PASSWORD_SESSION_KEY) || '';

    document.getElementById('adgbLoginUsername').value =
      rememberedUsername;
    document.getElementById('adgbLoginPassword').value =
      rememberedPassword;
    document.getElementById('adgbRememberUsername').checked =
      Boolean(rememberedUsername || rememberedPassword);

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
        driveFolderView: true,
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
        driveFolderView: false,
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
      driveFolderView: false,
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
      driveFolderView: 'Current folder',
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

    const driveButton = document.getElementById('adgbDriveFolderLink');
    if (driveButton) driveButton.hidden = !authCan('driveFolderView');

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


  async function openUploadedDriveFolder() {
    if (!authCan('driveFolderView') || !authState.token) return;

    const button = document.getElementById('adgbDriveFolderLink');
    const original = button.textContent;

    /*
     * Open the new tab immediately inside the user's click event.
     * This prevents popup blockers from forcing navigation in the current
     * dashboard tab while we wait for the backend-authorised folder URL.
     */
    const folderTab = window.open('about:blank', '_blank');

    if (!folderTab) {
      alert(
        'Your browser blocked the new tab. Please allow pop-ups for this portal and click Current files again.'
      );
      return;
    }

    try {
      folderTab.opener = null;
      folderTab.document.title = 'Opening Current Submission Cycle…';
      folderTab.document.body.innerHTML =
        '<div style="font-family:Arial,sans-serif;padding:28px;color:#345;">Opening Current Submission Cycle…</div>';
    } catch (ignore) {}

    button.disabled = true;
    button.textContent = 'Opening…';

    try {
      const result = await authPost('getDriveFolderLink', {
        sessionToken: authState.token
      });

      if (!result.folderUrl) {
        throw new Error('Current Submission Cycle folder link was not returned.');
      }

      // Navigate ONLY the newly-created tab.
      folderTab.location.replace(result.folderUrl);

    } catch (error) {
      try {
        folderTab.close();
      } catch (ignore) {}

      alert(
        error.message ||
        'The Current Submission Cycle folder could not be opened.'
      );
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
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


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialisePortalAuth);
  } else {
    initialisePortalAuth();
  }
})();

(() => {
  'use strict';

  const RAW_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzDXfkgXAd5WMHErA-qHn4ZMcQV-Irx4Yeg-HNgZJKKJ-RpNcAiDbpyJx_4uyJvKwIzxg/exec';

  const RAW_FRONTEND_VERSION = '15.28';

  const RAW_DEFAULT_OFFICES = Object.freeze([
    { id: 'HEAD_OFFICE', name: 'O/o ADG(B)' },
    { id: 'CEB', name: 'CE(B)' },
    { id: 'CEHAL', name: 'CE(HAL)' },
    { id: 'SEPD', name: 'SE&PD' },
    { id: 'SEMYSORE', name: 'SE(Mysore)' },
    { id: 'SEHUBLI', name: 'SE(Hubli)' }
  ]);

  const rawState = {
    cycleKey: '',
    cycleName: '',
    offices: [],
    items: [],
    values: {},
    totals: {},
    grandTotal: 0,
    enteredCount: 0,
    totalCells: 0,
    backendVersion: '',
    loaded: false,
    activeItem: null,
    activeOffice: null,
    activeEditItem: null,
    activeParentItem: null
  };

  const rawHtml = value =>
    String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));

  const rawAttr = rawHtml;


  function rawAuthCan(permission) {
    if (!window.ADGB_AUTH?.user) return false;
    return window.ADGB_AUTH.can?.(permission) === true;
  }

  function rawAuthCanForOffice(permission, officeId) {
    if (!rawAuthCan(permission)) return false;
    if (window.ADGB_AUTH?.isAdmin) return true;
    if (window.ADGB_AUTH?.can?.('allOffices')) return true;

    return (
      String(window.ADGB_AUTH?.officeId || '').toUpperCase() ===
      String(officeId || '').toUpperCase()
    );
  }

  function rawSessionCredential(permission, officeId = 'HEAD_OFFICE') {
    if (!window.ADGB_AUTH?.token) return '';

    if (permission === 'rawStructureManage') {
      return rawAuthCan('rawStructureManage')
        ? 'SESSION:' + window.ADGB_AUTH.token
        : '';
    }

    return rawAuthCanForOffice(permission, officeId)
      ? 'SESSION:' + window.ADGB_AUTH.token
      : '';
  }

  function applyRawAuthPermissions() {
    const addButton = document.getElementById('rawAddItemButton');
    const canStructure = rawAuthCan('rawStructureManage');

    if (addButton) addButton.hidden = !canStructure;

    document.querySelectorAll(
      '[data-raw-edit-item="1"], [data-raw-add-subrow="1"], [data-raw-delete-subrow="1"]'
    ).forEach(button => {
      button.hidden = !canStructure;
    });

    document.querySelectorAll('[data-raw-cell="1"]').forEach(button => {
      const officeId = String(button.dataset.officeId || '').toUpperCase();
      const allowed = rawAuthCanForOffice('rawEdit', officeId);

      button.disabled = !allowed;
      button.classList.toggle('adgb-role-blocked', !allowed);

      if (!allowed) {
        button.title = 'You can view this value, but your login cannot edit this office column.';
      }
    });
  }

  function applyRawAdminCredential() {
    const input = document.getElementById('rawItemAdminCode');
    if (!input) return;

    const credential = rawSessionCredential('rawStructureManage');
    input.value = credential;

    const field = input.closest('.raw-field');
    if (field) {
      field.classList.toggle('adgb-auth-hidden-code', Boolean(credential));
    }
  }


  function rawNonce() {
    return window.crypto?.randomUUID?.() ||
      (Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  function rawFormatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';

    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 6
    }).format(number);
  }

  function injectRawStyles() {
    const style = document.createElement('style');
    style.id = 'rawDataFeatureStyles';
    style.textContent = `
      .portal-tabs{
        display:flex;gap:7px;align-items:center;margin:0 0 10px;padding:5px;
        border:1px solid var(--line);border-radius:10px;
        background:linear-gradient(105deg,rgba(218,239,255,.96),rgba(238,226,255,.96),rgba(220,248,237,.96));
        box-shadow:0 6px 18px rgba(58,71,121,.08)
      }
      .portal-tab{
        min-height:36px;border:1px solid #c5cde6;border-radius:8px;padding:0 16px;
        background:rgba(255,255,255,.78);color:#3d4775;font-size:12px;font-weight:800
      }
      .portal-tab:hover{background:#fff}
      .portal-tab.active{
        border-color:#4e4b96;color:#fff;
        background:linear-gradient(135deg,#315c8d,#6653a9 55%,#128072);
        box-shadow:0 4px 12px rgba(66,65,137,.18)
      }
      .portal-version-badge{
        margin-left:auto;display:inline-flex;align-items:center;gap:7px;
        min-height:34px;padding:0 11px;border:1px solid #c5d3df;border-radius:999px;
        background:rgba(255,255,255,.88);color:#38546b;
        font-size:10px;font-weight:900;white-space:nowrap;
        box-shadow:0 4px 12px rgba(39,72,101,.08)
      }
      .portal-version-dot{
        width:7px;height:7px;border-radius:50%;background:#d18b18;
        box-shadow:0 0 0 3px rgba(209,139,24,.12)
      }
      .portal-version-dot.ok{
        background:#07906f;box-shadow:0 0 0 3px rgba(7,144,111,.12)
      }
      .portal-version-dot.error{
        background:#c62828;box-shadow:0 0 0 3px rgba(198,40,40,.12)
      }
      .portal-version-sep{color:#9aa9b6}
      .raw-data-panel{
        margin-bottom:10px;border:1px solid #c8d9e6;border-radius:10px;overflow:hidden;
        background:linear-gradient(155deg,rgba(231,246,255,.98),rgba(249,238,255,.98) 46%,rgba(233,250,242,.98));
        box-shadow:0 12px 30px rgba(49,76,116,.12)
      }
      .raw-data-head{
        min-height:62px;padding:10px 14px;border-top:4px solid #6553a7;border-bottom:1px solid #d7cee6;
        display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
        background:linear-gradient(105deg,#d8edff,#ebdeff 50%,#d9f6e9)
      }
      .raw-data-head h2{
        margin:2px 0 0;font-family:"Trebuchet MS","Segoe UI",sans-serif;
        font-size:22px;color:#263e70
      }
      .raw-kicker{
        display:block;font-size:9px;color:#13736d;font-weight:900;letter-spacing:.13em
      }
      .raw-data-head p{margin:3px 0 0;color:#576783;font-size:11px}
      .raw-head-actions{display:flex;gap:7px;flex-wrap:wrap}
      .raw-action-btn{
        min-height:34px;border:1px solid #c5b9df;border-radius:8px;padding:0 12px;
        background:#fff;color:#4c4389;font-size:11px;font-weight:800
      }
      .raw-action-btn.primary{
        border:0;color:#fff;background:linear-gradient(135deg,#315c8d,#6653a9)
      }
      .raw-stat-grid{
        display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:10px
      }
      .raw-stat{
        min-height:78px;padding:11px 14px;border:1px solid #c8d9ef;border-radius:9px;
        background:linear-gradient(135deg,#d9efff,#e7e0ff);position:relative;overflow:hidden
      }
      .raw-stat:nth-child(2){background:linear-gradient(135deg,#d6f7e9,#d8f3f6);border-color:#b9e2d1}
      .raw-stat:nth-child(3){background:linear-gradient(135deg,#ffe0e9,#ffeadc);border-color:#f0c4d1}
      .raw-stat:nth-child(4){background:linear-gradient(135deg,#fff1c9,#eadfff);border-color:#ead09e}
      .raw-stat span{
        display:block;color:#596984;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em
      }
      .raw-stat strong{display:block;margin-top:5px;color:#294c7b;font-size:28px}
      .raw-table-tools{
        padding:8px 10px;border-top:1px solid #d7cee6;border-bottom:1px solid #d7cee6;
        display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;
        background:linear-gradient(100deg,#dcefff,#eee3ff,#dcf6ec)
      }
      .raw-table-tools strong{font-size:12px;color:#33496f}
      .raw-table-tools span{font-size:10px;color:#62718a}
      .raw-table-wrap{overflow:auto;max-height:510px;background:#edf7ff}
      .raw-table{
        width:100%;min-width:1100px;border-collapse:separate;border-spacing:0;table-layout:fixed
      }
      .raw-table thead th{
        position:sticky;top:0;z-index:4;padding:10px 7px;
        background:linear-gradient(135deg,#174b72,#514995 62%,#157a73);
        color:#fff;border-right:1px solid rgba(255,255,255,.15);
        font-size:12px;text-align:center
      }
      .raw-table thead th:first-child{
        width:260px;left:0;z-index:6;text-align:left;padding-left:15px
      }
      .raw-table thead th:last-child{width:130px}
      .raw-table tbody th,
      .raw-table tbody td{
        height:58px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)
      }
      .raw-table tbody th{
        position:sticky;left:0;z-index:2;padding:8px 13px;text-align:left;
        background:#fff5e8;color:#233858;font-size:14px;font-weight:800
      }
      .raw-table tbody tr:nth-child(even) th{background:#eeeaff}
      .raw-table tbody td{padding:5px;text-align:center;background:rgba(255,255,255,.55)}
      .raw-table tbody tr:nth-child(even) td{background:rgba(239,235,255,.62)}
      .raw-cell-btn{
        width:100%;min-height:35px;border:1px solid #b9c8da;border-radius:7px;
        background:#fff;color:#354d70;font-size:11px;font-weight:800
      }
      .raw-cell-btn.empty{
        border-color:#e0a6ae;background:#fff5f7;color:#a02d3e
      }
      .raw-cell-btn.filled{
        border-color:#8fcbb3;background:#effbf6;color:#08744f;font-size:13px
      }
.raw-item-name-wrap{
        display:flex;align-items:center;justify-content:space-between;gap:8px
      }
      .raw-item-name-text{min-width:0;line-height:1.25}
      .raw-item-edit-btn{
        flex:0 0 auto;min-height:28px;border:1px solid #c6b8dc;border-radius:7px;
        padding:0 8px;background:#fff;color:#514995;font-size:9px;font-weight:900;
        cursor:pointer
      }
      .raw-item-edit-btn:hover{
        background:#eeeaff;border-color:#8e79bd
      }
      .raw-subrow-delete-btn{
        flex:0 0 auto;min-height:28px;border:1px solid #e6aaa5;border-radius:7px;
        padding:0 8px;background:#fff7f6;color:#b42318;font-size:9px;
        font-weight:900;cursor:pointer
      }
      .raw-subrow-delete-btn:hover{
        background:#ffe9e7;border-color:#cf7068
      }
      .raw-item-actions{
        flex:0 0 auto;display:flex;align-items:center;gap:5px
      }
      .raw-subrow-btn{
        min-height:28px;border:1px solid #9cc9be;border-radius:7px;
        padding:0 8px;background:#f5fffb;color:#08745e;font-size:9px;
        font-weight:900;cursor:pointer
      }
      .raw-subrow-btn:hover{
        background:#e5faf2;border-color:#63b39e
      }
      .raw-subrow-name{
        padding-left:24px;position:relative;color:#41576c
      }
      .raw-subrow-name:before{
        content:"↳";position:absolute;left:8px;top:0;color:#6c7fc5;font-weight:900
      }
      .raw-subrow-row th,
      .raw-subrow-row td{
        background:#fbfcff
      }
      .raw-total-cell{
        background:linear-gradient(135deg,#fff0bc,#eadfff)!important;
        color:#453b79;font-size:15px;font-weight:900
      }
      .raw-empty{
        padding:34px;text-align:center;color:#637786;font-size:12px
      }
      .raw-note{
        padding:10px 13px;border-top:1px solid #d7cee6;color:#5d6982;
        background:rgba(255,255,255,.62);font-size:10px;line-height:1.5
      }
      .raw-modal-backdrop{
        position:fixed;inset:0;z-index:220;display:grid;place-items:center;
        padding:18px;background:rgba(4,28,45,.72)
      }
      .raw-modal-backdrop.hidden{display:none!important}
      .raw-modal{
        width:min(470px,100%);padding:24px;border-radius:13px;background:#fff;
        box-shadow:0 26px 70px rgba(0,0,0,.26)
      }
      .raw-modal h3{
        margin:0;color:#2d4370;font-family:"Trebuchet MS","Segoe UI",sans-serif;font-size:22px
      }
      .raw-modal p{margin:7px 0 15px;color:#637786;font-size:11px;line-height:1.5}
      .raw-field{display:grid;gap:5px;margin-top:11px}
      .raw-field span{font-size:10px;font-weight:800;color:#35435b}
      .raw-field input{
        height:42px;border:1px solid #c8d2df;border-radius:8px;padding:0 11px;outline:none
      }
      .raw-field input:focus{border-color:#6553a7;box-shadow:0 0 0 3px rgba(101,83,167,.11)}
      .raw-modal-message{min-height:18px;margin-top:10px;color:#c62828;font-size:10px;font-weight:700}
      .raw-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}
      .raw-modal-actions button{
        min-height:38px;border-radius:8px;padding:0 14px;font-size:11px;font-weight:800
      }
      .raw-cancel{border:1px solid #cbd5e1;background:#fff;color:#334155}
      .raw-save{border:0;background:linear-gradient(135deg,#315c8d,#6653a9);color:#fff}
      @media(max-width:900px){
        .raw-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:720px){
        .portal-tabs{position:sticky;top:62px;z-index:18}
        .portal-tab{flex:1;padding:0 8px}
        .portal-version-badge{
          width:100%;margin-left:0;justify-content:center;order:3
        }
        .raw-data-head{align-items:flex-start}
        .raw-head-actions{width:100%}
        .raw-action-btn{flex:1}
        .raw-stat-grid{gap:7px;padding:8px}
        .raw-stat{min-height:70px;padding:9px 11px}
        .raw-stat strong{font-size:23px}
      }
    `;
    document.head.appendChild(style);
  }

  function injectRawMarkup() {
    const cycleBar = document.querySelector('.cycle-bar');
    if (!cycleBar) return false;

    const tabs = document.createElement('nav');
    tabs.className = 'portal-tabs';
    tabs.setAttribute('aria-label', 'Portal sections');
    tabs.innerHTML = `
      <button class="portal-tab active" id="reportsTabButton" type="button">Report Submission</button>
      <button class="portal-tab" id="rawDataTabButton" type="button">Raw Data</button>
      <div class="portal-version-badge" id="portalVersionBadge" title="Portal software versions">
        <span class="portal-version-dot" id="portalVersionDot"></span>
        <span>Frontend v${RAW_FRONTEND_VERSION}</span>
        <span class="portal-version-sep">|</span>
        <span id="portalBackendVersion">Backend checking…</span>
      </div>
    `;

    cycleBar.insertAdjacentElement('afterend', tabs);

    const rawPanel = document.createElement('section');
    rawPanel.id = 'rawDataPanel';
    rawPanel.className = 'raw-data-panel hidden';
    rawPanel.innerHTML = `
      <div class="raw-data-head">
        <div>
          <span class="raw-kicker">CONSOLIDATED DATA</span>
          <h2>Raw Data Dashboard</h2>
          <p id="rawCycleText">Current reporting month · all five offices + O/o ADG(B)</p>
        </div>
        <div class="raw-head-actions">
          <button class="raw-action-btn primary" id="rawAddItemButton" type="button">+ Head Office · Add Row</button>
          <button class="raw-action-btn" id="rawRefreshButton" type="button">↻ Refresh Raw Data</button>
        </div>
      </div>

      <div class="raw-stat-grid">
        <article class="raw-stat"><span>Raw Data rows</span><strong id="rawItemCount">0</strong></article>
        <article class="raw-stat"><span>Values entered</span><strong id="rawEnteredCount">0</strong></article>
        <article class="raw-stat"><span>Pending cells</span><strong id="rawPendingCount">0</strong></article>
        <article class="raw-stat"><span>Grand total</span><strong id="rawGrandTotal">0</strong></article>
      </div>

      <div class="raw-table-tools">
        <strong>Office-wise Raw Data Matrix</strong>
        <span>Click an office cell to enter or update its value. TOTAL is calculated automatically.</span>
      </div>

      <div id="rawTableContent" class="raw-empty">Open the Raw Data tab to load data.</div>

      <div class="raw-note">
        O/o ADG(B) entries require the Head Office security code. Each sub-office can enter only its own column using its existing office code. Data is kept separately for each month.
      </div>
    `;

    tabs.insertAdjacentElement('afterend', rawPanel);

    const cellModal = document.createElement('div');
    cellModal.id = 'rawCellBackdrop';
    cellModal.className = 'raw-modal-backdrop hidden';
    cellModal.innerHTML = `
      <section class="raw-modal" role="dialog" aria-modal="true" aria-labelledby="rawCellTitle">
        <h3 id="rawCellTitle">Enter Raw Data</h3>
        <p id="rawCellContext"></p>
        <form id="rawCellForm">
          <label class="raw-field">
            <span>Numeric value</span>
            <input id="rawCellValue" type="text" inputmode="decimal" autocomplete="off" placeholder="Enter value" required>
          </label>
          <label class="raw-field">
            <span id="rawCodeLabel">Office security code</span>
            <input id="rawCellCode" type="password" autocomplete="one-time-code" placeholder="Enter security code" required>
          </label>
          <div class="raw-modal-message" id="rawCellMessage"></div>
          <div class="raw-modal-actions">
            <button class="raw-cancel" id="rawCellCancel" type="button">Cancel</button>
            <button class="raw-save" id="rawCellSave" type="submit">Save Value</button>
          </div>
        </form>
      </section>
    `;
    document.body.appendChild(cellModal);

    const itemModal = document.createElement('div');
    itemModal.id = 'rawItemBackdrop';
    itemModal.className = 'raw-modal-backdrop hidden';
    itemModal.innerHTML = `
      <section class="raw-modal" role="dialog" aria-modal="true" aria-labelledby="rawItemTitle">
        <h3 id="rawItemTitle">Add Raw Data Row</h3>
        <p id="rawItemHelp">Head Office can create or edit a particular/row for all six office columns.</p>
        <form id="rawItemForm">
          <label class="raw-field">
            <span>Particular / Raw Data item</span>
            <input id="rawItemName" type="text" maxlength="100" autocomplete="off" placeholder="Example: Number of ongoing works" required>
          </label>
          <label class="raw-field">
            <span>Head Office security code</span>
            <input id="rawItemAdminCode" type="password" autocomplete="one-time-code" placeholder="Enter Head Office code" required>
          </label>
          <div class="raw-modal-message" id="rawItemMessage"></div>
          <div class="raw-modal-actions">
            <button class="raw-cancel" id="rawItemCancel" type="button">Cancel</button>
            <button class="raw-save" id="rawItemSave" type="submit">Add Row</button>
          </div>
        </form>
      </section>
    `;
    document.body.appendChild(itemModal);

    return true;
  }

  function markReportSections() {
    [
      document.querySelector('.stats-grid'),
      document.querySelector('.workspace'),
      document.querySelector('.other-report-note')
    ].forEach(element => {
      if (element) element.dataset.portalReportSection = '1';
    });
  }

  function setPortalTab(tab) {
    const raw = tab === 'raw';
    document.getElementById('reportsTabButton')?.classList.toggle('active', !raw);
    document.getElementById('rawDataTabButton')?.classList.toggle('active', raw);

    document.querySelectorAll('[data-portal-report-section="1"]').forEach(element => {
      element.classList.toggle('hidden', raw);
    });

    document.getElementById('rawDataPanel')?.classList.toggle('hidden', !raw);

    if (raw && !rawState.loaded) {
      loadRawData();
    }
  }

  function bindRawEvents() {
    document.getElementById('reportsTabButton')
      .addEventListener('click', () => setPortalTab('reports'));

    document.getElementById('rawDataTabButton')
      .addEventListener('click', () => setPortalTab('raw'));

    document.getElementById('rawRefreshButton')
      .addEventListener('click', loadRawData);

    document.getElementById('rawAddItemButton')
      .addEventListener('click', openRawItemModal);

    document.getElementById('rawCellCancel')
      .addEventListener('click', closeRawCellModal);

    document.getElementById('rawItemCancel')
      .addEventListener('click', closeRawItemModal);

    document.getElementById('rawCellForm')
      .addEventListener('submit', saveRawCell);

    document.getElementById('rawItemForm')
      .addEventListener('submit', addRawItem);

    document.getElementById('rawCellBackdrop')
      .addEventListener('mousedown', event => {
        if (event.target === event.currentTarget) closeRawCellModal();
      });

    document.getElementById('rawItemBackdrop')
      .addEventListener('mousedown', event => {
        if (event.target === event.currentTarget) closeRawItemModal();
      });

    document.getElementById('rawTableContent')
      .addEventListener('click', event => {
        const subrowButton = event.target.closest('[data-raw-add-subrow="1"]');

        if (subrowButton) {
          openRawSubrowModal(subrowButton.dataset.itemId);
          return;
        }

        const deleteButton = event.target.closest('[data-raw-delete-subrow="1"]');

        if (deleteButton) {
          deleteRawSubrow(deleteButton.dataset.itemId);
          return;
        }

        const editButton = event.target.closest('[data-raw-edit-item="1"]');

        if (editButton) {
          openRawItemEditModal(editButton.dataset.itemId);
          return;
        }

        const button = event.target.closest('[data-raw-cell="1"]');

        if (!button) return;

        openRawCellModal(
          button.dataset.itemId,
          button.dataset.officeId
        );
      });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeRawCellModal();
        closeRawItemModal();
      }
    });
  }

  function updatePortalVersionBadge(backendVersion, status) {
    const backend = document.getElementById('portalBackendVersion');
    const dot = document.getElementById('portalVersionDot');

    if (backend) {
      backend.textContent =
        backendVersion
          ? 'Backend v' + backendVersion
          : 'Backend unavailable';
    }

    if (dot) {
      dot.classList.remove('ok', 'error');

      if (status === 'ok') {
        dot.classList.add('ok');
      } else if (status === 'error') {
        dot.classList.add('error');
      }
    }
  }


  async function loadRawData() {
    const refresh = document.getElementById('rawRefreshButton');

    if (refresh) {
      refresh.disabled = true;
      refresh.textContent = 'Refreshing…';
    }

    rawState.offices = RAW_DEFAULT_OFFICES.slice();
    renderRawFallbackTable('Connecting to Raw Data backend…');

    try {
      const ping = await rawJsonp('ping');

      if (!ping?.ok) {
        throw new Error(
          ping?.message || 'Apps Script backend did not respond correctly.'
        );
      }

      const deployedVersion = String(ping.backendVersion || 'unknown');
      updatePortalVersionBadge(deployedVersion, 'ok');

      if (!ping.supportsRawData) {
        throw new Error(
          'Backend currently deployed is version ' +
          deployedVersion +
          '. It does not contain Raw Data support. Deploy Code.gs V15.18 as a New version.'
        );
      }

      const data = await rawJsonp('rawBootstrap');

      if (!data?.ok) {
        throw new Error(data?.message || 'Could not load Raw Data.');
      }

      rawState.cycleKey = String(data.cycleKey || '');
      rawState.cycleName = String(data.cycleName || '');
      rawState.offices =
        Array.isArray(data.offices) && data.offices.length
          ? data.offices
          : RAW_DEFAULT_OFFICES.slice();
      rawState.items = Array.isArray(data.items) ? data.items : [];
      rawState.values = data.values || {};
      rawState.totals = data.totals || {};
      rawState.grandTotal = Number(data.grandTotal) || 0;
      rawState.enteredCount = Number(data.enteredCount) || 0;
      rawState.totalCells = Number(data.totalCells) || 0;
      rawState.backendVersion = String(
        data.backendVersion || ping.backendVersion || ''
      );
      rawState.loaded = true;
      updatePortalVersionBadge(rawState.backendVersion, 'ok');

      renderRawData();

    } catch (error) {
      rawState.loaded = false;
      rawState.offices = RAW_DEFAULT_OFFICES.slice();
      updatePortalVersionBadge(rawState.backendVersion || '', 'error');

      renderRawFallbackTable(
        error.message || 'Raw Data backend could not be reached.'
      );

    } finally {
      if (refresh) {
        refresh.disabled = false;
        refresh.textContent = '↻ Refresh Raw Data';
      }
    }
  }

  function renderRawFallbackTable(message) {
    const content = document.getElementById('rawTableContent');
    if (!content) return;

    const headers = RAW_DEFAULT_OFFICES
      .map(office =>
        '<th scope="col">' + rawHtml(office.name) + '</th>'
      )
      .join('');

    content.className = 'raw-table-wrap';
    content.innerHTML =
      '<table class="raw-table">' +
        '<thead><tr>' +
          '<th scope="col">Particular / Raw Data Item</th>' +
          headers +
          '<th scope="col">TOTAL</th>' +
        '</tr></thead>' +
        '<tbody><tr>' +
          '<td colspan="' + (RAW_DEFAULT_OFFICES.length + 2) + '" ' +
            'style="padding:28px;text-align:center;color:#b42318;background:#fff;font-weight:700">' +
            rawHtml(message) +
          '</td>' +
        '</tr></tbody>' +
      '</table>';
  }

  function renderRawData() {
    document.getElementById('rawCycleText').textContent =
      (rawState.cycleName || 'Current month') +
      ' · O/o ADG(B) + CE(B) + CE(HAL) + SE&PD + SE(Mysore) + SE(Hubli)' +
      ' · Raw UI ' + RAW_FRONTEND_VERSION +
      (rawState.backendVersion ? ' / Backend ' + rawState.backendVersion : '');

    document.getElementById('rawItemCount').textContent =
      rawState.items.length;

    document.getElementById('rawEnteredCount').textContent =
      rawState.enteredCount;

    document.getElementById('rawPendingCount').textContent =
      Math.max(rawState.totalCells - rawState.enteredCount, 0);

    document.getElementById('rawGrandTotal').textContent =
      rawFormatNumber(rawState.grandTotal);

    const content = document.getElementById('rawTableContent');

    const headers = rawState.offices
      .map(office =>
        '<th scope="col">' + rawHtml(office.name) + '</th>'
      )
      .join('');

    if (!rawState.items.length) {
      content.className = 'raw-table-wrap';
      content.innerHTML =
        '<table class="raw-table">' +
          '<thead><tr>' +
            '<th scope="col">Particular / Raw Data Item</th>' +
            headers +
            '<th scope="col">TOTAL</th>' +
          '</tr></thead>' +
          '<tbody><tr>' +
            '<td colspan="' + (rawState.offices.length + 2) + '" ' +
              'style="padding:26px;text-align:center;color:#637786;background:#fff">' +
              'No Raw Data rows have been created yet. ' +
              '<strong>Head Office · Add Row</strong> can create the first row.' +
            '</td>' +
          '</tr></tbody>' +
        '</table>';
      applyRawAuthPermissions();
      return;
    }

    const rows = rawState.items.map((item, index) => {
      const cells = rawState.offices.map(office => {
        const key = item.id + '__' + office.id;
        const record = rawState.values[key];
        const hasValue =
          record &&
          Number.isFinite(Number(record.value));

        return (
          '<td>' +
            '<button type="button" ' +
              'class="raw-cell-btn ' + (hasValue ? 'filled' : 'empty') + '" ' +
              'data-raw-cell="1" ' +
              'data-item-id="' + rawAttr(item.id) + '" ' +
              'data-office-id="' + rawAttr(office.id) + '" ' +
              'aria-label="' + rawAttr(
                (hasValue ? 'Update ' : 'Enter ') +
                item.name +
                ' for ' +
                office.name
              ) + '">' +
              (hasValue ? rawFormatNumber(record.value) : 'Enter') +
            '</button>' +
          '</td>'
        );
      }).join('');

      const isSubrow = !!item.parentId;

      return (
        '<tr class="' + (isSubrow ? 'raw-subrow-row' : '') + '">' +
          '<th scope="row">' +
            '<div class="raw-item-name-wrap">' +
              '<span class="raw-item-name-text ' + (isSubrow ? 'raw-subrow-name' : '') + '">' +
                '<span style="color:#738099;font-size:9px;margin-right:7px">' +
                  String(index + 1).padStart(2, '0') +
                '</span>' +
                rawHtml(item.name) +
              '</span>' +
              '<span class="raw-item-actions">' +
                (!isSubrow
                  ? '<button type="button" class="raw-subrow-btn" ' +
                      'data-raw-add-subrow="1" ' +
                      'data-item-id="' + rawAttr(item.id) + '" ' +
                      'title="Head Office: add a subrow below this row">＋ Subrow</button>'
                  : '') +
                '<button type="button" class="raw-item-edit-btn" ' +
                  'data-raw-edit-item="1" ' +
                  'data-item-id="' + rawAttr(item.id) + '" ' +
                  'title="Head Office: edit this Raw Data item">✎ Edit</button>' +
                (isSubrow
                  ? '<button type="button" class="raw-subrow-delete-btn" ' +
                      'data-raw-delete-subrow="1" ' +
                      'data-item-id="' + rawAttr(item.id) + '" ' +
                      'title="Head Office: delete this subrow">🗑 Delete</button>'
                  : '') +
              '</span>' +
            '</div>' +
          '</th>' +
          cells +
          '<td class="raw-total-cell">' +
            rawFormatNumber(rawState.totals[item.id] || 0) +
          '</td>' +
        '</tr>'
      );
    }).join('');

    content.className = 'raw-table-wrap';
    content.innerHTML =
      '<table class="raw-table">' +
        '<thead><tr>' +
          '<th scope="col">Particular / Raw Data Item</th>' +
          headers +
          '<th scope="col">TOTAL</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
    applyRawAuthPermissions();
  }

  function openRawCellModal(itemId, officeId) {
    const item = rawState.items.find(entry => entry.id === itemId);
    const office = rawState.offices.find(entry => entry.id === officeId);

    if (!item || !office) return;

    if (!rawAuthCanForOffice('rawEdit', office.id)) {
      window.alert('Your login can view the dashboard but cannot edit this office column.');
      return;
    }

    rawState.activeItem = item;
    rawState.activeOffice = office;

    const existing = rawState.values[item.id + '__' + office.id];

    document.getElementById('rawCellContext').textContent =
      item.name + ' — ' + office.name;

    document.getElementById('rawCellValue').value =
      existing && Number.isFinite(Number(existing.value))
        ? String(existing.value)
        : '';

    const credential = rawSessionCredential('rawEdit', office.id);
    const codeInput = document.getElementById('rawCellCode');
    codeInput.value = credential;

    const codeField = codeInput.closest('.raw-field');
    if (codeField) {
      codeField.classList.toggle('adgb-auth-hidden-code', Boolean(credential));
    }

    document.getElementById('rawCodeLabel').textContent =
      credential ? 'Authenticated login' :
      (office.id === 'HEAD_OFFICE'
        ? 'Head Office security code'
        : office.name + ' security code');

    document.getElementById('rawCellMessage').textContent = '';

    document.getElementById('rawCellBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const input = document.getElementById('rawCellValue');
      input.focus();
      input.select();
    }, 50);
  }

  function closeRawCellModal() {
    const backdrop = document.getElementById('rawCellBackdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;

    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    rawState.activeItem = null;
    rawState.activeOffice = null;
  }

  function openRawItemModal() {
    if (!rawAuthCan('rawStructureManage')) {
      window.alert('Your login does not have permission to manage Raw Data rows.');
      return;
    }


    rawState.activeEditItem = null;
    rawState.activeParentItem = null;

    document.getElementById('rawItemForm').reset();
    document.getElementById('rawItemTitle').textContent = 'Add Raw Data Row';
    document.getElementById('rawItemHelp').textContent =
      'Head Office can create a new particular/row for all six office columns.';
    document.getElementById('rawItemSave').textContent = 'Add Row';
    document.getElementById('rawItemMessage').textContent = '';
    document.getElementById('rawItemBackdrop').classList.remove('hidden');
    applyRawAdminCredential();
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document.getElementById('rawItemName').focus();
    }, 50);
  }

  function openRawItemEditModal(itemId) {
    if (!rawAuthCan('rawStructureManage')) {
      window.alert('Your login does not have permission to manage Raw Data rows.');
      return;
    }


    const item = rawState.items.find(entry => entry.id === itemId);

    if (!item) return;

    rawState.activeEditItem = item;
    rawState.activeParentItem = null;

    document.getElementById('rawItemForm').reset();
    document.getElementById('rawItemTitle').textContent = 'Edit Raw Data Item';
    document.getElementById('rawItemHelp').textContent =
      'Head Office can rename this Raw Data item. Existing office values and totals will be preserved.';
    document.getElementById('rawItemName').value = item.name;
    document.getElementById('rawItemSave').textContent = 'Save Changes';
    document.getElementById('rawItemMessage').textContent = '';
    document.getElementById('rawItemBackdrop').classList.remove('hidden');
    applyRawAdminCredential();
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const input = document.getElementById('rawItemName');
      input.focus();
      input.select();
    }, 50);
  }

  async function deleteRawSubrow(itemId) {
    const item = rawState.items.find(entry => entry.id === itemId);

    if (!item || !item.parentId) return;

    const confirmed = window.confirm(
      'Delete the subrow "' +
      item.name +
      '" from the Raw Data dashboard?\n\n' +
      'Historical office values will remain preserved.'
    );

    if (!confirmed) return;

    let securityCode = rawSessionCredential('rawStructureManage');

    if (!securityCode) {
      window.alert('Your login does not have permission to delete Raw Data subrows.');
      return;
    }

    try {
      await rawPost({
        action: 'adminDeleteRawSubItem',
        itemId: item.id,
        securityCode: securityCode
      });

      await loadRawData();

    } catch (error) {
      const text =
        error.message ||
        'The Raw Data subrow could not be deleted.';

      window.alert(
        /Unsupported operation/i.test(text)
          ? 'The deployed Apps Script does not support subrow deletion. Deploy Code.gs V15.18 as a New version.'
          : text
      );
    }
  }


  function openRawSubrowModal(parentItemId) {
    if (!rawAuthCan('rawStructureManage')) {
      window.alert('Your login does not have permission to manage Raw Data rows.');
      return;
    }


    const parent = rawState.items.find(
      entry => entry.id === parentItemId
    );

    if (!parent || parent.parentId) return;

    rawState.activeEditItem = null;
    rawState.activeParentItem = parent;

    document.getElementById('rawItemForm').reset();
    document.getElementById('rawItemTitle').textContent = 'Add Raw Data Subrow';
    document.getElementById('rawItemHelp').textContent =
      'This subrow will appear immediately below "' +
      parent.name +
      '" and will have all six office columns plus its own TOTAL.';
    document.getElementById('rawItemSave').textContent = 'Add Subrow';
    document.getElementById('rawItemMessage').textContent = '';
    document.getElementById('rawItemBackdrop').classList.remove('hidden');
    applyRawAdminCredential();
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document.getElementById('rawItemName').focus();
    }, 50);
  }


  function closeRawItemModal() {
    const backdrop = document.getElementById('rawItemBackdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;

    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    rawState.activeEditItem = null;
    rawState.activeParentItem = null;
  }

  async function saveRawCell(event) {
    event.preventDefault();

    const item = rawState.activeItem;
    const office = rawState.activeOffice;

    if (!item || !office) return;

    const value = document.getElementById('rawCellValue').value
      .replace(/,/g, '')
      .trim();

    const securityCode =
      document.getElementById('rawCellCode').value.trim();

    const message = document.getElementById('rawCellMessage');
    const button = document.getElementById('rawCellSave');

    if (!value || !Number.isFinite(Number(value))) {
      message.textContent = 'Enter a valid numeric value.';
      return;
    }

    if (!securityCode) {
      message.textContent = 'Enter the security code.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Saving…';
    message.textContent = '';

    try {
      await rawPost({
        action: 'saveRawDataValue',
        itemId: item.id,
        officeId: office.id,
        value: value,
        securityCode: securityCode
      });

      closeRawCellModal();
      await loadRawData();

    } catch (error) {
      const text = error.message || 'The Raw Data value could not be saved.';
      message.textContent = /Unsupported operation/i.test(text)
        ? 'The deployed Apps Script does not support this Raw Data action. Deploy Code.gs V15.18 as a New version.'
        : text;

    } finally {
      button.disabled = false;
      button.textContent = 'Save Value';
    }
  }

  async function addRawItem(event) {
    event.preventDefault();

    const itemName =
      document.getElementById('rawItemName').value
        .replace(/\s+/g, ' ')
        .trim();

    const securityCode =
      document.getElementById('rawItemAdminCode').value.trim();

    const message = document.getElementById('rawItemMessage');
    const button = document.getElementById('rawItemSave');
    const editingItem = rawState.activeEditItem;
    const parentItem = rawState.activeParentItem;

    if (!itemName) {
      message.textContent = 'Enter a Raw Data item name.';
      return;
    }

    if (!securityCode) {
      message.textContent = 'Enter the Head Office security code.';
      return;
    }

    button.disabled = true;
    button.textContent =
      editingItem
        ? 'Saving…'
        : (parentItem ? 'Adding Subrow…' : 'Adding…');
    message.textContent = '';

    try {
      if (editingItem) {
        await rawPost({
          action: 'adminRenameRawItem',
          itemId: editingItem.id,
          itemName: itemName,
          securityCode: securityCode
        });
      } else if (parentItem) {
        await rawPost({
          action: 'adminAddRawSubItem',
          parentItemId: parentItem.id,
          itemName: itemName,
          securityCode: securityCode
        });
      } else {
        await rawPost({
          action: 'adminAddRawItem',
          itemName: itemName,
          securityCode: securityCode
        });
      }

      closeRawItemModal();
      await loadRawData();

    } catch (error) {
      const text =
        error.message ||
        (editingItem
          ? 'The Raw Data item could not be edited.'
          : (parentItem
              ? 'The Raw Data subrow could not be added.'
              : 'The Raw Data row could not be added.'));

      message.textContent = /Unsupported operation/i.test(text)
        ? 'The deployed Apps Script does not support this Raw Data action. Deploy Code.gs V15.18 as a New version.'
        : text;

    } finally {
      button.disabled = false;
      button.textContent =
        rawState.activeEditItem
          ? 'Save Changes'
          : (rawState.activeParentItem ? 'Add Subrow' : 'Add Row');
    }
  }

  function rawJsonp(action, parameters = {}) {
    return new Promise((resolve, reject) => {
      const callback =
        'adgbRawCallback_' +
        rawNonce().replace(/[^A-Za-z0-9_$]/g, '');

      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup(new Error('The Raw Data connection timed out.'));
      }, 20000);

      function cleanup(error, data) {
        clearTimeout(timer);
        try {
          delete window[callback];
        } catch (ignored) {
          window[callback] = undefined;
        }
        script.remove();
        error ? reject(error) : resolve(data);
      }

      window[callback] = data => cleanup(null, data);

      script.onerror = () =>
        cleanup(new Error('The Apps Script Raw Data backend could not be reached.'));

      const query = new URLSearchParams({
        ...parameters,
        action,
        callback,
        _: Date.now()
      });

      script.src = RAW_SCRIPT_URL + '?' + query.toString();
      document.head.appendChild(script);
    });
  }

  function rawPost(payload) {
    return new Promise((resolve, reject) => {
      const requestNonce = rawNonce();
      payload.nonce = requestNonce;

      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const field = document.createElement('textarea');

      frame.name =
        'adgbRawFrame_' +
        requestNonce.replace(/[^A-Za-z0-9]/g, '');

      frame.style.display = 'none';
      form.method = 'POST';
      form.action = RAW_SCRIPT_URL;
      form.target = frame.name;
      form.style.display = 'none';

      field.name = 'payload';
      field.value = JSON.stringify(payload);

      form.appendChild(field);

      let finished = false;
      let pollTimer = null;

      const timeout = setTimeout(() => {
        finish(new Error(
          'The action could not be confirmed. Refresh Raw Data and check whether it was saved.'
        ));
      }, 60000);

      function finish(error, data) {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);

        if (pollTimer) clearTimeout(pollTimer);

        window.removeEventListener('message', onMessage);

        setTimeout(() => {
          form.remove();
          frame.remove();
        }, 0);

        error ? reject(error) : resolve(data);
      }

      function onMessage(event) {
        const packet = event.data;

        if (
          packet?.source !== 'ADGB_PORTAL' ||
          packet?.data?.nonce !== requestNonce
        ) return;

        const data = packet.data;

        if (data.ok) {
          finish(null, data);
        } else {
          finish(new Error(data.message || 'Request failed.'));
        }
      }

      async function pollReceipt() {
        if (finished) return;

        try {
          const receipt = await rawJsonp(
            'receipt',
            { nonce: requestNonce }
          );

          if (receipt && !receipt.pending) {
            if (receipt.ok) {
              finish(null, receipt);
            } else {
              finish(new Error(receipt.message || 'Request failed.'));
            }
            return;
          }

        } catch (ignored) {}

        if (!finished) {
          pollTimer = setTimeout(pollReceipt, 1600);
        }
      }

      window.addEventListener('message', onMessage);
      document.body.append(frame, form);
      form.submit();

      pollTimer = setTimeout(pollReceipt, 1400);
    });
  }


  function activateUltraCompactDashboardHeader() {
    const headerInner = document.querySelector('header .header-inner');
    if (!headerInner) return;

    let compactBar = document.getElementById('adgbCompactMainBar');

    if (!compactBar) {
      compactBar = document.createElement('div');
      compactBar.id = 'adgbCompactMainBar';
      compactBar.className = 'adgb-compact-mainbar';

      const brand = headerInner.querySelector(':scope > .brand');

      if (brand) {
        brand.insertAdjacentElement('afterend', compactBar);
      } else {
        headerInner.prepend(compactBar);
      }
    }

    const cycleBar = document.querySelector('.cycle-bar');
    const cycleMain = cycleBar?.querySelector('.cycle-main');

    if (cycleMain && cycleMain.parentElement !== compactBar) {
      const cycleText = cycleMain.querySelector('strong');

      if (cycleText) {
        cycleText.textContent = cycleText.textContent
          .replace(/\s+submission\s+cycle\s*$/i, '')
          .trim();
      }

      compactBar.appendChild(cycleMain);
    }

    const reportsButton = document.getElementById('reportsTabButton');
    const rawButton = document.getElementById('rawDataTabButton');

    if (reportsButton) {
      reportsButton.textContent = 'Reports';
      compactBar.appendChild(reportsButton);
    }

    if (rawButton) {
      rawButton.textContent = 'Raw Data';
      compactBar.appendChild(rawButton);
    }

    const adminButton = document.getElementById('adminButton');

    if (adminButton) {
      adminButton.textContent = 'Subjects';
      adminButton.title = 'Manage report subjects';
      compactBar.appendChild(adminButton);
    }

    const refreshButton = document.getElementById('refreshButton') ||
      document.querySelector('.cycle-bar .refresh-button');

    if (refreshButton) {
      refreshButton.textContent = '↻';
      refreshButton.title = 'Refresh dashboard';
      compactBar.appendChild(refreshButton);
    }

    /*
     * Move the live report totals into the header.
     * Their existing IDs/elements are preserved, so all existing dashboard
     * update code continues to update the same values.
     */
    const stats = document.querySelector('.stats-grid');
    const userBar = document.getElementById('adgbUserBar');

    if (stats && stats.parentElement !== headerInner) {
      if (userBar?.parentElement === headerInner) {
        headerInner.insertBefore(stats, userBar);
      } else {
        headerInner.appendChild(stats);
      }
    }

    if (userBar && userBar.parentElement === headerInner) {
      headerInner.appendChild(userBar);
    }

    if (cycleBar) {
      cycleBar.classList.add('adgb-compacted-away');
    }

    const portalTabs = document.querySelector('.portal-tabs');
    if (portalTabs) {
      portalTabs.classList.add('adgb-compacted-away');
    }

    /*
     * The old top nav normally contains only the subject Administrator button.
     * Once that button is moved to the compact bar, remove the empty space.
     */
    const topNav = headerInner.querySelector(':scope > nav');
    if (topNav && !topNav.querySelector('button')) {
      topNav.style.display = 'none';
    }
  }

  function initialiseRawDataFeature() {
    if (document.getElementById('rawDataFeatureStyles')) return;

    injectRawStyles();

    if (!injectRawMarkup()) return;

    markReportSections();
    activateUltraCompactDashboardHeader();
    bindRawEvents();
    applyRawAuthPermissions();

    window.addEventListener('adgb-auth-changed', () => {
      setTimeout(() => {
        activateUltraCompactDashboardHeader();
        applyRawAuthPermissions();
      }, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseRawDataFeature);
  } else {
    initialiseRawDataFeature();
  }
})();
