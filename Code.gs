/**
 * ADG(B) REPORT SUBMISSION PORTAL - BACKEND V17.6.8 - TURBO LOGIN + STABLE PERFORMANCE
 * Google Apps Script + Google Drive + Google Sheets
 *
 * EXISTING PORTAL UPGRADE
 * 1. Replace the complete old Code.gs with this file.
 * 2. Save the project.
 * 3. Deploy > Manage deployments > Edit > New version > Deploy.
 * 4. Execute as: Me | Who has access: Anyone.
 *
 * IMPORTANT FOR AN EXISTING PORTAL
 * Do NOT run setupPortal() or setPortalSecurityCodes() again unless you
 * intentionally want to initialise a new database or change the codes.
 *
 * V15.8 keeps Raw Data and implements the HR dashboard Targets & Reminders feature in the Report Portal. The new Raw_Data_Items and Raw_Data sheets are
 * created automatically after deployment; existing report data is preserved.
 */

var CONFIG = Object.freeze({
  PORTAL_NAME: 'ADG(B) Report Submission Portal',
  ROOT_FOLDER_ID: '1Dna4xHyOSfH1-0Oq9tJ2xfmlmEaJlHRF',
  SUBJECTS_PARENT_FOLDER: 'Current Submission Cycle',
  DATABASE_NAME: 'ADG(B) Portal Database',
  SUBJECTS_SHEET: 'Subjects',
  SUBMISSIONS_SHEET: 'Submissions',
  CURRENT_STATUS_SHEET: 'Current_Status',
  SUBMISSION_ACTIVITY_SHEET: 'Submission_Activity',
  RAW_ITEMS_SHEET: 'Raw_Data_Items',
  RAW_DATA_SHEET: 'Raw_Data',
  STICKY_NOTES_SHEET: 'Sticky_Notes',
  USERS_SHEET: 'Portal_Users',
  BACKEND_VERSION: '17.7.2',
  TIME_ZONE: 'Asia/Kolkata',
  DEFAULT_LOGIN_IDLE_MINUTES: 30,
  SESSION_FALLBACK_MINUTES: 5,
  QUARTERLY_MONTHS: [1, 4, 7, 10],
  QUARTERLY_LABEL: 'Previous Quarter',
  MAX_FILE_MB: 8,
  CACHE_SECONDS: 600,
  DEFAULT_SUBJECTS: [
    'Monthly Progress Report',
    'Financial Report',
    'Tender Status Report',
    'Pension',
    'Law'
  ]
});

var OFFICES = Object.freeze([
  { id: 'CEB', name: 'CE(B)' },
  { id: 'CEHAL', name: 'CE(HAL)' },
  { id: 'SEPD', name: 'SE&PD' },
  { id: 'SEMYSORE', name: 'SE(Mysore)' },
  { id: 'SEHUBLI', name: 'SE(Hubli)' }
]);

/**
 * Raw Data includes Head Office plus all five sub-offices.
 * Security is still controlled by the same six portal codes.
 */
var RAW_DATA_OFFICES = Object.freeze([
  { id: 'HEAD_OFFICE', name: 'O/o ADG(B)' },
  { id: 'CEB', name: 'CE(B)' },
  { id: 'CEHAL', name: 'CE(HAL)' },
  { id: 'SEPD', name: 'SE&PD' },
  { id: 'SEMYSORE', name: 'SE(Mysore)' },
  { id: 'SEHUBLI', name: 'SE(Hubli)' }
]);

/**
 * Run only when setting/changing portal codes.
 * Do not place these codes in index.html.
 */
function setPortalSecurityCodes() {
  var codes = {
    HEAD_OFFICE: '4321',
    CEB: '1234',
    CEHAL: '1234',
    SEPD: '1234',
    SEMYSORE: '1234',
    SEHUBLI: '1234'
  };

  var properties = PropertiesService.getScriptProperties();
  Object.keys(codes).forEach(function (key) {
    if (/^CHANGE-/.test(codes[key])) {
      throw new Error('Replace all six sample security codes before running setPortalSecurityCodes().');
    }
  });

  Object.keys(codes).forEach(function (key) {
    properties.setProperty('CODE_HASH_' + key, hashText_(codes[key]));
  });

  properties.setProperty('CODES_CONFIGURED_AT', new Date().toISOString());
  Logger.log('All six portal security codes were saved securely.');
}

/** First-time setup only. */
function setupPortal() {
  var lock = acquirePortalLock_();
  try {
    getRootFolder_();
    var spreadsheet = getDatabase_();
    ensureSheets_(spreadsheet);

    var subjectsSheet = spreadsheet.getSheetByName(CONFIG.SUBJECTS_SHEET);
    if (subjectsSheet.getLastRow() === 1) {
      CONFIG.DEFAULT_SUBJECTS.forEach(function (subjectName) {
        createSubject_(subjectName, 'System setup');
      });
    }

    invalidateCache_();
    Logger.log('Portal setup complete. Database: ' + spreadsheet.getUrl());
  } finally {
    lock.releaseLock();
  }
}


/* =========================================================================
 * V17.6 PORTAL ACCESS CONTROL
 * ========================================================================= */

var PORTAL_ACCESS_DEFAULTS = Object.freeze({
  mode: 'LOGIN_REQUIRED',
  publicRawData: false,
  publicSubmittedTimes: true,
  publicOfficeActions: true
});

function normalisePortalMode_(value) {
  value = String(value || '').trim().toUpperCase();
  return ['PUBLIC_VIEW', 'LOGIN_REQUIRED', 'ADMIN_ONLY'].indexOf(value) >= 0
    ? value
    : PORTAL_ACCESS_DEFAULTS.mode;
}

function getPortalAccessConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var stored = {};

  try {
    stored = JSON.parse(
      properties.getProperty('PORTAL_ACCESS_CONFIG_V171') || '{}'
    ) || {};
  } catch (ignore) {
    stored = {};
  }

  return {
    mode: normalisePortalMode_(stored.mode),
    publicRawData: stored.publicRawData === true,
    publicSubmittedTimes: stored.publicSubmittedTimes !== false,
    publicOfficeActions: stored.publicOfficeActions !== false
  };
}

function publicPortalAccessConfig_() {
  var config = getPortalAccessConfig_();

  return {
    mode: config.mode,
    publicRawData: config.publicRawData,
    publicSubmittedTimes: config.publicSubmittedTimes,
    publicOfficeActions: config.publicOfficeActions,
    backendVersion: CONFIG.BACKEND_VERSION
  };
}

function savePortalAccessConfig_(input) {
  input = input || {};

  var config = {
    mode: normalisePortalMode_(input.mode),
    publicRawData:
      input.publicRawData === true ||
      String(input.publicRawData || '').toLowerCase() === 'true',
    publicSubmittedTimes:
      input.publicSubmittedTimes === true ||
      String(input.publicSubmittedTimes || '').toLowerCase() === 'true',
    publicOfficeActions:
      input.publicOfficeActions === true ||
      String(input.publicOfficeActions || '').toLowerCase() === 'true'
  };

  PropertiesService.getScriptProperties().setProperty(
    'PORTAL_ACCESS_CONFIG_V171',
    JSON.stringify(config)
  );

  invalidateCache_();
  invalidateRawCache_();

  return config;
}


function normalisePortalIdleMinutes_(value) {
  var allowed = [5, 10, 15, 20, 30];
  var numeric = Number(value);

  return allowed.indexOf(numeric) !== -1
    ? numeric
    : CONFIG.DEFAULT_LOGIN_IDLE_MINUTES;
}

function getPortalSecurityConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var text = properties.getProperty('PORTAL_SECURITY_CONFIG_V176');
  var stored = {};

  try {
    if (text) stored = JSON.parse(text);
  } catch (ignore) {
    stored = {};
  }

  return {
    idleMinutes: normalisePortalIdleMinutes_(stored.idleMinutes),
    warningSeconds: 60,
    fallbackMinutes: CONFIG.SESSION_FALLBACK_MINUTES
  };
}

function publicPortalSecurityConfig_() {
  return getPortalSecurityConfig_();
}

function savePortalSecurityConfig_(input) {
  input = input || {};

  var config = {
    idleMinutes: normalisePortalIdleMinutes_(input.idleMinutes),
    warningSeconds: 60,
    fallbackMinutes: CONFIG.SESSION_FALLBACK_MINUTES
  };

  PropertiesService.getScriptProperties().setProperty(
    'PORTAL_SECURITY_CONFIG_V176',
    JSON.stringify(config)
  );

  return config;
}

function getPortalIdleSeconds_() {
  return getPortalSecurityConfig_().idleMinutes * 60;
}

function getPortalServerSessionSeconds_() {
  var security = getPortalSecurityConfig_();

  return (
    security.idleMinutes * 60 +
    security.fallbackMinutes * 60
  );
}

function handleAdminGetSecuritySettings_(payload) {
  requirePortalAdminSession_(payload.sessionToken);

  return {
    ok: true,
    security: publicPortalSecurityConfig_(),
    idleSeconds: getPortalIdleSeconds_(),
    backendVersion: CONFIG.BACKEND_VERSION
  };
}

function handleAdminSaveSecuritySettings_(payload) {
  var admin = requirePortalAdminSession_(payload.sessionToken);
  var security = savePortalSecurityConfig_(payload);

  return {
    ok: true,
    message: 'Security settings updated successfully.',
    security: security,
    idleSeconds: security.idleMinutes * 60,
    backendVersion: CONFIG.BACKEND_VERSION,
    changedBy: admin.username
  };
}

function optionalPortalSession_(token) {
  token = String(token || '').trim();
  if (!token) return null;

  try {
    return requirePortalSession_(token);
  } catch (ignore) {
    return null;
  }
}

function authoriseDashboardRead_(token) {
  var access = getPortalAccessConfig_();
  var session = optionalPortalSession_(token);

  if (access.mode === 'PUBLIC_VIEW') {
    return {
      access: access,
      session: session,
      publicGuest: !session
    };
  }

  if (!session) {
    throw new Error(
      access.mode === 'ADMIN_ONLY'
        ? 'Administrator login is required while the portal is restricted.'
        : 'Username and password login is required to view this dashboard.'
    );
  }

  if (access.mode === 'ADMIN_ONLY' && session.role !== 'ADMIN') {
    throw new Error('The portal is currently restricted to Administrator access.');
  }

  return {
    access: access,
    session: session,
    publicGuest: false
  };
}

function authoriseRawDataRead_(token) {
  var context = authoriseDashboardRead_(token);

  if (
    context.publicGuest &&
    context.access.publicRawData !== true
  ) {
    throw new Error('Raw Data is available only after login.');
  }

  return context;
}

function enforcePortalOfficeActionMode_(securityCode) {
  var access = getPortalAccessConfig_();
  var credential = String(securityCode || '').trim();
  var isSession = credential.indexOf('SESSION:') === 0;

  if (access.mode === 'PUBLIC_VIEW') {
    if (!isSession && access.publicOfficeActions !== true) {
      throw new Error(
        'Office actions are currently available only after username/password login.'
      );
    }
    return true;
  }

  if (!isSession) {
    throw new Error(
      access.mode === 'ADMIN_ONLY'
        ? 'Administrator username/password login is required.'
        : 'Username/password login is required for this action.'
    );
  }

  if (access.mode === 'ADMIN_ONLY') {
    var token = credential.substring('SESSION:'.length);
    requirePortalAdminSession_(token);
  }

  return true;
}

function handleAdminGetPortalAccess_(payload) {
  requirePortalAdminSession_(payload.sessionToken);

  return {
    ok: true,
    access: publicPortalAccessConfig_()
  };
}

function handleAdminSavePortalAccess_(payload) {
  var admin = requirePortalAdminSession_(payload.sessionToken);
  var config = savePortalAccessConfig_(payload.access || payload);

  return {
    ok: true,
    message: 'Portal access mode updated successfully.',
    access: publicPortalAccessConfig_(),
    changedBy: admin.username
  };
}

function doGet(e) {
  try {
    var parameters = (e && e.parameter) || {};
    var action = String(parameters.action || 'bootstrap').trim();
    var result;

    if (action === 'portalAccess' || action === 'accessConfig') {
      result = {
        ok: true,
        access: publicPortalAccessConfig_(),
        backendVersion: CONFIG.BACKEND_VERSION
      };
    } else if (action === 'bootstrap') {
      result = getBootstrapData_(parameters.sessionToken, String(parameters.fresh || '') === '1');
    } else if (
      action === 'rawBootstrap' ||
      action === 'rawDataBootstrap' ||
      action === 'raw'
    ) {
      result = getRawBootstrapData_(parameters.sessionToken);
    } else if (
      action === 'stickyBootstrap' ||
      action === 'targetReminderBootstrap' ||
      action === 'stickyNotes'
    ) {
      var stickySession = requirePortalSession_(parameters.sessionToken);
      requirePortalPermission_(stickySession, 'stickyView');
      result = getStickyNotesBootstrap_();
    } else if (action === 'stickyHealth') {
      var stickySheet = ensureStickyNotesSheet_();
      result = {
        ok: true,
        message: 'Targets & Reminders storage is available.',
        sheetName: stickySheet.getName(),
        backendVersion: CONFIG.BACKEND_VERSION
      };
    } else if (action === 'databaseHealth') {
      var healthDb = getDatabase_();
      result = {
        ok: true,
        backendVersion: CONFIG.BACKEND_VERSION,
        databaseId: healthDb.getId(),
        databaseName: healthDb.getName(),
        subjects: countPortalRows_(healthDb, CONFIG.SUBJECTS_SHEET),
        submissions: countPortalRows_(healthDb, CONFIG.SUBMISSIONS_SHEET),
        rawItems: countPortalRows_(healthDb, CONFIG.RAW_ITEMS_SHEET),
        rawData: countPortalRows_(healthDb, CONFIG.RAW_DATA_SHEET)
      };
    } else if (action === 'ping') {
      result = {
        ok: true,
        message: 'Portal backend is available.',
        backendVersion: CONFIG.BACKEND_VERSION,
        supportsRawData: true,
        rawDataVersion: '17.6.7',
        supportsStickyNotes: true,
        stickyNotesVersion: '17.6.7',
        supportsLogin: true,
        loginVersion: '17.6.7',
        supportsSecuritySettings: true,
        supportsDriveFolderLink: true,
        supportsAccessControl: true,
        portalAccess: publicPortalAccessConfig_(),
        loginRoles: ['ADMIN', 'OFFICE', 'VIEWER'],
        stickyNoteActions: [
          'stickyBootstrap',
          'adminAddStickyNote',
          'adminUpdateStickyNote',
          'adminCompleteStickyNote',
          'adminRestoreStickyNote',
          'adminDeleteStickyNote'
        ],
        rawDataActions: [
          'rawBootstrap',
          'adminAddRawItem',
          'adminAddRawSubItem',
          'adminDeleteRawSubItem',
          'adminRenameRawItem',
          'saveRawDataValue',
          'adminArchiveRawItem'
        ]
      };
    } else if (action === 'receipt') {
      result = getReceipt_(parameters.nonce);
    } else if (action === 'view') {
      return securePdfViewer_(parameters.token);
    } else {
      throw new Error('Unsupported request.');
    }

    return jsonpResponse_(result, parameters.callback);
  } catch (error) {
    if (e && e.parameter && String(e.parameter.action || '') === 'view') {
      return pdfViewerError_(friendlyError_(error));
    }
    return jsonpResponse_(
      { ok: false, message: friendlyError_(error) },
      e && e.parameter && e.parameter.callback
    );
  }
}

function doPost(e) {
  var nonce = '';
  try {
    if (!e || !e.parameter || !e.parameter.payload) {
      throw new Error('No request data was received.');
    }

    var payload = JSON.parse(e.parameter.payload);
    nonce = String(payload.nonce || '');
    var action = String(payload.action || '').trim();
    var result;

    if (action === 'login') {
      result = handlePortalLogin_(payload);
    } else if (action === 'sessionCheck') {
      result = handlePortalSessionCheck_(payload);
    } else if (action === 'logout') {
      result = handlePortalLogout_(payload);
    } else if (action === 'adminListUsers') {
      result = handleAdminListUsers_(payload);
    } else if (action === 'adminSaveUser') {
      result = handleAdminSaveUser_(payload);
    } else if (action === 'adminDeleteUser') {
      result = handleAdminDeleteUser_(payload);
    } else if (action === 'adminGetPortalAccess') {
      result = handleAdminGetPortalAccess_(payload);
    } else if (action === 'adminSavePortalAccess') {
      result = handleAdminSavePortalAccess_(payload);
    } else if (action === 'adminGetSecuritySettings') {
      result = handleAdminGetSecuritySettings_(payload);
    } else if (action === 'adminSaveSecuritySettings') {
      result = handleAdminSaveSecuritySettings_(payload);
    } else if (action === 'upload') {
      result = handleUpload_(payload);
    } else if (action === 'viewSubmission') {
      result = handleViewSubmission_(payload);
    } else if (action === 'removeSubmission') {
      result = handleRemoveSubmission_(payload);
    } else if (action === 'permissionVerify') {
      var permissionSession = requirePortalSession_(payload.sessionToken);
      requirePortalPermission_(permissionSession, String(payload.permission || ''));
      result = {
        ok: true,
        message: 'Permission verified.',
        user: publicPortalUser_(permissionSession)
      };
    } else if (action === 'getDriveFolderLink') {
      var driveSession = requirePortalSession_(payload.sessionToken);
      requirePortalPermission_(driveSession, 'driveFolderView');

      // V15.21: expose ONLY the Current Submission Cycle folder.
      var submissionFolder = getSubjectParentFolder_();

      result = {
        ok: true,
        folderName: submissionFolder.getName(),
        folderId: submissionFolder.getId(),
        folderUrl: submissionFolder.getUrl(),
        message: 'Current Submission Cycle folder link ready.'
      };
    } else if (action === 'adminVerify') {
      verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');
      result = {
        ok: true,
        message: 'Management access verified.',
        backendVersion: CONFIG.BACKEND_VERSION
      };
    } else if (action === 'adminAddSubject') {
      result = handleAddSubject_(payload);
    } else if (action === 'adminUpdateSubjectLink') {
      result = handleUpdateSubjectLink_(payload);
    } else if (
      action === 'adminRenameSubject' ||
      action === 'renameSubject' ||
      action === 'adminRenameReportSubject'
    ) {
      // Main fix: the frontend Save new name button sends adminRenameSubject.
      result = handleRenameSubject_(payload);
    } else if (action === 'adminSetSubjectSubmission') {
      result = handleSetSubjectSubmission_(payload);
    } else if (action === 'adminSetSubjectVisibility') {
      result = handleSetSubjectVisibility_(payload);
    } else if (action === 'adminSetSubjectRecurrence') {
      result = handleSetSubjectRecurrence_(payload);
    } else if (action === 'adminArchiveSubject') {
      result = handleArchiveSubject_(payload);
    } else if (
      action === 'adminAddStickyNote' ||
      action === 'addStickyNote'
    ) {
      result = handleAddStickyNote_(payload);
    } else if (
      action === 'adminUpdateStickyNote' ||
      action === 'updateStickyNote'
    ) {
      result = handleUpdateStickyNote_(payload);
    } else if (
      action === 'adminCompleteStickyNote' ||
      action === 'completeStickyNote'
    ) {
      result = handleCompleteStickyNote_(payload);
    } else if (
      action === 'adminRestoreStickyNote' ||
      action === 'restoreStickyNote'
    ) {
      result = handleRestoreStickyNote_(payload);
    } else if (
      action === 'adminDeleteStickyNote' ||
      action === 'deleteStickyNote'
    ) {
      result = handleDeleteStickyNote_(payload);
    } else if (
      action === 'adminReorderStickyNotes' ||
      action === 'reorderStickyNotes'
    ) {
      result = handleReorderStickyNotes_(payload);
    } else if (
      action === 'adminAddRawItem' ||
      action === 'addRawItem' ||
      action === 'adminAddRawDataItem' ||
      action === 'adminAddRawDataRow' ||
      action === 'addRawDataRow'
    ) {
      result = handleAddRawItem_(payload);
    } else if (
      action === 'adminAddRawSubItem' ||
      action === 'addRawSubItem' ||
      action === 'adminAddRawSubRow'
    ) {
      result = handleAddRawSubItem_(payload);
    } else if (
      action === 'adminDeleteRawSubItem' ||
      action === 'deleteRawSubItem' ||
      action === 'adminRemoveRawSubItem'
    ) {
      result = handleDeleteRawSubItem_(payload);
    } else if (
      action === 'adminRenameRawItem' ||
      action === 'renameRawItem' ||
      action === 'adminEditRawItem'
    ) {
      result = handleRenameRawItem_(payload);
    } else if (
      action === 'saveRawDataValue' ||
      action === 'saveRawValue' ||
      action === 'updateRawDataValue'
    ) {
      result = handleSaveRawDataValue_(payload);
    } else if (
      action === 'adminArchiveRawItem' ||
      action === 'archiveRawItem'
    ) {
      result = handleArchiveRawItem_(payload);
    } else {
      throw new Error('Unsupported operation: ' + (action || '(blank)') + '.');
    }

    result.nonce = nonce;
    result.backendVersion = CONFIG.BACKEND_VERSION;

    if (
      [
        'adminAddRawItem',
        'adminAddRawSubItem',
        'adminDeleteRawSubItem',
        'adminRenameRawItem',
        'saveRawDataValue',
        'adminArchiveRawItem'
      ].indexOf(action) !== -1
    ) {
      invalidateRawCache_();
    }

    saveReceipt_(nonce, result);
    return postMessageResponse_(result);
  } catch (error) {
    var failure = {
      ok: false,
      nonce: nonce,
      message: friendlyError_(error),
      backendVersion: CONFIG.BACKEND_VERSION
    };
    saveReceipt_(nonce, failure);
    return postMessageResponse_(failure);
  }
}

