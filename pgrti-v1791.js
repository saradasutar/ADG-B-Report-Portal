/* ADG(B) PG/RTI Pendency v17.9.1 — frontend; paired backend required. */
(()=>{'use strict';
const root=document.getElementById('adgbPgrti');if(!root)return;
const $=s=>root.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={PG:'Public Grievances',PG_APPEAL:'PG Appeals',RTI:'RTI Applications',RTI_APPEAL:'RTI First Appeals'};
const defaults=['HEAD_OFFICE','CEB','CEHAL','SEPD','SEMYSORE','SEHUBLI'];
let offices=defaults.map(id=>({id,name:id})),data=null,drafts=[],chosen=null,busy=false,settings=null,queuedAuthRefresh=false,uploading=false,extracting=false,extractedPdfName='';
function uploadReceipt_(r,fileName){
 const box=$('#pgrtiUploadReceipt');if(!box)return;box.hidden=false;box.replaceChildren();
 const title=document.createElement('strong');title.textContent=r.existing?'This PDF was already uploaded':'PDF uploaded successfully';
 const detail=document.createElement('div'),status=String(r.status||'DRAFT');
 detail.textContent=fileName+' · '+status+(r.draftId?' · Reference: '+r.draftId:'')+
   (status==='PUBLISHED'?'. Already approved: refresh the summary above.':'. Awaiting Administrator verification; it is not yet in published figures.');
 box.append(title,detail);
 if(isAdmin()&&status==='DRAFT'){const button=document.createElement('button');button.type='button';button.textContent='Review uploaded draft';
 button.addEventListener('click',async()=>{$('#pgrtiAdminBlock').hidden=false;$('#pgrtiAdminBlock').open=true;
   await loadDrafts(true);const found=drafts.find(x=>String(x.id)===String(r.draftId));
   if(found)chooseDraft(found.id);else{$('#pgrtiAdminBlock').scrollIntoView({behavior:'smooth'});}});
 box.appendChild(button);}
}
const token=()=>String(window.ADGB_AUTH?.token||'');
const isAdmin=()=>!!token()&&window.ADGB_AUTH?.role==='ADMIN';
const call=(action,extra={})=>{if(typeof window.ADGB_PGRTI_CALL!=='function')throw Error('PG/RTI backend bridge is not available.');return window.ADGB_PGRTI_CALL({action,sessionToken:token(),...extra});};
const fmt=n=>Number(n||0).toLocaleString('en-IN');
const setMsg=(message,error=false)=>{let x=$('#pgrtiMessage');if(x){x.textContent=message;x.classList.toggle('pgrti-error',!!error);}};
const officeName=id=>offices.find(x=>x.id===id)?.name||id;
const opts=(values,selected)=>values.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===selected?' selected':'')+'>'+esc(x.name)+'</option>').join('');
const catOpts=(selected)=>Object.entries(categories).map(([key,label])=>'<option value="'+key+'"'+(key===selected?' selected':'')+'>'+label+'</option>').join('');
const rowTemplate=r=>{r=r||{};let inp=(field,label)=>'<label>'+label+'<input data-field="'+field+'" type="number" min="0" step="1" value="'+esc(r[field]??0)+'" required></label>';
return '<div class="pgrti-officer-row"><div class="pgrti-row-head"><label>Office<select data-field="officeId">'+'<option value="">Select correct office</option>'+opts(offices,r.officeId||($('#pgrtiScope').value==='OFFICE'?$('#pgrtiOffice')?.value:''))+'</select></label><label>Officer / CPIO / GRO / FAA / Unit<input data-field="officer" maxlength="180" value="'+esc(r.officer||'')+'" placeholder="Officer or authority with unit"></label><button type="button" data-pgrti-remove-row title="Remove row">Remove</button></div><div class="pgrti-age-grid">'+inp('total','Total pending')+inp('withCitizen','With citizen')+inp('u10','<10d')+inp('d10_20','10–20d')+inp('d21_30','21–30d')+inp('d31_60','31–60d')+inp('d61_90','61–90d')+inp('over90','>90d')+'</div></div>';};
const getRows=()=>Array.from(root.querySelectorAll('.pgrti-officer-row')).map(el=>{let r={};el.querySelectorAll('[data-field]').forEach(f=>r[f.dataset.field]=f.tagName==='SELECT'||f.dataset.field==='officer'?f.value:f.value);return r;});
const addRow=r=>{let el=document.createElement('div');el.innerHTML=rowTemplate(r);$('#pgrtiRows').appendChild(el.firstElementChild);};
const buttonBusy=(name,on)=>{let b=$(name);if(b)b.disabled=on;};
const flash=(msg,error=false)=>setMsg(msg,error);
function workflowStatus_(response){
 const box=$('#pgrtiWorkflowStatus');if(!box)return;
 box.replaceChildren();box.hidden=true;
 if(!response?.initialized||!response.visible)return;
 const totals=Array.isArray(response.totals)?response.totals:[];
 if(totals.length)return;
 box.hidden=false;
 const title=document.createElement('strong');title.textContent='No PG/RTI figures have been published yet';
 const line=document.createElement('div');
 line.textContent='Uploaded PDFs are private drafts. Office-wise pendency appears here only after an Administrator checks and publishes the corresponding officer rows.';
 box.append(title,line);
 if(isAdmin()){
   const review=document.createElement('button');review.type='button';review.textContent='Check uploaded drafts';
   review.addEventListener('click',async()=>{
     $('#pgrtiAdminBlock').hidden=false;$('#pgrtiAdminBlock').open=true;
     await loadDrafts(false);$('#pgrtiAdminBlock').scrollIntoView({behavior:'smooth',block:'start'});
   });
   const add=document.createElement('button');add.type='button';add.textContent='Upload new PDF';
   add.addEventListener('click',()=>{
     $('#pgrtiUploadBlock').hidden=false;$('#pgrtiUploadBlock').open=true;
     $('#pgrtiUploadBlock').scrollIntoView({behavior:'smooth',block:'start'});
   });
   box.append(review,add);
 }
}
async function healthCheck_(){
 if(!isAdmin())return;
 const button=$('#pgrtiCheckHealth');if(button)button.disabled=true;
 try{
   const r=await call('pgrtiHealth');
   if(!r?.ok)throw Error(r?.message||'Health check failed.');
   const count=Number(r.drafts)||0,published=Number(r.published)||0;
   const message=r.initialized
     ?'Register check: '+count+' PDF draft(s) awaiting approval, '+published+' published snapshot(s).'+
       (count?' Open Refresh drafts and approve verified reports.':
       published?' Refresh summary to see published figures.':' No saved PDF drafts were found. Upload and save a PDF as draft.')
     :'Registers have not been initialized. Use Initialize registers in existing spreadsheet.';
   setMsg(message);$('#pgrtiAdminBlock').open=true;
   return r;
 }catch(e){setMsg('Register check unavailable: '+String(e?.message||e)+'. Verify backend V17.9.6 deployment.',true);}
 finally{if(button)button.disabled=false;}
}
function drawSummary(response){
 data=response;if(Array.isArray(response.offices)&&response.offices.length)offices=response.offices;
 let el=$('#pgrtiSummary');if(!el)return;
 if(!response.visible){el.innerHTML='<p class="pgrti-muted">'+esc(response.message||'Sign in for PG/RTI figures.')+'</p>';return;}
 if(!response.initialized){el.innerHTML='<p class="pgrti-muted">Monitoring register is not initialized. Administrator can initialize it below.</p>';return;}
 const list=Array.isArray(response.totals)?response.totals:[];
 const sum=Object.fromEntries(Object.keys(categories).map(c=>[c,list.filter(x=>x.category===c).reduce((n,x)=>n+Number(x.total||0),0)]));
 const latest=list.map(x=>x.asOf).filter(Boolean).sort().reverse()[0]||'No approved snapshot';
 const cards=Object.keys(categories).map(c=>{let n=list.filter(x=>x.category===c).length;return '<div class="pgrti-metric pgrti-'+c.toLowerCase()+'"><small>'+categories[c]+'</small><strong>'+(n?fmt(sum[c]):'—')+'</strong><span>'+(n?n+' office snapshot(s)':'Not reported yet')+'</span></div>';}).join('');
 let officeRows=offices.map(o=>{
   const set=list.filter(x=>x.officeId===o.id),total=set.reduce((n,x)=>n+Number(x.total||0),0);
   const aged=set.reduce((n,x)=>n+Number(x.agedOver30||0),0);
   if(!set.length)return '<tr><th scope="row">'+esc(o.name)+'</th><td colspan="6">Not reported</td></tr>';
   return '<tr><th scope="row">'+esc(o.name)+'</th>'+Object.keys(categories).map(c=>'<td>'+(set.find(x=>x.category===c)?fmt(set.find(x=>x.category===c)?.total):'—')+'</td>').join('')+
   '<td><strong>'+fmt(total)+'</strong> <small>reported</small></td><td>'+fmt(aged)+'</td></tr>';
 }).join('');
 const details=list.filter(x=>Array.isArray(x.officers)&&x.officers.length).map(x=>
   '<details><summary>'+esc(officeName(x.officeId))+' · '+categories[x.category]+' — '+fmt(x.total)+' pending, as on '+esc(x.asOf)+
   (x.change===null?'':' · Change '+(x.change>0?'+':'')+x.change)+'</summary>'+
   '<div class="pgrti-officer-list">'+x.officers.map(o=>'<div><strong>'+esc(o.officer)+'</strong><span>'+fmt(o.total)+' pending · '+fmt(Number(o.d31_60)+Number(o.d61_90)+Number(o.over90))+' over 30d</span></div>').join('')+'</div></details>').join('');
 el.innerHTML='<div class="pgrti-summary-meta">Last approved snapshot: <strong>'+esc(latest)+'</strong> · These are uploaded snapshots, not live portal data.</div>'+
   '<div class="pgrti-metrics">'+cards+'</div><div class="pgrti-table-wrap"><table><thead><tr><th>Office</th><th>PG</th><th>PG Appeal</th><th>RTI</th><th>RTI Appeal</th><th>Total</th><th>Over 30d</th></tr></thead><tbody>'+officeRows+'</tbody></table></div>'+
   (details?'<details class="pgrti-detail"><summary>Officer-wise approved details</summary>'+details+'</details>':'')+
   '<p class="pgrti-muted">Figures are totals for reported offices/categories only; a dash means not reported, not zero. A reduction is not proof of disposal. Old snapshots remain in the audit register.</p>';
}
async function load(){
 if(busy){queuedAuthRefresh=true;return;}
 busy=true;
 buttonBusy('#pgrtiRefresh',true);setMsg('Reading approved PG/RTI snapshots…');
 try{const response=await call('pgrtiBootstrap');if(!response?.ok)throw Error(response?.message||'Data unavailable');
 drawSummary(response);
 workflowStatus_(response);
 const admin=isAdmin();
 $('#pgrtiAdminBlock').hidden=!admin;
 $('#pgrtiUploadBlock').hidden=!(response.canUpload||admin);
 if(admin&&!response.initialized){$('#pgrtiAdminBlock').open=true;$('#pgrtiUploadBlock').open=false;}
 else if(admin&&response.initialized){$('#pgrtiUploadBlock').open=true;}
 if(!admin&&!response.canUpload&&!response.initialized)setMsg('Administrator sign-in required to initialize PG/RTI registers. Open the portal Administrator login, then Refresh.',true);
 $('#pgrtiOffice').innerHTML=opts(offices,response.uploadOfficeId||$('#pgrtiOffice').value||'CEB');
 $('#pgrtiScope').disabled=!isAdmin();
 $('#pgrtiOffice').disabled=!isAdmin();
 if(!isAdmin()){$('#pgrtiScope').value='OFFICE';$('#pgrtiOfficeBox').hidden=false;}
 if(admin||response.initialized||response.canUpload)setMsg(response.initialized?'Approved figures loaded.':'Administrator setup is required. Open the expanded administrator setup below.');
 if(admin&&response.initialized)await loadDrafts(true);
 }catch(e){setMsg('PG/RTI module requires the matching V17.9.1 backend. '+String(e.message||e),true);
 $('#pgrtiSummary').innerHTML='<p class="pgrti-muted">Existing report submissions are unaffected. PG/RTI monitoring will activate after the new backend is deployed.</p>';}
 finally{busy=false;buttonBusy('#pgrtiRefresh',false);
  if(queuedAuthRefresh){queuedAuthRefresh=false;void load();}
 }
}
async function adminInit(){if(!isAdmin())return;buttonBusy('#pgrtiInitialize',true);
 try{const r=await call('pgrtiInit');setMsg(r.message||'Initialized.');await load();}
 catch(e){flash(String(e.message||e),true);}
 finally{buttonBusy('#pgrtiInitialize',false);}
}
async function loadSettings(){if(!isAdmin())return;try{const r=await call('pgrtiSettingsGet');settings=r.settings||{};
 $('#pgrtiOfficeUploads').checked=settings.officeUploads===true;
 $('#pgrtiPublicTotals').checked=settings.publicTotals===true;
 $('#pgrtiAllowed').innerHTML=offices.map(o=>'<label><input type="checkbox" value="'+esc(o.id)+'">'+esc(o.name)+'</label>').join('');
 // Reset checked states explicitly (avoid string interpolation of stale lists).
 $('#pgrtiAllowed').querySelectorAll('input').forEach(e=>e.checked=(settings.allowedOfficeIds||[]).includes(e.value));
 setMsg('Administrator settings loaded.');
 }catch(e){flash(String(e.message||e),true);}}
