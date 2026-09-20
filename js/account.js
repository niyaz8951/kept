"use strict";
/* =============== ACCOUNT — settings, password, export, reset, sample file =============== */
const Account = (() => {
 function monthLabel(iso){ const d=new Date(iso+"T00:00:00");
  return d.toLocaleDateString("en-GB",{month:"short"})+"-"+String(d.getFullYear()).slice(2); }
 function toAOA(rows){ // exact upload format
  return [["Month","Date","Expense","Amount","Category","Remarks"]]
   .concat(rows.map(r=>[monthLabel(r[0]), r[0], r[1], r[2], r[3]||"", r[4]||""]));
 }
 function download(aoa, name){
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=[{wch:8},{wch:12},{wch:34},{wch:10},{wch:12},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws, "Expense History");
  XLSX.writeFile(wb, name);
 }
 function exportAll(){
  const rows=Store.load();
  if(!rows.length){ alert("Nothing to export yet."); return; }
  download(toAOA(rows), "Kept_Export_"+new Date().toISOString().slice(0,10)+".xlsx");
 }
 function sample(){ // fictional data only — never the user's
  const y=new Date().getFullYear(), m=String(new Date().getMonth()+1).padStart(2,"0");
  const mm=d=>`${y}-${m}-${String(d).padStart(2,"0")}`;
  const rows=[
   [mm(1),"SALARY — ACME ENGINEERING",9500,"Income",""],
   [mm(2),"CASHBACK REWARD",45,"Income","refund"],
   [mm(3),"GREENVIEW RESIDENCES RENT",-3000,"Rent",""],
   [mm(4),"HOME LOAN EMI",-850,"Loan","emi 7/48"],
   [mm(5),"CITY HYPERMARKET",-420,"Grocery","weekly shop"],
   [mm(6),"METRO CARD TOP-UP",-100,"Transport",""],
   [mm(7),"SUNRISE CAFETERIA",-14,"Food","tea"],
   [mm(8),"NOON ORDER — HEADPHONES",-260,"Shopping",""],
   [mm(9),"ELECTRICITY & WATER",-310,"Utilities",""],
   [mm(10),"PHARMACY PLUS",-65,"Medicine",""],
   [mm(12),"FAMILY DINNER — AL NOOR RESTAURANT",-180,"Food","weekend"],
   [mm(14),"INDEX FUND SIP",-500,"Investment","monthly"],
   [mm(15),"CAR FUEL",-160,"Car",""],
   [mm(18),"CINEMA TICKETS",-90,"Entertainment",""],
   [mm(21),"CITY HYPERMARKET",-380,"Grocery",""],
   [mm(25),"MOBILE PLAN",-99,"Utilities",""],
  ];
  download(toAOA(rows), "Kept_Sample.xlsx");
 }
 function open(){
  const signed = (typeof Sync!=="undefined") && Sync.user && Sync.user();
  $$("acctBody").innerHTML =
   (signed? `<div class="sub" style="margin-bottom:10px">Signed in as <b>${esc(signed.email||"")}</b> — every entry and setting is saved to your private Supabase rows.</div>`
          : `<div class="sub" style="margin-bottom:10px">Local mode — data lives only in this browser. ${ (typeof Sync!=="undefined"&&Sync.enabled&&Sync.enabled())?'Sign in from the header badge to back it up.':'Configure Supabase (see README) to enable login + backup.'}</div>`)
   +`<button class="bigbtn ghost" id="acExport" style="margin-bottom:8px">⬇ Export all data (Excel, upload format)</button>
     <button class="bigbtn ghost" id="acSample" style="margin-bottom:8px">📄 Download sample Excel (format guide)</button>`
   +(signed? `<div style="border-top:1px solid var(--line);margin:12px 0;padding-top:12px"><b style="font-size:14px">Change password</b>
      <div class="pwrow"><input class="inp" id="acPw1" type="password" autocomplete="new-password" placeholder="new password (min 8)" style="width:100%;margin:8px 0"></div>
      <input class="inp" id="acPw2" type="password" autocomplete="new-password" placeholder="repeat new password" style="width:100%;margin:0 0 8px">
      <div class="authmsg" id="acMsg"></div>
      <button class="bigbtn" id="acPwGo">Update password</button></div>`
    : ``)
   +`<div style="border-top:1px solid var(--line);margin:12px 0;padding-top:12px"><b style="font-size:14px;color:var(--coral)">Danger zone</b>
     <div class="sub" style="margin:6px 0">Reset wipes every transaction, budget, profile and path baseline${signed?" — locally and in your cloud copy":""}. Export first.</div>
     <button class="bigbtn ghost" id="acReset" style="color:var(--coral);border-color:var(--coral)">Reset everything</button></div>`
   +(signed? `<button class="bigbtn ghost" id="acSignout" style="margin-top:8px">Sign out</button>`:``);
  $$("acExport").addEventListener("click",exportAll);
  $$("acSample").addEventListener("click",sample);
  if(signed){
   $$("acPwGo").addEventListener("click",changePw);
   $$("acSignout").addEventListener("click",()=>Sync.signOutAsk());
  }
  $$("acReset").addEventListener("click",resetAll);
  $$("acctSheet").classList.add("on");
 }
 async function changePw(){
  const p1=$$("acPw1").value, p2=$$("acPw2").value, m=$$("acMsg");
  m.className="authmsg";
  if(p1.length<8){ m.textContent="New password must be at least 8 characters."; m.classList.add("err"); return; }
  if(p1!==p2){ m.textContent="The two passwords do not match."; m.classList.add("err"); return; }
  m.textContent="Updating…";
  const r=await Sync.updatePassword(p1);
  if(r&&r.error){ m.textContent=r.error.message; m.classList.add("err"); }
  else { m.textContent="Password updated."; m.classList.add("ok"); $$("acPw1").value=""; $$("acPw2").value=""; }
 }
 async function resetAll(){
  if(!confirm("Reset EVERYTHING? All transactions, budgets, profile and the path baseline will be deleted"+((typeof Sync!=="undefined"&&Sync.user&&Sync.user())?" here AND in your cloud copy":"")+".")) return;
  if(!confirm("Last check — have you exported? This cannot be undone.")) return;
  if(typeof Sync!=="undefined"&&Sync.user&&Sync.user()) await Sync.deleteCloud();
  try{ localStorage.removeItem("kept_tx"); localStorage.removeItem("kept_meta"); localStorage.removeItem("kept_budget"); }catch(e){}
  location.reload();
 }
 return {open, sample, exportAll, toAOA};
})();
