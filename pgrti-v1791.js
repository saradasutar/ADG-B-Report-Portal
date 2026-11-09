/* ADG(B) PG/RTI Pendency v17.9.1 — frontend; paired backend required. */
(()=>{'use strict';
const root=document.getElementById('adgbPgrti');if(!root)return;
const $=s=>root.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={PG:'Public Grievances',PG_APPEAL:'PG Appeals',RTI:'RTI Applications',RTI_APPEAL:'RTI First Appeals'};
const defaults=['HEAD_OFFICE','CEB','CEHAL','SEPD','SEMYSORE','SEHUBLI'];
let offices=defaults.map(id=>({id,name:id})),data=null,drafts=[],chosen=null,busy=false,settings=null;
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
const isAdmin=()=>!!token()&&(typeof window.ADGB_PGRTI_IS_ADMIN==='function'?window.ADGB_PGRTI_IS_ADMIN():document.getElementById('adgbUserRole')?.textContent?.trim()==='Administrator');
const call=(action,extra={})=>{if(typeof window.ADGB_PGRTI_CALL!=='function')throw Error('PG/RTI backend bridge is not available.');return window.ADGB_PGRTI_CALL({action,sessionToken:token(),...extra});};
const fmt=n=>Number(n||0).toLocaleString('en-IN');
const setMsg=(message,error=false)=>{let x=$('#pgrtiMessage');if(x){x.textContent=message;x.classList.toggle('pgrti-error',!!error);}};
const officeName=id=>offices.find(x=>x.id===id)?.name||id;
const opts=(values,selected)=>values.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===selected?' selected':'')+'>'+esc(x.name)+'</option>').join('');
const catOpts=(selected)=>Object.entries(categories).map(([key,label])=>'<option value="'+key+'"'+(key===selected?' selected':'')+'>'+label+'</option>').join('');
const rowTemplate=r=>{r=r||{};let inp=(field,label)=>'<label>'+label+'<input data-field="'+field+'" type="number" min="0" step="1" value="'+esc(r[field]??0)+'" required></label>';
return '<div class="pgrti-officer-row"><div class="pgrti-row-head"><label>Office<select data-field="officeId">'+opts(offices,r.officeId||$('#pgrtiOffice')?.value||'CEB')+'</select></label><label>Officer / CPIO / GRO / FAA / Unit<input data-field="officer" maxlength="180" value="'+esc(r.officer||'')+'" placeholder="Officer or authority with unit"></label><button type="button" data-pgrti-remove-row title="Remove row">Remove</button></div><div class="pgrti-age-grid">'+inp('total','Total pending')+inp('withCitizen','With citizen')+inp('u10','<10d')+inp('d10_20','10–20d')+inp('d21_30','21–30d')+inp('d31_60','31–60d')+inp('d61_90','61–90d')+inp('over90','>90d')+'</div></div>';};
const getRows=()=>Array.from(root.querySelectorAll('.pgrti-officer-row')).map(el=>{let r={};el.querySelectorAll('[data-field]').forEach(f=>r[f.dataset.field]=f.tagName==='SELECT'||f.dataset.field==='officer'?f.value:f.value);return r;});
const addRow=r=>{let el=document.createElement('div');el.innerHTML=rowTemplate(r);$('#pgrtiRows').appendChild(el.firstElementChild);};
const buttonBusy=(name,on)=>{let b=$(name);if(b)b.disabled=on;};
const flash=(msg,error=false)=>setMsg(msg,error);
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
 if(busy)return;
 buttonBusy('#pgrtiRefresh',true);setMsg('Reading approved PG/RTI snapshots…');
 try{const response=await call('pgrtiBootstrap');if(!response?.ok)throw Error(response?.message||'Data unavailable');
 drawSummary(response);
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
 finally{buttonBusy('#pgrtiRefresh',false);}
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
async function saveDraft(){
 if(!token()){flash('Sign in before uploading.',true);return;}
 const file=$('#pgrtiFile').files[0];if(!file||!file.name.toLowerCase().endsWith('.pdf')||file.size>8*1024*1024){flash('Choose a PDF up to 8 MB.',true);return;}
 const rows=getRows(),body={category:$('#pgrtiCat').value,reportDate:$('#pgrtiDate').value,scope:$('#pgrtiScope').value,
 officeId:$('#pgrtiOffice').value,fileName:file.name,rows,note:$('#pgrtiNote').value};
 buttonBusy('#pgrtiSaveDraft',true);flash('Uploading private source PDF…');
 try{body.fileBase64=await readFile(file);const r=await call('pgrtiPrepareDraft',body);
 uploadReceipt_(r,file.name);
 flash(r.message||'PDF stored as a draft; Administrator approval needed.');
 $('#pgrtiFile').value='';
 if(isAdmin()){$('#pgrtiAdminBlock').hidden=false;$('#pgrtiAdminBlock').open=true;await loadDrafts(true);}}
 catch(e){flash(String(e.message||e),true);}
 finally{buttonBusy('#pgrtiSaveDraft',false);}
}
async function loadDrafts(silent=false){
 if(!isAdmin())return;
 try{const r=await call('pgrtiListDrafts');drafts=Array.isArray(r.drafts)?r.drafts:[];
 $('#pgrtiDraftCount').textContent=drafts.length+' awaiting review';
 $('#pgrtiDraftList').innerHTML=drafts.length?drafts.map(d=>'<button type="button" class="pgrti-draft-item" data-draft="'+esc(d.id)+'"><strong>'+esc(categories[d.category]||d.category)+' · '+esc(d.reportDate)+'</strong><span>'+esc(d.fileName)+' · '+esc(d.scope==='REGION'?'All offices':officeName(d.officeId))+' · '+d.rows.length+' officer rows</span><em class="pgrti-draft-pill">DRAFT — review</em></button>').join(''):'<p class="pgrti-muted">No drafts awaiting review. Published figures appear above.</p>';
 if(!silent)flash(drafts.length+' draft(s) awaiting review.');
 }catch(e){$('#pgrtiDraftCount').textContent='Unable to load';if(!silent)flash(String(e.message||e),true);}
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
$('#pgrtiInitialize').addEventListener('click',adminInit);
$('#pgrtiSettingsLoad').addEventListener('click',loadSettings);
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
if('IntersectionObserver' in window){const watcher=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){watcher.disconnect();load();}},{rootMargin:'200px'});watcher.observe(root);}else setTimeout(load,900);
})();