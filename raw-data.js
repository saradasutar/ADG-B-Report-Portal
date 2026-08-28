(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzDXfkgXAd5WMHErA-qHn4ZMcQV-Irx4Yeg-HNgZJKKJ-RpNcAiDbpyJx_4uyJvKwIzxg/exec';
  const FE_VERSION = '15.15';
  const RAW_CORE_URL = 'https://raw.githubusercontent.com/saradasutar/ADG-B-Report-Portal/f2a032a52455ad50f4ccce2f024914c3e60e5b29/raw-data.js';
  const TOKEN_KEY = 'adgbPortalSessionTokenV1515';
  const USERNAME_KEY = 'adgbPortalRememberedUsernameV1515';
  const IDLE_MS = 10 * 60 * 1000;

  const s = {
    token: sessionStorage.getItem(TOKEN_KEY) || '',
    user: null,
    backendVersion: 'checking…',
    idleTimer: null,
    pendingOfficeId: '',
    users: [],
    editingUserId: ''
  };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));

  function nonce() {
    return window.crypto?.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function can(permission) {
    if (!s.user) return false;
    if (s.user.role === 'ADMIN') return true;
    if (permission === 'stickyView' && s.user.permissions?.stickyManage) return true;
    return s.user.permissions?.[permission] === true;
  }

  function canOffice(permission, officeId) {
    if (!can(permission)) return false;
    if (s.user?.role === 'ADMIN' || can('allOffices')) return true;
    return String(s.user?.officeId || '').toUpperCase() === String(officeId || '').toUpperCase();
  }

  window.ADGB_AUTH = {
    get token(){ return s.token; },
    get user(){ return s.user; },
    get role(){ return s.user?.role || ''; },
    get officeId(){ return s.user?.officeId || ''; },
    get permissions(){ return s.user?.permissions || {}; },
    get isAdmin(){ return s.user?.role === 'ADMIN'; },
    can,
    credentialFor(officeId, permission) {
      return canOffice(permission, officeId) && s.token ? 'SESSION:' + s.token : '';
    }
  };

  document.documentElement.classList.add('adgb-auth-locking');

  function jsonp(action, parameters = {}) {
    return new Promise((resolve, reject) => {
      const callback = 'adgbHotfix_' + nonce().replace(/[^A-Za-z0-9_$]/g,'');
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Backend connection timed out.')), 20000);

      function finish(error, data) {
        clearTimeout(timer);
        try { delete window[callback]; } catch { window[callback] = undefined; }
        script.remove();
        error ? reject(error) : resolve(data);
      }

      window[callback] = data => finish(null, data);
      script.onerror = () => finish(new Error('Backend could not be reached.'));
      script.src = API + '?' + new URLSearchParams({
        ...parameters, action, callback, _: Date.now()
      });
      document.head.appendChild(script);
    });
  }

  function post(action, data = {}) {
    return new Promise((resolve, reject) => {
      const requestNonce = nonce();
      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const field = document.createElement('textarea');
      let done = false, pollTimer = null;

      frame.name = 'adgbPost_' + requestNonce.replace(/[^A-Za-z0-9]/g,'');
      frame.style.display = 'none';
      form.method = 'POST';
      form.action = API;
      form.target = frame.name;
      form.style.display = 'none';
      field.name = 'payload';
      field.value = JSON.stringify({action, nonce:requestNonce, ...data});
      form.appendChild(field);

      const timer = setTimeout(() => finish(new Error('The action could not be confirmed.')), 45000);

      function finish(error, result) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (pollTimer) clearTimeout(pollTimer);
        window.removeEventListener('message', onMessage);
        setTimeout(() => { form.remove(); frame.remove(); }, 0);
        error ? reject(error) : resolve(result);
      }

      function onMessage(event) {
        const packet = event.data;
        if (packet?.source !== 'ADGB_PORTAL' || packet?.data?.nonce !== requestNonce) return;
        packet.data.ok
          ? finish(null, packet.data)
          : finish(new Error(packet.data.message || 'Request failed.'));
      }

      async function poll() {
        if (done) return;
        try {
          const receipt = await jsonp('receipt', {nonce:requestNonce});
          if (receipt && !receipt.pending) {
            receipt.ok ? finish(null, receipt) : finish(new Error(receipt.message || 'Request failed.'));
            return;
          }
        } catch {}
        if (!done) pollTimer = setTimeout(poll, 1200);
      }

      window.addEventListener('message', onMessage);
      document.body.append(frame, form);
      form.submit();
      pollTimer = setTimeout(poll, 900);
    });
  }

  function styles() {
    const st = document.createElement('style');
    st.id = 'adgbLoginHotfixStyles';
    st.textContent = `
      html.adgb-auth-locking body>*:not(#adgbLoginHotfix):not(#adgbUsersHotfix){visibility:hidden!important}
      #adgbLoginHotfix{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 15% 20%,rgba(56,189,248,.18),transparent 28%),radial-gradient(circle at 85% 80%,rgba(16,185,129,.15),transparent 30%),linear-gradient(135deg,#eaf5fb,#f9fbfd 50%,#eef8f4)}
      #adgbLoginHotfix[hidden]{display:none!important}
      .al-shell{width:min(900px,100%);display:grid;grid-template-columns:1fr .9fr;overflow:hidden;border:1px solid #cddde7;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(8,47,73,.22)}
      .al-brand{padding:54px;color:#fff;background:linear-gradient(145deg,#073a5b,#075985 50%,#0f766e);display:flex;flex-direction:column;justify-content:center;min-height:500px}.al-mark{width:62px;height:62px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.35);border-radius:19px;background:rgba(255,255,255,.1);font-weight:900;margin-bottom:30px}.al-brand small{color:#bae6fd;font-size:10px;font-weight:900;letter-spacing:.12em}.al-brand h1{margin:9px 0 16px;font:700 40px/1.08 Georgia,serif}.al-brand p{margin:0;color:#d8eff8;font-size:13px;line-height:1.6}
      .al-panel{padding:48px;display:flex;align-items:center}.al-form{width:100%}.al-kicker{color:#087f70;font-size:10px;font-weight:900;letter-spacing:.12em}.al-form h2{margin:8px 0 7px;color:#123b55;font:700 32px Georgia,serif}.al-form>p{margin:0 0 24px;color:#6b7f8b;font-size:12px}.al-field{display:grid;gap:6px;margin:14px 0}.al-field span{color:#36566a;font-size:10px;font-weight:900}.al-field input,.al-field select{height:47px;border:1px solid #cadbe5;border-radius:11px;padding:0 12px;background:#fff;outline:0}.al-field input:focus,.al-field select:focus{border-color:#0ea5e9;box-shadow:0 0 0 4px rgba(14,165,233,.1)}.al-pw{position:relative}.al-pw input{width:100%;padding-right:65px}.al-pw button{position:absolute;right:7px;top:7px;height:33px;border:0;border-radius:8px;padding:0 9px;background:#edf5f8;color:#075985;font-size:9px;font-weight:900}.al-remember{display:flex;align-items:center;gap:7px;color:#607785;font-size:10px;margin:10px 0}.al-error{min-height:20px;color:#b91c1c;font-size:10px;font-weight:900}.al-submit{width:100%;height:49px;border:0;border-radius:11px;background:linear-gradient(135deg,#075985,#0f766e);color:#fff;font-weight:900}.al-versions{display:flex;justify-content:center;gap:6px;margin-top:13px}.al-chip{padding:5px 8px;border:1px solid #c9dbe6;border-radius:999px;background:#f6fafc;color:#547080;font-size:8.5px;font-weight:900}.al-chip b{color:#075985}.al-cache{display:block;margin:9px auto 0;min-height:32px;border:1px solid #d5e1e8;border-radius:9px;padding:0 10px;background:#fff;color:#526b79;font-size:8.5px;font-weight:900}
      #adgbUserHotfix{position:fixed;right:12px;top:72px;z-index:100;display:flex;align-items:center;gap:5px;padding:5px;border:1px solid #cbdbe5;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 7px 20px rgba(30,64,90,.13)}#adgbUserHotfix[hidden]{display:none!important}.au-chip{display:flex;align-items:center;gap:6px;padding:3px 7px}.au-avatar{width:29px;height:29px;display:grid;place-items:center;border-radius:50%;background:#0f766e;color:#fff;font-size:9px;font-weight:900}.au-copy{display:grid}.au-copy strong{max-width:135px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#17394f;font-size:9px}.au-copy small{color:#718590;font-size:7.5px}.au-btn{height:30px;border:1px solid #d4e0e8;border-radius:999px;padding:0 9px;background:#fff;color:#31546a;font-size:8px;font-weight:900}.au-btn.users{color:#51408b;background:#faf7ff}.au-btn.out{color:#9b2532;background:#fff7f8}.adgb-auth-hidden-code{display:none!important}.adgb-role-blocked{opacity:.4!important;cursor:not-allowed!important;filter:grayscale(.4)}
      #adgbUsersHotfix{position:fixed;inset:0;z-index:30100;display:grid;place-items:center;padding:18px;background:rgba(5,28,44,.72)}#adgbUsersHotfix[hidden]{display:none!important}.um-sheet{width:min(980px,100%);max-height:calc(100vh - 36px);overflow:auto;border-radius:17px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.3)}.um-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:15px 17px;border-bottom:1px solid #dbe5eb;background:linear-gradient(105deg,#eef8ff,#f3ecff,#edf9f4)}.um-head h2{margin:0;color:#183f58;font:700 22px Georgia,serif}.um-head p{margin:3px 0 0;color:#667c89;font-size:9px}.um-close{width:33px;height:33px;border:0;border-radius:50%;background:#fff;font-size:19px}.um-body{padding:13px}.um-form{display:grid;grid-template-columns:1.1fr 1.3fr .8fr 1fr 1fr auto;gap:7px;align-items:end;padding:11px;border:1px solid #d8e4eb;border-radius:11px;background:#f9fcfd}.um-form label{display:grid;gap:4px;color:#526b79;font-size:8.5px;font-weight:900}.um-form input,.um-form select{height:35px;border:1px solid #cbdbe5;border-radius:7px;padding:0 8px;background:#fff;font-size:9px}.um-form button{height:35px;border:0;border-radius:7px;padding:0 10px;background:#075985;color:#fff;font-size:9px;font-weight:900}.um-perms{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;padding:8px;border:1px solid #dbe5eb;border-radius:9px;background:#fff}.um-perms label{display:flex;align-items:center;gap:5px;min-height:29px;padding:4px 6px;border:1px solid #e2e9ee;border-radius:7px;background:#fafcfd}.um-perms input{width:13px;height:13px}.um-help,.um-error{grid-column:1/-1;margin:0;font-size:8.5px}.um-help{color:#6b7f8b}.um-error{color:#b91c1c;font-weight:900}.um-list{display:grid;gap:6px;margin-top:10px}.um-row{display:grid;grid-template-columns:1.2fr 1fr .7fr 1.2fr auto;gap:7px;align-items:center;padding:8px 9px;border:1px solid #dce6ec;border-radius:9px}.um-row:nth-child(even){background:#f8fbfd}.um-row strong{font-size:10px;color:#17394f}.um-row small{display:block;color:#718590;font-size:7.5px}.um-row button{height:28px;border:1px solid #cbdbe5;border-radius:6px;padding:0 7px;background:#fff;color:#31546a;font-size:8px;font-weight:900}.um-row button.del{color:#a41414;border-color:#e3a7a7;background:#fff6f6}
      @media(max-width:760px){.al-shell{grid-template-columns:1fr}.al-brand{display:none}.al-panel{padding:30px 22px}.um-form{grid-template-columns:1fr 1fr}.um-perms{grid-template-columns:1fr 1fr}.um-row{grid-template-columns:1fr 1fr}#adgbUserHotfix{top:66px;right:7px;max-width:calc(100vw - 14px)}.au-copy strong{max-width:80px}}
    `;
    document.head.appendChild(st);
  }

  function markup() {
    const login = document.createElement('div');
    login.id = 'adgbLoginHotfix';
    login.innerHTML = `<div class="al-shell"><section class="al-brand"><div class="al-mark">CPWD</div><small>Government of India · CPWD Bengaluru</small><h1>ADG(B) Report<br>Submission Portal</h1><p>Secure access for Head Office, sub-offices and authorised users.</p></section><section class="al-panel"><form class="al-form" id="alForm"><span class="al-kicker">SECURE ACCESS</span><h2>Welcome</h2><p>Enter the username and password assigned by Administrator.</p><label class="al-field"><span>Username</span><input id="alUser" autocomplete="username" required></label><label class="al-field"><span>Password</span><div class="al-pw"><input id="alPass" type="password" autocomplete="current-password" required><button id="alShow" type="button">Show</button></div></label><label class="al-remember"><input id="alRemember" type="checkbox"> Remember username on this device</label><div class="al-error" id="alError"></div><button class="al-submit" id="alSubmit">Sign in</button><div class="al-versions"><span class="al-chip">FE <b>v${FE_VERSION}</b></span><span class="al-chip">BE <b id="alBe">checking…</b></span></div><button class="al-cache" id="alCache" type="button">↻ Clear portal cache</button></form></section></div>`;

    const bar = document.createElement('div');
    bar.id = 'adgbUserHotfix'; bar.hidden = true;
    bar.innerHTML = `<div class="au-chip"><span class="au-avatar" id="auAvatar">U</span><span class="au-copy"><strong id="auName">User</strong><small id="auRole"></small></span></div><span class="al-chip">FE <b>v${FE_VERSION}</b></span><span class="al-chip">BE <b id="auBe">…</b></span><button class="au-btn users" id="auUsers" hidden>Users</button><button class="au-btn out" id="auOut">Sign out</button>`;

    const users = document.createElement('div');
    users.id = 'adgbUsersHotfix'; users.hidden = true;
    users.innerHTML = `<section class="um-sheet"><header class="um-head"><div><h2>Manage portal users</h2><p>Change username, password, office, account status and individual permissions.</p></div><button class="um-close" id="umClose">×</button></header><div class="um-body"><form class="um-form" id="umForm"><label>Username<input id="umUsername" required maxlength="40"></label><label>Display name<input id="umDisplay" required maxlength="80"></label><label>Role<select id="umRole"><option value="VIEWER">Viewer / Other</option><option value="OFFICE">Office</option><option value="ADMIN">Admin</option></select></label><label>Office<select id="umOffice"><option value="">Select</option><option value="HEAD_OFFICE">O/o ADG(B)</option><option value="CEB">CE(B)</option><option value="CEHAL">CE(HAL)</option><option value="SEPD">SE&PD</option><option value="SEMYSORE">SE(Mysore)</option><option value="SEHUBLI">SE(Hubli)</option></select></label><label>Password<input id="umPassword" type="password" minlength="6" placeholder="New user: required"></label><button id="umSave">Add user</button><label style="display:flex;align-items:center;gap:5px"><input id="umActive" type="checkbox" checked style="width:auto;height:auto"> Active</label><button id="umCancel" type="button" hidden>Cancel edit</button><div class="um-perms">${[['reportUpload','Upload/replace reports'],['reportViewFile','Open PDFs'],['reportRemove','Remove reports'],['rawEdit','Edit Raw Data'],['subjectManage','Manage subjects'],['rawStructureManage','Manage Raw rows'],['stickyView','View sticky'],['stickyManage','Manage sticky'],['allOffices','All offices']].map(([k,l])=>`<label><input type="checkbox" data-umperm="${k}"> ${l}</label>`).join('')}</div><p class="um-help">All active users can view the dashboard. Permissions control actions. Office permissions apply to the assigned office unless All offices is enabled.</p><div class="um-error" id="umError"></div></form><div class="um-list" id="umList"></div></div></section>`;
    document.body.append(login, bar, users);
    const remembered = localStorage.getItem(USERNAME_KEY) || '';
    alUser.value = remembered; alRemember.checked = !!remembered;
  }

  function setBe(version) { s.backendVersion = String(version || 'offline').replace(/^v/i,''); alBe.textContent = s.backendVersion === 'offline' ? 'offline' : 'v' + s.backendVersion; auBe.textContent = s.backendVersion === 'offline' ? 'offline' : 'v' + s.backendVersion; }
  function showLogin(message='') { s.user=null;clearTimeout(s.idleTimer);document.documentElement.classList.add('adgb-auth-locking');adgbLoginHotfix.hidden=false;adgbUserHotfix.hidden=true;alError.textContent=message;window.dispatchEvent(new CustomEvent('adgb-auth-changed',{detail:{user:null}})); }
  function signedIn(user) { s.user=user;document.documentElement.classList.remove('adgb-auth-locking');adgbLoginHotfix.hidden=true;adgbUserHotfix.hidden=false;const name=user.displayName||user.username||'User';auAvatar.textContent=name.charAt(0).toUpperCase();auName.textContent=name;auRole.textContent=user.role==='ADMIN'?'Administrator':user.role==='OFFICE'?officeName(user.officeId):'View only';auUsers.hidden=user.role!=='ADMIN';resetIdle();applyPermissions();window.dispatchEvent(new CustomEvent('adgb-auth-changed',{detail:{user}})); }
  async function login(event) { event.preventDefault();alError.textContent='';alSubmit.disabled=true;alSubmit.textContent='Signing in…';try{const result=await post('login',{username:alUser.value.trim(),password:alPass.value});if(result.backendVersion)setBe(result.backendVersion);s.token=String(result.token||'');sessionStorage.setItem(TOKEN_KEY,s.token);alRemember.checked?localStorage.setItem(USERNAME_KEY,alUser.value.trim()):localStorage.removeItem(USERNAME_KEY);alPass.value='';signedIn(result.user)}catch(e){alError.textContent=e.message||'Sign-in failed.'}finally{alSubmit.disabled=false;alSubmit.textContent='Sign in'}}
  async function logout(message='You have been signed out.') { const token=s.token;s.token='';s.user=null;sessionStorage.removeItem(TOKEN_KEY);if(token)post('logout',{sessionToken:token}).catch(()=>{});showLogin(message); }
  function resetIdle(){clearTimeout(s.idleTimer);if(!s.user)return;s.idleTimer=setTimeout(()=>logout('Signed out after 10 minutes of inactivity.'),IDLE_MS)}
  function officeName(id){return{HEAD_OFFICE:'O/o ADG(B)',CEB:'CE(B)',CEHAL:'CE(HAL)',SEPD:'SE&PD',SEMYSORE:'SE(Mysore)',SEHUBLI:'SE(Hubli)'}[String(id||'').toUpperCase()]||''}

  function applyPermissions(){if(!s.user)return;const adminButton=document.getElementById('adminButton');if(adminButton)adminButton.hidden=!can('subjectManage');document.querySelectorAll('[data-upload]').forEach(btn=>{const office=String(btn.dataset.office||'').toUpperCase(),allowed=canOffice('reportUpload',office)||canOffice('reportViewFile',office)||canOffice('reportRemove',office);btn.disabled=!allowed;btn.classList.toggle('adgb-role-blocked',!allowed)});const addRaw=document.getElementById('rawAddItemButton');if(addRaw)addRaw.hidden=!can('rawStructureManage');document.querySelectorAll('[data-raw-edit-item="1"],[data-raw-add-subrow="1"],[data-raw-delete-subrow="1"]').forEach(btn=>btn.hidden=!can('rawStructureManage'));document.querySelectorAll('[data-raw-cell="1"]').forEach(btn=>{const allowed=canOffice('rawEdit',btn.dataset.officeId);btn.disabled=!allowed;btn.classList.toggle('adgb-role-blocked',!allowed)});const badge=document.getElementById('portalVersionBadge');if(badge)badge.querySelectorAll('span').forEach(sp=>{if(/^Frontend v/i.test(sp.textContent||''))sp.textContent='Frontend v'+FE_VERSION})}

  function observePortal(){document.addEventListener('click',event=>{const report=event.target.closest('[data-upload]');if(report)s.pendingOfficeId=String(report.dataset.office||'').toUpperCase();const rawCell=event.target.closest('[data-raw-cell]');if(rawCell)s.pendingOfficeId=String(rawCell.dataset.officeId||'').toUpperCase()},true);const observer=new MutationObserver(()=>{applyPermissions();const upload=document.getElementById('uploadBackdrop');if(upload&&!upload.classList.contains('hidden')&&s.pendingOfficeId){const input=document.getElementById('officeCode'),any=canOffice('reportUpload',s.pendingOfficeId)||canOffice('reportViewFile',s.pendingOfficeId)||canOffice('reportRemove',s.pendingOfficeId);if(input&&any){input.value='SESSION:'+s.token;input.closest('.field')?.classList.add('adgb-auth-hidden-code');const submit=document.getElementById('uploadSubmit'),view=document.getElementById('viewReportButton'),remove=document.getElementById('removeReportButton'),drop=document.getElementById('reportDropZone');if(!canOffice('reportUpload',s.pendingOfficeId)){submit?.classList.add('hidden');drop?.classList.add('hidden')}if(!canOffice('reportViewFile',s.pendingOfficeId))view?.classList.add('hidden');if(!canOffice('reportRemove',s.pendingOfficeId))remove?.classList.add('hidden')}}const admin=document.getElementById('adminBackdrop');if(admin&&!admin.classList.contains('hidden')&&can('subjectManage')){const input=document.getElementById('adminCode'),form=document.getElementById('adminLoginForm');if(input&&form&&document.getElementById('adminPanel')?.classList.contains('hidden')){input.value='SESSION:'+s.token;input.closest('.field')?.classList.add('adgb-auth-hidden-code');setTimeout(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})),10)}}const rawCellModal=document.getElementById('rawCellBackdrop');if(rawCellModal&&!rawCellModal.classList.contains('hidden')&&s.pendingOfficeId&&canOffice('rawEdit',s.pendingOfficeId)){const input=document.getElementById('rawCellCode');if(input){input.value='SESSION:'+s.token;input.closest('.raw-field')?.classList.add('adgb-auth-hidden-code')}}const rawItemModal=document.getElementById('rawItemBackdrop');if(rawItemModal&&!rawItemModal.classList.contains('hidden')&&can('rawStructureManage')){const input=document.getElementById('rawItemAdminCode');if(input){input.value='SESSION:'+s.token;input.closest('.raw-field')?.classList.add('adgb-auth-hidden-code')}}});observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});const nativePrompt=window.prompt.bind(window);window.prompt=function(message,defaultValue){if(/Head Office security code to delete this subrow/i.test(String(message||''))&&can('rawStructureManage')&&s.token)return'SESSION:'+s.token;return nativePrompt(message,defaultValue)}}

  function defaultPerms(role){if(role==='ADMIN')return{reportUpload:true,reportViewFile:true,reportRemove:true,rawEdit:true,subjectManage:true,rawStructureManage:true,stickyView:true,stickyManage:true,allOffices:true};if(role==='OFFICE')return{reportUpload:true,reportViewFile:true,reportRemove:true,rawEdit:true,subjectManage:false,rawStructureManage:false,stickyView:false,stickyManage:false,allOffices:false};return{reportUpload:false,reportViewFile:false,reportRemove:false,rawEdit:false,subjectManage:false,rawStructureManage:false,stickyView:false,stickyManage:false,allOffices:false}}
  function readPerms(){const p={};document.querySelectorAll('[data-umperm]').forEach(i=>p[i.dataset.umperm]=i.checked);return p}function writePerms(p,role){const v={...defaultPerms(role),...(p||{})};document.querySelectorAll('[data-umperm]').forEach(i=>{i.checked=v[i.dataset.umperm]===true;i.disabled=role==='ADMIN'})}
  async function openUsers(){adgbUsersHotfix.hidden=false;document.body.style.overflow='hidden';resetEditor();await loadUsers()}function closeUsers(){adgbUsersHotfix.hidden=true;document.body.style.overflow='';resetEditor()}async function loadUsers(){umList.innerHTML='<div style="padding:15px;color:#6b7f8b">Loading…</div>';try{const r=await post('adminListUsers',{sessionToken:s.token});s.users=Array.isArray(r.users)?r.users:[];renderUsers()}catch(e){umList.innerHTML='<div style="padding:15px;color:#b91c1c">'+esc(e.message)+'</div>'}}function renderUsers(){umList.innerHTML=s.users.map(u=>`<div class="um-row"><span><strong>${esc(u.displayName||u.username)}</strong><small>@${esc(u.username)}</small></span><span>${esc(u.role==='OFFICE'?officeName(u.officeId):u.role==='ADMIN'?'All offices':'Dashboard viewer')}</span><span>${esc(u.role)}</span><span><small>${u.active?'ACTIVE':'INACTIVE'} · ${esc(u.lastLogin||'No login yet')}</small></span><span><button data-uedit="${esc(u.id)}">Edit</button> <button class="del" data-udel="${esc(u.id)}">Delete</button></span></div>`).join('')||'<div style="padding:15px">No users.</div>'}function resetEditor(){s.editingUserId='';umForm.reset();umActive.checked=true;umRole.value='VIEWER';umSave.textContent='Add user';umCancel.hidden=true;umError.textContent='';writePerms(defaultPerms('VIEWER'),'VIEWER')}function editUser(id){const u=s.users.find(x=>x.id===id);if(!u)return;s.editingUserId=id;umUsername.value=u.username||'';umDisplay.value=u.displayName||'';umRole.value=u.role||'VIEWER';umOffice.value=u.officeId||'';umPassword.value='';umPassword.placeholder='Leave blank to keep';umActive.checked=u.active!==false;writePerms(u.permissions,u.role);umSave.textContent='Save';umCancel.hidden=false}async function saveUser(e){e.preventDefault();umError.textContent='';const payload={sessionToken:s.token,userId:s.editingUserId,username:umUsername.value.trim(),displayName:umDisplay.value.trim(),role:umRole.value,officeId:umOffice.value,password:umPassword.value,active:umActive.checked,permissions:readPerms()};if(!payload.userId&&!payload.password){umError.textContent='Enter password for new user.';return}try{await post('adminSaveUser',payload);resetEditor();await loadUsers()}catch(x){umError.textContent=x.message||'Could not save user.'}}async function deleteUser(id){if(!confirm('Delete this user?'))return;try{await post('adminDeleteUser',{sessionToken:s.token,userId:id});await loadUsers()}catch(x){umError.textContent=x.message||'Could not delete user.'}}

  async function clearCache(){try{[localStorage,sessionStorage].forEach(storage=>{const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith('adgb'))keys.push(k)}keys.forEach(k=>storage.removeItem(k))});if('caches'in window)for(const name of await caches.keys())await caches.delete(name);location.replace(location.pathname+'?_fresh='+Date.now())}catch{location.reload(true)}}
  function bind(){alForm.addEventListener('submit',login);alShow.addEventListener('click',()=>{const shown=alPass.type==='text';alPass.type=shown?'password':'text';alShow.textContent=shown?'Show':'Hide'});alCache.addEventListener('click',clearCache);auOut.addEventListener('click',()=>logout());auUsers.addEventListener('click',openUsers);umClose.addEventListener('click',closeUsers);umCancel.addEventListener('click',resetEditor);umForm.addEventListener('submit',saveUser);umRole.addEventListener('change',()=>writePerms(defaultPerms(umRole.value),umRole.value));umList.addEventListener('click',e=>{const a=e.target.closest('[data-uedit]'),d=e.target.closest('[data-udel]');if(a)editUser(a.dataset.uedit);if(d)deleteUser(d.dataset.udel)});['pointerdown','keydown','touchstart','scroll'].forEach(n=>window.addEventListener(n,resetIdle,{passive:true}))}
  function loadRawCore(){const script=document.createElement('script');script.src=RAW_CORE_URL+'?hotfix='+FE_VERSION;script.onload=()=>{applyPermissions();setTimeout(applyPermissions,100)};script.onerror=()=>{alError.textContent='Raw Data interface could not be loaded.'};document.head.appendChild(script)}
  async function init(){styles();markup();bind();observePortal();showLogin();loadRawCore();try{const p=await jsonp('ping');if(p?.backendVersion)setBe(p.backendVersion);else setBe('offline')}catch{setBe('offline')}if(s.token){try{const r=await post('sessionCheck',{sessionToken:s.token});if(r.backendVersion)setBe(r.backendVersion);signedIn(r.user)}catch{s.token='';sessionStorage.removeItem(TOKEN_KEY)}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();