async function saveSettings(){if(!isAdmin())return;let conf={officeUploads:$('#pgrtiOfficeUploads').checked,
 publicTotals:$('#pgrtiPublicTotals').checked,allowedOfficeIds:Array.from($('#pgrtiAllowed').querySelectorAll('input:checked')).map(x=>x.value)};
 try{const r=await call('pgrtiSettingsSave',{settings:conf});settings=r.settings;flash('PG/RTI settings saved.');}
 catch(e){flash(String(e.message||e),true);}}
function csvImport(){
 const content=$('#pgrtiPaste').value.trim();if(!content){flash('Paste officer rows copied from a spreadsheet.',true);return;}
 const lines=content.split(/\r?\n/).filter(Boolean);let added=0;
 for(const line of lines){
  const cells=line.includes('\t')?line.split('\t'):line.split(',');
  if(cells.length<9)continue;
  const scope=$('#pgrtiScope').value,office=scope==='OFFICE'?$('#pgrtiOffice').value:String(cells[0]).trim();
  const start=scope==='OFFICE'?0:1;
  const name=cells[start].trim();
  if(!name||/officer|cpio|authority/i.test(name)&&/name|officer/i.test(cells[start+1]||''))continue;
  const n=cells.slice(start+1,start+9).map(x=>String(x).trim());
  if(n.length<8||!n.every(x=>/^\d+$/.test(x)))continue;
  addRow({officeId:office,officer:name,total:n[0],withCitizen:n[1],u10:n[2],d10_20:n[3],d21_30:n[4],d31_60:n[5],d61_90:n[6],over90:n[7]});added++;
 }
 flash(added+' row(s) added from pasted table. Check every officer and figure before uploading.',added===0);
}
const readFile=f=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(Error('Unable to read the PDF.'));reader.readAsDataURL(f);});

