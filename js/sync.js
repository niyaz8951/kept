"use strict";
/* =============== OPTIONAL CLOUD SYNC — Supabase (free tier): login + private table =============== */
/* Works only if config.js provides window.APP_CONFIG={SUPABASE_URL,SUPABASE_ANON_KEY}. Without it the
   app runs fully local. Data is protected by Supabase Row Level Security: each user sees only their rows. */
const Sync = (() => {
 let sb=null, user=null, timer=null;
 function enabled(){ return !!(window.APP_CONFIG&&APP_CONFIG.SUPABASE_URL&&APP_CONFIG.SUPABASE_ANON_KEY); }
 async function init(){
  const badge=$$("syncBadge");
  if(!enabled()){ badge.textContent="Local only"; badge.title="Add Supabase keys in config.js to enable login + sync"; 
   badge.addEventListener("click",()=>alert("Cloud sync is off. This app is running fully on this device.\n\nTo enable free login + backup: create a Supabase project, run supabase/schema.sql, and put the URL and anon key into config.js (see README).")); return; }
  await new Promise((res,rej)=>{ const s=document.createElement("script");
   s.src="vendor/supabase.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); }).catch(()=>null);
  if(!window.supabase){ badge.textContent="Sync unavailable"; return; }
  sb=window.supabase.createClient(APP_CONFIG.SUPABASE_URL,APP_CONFIG.SUPABASE_ANON_KEY);
  const {data}=await sb.auth.getSession(); user=data.session?.user||null;
  badge.classList.toggle("on",!!user);
  badge.textContent=user?"Synced · "+ (user.email||"").split("@")[0] : "Sign in";
  badge.addEventListener("click",()=>{ user? signOutAsk() : $$("authSheet").classList.add("on"); });
  $$("authGo").addEventListener("click",authGo);
  $$("authClose").addEventListener("click",()=>$$("authSheet").classList.remove("on"));
  if(user) await pull();
 }
 async function authGo(){
  const email=$$("authEmail").value.trim(), pass=$$("authPass").value;
  if(!email||pass.length<6){ $$("authMsg").textContent="Email + password (min 6 chars)."; return; }
  $$("authMsg").textContent="…";
  let r=await sb.auth.signInWithPassword({email,password:pass});
  if(r.error){ r=await sb.auth.signUp({email,password:pass});
   if(r.error){ $$("authMsg").textContent=r.error.message; return; } }
  user=r.data.user||r.data.session?.user;
  $$("authSheet").classList.remove("on");
  $$("syncBadge").classList.add("on"); $$("syncBadge").textContent="Synced · "+email.split("@")[0];
  await pull(); await push();
 }
 function signOutAsk(){ if(confirm("Sign out? Data stays on this device.")) sb.auth.signOut().then(()=>location.reload()); }
 async function push(){
  if(!sb||!user) return;
  const rows=Store.load().map(r=>({user_id:user.id, hash:r[5]||Store.hash(r), d:r[0], descr:r[1], amount:r[2], cat:r[3]||"", remark:r[4]||""}));
  for(let i=0;i<rows.length;i+=500){
   const {error}=await sb.from("transactions").upsert(rows.slice(i,i+500),{onConflict:"user_id,hash"});
   if(error){ console.warn("push",error.message); break; }
  }
  await sb.from("meta").upsert({user_id:user.id, k:"meta", v:JSON.parse(localStorage.getItem("mw_meta")||"{}")},{onConflict:"user_id,k"});
 }
 async function pull(){
  if(!sb||!user) return;
  const {data,error}=await sb.from("transactions").select("d,descr,amount,cat,remark").eq("user_id",user.id).limit(50000);
  if(error||!data) return;
  const res=Store.merge(data.map(r=>[r.d,r.descr,r.amount,r.cat,r.remark]));
  const m=await sb.from("meta").select("v").eq("user_id",user.id).eq("k","meta").maybeSingle();
  if(m.data&&m.data.v){ try{ const cur=JSON.parse(localStorage.getItem("mw_meta")||"{}");
   localStorage.setItem("mw_meta",JSON.stringify(Object.assign(m.data.v,cur))); }catch(e){} }
  if(res.added){ RAW=Store.txns(); M=RAW.length?build(RAW):null; if(M) renderAll(); }
 }
 function queuePush(){ if(!sb||!user) return; clearTimeout(timer); timer=setTimeout(push,4000); }
 return {init,queuePush,push,pull,enabled};
})();
