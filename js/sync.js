"use strict";
/* =============== OPTIONAL CLOUD SYNC — Supabase (free tier): login + private table =============== */
/* Runs only if config.js provides window.APP_CONFIG={SUPABASE_URL,SUPABASE_ANON_KEY}. Without it the
   app is fully local. Row Level Security keeps every user's rows private to their login. */
const Sync = (() => {
 let sb=null, user=null, timer=null, mode="signin", busy=false, lastSyncAt=null, lastErr=null;

 function rawCfg(){ return window.APP_CONFIG||{}; }
 /* Normalize + validate the project URL — the #1 setup mistake is pasting the dashboard URL
    or a URL with an extra path, which Supabase answers with "Invalid path specified in request URL". */
 function cleanURL(){
  let u=(rawCfg().SUPABASE_URL||"").trim();
  if(!u) return {err:"SUPABASE_URL is empty in config.js."};
  if(!/^https?:\/\//i.test(u)) u="https://"+u;
  try{
   const p=new URL(u);
   if(/supabase\.com$/i.test(p.hostname)){
    const m=p.pathname.match(/project\/([a-z0-9]{15,})/i);
    if(m) return {url:"https://"+m[1]+".supabase.co",
     warn:"config.js had the dashboard URL — using https://"+m[1]+".supabase.co instead. Please fix config.js."};
    return {err:"That is the Supabase dashboard URL. Use the Project URL from Settings → API (looks like https://xxxx.supabase.co)."};
   }
   if(p.pathname!=="/"&&p.pathname!=="") return {url:p.origin, warn:"Removed the extra path from SUPABASE_URL — it must be just "+p.origin+"."};
   return {url:p.origin};
  }catch(e){ return {err:"SUPABASE_URL in config.js is not a valid URL."}; }
 }
 function enabled(){ return !!(rawCfg().SUPABASE_URL&&rawCfg().SUPABASE_ANON_KEY); }
 function msg(t,cls){ const m=$$("authMsg"); if(!m) return; m.textContent=t||""; m.className="authmsg "+(cls||""); }
 function status(t){ lastErr=t||null; if(typeof Account!=="undefined"&&Account.render&&document.getElementById("acProfile")) try{ Account.render(); }catch(e){} }

 async function init(){
  /* The header badge no longer exists (account lives in its own section), so init must
     never touch it — and it must never throw: a crash here kills the rest of boot. */
  if(!enabled()){ status("Cloud backup not configured"); return; }
  const cu=cleanURL();
  if(cu.err){ status("Sync misconfigured: "+cu.err); return; }
  if(!window.supabase){ await new Promise(res=>{ const s=document.createElement("script");
   s.src="vendor/supabase.js"; s.onload=res; s.onerror=res; document.head.appendChild(s);
   setTimeout(res,4000); }); }
  if(!window.supabase){ status("Sync library unavailable offline"); return; }
  sb=window.supabase.createClient(cu.url,(rawCfg().SUPABASE_ANON_KEY||"").trim());
  const {data}=await sb.auth.getSession(); user=data.session?.user||null;
  paintBadge();
  
  // form wiring
  if(!$$("atSignin")) return;   // auth sheet absent — nothing to wire
  $$("atSignin").addEventListener("click",()=>setMode("signin"));
  $$("atSignup").addEventListener("click",()=>setMode("signup"));
  $$("authEye").addEventListener("click",()=>{ const p=$$("authPass");
   const show=p.type==="password"; p.type=show?"text":"password"; $$("authPass2").type=p.type; $$("authEye").textContent=show?"hide":"show"; });
  $$("authForgot").addEventListener("click",forgot);
  $$("authGo").addEventListener("click",authGo);
  $$("authClose").addEventListener("click",()=>$$("authSheet").classList.remove("on"));
  ["authEmail","authPass","authPass2"].forEach(id=>$$(id).addEventListener("keydown",e=>{ if(e.key==="Enter") authGo(); }));
  if(cu.warn) console.warn(cu.warn);
  if(user) await pull();
 }
 function paintBadge(){ const a=$$("avInit"); if(a) a.textContent=user?(user.email||"?")[0].toUpperCase():"?";
  if(typeof Account!=="undefined"&&document.getElementById("acProfile")&&document.getElementById("acProfile").innerHTML) Account.render(); }
 function openSheet(){ setMode("signin"); msg(""); $$("authSheet").classList.add("on"); setTimeout(()=>$$("authEmail").focus(),50); }
 function setMode(m){ mode=m;
  $$("atSignin").classList.toggle("on",m==="signin");
  $$("atSignup").classList.toggle("on",m==="signup");
  $$("authPass2Row").style.display=m==="signup"?"":"none";
  $$("authForgot").style.display=m==="signin"?"":"none";
  $$("authPass").autocomplete=m==="signup"?"new-password":"current-password";
  $$("authGo").textContent=m==="signup"?"Create account":"Sign in";
  msg("");
 }
 function validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
 function friendly(e){
  const t=(e&&e.message)||String(e);
  if(/Invalid login credentials/i.test(t)) return "Wrong email or password. If you are new here, switch to Create account.";
  if(/Email not confirmed/i.test(t)) return "Email not confirmed yet — open the confirmation link Supabase sent you, then sign in.";
  if(/already registered/i.test(t)) return "This email already has an account — use Sign in (or Forgot password).";
  if(/rate limit/i.test(t)) return "Too many attempts — wait a minute and try again.";
  if(/Invalid path|Failed to fetch|NetworkError/i.test(t)) return "Could not reach your Supabase project — check SUPABASE_URL in config.js (it must look like https://xxxx.supabase.co).";
  return t;
 }
 async function authGo(){
  if(busy||!sb) return;
  const email=$$("authEmail").value.trim(), pass=$$("authPass").value;
  if(!validEmail(email)){ msg("Enter a valid email address.","err"); return; }
  if(pass.length<8){ msg("Password must be at least 8 characters.","err"); return; }
  if(mode==="signup" && pass!==$$("authPass2").value){ msg("The two passwords do not match.","err"); return; }
  busy=true; $$("authGo").disabled=true; msg(mode==="signup"?"Creating your account…":"Signing in…");
  try{
   if(mode==="signin"){
    const r=await sb.auth.signInWithPassword({email,password:pass});
    if(r.error) throw r.error;
    user=r.data.user;
   } else {
    const r=await sb.auth.signUp({email,password:pass});
    if(r.error) throw r.error;
    if(!r.data.session){ // email confirmation required by Supabase defaults
     setMode("signin");
     msg("Account created. Check your inbox and open the confirmation link, then come back and sign in.","ok");
     return;
    }
    user=r.data.user||r.data.session.user;
   }
   msg("Signed in.","ok");
   $$("authSheet").classList.remove("on");
   paintBadge();
   await pull(); await push();
   if(typeof Account!=="undefined") Account.render();
   if(typeof History!=="undefined"&&document.getElementById("hxList")) History.refresh();
  }catch(e){ msg(friendly(e),"err"); }
  finally{ busy=false; $$("authGo").disabled=false; }
 }
 async function forgot(){
  const email=$$("authEmail").value.trim();
  if(!validEmail(email)){ msg("Type your email above first, then tap Forgot password.","err"); return; }
  try{ const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
   if(r.error) throw r.error;
   msg("Password-reset email sent — follow the link, set a new password, then sign in.","ok");
  }catch(e){ msg(friendly(e),"err"); }
 }
 function signOutAsk(){ if(confirm("Sign out? Data stays on this device.")) sb.auth.signOut().then(()=>location.reload()); }
 async function updatePassword(pw){ if(!sb||!user) return {error:{message:"Not signed in."}};
  try{ const r=await sb.auth.updateUser({password:pw}); return r; }catch(e){ return {error:{message:String(e.message||e)}}; } }
 async function deleteRow(hash){ if(!sb||!user) return;
  await sb.from("transactions").delete().eq("user_id",user.id).eq("hash",hash); }
 function lastSync(){ if(lastErr) return "error: "+lastErr;
  return lastSyncAt? "synced "+lastSyncAt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "connected"; }
 async function deleteCloud(){ if(!sb||!user) return;
  await sb.from("transactions").delete().eq("user_id",user.id);
  await sb.from("meta").delete().eq("user_id",user.id); }
 async function replaceCloud(){ if(!sb||!user) return; await deleteCloud(); await push(); }
 async function push(){
  if(!sb||!user) return;
  const rows=Store.load().map(r=>({user_id:user.id, hash:r[5]||Store.hash(r), d:r[0], descr:r[1], amount:r[2], cat:r[3]||"", remark:r[4]||""}));
  for(let i=0;i<rows.length;i+=500){
   const {error}=await sb.from("transactions").upsert(rows.slice(i,i+500),{onConflict:"user_id,hash"});
   if(error){ lastErr=error.message; console.warn("push",error.message); return; }
  }
  const dead=Store.tombs();
  for(let i=0;i<dead.length;i+=200){
   await sb.from("transactions").delete().eq("user_id",user.id).in("hash",dead.slice(i,i+200));
  }
  lastErr=null; lastSyncAt=new Date();
  await sb.from("meta").upsert([
   {user_id:user.id, k:"meta",   v:JSON.parse(localStorage.getItem("kept_meta")||"{}")},
   {user_id:user.id, k:"budget", v:JSON.parse(localStorage.getItem("kept_budget")||"{}")}
  ],{onConflict:"user_id,k"});
 }
 async function pull(){
  if(!sb||!user) return;
  const {data,error}=await sb.from("transactions").select("d,descr,amount,cat,remark").eq("user_id",user.id).limit(50000);
  if(error){ lastErr=error.message; return; }
  if(!data) return;
  /* Never let the cloud erase local work: an empty cloud is SEEDED from this device,
     a populated cloud is MERGED in (duplicates collapse on the row hash). */
  if(!data.length){ if(Store.load().length){ await push(); lastSyncAt=new Date(); } return; }
  const res=Store.merge(data.map(r=>[r.d,r.descr,r.amount,r.cat,r.remark]));
  lastSyncAt=new Date();
  const mm=await sb.from("meta").select("k,v").eq("user_id",user.id);
  (mm.data||[]).forEach(row=>{ const key=row.k==="budget"?"kept_budget":"kept_meta";
   try{ const cur=JSON.parse(localStorage.getItem(key)||"{}");
    localStorage.setItem(key,JSON.stringify(Object.assign(row.v||{},cur))); }catch(e){} });
  if(res.added){ RAW=Store.txns(); M=RAW.length?build(RAW):null; if(M) renderAll(); }
 }
 function queuePush(){ if(!sb||!user) return; clearTimeout(timer); timer=setTimeout(()=>{
   if(navigator.onLine===false){ lastErr="offline — will retry"; return; } push(); },4000); }
 window.addEventListener("online",()=>{ if(sb&&user){ lastErr=null; push(); } });
 function openSheetSafe(){ const sh=$$("authSheet"); if(sh) openSheet(); else alert("Sign-in is not available in this deployment."); }
 return {init,queuePush,push,pull,enabled,cleanURL,signOutAsk,updatePassword,deleteCloud,replaceCloud,deleteRow,lastSync,openSheet:openSheetSafe,user:()=>user,status};
})();