function handleUpload_(payload) {
  enforcePortalOfficeActionMode_(payload.securityCode);
  var office=getOfficeById_(payload.officeId); verifyCode_(office.id,payload.securityCode,'reportUpload');
  var instance=resolveActiveSubjectInstance_(payload.subjectId), subject=instance.master;
  if(!subject.submissionEnabled)throw new Error('Head Office has disabled submissions for this report subject.');
  var originalName=cleanFileName_(payload.fileName||'report.pdf'), mime=String(payload.mimeType||'').toLowerCase(); if(mime&&mime!=='application/pdf')throw new Error('Only PDF files are permitted.');
  var base64=String(payload.fileBase64||'').replace(/^data:application\/pdf;base64,/,''); if(!base64)throw new Error('The selected PDF was empty.');
  var maxBytes=CONFIG.MAX_FILE_MB*1024*1024; if(Math.floor(base64.length*.75)>maxBytes)throw new Error('The PDF exceeds the '+CONFIG.MAX_FILE_MB+' MB file limit.');
  var bytes; try{bytes=Utilities.base64Decode(base64);}catch(e){throw new Error('The PDF could not be read. Select the file again.');}
  if(bytes.length>maxBytes)throw new Error('The PDF exceeds the '+CONFIG.MAX_FILE_MB+' MB file limit.'); if(!looksLikePdf_(bytes))throw new Error('The selected file is not a valid PDF.');
  instance=resolveActiveSubjectInstance_(payload.subjectId);subject=instance.master;if(!instance.submissionEnabled)throw new Error('Submissions are closed for this report subject or reporting period.');
  /* V17.6.10: acquire the portal lock BEFORE resolving/creating the Drive
     folder. Two offices can upload at the same time; creating the folder
     outside the lock allowed both requests to see "no folder" and create
     duplicate same-named folders. */
  var lock=acquirePortalLock_();
  try{
    instance=resolveActiveSubjectInstance_(payload.subjectId);subject=instance.master;
    if(!instance.submissionEnabled)throw new Error('Submissions are closed for this report subject or reporting period.');
    var folder=getOrCreateReportCycleFolder_(subject,instance.reportKind);
    var timestamp=Utilities.formatDate(new Date(),CONFIG.TIME_ZONE,'yyyyMMdd_HHmmss');
    var savedName=sanitizeName_(office.name)+'_'+(instance.reportKind==='QUARTERLY'?'QUARTERLY':'MONTHLY')+'_'+timestamp+'_'+originalName;
    var file=folder.createFile(Utilities.newBlob(bytes,'application/pdf',savedName));
    var id=Utilities.getUuid(), spreadsheet=getDatabase_(), cycle=currentCycleKey_();
    appendSubmission_({submissionId:id,subjectId:instance.instanceId,masterSubjectId:subject.id,subjectName:instance.displayName,reportKind:instance.reportKind,cycleKey:cycle,officeId:office.id,officeName:office.name,fileName:savedName,fileId:file.getId(),fileUrl:file.getUrl(),sizeBytes:bytes.length},spreadsheet);
    upsertCurrentStatus_({submissionId:id,subjectId:instance.instanceId,masterSubjectId:subject.id,subjectName:instance.displayName,reportKind:instance.reportKind,cycleKey:cycle,officeId:office.id,officeName:office.name,submitted:true,submittedAt:new Date(),fileName:savedName,fileId:file.getId(),fileUrl:file.getUrl(),sizeBytes:bytes.length},spreadsheet);
    SpreadsheetApp.flush();

    /*
     * V17.6.9 FIX:
     * Do NOT perform a second full dashboard read immediately after writing.
     * That read could see a transient/stale index and incorrectly report
     * "status could not be confirmed" even though the PDF and submission
     * rows had already been written. The frontend already paints Submitted
     * from the successful response and then performs a fresh dashboard read.
     * Current_Status + append-only Submissions remain the source of truth.
     */
    SpreadsheetApp.flush();
    invalidateCache_();

    var submittedAt=new Date().toISOString();
    return {
      ok:true,
      message:office.name+' '+(instance.reportKind==='QUARTERLY'?'quarterly':(instance.reportKind==='ONE_TIME'?'one-time':'monthly'))+' report submitted successfully.',
      submittedAt:submittedAt,
      statusKey:instance.instanceId+'__'+office.id,
      subjectId:instance.instanceId,
      officeId:office.id
    };
  }catch(error){
    /* Keep a successfully created PDF if a later indexing/cache operation
       fails. The append-only submission record is authoritative. */
    throw error;
  }finally{lock.releaseLock();}
}

function handleRemoveSubmission_(payload) {
  enforcePortalOfficeActionMode_(payload.securityCode); var office=getOfficeById_(payload.officeId);verifyCode_(office.id,payload.securityCode,'reportRemove');
  var instance=resolveActiveSubjectInstance_(payload.subjectId),subject=instance.master;if(!subject.submissionEnabled)throw new Error('Head Office has disabled changes for this report subject. The submitted report remains available to view.');
  var lock=acquirePortalLock_();try{instance=resolveActiveSubjectInstance_(payload.subjectId);subject=instance.master;var spreadsheet=getDatabase_();
    var latest=findLatestSubmissionForOffice_(instance.instanceId,office.id,spreadsheet);if(!latest||latest.status!=='SUBMITTED')throw new Error('No submitted report is available for removal for the current month.');
    if(latest.fileId){try{DriveApp.getFileById(latest.fileId).setTrashed(true);}catch(e){throw new Error('The uploaded PDF could not be moved to Drive Trash.');}}
    var id=Utilities.getUuid(),cycle=currentCycleKey_();
    appendSubmission_({submissionId:id,subjectId:instance.instanceId,masterSubjectId:subject.id,subjectName:instance.displayName,reportKind:instance.reportKind,cycleKey:cycle,officeId:office.id,officeName:office.name,fileName:latest.fileName,fileId:latest.fileId,fileUrl:latest.fileUrl,sizeBytes:latest.sizeBytes,status:'Removed'},spreadsheet);
    upsertCurrentStatus_({submissionId:id,subjectId:instance.instanceId,masterSubjectId:subject.id,subjectName:instance.displayName,reportKind:instance.reportKind,cycleKey:cycle,officeId:office.id,officeName:office.name,submitted:false,submittedAt:'',fileName:latest.fileName,fileId:latest.fileId,fileUrl:latest.fileUrl,sizeBytes:latest.sizeBytes},spreadsheet);
    SpreadsheetApp.flush();

    var verifyStatus =
      getLatestSubmissionStatus_(
        buildDashboardSubjectInstances_(
          getActiveSubjects_(spreadsheet),
          new Date()
        ),
        spreadsheet
      );

    var verifyKey =
      instance.instanceId +
      '__' +
      office.id;

    if (
      verifyStatus[verifyKey] &&
      verifyStatus[verifyKey].submitted === true
    ) {
      throw new Error(
        'The PDF was removed, but the Pending status could not be confirmed. Refresh the dashboard.'
      );
    }

    invalidateCache_();return{ok:true,message:office.name+' report removed for the current month. The PDF was moved to Google Drive Trash.'};
  }finally{lock.releaseLock();}
}

function handleViewSubmission_(payload) {
  enforcePortalOfficeActionMode_(payload.securityCode);var office=getOfficeById_(payload.officeId);verifyCode_(office.id,payload.securityCode,'reportViewFile');
  var instance=resolveActiveSubjectInstance_(payload.subjectId),spreadsheet=getDatabase_();var latest=findLatestSubmissionForOffice_(instance.instanceId,office.id,spreadsheet);
  if(!latest||latest.status!=='SUBMITTED'||!latest.fileId)throw new Error('No submitted report is available to view for the current month.');
  try{DriveApp.getFileById(latest.fileId).getName();}catch(e){throw new Error('The submitted PDF is no longer available in Google Drive.');}
  var token=Utilities.getUuid();CacheService.getScriptCache().put('PDF_VIEW_'+token,JSON.stringify({fileId:latest.fileId,fileName:latest.fileName||(office.name+'_report.pdf')}),300);
  var serviceUrl=ScriptApp.getService().getUrl();if(!serviceUrl)throw new Error('The secure report viewer is available only from the deployed portal.');
  return{ok:true,message:'Security code verified. Opening the current-month report.',viewUrl:serviceUrl+'?action=view&token='+encodeURIComponent(token)};
}

function handleAddSubject_(payload) {
  verifyCode_('HEAD_OFFICE',payload.securityCode,'subjectManage');

  var subjectName = cleanSubjectName_(payload.subjectName);
  var recurrenceMode = cleanSubjectRecurrenceMode_(payload.recurrenceMode || 'ONE_TIME');
  var oneTimeCycle = cleanCycleKey_(payload.oneTimeCycle);
  var closingDate = String(payload.closingDate || '').trim();

  if (recurrenceMode === 'ONE_TIME') {
    if (!oneTimeCycle) throw new Error('Select the month and year for the one-time subject.');
    closingDate = cleanOptionalClosingDate_(closingDate,oneTimeCycle);
  } else {
    oneTimeCycle = '';
    closingDate = '';
  }

  var addLinkText = String(payload.linkText || '').trim();
  var addLinkPdf = String(payload.linkedPdfBase64 || '').trim();
  if ((addLinkText && !addLinkPdf) || (!addLinkText && addLinkPdf)) {
    throw new Error('Enter the text to hyperlink and select a PDF file.');
  }

  var linkedPdf = prepareLinkedSubjectPdf_(subjectName,payload);
  var lock = acquirePortalLock_();

  try {
    var existing = findSubjectByName_(subjectName);
    if (existing && existing.active) throw new Error('This report subject already exists.');

    var subject;
    if (existing && !existing.active) {
      subject = reactivateSubject_(existing);
      setSubjectRecurrence_(subject,recurrenceMode,oneTimeCycle,closingDate);
      subject = findActiveSubjectById_(subject.id);
    } else {
      subject = createSubject_(subjectName,'Head Office',recurrenceMode,oneTimeCycle,closingDate);
    }

    if (linkedPdf) saveLinkedSubjectPdf_(subject,linkedPdf);
    invalidateCache_();

    var message = recurrenceMode === 'ONE_TIME'
      ? 'One-time subject saved for ' + monthlyPeriodLabel_(oneTimeCycle) + '.'
      : recurrenceMode === 'MONTHLY_QUARTERLY'
        ? 'Subject saved as Monthly + Quarterly. Month and quarter are added automatically to the displayed subject.'
        : recurrenceMode === 'QUARTERLY_ONLY'
          ? 'Subject saved as Quarterly only. It appears only in the month following each quarter end (Jan, Apr, Jul, Oct).'
          : 'Subject saved as Monthly. Month and year are added automatically to the displayed subject.';

    return { ok:true, message:message };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateSubjectLink_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');
  var subjectId = cleanId_(payload.subjectId);

  var lock = acquirePortalLock_();
  try {
    var subject = findActiveSubjectById_(subjectId);
    if (!subject) throw new Error('Active subject not found. Refresh the portal and try again.');

    var linkedPdf = prepareLinkedSubjectPdf_(subject.name, payload);
    var linkWasUpdated = false;

    if (linkedPdf) {
      saveLinkedSubjectPdf_(subject, linkedPdf);
      linkWasUpdated = true;
    } else if (payload.keepExistingLink === true || String(payload.keepExistingLink || '').toLowerCase() === 'true') {
      if (!subject.linkUrl) throw new Error('Upload a PDF before saving this hyperlink.');
      var retainedText = cleanSubjectLinkText_(subject.name, payload.linkText);
      updateSubjectLinkRecord_(subject, retainedText, subject.linkUrl, subject.linkFileId, subject.linkFileName);
      linkWasUpdated = true;
    } else {
      removeLinkedSubjectPdf_(subject);
      updateSubjectLinkRecord_(subject, '', '', '', '');
    }

    invalidateCache_();
    return {
      ok: true,
      message: linkWasUpdated
        ? 'Subject PDF hyperlink updated successfully.'
        : 'Subject PDF hyperlink removed successfully.'
    };
  } finally {
    lock.releaseLock();
  }
}

/** Renames both the dashboard subject and its recorded Drive folder. */
function handleRenameSubject_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');

  var subjectId = cleanId_(payload.subjectId);
  var newSubjectName = cleanSubjectName_(payload.subjectName || payload.newSubjectName);
  if (!subjectId) throw new Error('Subject ID is missing. Refresh the portal and try again.');

  var lock = acquirePortalLock_();
  try {
    var subject = findActiveSubjectById_(subjectId);
    if (!subject) throw new Error('Active subject not found. Refresh the portal and try again.');

    var duplicate = findSubjectByName_(newSubjectName);
    if (duplicate && duplicate.id !== subject.id) {
      throw new Error('Another report subject already uses this name.');
    }

    var newLinkText = '';
    if (subject.linkUrl) {
      newLinkText = cleanSubjectLinkText_(
        newSubjectName,
        payload.linkText || subject.linkText
      );
    }

    if (subject.name === newSubjectName && subject.linkText === newLinkText) {
      return { ok: true, message: 'The subject name is already up to date.' };
    }

    var folder = getOrCreateSubjectFolder_(subject);
    var previousFolderName = folder.getName();
    folder.setName(newSubjectName);

    try {
      var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
      sheet.getRange(subject.rowNumber, 2).setValue(newSubjectName);
      sheet.getRange(subject.rowNumber, 6).setValue(new Date());
      if (subject.linkUrl) sheet.getRange(subject.rowNumber, 8).setValue(newLinkText);
    } catch (sheetError) {
      try { folder.setName(previousFolderName); } catch (rollbackError) {}
      throw sheetError;
    }

    invalidateCache_();
    return {
      ok: true,
      message: 'Subject and its Google Drive folder were renamed successfully.',
      subjectId: subject.id,
      subjectName: newSubjectName
    };
  } finally {
    lock.releaseLock();
  }
}

function handleSetSubjectRecurrence_(payload) {
  verifyCode_('HEAD_OFFICE',payload.securityCode,'subjectManage');

  var subjectId = cleanId_(payload.subjectId);
  var mode = cleanSubjectRecurrenceMode_(payload.recurrenceMode);
  var oneTimeCycle = cleanCycleKey_(payload.oneTimeCycle);
  var closingDate = String(payload.closingDate || '').trim();

  if (mode === 'ONE_TIME') {
    if (!oneTimeCycle) throw new Error('Select the month and year for the one-time subject.');
    closingDate = cleanOptionalClosingDate_(closingDate,oneTimeCycle);
  } else {
    oneTimeCycle = '';
    closingDate = '';
  }

  var lock = acquirePortalLock_();
  try {
    var subject = findActiveSubjectById_(subjectId);
    if (!subject) throw new Error('Active subject not found. Refresh the portal and try again.');

    var saved = setSubjectRecurrence_(subject,mode,oneTimeCycle,closingDate);
    invalidateCache_();

    var message = saved.recurrenceMode === 'ONE_TIME'
      ? 'Schedule saved: One-time · ' + monthlyPeriodLabel_(saved.oneTimeCycle) + '.'
      : saved.recurrenceMode === 'MONTHLY_QUARTERLY'
        ? 'Schedule saved: Monthly + Quarterly. Jan→Q4, Apr→Q1, Jul→Q2 and Oct→Q3 are labelled automatically.'
        : saved.recurrenceMode === 'QUARTERLY_ONLY'
          ? 'Schedule saved: Quarterly only. Jan→Q4, Apr→Q1, Jul→Q2 and Oct→Q3 are labelled automatically; no monthly requirement.'
          : 'Schedule saved: Monthly. The current month and year are labelled automatically.';

    return {
      ok:true,
      recurrenceMode:saved.recurrenceMode,
      oneTimeCycle:saved.oneTimeCycle,
      closingDate:saved.closingDate,
      message:message
    };
  } finally {
    lock.releaseLock();
  }
}

function handleArchiveSubject_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');
  var subjectId = cleanId_(payload.subjectId);

  var lock = acquirePortalLock_();
  try {
    var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
    var values = sheet.getDataRange().getValues();

    for (var row = 1; row < values.length; row++) {
      if (String(values[row][0]) === subjectId && String(values[row][3]).toUpperCase() === 'TRUE') {
        sheet.getRange(row + 1, 4).setValue(false);
        sheet.getRange(row + 1, 6).setValue(new Date());
        invalidateCache_();
        return {
          ok: true,
          message: 'Subject removed from the portal. Existing files were preserved.'
        };
      }
    }

    throw new Error('Active subject not found.');
  } finally {
    lock.releaseLock();
  }
}


function handleSetSubjectVisibility_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');

  var subjectId = cleanId_(payload.subjectId);
  var visible =
    payload.visible === true ||
    String(payload.visible || '').toLowerCase() === 'true';

  var lock = acquirePortalLock_();

  try {
    var subject = findActiveSubjectById_(subjectId);

    if (!subject) {
      throw new Error(
        'Active subject not found. Refresh the portal and try again.'
      );
    }

    var sheet =
      getDatabase_()
        .getSheetByName(
          CONFIG.SUBJECTS_SHEET
        );

    sheet.getRange(subject.rowNumber, 17).setValue(visible);
    sheet.getRange(subject.rowNumber, 6).setValue(new Date());

    SpreadsheetApp.flush();
    invalidateCache_();

    return {
      ok: true,
      subjectId: subjectId,
      dashboardVisible: visible,
      message: visible
        ? subject.name + ' is now visible on the dashboard.'
        : subject.name + ' is now hidden from all dashboard users.'
    };
  } finally {
    lock.releaseLock();
  }
}


