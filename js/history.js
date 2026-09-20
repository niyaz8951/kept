"use strict";
/* =============== HISTORY — the continuous record: every uploaded and added transaction =============== */
const History = (() => {
 let shown=150;
 function monthOpts(){
  const ms=[...new Set(Store.load().map(r=>r[0].slice(0,7)))].sort().reverse();
  return '<option value="all">All months</option>'+ms.map(m=>`<option value="${m}">${monthShort(m)}</option>`).join("");
 }
 function kindOf(r){
  if(!M) return r[2]>=0?"income":"expense";
  const h=r[5]||Store.hash(r);
  const t=M.txns.find(t=>t.hash===h);
  return t?t.kind:(r[2]>=0?"income":"expense");
 }
 function render(reset){
  if(reset) shown=150;
  const q=($$("hxSearch").value||"").toLowerCase(), kd=$$("hxKind").value;
 let mo=$$("hxMonth").value||"all";
  const sel=$$("hxMonth");
  if(!sel.dataset.built){
   const keep=sel.value||"all";
   sel.innerHTML=monthOpts(); sel.dataset.built="1";
   sel.value=[...sel.options].some(o=>o.value===keep)?keep:"all";   // never strand the user on a stale month
  }
  const all=Store.load().slice().reverse();
  mo=$$("hxMonth").value||"all";
  const rows=all.filter(r=>{
   if(mo!=="all" && r[0].slice(0,7)!==mo) return false;
   if(kd!=="all" && kindOf(r)!==kd) return false;
   if(q && !((r[1]||"")+" "+(r[3]||"")+" "+(r[4]||"")).toLowerCase().includes(q)) return false;
   return true;
  });
  const page=rows.slice(0,shown);
  const inSum=rows.filter(r=>r[2]>0).reduce((a,r)=>a+r[2],0), outSum=rows.filter(r=>r[2]<0).reduce((a,r)=>a-r[2],0);
  $$("hxCount").innerHTML=`<b>${rows.length}</b> of ${all.length} transactions · in ${money(inSum)} · out ${money(outSum)} · net <b style="color:${inSum-outSum>=0?"var(--leaf)":"var(--coral)"}">${money(inSum-outSum)}</b>`;
  let html="", lastDay="";
  page.forEach(r=>{
   const day=r[0];
   if(day!==lastDay){ lastDay=day;
    const d=new Date(day+"T00:00:00");
    html+=`<div class="txday">${d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>`; }
   const k=kindOf(r), h=r[5]||Store.hash(r);
   html+=`<div class="txrow" data-h="${h}">
     ${Icons.chip(r[1],r[3],k)}
     <div class="txmid"><div class="txname">${esc(String(r[1]).slice(0,60))}</div>
      <div class="txmeta">${esc(r[3]||"Uncategorized")}${r[4]?" · "+esc(String(r[4]).slice(0,28)):""}${k!=="expense"?` · <span class="txkind">${k}</span>`:""}</div></div>
     <div class="txamt ${r[2]>=0?"pos":""}">${r[2]>=0?"+":"−"}${fmt0(Math.abs(r[2]))}</div>
     <button class="txdel" data-h="${h}" title="Delete">✕</button></div>`;
  });
  $$("hxList").innerHTML = page.length? html : '<div class="sub" style="padding:18px 0">No transactions match. Upload your Excel or add today\'s spending to start the record.</div>';
  $$("hxMore").style.display = rows.length>shown ? "" : "none";
  $$("hxMore").textContent = "Show more ("+(rows.length-shown)+" left)";
 }
 function init(){
  $$("hxSearch").addEventListener("input",()=>render(true));
  $$("hxMonth").addEventListener("change",()=>render(true));
  $$("hxKind").addEventListener("change",()=>render(true));
  $$("hxMore").addEventListener("click",()=>{ shown+=150; render(); });
  $$("hxExport").addEventListener("click",()=>Account.exportAll());
  $$("hxList").addEventListener("click",e=>{
   const b=e.target.closest(".txdel"); if(!b) return;
   if(!confirm("Delete this transaction?")) return;
   Store.removeHash(b.dataset.h);
   RAW=Store.txns(); M=RAW.length?build(RAW):null;
   if(typeof Sync!=="undefined"&&Sync.deleteRow) Sync.deleteRow(b.dataset.h);
   $$("hxMonth").dataset.built=""; render(true);
   if(M) renderAll(); 
  });
  render(true);
 }
 return {init, render, refresh:()=>{ $$("hxMonth").dataset.built=""; render(true); }};
})();