function extractStatus_(message,error){
 const el=$('#pgrtiExtractStatus');if(!el)return;
 el.textContent=message;el.style.color=error?'#a33341':'#425c78';
}
async function extractPdf_(auto){
 if(extracting||uploading)return;
 const file=$('#pgrtiFile')?.files?.[0];if(!file){extractStatus_('Select the source PDF first.',true);return;}
 if(!window.ADGB_PGRTI_EXTRACT){extractStatus_('PDF reader did not load. Refresh the page or paste rows from Excel.',true);return;}
 if(getRows().length && !window.confirm('Replace existing officer-wise entries with extracted PDF figures?'))return;
 extracting=true;buttonBusy('#pgrtiExtractPdf',true);
 $('#pgrtiExtractSummary').hidden=true;
 try{
   const result=await window.ADGB_PGRTI_EXTRACT(file,(message)=>extractStatus_(message,false));
   // Only CPWD RTI applications and first-appeal formats are recognized.
   if(!result.rows.length)throw Error('No officer-wise figures detected.');
   const category=$('#pgrtiCat').value;
   if((category==='PG'||category==='PG_APPEAL')&&!auto&&
      !window.confirm('The PDF resembles an RTI report, not a PG report. Switch category to '+result.category+'?'))
      throw Error('Category was not changed. Review the selected PDF.');
   $('#pgrtiCat').value=result.category;
   if(result.reportDate)$('#pgrtiDate').value=result.reportDate;
   $('#pgrtiScope').value='REGION';$('#pgrtiOfficeBox').hidden=true;
   $('#pgrtiRows').replaceChildren();
   result.rows.forEach((r)=>addRow({...r,officeId:r.officeId==='UNMAPPED'?'':r.officeId}));
   extractedPdfName=file.name;
   const sum=$('#pgrtiExtractSummary');sum.hidden=false;
   sum.dataset.warning=result.unmatched.length||result.duplicateNames.length?'yes':'no';
   sum.replaceChildren();
   const head=document.createElement('strong');
   head.textContent='Extracted '+result.rows.length+' officer rows · '+result.total+' pending · '+(result.reportDate||'Date not found');
   sum.appendChild(head);
   const note=document.createElement('p');
   note.textContent='Verify every office, officer, total and age category against the PDF. This is a draft extraction, not a published report.';
   sum.appendChild(note);
   if(result.unmatched.length||result.duplicateNames.length){
     const warnings=document.createElement('ul');
     [...result.unmatched.map(n=>'Office not recognized: '+n),...result.duplicateNames.map(n=>'Duplicate officer: '+n)].forEach(n=>{const li=document.createElement('li');li.textContent=n;warnings.appendChild(li);});
     sum.appendChild(warnings);
   }
   extractStatus_('Extraction complete. Check all '+result.rows.length+' rows before saving.',false);
 }catch(e){
   extractStatus_(String(e.message||e),true);
   if(!auto)flash('PDF extraction unavailable: '+String(e.message||e),true);
 }finally{extracting=false;buttonBusy('#pgrtiExtractPdf',false);}
}