function handleSetSubjectSubmission_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'subjectManage');
  var subjectId = cleanId_(payload.subjectId);
  var enabled = payload.enabled === true || String(payload.enabled || '').toLowerCase() === 'true';

  var lock = acquirePortalLock_();
  try {
    var subject = findActiveSubjectById_(subjectId);
    if (!subject) throw new Error('Active subject not found. Refresh the portal and try again.');

    var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
    sheet.getRange(subject.rowNumber, 12).setValue(enabled);
    sheet.getRange(subject.rowNumber, 6).setValue(new Date());
    invalidateCache_();

    return {
      ok: true,
      message: enabled
        ? 'Sub-office submissions have been enabled for this subject.'
        : 'Sub-office submissions have been disabled for this subject. Existing reports remain available to view.'
    };
  } finally {
    lock.releaseLock();
  }
}



/* =========================================================================
 * TARGETS & REMINDERS — HR DASHBOARD STYLE
 * ========================================================================= */

/**
 * Same data shape/behaviour as the HR dashboard:
 * Type, Title, Details, Due Date, Colour, Active/Completed and history.
 * Read access is public in this portal; all writes require Head Office code.
 */
function getStickyNotesBootstrap_() {
  var notes = getStickyNotes_();

  return {
    ok: true,
    notes: notes,
    activeCount: notes.filter(function(note) {
      return note.status !== 'Completed';
    }).length,
    completedCount: notes.filter(function(note) {
      return note.status === 'Completed';
    }).length,
    backendVersion: CONFIG.BACKEND_VERSION,
    lastUpdated: new Date().toISOString()
  };
}

function handleAddStickyNote_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');

  var type = cleanStickyType_(payload.type);
  var title = cleanStickyTitle_(payload.title);
  var details = cleanStickyDetails_(payload.details);
  var dueDate = cleanStickyDueDate_(payload.dueDate);
  var colour = cleanStickyColour_(payload.colour || payload.color);

  var sheet = ensureStickyNotesSheet_();
  var now = stickyTimestamp_();
  var id = Utilities.getUuid();

  sheet.appendRow([
    id,
    type,
    safeStickyText_(title),
    safeStickyText_(details),
    dueDate,
    colour,
    'Active',
    now,
    'Head Office',
    '',
    ''
  ]);

  return {
    ok: true,
    saved: true,
    message: 'Target / Reminder saved successfully.',
    notes: getStickyNotes_()
  };
}

function handleUpdateStickyNote_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');

  var id = cleanId_(payload.noteId || payload.id);
  if (!id) throw new Error('The target or reminder could not be found.');

  var sheet = ensureStickyNotesSheet_();
  var rowNumber = findStickyNoteRow_(id);

  if (!rowNumber) {
    throw new Error('The target or reminder could not be found.');
  }

  var existing = sheet.getRange(rowNumber, 1, 1, 11).getDisplayValues()[0];

  if (String(existing[6] || '') === 'Completed') {
    throw new Error('Completed notes cannot be edited. Restore it first if needed.');
  }

  var type = cleanStickyType_(
    payload.type == null ? existing[1] : payload.type
  );
  var title = cleanStickyTitle_(
    payload.title == null ? existing[2] : payload.title
  );
  var details = cleanStickyDetails_(
    payload.details == null ? existing[3] : payload.details
  );
  var dueDate = cleanStickyDueDate_(
    payload.dueDate == null ? existing[4] : payload.dueDate
  );
  var colour = cleanStickyColour_(
    payload.colour == null && payload.color == null
      ? existing[5]
      : (payload.colour || payload.color)
  );

  sheet.getRange(rowNumber, 2, 1, 5).setValues([[
    type,
    safeStickyText_(title),
    safeStickyText_(details),
    dueDate,
    colour
  ]]);

  return {
    ok: true,
    saved: true,
    message: 'Target / Reminder updated successfully.',
    notes: getStickyNotes_()
  };
}

function handleCompleteStickyNote_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');

  var id = cleanId_(payload.noteId || payload.id);
  if (!id) throw new Error('The target or reminder could not be found.');

  var sheet = ensureStickyNotesSheet_();
  var rowNumber = findStickyNoteRow_(id);

  if (!rowNumber) {
    throw new Error('The target or reminder could not be found.');
  }

  var completedAt = stickyTimestamp_();

  // Do NOT delete the row. Mark it Completed and preserve it in history.
  sheet.getRange(rowNumber, 7).setValue('Completed');
  sheet.getRange(rowNumber, 10).setValue(completedAt);
  sheet.getRange(rowNumber, 11).setValue('Head Office');

  // Ensure the Completed status/history is committed before replying.
  SpreadsheetApp.flush();

  return {
    ok: true,
    completed: true,
    savedToHistory: true,
    completedAt: completedAt,
    message: 'Target / Reminder completed and saved in Completed history.',
    notes: getStickyNotes_()
  };
}

function handleRestoreStickyNote_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');

  var id = cleanId_(payload.noteId || payload.id);
  if (!id) throw new Error('The target or reminder could not be found.');

  var sheet = ensureStickyNotesSheet_();
  var rowNumber = findStickyNoteRow_(id);

  if (!rowNumber) {
    throw new Error('The target or reminder could not be found.');
  }

  sheet.getRange(rowNumber, 7).setValue('Active');
  sheet.getRange(rowNumber, 10).setValue('');
  sheet.getRange(rowNumber, 11).setValue('');

  return {
    ok: true,
    restored: true,
    message: 'Target / Reminder restored to Active.',
    notes: getStickyNotes_()
  };
}

function handleDeleteStickyNote_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');

  var id = cleanId_(payload.noteId || payload.id);
  if (!id) throw new Error('The target or reminder could not be found.');

  var sheet = ensureStickyNotesSheet_();
  var rowNumber = findStickyNoteRow_(id);

  if (!rowNumber) {
    throw new Error('The target or reminder could not be found.');
  }

  sheet.deleteRow(rowNumber);

  return {
    ok: true,
    deleted: true,
    message: 'Target / Reminder deleted.',
    notes: getStickyNotes_()
  };
}

/**
 * Retained for compatibility with the earlier V15.7 frontend.
 * HR-style floating note position/size/pin are stored in the user's browser,
 * exactly like the HR dashboard, not in the Sheet.
 */
function handleReorderStickyNotes_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'stickyManage');
  return {
    ok: true,
    message: 'HR-style sticky position is stored in the browser.'
  };
}

function ensureStickyNotesSheet_(spreadsheet) {
  // IMPORTANT: when called from ensureSheets_(), use the already-open
  // spreadsheet. Calling getDatabase_() from there would recurse:
  // getDatabase_ -> ensureSheets_ -> ensureStickyNotesSheet_ -> getDatabase_.
  spreadsheet = spreadsheet || getDatabase_();

  var sheet = spreadsheet.getSheetByName(CONFIG.STICKY_NOTES_SHEET);
  var headers = [
    'ID',
    'Type',
    'Title',
    'Details',
    'Due Date',
    'Colour',
    'Status',
    'Created At',
    'Created By',
    'Completed At',
    'Completed By'
  ];

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.STICKY_NOTES_SHEET);
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns()
    );
  }

  var oldHeader = sheet.getLastRow() > 0
    ? String(sheet.getRange(1, 1).getDisplayValue() || '')
    : '';

  /*
   * If the temporary V15.7 Sticky_Notes schema exists and contains no saved
   * records, safely replace its header with the exact HR-style schema.
   * If records exist, preserve the sheet and migrate recognizable fields.
   */
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (oldHeader !== 'ID') {
    migrateTemporaryStickySheetToHrStyle_(sheet, headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  try {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#7c3aed')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    sheet.setColumnWidth(1, 190);
    sheet.setColumnWidth(2, 95);
    sheet.setColumnWidth(3, 220);
    sheet.setColumnWidth(4, 360);
    sheet.setColumnWidth(5, 110);
  } catch (ignore) {}

  return sheet;
}

function migrateTemporaryStickySheetToHrStyle_(sheet, headers) {
  var values = sheet.getDataRange().getDisplayValues();
  var migrated = [];

  for (var row = 1; row < values.length; row++) {
    var source = values[row];
    var id = String(source[0] || '').trim();

    if (!id) continue;

    var title = String(source[1] || '').trim();
    var details = String(source[2] || '').trim();
    var colour = cleanStickyColour_(source[3] || 'yellow');
    var rawStatus = String(source[4] || 'ACTIVE').toUpperCase();
    var status = rawStatus === 'COMPLETED' ? 'Completed' : 'Active';
    var createdAt = String(source[9] || '');
    var completedAt = String(source[11] || '');

    migrated.push([
      id,
      'Reminder',
      safeStickyText_(title || 'Untitled note'),
      safeStickyText_(details),
      '',
      colour,
      status,
      createdAt || stickyTimestamp_(),
      'Head Office',
      status === 'Completed' ? completedAt : '',
      status === 'Completed' ? 'Head Office' : ''
    ]);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (migrated.length) {
    sheet.getRange(2, 1, migrated.length, headers.length).setValues(migrated);
  }
}

function getStickyNotes_() {
  var sheet = ensureStickyNotesSheet_();

  if (sheet.getLastRow() < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 12)
    .getDisplayValues()
    .filter(function(row) {
      return String(row[0] || '').trim();
    })
    .map(function(row) {
      return {
        id: row[0],
        type: row[1],
        title: row[2],
        details: row[3],
        dueDate: row[4],
        colour: row[5],
        status: row[6],
        createdAt: row[7],
        createdBy: row[8],
        completedAt: row[9],
        completedBy: row[10]
      };
    })
    .sort(function(a, b) {
      if (a.status !== b.status) {
        return a.status === 'Active' ? -1 : 1;
      }

      if (a.status === 'Active') {
        return String(a.dueDate || '9999-12-31')
          .localeCompare(String(b.dueDate || '9999-12-31'));
      }

      return String(b.completedAt || '')
        .localeCompare(String(a.completedAt || ''));
    });
}

function findStickyNoteRow_(id) {
  var sheet = ensureStickyNotesSheet_();

  if (sheet.getLastRow() < 2) return 0;

  var ids = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (var index = 0; index < ids.length; index++) {
    if (String(ids[index][0] || '') === id) {
      return index + 2;
    }
  }

  return 0;
}

function cleanStickyType_(value) {
  return String(value || '').toLowerCase() === 'target'
    ? 'Target'
    : 'Reminder';
}

function cleanStickyTitle_(value) {
  var text = String(value || '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);

  if (!text) {
    throw new Error('Enter a title for the target or reminder.');
  }

  return text;
}

function cleanStickyDetails_(value) {
  return String(value == null ? '' : value)
    .replace(/\u0000/g, '')
    .trim()
    .substring(0, 500);
}

function cleanStickyDueDate_(value) {
  var text = String(value || '').trim();

  if (!text) return '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('Enter a valid due date.');
  }

  return text;
}

function cleanStickyColour_(value) {
  var colour = String(value || '').toLowerCase();
  var allowed = {
    yellow: true,
    pink: true,
    blue: true,
    green: true,
    purple: true,
    orange: true
  };

  return allowed[colour] ? colour : 'yellow';
}

function stickyTimestamp_() {
  return Utilities.formatDate(
    new Date(),
    CONFIG.TIME_ZONE,
    'yyyy-MM-dd HH:mm:ss'
  );
}

function safeStickyText_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}



/* =========================================================================
 * RAW DATA DASHBOARD
 * ========================================================================= */

/**
 * Returns the current-month Raw Data dashboard.
 *
 * Values are stored by month, so the portal automatically starts a fresh
 * Raw Data view when the month changes while retaining old months in Sheet.
 */
function getRawBootstrapData_(sessionToken) {
  authoriseRawDataRead_(sessionToken);

  var cache = CacheService.getScriptCache();
  var cycleKey = getCurrentCycleKey_();
  var cacheKey = 'RAW_SNAPSHOT_V176_' + cycleKey;
  var cached = cache.get(cacheKey);

  if (cached) return JSON.parse(cached);

  var spreadsheet = getDatabase_();
  var items = orderRawItemsForDashboard_(
    getActiveRawItems_(spreadsheet)
  );
  var latestValues = getLatestRawValues_(
    cycleKey,
    items,
    spreadsheet
  );
  var totals = {};
  var grandTotal = 0;
  var enteredCount = 0;

  items.forEach(function(item) {
    var total = 0;

    RAW_DATA_OFFICES.forEach(function(office) {
      var key = item.id + '__' + office.id;
      var record = latestValues[key];

      if (
        record &&
        typeof record.value === 'number' &&
        isFinite(record.value)
      ) {
        total += record.value;
        enteredCount++;
      }
    });

    totals[item.id] = normaliseRawNumber_(total);
    grandTotal += total;
  });

  var result = {
    ok: true,
    cycleKey: cycleKey,
    cycleName: Utilities.formatDate(
      new Date(),
      CONFIG.TIME_ZONE,
      'MMMM yyyy'
    ),
    offices: RAW_DATA_OFFICES,
    items: items.map(function(item) {
      return {
        id: item.id,
        name: item.name,
        parentId: item.parentId || '',
        isSubrow: !!item.parentId
      };
    }),
    values: latestValues,
    totals: totals,
    grandTotal: normaliseRawNumber_(grandTotal),
    enteredCount: enteredCount,
    totalCells: items.length * RAW_DATA_OFFICES.length,
    backendVersion: CONFIG.BACKEND_VERSION,
    lastUpdated: new Date().toISOString()
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), 300);
  } catch (cachePutError) {
    // Non-fatal: Raw Data still returns correctly, just uncached this time.
  }
  return result;
}

/** Head Office only: add a new Raw Data row/particular. */
function handleAddRawItem_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'rawStructureManage');

  var itemName = cleanRawItemName_(payload.itemName);
  var lock = acquirePortalLock_();

  try {
    var existing = findRawItemByName_(itemName);

    if (existing && existing.active) {
      throw new Error('This Raw Data item already exists.');
    }

    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);
    var now = new Date();

    if (existing && !existing.active) {
      sheet.getRange(existing.rowNumber, 3).setValue(true);
      sheet.getRange(existing.rowNumber, 5).setValue(now);

      return {
        ok: true,
        message: 'Raw Data item restored successfully.',
        itemId: existing.id,
        itemName: existing.name
      };
    }

    var itemId = Utilities.getUuid();

    sheet.appendRow([
      itemId,
      itemName,
      true,
      now,
      now,
      'Head Office',
      '',
      sheet.getLastRow()
    ]);

    return {
      ok: true,
      message: 'Raw Data row added successfully.',
      itemId: itemId,
      itemName: itemName
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Head Office only: remove a Raw Data row from the live dashboard.
 * Historical data is preserved in Raw_Data.
 */
/**
 * Head Office only: rename/edit an existing Raw Data row.
 * Existing values are preserved because Raw Data is linked by item ID.
 */
/**
 * Head Office only: add one subrow immediately below a main Raw Data row.
 * Subrows have the same six office columns and their own automatic TOTAL.
 */
function handleAddRawSubItem_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'rawStructureManage');

  var parentItemId = cleanId_(
    payload.parentItemId || payload.parentId
  );

  if (!parentItemId) {
    throw new Error('Select the main Raw Data row for this subrow.');
  }

  var itemName = cleanRawItemName_(payload.itemName);
  var lock = acquirePortalLock_();

  try {
    var parentItem = findActiveRawItemById_(parentItemId);

    if (!parentItem) {
      throw new Error(
        'The selected parent Raw Data row is no longer active. Refresh and try again.'
      );
    }

    if (parentItem.parentId) {
      throw new Error(
        'A subrow can be added only below a main Raw Data row.'
      );
    }

    var existing = findRawItemByName_(itemName);

    if (existing && existing.active) {
      throw new Error('This Raw Data item already exists.');
    }

    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);
    var now = new Date();

    if (existing && !existing.active) {
      sheet.getRange(existing.rowNumber, 3).setValue(true);
      sheet.getRange(existing.rowNumber, 5).setValue(now);
      sheet.getRange(existing.rowNumber, 7).setValue(parentItem.id);
      sheet.getRange(existing.rowNumber, 8).setValue(existing.rowNumber);

      return {
        ok: true,
        message: 'Raw Data subrow restored successfully.',
        itemId: existing.id,
        itemName: existing.name,
        parentItemId: parentItem.id
      };
    }

    var itemId = Utilities.getUuid();

    sheet.appendRow([
      itemId,
      itemName,
      true,
      now,
      now,
      'Head Office',
      parentItem.id,
      sheet.getLastRow()
    ]);

    return {
      ok: true,
      message: 'Raw Data subrow added successfully.',
      itemId: itemId,
      itemName: itemName,
      parentItemId: parentItem.id
    };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Head Office only: delete/archive one Raw Data subrow.
 * Historical values remain preserved in Raw_Data for audit/history.
 */
function handleDeleteRawSubItem_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'rawStructureManage');

  var itemId = cleanId_(payload.itemId);
  if (!itemId) throw new Error('Raw Data subrow ID is missing.');

  var lock = acquirePortalLock_();

  try {
    var item = findActiveRawItemById_(itemId);

    if (!item) {
      throw new Error(
        'This Raw Data subrow is no longer active. Refresh the page and try again.'
      );
    }

    if (!item.parentId) {
      throw new Error(
        'Only a Raw Data subrow can be deleted with this action.'
      );
    }

    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);

    sheet.getRange(item.rowNumber, 3).setValue(false);
    sheet.getRange(item.rowNumber, 5).setValue(new Date());

    return {
      ok: true,
      message:
        'Raw Data subrow deleted from the live dashboard. Historical values were preserved.',
      itemId: item.id,
      itemName: item.name,
      parentItemId: item.parentId
    };
  } finally {
    lock.releaseLock();
  }
}


function handleRenameRawItem_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'rawStructureManage');

  var itemId = cleanId_(payload.itemId);
  if (!itemId) throw new Error('Raw Data item ID is missing.');

  var newItemName = cleanRawItemName_(
    payload.itemName || payload.newItemName
  );

  var lock = acquirePortalLock_();

  try {
    var item = findActiveRawItemById_(itemId);

    if (!item) {
      throw new Error(
        'This Raw Data item is no longer active. Refresh the page and try again.'
      );
    }

    var duplicate = findRawItemByName_(newItemName);

    if (duplicate && duplicate.id !== item.id && duplicate.active) {
      throw new Error(
        'Another active Raw Data item already uses this name.'
      );
    }

    if (item.name === newItemName) {
      return {
        ok: true,
        message: 'The Raw Data item name is already up to date.',
        itemId: item.id,
        itemName: item.name
      };
    }

    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);

    sheet.getRange(item.rowNumber, 2).setValue(newItemName);
    sheet.getRange(item.rowNumber, 5).setValue(new Date());

    return {
      ok: true,
      message: 'Raw Data item renamed successfully. Existing values were preserved.',
      itemId: item.id,
      itemName: newItemName
    };
  } finally {
    lock.releaseLock();
  }
}


