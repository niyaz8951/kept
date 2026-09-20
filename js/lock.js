"use strict";
/* =============== APP LOCK — PIN + AES-GCM encryption at rest =============================
   The threat: someone picks up the unlocked phone, or opens the laptop browser, and Kept
   is simply there. A cover screen alone is theatre — the data would still sit readable in
   localStorage. So the PIN derives a key (PBKDF2-SHA256) that encrypts the whole store
   (AES-256-GCM), and while Kept is locked the plaintext is deleted from storage entirely.
   Locked = unreadable, even with developer tools.                                        */
const Lock = (() => {
 const K_VAULT="kept_vault", K_CFG="kept_lockcfg", PLAIN=["kept_tx","kept_meta","kept_budget","kept_recur","kept_tomb"];
 let unlocked=false, idleTimer=null;
 const enc=new TextEncoder(), dec=new TextDecoder();
 function subtle(){ return (window.crypto&&window.crypto.subtle)||null; }
 function cfg(){ try{ return JSON.parse(localStorage.getItem(K_CFG)||"null"); }catch(e){ return null; } }
 function setCfg(c){ try{ localStorage.setItem(K_CFG,JSON.stringify(c)); }catch(e){} }
 function isOn(){ return !!cfg(); }
 function b64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
 function unb64(s){ return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }

 async function keyFrom(pin,saltB64){
  const salt=unb64(saltB64);
  const base=await subtle().importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveKey"]);
  return subtle().deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},
    base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 }
 function snapshot(){ const o={}; PLAIN.forEach(k=>{ const v=localStorage.getItem(k); if(v!=null) o[k]=v; }); return o; }
 function restore(o){ PLAIN.forEach(k=>localStorage.removeItem(k));
  Object.keys(o||{}).forEach(k=>{ try{ localStorage.setItem(k,o[k]); }catch(e){} }); }
 function wipePlain(){ PLAIN.forEach(k=>localStorage.removeItem(k)); }

 async function enable(pin){
  if(!subtle()) return {error:"This browser cannot encrypt (needs a secure https page)."};
  if(!/^\d{4,}$/.test(pin)&&pin.length<4) return {error:"Use at least 4 characters."};
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const c={salt:b64(salt), idle:Number(Store.meta("lockIdle",5)), createdAt:Date.now()};
  setCfg(c);
  const key=await keyFrom(pin,c.salt);
  await sealWith(key);
  unlocked=true;                           // stay usable right after setting it up
  await openWith(key);                     // …by putting the plaintext back for this session
  sessionKey=key;
  return {ok:true};
 }
 let sessionKey=null;
 async function sealWith(key){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=enc.encode(JSON.stringify(snapshot()));
  const ct=await subtle().encrypt({name:"AES-GCM",iv},key,data);
  try{ localStorage.setItem(K_VAULT,JSON.stringify({iv:b64(iv),ct:b64(ct)})); }catch(e){}
  wipePlain();
 }
 async function openWith(key){
  const v=JSON.parse(localStorage.getItem(K_VAULT)||"null"); if(!v) return true;
  const plain=await subtle().decrypt({name:"AES-GCM",iv:unb64(v.iv)},key,unb64(v.ct));
  restore(JSON.parse(dec.decode(plain)));
  return true;
 }
 async function unlock(pin){
  const c=cfg(); if(!c) return {ok:true};
  try{
   const key=await keyFrom(pin,c.salt);
   await openWith(key);                    // throws if the PIN is wrong (GCM auth tag)
   sessionKey=key; unlocked=true;
   return {ok:true};
  }catch(e){ return {error:"Wrong PIN."}; }
 }
 async function lock(){
  if(!isOn()||!sessionKey||!unlocked) { paint(true); return; }
  await sealWith(sessionKey);
  unlocked=false;
  RAW=[]; M=null;                          // nothing left in memory either
  paint(true);
 }
 async function disable(pin){
  const r=await unlock(pin); if(r.error) return r;
  try{ localStorage.removeItem(K_VAULT); localStorage.removeItem(K_CFG); }catch(e){}
  sessionKey=null; unlocked=true;
  return {ok:true};
 }
 function paint(show){
  const el=$$("lockScreen"); if(!el) return;
  el.classList.toggle("on",!!show);
  document.body.classList.toggle("locked",!!show);
  if(show){ const i=$$("lockPin"); if(i){ i.value=""; setTimeout(()=>i.focus(),80); } }
 }
 function resetIdle(){
  clearTimeout(idleTimer);
  const mins=Number(Store.meta("lockIdle",5));
  if(!isOn()||!unlocked||!mins) return;
  idleTimer=setTimeout(()=>lock(), mins*60000);
 }
 async function boot(){
  if(!isOn()){ paint(false); return true; }   // no lock configured — carry on
  wipePlain();                                 // never leave plaintext lying around at launch
  paint(true);
  return false;                                // boot stops here until the PIN is right
 }
 function init(){
  $$("lockGo").addEventListener("click",submit);
  $$("lockPin").addEventListener("keydown",e=>{ if(e.key==="Enter") submit(); });
  ["click","keydown","touchstart","scroll"].forEach(ev=>
   document.addEventListener(ev,resetIdle,{passive:true}));
  document.addEventListener("visibilitychange",()=>{
   if(document.visibilityState==="hidden"){
    document.body.classList.add("blurred");     // hide figures in the app switcher
    if(isOn()&&unlocked&&Store.meta("lockOnLeave",true)) lock();
   } else document.body.classList.remove("blurred");
  });
  resetIdle();
 }
 async function submit(){
  const pin=$$("lockPin").value, m=$$("lockMsg");
  m.textContent="Checking…";
  const r=await unlock(pin);
  if(r.error){ m.textContent=r.error; return; }
  m.textContent="";
  paint(false);
  if(typeof startApp==="function") startApp();     // same path as a normal launch
  resetIdle();
 }
 return {isOn, enable, disable, unlock, lock, boot, init, paint, resetIdle,
         status:()=>({on:isOn(), unlocked})};
})();
