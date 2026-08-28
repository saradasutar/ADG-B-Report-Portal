(() => {
"use strict";

const CONFIG = Object.freeze({
  API_URL: "https://script.google.com/macros/s/AKfycbzDXfkgXAd5WMHErA-qHn4ZMcQV-Irx4Yeg-HNgZJKKJ-RpNcAiDbpyJx_4uyJvKwIzxg/exec",
  FRONTEND_VERSION: "15.35",
  REQUEST_TIMEOUT_MS: 45000
});

const STICKY_FOCUS_ID_STORAGE_KEY = "adgbReportStickyFocusIdV159";
const STICKY_FOCUS_COLLAPSED_STORAGE_KEY = "adgbReportStickyFocusCollapsedV159";
const STICKY_FOCUS_LAYOUT_STORAGE_KEY = "adgbReportStickyFocusLayoutV159";
const STICKY_ADMIN_CODE_SESSION_KEY = "adgbReportStickyAdminCodeV159";

const STICKY_FOCUS_SIZES = Object.freeze([
  { className: "size-small", label: "Small" },
  { className: "size-medium", label: "Medium" },
  { className: "size-large", label: "Large" },
  { className: "size-xlarge", label: "X-Large" }
]);

const state = {
  stickyNotes: [],
  stickyEditId: "",
  stickyFocusId: readStickyFocusId(),
  stickyFocusCollapsed: readStickyFocusCollapsed(),
  stickyFocusLayout: readStickyFocusLayout(),
  stickyFocusDrag: null,
  adminCode: sessionStorage.getItem(STICKY_ADMIN_CODE_SESSION_KEY) || "",
  adminUnlocked: false
};

const refs = {};

document.addEventListener("DOMContentLoaded", initExactHrSticky);

function initExactHrSticky() {
  injectExactHrStickyStyles();
  injectExactHrStickyMarkup();

  [
    "stickyNotesButton", "stickyActiveCount", "stickyNotesDialog", "stickyNoteForm",
    "stickyNoteType", "stickyNoteTitle", "stickyNoteDueDate", "stickyNoteDetails",
    "saveStickyNoteButton", "cancelStickyEditButton", "stickyNoteError",
    "stickyActiveSummary", "stickyActiveList", "stickyActiveEmpty",
    "stickyCompletedCount", "stickyCompletedList", "stickyCompletedEmpty", "stickyCompletedSection",
    "stickyFocusNote", "stickyFocusDragHandle", "stickyFocusToggle",
    "stickyFocusType", "stickyFocusTitle", "stickyFocusChevron", "stickyFocusBody",
    "stickyFocusDetails", "stickyFocusDue", "stickyFocusSizeDown",
    "stickyFocusSizeLabel", "stickyFocusSizeUp", "stickyFocusResetLayout",
    "stickyFocusManage", "stickyFocusUnpin", "stickyFocusAdminActions", "stickyFocusEdit", "stickyFocusComplete", "stickyFocusDelete", "stickyAdminUnlock", "stickyAdminHint"
  ].forEach((id) => { refs[id] = document.getElementById(id); });

  refs.stickyNotesButton.addEventListener("click", openStickyNotes);
  refs.stickyNoteForm.addEventListener("submit", saveStickyNote);
  refs.stickyActiveList.addEventListener("click", handleStickyNoteAction);
  refs.stickyCompletedList.addEventListener("click", handleStickyNoteAction);
  refs.cancelStickyEditButton.addEventListener("click", cancelStickyEdit);
  refs.stickyFocusToggle.addEventListener("click", toggleStickyFocus);
  refs.stickyFocusDragHandle.addEventListener("pointerdown", startStickyFocusDrag);
  refs.stickyFocusDragHandle.addEventListener("keydown", moveStickyFocusWithKeyboard);
  window.addEventListener("pointermove", moveStickyFocusDrag);
  window.addEventListener("pointerup", finishStickyFocusDrag);
  window.addEventListener("pointercancel", finishStickyFocusDrag);
  window.addEventListener("resize", clampStickyFocusPosition);
  refs.stickyFocusSizeDown.addEventListener("click", () => changeStickyFocusSize(-1));
  refs.stickyFocusSizeUp.addEventListener("click", () => changeStickyFocusSize(1));
  refs.stickyFocusResetLayout.addEventListener("click", resetStickyFocusLayout);
  refs.stickyFocusManage.addEventListener("click", openStickyNotes);
  refs.stickyFocusUnpin.addEventListener("click", unpinStickyFocus);

  refs.stickyFocusEdit.addEventListener("click", () => {
    if (!state.adminUnlocked || !state.stickyFocusId) return;
    openStickyNotes();
    editStickyNote(state.stickyFocusId);
  });

  refs.stickyFocusComplete.addEventListener("click", () => {
    if (!state.adminUnlocked || !state.stickyFocusId) return;
    completeStickyNote(state.stickyFocusId);
  });

  refs.stickyFocusDelete.addEventListener("click", () => {
    if (!state.adminUnlocked || !state.stickyFocusId) return;
    deleteStickyNote(state.stickyFocusId);
  });

  refs.stickyAdminUnlock.addEventListener("click", toggleStickyAdmin);

  document.querySelectorAll('[data-close-sticky-dialog]').forEach((button) => {
    button.addEventListener("click", () => refs.stickyNotesDialog.close());
  });

  refs.stickyNotesDialog.addEventListener("close", () => {
    document.body.classList.remove("adgb-sticky-drawer-open");
  });

  applyAdminState();
  applyStickyPermissionState();

  if (window.ADGB_AUTH?.user) {
    loadStickyNotes().catch(() => {});
    verifyRememberedAdmin().catch(() => {});
  }
}

function injectExactHrStickyStyles() {
  if (document.getElementById("exactHrStickyStyles")) return;

  const style = document.createElement("style");
  style.id = "exactHrStickyStyles";
  style.textContent = "\n.hr-sticky-launch {\n  position: fixed;\n  right: 18px;\n  bottom: 18px;\n  z-index: 89;\n}\n.hr-sticky-launch .sticky-launch-btn {\n  min-height: 42px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0 14px;\n  border: 1px solid #d8b4fe;\n  border-radius: 12px;\n  font-weight: 800;\n  cursor: pointer;\n  box-shadow: 0 10px 26px rgba(76,29,149,.16);\n}\n.hr-sticky-dialog {\n  padding: 0;\n  border: 0;\n  background: transparent;\n}\n.hr-sticky-dialog::backdrop {\n  background: rgba(15,31,47,.58);\n}\n.hr-sticky-dialog .modal-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 16px;\n}\n.hr-sticky-dialog .modal-close {\n  width: 34px;\n  height: 34px;\n  border: 1px solid rgba(60,65,75,.18);\n  border-radius: 10px;\n  background: rgba(255,255,255,.72);\n  color: #334155;\n  font-size: 20px;\n  font-weight: 800;\n  cursor: pointer;\n}\n.hr-sticky-dialog .modal-footer {\n  display: flex;\n  justify-content: flex-end;\n  border-top: 1px solid #eadfca;\n}\n.hr-sticky-dialog .soft-btn,\n.hr-sticky-dialog .primary-btn {\n  min-height: 38px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 7px;\n  padding: 0 14px;\n  border-radius: 10px;\n  font-weight: 800;\n  cursor: pointer;\n}\n.hr-sticky-dialog .soft-btn {\n  border: 1px solid #d4e1ea;\n  color: #21445b;\n  background: #fff;\n}\n.hr-sticky-dialog .primary-btn {\n  border: 1px solid #0369a1;\n  color: #fff;\n  background: linear-gradient(135deg,#0369a1,#0f766e);\n}\n.hr-sticky-dialog .form-error {\n  min-height: 18px;\n  color: #b91c1c;\n  font-size: 11px;\n  font-weight: 800;\n}\n\n/* Collapsible Targets & Reminders sticky-note organiser */\n.sticky-launch-btn { gap: 6px; color: #4c1d95; border-color: #d8b4fe; background: linear-gradient(145deg, #faf5ff, #f3e8ff); }\n.sticky-launch-btn b { display: grid; place-items: center; min-width: 21px; height: 21px; padding: 0 5px; border-radius: 999px; color: #fff; background: #7c3aed; font-size: 10px; font-weight: 950; }\n.sticky-notes-modal { width: min(960px, calc(100% - 28px)); max-height: calc(100vh - 36px); overflow: hidden; border: 1px solid #d8c9aa; border-radius: 20px; background: #fffdf7; box-shadow: 0 28px 80px rgba(56, 38, 14, .28); }\n.sticky-notes-sheet { display: flex; flex-direction: column; max-height: calc(100vh - 38px); }\n.sticky-notes-header { position: static; padding: 14px 18px; background: linear-gradient(115deg, #fff6c7, #f8edff 58%, #e5f8f3); }\n.sticky-notes-header h2 { color: #4b2b16; font-size: 24px; font-weight: 950; }\n.sticky-notes-header p:last-child { margin: 3px 0 0; color: #6e6257; font-size: 11px; font-weight: 750; }\n.sticky-notes-body { overflow: auto; padding: 13px 16px 18px; }\n.sticky-note-form { display: grid; grid-template-columns: 120px minmax(240px, 1fr) 150px; gap: 9px; align-items: end; padding: 12px; border: 1px solid #dfd1ae; border-radius: 14px; background: rgba(255,255,255,.85); }\n.sticky-form-heading { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; }\n.sticky-form-heading strong { color: #5b3414; font-size: 14px; font-weight: 950; }\n.sticky-form-heading span { color: #7a6e61; font-size: 10px; font-weight: 750; }\n.sticky-note-form label > span, .sticky-colour-field legend { display: block; margin-bottom: 4px; color: #3f5662; font-size: 10px; font-weight: 900; }\n.sticky-note-form input, .sticky-note-form select, .sticky-note-form textarea { width: 100%; border: 1px solid #c9d8da; border-radius: 9px; padding: 8px 9px; color: #153f53; background: #fff; font: inherit; font-size: 12px; font-weight: 750; }\n.sticky-details-field { grid-column: 1 / 3; }\n.sticky-colour-field { grid-column: 1 / -1; margin: 0; padding: 0; border: 0; }\n.sticky-colour-options { display: flex; flex-wrap: wrap; gap: 6px; }\n.sticky-colour-options label { cursor: pointer; }\n.sticky-colour-options input { position: absolute; opacity: 0; pointer-events: none; }\n.sticky-colour-options span { display: inline-flex; align-items: center; padding: 6px 10px; border: 2px solid transparent; border-radius: 999px; color: #263d47; font-size: 10px; font-weight: 900; }\n.sticky-colour-options input:checked + span { border-color: #223f50; box-shadow: 0 0 0 2px #fff inset; }\n.sticky-colour-options .yellow span { background: #fff1a8; }.sticky-colour-options .pink span { background: #ffd5e5; }.sticky-colour-options .blue span { background: #d9efff; }.sticky-colour-options .green span { background: #d9f6df; }.sticky-colour-options .purple span { background: #eadcff; }.sticky-colour-options .orange span { background: #ffe1bd; }\n.sticky-note-form .primary-btn { justify-self: end; min-width: 120px; }\n.sticky-cancel-edit { justify-self: start; padding: 8px 11px; font-size: 10px; }\n.sticky-note-form .form-error { grid-column: 1 / -1; margin: 0; }\n.sticky-active-section { margin-top: 14px; }\n.sticky-section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }\n.sticky-section-heading h3 { margin: 0; color: #173f52; font-size: 16px; font-weight: 950; }\n.sticky-section-heading span { color: #6a7e86; font-size: 10px; font-weight: 850; }\n.sticky-note-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n.sticky-note-card { min-height: 150px; display: flex; flex-direction: column; padding: 13px; border: 1px solid rgba(74,55,20,.14); border-radius: 5px 5px 14px 5px; box-shadow: 0 8px 18px rgba(47,37,19,.11); transform: rotate(-.25deg); }\n.sticky-note-card:nth-child(even) { transform: rotate(.25deg); }\n.sticky-note-card.yellow { background: #fff3a9; }.sticky-note-card.pink { background: #ffd8e7; }.sticky-note-card.blue { background: #d8efff; }.sticky-note-card.green { background: #d8f5df; }.sticky-note-card.purple { background: #eadcff; }.sticky-note-card.orange { background: #ffe0b9; }\n.sticky-note-card header { display: flex; justify-content: space-between; gap: 8px; align-items: center; color: #5b4b35; font-size: 9px; font-weight: 950; text-transform: uppercase; letter-spacing: .04em; }\n.sticky-note-card h4 { margin: 10px 0 5px; color: #173f52; font-size: 15px; font-weight: 950; line-height: 1.25; overflow-wrap: anywhere; }\n.sticky-note-card p { margin: 0; color: #354d58; font-size: 11.5px; font-weight: 750; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }\n.sticky-note-card footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: auto; padding-top: 10px; }\n.sticky-note-card footer small { color: #68777c; font-size: 8.5px; font-weight: 750; }\n.sticky-card-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }\n.sticky-complete-btn, .sticky-mini-btn { padding: 5px 7px; border-radius: 7px; background: rgba(255,255,255,.78); font-size: 8.5px; font-weight: 950; line-height: 1.1; }\n.sticky-complete-btn { border: 1px solid #6cae91; color: #075c45; }\n.sticky-mini-btn.edit { border: 1px solid #8b7ed8; color: #4338a8; }\n.sticky-mini-btn.pin { border: 1px solid #a66a17; color: #77420b; }\n.sticky-mini-btn.pin.is-pinned { color: #fff; border-color: #6d28d9; background: #7c3aed; }\n.sticky-mini-btn.delete { border: 1px solid #e59696; color: #a41414; }\n.sticky-note-card.is-completed { min-height: 118px; opacity: .78; filter: saturate(.7); transform: none; }\n.sticky-note-card.is-completed h4 { text-decoration: line-through; }\n.sticky-completed-section { margin-top: 14px; border: 1px solid #cbdfe0; border-radius: 12px; background: #f5fbfa; }\n.sticky-completed-section summary { display: flex; justify-content: space-between; padding: 11px 13px; color: #315863; cursor: pointer; font-size: 12px; font-weight: 950; }\n.sticky-completed-section summary b { display: grid; place-items: center; min-width: 24px; border-radius: 999px; color: #fff; background: #5d7d82; font-size: 9px; }\n.sticky-completed-section .sticky-note-grid { padding: 0 12px 12px; }\n.sticky-empty { margin: 8px 0 0; padding: 18px; border: 1px dashed #c7d7d8; border-radius: 11px; color: #75888d; text-align: center; font-size: 11px; font-weight: 750; }\n.sticky-notes-modal .modal-footer { position: static; padding: 9px 16px; }\n\n/* One chosen note can remain over the dashboard and collapse from its header. */\n.sticky-focus-note { position: fixed; z-index: 90; right: 20px; bottom: 20px; width: min(350px, calc(100vw - 28px)); overflow: hidden; border: 1px solid rgba(74,55,20,.22); border-radius: 7px 7px 17px 7px; box-shadow: 0 18px 44px rgba(34,32,22,.28); transform: rotate(-.2deg); }\n.sticky-focus-note.size-small { width: min(280px, calc(100vw - 28px)); }.sticky-focus-note.size-medium { width: min(350px, calc(100vw - 28px)); }.sticky-focus-note.size-large { width: min(440px, calc(100vw - 28px)); }.sticky-focus-note.size-xlarge { width: min(540px, calc(100vw - 28px)); }\n.sticky-focus-note.yellow { background: #fff3a9; }.sticky-focus-note.pink { background: #ffd8e7; }.sticky-focus-note.blue { background: #d8efff; }.sticky-focus-note.green { background: #d8f5df; }.sticky-focus-note.purple { background: #eadcff; }.sticky-focus-note.orange { background: #ffe0b9; }\n.sticky-focus-drag-handle { width: 100%; padding: 5px 11px; border: 0; border-bottom: 1px solid rgba(65,71,64,.13); color: #64523a; background: rgba(255,255,255,.32); cursor: grab; touch-action: none; text-align: right; font-size: 8.5px; font-weight: 950; letter-spacing: .04em; text-transform: uppercase; user-select: none; }\n.sticky-focus-drag-handle:active, body.sticky-focus-dragging .sticky-focus-drag-handle { cursor: grabbing; }\n.sticky-focus-toggle { width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 3px 10px; padding: 11px 13px; border: 0; color: #173f52; background: transparent; text-align: left; }\n.sticky-focus-kicker { color: #6c5134; font-size: 9px; font-weight: 950; letter-spacing: .06em; text-transform: uppercase; }\n.sticky-focus-toggle strong { grid-column: 1; overflow-wrap: anywhere; font-size: 15px; font-weight: 950; line-height: 1.25; }\n.sticky-focus-chevron { grid-column: 2; grid-row: 1 / 3; display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid rgba(39,61,71,.2); border-radius: 50%; background: rgba(255,255,255,.58); font-size: 17px; font-weight: 950; }\n.sticky-focus-body { padding: 0 13px 12px; }\n.sticky-focus-body > p { max-height: 180px; overflow: auto; margin: 0; padding-top: 4px; color: #354d58; font-size: 12px; font-weight: 800; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }\n.sticky-focus-note.size-small .sticky-focus-body > p { max-height: 110px; font-size: 11px; }.sticky-focus-note.size-large .sticky-focus-body > p { max-height: 250px; font-size: 13px; }.sticky-focus-note.size-xlarge .sticky-focus-body > p { max-height: 330px; font-size: 14px; }\n.sticky-focus-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(56,70,72,.16); }\n.sticky-focus-footer > span { color: #5f6060; font-size: 9px; font-weight: 900; }\n.sticky-focus-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }\n.sticky-focus-size-controls, .sticky-focus-actions { display: flex; align-items: center; gap: 4px; }\n.sticky-focus-size-controls span { min-width: 38px; color: #555b59; text-align: center; font-size: 8px; font-weight: 950; }\n.sticky-focus-footer button { padding: 5px 7px; border: 1px solid rgba(59,65,72,.22); border-radius: 7px; color: #334155; background: rgba(255,255,255,.7); font-size: 8.5px; font-weight: 950; }\n.sticky-focus-note.is-collapsed .sticky-focus-body { display: none; }\n.sticky-focus-note.is-collapsed .sticky-focus-toggle strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n@media (max-width: 760px) {\n  .sticky-note-form { grid-template-columns: 1fr; }\n  .sticky-form-heading, .sticky-details-field, .sticky-colour-field, .sticky-note-form .form-error { grid-column: 1; }\n  .sticky-form-heading { align-items: flex-start; flex-direction: column; gap: 2px; }\n  .sticky-note-grid { grid-template-columns: 1fr; }\n  .sticky-note-card { min-height: 130px; }\n  .sticky-focus-note { right: 12px; bottom: 12px; }\n  .sticky-focus-note.size-small { width: min(280px, calc(100vw - 24px)); }\n  .sticky-focus-note.size-medium { width: min(350px, calc(100vw - 24px)); }\n  .sticky-focus-note.size-large, .sticky-focus-note.size-xlarge { width: calc(100vw - 24px); }\n}"
;
  style.textContent += `
.hr-sticky-dialog [hidden] { display: none !important; }
.hr-sticky-dialog .sticky-notes-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.hr-sticky-dialog .sticky-header-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}
.hr-sticky-dialog #stickyAdminUnlock {
  min-width: 92px;
  white-space: nowrap;
}
.hr-sticky-dialog .modal-close {
  position: static !important;
  inset: auto !important;
  flex: 0 0 34px;
}
.hr-sticky-dialog .sticky-admin-hint {
  margin: 0 0 10px;
  padding: 9px 11px;
  border: 1px solid #e6d8b9;
  border-radius: 10px;
  color: #705d46;
  background: #fffaf0;
  font-size: 10px;
  font-weight: 850;
}
.hr-sticky-dialog .sticky-admin-hint.unlocked {
  border-color: #9fd2c5;
  color: #0b6b57;
  background: #effbf7;
}
`;

  style.textContent += `
.sticky-card-actions {
  width: 100%;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid rgba(64,72,78,.16);
  display: flex !important;
  flex-wrap: wrap;
  justify-content: flex-start !important;
  gap: 6px !important;
}
.sticky-card-actions .sticky-mini-btn,
.sticky-card-actions .sticky-complete-btn {
  min-height: 29px;
  padding: 0 9px !important;
  font-size: 9px !important;
  font-weight: 950 !important;
  border-radius: 7px;
}
.sticky-card-actions .sticky-complete-btn {
  color: #075c45 !important;
  border: 1px solid #55a37e !important;
  background: #effcf5 !important;
}
.sticky-card-actions .sticky-mini-btn.delete {
  color: #a41414 !important;
  border: 1px solid #dc7777 !important;
  background: #fff1f1 !important;
}
.sticky-card-actions .sticky-mini-btn.edit {
  color: #4338a8 !important;
  border: 1px solid #8b7ed8 !important;
  background: #f7f5ff !important;
}
.sticky-focus-admin-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  width: 100%;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(56,70,72,.16);
}
.sticky-focus-admin-actions[hidden] { display: none !important; }
.sticky-focus-admin-actions button {
  min-height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  font-size: 8.5px;
  font-weight: 950;
  cursor: pointer;
}
.sticky-focus-admin-actions .focus-edit {
  color: #4338a8;
  border: 1px solid #8b7ed8;
  background: rgba(248,246,255,.95);
}
.sticky-focus-admin-actions .focus-complete {
  color: #075c45;
  border: 1px solid #55a37e;
  background: rgba(239,252,245,.96);
}
.sticky-focus-admin-actions .focus-delete {
  color: #a41414;
  border: 1px solid #dc7777;
  background: rgba(255,241,241,.96);
}
`;
  style.textContent += `
/* V15.14 right-side collapsible Target / Reminder panel */
.hr-sticky-launch{
  position:fixed!important;
  right:0!important;
  bottom:auto!important;
  top:52%!important;
  transform:translateY(-50%);
  z-index:94!important;
}
.hr-sticky-launch .sticky-launch-btn{
  width:48px!important;
  min-height:168px!important;
  padding:10px 6px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  border-radius:16px 0 0 16px!important;
  border-right:0!important;
  color:#fff!important;
  border-color:#6950d6!important;
  background:linear-gradient(180deg,#5d48d4,#7449d9)!important;
  box-shadow:0 12px 32px rgba(74,57,170,.28)!important;
}
.hr-sticky-launch .sticky-side-icon{font-size:16px}
.hr-sticky-launch .sticky-side-label{
  writing-mode:vertical-rl;
  transform:rotate(180deg);
  white-space:nowrap;
  font-size:9px;
  font-weight:950;
  letter-spacing:.04em;
}
.hr-sticky-launch .sticky-launch-btn b{
  min-width:24px!important;
  height:24px!important;
  background:#fff!important;
  color:#5d48d4!important;
  font-size:10px!important;
}
.hr-sticky-dialog{
  position:fixed!important;
  inset:0 0 0 auto!important;
  width:min(520px,100vw)!important;
  max-width:100vw!important;
  height:100vh!important;
  max-height:100vh!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  border:0!important;
  border-left:1px solid #d9e1ea!important;
  border-radius:0!important;
  background:#f8fbff!important;
  box-shadow:-24px 0 70px rgba(20,39,70,.22)!important;
}
.hr-sticky-dialog::backdrop{background:transparent!important}
.hr-sticky-dialog .sticky-notes-modal,
.hr-sticky-dialog.sticky-notes-modal{
  width:min(520px,100vw)!important;
  max-height:100vh!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
}
.hr-sticky-dialog .sticky-notes-sheet{
  height:100vh!important;
  max-height:100vh!important;
  background:linear-gradient(180deg,#fbfdff,#f4f7fb)!important;
}
.hr-sticky-dialog .sticky-notes-header{
  position:sticky!important;
  top:0!important;
  z-index:4!important;
  padding:18px 20px!important;
  border-bottom:1px solid #dce4ec!important;
  background:rgba(251,253,255,.97)!important;
  backdrop-filter:blur(12px);
}
.hr-sticky-dialog .sticky-notes-header h2{
  margin-top:4px!important;
  color:#172944!important;
  font-size:25px!important;
}
.hr-sticky-dialog .sticky-notes-header p:last-child{
  max-width:390px;
  color:#718199!important;
  font-size:11px!important;
}
.hr-sticky-dialog .sticky-notes-body{
  flex:1!important;
  overflow:auto!important;
  padding:14px 20px 24px!important;
}
.hr-sticky-dialog .sticky-note-grid{
  grid-template-columns:1fr!important;
  gap:10px!important;
}
.hr-sticky-dialog .sticky-note-card{
  min-height:0!important;
  padding:16px!important;
  border-radius:18px!important;
  transform:none!important;
  box-shadow:0 8px 22px rgba(36,51,76,.08)!important;
}
.hr-sticky-dialog .sticky-note-card:nth-child(even){transform:none!important}
.hr-sticky-dialog .sticky-note-card h4{
  margin:11px 0 7px!important;
  font-size:17px!important;
}
.hr-sticky-dialog .sticky-note-card p{
  font-size:12px!important;
  line-height:1.5!important;
}
.hr-sticky-dialog .sticky-card-actions{
  justify-content:flex-start!important;
  margin-top:11px!important;
}
.hr-sticky-dialog .sticky-completed-section{
  margin-top:22px!important;
  background:#f8fbff!important;
}
.hr-sticky-dialog .sticky-completed-section summary{
  padding:13px 14px!important;
  font-size:13px!important;
}
.hr-sticky-dialog .modal-footer{
  position:sticky!important;
  bottom:0!important;
  z-index:4!important;
  padding:10px 18px!important;
  background:rgba(250,252,255,.96)!important;
  backdrop-filter:blur(10px);
}
@media(max-width:620px){
  .hr-sticky-dialog,
  .hr-sticky-dialog .sticky-notes-modal,
  .hr-sticky-dialog.sticky-notes-modal{width:100vw!important}
  .hr-sticky-launch{top:58%!important}
}
`;
  style.textContent += `
/* V15.19 — right drawer without overlap/overflow */
.hr-sticky-dialog{
  z-index:120!important;
  width:min(500px,100vw)!important;
  max-width:100vw!important;
  overflow-x:hidden!important;
}
.hr-sticky-dialog *,
.hr-sticky-dialog *::before,
.hr-sticky-dialog *::after{
  box-sizing:border-box!important;
}
.hr-sticky-dialog .sticky-notes-sheet,
.hr-sticky-dialog .sticky-notes-body,
.hr-sticky-dialog .sticky-note-form,
.hr-sticky-dialog .sticky-note-grid,
.hr-sticky-dialog .sticky-note-card{
  min-width:0!important;
  max-width:100%!important;
}
.hr-sticky-dialog .sticky-notes-body{
  overflow-x:hidden!important;
}
.hr-sticky-dialog .sticky-note-form{
  width:100%!important;
  grid-template-columns:150px minmax(0,1fr)!important;
  gap:9px!important;
}
.hr-sticky-dialog .sticky-form-heading,
.hr-sticky-dialog .sticky-colour-field,
.hr-sticky-dialog .sticky-note-form .form-error{
  grid-column:1 / -1!important;
}
.hr-sticky-dialog .sticky-title-field{
  grid-column:2!important;
}
.hr-sticky-dialog .sticky-details-field{
  grid-column:2!important;
}
.hr-sticky-dialog .sticky-note-form > label:has(#stickyNoteDueDate){
  grid-column:1!important;
}
.hr-sticky-dialog .sticky-note-form input,
.hr-sticky-dialog .sticky-note-form select,
.hr-sticky-dialog .sticky-note-form textarea{
  min-width:0!important;
  max-width:100%!important;
}
.hr-sticky-dialog .sticky-note-form textarea{
  resize:vertical!important;
}
.hr-sticky-dialog .sticky-note-form .primary-btn{
  justify-self:start!important;
  grid-column:1!important;
}
.hr-sticky-dialog .sticky-cancel-edit{
  justify-self:start!important;
  grid-column:2!important;
}
.hr-sticky-dialog .sticky-card-actions{
  width:100%!important;
  justify-content:flex-start!important;
}
.hr-sticky-dialog .sticky-note-card footer{
  flex-direction:column!important;
  align-items:flex-start!important;
}
.hr-sticky-dialog .sticky-note-card header{
  flex-wrap:wrap!important;
}
.hr-sticky-dialog .sticky-note-card header > *{
  min-width:0!important;
}

/* On wide desktop, reserve real space for the drawer instead of covering the report matrix. */
@media(min-width:1400px){
  body.adgb-sticky-drawer-open{
    box-sizing:border-box!important;
    padding-right:500px!important;
    transition:padding-right .18s ease!important;
  }
  body.adgb-sticky-drawer-open .adgb-user-bar{
    right:514px!important;
    transition:right .18s ease!important;
  }
}

/* Medium desktop: narrower drawer, still fully contained. */
@media(min-width:900px) and (max-width:1399px){
  .hr-sticky-dialog{
    width:min(440px,42vw)!important;
  }
  .hr-sticky-dialog .sticky-note-form{
    grid-template-columns:1fr!important;
  }
  .hr-sticky-dialog .sticky-form-heading,
  .hr-sticky-dialog .sticky-title-field,
  .hr-sticky-dialog .sticky-details-field,
  .hr-sticky-dialog .sticky-colour-field,
  .hr-sticky-dialog .sticky-note-form .form-error,
  .hr-sticky-dialog .sticky-note-form > label:has(#stickyNoteDueDate),
  .hr-sticky-dialog .sticky-note-form .primary-btn,
  .hr-sticky-dialog .sticky-cancel-edit{
    grid-column:1!important;
  }
}

/* Mobile: full-screen drawer with no horizontal scrolling. */
@media(max-width:899px){
  .hr-sticky-dialog{
    width:100vw!important;
  }
  .hr-sticky-dialog .sticky-note-form{
    grid-template-columns:1fr!important;
  }
  .hr-sticky-dialog .sticky-form-heading,
  .hr-sticky-dialog .sticky-title-field,
  .hr-sticky-dialog .sticky-details-field,
  .hr-sticky-dialog .sticky-colour-field,
  .hr-sticky-dialog .sticky-note-form .form-error,
  .hr-sticky-dialog .sticky-note-form > label:has(#stickyNoteDueDate),
  .hr-sticky-dialog .sticky-note-form .primary-btn,
  .hr-sticky-dialog .sticky-cancel-edit{
    grid-column:1!important;
  }
}
`;
  style.textContent += `
    /* V15.31 special Target / Reminder identity */
    .hr-sticky-launch .sticky-launch-btn{
      background:linear-gradient(180deg,#7448e8,#5a49c8 55%,#2e7ac4)!important;
      border-color:#7457df!important;
      box-shadow:0 12px 30px rgba(83,61,190,.28)!important;
    }
    .hr-sticky-launch .sticky-launch-btn:hover{
      filter:brightness(1.06)!important;
      box-shadow:0 14px 34px rgba(83,61,190,.34)!important;
    }
    .hr-sticky-dialog .sticky-notes-header{
      border-top:4px solid #6950d6!important;
      background:linear-gradient(100deg,#faf8ff,#f1f7ff 55%,#ecfbf5)!important;
    }
    .hr-sticky-dialog .sticky-notes-header .eyebrow{color:#6048bc!important}

    /* V15.32 — Target / Reminder readability */
    .hr-sticky-launch .sticky-side-label{
      font-size:10px!important;
      font-weight:1000!important;
    }
    .hr-sticky-dialog .sticky-notes-header h2{
      font-size:26px!important;
      font-weight:950!important;
    }
    .sticky-section-heading h3{
      font-size:17px!important;
      font-weight:950!important;
    }
    .sticky-note-card h4{
      font-size:16px!important;
      font-weight:1000!important;
    }
    .sticky-note-card p{
      font-size:12.5px!important;
      font-weight:800!important;
    }
    .sticky-note-card footer small{
      font-size:9px!important;
      font-weight:800!important;
    }
    .sticky-complete-btn,
    .sticky-mini-btn{
      padding:6px 8px!important;
      font-size:9.5px!important;
      font-weight:1000!important;
    }
    .sticky-note-form label,
    .sticky-note-form .form-label{
      font-size:10.5px!important;
      font-weight:950!important;
    }
    .sticky-note-form input,
    .sticky-note-form select,
    .sticky-note-form textarea{
      font-size:12px!important;
      font-weight:700!important;
    }
    .sticky-note-form .primary-btn,
    .sticky-cancel-edit{
      font-size:10.5px!important;
      font-weight:950!important;
    }
  `;
  document.head.appendChild(style);
}

function injectExactHrStickyMarkup() {
  if (document.getElementById("stickyNotesButton")) return;

  const launcher = document.createElement("div");
  launcher.className = "hr-sticky-launch";
  launcher.innerHTML = `
    <button id="stickyNotesButton" class="soft-btn sticky-launch-btn" type="button" aria-haspopup="dialog" title="Open Target / Reminder">
      <span class="sticky-side-icon" aria-hidden="true">✦</span>
      <span class="sticky-side-label">Target / Reminder</span>
      <b id="stickyActiveCount">0</b>
    </button>
  `;

  const focus = document.createElement("aside");
  focus.id = "stickyFocusNote";
  focus.className = "sticky-focus-note yellow";
  focus.setAttribute("aria-label", "Pinned target or reminder");
  focus.hidden = true;
  focus.innerHTML = `
    <button id="stickyFocusDragHandle" class="sticky-focus-drag-handle" type="button" title="Drag to move, or use keyboard arrow keys">⠿ Move note</button>
    <button id="stickyFocusToggle" class="sticky-focus-toggle" type="button" aria-expanded="true" title="Collapse or open this sticky note">
      <span class="sticky-focus-kicker">📌 <span id="stickyFocusType">Reminder</span></span>
      <strong id="stickyFocusTitle">Target or reminder</strong>
      <span id="stickyFocusChevron" class="sticky-focus-chevron" aria-hidden="true">−</span>
    </button>
    <div id="stickyFocusBody" class="sticky-focus-body">
      <p id="stickyFocusDetails"></p>
      <div class="sticky-focus-footer">
        <span id="stickyFocusDue">No due date</span>
        <div class="sticky-focus-tools">
          <div class="sticky-focus-size-controls" aria-label="Sticky note size">
            <button id="stickyFocusSizeDown" type="button" title="Decrease sticky note size">A−</button>
            <span id="stickyFocusSizeLabel">Medium</span>
            <button id="stickyFocusSizeUp" type="button" title="Increase sticky note size">A+</button>
          </div>
          <div class="sticky-focus-actions">
            <button id="stickyFocusResetLayout" type="button" title="Restore original size and position">Reset</button>
            <button id="stickyFocusManage" type="button">Open all</button>
            <button id="stickyFocusUnpin" type="button">Unpin</button>
          </div>
          <div id="stickyFocusAdminActions" class="sticky-focus-admin-actions" hidden>
            <button id="stickyFocusEdit" class="focus-edit" type="button">✎ Edit</button>
            <button id="stickyFocusComplete" class="focus-complete" type="button">✓ Completed</button>
            <button id="stickyFocusDelete" class="focus-delete" type="button">🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const dialog = document.createElement("dialog");
  dialog.id = "stickyNotesDialog";
  dialog.className = "hr-sticky-dialog modal sticky-notes-modal";
  dialog.innerHTML = `
    <div class="sticky-notes-sheet">
      <header class="modal-header sticky-notes-header">
        <div>
          <p class="eyebrow accent">RIGHT UTILITY PANEL</p>
          <h2>Target / Reminder</h2>
          <p>Targets and reminders stay in a collapsible side panel without occupying dashboard space.</p>
        </div>
        <div class="sticky-header-actions">
          <button id="stickyAdminUnlock" class="soft-btn" type="button">🔒 Admin</button>
          <button class="modal-close" type="button" data-close-sticky-dialog aria-label="Close targets and reminders">×</button>
        </div>
      </header>
      <div class="sticky-notes-body">
        <p id="stickyAdminHint" class="sticky-admin-hint">
          View mode · Editing is controlled by the permissions assigned by Administrator.
        </p>
        <form id="stickyNoteForm" class="sticky-note-form" hidden>
          <div class="sticky-form-heading">
            <strong>Add a sticky note</strong>
            <span>Saved in the Report Portal spreadsheet</span>
          </div>
          <label><span>Type</span>
            <select id="stickyNoteType"><option>Reminder</option><option>Target</option></select>
          </label>
          <label class="sticky-title-field"><span>Title *</span>
            <input id="stickyNoteTitle" maxlength="100" required placeholder="Enter target or reminder">
          </label>
          <label><span>Due date</span>
            <input id="stickyNoteDueDate" type="date">
          </label>
          <label class="sticky-details-field"><span>Details</span>
            <textarea id="stickyNoteDetails" maxlength="500" rows="2" placeholder="Optional details"></textarea>
          </label>
          <fieldset class="sticky-colour-field">
            <legend>Colour</legend>
            <div class="sticky-colour-options">
              <label class="yellow"><input type="radio" name="stickyColour" value="yellow" checked><span>Yellow</span></label>
              <label class="pink"><input type="radio" name="stickyColour" value="pink"><span>Pink</span></label>
              <label class="blue"><input type="radio" name="stickyColour" value="blue"><span>Blue</span></label>
              <label class="green"><input type="radio" name="stickyColour" value="green"><span>Green</span></label>
              <label class="purple"><input type="radio" name="stickyColour" value="purple"><span>Purple</span></label>
              <label class="orange"><input type="radio" name="stickyColour" value="orange"><span>Orange</span></label>
            </div>
          </fieldset>
          <button id="saveStickyNoteButton" class="primary-btn" type="submit">Save note</button>
          <button id="cancelStickyEditButton" class="soft-btn sticky-cancel-edit" type="button" hidden>Cancel edit</button>
          <p id="stickyNoteError" class="form-error" role="alert"></p>
        </form>

        <section class="sticky-active-section">
          <div class="sticky-section-heading">
            <h3>Active</h3><span id="stickyActiveSummary">0 notes</span>
          </div>
          <div id="stickyActiveList" class="sticky-note-grid"></div>
          <p id="stickyActiveEmpty" class="sticky-empty">No active targets or reminders.</p>
        </section>

        <details id="stickyCompletedSection" class="sticky-completed-section">
          <summary><span>Completed history</span><b id="stickyCompletedCount">0</b></summary>
          <div id="stickyCompletedList" class="sticky-note-grid completed"></div>
          <p id="stickyCompletedEmpty" class="sticky-empty">No completed notes yet.</p>
        </details>
      </div>
      <footer class="modal-footer">
        <button class="soft-btn" type="button" data-close-sticky-dialog>Close</button>
      </footer>
    </div>
  `;

  document.body.append(launcher, focus, dialog);
}

async function openStickyNotes() {
  refs.stickyNoteError.textContent = "";

  document.body.classList.add("adgb-sticky-drawer-open");

  if (!refs.stickyNotesDialog.open) {
    refs.stickyNotesDialog.show();
  }

  try {
    await loadStickyNotes();
  } catch (error) {
    refs.stickyNoteError.textContent = friendlyError(error);
  }
}

async function loadStickyNotes() {
  if (!window.ADGB_AUTH?.token) return;

  const canView =
    window.ADGB_AUTH?.can?.("stickyView") ||
    window.ADGB_AUTH?.can?.("stickyManage");

  if (!canView) {
    state.stickyNotes = [];
    renderStickyNotes();
    return;
  }

  const response = await apiGet("stickyBootstrap", {
    sessionToken: window.ADGB_AUTH.token
  });

  state.stickyNotes = Array.isArray(response.notes) ? response.notes : [];
  renderStickyNotes();
}

function renderStickyNotes() {
  const active = state.stickyNotes.filter((note) => note.status !== "Completed");
  const completed = state.stickyNotes.filter((note) => note.status === "Completed");

  refs.stickyActiveCount.textContent = String(active.length);
  refs.stickyActiveSummary.textContent =
    `${active.length} active note${active.length === 1 ? "" : "s"}`;
  refs.stickyCompletedCount.textContent = String(completed.length);
  refs.stickyActiveEmpty.hidden = active.length > 0;
  refs.stickyCompletedEmpty.hidden = completed.length > 0;
  refs.stickyActiveList.innerHTML =
    active.map((note) => stickyNoteMarkup(note, false)).join("");
  refs.stickyCompletedList.innerHTML =
    completed.map((note) => stickyNoteMarkup(note, true)).join("");

  renderStickyFocusNote();
}

function stickyNoteMarkup(note, completed) {
  const colour =
    ["yellow","pink","blue","green","purple","orange"].includes(note.colour)
      ? note.colour
      : "yellow";

  const due = note.dueDate
    ? `<span class="sticky-due">Due ${escapeHtml(formatDate(note.dueDate))}</span>`
    : '<span class="sticky-due no-date">No due date</span>';

  const completedMeta = completed
    ? `<small>Completed ${escapeHtml(note.completedAt || "")} ${note.completedBy ? `by ${escapeHtml(note.completedBy)}` : ""}</small>`
    : "";

  const pinAction = completed
    ? ""
    : `<button class="sticky-mini-btn pin${state.stickyFocusId === note.id ? " is-pinned" : ""}" type="button" data-pin-sticky-note="${escapeAttribute(note.id)}" aria-pressed="${state.stickyFocusId === note.id}">📌 ${state.stickyFocusId === note.id ? "Pinned" : "Keep open"}</button>`;

  const adminActions = state.adminUnlocked
    ? `${completed
        ? `<button class="sticky-mini-btn edit" type="button" data-restore-sticky-note="${escapeAttribute(note.id)}">↩ Restore</button>`
        : `<button class="sticky-mini-btn edit" type="button" data-edit-sticky-note="${escapeAttribute(note.id)}">✎ Edit</button><button class="sticky-complete-btn" type="button" data-complete-sticky-note="${escapeAttribute(note.id)}">✓ Completed</button>`}
       <button class="sticky-mini-btn delete" type="button" data-delete-sticky-note="${escapeAttribute(note.id)}">🗑 Delete</button>`
    : "";

  const actions =
    pinAction || adminActions
      ? `<div class="sticky-card-actions">${pinAction}${adminActions}</div>`
      : "";

  return `<article class="sticky-note-card ${colour}${completed ? " is-completed" : ""}">
    <header><span>${escapeHtml(note.type || "Reminder")}</span>${due}</header>
    <h4>${escapeHtml(note.title || "Untitled note")}</h4>
    ${note.details ? `<p>${escapeHtml(note.details)}</p>` : ""}
    <footer>${completedMeta}${actions}</footer>
  </article>`;
}

async function saveStickyNote(event) {
  event.preventDefault();
  refs.stickyNoteError.textContent = "";

  if (!state.adminUnlocked) {
    refs.stickyNoteError.textContent =
      "Unlock Head Office admin controls first.";
    return;
  }

  const colourInput =
    refs.stickyNoteForm.querySelector('input[name="stickyColour"]:checked');

  const note = {
    noteId: state.stickyEditId,
    type: refs.stickyNoteType.value,
    title: refs.stickyNoteTitle.value.trim(),
    details: refs.stickyNoteDetails.value.trim(),
    dueDate: refs.stickyNoteDueDate.value,
    colour: colourInput ? colourInput.value : "yellow",
    securityCode: state.adminCode
  };

  if (!note.title) {
    refs.stickyNoteError.textContent =
      "Enter a title for the target or reminder.";
    refs.stickyNoteTitle.focus();
    return;
  }

  const wasEditing = Boolean(state.stickyEditId);
  setButtonBusy(
    refs.saveStickyNoteButton,
    true,
    wasEditing ? "Updating…" : "Saving…"
  );

  try {
    const action = wasEditing
      ? "adminUpdateStickyNote"
      : "adminAddStickyNote";

    const response = await apiPost(action, note);
    state.stickyNotes = Array.isArray(response.notes)
      ? response.notes
      : state.stickyNotes;

    refs.stickyNoteForm.reset();
    const yellow =
      refs.stickyNoteForm.querySelector('input[name="stickyColour"][value="yellow"]');
    if (yellow) yellow.checked = true;

    state.stickyEditId = "";
    updateStickyFormMode();
    renderStickyNotes();
    showToast(wasEditing ? "Sticky note updated." : "Sticky note saved.");

  } catch (error) {
    refs.stickyNoteError.textContent = friendlyError(error);
  } finally {
    setButtonBusy(
      refs.saveStickyNoteButton,
      false,
      state.stickyEditId ? "Update note" : "Save note"
    );
  }
}

function handleStickyNoteAction(event) {
  const editButton = event.target.closest("[data-edit-sticky-note]");
  const completeButton = event.target.closest("[data-complete-sticky-note]");
  const deleteButton = event.target.closest("[data-delete-sticky-note]");
  const pinButton = event.target.closest("[data-pin-sticky-note]");
  const restoreButton = event.target.closest("[data-restore-sticky-note]");

  if (pinButton) {
    pinStickyFocus(pinButton.dataset.pinStickyNote);
    return;
  }

  if (editButton) {
    if (!state.adminUnlocked) return;
    editStickyNote(editButton.dataset.editStickyNote);
    return;
  }

  if (completeButton) {
    if (!state.adminUnlocked) return;
    completeStickyNote(completeButton.dataset.completeStickyNote);
    return;
  }

  if (restoreButton) {
    if (!state.adminUnlocked) return;
    restoreStickyNote(restoreButton.dataset.restoreStickyNote);
    return;
  }

  if (deleteButton) {
    if (!state.adminUnlocked) return;
    deleteStickyNote(deleteButton.dataset.deleteStickyNote);
  }
}

function editStickyNote(id) {
  const note = state.stickyNotes.find((item) => item.id === id);
  if (!note) return;

  state.stickyEditId = id;
  refs.stickyNoteType.value = note.type || "Reminder";
  refs.stickyNoteTitle.value = note.title || "";
  refs.stickyNoteDueDate.value = note.dueDate || "";
  refs.stickyNoteDetails.value = note.details || "";

  const colour =
    ["yellow","pink","blue","green","purple","orange"].includes(note.colour)
      ? note.colour
      : "yellow";

  const radio =
    refs.stickyNoteForm.querySelector(
      `input[name="stickyColour"][value="${colour}"]`
    );

  if (radio) radio.checked = true;

  updateStickyFormMode();
  refs.stickyNoteTitle.focus();
}

function cancelStickyEdit() {
  state.stickyEditId = "";
  refs.stickyNoteForm.reset();
  const yellow =
    refs.stickyNoteForm.querySelector('input[name="stickyColour"][value="yellow"]');
  if (yellow) yellow.checked = true;
  refs.stickyNoteError.textContent = "";
  updateStickyFormMode();
}

function updateStickyFormMode() {
  const editing = Boolean(state.stickyEditId);
  const heading = refs.stickyNoteForm.querySelector(".sticky-form-heading strong");

  if (heading) {
    heading.textContent = editing
      ? "Edit sticky note"
      : "Add a sticky note";
  }

  refs.saveStickyNoteButton.textContent =
    editing ? "Update note" : "Save note";
  refs.cancelStickyEditButton.hidden = !editing;
}

async function completeStickyNote(id) {
  if (!confirm(
    "Mark this Target / Reminder Completed?\n\n" +
    "It will be removed from Active but saved permanently in Completed history."
  )) return;

  try {
    const response = await apiPost("adminCompleteStickyNote", {
      noteId: id,
      securityCode: state.adminCode
    });

    state.stickyNotes = response.notes || [];

    if (state.stickyFocusId === id) {
      unpinStickyFocus(false);
    }

    renderStickyNotes();

    // Open Completed history immediately so the saved note is visible.
    if (refs.stickyCompletedSection) {
      refs.stickyCompletedSection.open = true;
    }

    showToast("✓ Completed and saved in history.");
  } catch (error) {
    showToast(friendlyError(error), true);
  }
}

async function restoreStickyNote(id) {
  try {
    const response = await apiPost("adminRestoreStickyNote", {
      noteId: id,
      securityCode: state.adminCode
    });
    state.stickyNotes = response.notes || [];
    renderStickyNotes();
    showToast("Target / Reminder restored.");
  } catch (error) {
    showToast(friendlyError(error), true);
  }
}

async function deleteStickyNote(id) {
  if (!confirm("Delete this target or reminder?")) return;

  try {
    const response = await apiPost("adminDeleteStickyNote", {
      noteId: id,
      securityCode: state.adminCode
    });

    state.stickyNotes = response.notes || [];
    if (state.stickyFocusId === id) unpinStickyFocus(false);
    renderStickyNotes();
    showToast("Target / Reminder deleted.");
  } catch (error) {
    showToast(friendlyError(error), true);
  }
}

function pinStickyFocus(id) {
  const note =
    state.stickyNotes.find(
      (item) => item.id === id && item.status !== "Completed"
    );

  if (!note) return;

  state.stickyFocusId = id;
  state.stickyFocusCollapsed = false;
  saveStickyFocusPreference();
  renderStickyNotes();
  showToast(`“${note.title || "Reminder"}” will remain open over the dashboard.`);
}

function unpinStickyFocus(notify = true) {
  state.stickyFocusId = "";
  state.stickyFocusCollapsed = false;
  saveStickyFocusPreference();
  renderStickyNotes();

  if (notify) showToast("The floating sticky note was closed.");
}

function toggleStickyFocus() {
  if (!state.stickyFocusId) return;

  state.stickyFocusCollapsed = !state.stickyFocusCollapsed;
  saveStickyFocusPreference();
  renderStickyFocusNote();
}

function changeStickyFocusSize(direction) {
  const nextSize = Math.max(
    0,
    Math.min(
      STICKY_FOCUS_SIZES.length - 1,
      state.stickyFocusLayout.size + direction
    )
  );

  if (nextSize === state.stickyFocusLayout.size) return;

  state.stickyFocusLayout.size = nextSize;
  saveStickyFocusPreference();
  renderStickyFocusNote();
}

function resetStickyFocusLayout() {
  state.stickyFocusLayout = { size: 1, x: null, y: null };
  saveStickyFocusPreference();
  renderStickyFocusNote();
  showToast("Sticky note size and position restored.");
}

function startStickyFocusDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const rect = refs.stickyFocusNote.getBoundingClientRect();

  state.stickyFocusDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: rect.left,
    originY: rect.top
  };

  state.stickyFocusLayout.x = rect.left;
  state.stickyFocusLayout.y = rect.top;

  try {
    refs.stickyFocusDragHandle.setPointerCapture(event.pointerId);
  } catch {}

  document.body.classList.add("sticky-focus-dragging");
  event.preventDefault();
}

function moveStickyFocusDrag(event) {
  const drag = state.stickyFocusDrag;

  if (!drag || drag.pointerId !== event.pointerId) return;

  const rect = refs.stickyFocusNote.getBoundingClientRect();
  const maxX = Math.max(8, window.innerWidth - rect.width - 8);
  const maxY = Math.max(8, window.innerHeight - rect.height - 8);

  state.stickyFocusLayout.x = Math.max(
    8,
    Math.min(maxX, drag.originX + event.clientX - drag.startX)
  );

  state.stickyFocusLayout.y = Math.max(
    8,
    Math.min(maxY, drag.originY + event.clientY - drag.startY)
  );

  applyStickyFocusPosition();
}

function finishStickyFocusDrag(event) {
  const drag = state.stickyFocusDrag;

  if (!drag || drag.pointerId !== event.pointerId) return;

  state.stickyFocusDrag = null;
  document.body.classList.remove("sticky-focus-dragging");
  saveStickyFocusPreference();
}

function moveStickyFocusWithKeyboard(event) {
  if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;

  const rect = refs.stickyFocusNote.getBoundingClientRect();

  if (
    !Number.isFinite(state.stickyFocusLayout.x) ||
    !Number.isFinite(state.stickyFocusLayout.y)
  ) {
    state.stickyFocusLayout.x = rect.left;
    state.stickyFocusLayout.y = rect.top;
  }

  const step = event.shiftKey ? 20 : 6;

  if (event.key === "ArrowLeft") state.stickyFocusLayout.x -= step;
  if (event.key === "ArrowRight") state.stickyFocusLayout.x += step;
  if (event.key === "ArrowUp") state.stickyFocusLayout.y -= step;
  if (event.key === "ArrowDown") state.stickyFocusLayout.y += step;

  clampStickyFocusPosition();
  saveStickyFocusPreference();
  event.preventDefault();
}

function applyStickyFocusPosition() {
  if (
    !Number.isFinite(state.stickyFocusLayout.x) ||
    !Number.isFinite(state.stickyFocusLayout.y)
  ) {
    refs.stickyFocusNote.style.removeProperty("left");
    refs.stickyFocusNote.style.removeProperty("top");
    refs.stickyFocusNote.style.removeProperty("right");
    refs.stickyFocusNote.style.removeProperty("bottom");
    return;
  }

  refs.stickyFocusNote.style.left = `${state.stickyFocusLayout.x}px`;
  refs.stickyFocusNote.style.top = `${state.stickyFocusLayout.y}px`;
  refs.stickyFocusNote.style.right = "auto";
  refs.stickyFocusNote.style.bottom = "auto";
}

function clampStickyFocusPosition() {
  if (refs.stickyFocusNote.hidden) return;

  if (
    !Number.isFinite(state.stickyFocusLayout.x) ||
    !Number.isFinite(state.stickyFocusLayout.y)
  ) {
    applyStickyFocusPosition();
    return;
  }

  const rect = refs.stickyFocusNote.getBoundingClientRect();
  const maxX = Math.max(8, window.innerWidth - rect.width - 8);
  const maxY = Math.max(8, window.innerHeight - rect.height - 8);

  state.stickyFocusLayout.x =
    Math.max(8, Math.min(maxX, state.stickyFocusLayout.x));

  state.stickyFocusLayout.y =
    Math.max(8, Math.min(maxY, state.stickyFocusLayout.y));

  applyStickyFocusPosition();
}

function renderStickyFocusNote() {
  const note =
    state.stickyNotes.find(
      (item) =>
        item.id === state.stickyFocusId &&
        item.status !== "Completed"
    );

  if (!note) {
    if (state.stickyFocusId) {
      state.stickyFocusId = "";
      state.stickyFocusCollapsed = false;
      saveStickyFocusPreference();
    }

    refs.stickyFocusNote.hidden = true;
    return;
  }

  const colour =
    ["yellow","pink","blue","green","purple","orange"].includes(note.colour)
      ? note.colour
      : "yellow";

  const size = Math.max(
    0,
    Math.min(
      STICKY_FOCUS_SIZES.length - 1,
      state.stickyFocusLayout.size
    )
  );

  refs.stickyFocusNote.className =
    `sticky-focus-note ${colour} ${STICKY_FOCUS_SIZES[size].className}${state.stickyFocusCollapsed ? " is-collapsed" : ""}`;

  refs.stickyFocusType.textContent = note.type || "Reminder";
  refs.stickyFocusTitle.textContent = note.title || "Untitled note";
  refs.stickyFocusDetails.textContent =
    note.details || "No additional details.";
  refs.stickyFocusDue.textContent =
    note.dueDate ? `Due ${formatDate(note.dueDate)}` : "No due date";
  refs.stickyFocusToggle.setAttribute(
    "aria-expanded",
    String(!state.stickyFocusCollapsed)
  );
  refs.stickyFocusChevron.textContent =
    state.stickyFocusCollapsed ? "+" : "−";
  refs.stickyFocusSizeLabel.textContent =
    STICKY_FOCUS_SIZES[size].label;
  refs.stickyFocusSizeDown.disabled = size === 0;
  refs.stickyFocusSizeUp.disabled =
    size === STICKY_FOCUS_SIZES.length - 1;

  if (refs.stickyFocusAdminActions) {
    refs.stickyFocusAdminActions.hidden = !state.adminUnlocked;
  }

  refs.stickyFocusNote.hidden = false;

  requestAnimationFrame(() => {
    applyStickyFocusPosition();
    clampStickyFocusPosition();
  });
}

function readStickyFocusId() {
  try {
    return localStorage.getItem(STICKY_FOCUS_ID_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readStickyFocusCollapsed() {
  try {
    return localStorage.getItem(STICKY_FOCUS_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readStickyFocusLayout() {
  const fallback = { size: 1, x: null, y: null };

  try {
    const parsed = JSON.parse(
      localStorage.getItem(STICKY_FOCUS_LAYOUT_STORAGE_KEY) || "null"
    );

    if (!parsed || typeof parsed !== "object") return fallback;

    return {
      size: Number.isInteger(parsed.size)
        ? Math.max(0, Math.min(STICKY_FOCUS_SIZES.length - 1, parsed.size))
        : 1,
      x: Number.isFinite(parsed.x) ? parsed.x : null,
      y: Number.isFinite(parsed.y) ? parsed.y : null
    };
  } catch {
    return fallback;
  }
}

function saveStickyFocusPreference() {
  try {
    localStorage.setItem(
      STICKY_FOCUS_ID_STORAGE_KEY,
      state.stickyFocusId || ""
    );

    localStorage.setItem(
      STICKY_FOCUS_COLLAPSED_STORAGE_KEY,
      state.stickyFocusCollapsed ? "1" : "0"
    );

    localStorage.setItem(
      STICKY_FOCUS_LAYOUT_STORAGE_KEY,
      JSON.stringify(state.stickyFocusLayout)
    );
  } catch {}
}

async function toggleStickyAdmin() {
  if (state.adminUnlocked) {
    state.adminUnlocked = false;
    state.adminCode = "";
    sessionStorage.removeItem(STICKY_ADMIN_CODE_SESSION_KEY);
    applyAdminState();
    renderStickyNotes();
    return;
  }

  let code = "";

  if (window.ADGB_AUTH?.can?.('stickyManage') && window.ADGB_AUTH?.token) {
    code = "SESSION:" + window.ADGB_AUTH.token;
  } else {
    const entered = prompt(
      "Enter the Head Office security code to manage Targets & Reminders:"
    );

    if (entered === null) return;
    code = entered.trim();
  }

  try {
    if (window.ADGB_AUTH?.token && code.startsWith("SESSION:")) {
      await apiPost("permissionVerify", {
        sessionToken: window.ADGB_AUTH.token,
        permission: "stickyManage"
      });
    } else {
      await apiPost("adminVerify", {
        securityCode: code
      });
    }

    state.adminCode = code;
    state.adminUnlocked = true;
    sessionStorage.setItem(
      STICKY_ADMIN_CODE_SESSION_KEY,
      state.adminCode
    );
    applyAdminState();
    renderStickyNotes();
    showToast("Target / Reminder admin controls unlocked.");

  } catch (error) {
    showToast(friendlyError(error), true);
  }
}

async function verifyRememberedAdmin() {
  if (!state.adminCode) {
    applyAdminState();
    return;
  }

  try {
    await apiPost("adminVerify", {
      securityCode: state.adminCode
    });
    state.adminUnlocked = true;
  } catch {
    state.adminCode = "";
    state.adminUnlocked = false;
    sessionStorage.removeItem(STICKY_ADMIN_CODE_SESSION_KEY);
  }

  applyAdminState();
  renderStickyNotes();
}

function applyStickyPermissionState() {
  const loggedIn = Boolean(window.ADGB_AUTH?.user);
  const canView =
    loggedIn &&
    (
      window.ADGB_AUTH?.can?.("stickyView") ||
      window.ADGB_AUTH?.can?.("stickyManage")
    );

  if (refs.stickyNotesButton) {
    refs.stickyNotesButton.closest(".hr-sticky-launch").hidden = !canView;
  }

  if (!canView && refs.stickyNotesDialog?.open) {
    refs.stickyNotesDialog.close();
  }

  if (!canView) {
    document.body.classList.remove("adgb-sticky-drawer-open");
  }

  return canView;
}

function applyAdminState() {
  refs.stickyAdminUnlock.textContent =
    state.adminUnlocked ? "🔓 Lock" : "🔒 Admin";

  if (window.ADGB_AUTH?.user) {
    refs.stickyAdminUnlock.hidden = !window.ADGB_AUTH.can?.("stickyManage");
  }

  refs.stickyNoteForm.hidden = !state.adminUnlocked;

  if (refs.stickyFocusAdminActions) {
    refs.stickyFocusAdminActions.hidden = !state.adminUnlocked;
  }

  if (refs.stickyAdminHint) {
    refs.stickyAdminHint.classList.toggle("unlocked", state.adminUnlocked);
    refs.stickyAdminHint.textContent = state.adminUnlocked
      ? "Management enabled · You can add, edit, complete and delete Target / Reminder notes."
      : "View mode · Editing is controlled by the permissions assigned by Administrator.";
  }

  if (!state.adminUnlocked) {
    cancelStickyEdit();
  }
}

function apiGet(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callback =
      "adgbHrSticky_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 1000000);

    const script = document.createElement("script");

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The Target / Reminder backend connection timed out."));
    }, CONFIG.REQUEST_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      try { delete window[callback]; } catch {}
      script.remove();
    }

    window[callback] = (data) => {
      cleanup();

      if (data && data.ok !== false) resolve(data);
      else reject(new Error(data?.message || "Request failed."));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("The Apps Script Target / Reminder backend could not be reached."));
    };

    const query = new URLSearchParams({
      ...params,
      action,
      callback,
      _: Date.now()
    });

    script.src = CONFIG.API_URL + "?" + query.toString();
    document.head.appendChild(script);
  });
}

function apiPost(action, data = {}) {
  return new Promise((resolve, reject) => {
    const nonce =
      (window.crypto && typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).slice(2);

    const frame = document.createElement("iframe");
    const form = document.createElement("form");
    const field = document.createElement("textarea");

    frame.name =
      "adgbHrStickyFrame_" +
      nonce.replace(/[^A-Za-z0-9]/g, "");
    frame.style.display = "none";

    form.method = "POST";
    form.action = CONFIG.API_URL;
    form.target = frame.name;
    form.style.display = "none";

    field.name = "payload";
    field.value = JSON.stringify({
      action,
      nonce,
      ...data
    });

    form.appendChild(field);

    let finished = false;
    let pollTimer = null;

    const timeout = setTimeout(() => {
      finish(
        new Error(
          "The Target / Reminder action could not be confirmed. Refresh and check whether it was saved."
        )
      );
    }, 60000);

    function finish(error, result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (pollTimer) clearTimeout(pollTimer);
      window.removeEventListener("message", onMessage);

      setTimeout(() => {
        form.remove();
        frame.remove();
      }, 0);

      error ? reject(error) : resolve(result);
    }

    function onMessage(event) {
      const packet = event.data;

      if (
        packet?.source !== "ADGB_PORTAL" ||
        packet?.data?.nonce !== nonce
      ) return;

      const result = packet.data;

      if (result.ok) finish(null, result);
      else finish(new Error(result.message || "Request failed."));
    }

    async function pollReceipt() {
      if (finished) return;

      try {
        const receipt = await apiGet("receipt", { nonce });

        if (receipt && !receipt.pending) {
          if (receipt.ok) finish(null, receipt);
          else finish(new Error(receipt.message || "Request failed."));
          return;
        }
      } catch {}

      if (!finished) {
        pollTimer = setTimeout(pollReceipt, 1500);
      }
    }

    window.addEventListener("message", onMessage);
    document.body.append(frame, form);
    form.submit();

    pollTimer = setTimeout(pollReceipt, 1200);
  });
}

function formatDate(value) {
  if (!value) return "";

  const text = String(value);
  const parts = text.split("-");

  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return text;
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = label;
}

function friendlyError(error) {
  return error && error.message
    ? error.message
    : "The request could not be completed.";
}

function showToast(message, error = false) {
  let toast = document.getElementById("exactHrStickyToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "exactHrStickyToast";
    toast.style.cssText =
      "position:fixed;left:50%;bottom:22px;z-index:10050;transform:translateX(-50%);" +
      "padding:10px 14px;border-radius:10px;color:#fff;font:800 11px Arial,sans-serif;" +
      "box-shadow:0 10px 28px rgba(0,0,0,.2);transition:.2s;";
    document.body.appendChild(toast);
  }

  toast.style.background = error ? "#b91c1c" : "#0f766e";
  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}


window.addEventListener("adgb-auth-changed", async (event) => {
  const user = event.detail?.user || null;
  const canView = applyStickyPermissionState();

  if (canView) {
    try {
      await loadStickyNotes();
    } catch {
      state.stickyNotes = [];
      renderStickyNotes();
    }
  } else {
    state.stickyNotes = [];
    renderStickyNotes();
  }

  if (window.ADGB_AUTH?.can?.("stickyManage") && window.ADGB_AUTH?.token) {
    try {
      state.adminCode = "SESSION:" + window.ADGB_AUTH.token;
      const result = await apiPost("permissionVerify", {
        sessionToken: window.ADGB_AUTH.token,
        permission: "stickyManage"
      });
      if (result?.ok !== false) {
        state.adminUnlocked = true;
        applyAdminState();
        renderStickyNotes();
      }
    } catch {
      state.adminUnlocked = false;
      state.adminCode = "";
      applyAdminState();
      renderStickyNotes();
    }
  } else {
    state.adminUnlocked = false;
    state.adminCode = "";
    applyAdminState();
    renderStickyNotes();
  }
});


})();