function handleArchiveRawItem_(payload) {
  verifyCode_('HEAD_OFFICE', payload.securityCode, 'rawStructureManage');

  var itemId = cleanId_(payload.itemId);
  if (!itemId) throw new Error('Raw Data item ID is missing.');

  var lock = acquirePortalLock_();

  try {
    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);
    var values = sheet.getDataRange().getValues();

    for (var row = 1; row < values.length; row++) {
      if (
        String(values[row][0] || '') === itemId &&
        (values[row][2] === true || String(values[row][2]).toUpperCase() === 'TRUE')
      ) {
        sheet.getRange(row + 1, 3).setValue(false);
        sheet.getRange(row + 1, 5).setValue(new Date());

        return {
          ok: true,
          message: 'Raw Data row removed from the current dashboard. Historical values were preserved.'
        };
      }
    }

    throw new Error('Raw Data item not found.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Save/update one Raw Data cell for the current month.
 *
 * O/o ADG(B) uses the Head Office code.
 * Each sub-office uses only its own existing office code.
 */
function handleSaveRawDataValue_(payload) {
  var office = getRawDataOfficeById_(payload.officeId);
  verifyCode_(office.id, payload.securityCode, 'rawEdit');

  var itemId = cleanId_(payload.itemId);
  var item = findActiveRawItemById_(itemId);

  if (!item) {
    throw new Error('This Raw Data item is no longer active. Refresh the page and try again.');
  }

  var value = parseRawNumber_(payload.value);
  var cycleKey = getCurrentCycleKey_();
  var now = new Date();

  var lock = acquirePortalLock_();

  try {
    var sheet = getDatabase_().getSheetByName(CONFIG.RAW_DATA_SHEET);

    sheet.appendRow([
      Utilities.getUuid(),
      cycleKey,
      now,
      item.id,
      item.name,
      office.id,
      office.name,
      value,
      now
    ]);

    return {
      ok: true,
      message: office.name + ' Raw Data saved successfully.',
      cycleKey: cycleKey,
      itemId: item.id,
      officeId: office.id,
      value: value
    };
  } finally {
    lock.releaseLock();
  }
}

function getCurrentCycleKey_() {
  return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM');
}

function getActiveRawItems_(spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var sheet = spreadsheet.getSheetByName(CONFIG.RAW_ITEMS_SHEET);

  if (sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 8)
    .getValues()
    .map(function (row, index) {
      return rawItemFromRow_(row, index + 2);
    })
    .filter(function (item) {
      return item.active;
    });
}

function getAllRawItems_() {
  var sheet = getDatabase_().getSheetByName(CONFIG.RAW_ITEMS_SHEET);

  if (sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 8)
    .getValues()
    .map(function (row, index) {
      return rawItemFromRow_(row, index + 2);
    });
}

function rawItemFromRow_(row, rowNumber) {
  return {
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    active: row[2] === true || String(row[2]).toUpperCase() === 'TRUE',
    createdAt: row[3],
    updatedAt: row[4],
    createdBy: String(row[5] || ''),
    parentId: String(row[6] || ''),
    sortOrder: Number(row[7]) || rowNumber,
    rowNumber: rowNumber
  };
}

/**
 * Main rows retain their sheet order.
 * Their active subrows are placed immediately underneath.
 */
function orderRawItemsForDashboard_(items) {
  var byId = {};
  var childrenByParent = {};
  var roots = [];

  items.forEach(function (item) {
    byId[item.id] = item;
  });

  items.forEach(function (item) {
    if (
      item.parentId &&
      byId[item.parentId] &&
      !byId[item.parentId].parentId
    ) {
      if (!childrenByParent[item.parentId]) {
        childrenByParent[item.parentId] = [];
      }

      childrenByParent[item.parentId].push(item);
    } else {
      roots.push(item);
    }
  });

  function sortItems(list) {
    return list.sort(function (left, right) {
      var leftOrder = Number(left.sortOrder) || left.rowNumber || 0;
      var rightOrder = Number(right.sortOrder) || right.rowNumber || 0;
      return leftOrder - rightOrder;
    });
  }

  sortItems(roots);

  var ordered = [];

  roots.forEach(function (root) {
    ordered.push(root);

    var children = sortItems(
      childrenByParent[root.id] || []
    );

    children.forEach(function (child) {
      ordered.push(child);
    });
  });

  return ordered;
}


function findActiveRawItemById_(itemId) {
  var items = getAllRawItems_();

  for (var index = 0; index < items.length; index++) {
    if (items[index].id === itemId && items[index].active) {
      return items[index];
    }
  }

  return null;
}

function findRawItemByName_(itemName) {
  var wanted = String(itemName || '').toLowerCase();
  var items = getAllRawItems_();

  for (var index = 0; index < items.length; index++) {
    if (items[index].name.toLowerCase() === wanted) {
      return items[index];
    }
  }

  return null;
}

/**
 * Returns latest value per Raw Data item + office for one month.
 * Raw_Data is an event log, so previous edits remain available for audit.
 */
function getLatestRawValues_(cycleKey, items, spreadsheet) {
  var allowedItems = {};

  items.forEach(function (item) {
    allowedItems[item.id] = true;
  });

  spreadsheet = spreadsheet || getDatabase_();
  var sheet = spreadsheet.getSheetByName(CONFIG.RAW_DATA_SHEET);
  if (sheet.getLastRow() < 2) return {};

  var rows = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 9)
    .getValues();

  var values = {};

  rows.forEach(function (row) {
    if (String(row[1] || '') !== cycleKey) return;

    var itemId = String(row[3] || '');
    var officeId = String(row[5] || '');

    if (!allowedItems[itemId] || !officeId) return;

    var numericValue = Number(row[7]);

    if (!isFinite(numericValue)) return;

    var key = itemId + '__' + officeId;
    var timestamp = row[8] instanceof Date
      ? row[8].toISOString()
      : (row[2] instanceof Date ? row[2].toISOString() : String(row[2] || ''));

    values[key] = {
      value: normaliseRawNumber_(numericValue),
      updatedAt: timestamp
    };
  });

  return values;
}

function getRawDataOfficeById_(officeId) {
  var wanted = cleanId_(officeId);

  for (var index = 0; index < RAW_DATA_OFFICES.length; index++) {
    if (RAW_DATA_OFFICES[index].id === wanted) {
      return RAW_DATA_OFFICES[index];
    }
  }

  throw new Error('Office not recognised.');
}

function cleanRawItemName_(value) {
  var cleaned = String(value || '')
    .replace(/[\u0000-\u001f<>:"\\\/|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 1) {
    throw new Error('Enter a valid Raw Data item name.');
  }

  if (cleaned.length > 100) {
    throw new Error('Raw Data item name must be 100 characters or fewer.');
  }

  return cleaned;
}

function parseRawNumber_(value) {
  var cleaned = String(value == null ? '' : value)
    .replace(/,/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('Enter a numeric value.');
  }

  var numericValue = Number(cleaned);

  if (!isFinite(numericValue)) {
    throw new Error('Enter a valid numeric value.');
  }

  if (Math.abs(numericValue) > 1000000000000000) {
    throw new Error('The value entered is too large.');
  }

  return normaliseRawNumber_(numericValue);
}

function normaliseRawNumber_(value) {
  var number = Number(value);
  if (!isFinite(number)) return 0;

  return Math.round(number * 1000000) / 1000000;
}

function getBootstrapData_(sessionToken, forceFresh) {
  var context = authoriseDashboardRead_(sessionToken);
  var cache = CacheService.getScriptCache();
  var cycleKey = currentCycleKey_();
  var cacheKey = 'DASHBOARD_SNAPSHOT_V1767_' + cycleKey;
  var cached = forceFresh ? null : cache.get(cacheKey);
  var result;
  var spreadsheet = getDatabase_();

  if (cached) {
    /*
     * V17.7.1 FIX: a corrupted or truncated cache entry (CacheService
     * values are capped in size; a rare write race could also leave a
     * partial value) must never crash the whole bootstrap call. Treat a
     * parse failure exactly like a cache miss instead of throwing, so the
     * dashboard falls through to a normal fresh read rather than the
     * person seeing a hard "Portal backend returned an error."
     */
    try {
      result = JSON.parse(cached);
    } catch (parseError) {
      result = null;
    }
  }

  if (!result) {
    try {
      getPortalAuthUsersFast_(spreadsheet);
    } catch (ignore) {}

    var masters = getActiveSubjects_(spreadsheet);
    var subjects = buildDashboardSubjectInstances_(masters, new Date());

    result = {
      ok: true,
      portalName: CONFIG.PORTAL_NAME,
      offices: OFFICES,
      cycleKey: cycleKey,
      cycleName: getCurrentCycleName_(),

      subjects: subjects.map(function(subject) {
        return {
          id: subject.id,
          masterId: subject.masterId,
          name: subject.name,
          baseName: subject.baseName,
          reportKind: subject.reportKind,
          recurrenceMode: subject.recurrenceMode,
          periodLabel: subject.periodLabel || '',
          oneTimeCycle: subject.oneTimeCycle || '',
          closingDate: subject.closingDate || '',
          linkText: subject.linkText,
          linkUrl: subject.linkUrl,
          linkFileName: subject.linkFileName,
          submissionEnabled: subject.submissionEnabled
        };
      }),

      subjectMasters: masters.map(subjectMasterPublic_),
      maxFileMb: CONFIG.MAX_FILE_MB,
      backendVersion: CONFIG.BACKEND_VERSION,
      supportsReceipts: true,

      recurrence: {
        quarterlyMonths: CONFIG.QUARTERLY_MONTHS,
        quarterlyLabel: CONFIG.QUARTERLY_LABEL
      }
    };

    /*
     * V17.7.2 FIX: a caching failure (e.g. the structural payload happens
     * to exceed CacheService's per-key size limit) must never fail the
     * whole bootstrap response. Worst case we simply don't get the 10-
     * minute speed-up and read fresh again next time -- status itself is
     * never sourced from this cache regardless (see below).
     */
    try {
      cache.put(
        cacheKey,
        JSON.stringify(result),
        CONFIG.CACHE_SECONDS
      );
    } catch (cachePutError) {
      // Non-fatal: continue serving the freshly-built result uncached.
    }
  }

  /*
   * V17.6.12 FIX:
   * Submission status must NEVER be served from the structural cache above,
   * on EITHER path. The previous version only re-checked status on a cache
   * HIT and, even then, skipped the authoritative Submissions-log overlay
   * that the non-cached path used -- so the two paths could disagree.
   * Now both paths get status from the exact same function, computed fresh
   * on every single call, so a refresh can never show stale Submitted/Pending.
   */
  var statusSubjects = (result.subjects || []).map(function(subject) {
    return { id: subject.id };
  });

  var liveStatus = getLatestSubmissionStatus_(statusSubjects, spreadsheet);
  var liveSubmittedCount = 0;

  Object.keys(liveStatus).forEach(function(key) {
    if (liveStatus[key] && liveStatus[key].submitted) liveSubmittedCount++;
  });

  var liveTotalCount = statusSubjects.length * OFFICES.length;

  result.status = liveStatus;
  result.summary = {
    total: liveTotalCount,
    submitted: liveSubmittedCount,
    pending: Math.max(liveTotalCount - liveSubmittedCount, 0),
    completion: liveTotalCount
      ? Math.round(liveSubmittedCount * 100 / liveTotalCount)
      : 0
  };
  result.lastUpdated = new Date().toISOString();

  if (context.publicGuest) {
    result = JSON.parse(JSON.stringify(result));

    result.subjects = (result.subjects || []).map(function(subject) {
      subject.linkUrl = '';
      subject.linkFileName = '';
      return subject;
    });

    result.subjectMasters = [];

    if (context.access.publicSubmittedTimes !== true) {
      Object.keys(result.status || {}).forEach(function(key) {
        if (result.status[key]) {
          result.status[key].submittedAt = '';
        }
      });
    }
  }

  result.access = publicPortalAccessConfig_();
  result.viewerMode = context.publicGuest
    ? 'PUBLIC'
    : 'AUTHENTICATED';

  return result;
}

function getCurrentCycleName_() {
  return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'MMMM yyyy') + ' submission cycle';
}


/* =====================================================================
 * V16.7 FAST DATA ENGINE
 * ===================================================================== */

/**
 * Rebuild the tiny Current_Status index from historical Submissions.
 * This runs automatically only when the index is first created/empty.
 */
function rebuildCurrentStatusIndex_(spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var statusSheet = spreadsheet.getSheetByName(CONFIG.CURRENT_STATUS_SHEET);
  var submissions = spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!statusSheet || !submissions) throw new Error('Current status storage could not be prepared.');
  if (statusSheet.getLastRow() > 1) statusSheet.getRange(2,1,statusSheet.getLastRow()-1,16).clearContent();
  if (submissions.getLastRow() < 2) return;
  var rows = submissions.getRange(2,1,submissions.getLastRow()-1,15).getValues(), latest={};
  rows.forEach(function(row){
    var rawId=String(row[2]||''), officeId=String(row[4]||''); if(!rawId||!officeId)return;
    var parsed=parseSubjectInstanceId_(rawId);
    var ts=row[1] instanceof Date ? row[1] : new Date(row[1]||row[11]||new Date());
    var cycle=String(row[12]||'').trim() || cycleKeyForDate_(ts);
    var master=String(row[13]||'').trim() || parsed.masterId;
    var kind=String(row[14]||'').trim().toUpperCase() || parsed.reportKind;
    var instance=subjectInstanceId_(master,kind), key=cycle+'__'+instance+'__'+officeId;
    latest[key]={key:key,cycleKey:cycle,subjectId:instance,masterSubjectId:master,subjectName:String(row[3]||''),
      reportKind:kind,officeId:officeId,officeName:String(row[5]||''),
      submitted:String(row[10]||'Submitted').toUpperCase()==='SUBMITTED',submittedAt:row[1]||'',
      fileName:String(row[6]||''),fileId:String(row[7]||''),fileUrl:String(row[8]||''),sizeBytes:Number(row[9])||0,
      submissionId:String(row[0]||''),updatedAt:row[11]||row[1]||new Date()};
  });
  var values=Object.keys(latest).sort().map(function(key){var x=latest[key];return [x.key,x.cycleKey,x.subjectId,x.masterSubjectId,x.subjectName,x.reportKind,x.officeId,x.officeName,x.submitted,x.submittedAt,x.fileName,x.fileId,x.fileUrl,x.sizeBytes,x.submissionId,x.updatedAt];});
  if(values.length)statusSheet.getRange(2,1,values.length,16).setValues(values);
}

/**
 * Read the current index. At portal scale this is normally only 25 rows.
 */

/**
 * V17.6.2 compatibility repair for submissions created before cycle-aware
 * __M/__Q/__O report instances existed.
 *
 * It preserves history: Submissions and Drive PDFs are not edited/deleted.
 */
function migrateLegacyLatestStatusToCurrentCycle_(spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();

  var properties = PropertiesService.getScriptProperties();
  var markerKey = 'LEGACY_STATUS_PROMOTED_V1764';

  if (properties.getProperty(markerKey)) return 0;

  var submissions = spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  var currentStatus = spreadsheet.getSheetByName(CONFIG.CURRENT_STATUS_SHEET);

  if (!submissions || !currentStatus) return 0;

  var currentCycle = currentCycleKey_();
  var activeSubjects = {};
  getActiveSubjects_(spreadsheet).forEach(function(subject) {
    if (subject.recurrenceMode !== 'ONE_TIME') {
      activeSubjects[subject.id] = subject;
    }
  });

  var existing = getCurrentStatusIndex_(spreadsheet);
  var latestLegacy = {};

  if (submissions.getLastRow() >= 2) {
    var rows = submissions.getRange(
      2, 1, submissions.getLastRow() - 1, 15
    ).getValues();

    rows.forEach(function(row) {
      // New V17.3+ rows have Cycle/Master/Kind metadata.
      if (
        String(row[12] || '').trim() ||
        String(row[13] || '').trim() ||
        String(row[14] || '').trim()
      ) return;

      var rawSubjectId = String(row[2] || '').trim();
      var officeId = String(row[4] || '').trim();
      if (!rawSubjectId || !officeId) return;

      var parsed = parseSubjectInstanceId_(rawSubjectId);
      var masterId = parsed.masterId;
      if (!activeSubjects[masterId]) return;

      latestLegacy[masterId + '__' + officeId] = {
        masterId: masterId,
        officeId: officeId,
        officeName: String(row[5] || ''),
        submitted:
          String(row[10] || 'Submitted').toUpperCase() === 'SUBMITTED',
        submittedAt: row[1] || '',
        fileName: String(row[6] || ''),
        fileId: String(row[7] || ''),
        fileUrl: String(row[8] || ''),
        sizeBytes: Number(row[9]) || 0,
        submissionId: String(row[0] || '')
      };
    });
  }

  var promoted = 0;

  Object.keys(latestLegacy).forEach(function(key) {
    var legacy = latestLegacy[key];
    var subject = activeSubjects[legacy.masterId];
    if (!subject) return;

    var instanceId = subjectInstanceId_(subject.id, 'MONTHLY');
    var currentKey = currentCycle + '__' + instanceId + '__' + legacy.officeId;

    // Never overwrite a real current-cycle state.
    if (existing[currentKey]) return;

    upsertCurrentStatus_({
      cycleKey: currentCycle,
      subjectId: instanceId,
      masterSubjectId: subject.id,
      subjectName: subjectInstanceDisplayName_(subject, 'MONTHLY', currentCycle),
      reportKind: 'MONTHLY',
      officeId: legacy.officeId,
      officeName: legacy.officeName,
      submitted: legacy.submitted,
      submittedAt: legacy.submitted ? legacy.submittedAt : '',
      fileName: legacy.fileName,
      fileId: legacy.fileId,
      fileUrl: legacy.fileUrl,
      sizeBytes: legacy.sizeBytes,
      submissionId: legacy.submissionId
    }, spreadsheet);

    promoted++;
  });

  properties.setProperty(
    markerKey,
    JSON.stringify({
      cycleKey: currentCycle,
      promoted: promoted,
      completedAt: new Date().toISOString()
    })
  );

  if (promoted) invalidateCache_();
  return promoted;
}

function getCurrentStatusIndex_(spreadsheet) {
  spreadsheet =
    spreadsheet || getDatabase_();

  var sheet =
    spreadsheet.getSheetByName(
      CONFIG.CURRENT_STATUS_SHEET
    );

  if (!sheet) {
    ensureSheets_(spreadsheet);
    sheet =
      spreadsheet.getSheetByName(
        CONFIG.CURRENT_STATUS_SHEET
      );
  }

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return {};
  }

  var rows =
    sheet.getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      16
    ).getValues();

  var result = {};

  rows.forEach(function(row, index) {
    var key =
      String(
        row[0] || ''
      );

    if (!key) return;

    var candidate = {
      key: key,
      cycleKey:
        String(row[1] || ''),
      subjectId:
        String(row[2] || ''),
      masterSubjectId:
        String(row[3] || ''),
      subjectName:
        String(row[4] || ''),
      reportKind:
        String(
          row[5] ||
          'MONTHLY'
        ),
      officeId:
        String(row[6] || ''),
      officeName:
        String(row[7] || ''),
      submitted:
        row[8] === true ||
        String(
          row[8] || ''
        ).toUpperCase() ===
          'TRUE',
      submittedAt:
        row[9],
      fileName:
        String(row[10] || ''),
      fileId:
        String(row[11] || ''),
      fileUrl:
        String(row[12] || ''),
      sizeBytes:
        Number(row[13]) || 0,
      submissionId:
        String(row[14] || ''),
      updatedAt:
        row[15],
      rowNumber:
        index + 2
    };

    var existing =
      result[key];

    if (!existing) {
      result[key] = candidate;
      return;
    }

    var existingTime =
      existing.updatedAt instanceof Date
        ? existing.updatedAt.getTime()
        : new Date(
            existing.updatedAt || 0
          ).getTime();

    var candidateTime =
      candidate.updatedAt instanceof Date
        ? candidate.updatedAt.getTime()
        : new Date(
            candidate.updatedAt || 0
          ).getTime();

    /*
     * Prefer the newest Updated At; if dates are absent/equal, later physical
     * row wins. This makes duplicate legacy rows deterministic.
     */
    if (
      (
        !isNaN(candidateTime) &&
        (
          isNaN(existingTime) ||
          candidateTime >
            existingTime
        )
      ) ||
      (
        candidateTime ===
          existingTime &&
        candidate.rowNumber >
          existing.rowNumber
      )
    ) {
      result[key] = candidate;
    }
  });

  return result;
}

