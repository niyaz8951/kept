"use strict";
/* =============== DAILY ENTRY — type it or paste the bank SMS, no waiting for statements =============== */
const QuickAdd = (() => {
 const CATS=["Food","Grocery","Transport","Shopping","Utilities","Car","Medicine","Entertainment","Personal","Rent","Loan","Misc","Income"];
 let cat="Food";
 function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
 /* frequent merchants become one-tap tiles: 2 taps to log a repeat expense */
 function frequent(){
  const rows=Store.load().filter(r=>r[2]<0);
  const map={};
  rows.slice(-400).forEach(r=>{ const k=String(r[1]).trim().slice(0,28).toUpperCase(); if(!k) return;
   (map[k]=map[k]||{n:0,sum:0,cat:r[3]||"Misc",label:String(r[1]).trim().slice(0,28)});
   map[k].n++; map[k].sum+=-r[2]; });
  return Object.values(map).filter(v=>v.n>=3)
   .sort((a,b)=>b.n-a.n).slice(0,6)
   .map(v=>({label:v.label, cat:v.cat, amt:Math.round(v.sum/v.n)}));
 }
 function renderTiles(){
  const f=frequent();
  $$("qaTiles").innerHTML = f.length
   ? `<div class="sub" style="margin-bottom:6px">Tap to log again — amount is your usual, edit it above if different.</div>`
     + f.map((v,i)=>`<button class="tile" data-i="${i}">${Icons.chip(v.label,v.cat,"expense")}
        <span class="tl"><b>${esc(v.label)}</b><i>${money(v.amt)} · ${esc(v.cat)}</i></span></button>`).join("")
   : `<div class="sub">Your regular merchants appear here as one-tap buttons once they repeat.</div>`;
  $$("qaTiles").querySelectorAll(".tile").forEach(b=>b.addEventListener("click",()=>{
   const v=f[+b.dataset.i], amt=parseFloat($$("qaAmt").value)||v.amt;
   const res=Store.merge([[todayISO(), v.label, -Math.abs(amt), v.cat, "quick-tile"]]);
   $$("qaAmt").value="";
   afterWrite(res, `−${fmt0(amt)} ${v.label}`);
  }));
 }
 function init(){
  $$("qaDate").value=todayISO();
  $$("qaCats").innerHTML=CATS.map(c=>`<span class="catchip ${c===cat?"on":""}" data-c="${c}">${c}</span>`).join("");
  $$("qaCats").addEventListener("click",e=>{ const ch=e.target.closest(".catchip"); if(!ch) return;
   cat=ch.dataset.c; $$("qaCats").querySelectorAll(".catchip").forEach(x=>x.classList.toggle("on",x.dataset.c===cat)); });
  $$("qaSave").addEventListener("click",saveManual);
  $$("qaParse").addEventListener("click",parsePaste);
  renderRecent(); renderTiles();
 }
 function saveManual(){
  const amt=parseFloat($$("qaAmt").value), desc=($$("qaDesc").value||"").trim()||cat, date=$$("qaDate").value||todayISO();
  if(!amt||amt<=0){ alert("Enter the amount."); return; }
  const signed = cat==="Income" ? Math.abs(amt) : -Math.abs(amt);
  const res=Store.merge([[date,desc,signed,cat,"quick-add"]]);
  $$("qaAmt").value=""; $$("qaDesc").value="";
  afterWrite(res, `${cat==="Income"?"+":"−"}${Math.abs(amt)} ${desc}`);
 }
 /* bank SMS / notification parser — works on the common Gulf & Indian formats:
    "Purchase of AED 45.60 at CARREFOUR, DUBAI ..." / "AED 120.00 debited ... at NOON" /
    "spent AED 89.5 on card ending 4417 at TALABAT" / "INR 2,500 debited from A/c ... UPI/xyz"  */
 function parseLine(line){
  const cm=line.match(/\b(AED|SAR|INR|USD|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i) || line.match(/([\d,]+(?:\.\d{1,2})?)\s*\b(AED|SAR|INR|USD)\b/i);
  if(!cm) return null;
  const amt=parseFloat((cm[2]||cm[1]).replace(/,/g,"")); if(!amt) return null;
  const credit=/credited|received|refund|reversal|salary/i.test(line);
  let merch=null;
  const at=line.match(/\bat\s+([A-Z0-9][A-Za-z0-9 &.'\-]{2,40})/i); if(at) merch=at[1];
  if(!merch){ const on=line.match(/\b(?:on|to|towards)\s+([A-Z0-9][A-Za-z0-9 &.'\-]{2,40})/i); if(on) merch=on[1]; }
  merch=(merch||"pasted entry").replace(/\s+(?:on|dated|using|via|card|a\/c).*$/i,"").trim();
  const dm=line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  let date=todayISO();
  if(dm){ let[_,d,m,y]=dm; y=y.length===2?"20"+y:y;
   const dd=new Date(+y,+m-1,+d); if(!isNaN(dd)) date=y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
  const cat=credit?"Income":guessCat(merch);
  return [date, merch, credit?amt:-amt, cat, "sms"];
 }
 function guessCat(m){
  m=(m||"").toUpperCase();
  if(/TALABAT|KITCHEN|CAFETERIA|RESTAURANT|CAFE|TEA |COFFEE|MCDONALD|KFC|HARDEE/.test(m)) return "Food";
  if(/CARREFOUR|MART|GROCER|SUPERMARKET|LULU|HYPER|UNION COOP/.test(m)) return "Grocery";
  if(/TAXI|CAREEM|UBER|RTA|METRO|SALIK|PETROL|ADNOC|ENOC|EPPCO/.test(m)) return "Transport";
  if(/NOON|AMAZON|MALL|STORE|SHOP|IKEA|MAX |SPLASH/.test(m)) return "Shopping";
  if(/DEWA|SEWA|ETISALAT|DU |DU,|SMART GOVERNMENT|RECHARGE/.test(m)) return "Utilities";
  if(/PHARMA|CLINIC|HOSPITAL|MEDIC/.test(m)) return "Medicine";
  return "Misc";
 }
 function parsePaste(){
  const lines=($$("qaPaste").value||"").split(/\n+/).map(l=>l.trim()).filter(Boolean);
  const rows=lines.map(parseLine).filter(Boolean);
  if(!rows.length){ alert("Nothing recognizable — paste the bank SMS text, one per line."); return; }
  const res=Store.merge(rows);
  $$("qaPaste").value="";
  afterWrite(res, res.added+" of "+rows.length+" messages parsed");
 }
 function afterWrite(res, label){
  RAW=Store.txns(); M=RAW.length?build(RAW):null;
  renderRecent(); renderTiles(); if(typeof History!=="undefined"&&document.getElementById("hxList")) History.refresh();
  if(typeof renderAll==="function"&&M) renderAll();
  if(typeof Sync!=="undefined") Sync.queuePush();
  $$("qaMsg").innerHTML=`<div class="insight" role="status">${res.added?`Saved: <b>${label}</b>`:`Already recorded (duplicate skipped)`} · ${res.total} transactions on record.<span class="act">${pathLine()}</span></div>`;
 }
 function pathLine(){
  if(!M) return "upload history to activate the path check.";
  const st=Life.pathStatus();
  return st? st.short : "";
 }
 function renderRecent(){
  const rows=Store.load().slice(-8).reverse();
  $$("qaRecent").innerHTML=rows.length? rows.map(r=>
   `<div class="qrow"><span>${esc(r[0].slice(5))} · ${esc(String(r[1]).slice(0,34))} <span style="color:var(--grey)">${esc(r[3]||"")}</span></span>
    <span><span class="amt" style="color:${r[2]>=0?"var(--leaf)":"inherit"}">${r[2]>=0?"+":""}${fmt0(r[2])}</span>
    <a href="#" data-h="${r[5]}" class="qdel" style="color:var(--coral);text-decoration:none;margin-left:8px">✕</a></span></div>`).join("")
   : '<div class="sub">Nothing yet today. Every entry lands in the analysis instantly.</div>';
  $$("qaRecent").querySelectorAll(".qdel").forEach(a=>a.addEventListener("click",e=>{
   e.preventDefault(); Store.removeHash(a.dataset.h);
   RAW=Store.txns(); M=RAW.length?build(RAW):null; renderRecent(); if(M) renderAll();
  }));
 }
 return {init};
})();
