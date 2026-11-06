/**
 * ADG(B) Portal V17.7.70 — Office review backend add-on (NOT deployed).
 *
 * IMPORTANT: This is an integration module, not a replacement for Code.gs.
 * Install in the EXISTING Apps Script project after backing it up.
 * Connect the TWO adapter functions below to your existing private backend,
 * and route both actions using the current JSON request/response mechanism.
 *
 * The adapters FAIL CLOSED by default. Do not bypass administrator validation.
 * Never place a credential, spreadsheet ID, or private token in public GitHub.
 * The Google Sheet tab "OfficeReviews" is created within the EXISTING database.
 */

const ADGB_REVIEW_SHEET_NAME_ = 'OfficeReviews';
const ADGB_REVIEW_HEADERS_ = [
  'CycleKey','OfficeId','Observation','ActionTaken','Followup','TargetDate','UpdatedAt'
];

/** Adapter 1 — REQUIRED: use the existing HEAD_OFFICE authentication routine. */
function adgbReviewRequireAdmin_(securityCode) {
  // Replace this body with a call to the EXISTING server-side administrator
  // credential/session verifier, using the same checks as adminSetSubjectNote.
  // Reject all invalid, expired, and non-HEAD_OFFICE credentials.
  throw new Error('Office review backend not configured: admin verifier required');
}

/** Adapter 2 — REQUIRED: return the EXISTING portal database Spreadsheet. */
function adgbReviewSpreadsheet_() {
  // Example only: return SpreadsheetApp.openById(existingDatabaseId);
  // Obtain the existing ID/configuration from your live Code.gs.
  // Do not create a new spreadsheet.
  throw new Error('Office review backend not configured: database adapter required');
}

/** Add these two action routes to the EXISTING request switch:
 *
 * case 'adminOfficeReviewList':
 *   return adgbOfficeReviewList_(request);
 * case 'adminOfficeReviewSave':
 *   return adgbOfficeReviewSave_(request);
 *
 * Adapt `request` and response wrapping to the existing router's conventions.
 * Ensure error handling does not accidentally serialize credentials.
 */

function adgbOfficeReviewSheet_() {
  const db = adgbReviewSpreadsheet_();
  let sheet = db.getSheetByName(ADGB_REVIEW_SHEET_NAME_);
  if (!sheet) {
    sheet = db.insertSheet(ADGB_REVIEW_SHEET_NAME_);
    sheet.getRange(1, 1, 1, ADGB_REVIEW_HEADERS_.length).setValues([ADGB_REVIEW_HEADERS_]);
    sheet.setFrozenRows(1);
  }
  const header = sheet.getRange(1,1,1,ADGB_REVIEW_HEADERS_.length).getValues()[0];
  if (header.some((v,i)=>v!==ADGB_REVIEW_HEADERS_[i])) {
    throw new Error('OfficeReviews sheet has incompatible columns; do not overwrite it');
  }
  return sheet;
}

function adgbReviewCycle_(value) {
  const key = String(value || '');
  if (!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(key)) throw new Error('Invalid reporting cycle');
  // This prevents writes to arbitrary historic cycles; historical reads
  // should use the separate authorized archive endpoint if needed.
  const now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM');
  if (key !== now) throw new Error('Only the current reporting cycle can be edited');
  return key;
}

function adgbReviewCleanText_(value) {
  return String(value == null ? '' : value).slice(0, 1000);
}

function adgbReviewNormalize_(entry) {
  const officeId = String(entry.officeId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(officeId)) throw new Error('Invalid office ID');
  // Validate that officeId is present in your existing backend's office
  // registry before enabling this function in production.
  const followup = String(entry.followup || '');
  if (!['','Open','In progress','Completed','For review'].includes(followup)) throw new Error('Invalid follow-up status');
  const date = String(entry.targetDate || '');
  if (date && !/^20[0-9]{2}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/.test(date)) throw new Error('Invalid target date');
  return {officeId, observation:adgbReviewCleanText_(entry.observation),
    action:adgbReviewCleanText_(entry.action),followup,targetDate:date};
}

/** Both handlers MUST be called only through the authenticated router. */
function adgbOfficeReviewList_(request) {
  adgbReviewRequireAdmin_(request.securityCode);
  const cycle = adgbReviewCycle_(request.cycleKey);
  const sheet = adgbOfficeReviewSheet_();
  const data = sheet.getLastRow() < 2 ? [] :
    sheet.getRange(2,1,sheet.getLastRow()-1,ADGB_REVIEW_HEADERS_.length).getValues();
  return {ok:true,records:data.filter(x=>String(x[0])===cycle).map(x=>({
    officeId:String(x[1]),observation:String(x[2]||''),action:String(x[3]||''),
    followup:String(x[4]||''),targetDate:String(x[5]||'')
  }))};
}

function adgbOfficeReviewSave_(request) {
  adgbReviewRequireAdmin_(request.securityCode);
  const cycle = adgbReviewCycle_(request.cycleKey);
  if (!Array.isArray(request.records) || request.records.length > 100) throw new Error('Invalid review batch');
  const records=request.records.map(adgbReviewNormalize_);
  const unique = new Set(records.map(x=>x.officeId));
  if (unique.size!==records.length) throw new Error('Duplicate office in review batch');
  // Integrator must additionally validate IDs against the live office registry.
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet=adgbOfficeReviewSheet_();
    const last=sheet.getLastRow();
    const data=last<2?[]:sheet.getRange(2,1,last-1,ADGB_REVIEW_HEADERS_.length).getValues();
    const index=new Map();
    data.forEach((row,i)=>index.set(String(row[0])+'|'+String(row[1]),i+2));
    const now=new Date();
    const inserts=[];
    for(const entry of records){
      const row=[cycle,entry.officeId,entry.observation,entry.action,entry.followup,entry.targetDate,now];
      const at=index.get(cycle+'|'+entry.officeId);
      if(at)sheet.getRange(at,1,1,row.length).setValues([row]);
      else inserts.push(row);
    }
    if(inserts.length)sheet.getRange(sheet.getLastRow()+1,1,inserts.length,ADGB_REVIEW_HEADERS_.length).setValues(inserts);
    return {ok:true,savedCount:records.length};
  } finally {lock.releaseLock();}
}