async function saveDraft(){
 if(uploading)return;
 if(!token()){flash('Sign in before uploading.',true);return;}
 if(!data?.initialized){
  if(!isAdmin()){flash('Administrator must initialize the PG/RTI registers before uploading.',true);$('#pgrtiAdminBlock').open=true;return;}
  try{flash('Initializing missing PG/RTI registers in the existing database…');
    const initialized=await call('pgrtiInit');
    if(!initialized?.ok)throw Error(initialized?.message||'Unable to initialize registers.');
    await load();
    if(!data?.initialized)throw Error('Initialization could not be confirmed. Refresh and check Administrator Setup.');
  }catch(e){flash('Could not initialize registers: '+String(e.message||e),true);$('#pgrtiAdminBlock').open=true;return;}
 }
 const file=$('#pgrtiFile').files[0];if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>8*1024*1024){flash('Choose a PDF up to 8 MB.',true);return;}
 if(!$('#pgrtiDate').value){flash('Select the report as-on date.',true);return;}
 if(!data?.initialized&&isAdmin()){flash('Initialize registers first; use the Administrator button above.',true);return;}
 const rows=getRows();
 if(rows.some(r=>!r.officeId||!offices.some(o=>o.id===r.officeId))){flash('An extracted office could not be mapped. Select the correct Office for every officer row.',true);return;}
 const body={category:$('#pgrtiCat').value,reportDate:$('#pgrtiDate').value,scope:$('#pgrtiScope').value,
 officeId:$('#pgrtiOffice').value,fileName:file.name,rows,note:$('#pgrtiNote').value};
 uploading=true;buttonBusy('#pgrtiSaveDraft',true);
 const saveButton=$('#pgrtiSaveDraft');saveButton.textContent='Uploading PDF…';
 $('#pgrtiUploadReceipt').hidden=true;
 flash('Uploading PDF securely. Do not press Save again or leave the page until confirmation.');
 try{body.fileBase64=await readFile(file);flash('Sending PDF ('+(file.size/1048576).toFixed(2)+' MB) to the private PG/RTI folder…');
 const r=await call('pgrtiPrepareDraft',body);
 if(!r?.ok)throw Error(r?.message||'Backend did not confirm the upload.');
 uploadReceipt_(r,file.name);
 flash(r.message||'PDF stored as a draft; Administrator approval needed.');
 $('#pgrtiFile').value='';
 if(isAdmin()){$('#pgrtiAdminBlock').hidden=false;$('#pgrtiAdminBlock').open=true;await loadDrafts(true);}}
 catch(e){flash('Upload was NOT confirmed: '+String(e.message||e)+'. Check pending drafts before trying again.',true);if(isAdmin()){$('#pgrtiAdminBlock').open=true;await loadDrafts(true);}}
 finally{uploading=false;buttonBusy('#pgrtiSaveDraft',false);$('#pgrtiSaveDraft').textContent='Save source PDF as draft';}
}
async function loadDrafts(silent=false){
 if(!isAdmin())return;
 try{const r=await call('pgrtiListDrafts');drafts=Array.isArray(r.drafts)?r.drafts:[];
 $('#pgrtiDraftCount').textContent=drafts.length+' awaiting review';
 $('#pgrtiDraftList').innerHTML=drafts.length?drafts.map(d=>'<button type="button" class="pgrti-draft-item" data-draft="'+esc(d.id)+'"><strong>'+esc(categories[d.category]||d.category)+' · '+esc(d.reportDate)+'</strong><span>'+esc(d.fileName)+' · '+esc(d.scope==='REGION'?'All offices':officeName(d.officeId))+' · '+d.rows.length+' officer rows</span><em class="pgrti-draft-pill">DRAFT — review</em></button>').join(''):'<p class="pgrti-muted">No drafts awaiting review. Published figures appear above.</p>';
 if(!silent)flash(drafts.length+' draft(s) awaiting review.');
 }catch(e){$('#pgrtiDraftCount').textContent='Unable to load';$('#pgrtiDraftList').textContent='Could not load uploaded drafts: '+String(e.message||e);if(!silent)flash(String(e.message||e),true);}
}
function chooseDraft(id){
 chosen=drafts.find(d=>d.id===id);if(!chosen)return;
 $('#pgrtiCat').value=chosen.category;$('#pgrtiDate').value=chosen.reportDate;$('#pgrtiScope').value=chosen.scope;
 $('#pgrtiOffice').value=chosen.officeId||'CEB';
 $('#pgrtiRows').innerHTML='';
 chosen.rows.forEach(addRow);
 $('#pgrtiReview').hidden=false;
 $('#pgrtiUploadBlock').open=true;
 $('#pgrtiAdminBlock').open=true;
 $('#pgrtiReviewTitle').textContent='Review draft: '+chosen.fileName+' ('+chosen.reportDate+')';
 $('#pgrtiUploadBlock').scrollIntoView({behavior:'smooth',block:'start'});
}
async function manageDraft(action){
 if(!chosen||!isAdmin())return;
 if(action==='pgrtiPublishDraft'&&!confirm('Publish the verified counts for '+chosen.reportDate+'? The dashboard totals will change.'))return;
 if(action==='pgrtiRejectDraft'&&!confirm('Reject this draft? Its PDF will be retained for audit.'))return;
 buttonBusy('#pgrtiPublish',true);buttonBusy('#pgrtiReject',true);
 try{let body={draftId:chosen.id,rows:getRows(),note:$('#pgrtiReviewNote').value};
 if(action==='pgrtiRejectDraft')body.reason=body.note||'Rejected during review';
 const r=await call(action,body);chosen=null;$('#pgrtiReview').hidden=true;await load();if(isAdmin())$('#pgrtiAdminBlock').open=true;flash(r.message||'Saved. Refresh to see updated approved figures.');}
 catch(e){flash(String(e.message||e),true);}
 finally{buttonBusy('#pgrtiPublish',false);buttonBusy('#pgrtiReject',false);}
}
async function openSource(){
 if(!chosen)return;
 const tab=window.open('about:blank','_blank');
 if(!tab){flash('Allow popups for the secure PDF viewer.',true);return;}
 try{const r=await call('pgrtiViewSource',{draftId:chosen.id});
 const url=new URL(String(r.viewUrl||''));if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname))throw Error('Invalid secure PDF URL');
 tab.location.replace(url.href);}
 catch(e){try{tab.close();}catch(ignore){}flash(String(e.message||e),true);}
}
document.getElementById('adgbPgrtiJump')?.addEventListener('click',()=>{root.scrollIntoView({behavior:'smooth',block:'start'});if(isAdmin())$('#pgrtiUploadBlock').open=true;});
$('#pgrtiRefresh').addEventListener('click',load);
$('#pgrtiExtractPdf').addEventListener('click',()=>extractPdf_(false));
$('#pgrtiFile').addEventListener('change',()=>{
 extractedPdfName='';$('#pgrtiExtractSummary').hidden=true;
 const file=$('#pgrtiFile').files?.[0];
 if(!file)return;
 if($('#pgrtiCat').value==='RTI'||$('#pgrtiCat').value==='RTI_APPEAL')void extractPdf_(true);
 else extractStatus_('PDF selected. Click Read office-wise figures if this is a CPWD age-wise export.',false);
});
// The login UI is populated asynchronously. Rerun bootstrap immediately after role/token changes.
window.addEventListener('adgb-auth-changed',()=>{void load();});
window.addEventListener('adgb-access-changed',()=>{void load();});
$('#pgrtiInitialize').addEventListener('click',adminInit);
$('#pgrtiSettingsLoad').addEventListener('click',loadSettings);
$('#pgrtiCheckHealth').addEventListener('click',healthCheck_);
$('#pgrtiSettingsSave').addEventListener('click',saveSettings);
$('#pgrtiScope').addEventListener('change',()=>{$('#pgrtiOfficeBox').hidden=$('#pgrtiScope').value==='REGION';});
$('#pgrtiAddRow').addEventListener('click',()=>addRow());
$('#pgrtiPasteImport').addEventListener('click',csvImport);
$('#pgrtiRows').addEventListener('click',e=>{if(e.target.closest('[data-pgrti-remove-row]'))e.target.closest('.pgrti-officer-row')?.remove();});
$('#pgrtiSaveDraft').addEventListener('click',saveDraft);
$('#pgrtiLoadDrafts').addEventListener('click',loadDrafts);
$('#pgrtiDraftList').addEventListener('click',e=>{let b=e.target.closest('[data-draft]');if(b)chooseDraft(b.dataset.draft);});
$('#pgrtiPublish').addEventListener('click',()=>manageDraft('pgrtiPublishDraft'));
$('#pgrtiReject').addEventListener('click',()=>manageDraft('pgrtiRejectDraft'));
$('#pgrtiOpenSource').addEventListener('click',openSource);
$('#pgrtiDate').value=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
// Ensure button never stays visually disabled after sign-in, unless the user is actively uploading.
$('#pgrtiSaveDraft').disabled=false;
const originalSaveButton=$('#pgrtiSaveDraft');
originalSaveButton.setAttribute('aria-label','Save PDF as private draft; approval and officer-wise review follow');
if('IntersectionObserver' in window){const watcher=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){watcher.disconnect();load();}},{rootMargin:'200px'});watcher.observe(root);}else setTimeout(load,900);
})();