/**
 * Upsert one latest report state after upload/remove.
 */
function upsertCurrentStatus_(data, spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();

  var sheet =
    spreadsheet.getSheetByName(
      CONFIG.CURRENT_STATUS_SHEET
    );

  if (!sheet) {
    ensureSheets_(spreadsheet);
    sheet =
      spreadsheet.getSheetByName(
        CONFIG.CURRENT_STATUS_SHEET
      );
  }

  var cycle =
    String(
      data.cycleKey ||
      currentCycleKey_()
    );

  var parsed =
    parseSubjectInstanceId_(
      data.subjectId
    );

  var master =
    String(
      data.masterSubjectId ||
      parsed.masterId
    );

  var kind =
    String(
      data.reportKind ||
      parsed.reportKind
    ).toUpperCase();

  var instance =
    subjectInstanceId_(
      master,
      kind
    );

  var office =
    String(
      data.officeId || ''
    );

  if (!instance || !office) {
    throw new Error(
      'Current report status could not be indexed.'
    );
  }

  var key =
    cycle +
    '__' +
    instance +
    '__' +
    office;

  var matchingRows = [];

  if (sheet.getLastRow() >= 2) {
    var keys =
      sheet.getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        1
      ).getValues();

    for (var i = 0; i < keys.length; i++) {
      if (
        String(keys[i][0] || '') === key
      ) {
        matchingRows.push(i + 2);
      }
    }
  }

  var values = [[
    key,
    cycle,
    instance,
    master,
    String(
      data.subjectName || ''
    ),
    kind,
    office,
    String(
      data.officeName || ''
    ),
    data.submitted === true,
    data.submittedAt || '',
    String(
      data.fileName || ''
    ),
    String(
      data.fileId || ''
    ),
    String(
      data.fileUrl || ''
    ),
    Number(
      data.sizeBytes
    ) || 0,
    String(
      data.submissionId || ''
    ),
    new Date()
  ]];

  if (matchingRows.length) {
    /*
     * IMPORTANT:
     * Update ALL duplicates. Older portal versions could leave more than one
     * Current_Status row with the same Status Key. Updating only the first row
     * allowed a later stale duplicate to overwrite the fresh Submitted state.
     */
    matchingRows.forEach(function(rowNumber) {
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          16
        )
        .setValues(values);
    });
  } else {
    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        1,
        16
      )
      .setValues(values);
  }
}

/**
 * Return only the fields needed to paint the live report matrix.
 */

function getCurrentCycleSubmissionOverlay_(spreadsheet, allowedSubjects) {
  spreadsheet =
    spreadsheet || getDatabase_();

  var sheet =
    spreadsheet.getSheetByName(
      CONFIG.SUBMISSIONS_SHEET
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return {};
  }

  var rows =
    sheet.getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      15
    ).getValues();

  var currentCycle =
    currentCycleKey_();

  var result = {};

  rows.forEach(function(row) {
    var rawSubjectId =
      String(row[2] || '');

    var officeId =
      String(row[4] || '');

    if (
      !rawSubjectId ||
      !officeId
    ) {
      return;
    }

    var parsed =
      parseSubjectInstanceId_(
        rawSubjectId
      );

    var timestamp =
      row[1] instanceof Date
        ? row[1]
        : new Date(
            row[1] ||
            row[11] ||
            new Date()
          );

    var cycle =
      String(
        row[12] || ''
      ).trim();

    if (!cycle) {
      if (
        isNaN(
          timestamp.getTime()
        )
      ) {
        return;
      }

      cycle =
        cycleKeyForDate_(
          timestamp
        );
    }

    if (
      cycle !==
      currentCycle
    ) {
      return;
    }

    var master =
      String(
        row[13] || ''
      ).trim() ||
      parsed.masterId;

    var kind =
      String(
        row[14] || ''
      ).trim().toUpperCase() ||
      parsed.reportKind;

    var instance =
      subjectInstanceId_(
        master,
        kind
      );

    if (
      allowedSubjects &&
      !allowedSubjects[instance]
    ) {
      return;
    }

    /*
     * Sheet order is the event order. Reassigning the same key means the
     * latest Submitted/Removed event for this subject+office wins.
     */
    result[
      instance +
      '__' +
      officeId
    ] = {
      submitted:
        String(
          row[10] ||
          'Submitted'
        ).toUpperCase() ===
          'SUBMITTED',
      submittedAt:
        row[1] || ''
    };
  });

  return result;
}

function getLatestSubmissionStatus_(subjects, spreadsheet) {
  var allowed = {};

  subjects.forEach(function(subject) {
    allowed[subject.id] = true;
  });

  var current =
    getCurrentStatusIndex_(
      spreadsheet
    );

  var cycle =
    currentCycleKey_();

  var status = {};

  Object.keys(current)
    .forEach(function(key) {
      var item =
        current[key];

      if (
        item.cycleKey !== cycle ||
        !allowed[item.subjectId]
      ) {
        return;
      }

      var submittedAt = '';

      if (
        item.submitted &&
        item.submittedAt
      ) {
        var parsedDate =
          item.submittedAt instanceof Date
            ? item.submittedAt
            : new Date(
                item.submittedAt
              );

        if (
          !isNaN(
            parsedDate.getTime()
          )
        ) {
          submittedAt =
            parsedDate.toISOString();
        }
      }

      status[
        item.subjectId +
        '__' +
        item.officeId
      ] = {
        submitted:
          item.submitted === true,
        submittedAt:
          submittedAt
      };
    });

  /*
   * V17.6.4 AUTHORITATIVE OVERLAY:
   * The append-only Submissions log is the final source of truth for this
   * month. This prevents a stale/duplicate Current_Status row from reverting
   * a successful upload back to Pending.
   */
  var overlay =
    getCurrentCycleSubmissionOverlay_(
      spreadsheet,
      allowed
    );

  Object.keys(overlay)
    .forEach(function(key) {
      var item =
        overlay[key];

      var submittedAt = '';

      if (
        item.submitted &&
        item.submittedAt
      ) {
        var parsedDate =
          item.submittedAt instanceof Date
            ? item.submittedAt
            : new Date(
                item.submittedAt
              );

        if (
          !isNaN(
            parsedDate.getTime()
          )
        ) {
          submittedAt =
            parsedDate.toISOString();
        }
      }

      status[key] = {
        submitted:
          item.submitted === true,
        submittedAt:
          submittedAt
      };
    });

  return status;
}


/**
 * V17.7.2 FIX:
 * The dashboard badge (getLatestSubmissionStatus_) trusts the append-only
 * Submissions log as authoritative over Current_Status for the current
 * cycle. Actions (View / Remove) must use the exact same source of truth --
 * otherwise a person can see "Submitted" on screen yet get "No submitted
 * report is available" when they click View or Remove, in precisely the
 * rare Current_Status-lag scenario the overlay exists to guard against.
 * This scans the Submissions log once for the latest matching event.
 */
function findLatestSubmissionEventForOffice_(instanceId, officeId, spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var sheet = spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  var currentCycle = currentCycleKey_();
  var wantedOffice = String(officeId || '');
  var latest = null;

  rows.forEach(function(row) {
    var rawSubjectId = String(row[2] || '');
    var rowOfficeId = String(row[4] || '');
    if (!rawSubjectId || rowOfficeId !== wantedOffice) return;

    var parsed = parseSubjectInstanceId_(rawSubjectId);
    var timestamp = row[1] instanceof Date ? row[1] : new Date(row[1] || row[11] || new Date());

    var cycle = String(row[12] || '').trim();
    if (!cycle) {
      if (isNaN(timestamp.getTime())) return;
      cycle = cycleKeyForDate_(timestamp);
    }
    if (cycle !== currentCycle) return;

    var master = String(row[13] || '').trim() || parsed.masterId;
    var kind = String(row[14] || '').trim().toUpperCase() || parsed.reportKind;
    var instance = subjectInstanceId_(master, kind);
    if (instance !== instanceId) return;

    // Sheet order is event order; the last matching row wins.
    latest = {
      status: String(row[10] || 'Submitted').toUpperCase() === 'SUBMITTED' ? 'SUBMITTED' : 'REMOVED',
      cycleKey: cycle,
      subjectId: instance,
      masterSubjectId: master,
      reportKind: kind,
      fileName: String(row[6] || ''),
      fileId: String(row[7] || ''),
      fileUrl: String(row[8] || ''),
      sizeBytes: Number(row[9]) || 0,
      submissionId: String(row[0] || '')
    };
  });

  return latest;
}

function findLatestSubmissionForOffice_(subjectId, officeId, spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var parsed = parseSubjectInstanceId_(subjectId);

  var eventLatest = findLatestSubmissionEventForOffice_(parsed.instanceId, officeId, spreadsheet);
  if (eventLatest) return eventLatest;

  // Fall back to Current_Status only if the append-only log has no
  // matching event for the current cycle (older-format data, etc.).
  var current=getCurrentStatusIndex_(spreadsheet);
  var item=current[currentCycleKey_()+'__'+parsed.instanceId+'__'+String(officeId||'')]; if(!item)return null;
  return {status:item.submitted?'SUBMITTED':'REMOVED',cycleKey:item.cycleKey,subjectId:item.subjectId,masterSubjectId:item.masterSubjectId,reportKind:item.reportKind,fileName:item.fileName||'',fileId:item.fileId||'',fileUrl:item.fileUrl||'',sizeBytes:Number(item.sizeBytes)||0,submissionId:item.submissionId||''};
}

function createSubject_(subjectName, createdBy, recurrenceMode, oneTimeCycle, closingDate) {
  var folder = findOrCreateChildFolder_(subjectName);
  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  var now = new Date();
  var subjectId = Utilities.getUuid();
  var mode = cleanSubjectRecurrenceMode_(recurrenceMode);
  var cycle = '';
  var closeDate = '';

  if (mode === 'ONE_TIME') {
    cycle = cleanCycleKey_(oneTimeCycle);
    if (!cycle) throw new Error('Select the month and year for the one-time subject.');
    closeDate = cleanOptionalClosingDate_(closingDate,cycle);
  }

  sheet.appendRow([
    subjectId,subjectName,folder.getId(),true,now,now,createdBy,
    '','','','',true,mode,CONFIG.QUARTERLY_MONTHS.join(','),cycle,closeDate,true
  ]);

  return findActiveSubjectById_(subjectId);
}

function reactivateSubject_(subject) {
  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  var folderId = subject.folderId;

  try {
    if (folderId) DriveApp.getFolderById(folderId).getName();
  } catch (error) {
    folderId = findOrCreateChildFolder_(subject.name).getId();
  }

  sheet.getRange(subject.rowNumber, 3, 1, 4).setValues([[
    folderId,
    true,
    subject.createdAt || new Date(),
    new Date()
  ]]);
  sheet.getRange(subject.rowNumber, 12).setValue(true);

  return findActiveSubjectById_(subject.id);
}

function prepareLinkedSubjectPdf_(subjectName, payload) {
  var linkTextValue = String(payload.linkText || '').trim();
  var base64 = String(payload.linkedPdfBase64 || '').replace(/^data:application\/pdf;base64,/, '');

  if (!base64) return null;
  if (!linkTextValue) throw new Error('Enter the text to hyperlink and select a PDF file.');

  var linkText = cleanSubjectLinkText_(subjectName, linkTextValue);
  var mimeType = String(payload.linkedPdfMimeType || '').toLowerCase();
  if (mimeType && mimeType !== 'application/pdf') throw new Error('Only PDF files can be linked to a subject.');

  var maxBytes = CONFIG.MAX_FILE_MB * 1024 * 1024;
  if (Math.floor(base64.length * 0.75) > maxBytes) {
    throw new Error('The linked PDF exceeds the ' + CONFIG.MAX_FILE_MB + ' MB file limit.');
  }

  var bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (error) {
    throw new Error('The linked PDF could not be read. Select the file again.');
  }

  if (bytes.length > maxBytes) throw new Error('The linked PDF exceeds the ' + CONFIG.MAX_FILE_MB + ' MB file limit.');
  if (!looksLikePdf_(bytes)) throw new Error('The selected linked file is not a valid PDF.');

  return {
    linkText: linkText,
    bytes: bytes,
    originalName: cleanFileName_(payload.linkedPdfName || 'linked-document.pdf')
  };
}

function saveLinkedSubjectPdf_(subject, linkedPdf) {
  var subjectFolder = getOrCreateSubjectFolder_(subject);
  var folders = subjectFolder.getFoldersByName('_Linked Subject PDFs');
  var linkedFolder = folders.hasNext() ? folders.next() : subjectFolder.createFolder('_Linked Subject PDFs');
  var timestamp = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyyMMdd_HHmmss');
  var savedName = 'LINK_' + timestamp + '_' + linkedPdf.originalName;
  var blob = Utilities.newBlob(linkedPdf.bytes, 'application/pdf', savedName);
  var file = linkedFolder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    try { file.setTrashed(true); } catch (trashError) {}
    throw new Error('The PDF was uploaded, but Google Drive did not allow public link viewing. Check the Drive sharing policy and try again.');
  }

  var fileUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  var previousFileId = subject.linkFileId;
  updateSubjectLinkRecord_(subject, linkedPdf.linkText, fileUrl, file.getId(), linkedPdf.originalName);

  if (previousFileId && previousFileId !== file.getId()) trashLinkedFile_(previousFileId);
}

function removeLinkedSubjectPdf_(subject) {
  if (subject.linkFileId) trashLinkedFile_(subject.linkFileId);
}

function trashLinkedFile_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (error) {
    // Missing linked PDF must not block clearing the hyperlink record.
  }
}

function updateSubjectLinkRecord_(subject, linkText, linkUrl, linkFileId, linkFileName) {
  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  sheet.getRange(subject.rowNumber, 6).setValue(new Date());
  sheet.getRange(subject.rowNumber, 8, 1, 4).setValues([[
    linkText || '',
    linkUrl || '',
    linkFileId || '',
    linkFileName || ''
  ]]);
}

function getOrCreateSubjectFolder_(subject) {
  if (subject.folderId) {
    try {
      return DriveApp.getFolderById(subject.folderId);
    } catch (error) {
      // Continue and replace the missing folder reference.
    }
  }

  var folder = findOrCreateChildFolder_(subject.name);
  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  sheet.getRange(subject.rowNumber, 3).setValue(folder.getId());
  sheet.getRange(subject.rowNumber, 6).setValue(new Date());
  return folder;
}


function appendSubmission_(data, spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var parsed = parseSubjectInstanceId_(data.subjectId);
  spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET).appendRow([
    data.submissionId, new Date(), data.subjectId, data.subjectName, data.officeId, data.officeName,
    data.fileName, data.fileId, data.fileUrl, data.sizeBytes, data.status || 'Submitted', new Date(),
    data.cycleKey || currentCycleKey_(), data.masterSubjectId || parsed.masterId, data.reportKind || parsed.reportKind
  ]);
}

function cleanSubjectRecurrenceMode_(value) {
  var normalized = String(value || 'MONTHLY').trim().toUpperCase().replace(/[\s+&/-]+/g, '_');
  if (normalized === 'MONTHLY_QUARTERLY' || normalized === 'MONTHLY_AND_QUARTERLY') return 'MONTHLY_QUARTERLY';
  if (normalized === 'ONE_TIME' || normalized === 'ONETIME' || normalized === 'ONCE') return 'ONE_TIME';
  if (
    normalized === 'QUARTERLY_ONLY' ||
    normalized === 'ONLY_QUARTERLY' ||
    normalized === 'QUARTERLY'
  ) return 'QUARTERLY_ONLY';
  return 'MONTHLY';
}

function cleanQuarterlyMonths_(value) {
  var source = String(value || '').trim();

  if (!source) {
    return CONFIG.QUARTERLY_MONTHS.slice();
  }

  var rawMonths =
    source
      .split(/[,\s;|]+/)
      .map(function(x) {
        return Number(x);
      })
      .filter(function(m) {
        return m >= 1 && m <= 12;
      });

  var rawUnique = [];

  rawMonths.forEach(function(m) {
    if (rawUnique.indexOf(m) === -1) {
      rawUnique.push(m);
    }
  });

  rawUnique.sort(function(a, b) {
    return a - b;
  });

  /*
   * V17.6.6 migration:
   * Older versions stored 4,6,9,12 as the quarter-related months.
   * The correct rule is to OPEN the QE requirement in the month AFTER
   * quarter end: 1,4,7,10.
   */
  if (
    rawUnique.join(',') ===
      '4,6,9,12'
  ) {
    return CONFIG.QUARTERLY_MONTHS.slice();
  }

  var valid =
    rawUnique.filter(function(m) {
      return (
        CONFIG.QUARTERLY_MONTHS
          .indexOf(m) !== -1
      );
    });

  return valid.length
    ? valid
    : CONFIG.QUARTERLY_MONTHS.slice();
}

