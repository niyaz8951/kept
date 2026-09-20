"use strict";
/* =============== OPTIONAL CLOUD SYNC — Supabase (free tier): login + private table =============== */
/* Runs only if config.js provides window.APP_CONFIG={SUPABASE_URL,SUPABASE_ANON_KEY}. Without it the
   app is fully local. Row Level Security keeps every user's rows private to their login. */
const Sync = (() => {
 let sb=null, user=null, timer=null, mode="signin", busy=false;

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
 function msg(t,cls){ const m=$$("authMsg"); m.textContent=t||""; m.className="authmsg "+(cls||""); }

 async function init(){
  const badge=$$("syncBadge");
  if(!enabled()){ badge.textContent="Local only"; badge.title="Add Supabase keys in config.js to enable login + sync";
   badge.addEventListener("click",()=>alert("Cloud sync is off. Kept is running fully on this device.\n\nTo enable free login + backup: create a Supabase project, run supabase/schema.sql, and put the Project URL and anon key into config.js (see README).")); return; }
  const cu=cleanURL();
  if(cu.err){ badge.textContent="Sync misconfigured"; badge.title=cu.err;
   badge.addEventListener("click",()=>alert("Sync is not usable yet:\n\n"+cu.err)); return; }
  if(!window.supabase){ await new Promise(res=>{ const s=document.createElement("script");
   s.src="vendor/supabase.js"; s.onload=res; s.onerror=res; document.head.appendChild(s);
   setTimeout(res,4000); }); }
  if(!window.supabase){ badge.textContent="Sync unavailable"; return; }
  sb=window.supabase.createClient(cu.url,(rawCfg().SUPABASE_ANON_KEY||"").trim());
  const {data}=await sb.auth.getSession(); user=data.session?.user||null;
  paintBadge();
  badge.addEventListener("click",()=>{ user? signOutAsk() : openSheet(); });
  // form wiring
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
 function paintBadge(){ const b=$$("syncBadge");
  b.classList.toggle("on",!!user);
  b.textContent=user?"Synced · "+(user.email||"").split("@")[0]:"Sign in"; }
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
 async function push(){
  if(!sb||!user) return;
  const rows=Store.load().map(r=>({user_id:user.id, hash:r[5]||Store.hash(r), d:r[0], descr:r[1], amount:r[2], cat:r[3]||"", remark:r[4]||""}));
  for(let i=0;i<rows.length;i+=500){
   const {error}=await sb.from("transactions").upsert(rows.slice(i,i+500),{onConflict:"user_id,hash"});
   if(error){ console.warn("push",error.message); break; }
  }
  await sb.from("meta").upsert({user_id:user.id, k:"meta", v:JSON.parse(localStorage.getItem("kept_meta")||"{}")},{onConflict:"user_id,k"});
 }
 async function pull(){
  if(!sb||!user) return;
  const {data,error}=await sb.from("transactions").select("d,descr,amount,cat,remark").eq("user_id",user.id).limit(50000);
  if(error||!data) return;
  const res=Store.merge(data.map(r=>[r.d,r.descr,r.amount,r.cat,r.remark]));
  const m=await sb.from("meta").select("v").eq("user_id",user.id).eq("k","meta").maybeSingle();
  if(m.data&&m.data.v){ try{ const cur=JSON.parse(localStorage.getItem("kept_meta")||"{}");
   localStorage.setItem("kept_meta",JSON.stringify(Object.assign(m.data.v,cur))); }catch(e){} }
  if(res.added){ RAW=Store.txns(); M=RAW.length?build(RAW):null; if(M) renderAll(); }
 }
 function queuePush(){ if(!sb||!user) return; clearTimeout(timer); timer=setTimeout(push,4000); }
 return {init,queuePush,push,pull,enabled,cleanURL};
})();
