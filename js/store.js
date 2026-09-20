"use strict";
/* =============== LOCAL STORE — transactions + meta, private to this device =============== */
const Store = (() => {
 const K_TX="kept_tx", K_META="kept_meta", K_TOMB="kept_tomb";
 function hash(r){ // stable id: date|amount|desc
  const s=r[0]+"|"+r[2]+"|"+String(r[1]).slice(0,60);
  let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0;
  return "t"+(h>>>0).toString(36);
 }
 function load(){ try{ return JSON.parse(localStorage.getItem(K_TX)||"[]"); }catch(e){ return []; } }
 function save(rows){ try{ localStorage.setItem(K_TX,JSON.stringify(rows)); }catch(e){ alert("Local storage is full or blocked — data not saved."); } }
 function txns(){ return load().map(r=>r.slice(0,5)); }
 /* Same date + amount + description is the SAME transaction: it replaces the stored row,
    it never becomes a second copy. Deleted rows are not resurrected. */
 function merge(newRows){
  const cur=load(), dead=new Set(tombs());
  const idx=new Map(); cur.forEach((r,i)=>idx.set(r[5]||hash(r),i));
  let added=0, updated=0;
  newRows.forEach(r=>{
   const h=hash(r); if(dead.has(h)) return;
   const row=[r[0],r[1],r[2],r[3]||"",r[4]||"",h];
   if(idx.has(h)){ cur[idx.get(h)]=row; updated++; }
   else { idx.set(h,cur.length); cur.push(row); added++; }
  });
  cur.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  save(cur);
  return {added, updated, total:cur.length};
 }
 function tombs(){ try{ return JSON.parse(localStorage.getItem(K_TOMB)||"[]"); }catch(e){ return []; } }
 function tomb(h){ const t=tombs(); if(!t.includes(h)){ t.push(h); try{ localStorage.setItem(K_TOMB,JSON.stringify(t.slice(-5000))); }catch(e){} } }
 function clearTombs(){ try{ localStorage.removeItem(K_TOMB); }catch(e){} }
 function removeHash(h){ const cur=load().filter(r=>(r[5]||hash(r))!==h); save(cur); tomb(h); }
 function replaceAll(rows){
  clearTombs();
  const byHash=new Map();
  rows.forEach(r=>byHash.set(hash(r),[r[0],r[1],r[2],r[3]||"",r[4]||"",hash(r)]));  // last one wins
  const out=[...byHash.values()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  save(out);
  return {kept:out.length, collapsed:rows.length-out.length};
 }
 /* one-off repair for stores written before duplicates were collapsed */
 function dedupe(){
  const cur=load(), byHash=new Map();
  cur.forEach(r=>byHash.set(r[5]||hash(r),r));
  const out=[...byHash.values()];
  if(out.length!==cur.length) save(out.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0));
  return cur.length-out.length;
 }
 function clear(){ try{ localStorage.removeItem(K_TX); }catch(e){} }
 function meta(k,dflt){ try{ const m=JSON.parse(localStorage.getItem(K_META)||"{}"); return k in m?m[k]:dflt; }catch(e){ return dflt; } }
 function setMeta(k,v){ try{ const m=JSON.parse(localStorage.getItem(K_META)||"{}"); m[k]=v; localStorage.setItem(K_META,JSON.stringify(m)); }catch(e){}
  if(typeof Sync!=="undefined"&&Sync.queuePush) Sync.queuePush(); }
 function exportJSON(){ return JSON.stringify({tx:load(), meta:JSON.parse(localStorage.getItem(K_META)||"{}")}); }
 return {hash,load,save,txns,merge,removeHash,replaceAll,dedupe,clear,meta,setMeta,exportJSON,tombs,clearTombs};
})();
