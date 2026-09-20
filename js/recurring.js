"use strict";
/* =============== RECURRING RULES — set once, Kept writes every occurrence up to today =============== */
const Recurring = (() => {
 const K="kept_recur";
 const CATS=["Rent","Loan","Utilities","Grocery","Transport","Car","Entertainment","Personal","Medicine","Misc","Income"];
 function rules(){ try{ return JSON.parse(localStorage.getItem(K)||"[]"); }catch(e){ return []; } }
 function save(r){ try{ localStorage.setItem(K,JSON.stringify(r)); }catch(e){}
  if(typeof Sync!=="undefined"&&Sync.queuePush) Sync.queuePush(); }
 function iso(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
 function step(d,freq){
  const n=new Date(d);
  if(freq==="weekly") n.setDate(n.getDate()+7);
  else if(freq==="yearly") n.setFullYear(n.getFullYear()+1);
  else { const day=n.getDate(); n.setMonth(n.getMonth()+1);
   if(n.getDate()<day) n.setDate(0); }          // 31st in a short month lands on the last day
  return n;
 }
 /* Generate every occurrence from start to min(today, end). Rows carry the rule id in the
    remark so they can be traced, and the store's hash dedupe means re-running is harmless. */
 function materialize(){
  const out=[], today=new Date(); today.setHours(0,0,0,0);
  rules().forEach(r=>{
   let d=new Date(r.start+"T00:00:00");
   const end=r.end? new Date(r.end+"T00:00:00") : null;
   let guard=0;
   while(d<=today && (!end||d<=end) && guard++<600){
    out.push([iso(d), r.desc, r.kind==="in"?Math.abs(r.amt):-Math.abs(r.amt), r.cat, "recurring:"+r.id]);
    d=step(d,r.freq);
   }
  });
  if(!out.length) return {added:0,total:Store.load().length};
  return Store.merge(out);
 }
 function label(r){
  const f=r.freq==="weekly"?"Weekly":r.freq==="yearly"?"Yearly":"Monthly";
  const from=new Date(r.start+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"2-digit"});
  return `${f} from ${from}${r.end?` · ends ${new Date(r.end+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"2-digit"})}`:" · no end date"} · ${esc(r.cat)}`;
 }
 function renderList(){
  const rs=rules();
  $$("rcList").innerHTML = rs.length ? rs.map(r=>
   `<div class="rcrow">${Icons.chip(r.desc,r.cat,r.kind==="in"?"income":"expense")}
     <span class="rcmid"><b>${esc(r.desc)}</b><i>${label(r)}</i></span>
     <span class="rcamt" style="color:${r.kind==="in"?"var(--leaf)":"inherit"}">${r.kind==="in"?"+":"−"}${fmt0(Math.abs(r.amt))}</span>
     <button class="rcdel" data-id="${r.id}" aria-label="Delete rule">✕</button></div>`).join("")
   : '<div class="sub">No recurring rules yet. Rent, EMIs and salary are the ones worth adding — they are most of the month.</div>';
  $$("rcList").querySelectorAll(".rcdel").forEach(b=>b.addEventListener("click",()=>{
   if(!confirm("Delete this rule? Transactions it already wrote stay in the record.")) return;
   save(rules().filter(x=>x.id!==b.dataset.id)); renderList();
  }));
 }
 function init(){
  $$("rcCat").innerHTML=CATS.map(c=>`<option value="${c}">${c}</option>`).join("");
  $$("rcStart").value=QuickAdd.todayISO();
  $$("rcKind").addEventListener("change",e=>{ if(e.target.value==="in") $$("rcCat").value="Income"; });
  $$("rcSave").addEventListener("click",add);
  renderList();
 }
 function add(){
  const amt=parseFloat($$("rcAmt").value), desc=($$("rcDesc").value||"").trim();
  const start=$$("rcStart").value, end=$$("rcEnd").value||"";
  const m=$$("rcMsg");
  if(!amt||amt<=0){ m.innerHTML='<div class="insight" role="alert">Enter the amount.</div>'; return; }
  if(!desc){ m.innerHTML='<div class="insight" role="alert">Give it a name — you will see it in the record.</div>'; return; }
  if(!start){ m.innerHTML='<div class="insight" role="alert">Pick the start date.</div>'; return; }
  if(end && end<start){ m.innerHTML='<div class="insight" role="alert">The end date is before the start date.</div>'; return; }
  const r={id:"r"+Date.now().toString(36), desc, amt:Math.abs(amt), cat:$$("rcCat").value,
           freq:$$("rcFreq").value, kind:$$("rcKind").value, start, end};
  save(rules().concat([r]));
  const res=materialize();
  $$("rcAmt").value=""; $$("rcDesc").value="";
  RAW=Store.txns(); M=RAW.length?build(RAW):null;
  if(M) renderAll();
  if(typeof History!=="undefined") History.refresh();
  const yearly=r.freq==="monthly"?Math.abs(amt)*12:r.freq==="weekly"?Math.abs(amt)*52:Math.abs(amt);
  m.innerHTML=`<div class="insight" role="status">Rule saved — <b>${res.added}</b> past occurrence${res.added===1?"":"s"} written into the record.
    <span class="act">${r.kind==="in"?"Counted as income":"This commits"} <b>${money(yearly)}</b> a year${r.end?" until it ends":" until you end it"} — ${r.kind==="in"?"the keep-rate is measured against it":"decide now whether it earns its place"}.</span></div>`;
  renderList();
 }
 return {init, materialize, rules};
})();
