(() => {
  'use strict';

  const RAW_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxaZ8SGgFHK9ONRm4bUTozlsxnF1fDa-qEPjLHZoUDP42FKqJV8hEsOIFJf0GCdWwpXqA/exec';

  const RAW_FRONTEND_VERSION = '15.4';

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
    activeEditItem: null
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
          '. It does not contain Raw Data support. Deploy Code.gs V15.4 as a New version.'
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

      return (
        '<tr>' +
          '<th scope="row">' +
            '<div class="raw-item-name-wrap">' +
              '<span class="raw-item-name-text">' +
                '<span style="color:#738099;font-size:9px;margin-right:7px">' +
                  String(index + 1).padStart(2, '0') +
                '</span>' +
                rawHtml(item.name) +
              '</span>' +
              '<button type="button" class="raw-item-edit-btn" ' +
                'data-raw-edit-item="1" ' +
                'data-item-id="' + rawAttr(item.id) + '" ' +
                'title="Head Office: edit this Raw Data item">✎ Edit</button>' +
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
  }

  function openRawCellModal(itemId, officeId) {
    const item = rawState.items.find(entry => entry.id === itemId);
    const office = rawState.offices.find(entry => entry.id === officeId);

    if (!item || !office) return;

    rawState.activeItem = item;
    rawState.activeOffice = office;

    const existing = rawState.values[item.id + '__' + office.id];

    document.getElementById('rawCellContext').textContent =
      item.name + ' — ' + office.name;

    document.getElementById('rawCellValue').value =
      existing && Number.isFinite(Number(existing.value))
        ? String(existing.value)
        : '';

    document.getElementById('rawCellCode').value = '';

    document.getElementById('rawCodeLabel').textContent =
      office.id === 'HEAD_OFFICE'
        ? 'Head Office security code'
        : office.name + ' security code';

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
    rawState.activeEditItem = null;

    document.getElementById('rawItemForm').reset();
    document.getElementById('rawItemTitle').textContent = 'Add Raw Data Row';
    document.getElementById('rawItemHelp').textContent =
      'Head Office can create a new particular/row for all six office columns.';
    document.getElementById('rawItemSave').textContent = 'Add Row';
    document.getElementById('rawItemMessage').textContent = '';
    document.getElementById('rawItemBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document.getElementById('rawItemName').focus();
    }, 50);
  }

  function openRawItemEditModal(itemId) {
    const item = rawState.items.find(entry => entry.id === itemId);

    if (!item) return;

    rawState.activeEditItem = item;

    document.getElementById('rawItemForm').reset();
    document.getElementById('rawItemTitle').textContent = 'Edit Raw Data Item';
    document.getElementById('rawItemHelp').textContent =
      'Head Office can rename this Raw Data item. Existing office values and totals will be preserved.';
    document.getElementById('rawItemName').value = item.name;
    document.getElementById('rawItemSave').textContent = 'Save Changes';
    document.getElementById('rawItemMessage').textContent = '';
    document.getElementById('rawItemBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const input = document.getElementById('rawItemName');
      input.focus();
      input.select();
    }, 50);
  }

  function closeRawItemModal() {
    const backdrop = document.getElementById('rawItemBackdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;

    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    rawState.activeEditItem = null;
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
        ? 'The deployed Apps Script does not support this Raw Data action. Deploy Code.gs V15.4 as a New version.'
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

    if (!itemName) {
      message.textContent = 'Enter a Raw Data item name.';
      return;
    }

    if (!securityCode) {
      message.textContent = 'Enter the Head Office security code.';
      return;
    }

    button.disabled = true;
    button.textContent = editingItem ? 'Saving…' : 'Adding…';
    message.textContent = '';

    try {
      if (editingItem) {
        await rawPost({
          action: 'adminRenameRawItem',
          itemId: editingItem.id,
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
          : 'The Raw Data row could not be added.');

      message.textContent = /Unsupported operation/i.test(text)
        ? 'The deployed Apps Script does not support this Raw Data action. Deploy Code.gs V15.4 as a New version.'
        : text;

    } finally {
      button.disabled = false;
      button.textContent = rawState.activeEditItem ? 'Save Changes' : 'Add Row';
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

  function initialiseRawDataFeature() {
    if (document.getElementById('rawDataFeatureStyles')) return;

    injectRawStyles();

    if (!injectRawMarkup()) return;

    markReportSections();
    bindRawEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseRawDataFeature);
  } else {
    initialiseRawDataFeature();
  }
})();
