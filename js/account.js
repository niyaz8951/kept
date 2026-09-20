"use strict";
/* =============== ACCOUNT — profile, settings, data, security, danger zone =============== */
const Account = (() => {
 function monthLabel(iso){ const d=new Date(iso+"T00:00:00");
  return d.toLocaleDateString("en-GB",{month:"short"})+"-"+String(d.getFullYear()).slice(2); }
 function toAOA(rows){
  return [["Month","Date","Expense","Amount","Category","Remarks"]]
   .concat(rows.map(r=>[monthLabel(r[0]), r[0], r[1], r[2], r[3]||"", r[4]||""]));
 }
 function download(aoa,name){
  const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=[{wch:8},{wch:12},{wch:34},{wch:10},{wch:12},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws,"Expense History");
  XLSX.writeFile(wb,name);
 }
 function exportAll(){
  const rows=Store.load();
  if(!rows.length){ alert("Nothing to export yet."); return; }
  download(toAOA(rows),"Kept_Export_"+new Date().toISOString().slice(0,10)+".xlsx");
 }
 function sample(){
  const y=new Date().getFullYear(), m=String(new Date().getMonth()+1).padStart(2,"0");
  const mm=d=>`${y}-${m}-${String(d).padStart(2,"0")}`;
  download(toAOA([
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
   [mm(11),"PETROL — CITY FUEL",-170,"Car",""],
   [mm(12),"FAMILY DINNER — AL NOOR RESTAURANT",-180,"Food","weekend"],
   [mm(14),"INDEX FUND SIP",-500,"Investment","monthly"],
   [mm(18),"CINEMA TICKETS",-90,"Entertainment",""],
   [mm(21),"CITY HYPERMARKET",-380,"Grocery",""],
   [mm(25),"MOBILE PLAN",-99,"Utilities",""],
  ]),"Kept_Sample.xlsx");
 }
 function signedUser(){ return (typeof Sync!=="undefined"&&Sync.user)?Sync.user():null; }
 function render(){
  const u=signedUser(), rows=Store.load(), enabled=(typeof Sync!=="undefined"&&Sync.enabled&&Sync.enabled());
  const first=rows.length?rows[0][0]:null, last=rows.length?rows[rows.length-1][0]:null;
  $$("avInit").textContent=u?(u.email||"?")[0].toUpperCase():"?";

  $$("acProfile").innerHTML = u
   ? `<div class="acli"><span>Signed in as</span><b>${esc(u.email||"")}</b></div>
      <div class="acli"><span>Sync</span><b style="color:${Sync.lastErrText&&Sync.lastErrText()?"var(--coral)":"var(--leaf)"}" id="acSyncState">${esc(Sync.lastSync()||"active")}</b></div>
      <div class="acli"><span>Transactions stored</span><b>${rows.length}</b></div>
      ${first?`<div class="acli"><span>Record covers</span><b>${monthLabel(first)} → ${monthLabel(last)}</b></div>`:""}
      <button class="bigbtn ghost" id="acSyncNow" style="margin-top:10px">Sync now</button>
      <button class="bigbtn ghost" id="acFixDupes" style="margin-top:8px">Repair duplicates &amp; re-sync</button>`
   : `<div class="sub">You are in <b>local mode</b> — data lives only in this browser and is lost if you clear site data.</div>
      ${enabled?`<button class="bigbtn" id="acSignin" style="margin-top:10px">Sign in / create account</button>`
               :`<div class="sub" style="margin-top:8px">Cloud backup is not configured in this deployment (see README → Supabase).</div>`}
      <div class="acli" style="margin-top:10px"><span>Transactions stored</span><b>${rows.length}</b></div>`;

  $$("acSettings").innerHTML =
   `<div class="acli"><span>Currency</span><select class="inp" id="acCur">
      ${["AED","SAR","INR","USD"].map(c=>`<option value="${c}" ${c===CUR?"selected":""}>${c}</option>`).join("")}</select></div>
    <div class="acli"><span>Appearance</span><select class="inp" id="acTheme">
      <option value="light">Light</option><option value="dark">Dark</option></select></div>
    <div class="acli"><span>Target keep-rate</span><input class="inp" id="acTarget" type="number" min="5" max="60" value="${Life.prof().targetRate}" style="width:90px"></div>
    <div class="acli"><span>Ramp to target (months)</span><input class="inp" id="acRamp" type="number" min="1" max="36" value="${Life.prof().rampMonths}" style="width:90px"></div>
    <div class="sub" style="margin-top:8px">The path banner scores every month against this ramp.</div>`;
  $$("acTheme").value=document.documentElement.dataset.theme||"light";

  $$("acData").innerHTML =
   `<label class="bigbtn ghost filebtn" style="display:block;text-align:center;margin-bottom:8px">⬆ Upload expense Excel (restarts record)
     <input type="file" id="acFile" accept=".xlsx,.xls,.csv"></label>
    <button class="bigbtn ghost" id="acExport" style="margin-bottom:8px">⬇ Export everything (Excel, upload format)</button>
    <button class="bigbtn ghost" id="acSample">📄 Download sample Excel (format guide)</button>
    <div class="sub" style="margin-top:8px">Export is your backup and is re-uploadable. Daily entries are included, so the export is always the complete record.</div>`;

  const lockOn=Lock.isOn();
  const lockUI=`<div style="border-top:1px solid var(--line);margin:14px 0 0;padding-top:14px">
     <b style="font-size:14px">App lock</b>
     <div class="sub" style="margin:4px 0 8px">${lockOn
       ? "On. Kept asks for your PIN at launch, after inactivity and when you leave the app — and while locked your transactions are encrypted on this device, so they cannot be read even from browser storage."
       : "Off. Anyone who picks up this device can open Kept and read everything. A PIN encrypts your transactions on this device and asks for it at launch."}</div>
     ${lockOn ? `
      <div class="acli"><span>Auto-lock after</span><select class="inp" id="acLockIdle" style="max-width:130px">
        ${[1,2,5,10,30,0].map(m=>`<option value="${m}" ${Number(Store.meta("lockIdle",5))===m?"selected":""}>${m?m+" min":"never"}</option>`).join("")}</select></div>
      <div class="acli"><span>Lock when I leave the app</span><input type="checkbox" id="acLockLeave" ${Store.meta("lockOnLeave",true)?"checked":""} style="width:22px;height:22px"></div>
      <button class="bigbtn" id="acLockNow" style="margin-top:8px">Lock now</button>
      <input class="inp" id="acPinOff" type="password" inputmode="numeric" placeholder="PIN, to turn the lock off" style="width:100%;margin:10px 0 8px">
      <button class="bigbtn ghost" id="acLockOff">Turn app lock off</button>`
      : `
      <input class="inp" id="acPin1" type="password" inputmode="numeric" placeholder="new PIN (4+ digits)" style="width:100%;margin:0 0 8px">
      <input class="inp" id="acPin2" type="password" inputmode="numeric" placeholder="repeat PIN" style="width:100%;margin:0 0 8px">
      <button class="bigbtn" id="acLockOn">Turn app lock on</button>`}
     <div class="authmsg" id="acLockMsg"></div></div>`;
  $$("acSecurity").innerHTML = (u
   ? `<b style="font-size:14px">Change password</b>
      <input class="inp" id="acPw1" type="password" autocomplete="new-password" placeholder="new password (min 8)" style="width:100%;margin:8px 0">
      <input class="inp" id="acPw2" type="password" autocomplete="new-password" placeholder="repeat new password" style="width:100%;margin:0 0 8px">
      <div class="authmsg" id="acMsg"></div>
      <button class="bigbtn" id="acPwGo">Update password</button>
      <button class="bigbtn ghost" id="acSignout" style="margin-top:8px">Sign out</button>`
   : `<div class="sub">Sign in to set a password, back up your record and use Kept on more than one device. Your rows are private to your login (row-level security) — nobody else, including the site owner, can read them.</div>`) + lockUI;

  $$("acDanger").innerHTML =
   `<div class="sub" style="margin-bottom:8px">Reset erases every transaction, budget, profile value and the path baseline${u?" — on this device and in your cloud copy":""}. Export first; this cannot be undone.</div>
    <button class="bigbtn ghost" id="acReset" style="color:var(--coral);border-color:var(--coral)">Reset everything</button>`;

  // wiring
  $$("acExport").addEventListener("click",exportAll);
  $$("acSample").addEventListener("click",sample);
  $$("acReset").addEventListener("click",resetAll);
  $$("acFile").addEventListener("change",e=>handleUpload(e));
  $$("acCur").addEventListener("change",e=>{ CUR=e.target.value; Store.setMeta("cur",CUR); renderAll(); });
  $$("acTheme").addEventListener("change",e=>{ setTheme(e.target.value); });
  $$("acTarget").addEventListener("change",e=>{ const p=Life.prof(); p.targetRate=+e.target.value||20; Store.setMeta("profile",p); renderAll(); });
  $$("acRamp").addEventListener("change",e=>{ const p=Life.prof(); p.rampMonths=+e.target.value||6; Store.setMeta("profile",p); renderAll(); });
  if(u){
   $$("acPwGo").addEventListener("click",changePw);
   $$("acSignout").addEventListener("click",()=>Sync.signOutAsk());
   $$("acSyncNow").addEventListener("click",async()=>{ $$("acSyncState").textContent="syncing…"; await Sync.pull(); await Sync.push(); render(); });
   $$("acFixDupes").addEventListener("click",async()=>{
    const n=Store.dedupe();
    RAW=Store.txns(); M=RAW.length?build(RAW):null;
    $$("acSyncState").textContent="repairing…";
    await Sync.deleteCloud(); await Sync.push();
    if(M) renderAll();
    if(typeof History!=="undefined") History.refresh();
    render();
    alert(n? n+" duplicate row"+(n===1?"":"s")+" collapsed, and the cloud copy was rewritten from this device."
           : "No duplicates found. The cloud copy was rewritten from this device.");
   });
  } else if($$("acSignin")) $$("acSignin").addEventListener("click",()=>Sync.openSheet());
  wireLock();
 }
 function wireLock(){
  const m=$$("acLockMsg"), say=(t,cls)=>{ m.textContent=t; m.className="authmsg "+(cls||""); };
  if($$("acLockOn")) $$("acLockOn").addEventListener("click",async()=>{
   const p1=$$("acPin1").value, p2=$$("acPin2").value;
   if(p1.length<4) return say("Use at least 4 digits.","err");
   if(p1!==p2) return say("The two PINs do not match.","err");
   say("Encrypting…");
   const r=await Lock.enable(p1);
   if(r.error) return say(r.error,"err");
   say("App lock is on.","ok"); render();
  });
  if($$("acLockOff")) $$("acLockOff").addEventListener("click",async()=>{
   say("Checking…");
   const r=await Lock.disable($$("acPinOff").value);
   if(r.error) return say(r.error,"err");
   say("App lock is off.","ok"); render();
  });
  if($$("acLockNow")) $$("acLockNow").addEventListener("click",()=>Lock.lock());
  if($$("acLockIdle")) $$("acLockIdle").addEventListener("change",e=>{ Store.setMeta("lockIdle",+e.target.value); Lock.resetIdle(); });
  if($$("acLockLeave")) $$("acLockLeave").addEventListener("change",e=>Store.setMeta("lockOnLeave",e.target.checked));
 }
 async function changePw(){
  const p1=$$("acPw1").value,p2=$$("acPw2").value,m=$$("acMsg"); m.className="authmsg";
  if(p1.length<8){ m.textContent="At least 8 characters."; m.classList.add("err"); return; }
  if(p1!==p2){ m.textContent="The two passwords do not match."; m.classList.add("err"); return; }
  m.textContent="Updating…";
  const r=await Sync.updatePassword(p1);
  if(r&&r.error){ m.textContent=r.error.message; m.classList.add("err"); }
  else { m.textContent="Password updated."; m.classList.add("ok"); $$("acPw1").value=""; $$("acPw2").value=""; }
 }
 async function resetAll(){
  const u=signedUser();
  if(!confirm("Reset EVERYTHING? All transactions, budgets, profile and the path baseline will be deleted"+(u?" here AND in your cloud copy":"")+".")) return;
  if(!confirm("Last check — have you exported? This cannot be undone.")) return;
  if(u) await Sync.deleteCloud();
  try{ ["kept_tx","kept_meta","kept_budget","kept_tomb","kept_recur"].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  location.reload();
 }
 return {render, sample, exportAll, toAOA};
})();