function currentCycleKey_() { return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM'); }
function cycleKeyForDate_(date) { return Utilities.formatDate(date || new Date(), CONFIG.TIME_ZONE, 'yyyy-MM'); }
function cycleMonthNumber_(date) { return Number(Utilities.formatDate(date || new Date(), CONFIG.TIME_ZONE, 'M')); }
function subjectInstanceId_(masterId, kind) {
  var reportKind = String(kind || '').toUpperCase();
  if (reportKind === 'QUARTERLY') return String(masterId || '') + '__Q';
  if (reportKind === 'ONE_TIME') return String(masterId || '') + '__O';
  return String(masterId || '') + '__M';
}

function parseSubjectInstanceId_(value) {
  var clean = cleanId_(value);
  if (/__Q$/.test(clean)) return { masterId: clean.slice(0,-3), instanceId: clean, reportKind: 'QUARTERLY' };
  if (/__O$/.test(clean)) return { masterId: clean.slice(0,-3), instanceId: clean, reportKind: 'ONE_TIME' };
  if (/__M$/.test(clean)) return { masterId: clean.slice(0,-3), instanceId: clean, reportKind: 'MONTHLY' };
  return { masterId: clean, instanceId: subjectInstanceId_(clean,'MONTHLY'), reportKind: 'MONTHLY' };
}


function cleanCycleKey_(value) {
  var text = String(value || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : '';
}

function cleanOptionalClosingDate_(value, cycleKey) {
  var text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Closing date must be a valid date.');
  var date = new Date(text + 'T23:59:59');
  if (isNaN(date.getTime())) throw new Error('Closing date must be a valid date.');
  if (cycleKey && text.slice(0,7) !== cycleKey) {
    throw new Error('The closing date must fall inside the selected one-time month.');
  }
  return text;
}

function cycleKeyParts_(cycleKey) {
  var clean = cleanCycleKey_(cycleKey) || currentCycleKey_();
  var parts = clean.split('-');
  return { year: Number(parts[0]), month: Number(parts[1]), cycleKey: clean };
}

function monthNameForNumber_(month) {
  var names = ['', 'January','February','March','April','May','June','July','August','September','October','November','December'];
  return names[Number(month)] || '';
}


function shortMonthNameForNumber_(month) {
  var names = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  return names[Number(month)] || '';
}

function previousReportingMonthInfo_(cycleKey) {
  var parts = cycleKeyParts_(cycleKey);
  var month = parts.month - 1;
  var year = parts.year;

  if (month < 1) {
    month = 12;
    year--;
  }

  return {
    month: month,
    year: year,
    shortMonth: shortMonthNameForNumber_(month),
    label:
      shortMonthNameForNumber_(month) +
      ',' +
      year
  };
}

function monthlyOfficialPeriodLabel_(cycleKey) {
  var info = previousReportingMonthInfo_(cycleKey);

  return (
    'the Month of ' +
    info.shortMonth +
    ',' +
    info.year
  );
}

function quarterlyOfficialPeriodInfo_(cycleKey) {
  var previous =
    previousReportingMonthInfo_(
      cycleKey
    );

  return {
    month:
      previous.month,
    year:
      previous.year,
    shortMonth:
      previous.shortMonth,
    label:
      'QE ' +
      previous.shortMonth +
      ',' +
      previous.year
  };
}

function monthlyPeriodLabel_(cycleKey) {
  var parts = cycleKeyParts_(cycleKey);
  return monthNameForNumber_(parts.month) + ' ' + parts.year;
}

/* Requested portal quarterly schedule:
 * Apr -> Q1 (Jan-Mar)
 * Jun -> Q2 (Apr-Jun)
 * Sep -> Q3 (Jul-Sep)
 * Dec -> Q4 (Oct-Dec)
 */
function cycleDayNumber_(date) {
  return Number(Utilities.formatDate(date || new Date(), CONFIG.TIME_ZONE, 'd'));
}

function daysInCycleMonth_(date) {
  var current = date || new Date();
  var year = Number(Utilities.formatDate(current, CONFIG.TIME_ZONE, 'yyyy'));
  var month = Number(Utilities.formatDate(current, CONFIG.TIME_ZONE, 'M'));
  return new Date(year, month, 0).getDate();
}

function isLastCalendarDateOfCycleMonth_(date) {
  var current = date || new Date();
  return cycleDayNumber_(current) === daysInCycleMonth_(current);
}

function quarterInfoForScheduledMonth_(cycleKey) {
  var parts =
    cycleKeyParts_(
      cycleKey
    );

  var map = {
    1: {
      quarter: 'Q4',
      range: 'Oct–Dec',
      yearOffset: -1
    },
    4: {
      quarter: 'Q1',
      range: 'Jan–Mar',
      yearOffset: 0
    },
    7: {
      quarter: 'Q2',
      range: 'Apr–Jun',
      yearOffset: 0
    },
    10: {
      quarter: 'Q3',
      range: 'Jul–Sep',
      yearOffset: 0
    }
  };

  var info =
    map[parts.month];

  if (!info) {
    return null;
  }

  var quarterYear =
    parts.year +
    info.yearOffset;

  return {
    quarter:
      info.quarter,
    range:
      info.range,
    year:
      quarterYear,
    label:
      info.quarter +
      ' (' +
      info.range +
      ' ' +
      quarterYear +
      ')'
  };
}

function isOneTimeClosed_(subject, now) {
  if (subject.recurrenceMode !== 'ONE_TIME' || !subject.closingDate) return false;
  var closeAt = new Date(subject.closingDate + 'T23:59:59');
  return !isNaN(closeAt.getTime()) && (now || new Date()).getTime() > closeAt.getTime();
}

function subjectInstanceDisplayName_(subject, kind, cycleKey) {
  var reportKind =
    String(kind || '')
      .toUpperCase();

  var cycle =
    cleanCycleKey_(cycleKey) ||
    currentCycleKey_();

  if (reportKind === 'QUARTERLY') {
    var quarter =
      quarterlyOfficialPeriodInfo_(
        cycle
      );

    return (
      subject.name +
      ' for ' +
      quarter.label
    );
  }

  if (reportKind === 'ONE_TIME') {
    return (
      subject.name +
      ' — One-time · ' +
      monthlyPeriodLabel_(
        cycle
      )
    );
  }

  return (
    subject.name +
    ' for ' +
    monthlyOfficialPeriodLabel_(
      cycle
    )
  );
}

function buildDashboardSubjectInstances_(subjects, date) {
  var now = date || new Date();
  var cycle = cycleKeyForDate_(now);
  var month = cycleMonthNumber_(now);
  var result = [];

  subjects.forEach(function(subject) {
    if (subject.dashboardVisible === false) {
      return;
    }

    if (subject.recurrenceMode === 'ONE_TIME') {
      if (subject.oneTimeCycle !== cycle) return;

      result.push({
        id:
          subjectInstanceId_(
            subject.id,
            'ONE_TIME'
          ),
        masterId: subject.id,
        name:
          subjectInstanceDisplayName_(
            subject,
            'ONE_TIME',
            cycle
          ),
        baseName: subject.name,
        reportKind: 'ONE_TIME',
        recurrenceMode:
          subject.recurrenceMode,
        periodLabel:
          monthlyPeriodLabel_(
            cycle
          ),
        oneTimeCycle:
          subject.oneTimeCycle,
        closingDate:
          subject.closingDate,
        linkText:
          subject.linkText,
        linkUrl:
          subject.linkUrl,
        linkFileName:
          subject.linkFileName,
        submissionEnabled:
          subject.submissionEnabled &&
          !isOneTimeClosed_(
            subject,
            now
          )
      });

      return;
    }

    if (subject.recurrenceMode === 'QUARTERLY_ONLY') {
      if (subject.quarterlyMonths.indexOf(month) === -1) return;

      var quarterlyOnlyPeriod =
        quarterlyOfficialPeriodInfo_(
          cycle
        );

      result.push({
        id:
          subjectInstanceId_(
            subject.id,
            'QUARTERLY'
          ),
        masterId: subject.id,
        name:
          subjectInstanceDisplayName_(
            subject,
            'QUARTERLY',
            cycle
          ),
        baseName: subject.name,
        reportKind: 'QUARTERLY',
        recurrenceMode:
          subject.recurrenceMode,
        periodLabel:
          quarterlyOnlyPeriod.label,
        linkText:
          subject.linkText,
        linkUrl:
          subject.linkUrl,
        linkFileName:
          subject.linkFileName,
        submissionEnabled:
          subject.submissionEnabled
      });

      return;
    }

    var monthlyPeriod =
      previousReportingMonthInfo_(
        cycle
      );

    result.push({
      id:
        subjectInstanceId_(
          subject.id,
          'MONTHLY'
        ),
      masterId:
        subject.id,
      name:
        subjectInstanceDisplayName_(
          subject,
          'MONTHLY',
          cycle
        ),
      baseName:
        subject.name,
      reportKind:
        'MONTHLY',
      recurrenceMode:
        subject.recurrenceMode,
      periodLabel:
        monthlyPeriod.label,
      linkText:
        subject.linkText,
      linkUrl:
        subject.linkUrl,
      linkFileName:
        subject.linkFileName,
      submissionEnabled:
        subject.submissionEnabled
    });

    if (
      subject.recurrenceMode ===
        'MONTHLY_QUARTERLY' &&
      subject.quarterlyMonths
        .indexOf(month) !== -1
    ) {
      var quarterlyPeriod =
        quarterlyOfficialPeriodInfo_(
          cycle
        );

      result.push({
        id:
          subjectInstanceId_(
            subject.id,
            'QUARTERLY'
          ),
        masterId:
          subject.id,
        name:
          subjectInstanceDisplayName_(
            subject,
            'QUARTERLY',
            cycle
          ),
        baseName:
          subject.name,
        reportKind:
          'QUARTERLY',
        recurrenceMode:
          subject.recurrenceMode,
        periodLabel:
          quarterlyPeriod.label,
        linkText:
          subject.linkText,
        linkUrl:
          subject.linkUrl,
        linkFileName:
          subject.linkFileName,
        submissionEnabled:
          subject.submissionEnabled
      });
    }
  });

  return result;
}

function resolveActiveSubjectInstance_(value) {
  var parsed = parseSubjectInstanceId_(value);
  var subject = findActiveSubjectById_(parsed.masterId);
  if (!subject) throw new Error('This report subject is no longer active. Refresh the page and try again.');

  if (subject.dashboardVisible === false) {
    throw new Error('This report subject is currently hidden by Administrator.');
  }

  var cycle = currentCycleKey_();
  var month = cycleMonthNumber_(new Date());

  if (parsed.reportKind === 'ONE_TIME') {
    if (subject.recurrenceMode !== 'ONE_TIME' || subject.oneTimeCycle !== cycle) {
      throw new Error('This one-time subject is not scheduled for the current month.');
    }
  }

  if (
    parsed.reportKind === 'QUARTERLY' &&
    (
      (
        subject.recurrenceMode !== 'MONTHLY_QUARTERLY' &&
        subject.recurrenceMode !== 'QUARTERLY_ONLY'
      ) ||
      subject.quarterlyMonths.indexOf(month) === -1
    )
  ) {
    throw new Error(
      'This quarterly report opens automatically in the month following the quarter end.'
    );
  }

  if (
    parsed.reportKind === 'MONTHLY' &&
    (
      subject.recurrenceMode === 'ONE_TIME' ||
      subject.recurrenceMode === 'QUARTERLY_ONLY'
    )
  ) {
    throw new Error('This subject does not have a monthly report requirement.');
  }

  var effectiveOpen = subject.submissionEnabled;
  if (parsed.reportKind === 'ONE_TIME') {
    effectiveOpen = effectiveOpen && !isOneTimeClosed_(subject,new Date());
  }

  return {
    master: subject,
    instanceId: subjectInstanceId_(subject.id,parsed.reportKind),
    reportKind: parsed.reportKind,
    displayName: subjectInstanceDisplayName_(subject,parsed.reportKind,cycle),
    submissionEnabled: effectiveOpen
  };
}

function subjectMasterPublic_(subject) {
  return {
    id: subject.id,
    name: subject.name,
    linkText: subject.linkText,
    linkUrl: subject.linkUrl,
    linkFileName: subject.linkFileName,
    submissionEnabled: subject.submissionEnabled,
    recurrenceMode: subject.recurrenceMode,
    quarterlyMonths: subject.quarterlyMonths,
    oneTimeCycle: subject.oneTimeCycle,
    closingDate: subject.closingDate,
    dashboardVisible: subject.dashboardVisible !== false
  };
}

function setSubjectRecurrence_(subject, mode, oneTimeCycle, closingDate) {
  mode = cleanSubjectRecurrenceMode_(mode);
  var cycle = '';
  var closeDate = '';

  if (mode === 'ONE_TIME') {
    cycle = cleanCycleKey_(oneTimeCycle);
    if (!cycle) throw new Error('Select the month and year for the one-time subject.');
    closeDate = cleanOptionalClosingDate_(closingDate,cycle);
  }

  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  sheet.getRange(subject.rowNumber,13,1,4).setValues([[
    mode,
    CONFIG.QUARTERLY_MONTHS.join(','),
    cycle,
    closeDate
  ]]);
  sheet.getRange(subject.rowNumber,6).setValue(new Date());

  return {
    recurrenceMode: mode,
    oneTimeCycle: cycle,
    closingDate: closeDate
  };
}

function getOrCreateReportCycleFolder_(subject, kind) {
  /*
   * V17.6.8: Keep the CURRENT submission folder name identical to the
   * subject instance shown on the dashboard.
   *
   * Examples:
   *   Probity -> Probity for the Month of Aug,2026
   *   Probity (quarterly) -> Probity for QE Sep,2026
   *
   * Each reporting period therefore gets a clear, self-contained folder
   * directly under Current Submission Cycle. Existing historical folders
   * are not deleted or moved.
   */
  var reportKind = String(kind || '').toUpperCase();
  var folderName = subjectInstanceDisplayName_(
    subject,
    reportKind || 'MONTHLY',
    currentCycleKey_()
  );

  var parentFolder = getSubjectParentFolder_();
  var matchingFolders = parentFolder.getFoldersByName(folderName);
  if (!matchingFolders.hasNext()) return parentFolder.createFolder(folderName);

  var primary = matchingFolders.next();
  var duplicates = [];
  while (matchingFolders.hasNext()) duplicates.push(matchingFolders.next());

  /* V17.6.10: repair duplicate same-named period folders left by older
     concurrent uploads. Preserve their files by moving them into the one
     canonical folder, then trash only the empty duplicate folder. */
  duplicates.forEach(function(duplicate){
    try {
      var files = duplicate.getFiles();
      while(files.hasNext()){
        try { files.next().moveTo(primary); } catch(ignoreFile) {}
      }
      var children = duplicate.getFolders();
      while(children.hasNext()){
        try { children.next().moveTo(primary); } catch(ignoreChild) {}
      }
      try { duplicate.setTrashed(true); } catch(ignoreTrash) {}
    } catch(ignoreFolder) {}
  });

  return primary;
}


function getActiveSubjects_(spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();
  var sheet = spreadsheet.getSheetByName(CONFIG.SUBJECTS_SHEET);
  if (sheet.getLastRow() < 2) return [];

  return sheet.getRange(2,1,sheet.getLastRow()-1,17).getValues()
    .map(function(row,index){ return subjectFromRow_(row,index+2); })
    .filter(function(subject){ return subject.active; });
}

function findActiveSubjectById_(subjectId) {
  var subjects = getAllSubjects_();
  for (var index = 0; index < subjects.length; index++) {
    if (subjects[index].id === subjectId && subjects[index].active) return subjects[index];
  }
  return null;
}

function findSubjectByName_(subjectName) {
  var wanted = String(subjectName || '').toLowerCase();
  var subjects = getAllSubjects_();
  for (var index = 0; index < subjects.length; index++) {
    if (subjects[index].name.toLowerCase() === wanted) return subjects[index];
  }
  return null;
}

function getAllSubjects_() {
  var sheet = getDatabase_().getSheetByName(CONFIG.SUBJECTS_SHEET);
  if (sheet.getLastRow() < 2) return [];

  return sheet.getRange(2,1,sheet.getLastRow()-1,17).getValues()
    .map(function(row,index){ return subjectFromRow_(row,index+2); });
}

function subjectFromRow_(row, rowNumber) {
  return {
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    folderId: String(row[2] || ''),
    active: row[3] === true || String(row[3] || '').toUpperCase() === 'TRUE',
    createdAt: row[4],
    updatedAt: row[5],
    createdBy: String(row[6] || ''),
    linkText: String(row[7] || ''),
    linkUrl: String(row[8] || ''),
    linkFileId: String(row[9] || ''),
    linkFileName: String(row[10] || ''),
    submissionEnabled: !(row[11] === false || String(row[11] || '').toUpperCase() === 'FALSE'),
    recurrenceMode: cleanSubjectRecurrenceMode_(row[12] || 'MONTHLY'),
    quarterlyMonths: cleanQuarterlyMonths_(row[13]),
    oneTimeCycle: cleanCycleKey_(row[14]),
    closingDate: String(row[15] || '').trim(),
    dashboardVisible: !(row[16] === false || String(row[16] || '').toUpperCase() === 'FALSE'),
    rowNumber: rowNumber
  };
}

function getDatabase_() {
  var properties = PropertiesService.getScriptProperties();
  var savedId = String(
    properties.getProperty('DATABASE_SPREADSHEET_ID') || ''
  ).trim();
  var savedSpreadsheet = null;

  /*
   * V16.7 HOT PATH:
   * Once the established database schema has been confirmed, normal requests
   * do one openById only. No sheet rewriting, Drive search, formatting, or
   * schema scan is performed during login/dashboard reads.
   */
  if (savedId) {
    try {
      savedSpreadsheet = SpreadsheetApp.openById(savedId);

      if (
        properties.getProperty('DATABASE_SCHEMA_READY_V1767') === 'YES'
      ) {
        return savedSpreadsheet;
      }

      /* V17.6 schema migration must run once even when all sheet names already exist,
       * because Subjects/Submissions/Current_Status gain recurrence/cycle columns. */
      ensureSheets_(savedSpreadsheet);

      properties.setProperty('DATABASE_SCHEMA_READY_V1767', 'YES');
      return savedSpreadsheet;

    } catch (fastError) {
      savedSpreadsheet = null;
      savedId = '';
      properties.deleteProperty('DATABASE_SCHEMA_READY_V1767');
    }
  }

  /*
   * RECOVERY PATH:
   * Search only files having the normal portal database name.
   * This is much faster than scanning every file in the Drive folder.
   */
  var discovered = findBestNamedPortalDatabase_();

  if (
    discovered &&
    (
      !savedSpreadsheet ||
      discovered.id !== savedSpreadsheet.getId()
    )
  ) {
    properties.setProperty(
      'DATABASE_SPREADSHEET_ID',
      discovered.id
    );
    properties.setProperty(
      'DATABASE_RECOVERY_CHECKED_V1518',
      'YES'
    );

    ensureSheets_(discovered.spreadsheet);
    properties.setProperty('DATABASE_SCHEMA_READY_V1767', 'YES');
    return discovered.spreadsheet;
  }

  if (savedSpreadsheet) {
    properties.setProperty(
      'DATABASE_RECOVERY_CHECKED_V1518',
      'YES'
    );

    ensureSheets_(savedSpreadsheet);
    return savedSpreadsheet;
  }

  /*
   * Only create a new database if no saved database exists and no existing
   * named portal database can be found.
   */
  var spreadsheet = SpreadsheetApp.create(CONFIG.DATABASE_NAME);
  var databaseFile = DriveApp.getFileById(spreadsheet.getId());

  databaseFile.moveTo(getRootFolder_());

  properties.setProperty(
    'DATABASE_SPREADSHEET_ID',
    spreadsheet.getId()
  );
  properties.setProperty(
    'DATABASE_RECOVERY_CHECKED_V1518',
    'YES'
  );

  ensureSheets_(spreadsheet);
  properties.setProperty('DATABASE_SCHEMA_READY_V1767', 'YES');
  return spreadsheet;
}

function hasMeaningfulPortalData_(spreadsheet) {
  var names = [
    CONFIG.SUBJECTS_SHEET,
    CONFIG.SUBMISSIONS_SHEET,
    CONFIG.RAW_ITEMS_SHEET,
    CONFIG.RAW_DATA_SHEET,
    CONFIG.STICKY_NOTES_SHEET
  ];

  for (var i = 0; i < names.length; i++) {
    var sheet = spreadsheet.getSheetByName(names[i]);

    if (sheet && sheet.getLastRow() > 1) {
      return true;
    }
  }

  return false;
}

function findBestNamedPortalDatabase_() {
  var root = getRootFolder_();
  var files = root.getFilesByName(CONFIG.DATABASE_NAME);
  var best = null;

  while (files.hasNext()) {
    var file = files.next();

    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
      continue;
    }

    try {
      var spreadsheet = SpreadsheetApp.openById(file.getId());
      var score = scorePortalDatabase_(spreadsheet);

      if (
        score >= 0 &&
        (!best || score > best.score)
      ) {
        best = {
          id: file.getId(),
          score: score,
          spreadsheet: spreadsheet,
          name: file.getName()
        };
      }
    } catch (ignore) {}
  }

  return best;
}

function scorePortalDatabase_(spreadsheet) {
  var recognised = 0;
  var score = 0;

  var subjects = spreadsheet.getSheetByName(CONFIG.SUBJECTS_SHEET);
  if (subjects) {
    recognised++;
    score += Math.max(subjects.getLastRow() - 1, 0) * 100000;
  }

  var submissions = spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (submissions) {
    recognised++;
    score += Math.max(submissions.getLastRow() - 1, 0) * 10000;
  }

  var rawItems = spreadsheet.getSheetByName(CONFIG.RAW_ITEMS_SHEET);
  if (rawItems) {
    recognised++;
    score += Math.max(rawItems.getLastRow() - 1, 0) * 1000;
  }

  var rawData = spreadsheet.getSheetByName(CONFIG.RAW_DATA_SHEET);
  if (rawData) {
    recognised++;
    score += Math.max(rawData.getLastRow() - 1, 0) * 100;
  }

  var sticky = spreadsheet.getSheetByName(CONFIG.STICKY_NOTES_SHEET);
  if (sticky) {
    recognised++;
    score += Math.max(sticky.getLastRow() - 1, 0) * 10;
  }

  var users = spreadsheet.getSheetByName(CONFIG.USERS_SHEET);
  if (users) {
    recognised++;
    score += Math.max(users.getLastRow() - 1, 0);
  }

  score += recognised;
  return recognised ? score : -1;
}

/**
 * Manual repair tool.
 * This broader search runs ONLY when you explicitly run this function from
 * the Apps Script editor, so it cannot slow down normal login or dashboard.
 */
function reconnectExistingPortalDatabase() {
  var properties = PropertiesService.getScriptProperties();
  var root = getRootFolder_();
  var files = root.getFiles();
  var best = null;

  while (files.hasNext()) {
    var file = files.next();

    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
      continue;
    }

    try {
      var spreadsheet = SpreadsheetApp.openById(file.getId());
      var score = scorePortalDatabase_(spreadsheet);

      if (
        score >= 0 &&
        (!best || score > best.score)
      ) {
        best = {
          id: file.getId(),
          score: score,
          spreadsheet: spreadsheet,
          name: file.getName()
        };
      }
    } catch (ignore) {}
  }

  if (!best) {
    throw new Error(
      'No existing portal database was found in the configured Drive folder.'
    );
  }

  properties.setProperty(
    'DATABASE_SPREADSHEET_ID',
    best.id
  );
  properties.setProperty(
    'DATABASE_RECOVERY_CHECKED_V1518',
    'YES'
  );

  ensureSheets_(best.spreadsheet);
  invalidateCache_();

  var message =
    'Portal reconnected to: ' +
    best.name +
    ' (' +
    best.id +
    '). Subjects: ' +
    countPortalRows_(best.spreadsheet, CONFIG.SUBJECTS_SHEET) +
    ', submissions: ' +
    countPortalRows_(best.spreadsheet, CONFIG.SUBMISSIONS_SHEET) +
    '.';

  Logger.log(message);
  return message;
}

