/* ADG(B) CPWD age-wise PG/RTI PDF extraction — v17.9.6
 * Reads files in the administrator's browser; never uploads the PDF for parsing.
 * The source must be the CPWD Region Bangalore age-wise export with selectable text.
 * Counts are suggestions only, reviewed and approved through the existing backend.
 */
(function(){
 'use strict';
 var version='3.11.174';
 var cdn='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/'+version+'/';
 var loading=null;
 function getPdfJs(){
   if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
   if(loading)return loading;
   loading=new Promise(function(resolve,reject){
     var script=document.createElement('script');
     script.src=cdn+'pdf.min.js';script.crossOrigin='anonymous';
     script.onload=function(){
       if(!window.pdfjsLib){reject(Error('PDF reading library did not load.'));return;}
       window.pdfjsLib.GlobalWorkerOptions.workerSrc=cdn+'pdf.worker.min.js';
       resolve(window.pdfjsLib);
     };
     script.onerror=function(){reject(Error('PDF text reader blocked. Check network access or use Paste table.'));};
     document.head.appendChild(script);
   }).catch(function(e){loading=null;throw e;});
   return loading;
 }
 function officeFromName(text){
   var x=String(text||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
   if(/^ADG/.test(x))return 'HEAD_OFFICE';
   if(/HALPZ|HALPROJECT|CEHAL/.test(x))return 'CEHAL';
   if(/CEBANGALORE|CEBENGALURU|CEBANGALORE/.test(x))return 'CEB';
   if(/SEHUBLI|SEHUBBALLI/.test(x))return 'SEHUBLI';
   if(/SEMYSORE|SEMYSURU/.test(x))return 'SEMYSORE';
   if(/SEPD|SEPROJECTDIRECTOR/.test(x))return 'SEPD';
   return '';
 }
 function cleanName(parts){
   return parts.map(function(i){return i.t;}).join(' ').replace(/\s+/g,' ')
      .replace(/\s+-\s+/g,'-').replace(/-\s+/g,'-').trim();
 }
 function rowsFromPage(items,width,height){
   var scale=595/Math.max(1,width);
   var data=items.filter(function(i){return typeof i.str==='string' && i.str.trim();}).map(function(i){
     return {t:i.str.trim(),x:Number(i.transform[4])*scale,y:(height-Number(i.transform[5]))*scale};
   });
   var anchors=data.filter(function(i){return i.x>30&&i.x<75&&i.y>165&&i.y<650&&/^[1-9]\d?$/.test(i.t);}).sort(function(a,b){return a.y-b.y;});
   var result=[];
   anchors.forEach(function(a,index){
     var lower=index?(anchors[index-1].y+a.y)/2:a.y-38;
     var upper=index+1<anchors.length?(anchors[index+1].y+a.y)/2:a.y+38;
     var name=cleanName(data.filter(function(i){return i.x>72&&i.x<139&&i.y>=lower&&i.y<upper&&!/^(total|name of|cpio|faa)$/i.test(i.t);}).sort(function(a,b){return a.y-b.y||a.x-b.x;}));
     var nums=data.filter(function(i){return i.x>120&&i.x<575&&Math.abs(i.y-a.y)<7&&/^\d+$/.test(i.t);}).sort(function(a,b){return a.x-b.x;}).map(function(i){return Number(i.t);});
     if(!name||nums.length!==9)return;
     var office=officeFromName(name);
     var total=nums[0],withCitizen=nums[1],u10=nums[2],d10_20=nums[3],d21_30=nums[4],agedOver30=nums[5],d31_60=nums[6],d61_90=nums[7],over90=nums[8];
     if([total,withCitizen,u10,d10_20,d21_30,d31_60,d61_90,over90].some(function(n){return !Number.isSafeInteger(n)||n<0;}))return;
     if(withCitizen>total||u10+d10_20+d21_30+d31_60+d61_90+over90>total)return;
     result.push({officeId:office||'UNMAPPED',officer:name,total:total,withCitizen:withCitizen,u10:u10,d10_20:d10_20,d21_30:d21_30,d31_60:d31_60,d61_90:d61_90,over90:over90,
       warning:office?'':('Select the correct office for '+name),
       ageTotal:agedOver30});
   });
   return {rows:result,text:data.map(function(i){return i.t;}).join(' ')};
 }
 async function extract(file,notify){
   if(!file)throw Error('Choose an official PDF first.');
   if(!/\.pdf$/i.test(file.name))throw Error('Please choose a PDF.');
   if(file.size>8*1024*1024)throw Error('PDF exceeds the portal 8 MB limit.');
   notify=typeof notify==='function'?notify:function(){};
   notify('Loading PDF text reader…');
   var pdfjs=await getPdfJs();
   var bytes=new Uint8Array(await file.arrayBuffer());
   var doc=await pdfjs.getDocument({data:bytes}).promise;
   try{
     var rows=[],texts=[];
     for(var p=1;p<=Math.min(doc.numPages,20);p++){
       notify('Reading page '+p+' of '+Math.min(doc.numPages,20)+'…');
       var page=await doc.getPage(p),text=await page.getTextContent();
       var parsed=rowsFromPage(text.items,page.view[2]-page.view[0],page.view[3]-page.view[1]);
       rows.push.apply(rows,parsed.rows);
       texts.push(parsed.text);
     }
     var joined=texts.join(' ');
     if(!/Age\s+wise\s+(?:Appeal\(s\)\s+)?Pendency\s+Report/i.test(joined)||
        !/CPWD\s+Region\s+Bangalore/i.test(joined)){
       throw Error('PDF format is not recognized as a CPWD Region Bangalore RTI age-wise export. For PG PDFs or different layouts, use verified manual entries / Paste table.');
     }
     var m=joined.match(/(?:Age\s+wise[\s\S]{0,90}as\s+on)\s*(\d{4}-\d{2}-\d{2})/i);
     var date=m?m[1]:'';
     var isAppeal=/Age\s+wise\s+Appeal/i.test(joined);
     if(!rows.length){
       throw Error('No usable age-wise officer table found. This may be a scanned/image-only PDF, a different format, or missing selectable text. Use the manual table or spreadsheet paste option.');
     }
     var map=new Set(),duplicates=[];
     rows=rows.filter(function(r){var key=r.officeId+'|'+r.officer.toLowerCase();
       if(map.has(key)){duplicates.push(r.officer);return false;}map.add(key);return true;});
     var pending=rows.reduce(function(n,r){return n+r.total;},0);
     return {rows:rows,reportDate:date,category:isAppeal?'RTI_APPEAL':'RTI',total:pending,
       unmatched:rows.filter(function(r){return r.officeId==='UNMAPPED';}).map(function(r){return r.officer;}),
       duplicateNames:duplicates,sourcePages:doc.numPages,format:'CPWD age-wise pendency export'};
   }finally{try{doc.destroy();}catch(ignore){}}
 }
 // No automatic publishing or server writes.
 window.ADGB_PGRTI_EXTRACT=extract;
 window.ADGB_PGRTI_OFFICE_FROM_NAME=officeFromName;
})();
