(() => {
  'use strict';

  const STICKY_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUmwkrx1wI1NrFDm6Bsvbcr0SCHSgkKTheN7_fLeVec4-w15D1k_11T8OQ4q4eV3bH5w/exec';
  const STICKY_FRONTEND_VERSION = '15.7';
  const STICKY_ADMIN_SESSION_KEY = 'ADGB_STICKY_ADMIN_CODE';

  const stickyState = {
    active: [],
    completed: [],
    tab: 'active',
    open: false,
    adminCode: sessionStorage.getItem(STICKY_ADMIN_SESSION_KEY) || '',
    adminUnlocked: false,
    editingId: '',
    draggingId: ''
  };

  const COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
  const SIZES = ['small', 'medium', 'large'];

  function injectStickyStyles() {
    if (document.getElementById('stickyTargetReminderStyles')) return;

    const style = document.createElement('style');
    style.id = 'stickyTargetReminderStyles';
    style.textContent = `
      .tr-launcher{
        position:fixed;right:22px;bottom:22px;z-index:9800;
        display:flex;align-items:center;gap:8px;
        min-height:46px;padding:0 16px;border:0;border-radius:999px;
        color:#fff;background:linear-gradient(135deg,#6748a8,#d9802b);
        box-shadow:0 10px 28px rgba(49,42,94,.28);
        font:800 13px/1 Arial,sans-serif;cursor:pointer
      }
      .tr-launcher:hover{transform:translateY(-1px)}
      .tr-launcher-badge{
        min-width:20px;height:20px;padding:0 6px;border-radius:999px;
        display:inline-flex;align-items:center;justify-content:center;
        background:#fff;color:#704d9f;font-size:10px
      }
      .tr-panel{
        position:fixed;right:18px;bottom:78px;z-index:9790;
        width:min(510px,calc(100vw - 24px));max-height:min(78vh,760px);
        display:flex;flex-direction:column;overflow:hidden;
        border:1px solid rgba(79,68,139,.18);border-radius:18px;
        background:#f7f7fb;box-shadow:0 22px 60px rgba(20,35,55,.28);
        transform:translateY(12px) scale(.98);opacity:0;pointer-events:none;
        transition:.18s ease
      }
      .tr-panel.open{transform:none;opacity:1;pointer-events:auto}
      .tr-head{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        padding:14px 15px;color:#fff;
        background:linear-gradient(135deg,#304f85,#6551a7 55%,#128174)
      }
      .tr-head-title{display:flex;flex-direction:column;gap:3px}
      .tr-head-title strong{font-size:17px}
      .tr-head-title span{font-size:10px;opacity:.82}
      .tr-head-actions{display:flex;align-items:center;gap:7px}
      .tr-icon-btn{
        min-height:30px;padding:0 9px;border:1px solid rgba(255,255,255,.3);
        border-radius:8px;background:rgba(255,255,255,.13);color:#fff;
        font-size:10px;font-weight:900;cursor:pointer
      }
      .tr-body{min-height:0;display:flex;flex-direction:column;overflow:hidden}
      .tr-toolbar{
        display:flex;align-items:center;justify-content:space-between;gap:8px;
        padding:9px 11px;border-bottom:1px solid #dce3ea;background:#fff
      }
      .tr-tabs{display:flex;gap:6px}
      .tr-tab{
        min-height:32px;padding:0 11px;border:1px solid #ccd5df;border-radius:8px;
        background:#fff;color:#40566d;font-size:10px;font-weight:900;cursor:pointer
      }
      .tr-tab.active{
        color:#fff;border-color:#5c54a7;
        background:linear-gradient(135deg,#45628e,#6952aa)
      }
      .tr-add-btn{
        min-height:32px;padding:0 11px;border:0;border-radius:8px;
        background:#0d826b;color:#fff;font-size:10px;font-weight:900;cursor:pointer
      }
      .tr-admin-state{
        font-size:9px;font-weight:900;color:#647789
      }
      .tr-admin-state.unlocked{color:#08755f}
      .tr-content{overflow:auto;padding:10px;min-height:120px}
      .tr-board{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;
        align-items:start
      }
      .tr-note{
        position:relative;border-radius:12px;border:1px solid rgba(60,70,90,.13);
        box-shadow:0 5px 14px rgba(28,43,62,.10);overflow:hidden;
        transition:.15s ease
      }
      .tr-note.dragging{opacity:.42;outline:2px dashed #5750a1}
      .tr-note.drag-over{outline:2px solid #2f7a96;transform:translateY(-2px)}
      .tr-note.size-small{grid-column:span 1}
      .tr-note.size-medium{grid-column:span 1;min-height:120px}
      .tr-note.size-large{grid-column:1/-1;min-height:140px}
      .tr-note.yellow{background:#fff4a8}
      .tr-note.pink{background:#ffd9e3}
      .tr-note.blue{background:#dcecff}
      .tr-note.green{background:#dff4d5}
      .tr-note.orange{background:#ffe0b4}
      .tr-note.purple{background:#e5dcff}
      .tr-note-head{
        display:flex;align-items:center;gap:7px;padding:9px 9px 7px;
        border-bottom:1px solid rgba(60,60,80,.10);cursor:pointer
      }
      .tr-drag{cursor:grab;font-size:12px;opacity:.55;user-select:none}
      .tr-note-title{
        flex:1;min-width:0;font-size:12px;font-weight:900;color:#273a50;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap
      }
      .tr-pin{font-size:12px}
      .tr-collapse{font-size:11px;font-weight:900;opacity:.65}
      .tr-note-body{padding:9px}
      .tr-note.collapsed .tr-note-body{display:none}
      .tr-note-text{
        min-height:34px;white-space:pre-wrap;overflow-wrap:anywhere;
        color:#46596b;font-size:11px;line-height:1.42
      }
      .tr-note-meta{margin-top:7px;color:#728190;font-size:8px}
      .tr-actions{
        display:flex;flex-wrap:wrap;gap:5px;margin-top:8px
      }
      .tr-mini{
        min-height:26px;padding:0 7px;border:1px solid rgba(67,75,95,.18);
        border-radius:7px;background:rgba(255,255,255,.66);color:#334b60;
        font-size:8px;font-weight:900;cursor:pointer
      }
      .tr-mini.complete{color:#087258;border-color:#82b9a7}
      .tr-mini.delete{color:#b42318;border-color:#dca5a0}
      .tr-mini.pin-active{color:#6b4da3;border-color:#b9a9d7}
      .tr-empty{
        padding:30px 14px;text-align:center;color:#6d7d8c;
        font-size:11px;font-weight:700
      }
      .tr-completed-list{display:flex;flex-direction:column;gap:8px}
      .tr-completed{
        padding:10px;border-radius:10px;border:1px solid #d8dfe7;background:#fff
      }
      .tr-completed-title{font-size:11px;font-weight:900;color:#31485e}
      .tr-completed-text{margin-top:5px;font-size:10px;color:#637486;white-space:pre-wrap}
      .tr-completed-meta{margin-top:6px;font-size:8px;color:#8a96a2}
      .tr-modal-backdrop{
        position:fixed;inset:0;z-index:9900;display:grid;place-items:center;
        padding:16px;background:rgba(14,29,46,.58)
      }
      .tr-modal-backdrop.hidden{display:none}
      .tr-modal{
        width:min(460px,100%);padding:18px;border-radius:14px;background:#fff;
        box-shadow:0 24px 70px rgba(17,32,50,.35)
      }
      .tr-modal h3{margin:0;color:#304a78;font-size:18px}
      .tr-modal p{margin:5px 0 14px;color:#687a8b;font-size:10px}
      .tr-field{margin-top:10px}
      .tr-field label{display:block;margin-bottom:5px;font-size:10px;font-weight:900;color:#34485d}
      .tr-field input,.tr-field textarea,.tr-field select{
        width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5df;
        border-radius:8px;background:#fff;color:#273a50;font:11px Arial,sans-serif
      }
      .tr-field textarea{min-height:110px;resize:vertical}
      .tr-colors{display:flex;flex-wrap:wrap;gap:8px}
      .tr-color-choice{position:relative}
      .tr-color-choice input{position:absolute;opacity:0;pointer-events:none}
      .tr-color-dot{
        width:30px;height:30px;border:2px solid transparent;border-radius:8px;
        display:block;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(40,50,60,.10)
      }
      .tr-color-choice input:checked + .tr-color-dot{border-color:#283d68;box-shadow:0 0 0 2px #fff,0 0 0 4px #6c62ae}
      .tr-color-dot.yellow{background:#fff078}
      .tr-color-dot.pink{background:#ffc6d7}
      .tr-color-dot.blue{background:#c7e1ff}
      .tr-color-dot.green{background:#cdecc0}
      .tr-color-dot.orange{background:#ffd49b}
      .tr-color-dot.purple{background:#d8c9ff}
      .tr-modal-message{min-height:16px;margin-top:8px;color:#b42318;font-size:10px;font-weight:800}
      .tr-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      .tr-modal-btn{
        min-height:34px;padding:0 13px;border-radius:8px;border:1px solid #ccd5df;
        background:#fff;color:#364b60;font-size:10px;font-weight:900;cursor:pointer
      }
      .tr-modal-btn.primary{border-color:#5d55a7;background:#5d55a7;color:#fff}
      @media(max-width:650px){
        .tr-panel{right:6px;bottom:72px;width:calc(100vw - 12px);max-height:82vh}
        .tr-launcher{right:10px;bottom:12px}
        .tr-board{grid-template-columns:1fr}
        .tr-note.size-small,.tr-note.size-medium,.tr-note.size-large{grid-column:1/-1}
      }
    `;

    document.head.appendChild(style);
  }

  function injectStickyMarkup() {
    if (document.getElementById('targetReminderLauncher')) return;

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.id = 'targetReminderLauncher';
    launcher.className = 'tr-launcher';
    launcher.innerHTML =
      '<span>🎯 Target / Reminder</span>' +
      '<span class="tr-launcher-badge" id="trLauncherCount">0</span>';

    const panel = document.createElement('section');
    panel.id = 'targetReminderPanel';
    panel.className = 'tr-panel';
    panel.setAttribute('aria-label', 'Target and Reminder sticky notes');

    panel.innerHTML = `
      <div class="tr-head">
        <div class="tr-head-title">
          <strong>🎯 Target / Reminder</strong>
          <span>Sticky notes · Frontend v${STICKY_FRONTEND_VERSION}</span>
        </div>
        <div class="tr-head-actions">
          <button class="tr-icon-btn" type="button" id="trAdminButton">🔒 Admin</button>
          <button class="tr-icon-btn" type="button" id="trCloseButton">✕</button>
        </div>
      </div>
      <div class="tr-body">
        <div class="tr-toolbar">
          <div class="tr-tabs">
            <button class="tr-tab active" type="button" id="trActiveTab">Active <span id="trActiveCount">0</span></button>
            <button class="tr-tab" type="button" id="trCompletedTab">Completed <span id="trCompletedCount">0</span></button>
          </div>
          <div style="display:flex;align-items:center;gap:7px">
            <span class="tr-admin-state" id="trAdminState">View mode</span>
            <button class="tr-add-btn" type="button" id="trAddButton" hidden>＋ Add</button>
          </div>
        </div>
        <div class="tr-content" id="trContent">
          <div class="tr-empty">Loading Target / Reminder notes…</div>
        </div>
      </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'trModalBackdrop';
    modal.className = 'tr-modal-backdrop hidden';
    modal.innerHTML = `
      <form class="tr-modal" id="trNoteForm">
        <h3 id="trModalTitle">Add Target / Reminder</h3>
        <p id="trModalHelp">Create an admin-controlled sticky note.</p>

        <div class="tr-field">
          <label for="trNoteTitle">Title</label>
          <input id="trNoteTitle" maxlength="100" required>
        </div>

        <div class="tr-field">
          <label for="trNoteDetails">Details / Reminder</label>
          <textarea id="trNoteDetails" maxlength="1500"></textarea>
        </div>

        <div class="tr-field">
          <label>Colour</label>
          <div class="tr-colors" id="trColorChoices">
            ${COLORS.map((color, index) =>
              '<label class="tr-color-choice">' +
                '<input type="radio" name="trColor" value="' + color + '"' +
                  (index === 0 ? ' checked' : '') + '>' +
                '<span class="tr-color-dot ' + color + '"></span>' +
              '</label>'
            ).join('')}
          </div>
        </div>

        <div class="tr-modal-message" id="trModalMessage"></div>

        <div class="tr-modal-actions">
          <button class="tr-modal-btn" type="button" id="trModalCancel">Cancel</button>
          <button class="tr-modal-btn primary" type="submit" id="trModalSave">Save Note</button>
        </div>
      </form>
    `;

    document.body.append(launcher, panel, modal);
  }

  function bindStickyEvents() {
    document.getElementById('targetReminderLauncher')
      .addEventListener('click', () => setPanelOpen(!stickyState.open));

    document.getElementById('trCloseButton')
      .addEventListener('click', () => setPanelOpen(false));

    document.getElementById('trActiveTab')
      .addEventListener('click', () => {
        stickyState.tab = 'active';
        renderSticky();
      });

    document.getElementById('trCompletedTab')
      .addEventListener('click', () => {
        stickyState.tab = 'completed';
        renderSticky();
      });

    document.getElementById('trAdminButton')
      .addEventListener('click', unlockStickyAdmin);

    document.getElementById('trAddButton')
      .addEventListener('click', openAddModal);

    document.getElementById('trModalCancel')
      .addEventListener('click', closeStickyModal);

    document.getElementById('trNoteForm')
      .addEventListener('submit', saveStickyFromModal);

    document.getElementById('trModalBackdrop')
      .addEventListener('click', event => {
        if (event.target.id === 'trModalBackdrop') closeStickyModal();
      });

    document.getElementById('trContent')
      .addEventListener('click', handleStickyClick);

    document.getElementById('trContent')
      .addEventListener('dragstart', handleDragStart);

    document.getElementById('trContent')
      .addEventListener('dragover', handleDragOver);

    document.getElementById('trContent')
      .addEventListener('drop', handleDrop);

    document.getElementById('trContent')
      .addEventListener('dragend', clearDragStyles);
  }

  function setPanelOpen(value) {
    stickyState.open = !!value;
    document.getElementById('targetReminderPanel')
      .classList.toggle('open', stickyState.open);

    if (stickyState.open) loadStickyNotes();
  }

  async function loadStickyNotes() {
    const content = document.getElementById('trContent');

    if (content) {
      content.innerHTML =
        '<div class="tr-empty">Loading Target / Reminder notes…</div>';
    }

    try {
      const data = await stickyJsonp('stickyBootstrap');

      if (!data?.ok) {
        throw new Error(data?.message || 'Could not load Target / Reminder notes.');
      }

      stickyState.active =
        Array.isArray(data.active) ? data.active : [];

      stickyState.completed =
        Array.isArray(data.completed) ? data.completed : [];

      updateStickyCounts();
      renderSticky();

      if (stickyState.adminCode && !stickyState.adminUnlocked) {
        await verifyStoredAdminCode();
      }
    } catch (error) {
      if (content) {
        content.innerHTML =
          '<div class="tr-empty" style="color:#b42318">' +
          stickyHtml(error.message || 'Target / Reminder backend could not be reached.') +
          '</div>';
      }
    }
  }

  function updateStickyCounts() {
    const activeCount = stickyState.active.length;
    const completedCount = stickyState.completed.length;

    document.getElementById('trLauncherCount').textContent = activeCount;
    document.getElementById('trActiveCount').textContent = activeCount;
    document.getElementById('trCompletedCount').textContent = completedCount;
  }

  function renderSticky() {
    const content = document.getElementById('trContent');
    const activeTab = document.getElementById('trActiveTab');
    const completedTab = document.getElementById('trCompletedTab');

    activeTab.classList.toggle('active', stickyState.tab === 'active');
    completedTab.classList.toggle('active', stickyState.tab === 'completed');

    if (stickyState.tab === 'completed') {
      renderCompletedNotes(content);
      return;
    }

    if (!stickyState.active.length) {
      content.innerHTML =
        '<div class="tr-empty">No active Target / Reminder notes.</div>';
      return;
    }

    content.innerHTML =
      '<div class="tr-board" id="trBoard">' +
      stickyState.active.map(renderActiveNote).join('') +
      '</div>';
  }

  function renderActiveNote(note) {
    const admin = stickyState.adminUnlocked;
    const collapsed = !!note.collapsed;
    const draggable = admin ? 'true' : 'false';

    return (
      '<article class="tr-note ' +
        stickyAttr(note.color) + ' size-' + stickyAttr(note.size) +
        (collapsed ? ' collapsed' : '') +
        '" data-note-id="' + stickyAttr(note.id) + '" draggable="' + draggable + '">' +

        '<div class="tr-note-head" data-action="toggle" data-note-id="' + stickyAttr(note.id) + '">' +
          '<span class="tr-drag" title="Drag to move">☰</span>' +
          '<span class="tr-note-title">' + stickyHtml(note.title) + '</span>' +
          (note.pinned ? '<span class="tr-pin" title="Pinned open above others">📌</span>' : '') +
          '<span class="tr-collapse">' + (collapsed ? '▾' : '▴') + '</span>' +
        '</div>' +

        '<div class="tr-note-body">' +
          '<div class="tr-note-text">' +
            (note.details ? stickyHtml(note.details) : '<span style="opacity:.55">No details</span>') +
          '</div>' +

          '<div class="tr-note-meta">' +
            'Updated ' + stickyDate(note.updatedAt) +
          '</div>' +

          (admin
            ? '<div class="tr-actions">' +
                '<button class="tr-mini" type="button" data-action="edit" data-note-id="' + stickyAttr(note.id) + '">✎ Edit</button>' +
                '<button class="tr-mini complete" type="button" data-action="complete" data-note-id="' + stickyAttr(note.id) + '">✓ Completed</button>' +
                '<button class="tr-mini ' + (note.pinned ? 'pin-active' : '') + '" type="button" data-action="pin" data-note-id="' + stickyAttr(note.id) + '">' +
                  (note.pinned ? '📌 Unpin' : '📌 Pin') +
                '</button>' +
                '<button class="tr-mini" type="button" data-action="smaller" data-note-id="' + stickyAttr(note.id) + '">− Size</button>' +
                '<button class="tr-mini" type="button" data-action="larger" data-note-id="' + stickyAttr(note.id) + '">＋ Size</button>' +
                '<button class="tr-mini" type="button" data-action="up" data-note-id="' + stickyAttr(note.id) + '">↑</button>' +
                '<button class="tr-mini" type="button" data-action="down" data-note-id="' + stickyAttr(note.id) + '">↓</button>' +
                '<button class="tr-mini delete" type="button" data-action="delete" data-note-id="' + stickyAttr(note.id) + '">🗑 Delete</button>' +
              '</div>'
            : '') +
        '</div>' +
      '</article>'
    );
  }

  function renderCompletedNotes(content) {
    if (!stickyState.completed.length) {
      content.innerHTML =
        '<div class="tr-empty">No completed Target / Reminder notes yet.</div>';
      return;
    }

    content.innerHTML =
      '<div class="tr-completed-list">' +
      stickyState.completed.map(note =>
        '<div class="tr-completed ' + stickyAttr(note.color) + '">' +
          '<div class="tr-completed-title">✓ ' + stickyHtml(note.title) + '</div>' +
          (note.details
            ? '<div class="tr-completed-text">' + stickyHtml(note.details) + '</div>'
            : '') +
          '<div class="tr-completed-meta">Completed ' + stickyDate(note.completedAt) + '</div>' +
          (stickyState.adminUnlocked
            ? '<div class="tr-actions">' +
                '<button class="tr-mini" type="button" data-action="restore" data-note-id="' + stickyAttr(note.id) + '">↩ Restore</button>' +
                '<button class="tr-mini delete" type="button" data-action="delete" data-note-id="' + stickyAttr(note.id) + '">🗑 Delete</button>' +
              '</div>'
            : '') +
        '</div>'
      ).join('') +
      '</div>';
  }

  async function unlockStickyAdmin() {
    if (stickyState.adminUnlocked) {
      stickyState.adminUnlocked = false;
      stickyState.adminCode = '';
      sessionStorage.removeItem(STICKY_ADMIN_SESSION_KEY);
      updateAdminUi();
      renderSticky();
      return;
    }

    const code = window.prompt(
      'Enter the Head Office security code to unlock Target / Reminder controls:'
    );

    if (code === null) return;

    if (!code.trim()) {
      window.alert('Head Office security code is required.');
      return;
    }

    try {
      await stickyPost({
        action: 'adminVerify',
        securityCode: code.trim()
      });

      stickyState.adminCode = code.trim();
      stickyState.adminUnlocked = true;
      sessionStorage.setItem(STICKY_ADMIN_SESSION_KEY, stickyState.adminCode);
      updateAdminUi();
      renderSticky();

    } catch (error) {
      stickyState.adminCode = '';
      stickyState.adminUnlocked = false;
      sessionStorage.removeItem(STICKY_ADMIN_SESSION_KEY);
      updateAdminUi();
      window.alert(error.message || 'Head Office security code was not accepted.');
    }
  }

  async function verifyStoredAdminCode() {
    try {
      await stickyPost({
        action: 'adminVerify',
        securityCode: stickyState.adminCode
      });

      stickyState.adminUnlocked = true;
    } catch (ignored) {
      stickyState.adminCode = '';
      stickyState.adminUnlocked = false;
      sessionStorage.removeItem(STICKY_ADMIN_SESSION_KEY);
    }

    updateAdminUi();
    renderSticky();
  }

  function updateAdminUi() {
    const state = document.getElementById('trAdminState');
    const button = document.getElementById('trAdminButton');
    const add = document.getElementById('trAddButton');

    state.textContent = stickyState.adminUnlocked ? 'Admin unlocked' : 'View mode';
    state.classList.toggle('unlocked', stickyState.adminUnlocked);
    button.textContent = stickyState.adminUnlocked ? '🔓 Lock' : '🔒 Admin';
    add.hidden = !stickyState.adminUnlocked;
  }

  function openAddModal() {
    if (!stickyState.adminUnlocked) return;

    stickyState.editingId = '';
    document.getElementById('trNoteForm').reset();
    document.querySelector('input[name="trColor"][value="yellow"]').checked = true;
    document.getElementById('trModalTitle').textContent = 'Add Target / Reminder';
    document.getElementById('trModalHelp').textContent =
      'Create a coloured sticky note. You can pin, collapse, move and resize it later.';
    document.getElementById('trModalSave').textContent = 'Save Note';
    document.getElementById('trModalMessage').textContent = '';
    document.getElementById('trModalBackdrop').classList.remove('hidden');
    document.getElementById('trNoteTitle').focus();
  }

  function openEditModal(noteId) {
    if (!stickyState.adminUnlocked) return;

    const note = findNote(noteId);
    if (!note) return;

    stickyState.editingId = note.id;
    document.getElementById('trNoteTitle').value = note.title;
    document.getElementById('trNoteDetails').value = note.details || '';

    const color = COLORS.includes(note.color) ? note.color : 'yellow';
    const radio = document.querySelector('input[name="trColor"][value="' + color + '"]');
    if (radio) radio.checked = true;

    document.getElementById('trModalTitle').textContent = 'Edit Target / Reminder';
    document.getElementById('trModalHelp').textContent =
      'Edit the text or colour. Existing pin, size and position are preserved.';
    document.getElementById('trModalSave').textContent = 'Save Changes';
    document.getElementById('trModalMessage').textContent = '';
    document.getElementById('trModalBackdrop').classList.remove('hidden');
    document.getElementById('trNoteTitle').focus();
  }

  function closeStickyModal() {
    document.getElementById('trModalBackdrop').classList.add('hidden');
    stickyState.editingId = '';
  }

  async function saveStickyFromModal(event) {
    event.preventDefault();

    if (!stickyState.adminUnlocked) return;

    const title = document.getElementById('trNoteTitle').value.trim();
    const details = document.getElementById('trNoteDetails').value.trim();
    const color =
      document.querySelector('input[name="trColor"]:checked')?.value || 'yellow';

    const message = document.getElementById('trModalMessage');
    const save = document.getElementById('trModalSave');

    if (!title) {
      message.textContent = 'Enter a title.';
      return;
    }

    save.disabled = true;
    message.textContent = '';

    try {
      if (stickyState.editingId) {
        await stickyPost({
          action: 'adminUpdateStickyNote',
          noteId: stickyState.editingId,
          title,
          details,
          color,
          securityCode: stickyState.adminCode
        });
      } else {
        await stickyPost({
          action: 'adminAddStickyNote',
          title,
          details,
          color,
          size: 'medium',
          securityCode: stickyState.adminCode
        });
      }

      closeStickyModal();
      await loadStickyNotes();

    } catch (error) {
      message.textContent = error.message || 'The sticky note could not be saved.';
    } finally {
      save.disabled = false;
    }
  }

  async function handleStickyClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const noteId = button.dataset.noteId;
    const note = findNote(noteId);

    if (!note) return;

    if (action === 'toggle') {
      const newCollapsed = !note.collapsed;
      note.collapsed = newCollapsed;
      renderSticky();

      if (stickyState.adminUnlocked) {
        try {
          await stickyPost({
            action: 'adminUpdateStickyNote',
            noteId,
            collapsed: newCollapsed,
            securityCode: stickyState.adminCode
          });
        } catch (error) {
          await loadStickyNotes();
        }
      }

      return;
    }

    if (!stickyState.adminUnlocked) return;

    if (action === 'edit') {
      openEditModal(noteId);
      return;
    }

    if (action === 'complete') {
      await adminNoteAction(
        'adminCompleteStickyNote',
        noteId,
        'Mark "' + note.title + '" completed?'
      );
      return;
    }

    if (action === 'restore') {
      await adminNoteAction(
        'adminRestoreStickyNote',
        noteId,
        'Restore "' + note.title + '" to active notes?'
      );
      return;
    }

    if (action === 'delete') {
      await adminNoteAction(
        'adminDeleteStickyNote',
        noteId,
        'Delete "' + note.title + '" from the portal?'
      );
      return;
    }

    if (action === 'pin') {
      await updateStickyState(note, {
        pinned: !note.pinned,
        collapsed: note.pinned ? note.collapsed : false
      });
      return;
    }

    if (action === 'smaller' || action === 'larger') {
      const currentIndex = Math.max(0, SIZES.indexOf(note.size));
      const nextIndex =
        action === 'larger'
          ? Math.min(SIZES.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

      await updateStickyState(note, {
        size: SIZES[nextIndex]
      });
      return;
    }

    if (action === 'up' || action === 'down') {
      moveStickyByButton(noteId, action === 'up' ? -1 : 1);
    }
  }

  async function adminNoteAction(action, noteId, confirmation) {
    if (!window.confirm(confirmation)) return;

    try {
      await stickyPost({
        action,
        noteId,
        securityCode: stickyState.adminCode
      });

      await loadStickyNotes();

    } catch (error) {
      window.alert(error.message || 'The Target / Reminder action failed.');
    }
  }

  async function updateStickyState(note, changes) {
    Object.assign(note, changes);
    renderSticky();

    try {
      await stickyPost({
        action: 'adminUpdateStickyNote',
        noteId: note.id,
        ...changes,
        securityCode: stickyState.adminCode
      });

      await loadStickyNotes();

    } catch (error) {
      window.alert(error.message || 'The sticky note could not be updated.');
      await loadStickyNotes();
    }
  }

  function moveStickyByButton(noteId, direction) {
    const index = stickyState.active.findIndex(note => note.id === noteId);
    if (index < 0) return;

    const target = index + direction;
    if (target < 0 || target >= stickyState.active.length) return;

    const list = stickyState.active.slice();
    const moved = list.splice(index, 1)[0];
    list.splice(target, 0, moved);
    stickyState.active = list;
    renderSticky();
    saveStickyOrder();
  }

  function handleDragStart(event) {
    if (!stickyState.adminUnlocked) {
      event.preventDefault();
      return;
    }

    const card = event.target.closest('.tr-note[data-note-id]');
    if (!card) return;

    stickyState.draggingId = card.dataset.noteId;
    card.classList.add('dragging');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', stickyState.draggingId);
    }
  }

  function handleDragOver(event) {
    if (!stickyState.adminUnlocked || !stickyState.draggingId) return;

    const card = event.target.closest('.tr-note[data-note-id]');
    if (!card || card.dataset.noteId === stickyState.draggingId) return;

    event.preventDefault();
    clearDragOver();

    card.classList.add('drag-over');
  }

  function handleDrop(event) {
    if (!stickyState.adminUnlocked || !stickyState.draggingId) return;

    const target = event.target.closest('.tr-note[data-note-id]');
    if (!target) return;

    event.preventDefault();

    const fromId = stickyState.draggingId;
    const toId = target.dataset.noteId;

    if (fromId !== toId) {
      const list = stickyState.active.slice();
      const fromIndex = list.findIndex(note => note.id === fromId);
      const toIndex = list.findIndex(note => note.id === toId);

      if (fromIndex >= 0 && toIndex >= 0) {
        const moved = list.splice(fromIndex, 1)[0];
        list.splice(toIndex, 0, moved);
        stickyState.active = list;
        renderSticky();
        saveStickyOrder();
      }
    }

    clearDragStyles();
  }

  function clearDragOver() {
    document.querySelectorAll('.tr-note.drag-over')
      .forEach(element => element.classList.remove('drag-over'));
  }

  function clearDragStyles() {
    stickyState.draggingId = '';
    document.querySelectorAll('.tr-note.dragging,.tr-note.drag-over')
      .forEach(element => element.classList.remove('dragging', 'drag-over'));
  }

  async function saveStickyOrder() {
    if (!stickyState.adminUnlocked) return;

    try {
      await stickyPost({
        action: 'adminReorderStickyNotes',
        orderedIds: stickyState.active.map(note => note.id),
        securityCode: stickyState.adminCode
      });
    } catch (error) {
      window.alert(error.message || 'Sticky note position could not be saved.');
      await loadStickyNotes();
    }
  }

  function findNote(noteId) {
    return stickyState.active.find(note => note.id === noteId) ||
      stickyState.completed.find(note => note.id === noteId);
  }

  function stickyDate(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function stickyNonce() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function stickyJsonp(action, parameters = {}) {
    return new Promise((resolve, reject) => {
      const callback =
        'adgbStickyCallback_' +
        stickyNonce().replace(/[^A-Za-z0-9_$]/g, '');

      const script = document.createElement('script');

      const timer = setTimeout(() => {
        cleanup(new Error('The Target / Reminder connection timed out.'));
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
        cleanup(new Error('The Apps Script Target / Reminder backend could not be reached.'));

      const query = new URLSearchParams({
        ...parameters,
        action,
        callback,
        _: Date.now()
      });

      script.src = STICKY_SCRIPT_URL + '?' + query.toString();
      document.head.appendChild(script);
    });
  }

  function stickyPost(payload) {
    return new Promise((resolve, reject) => {
      const requestNonce = stickyNonce();
      payload.nonce = requestNonce;

      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const field = document.createElement('textarea');

      frame.name =
        'adgbStickyFrame_' +
        requestNonce.replace(/[^A-Za-z0-9]/g, '');

      frame.style.display = 'none';
      form.method = 'POST';
      form.action = STICKY_SCRIPT_URL;
      form.target = frame.name;
      form.style.display = 'none';

      field.name = 'payload';
      field.value = JSON.stringify(payload);
      form.appendChild(field);

      let finished = false;
      let pollTimer = null;

      const timeout = setTimeout(() => {
        finish(new Error(
          'The Target / Reminder action could not be confirmed. Refresh the notes and check whether it was saved.'
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
          const receipt = await stickyJsonp(
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

  function stickyHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stickyAttr(value) {
    return stickyHtml(value).replace(/`/g, '&#096;');
  }

  function initStickyTargetReminder() {
    injectStickyStyles();
    injectStickyMarkup();
    bindStickyEvents();
    updateAdminUi();
    loadStickyNotes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyTargetReminder);
  } else {
    initStickyTargetReminder();
  }
})();