function countPortalRows_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  return sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;
}

function ensureSheets_(spreadsheet) {
  var subjects = spreadsheet.getSheetByName(CONFIG.SUBJECTS_SHEET);
  if (!subjects) subjects = spreadsheet.insertSheet(CONFIG.SUBJECTS_SHEET);

  if (subjects.getMaxColumns() < 17) {
    subjects.insertColumnsAfter(subjects.getMaxColumns(), 17 - subjects.getMaxColumns());
  }

  var subjectHeaders = [
    'Subject ID', 'Subject', 'Folder ID', 'Active', 'Created At', 'Updated At',
    'Created By', 'Link Text', 'Link URL', 'Link File ID', 'Link File Name',
    'Submission Enabled', 'Recurrence Mode', 'Quarterly Months',
    'One-time Cycle', 'Closing Date', 'Dashboard Visible'
  ];

  if (subjects.getLastRow() === 0) subjects.appendRow(subjectHeaders);
  else subjects.getRange(1, 1, 1, 17).setValues([subjectHeaders]);
  styleHeader_(subjects, 17);

  /*
   * V17.6.8: every existing subject starts as visible.
   * Only blanks are backfilled, so a deliberately hidden subject stays hidden.
   */
  if (subjects.getLastRow() >= 2) {
    var dashboardVisibleRange = subjects.getRange(
      2, 17, subjects.getLastRow() - 1, 1
    );
    var dashboardVisibleValues = dashboardVisibleRange.getValues();
    var dashboardVisibilityChanged = false;

    dashboardVisibleValues.forEach(function(row) {
      if (row[0] === '' || row[0] === null) {
        row[0] = true;
        dashboardVisibilityChanged = true;
      }
    });

    if (dashboardVisibilityChanged) {
      dashboardVisibleRange.setValues(dashboardVisibleValues);
    }
  }

  /*
   * V17.6.6: quarterly requirements are created in the month AFTER quarter
   * end. Normalize existing Monthly+Quarterly subjects to Jan/Apr/Jul/Oct.
   */
  if (subjects.getLastRow() >= 2) {
    var subjectScheduleRows =
      subjects
        .getRange(
          2,
          13,
          subjects.getLastRow() - 1,
          2
        )
        .getValues();

    var changedQuarterlyMonths = false;

    subjectScheduleRows.forEach(function(row) {
      var mode =
        cleanSubjectRecurrenceMode_(
          row[0]
        );

      if (
        (
          mode === 'MONTHLY_QUARTERLY' ||
          mode === 'QUARTERLY_ONLY'
        ) &&
        String(row[1] || '') !==
          CONFIG.QUARTERLY_MONTHS.join(',')
      ) {
        row[1] =
          CONFIG.QUARTERLY_MONTHS.join(',');
        changedQuarterlyMonths = true;
      }
    });

    if (changedQuarterlyMonths) {
      subjects
        .getRange(
          2,
          13,
          subjectScheduleRows.length,
          2
        )
        .setValues(
          subjectScheduleRows
        );
    }
  }


  var submissions = spreadsheet.getSheetByName(CONFIG.SUBMISSIONS_SHEET);
  if (!submissions) submissions = spreadsheet.insertSheet(CONFIG.SUBMISSIONS_SHEET);

  if (submissions.getMaxColumns() < 15) {
    submissions.insertColumnsAfter(submissions.getMaxColumns(), 15 - submissions.getMaxColumns());
  }

  var submissionHeaders = [
    'Submission ID', 'Timestamp', 'Subject Instance ID', 'Subject', 'Office ID',
    'Office', 'File Name', 'File ID', 'File URL', 'Size (Bytes)', 'Status',
    'Logged At', 'Cycle Key', 'Master Subject ID', 'Report Kind'
  ];

  if (submissions.getLastRow() === 0) submissions.appendRow(submissionHeaders);
  else submissions.getRange(1, 1, 1, 15).setValues([submissionHeaders]);
  styleHeader_(submissions, 15);


  /* V17.6 cycle-aware current status index. */
  var currentStatus = spreadsheet.getSheetByName(CONFIG.CURRENT_STATUS_SHEET);
  var currentStatusWasCreated = false;
  if (!currentStatus) {
    currentStatus = spreadsheet.insertSheet(CONFIG.CURRENT_STATUS_SHEET);
    currentStatusWasCreated = true;
  }
  var previousStatusHeader2 = currentStatus.getLastRow() > 0
    ? String(currentStatus.getRange(1, 2).getValue() || '') : '';
  if (currentStatus.getMaxColumns() < 16) {
    currentStatus.insertColumnsAfter(currentStatus.getMaxColumns(), 16 - currentStatus.getMaxColumns());
  }
  var statusHeaders = [
    'Status Key','Cycle Key','Subject Instance ID','Master Subject ID','Subject',
    'Report Kind','Office ID','Office','Submitted','Submitted At','File Name',
    'File ID','File URL','Size (Bytes)','Submission ID','Updated At'
  ];
  if (currentStatus.getLastRow() === 0) currentStatus.appendRow(statusHeaders);
  else currentStatus.getRange(1, 1, 1, 16).setValues([statusHeaders]);
  styleHeader_(currentStatus, 16);
  if (currentStatusWasCreated || previousStatusHeader2 !== 'Cycle Key' ||
      (currentStatus.getLastRow() === 1 && submissions.getLastRow() > 1)) {
    rebuildCurrentStatusIndex_(spreadsheet);
  }

  // One-time V17.6.2 compatibility repair for already-submitted legacy rows.
  migrateLegacyLatestStatusToCurrentCycle_(spreadsheet);

  var rawItems = spreadsheet.getSheetByName(CONFIG.RAW_ITEMS_SHEET);
  if (!rawItems) rawItems = spreadsheet.insertSheet(CONFIG.RAW_ITEMS_SHEET);

  if (rawItems.getMaxColumns() < 8) {
    rawItems.insertColumnsAfter(rawItems.getMaxColumns(), 8 - rawItems.getMaxColumns());
  }

  if (rawItems.getLastRow() === 0) {
    rawItems.appendRow([
      'Raw Item ID',
      'Particular / Raw Data Item',
      'Active',
      'Created At',
      'Updated At',
      'Created By',
      'Parent Item ID',
      'Sort Order'
    ]);
  } else {
    rawItems.getRange(1, 1, 1, 8).setValues([[
      'Raw Item ID',
      'Particular / Raw Data Item',
      'Active',
      'Created At',
      'Updated At',
      'Created By',
      'Parent Item ID',
      'Sort Order'
    ]]);
  }
  styleHeader_(rawItems, 8);

  var rawData = spreadsheet.getSheetByName(CONFIG.RAW_DATA_SHEET);
  if (!rawData) rawData = spreadsheet.insertSheet(CONFIG.RAW_DATA_SHEET);

  if (rawData.getMaxColumns() < 9) {
    rawData.insertColumnsAfter(rawData.getMaxColumns(), 9 - rawData.getMaxColumns());
  }

  if (rawData.getLastRow() === 0) {
    rawData.appendRow([
      'Entry ID',
      'Cycle',
      'Timestamp',
      'Raw Item ID',
      'Particular / Raw Data Item',
      'Office ID',
      'Office',
      'Value',
      'Updated At'
    ]);
  } else {
    rawData.getRange(1, 1, 1, 9).setValues([[
      'Entry ID',
      'Cycle',
      'Timestamp',
      'Raw Item ID',
      'Particular / Raw Data Item',
      'Office ID',
      'Office',
      'Value',
      'Updated At'
    ]]);
  }
  styleHeader_(rawData, 9);


  // Targets & Reminders uses the exact HR-style 11-column schema.
  // Pass the existing spreadsheet to avoid recursive getDatabase_ calls.
  ensureStickyNotesSheet_(spreadsheet);

  // V15.12 username/password accounts.
  ensurePortalUsersSheet_(spreadsheet);

  var firstSheet = spreadsheet.getSheets()[0];
  if (
    firstSheet.getName() === 'Sheet1' &&
    spreadsheet.getSheets().length > 4 &&
    firstSheet.getLastRow() === 0
  ) {
    spreadsheet.deleteSheet(firstSheet);
  }
}

function styleHeader_(sheet, columns) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columns)
    .setBackground('#072b4f')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.autoResizeColumns(1, columns);
}

function getRootFolder_() {
  try {
    return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  } catch (error) {
    throw new Error('The Apps Script account cannot access the configured Google Drive folder.');
  }
}

function findOrCreateChildFolder_(folderName) {
  var parentFolder = getSubjectParentFolder_();
  var matchingFolders = parentFolder.getFoldersByName(folderName);
  return matchingFolders.hasNext()
    ? matchingFolders.next()
    : parentFolder.createFolder(folderName);
}

function getSubjectParentFolder_() {
  var rootFolder = getRootFolder_();
  var matchingFolders = rootFolder.getFoldersByName(CONFIG.SUBJECTS_PARENT_FOLDER);
  return matchingFolders.hasNext()
    ? matchingFolders.next()
    : rootFolder.createFolder(CONFIG.SUBJECTS_PARENT_FOLDER);
}

/** Optional one-time migration of existing subject folders into the parent folder. */
function migrateSubjectFoldersToParent() {
  var parentFolder = getSubjectParentFolder_();
  var subjects = getAllSubjects_();
  var moved = 0;
  var alreadyThere = 0;
  var unavailable = 0;

  subjects.forEach(function (subject) {
    if (!subject.folderId) {
      unavailable++;
      return;
    }

    try {
      var subjectFolder = DriveApp.getFolderById(subject.folderId);
      var parents = subjectFolder.getParents();
      var isAlreadyThere = false;

      while (parents.hasNext()) {
        if (parents.next().getId() === parentFolder.getId()) {
          isAlreadyThere = true;
          break;
        }
      }

      if (isAlreadyThere) {
        alreadyThere++;
      } else {
        subjectFolder.moveTo(parentFolder);
        moved++;
      }
    } catch (error) {
      unavailable++;
    }
  });

  var message = 'Migration completed. Moved: ' + moved +
    ', already inside: ' + alreadyThere +
    ', unavailable: ' + unavailable + '.';
  Logger.log(message);
  return message;
}

function getOfficeById_(officeId) {
  var wanted = cleanId_(officeId);
  for (var index = 0; index < OFFICES.length; index++) {
    if (OFFICES[index].id === wanted) return OFFICES[index];
  }
  throw new Error('Office not recognised.');
}


/* =========================================================================
 * V15.12 USERNAME / PASSWORD LOGIN
 * ========================================================================= */

function ensurePortalUsersSheet_(spreadsheet) {
  spreadsheet = spreadsheet || getDatabase_();

  var sheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET);
  var headers = [
    'User ID',
    'Username',
    'Password Hash',
    'Password Salt',
    'Display Name',
    'Role',
    'Office ID',
    'Active',
    'Created At',
    'Updated At',
    'Last Login',
    'Permissions JSON'
  ];

  if (
    sheet &&
    sheet.getMaxColumns() >= headers.length &&
    sheet.getLastRow() >= 1 &&
    String(sheet.getRange(1, 1).getDisplayValue() || '') === 'User ID'
  ) {
    return sheet;
  }

  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.USERS_SHEET);

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns()
    );
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  try {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0b3b60')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  } catch (ignore) {}

  if (sheet.getLastRow() < 2) {
    seedPortalUsers_(sheet);
  }

  return sheet;
}

function seedPortalUsers_(sheet) {
  var now = new Date();

  var defaults = [
    ['admin', 'Admin@1512', 'Administrator', 'ADMIN', ''],
    ['ceb', 'CEB@1512', 'CE(B)', 'OFFICE', 'CEB'],
    ['cehal', 'CEHAL@1512', 'CE(HAL)', 'OFFICE', 'CEHAL'],
    ['sepd', 'SEPD@1512', 'SE&PD', 'OFFICE', 'SEPD'],
    ['semysore', 'SEMYS@1512', 'SE(Mysore)', 'OFFICE', 'SEMYSORE'],
    ['sehubli', 'SEHUB@1512', 'SE(Hubli)', 'OFFICE', 'SEHUBLI'],
    ['viewer', 'Viewer@1512', 'General Viewer', 'VIEWER', '']
  ];

  var rows = defaults.map(function(item) {
    var salt = Utilities.getUuid();
    return [
      Utilities.getUuid(),
      item[0],
      hashPortalPassword_(item[1], salt),
      salt,
      item[2],
      item[3],
      item[4],
      true,
      now,
      now,
      '',
      JSON.stringify(defaultPortalPermissions_(item[3]))
    ];
  });

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function handlePortalLogin_(payload) {
  var username = cleanPortalUsername_(payload.username);
  var password = String(payload.password || '');

  if (!username || !password) {
    throw new Error('Enter username and password.');
  }

  /* V16.7: cached auth index avoids full sheet/schema work on sign-in. */
  var user = findPortalUserForLoginFast_(username);

  if (
    !user ||
    !user.active ||
    !constantTimeEqual_(
      user.passwordHash,
      hashPortalPassword_(password, user.passwordSalt)
    )
  ) {
    throw new Error('Incorrect username or password.');
  }

  var access = getPortalAccessConfig_();

  if (access.mode === 'ADMIN_ONLY' && user.role !== 'ADMIN') {
    throw new Error(
      'The portal is currently restricted to Administrator login only.'
    );
  }

  var session = createPortalSession_(user);

  /*
   * Do not block successful login on a Google Sheet Last Login write.
   * Persist the timestamp in Script Properties, which is much lighter.
   */
  recordPortalLastLoginFast_(user);

  return {
    ok: true,
    message: 'Signed in successfully.',
    token: session.token,
    user: publicPortalUser_(session),
    backendVersion: CONFIG.BACKEND_VERSION,
    idleSeconds: getPortalIdleSeconds_(),
    security: publicPortalSecurityConfig_(),
    access: publicPortalAccessConfig_()
  };
}

function handlePortalSessionCheck_(payload) {
  var session = requirePortalSession_(payload.sessionToken);
  var access = getPortalAccessConfig_();

  if (access.mode === 'ADMIN_ONLY' && session.role !== 'ADMIN') {
    throw new Error(
      'The portal is currently restricted to Administrator login only.'
    );
  }

  return {
    ok: true,
    user: publicPortalUser_(session),
    backendVersion: CONFIG.BACKEND_VERSION,
    idleSeconds: getPortalIdleSeconds_(),
    security: publicPortalSecurityConfig_(),
    access: publicPortalAccessConfig_()
  };
}

function handlePortalLogout_(payload) {
  var token = String(payload.sessionToken || '').trim();

  if (token) {
    CacheService.getScriptCache().remove('PORTAL_SESSION_' + token);
  }

  return {
    ok: true,
    message: 'Signed out.'
  };
}

function createPortalSession_(user) {
  var token = Utilities.getUuid() + Utilities.getUuid();

  var session = {
    token: token,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    officeId: user.officeId,
    permissions: user.permissions,
    issuedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString()
  };

  CacheService.getScriptCache().put(
    'PORTAL_SESSION_' + token,
    JSON.stringify(session),
    getPortalServerSessionSeconds_()
  );

  return session;
}

function requirePortalSession_(token) {
  token = String(token || '').trim();

  if (!token) {
    throw new Error('Your login session has expired. Please sign in again.');
  }

  var cache = CacheService.getScriptCache();
  var text = cache.get('PORTAL_SESSION_' + token);

  if (!text) {
    throw new Error('Your login session has expired. Please sign in again.');
  }

  var session;

  try {
    session = JSON.parse(text);
  } catch (error) {
    cache.remove('PORTAL_SESSION_' + token);
    throw new Error('Your login session has expired. Please sign in again.');
  }

  var lastActivityMs = new Date(
    session.lastActivityAt || session.issuedAt || 0
  ).getTime();

  var serverLimitMs = getPortalServerSessionSeconds_() * 1000;

  if (
    !lastActivityMs ||
    Date.now() - lastActivityMs > serverLimitMs
  ) {
    cache.remove('PORTAL_SESSION_' + token);
    throw new Error('Your login session has expired. Please sign in again.');
  }

  var user = findPortalUserById_(session.userId);

  if (!user || !user.active) {
    cache.remove('PORTAL_SESSION_' + token);
    throw new Error('This user account is no longer active.');
  }

  // Refresh role/name/office in case Admin changed the account.
  session.username = user.username;
  session.displayName = user.displayName;
  session.role = user.role;
  session.officeId = user.officeId;
  session.permissions = user.permissions;

  // Sliding server-side session with a maximum five-minute safety grace.
  session.lastActivityAt = new Date().toISOString();

  /*
   * V17.7.2 FIX: this refresh runs on essentially every authenticated
   * request (bootstrap included). A transient CacheService write failure
   * here must not turn an otherwise-valid, already-verified session into
   * a failed request -- the caller still gets the correct session object
   * for THIS request; only the sliding-expiry refresh is best-effort.
   */
  try {
    cache.put(
      'PORTAL_SESSION_' + token,
      JSON.stringify(session),
      getPortalServerSessionSeconds_()
    );
  } catch (sessionCachePutError) {
    // Non-fatal: session still valid for this request; next request will retry the refresh.
  }

  return session;
}

function requirePortalAdminSession_(token) {
  var session = requirePortalSession_(token);

  if (session.role !== 'ADMIN') {
    throw new Error('Administrator login is required.');
  }

  return session;
}

function handleAdminListUsers_(payload) {
  requirePortalAdminSession_(payload.sessionToken);

  return {
    ok: true,
    users: getPortalUsers_().map(function(user) {
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        officeId: user.officeId,
        active: user.active,
        lastLogin: user.lastLogin,
        permissions: user.permissions
      };
    })
  };
}

function handleAdminSaveUser_(payload) {
  var adminSession = requirePortalAdminSession_(payload.sessionToken);
  var sheet = ensurePortalUsersSheet_();

  var userId = cleanId_(payload.userId);
  var username = cleanPortalUsername_(payload.username);
  var displayName = cleanPortalDisplayName_(payload.displayName);
  var role = cleanPortalRole_(payload.role);
  var officeId = cleanPortalOfficeForRole_(role, payload.officeId);
  var permissions = normalizePortalPermissions_(payload.permissions, role);
  var password = String(payload.password || '');
  var active = payload.active !== false &&
    String(payload.active == null ? 'true' : payload.active).toLowerCase() !== 'false';

  if (!username) throw new Error('Enter a valid username.');
  if (!displayName) throw new Error('Enter the user display name.');

  var conflict = findPortalUserByUsername_(username, true);

  if (conflict && conflict.id !== userId) {
    throw new Error('That username is already in use.');
  }

  var now = new Date();

  if (userId) {
    var existing = findPortalUserById_(userId);

    if (!existing) throw new Error('The user account could not be found.');

    if (existing.role === 'ADMIN' && !active) {
      ensureAnotherActiveAdmin_(existing.id);
    }

    var hash = existing.passwordHash;
    var salt = existing.passwordSalt;

    if (password) {
      validatePortalPassword_(password);
      salt = Utilities.getUuid();
      hash = hashPortalPassword_(password, salt);
    }

    sheet.getRange(existing.rowNumber, 2, 1, 10).setValues([[
      username,
      hash,
      salt,
      displayName,
      role,
      officeId,
      active,
      existing.createdAt || now,
      now,
      existing.lastLogin || ''
    ]]);

    sheet.getRange(existing.rowNumber, 12).setValue(
      JSON.stringify(permissions)
    );

    invalidatePortalAuthCache_();

    // Invalidate currently cached session if Admin modified own account;
    // the frontend will re-check and continue with refreshed data.
    return {
      ok: true,
      message: 'User account updated.',
      userId: existing.id,
      changedBy: adminSession.username
    };
  }

  validatePortalPassword_(password);

  var salt = Utilities.getUuid();
  var id = Utilities.getUuid();

  sheet.appendRow([
    id,
    username,
    hashPortalPassword_(password, salt),
    salt,
    displayName,
    role,
    officeId,
    active,
    now,
    now,
    '',
    JSON.stringify(permissions)
  ]);

  invalidatePortalAuthCache_();

  return {
    ok: true,
    message: 'User account created.',
    userId: id,
    changedBy: adminSession.username
  };
}

function handleAdminDeleteUser_(payload) {
  var adminSession = requirePortalAdminSession_(payload.sessionToken);
  var userId = cleanId_(payload.userId);

  if (!userId) throw new Error('The user account could not be found.');

  var user = findPortalUserById_(userId);

  if (!user) throw new Error('The user account could not be found.');

  if (user.id === adminSession.userId) {
    throw new Error('You cannot delete the account you are currently using.');
  }

  if (user.role === 'ADMIN') {
    ensureAnotherActiveAdmin_(user.id);
  }

  var sheet = ensurePortalUsersSheet_();
  sheet.deleteRow(user.rowNumber);
  invalidatePortalAuthCache_();

  return {
    ok: true,
    message: 'User account deleted.'
  };
}

function ensureAnotherActiveAdmin_(excludingId) {
  var admins = getPortalUsers_().filter(function(user) {
    return user.active && user.role === 'ADMIN' && user.id !== excludingId;
  });

  if (!admins.length) {
    throw new Error('At least one active Administrator account must remain.');
  }
}

function getPortalUsers_() {
  var sheet = ensurePortalUsersSheet_();

  if (sheet.getLastRow() < 2) return [];

  var properties = PropertiesService.getScriptProperties();

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 12)
    .getValues()
    .filter(function(row) {
      return String(row[0] || '').trim();
    })
    .map(function(row, index) {
      var user = portalUserFromRow_(row, index + 2);
      var fastLastLogin = properties.getProperty(
        'PORTAL_LAST_LOGIN_' + user.id
      );
      if (fastLastLogin) user.lastLogin = fastLastLogin;
      return user;
    });
}

function portalUserFromRow_(row, rowNumber) {
  return {
    id: String(row[0] || ''),
    username: String(row[1] || '').trim().toLowerCase(),
    passwordHash: String(row[2] || ''),
    passwordSalt: String(row[3] || ''),
    displayName: String(row[4] || ''),
    role: String(row[5] || '').toUpperCase(),
    officeId: String(row[6] || '').toUpperCase(),
    active: row[7] === true || String(row[7]).toUpperCase() === 'TRUE',
    createdAt: row[8],
    updatedAt: row[9],
    lastLogin: row[10],
    permissions: parsePortalPermissions_(row[11], String(row[5] || '').toUpperCase()),
    rowNumber: rowNumber
  };
}

function invalidatePortalAuthCache_() {
  try {
    CacheService.getScriptCache().remove('PORTAL_AUTH_USERS_V166');
  } catch (ignore) {}
}

function getPortalAuthUsersFast_(spreadsheet) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'PORTAL_AUTH_USERS_V166';
  var cached = cache.get(cacheKey);

  if (cached) {
    try { return JSON.parse(cached); } catch (ignore) {}
  }

  spreadsheet = spreadsheet || getDatabase_();
  var sheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET);

  if (!sheet) {
    // One-time safety fallback for a legacy/new database.
    return getPortalUsers_();
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Read all 12 fields once; permissions are in column 12.
  var rows = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  var users = rows
    .map(function(row, index) {
      return portalUserFromRow_(row, index + 2);
    })
    .filter(function(user) {
      return !!user.id && !!user.username;
    });

  try {
    cache.put(cacheKey, JSON.stringify(users), 600);
  } catch (ignore) {}

  return users;
}

function findPortalUserForLoginFast_(username) {
  username = String(username || '').trim().toLowerCase();
  var users = getPortalAuthUsersFast_();

  for (var index = 0; index < users.length; index++) {
    if (users[index].username === username) return users[index];
  }

  return null;
}

function recordPortalLastLoginFast_(user) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      'PORTAL_LAST_LOGIN_' + String(user.id || ''),
      new Date().toISOString()
    );
  } catch (ignore) {}
}

function findPortalUserByUsername_(username, includeInactive) {
  username = String(username || '').trim().toLowerCase();
  var users = getPortalUsers_();

  for (var i = 0; i < users.length; i++) {
    if (
      users[i].username === username &&
      (includeInactive || users[i].active)
    ) {
      return users[i];
    }
  }

  return null;
}

function findPortalUserById_(id) {
  id = String(id || '').trim();
  var users = getPortalUsers_();

  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }

  return null;
}

function updatePortalUserLastLogin_(rowNumber) {
  try {
    ensurePortalUsersSheet_().getRange(rowNumber, 11).setValue(new Date());
  } catch (ignore) {}
}

function publicPortalUser_(session) {
  return {
    id: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    officeId: session.officeId,
    permissions: session.permissions || defaultPortalPermissions_(session.role)
  };
}

function cleanPortalUsername_(value) {
  var username = String(value || '').trim().toLowerCase();

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return '';
  }

  return username;
}

function cleanPortalDisplayName_(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

function cleanPortalRole_(value) {
  var role = String(value || '').trim().toUpperCase();

  if (['ADMIN', 'OFFICE', 'VIEWER'].indexOf(role) === -1) {
    throw new Error('Select a valid user role.');
  }

  return role;
}

function cleanPortalOfficeForRole_(role, value) {
  if (role !== 'OFFICE') return '';

  var officeId = String(value || '').trim().toUpperCase();
  var allowed = {};

  RAW_DATA_OFFICES.forEach(function(office) {
    allowed[office.id] = true;
  });

  if (!allowed[officeId]) {
    throw new Error('Select the office for this user.');
  }

  return officeId;
}


function defaultPortalPermissions_(role) {
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

function normalizePortalPermissions_(value, role) {
  if (String(role || '').toUpperCase() === 'ADMIN') {
    return defaultPortalPermissions_('ADMIN');
  }

  var defaults = defaultPortalPermissions_(role);
  var source = value;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source || '{}');
    } catch (error) {
      source = {};
    }
  }

  source = source && typeof source === 'object' ? source : {};

  Object.keys(defaults).forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      defaults[key] = source[key] === true ||
        String(source[key]).toLowerCase() === 'true';
    }
  });

  return defaults;
}

function parsePortalPermissions_(value, role) {
  return normalizePortalPermissions_(value, role);
}

function portalSessionHasPermission_(session, permission) {
  if (!session) return false;
  if (session.role === 'ADMIN') return true;

  var permissions = session.permissions ||
    defaultPortalPermissions_(session.role);

  if (
    permission === 'stickyView' &&
    permissions.stickyManage === true
  ) {
    return true;
  }

  return permissions[permission] === true;
}

function requirePortalPermission_(session, permission) {
  if (!portalSessionHasPermission_(session, permission)) {
    throw new Error('Your account does not have permission for this action.');
  }
  return true;
}


function validatePortalPassword_(password) {
  password = String(password || '');

  if (password.length < 6) {
    throw new Error('Password must contain at least 6 characters.');
  }

  if (password.length > 100) {
    throw new Error('Password is too long.');
  }
}

function hashPortalPassword_(password, salt) {
  return hashText_(
    'ADGB_PORTAL_LOGIN_V1|' +
    String(salt || '') +
    '|' +
    String(password || '')
  );
}


function verifyCode_(key, suppliedCode, permissionName) {
  var supplied = String(suppliedCode || '').trim();

  // Logged-in users use their short-lived session token.
  if (supplied.indexOf('SESSION:') === 0) {
    var sessionToken = supplied.substring('SESSION:'.length);
    var session = requirePortalSession_(sessionToken);

    if (session.role === 'ADMIN') return true;

    if (permissionName) {
      requirePortalPermission_(session, permissionName);
    }

    var permissions = session.permissions ||
      defaultPortalPermissions_(session.role);

    if (permissions.allOffices === true) return true;

    if (
      key === 'HEAD_OFFICE' &&
      (
        permissionName === 'subjectManage' ||
        permissionName === 'rawStructureManage' ||
        permissionName === 'stickyManage'
      )
    ) {
      return true;
    }

    if (
      session.officeId &&
      session.officeId === String(key || '').toUpperCase()
    ) {
      return true;
    }

    throw new Error('Your login does not have permission for this office action.');
  }

  /*
   * V17.6 security rule:
   * Legacy office PIN/password is allowed without username login ONLY in
   * Public View, and ONLY for report document actions.
   */
  var access = getPortalAccessConfig_();
  var publicReportPermissions = [
    'reportUpload',
    'reportViewFile',
    'reportRemove'
  ];

  if (
    access.mode !== 'PUBLIC_VIEW' ||
    access.publicOfficeActions !== true ||
    publicReportPermissions.indexOf(String(permissionName || '')) === -1
  ) {
    throw new Error(
      access.mode === 'ADMIN_ONLY'
        ? 'Administrator username/password login is required.'
        : 'Username/password login is required for this action.'
    );
  }

  // Legacy security codes remain supported.
  var expectedHash = PropertiesService.getScriptProperties().getProperty(
    'CODE_HASH_' + key
  );

  if (!expectedHash) {
    throw new Error(
      'Portal security codes have not been configured. Contact Head Office.'
    );
  }

  if (!supplied || !constantTimeEqual_(expectedHash, hashText_(supplied))) {
    throw new Error('Incorrect security code.');
  }

  return true;
}

function acquirePortalLock_() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Another report is being processed. Wait a few seconds and try again.'
    );
  }

  return lock;
}

function hashText_(text) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );

  return digest.map(function (byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function constantTimeEqual_(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function looksLikePdf_(bytes) {
  return bytes.length >= 5 &&
    bytes[0] === 37 &&
    bytes[1] === 80 &&
    bytes[2] === 68 &&
    bytes[3] === 70 &&
    bytes[4] === 45;
}

function cleanSubjectName_(value) {
  var cleaned = String(value || '')
    .replace(/[\u0000-\u001f<>:"\\/|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) throw new Error('Enter a valid subject name.');
  if (cleaned.length > 100) throw new Error('Subject name must be 100 characters or fewer.');
  return cleaned;
}

function cleanSubjectLinkText_(subjectName, linkTextValue) {
  var linkText = String(linkTextValue || '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!linkText) throw new Error('Enter the text within the subject that should open the PDF.');
  if (linkText.length > 80) throw new Error('Hyperlink text must be 80 characters or fewer.');
  if (subjectName.toLowerCase().indexOf(linkText.toLowerCase()) === -1) {
    throw new Error('Hyperlink text must exactly match words contained in the subject name.');
  }
  return linkText;
}

function cleanFileName_(value) {
  var cleaned = String(value || 'report.pdf')
    .replace(/[\u0000-\u001f<>:"\\/|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  if (!/\.pdf$/i.test(cleaned)) cleaned += '.pdf';
  return cleaned.slice(-140);
}

function sanitizeName_(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function cleanId_(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
}

function invalidateCache_() {
  var cache=CacheService.getScriptCache();
  ['BOOTSTRAP_V2','BOOTSTRAP_V13','BOOTSTRAP_V136','BOOTSTRAP_V137','BOOTSTRAP_V138','BOOTSTRAP_V1381','BOOTSTRAP_V139','BOOTSTRAP_V140','BOOTSTRAP_V141','BOOTSTRAP_V150','BOOTSTRAP_V161','BOOTSTRAP_V162','BOOTSTRAP_V165','DASHBOARD_SNAPSHOT_V171','DASHBOARD_SNAPSHOT_V1767','DASHBOARD_SNAPSHOT_V1767_'+currentCycleKey_()].forEach(function(key){cache.remove(key);});
}

function invalidateRawCache_() {
  var cache = CacheService.getScriptCache();

  /*
   * Raw Data is month-scoped. Clearing current and neighbouring month keys
   * is inexpensive and avoids stale data around month changes.
   */
  var now = new Date();
  var dates = [
    now,
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 1)
  ];

  dates.forEach(function(date) {
    var cycleKey = Utilities.formatDate(
      date,
      CONFIG.TIME_ZONE,
      'yyyy-MM'
    );
    cache.remove('RAW_SNAPSHOT_V176_' + cycleKey);
  });
}

function saveReceipt_(nonce, data) {
  nonce = String(nonce || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
  if (!nonce) return;

  try {
    CacheService.getScriptCache().put('RECEIPT_' + nonce, JSON.stringify(data), 600);
  } catch (error) {
    // Normal iframe response can still complete the request.
  }
}

function getReceipt_(nonce) {
  nonce = String(nonce || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
  if (!nonce) throw new Error('A request receipt number is required.');

  var cached = CacheService.getScriptCache().get('RECEIPT_' + nonce);
  if (!cached) return { ok: true, pending: true, nonce: nonce };

  try {
    return JSON.parse(cached);
  } catch (error) {
    return { ok: true, pending: true, nonce: nonce };
  }
}

function friendlyError_(error) {
  var message = error && error.message
    ? String(error.message)
    : 'An unexpected error occurred.';
  return message.replace(/^Exception:\s*/i, '').slice(0, 300);
}

function jsonpResponse_(data, callback) {
  var json = JSON.stringify(data).replace(/</g, '\\u003c');
  var callbackName = String(callback || 'portalCallback');
  if (!/^[A-Za-z_$][0-9A-Za-z_$\.]{0,80}$/.test(callbackName)) {
    callbackName = 'portalCallback';
  }

  return ContentService
    .createTextOutput(callbackName + '(' + json + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function postMessageResponse_(data) {
  var json = JSON.stringify({ source: 'ADGB_PORTAL', data: data }).replace(/</g, '\\u003c');
  var html = '<!doctype html><html><head><base target="_top"></head><body><script>' +
    'var packet=' + json + ';' +
    'try{window.top.postMessage(packet,"*");}catch(e){}' +
    'try{window.parent.postMessage(packet,"*");}catch(e){}' +
    '<\/script></body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function securePdfViewer_(token) {
  var safeToken = String(token || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
  if (!safeToken) throw new Error('The secure report link is invalid or has expired.');

  var cache = CacheService.getScriptCache();
  var cached = cache.get('PDF_VIEW_' + safeToken);
  if (!cached) throw new Error('The secure report link has expired. Please open the report again from the portal.');
  cache.remove('PDF_VIEW_' + safeToken);

  var record;
  try {
    record = JSON.parse(cached);
  } catch (error) {
    throw new Error('The secure report link is invalid.');
  }

  var file;
  try {
    file = DriveApp.getFileById(record.fileId);
  } catch (error) {
    throw new Error('The submitted PDF is no longer available in Google Drive.');
  }

  var blob = file.getBlob();
  if (blob.getBytes().length > CONFIG.MAX_FILE_MB * 1024 * 1024) {
    throw new Error('The PDF is too large to display in the secure viewer.');
  }

  var viewerData = JSON.stringify({
    fileName: cleanFileName_(record.fileName || file.getName()),
    base64: Utilities.base64Encode(blob.getBytes())
  }).replace(/</g, '\\u003c');

  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Submitted report</title><style>' +
    'html,body{height:100%;margin:0;background:#eef3f6;color:#17364d;font-family:Arial,sans-serif}' +
    'body{display:flex;flex-direction:column}header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #d8e2e9}' +
    '.title{display:flex;flex-direction:column;min-width:0}.title strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title span{font-size:12px;color:#637786}' +
    '.actions{display:flex;gap:8px}.actions a{padding:9px 12px;border-radius:8px;background:#0b4a72;color:#fff;text-decoration:none;font-weight:bold;font-size:13px}' +
    'main{flex:1;min-height:0;padding:8px}.loading{display:grid;height:100%;place-items:center}.hidden{display:none}iframe{width:100%;height:100%;border:0;background:#fff}' +
    '@media(max-width:600px){header{align-items:stretch;flex-direction:column}.actions a{flex:1;text-align:center}main{padding:4px}}' +
    '</style></head><body><header><div class="title"><strong id="name">Submitted report</strong><span>Secure view · link expires shortly</span></div>' +
    '<div class="actions"><a id="open" href="#" target="_blank" rel="noopener">Open PDF</a><a id="download" href="#" download>Download PDF</a></div></header>' +
    '<main><div class="loading" id="loading">Preparing the submitted PDF…</div><iframe class="hidden" id="viewer" title="Submitted PDF"></iframe></main>' +
    '<script>var report=' + viewerData + ';try{var raw=atob(report.base64),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);' +
    'var url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));document.getElementById("name").textContent=report.fileName;' +
    'var viewer=document.getElementById("viewer");viewer.src=url;viewer.className="";document.getElementById("loading").remove();' +
    'document.getElementById("open").href=url;var download=document.getElementById("download");download.href=url;download.download=report.fileName;' +
    'window.addEventListener("beforeunload",function(){URL.revokeObjectURL(url)});}catch(error){document.getElementById("loading").textContent="The PDF could not be prepared in this browser.";}' +
    '<\/script></body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setTitle('Submitted report')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function pdfViewerError_(message) {
  var safeMessage = String(message || 'The submitted report could not be opened.')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Report unavailable</title><style>' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#eef3f6;color:#17364d;font-family:Arial,sans-serif}' +
    'main{max-width:560px;padding:26px;border-top:5px solid #cf3f4f;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(11,59,96,.13)}' +
    'h1{margin:0 0 10px;font-size:24px}p{margin:0;color:#637786;line-height:1.55}' +
    '</style></head><body><main><h1>Report unavailable</h1><p>' + safeMessage + '</p></main></body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setTitle('Report unavailable')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
