"use strict";
/* =============== LOCAL STORE — transactions + meta, private to this device =============== */
const Store = (() => {
 const K_TX="kept_tx", K_META="kept_meta";
 function hash(r){ // stable id: date|amount|desc
  const s=r[0]+"|"+r[2]+"|"+String(r[1]).slice(0,60);
  let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0;
  return "t"+(h>>>0).toString(36);
 }
 function load(){ try{ return JSON.parse(localStorage.getItem(K_TX)||"[]"); }catch(e){ return []; } }
 function save(rows){ try{ localStorage.setItem(K_TX,JSON.stringify(rows)); }catch(e){ alert("Local storage is full or blocked — data not saved."); } }
 function txns(){ return load().map(r=>r.slice(0,5)); }
 function merge(newRows){ // dedupe by hash; returns {added, total}
  const cur=load(), seen=new Set(cur.map(r=>r[5]||hash(r)));
  let added=0;
  newRows.forEach(r=>{ const h=hash(r); if(!seen.has(h)){ seen.add(h); cur.push([r[0],r[1],r[2],r[3]||"",r[4]||"",h]); added++; } });
  cur.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  save(cur); return {added, total:cur.length};
 }
 function removeHash(h){ const cur=load().filter(r=>(r[5]||hash(r))!==h); save(cur); }
 function replaceAll(rows){ save(rows.map(r=>[r[0],r[1],r[2],r[3]||"",r[4]||"",hash(r)])); }
 function clear(){ try{ localStorage.removeItem(K_TX); }catch(e){} }
 function meta(k,dflt){ try{ const m=JSON.parse(localStorage.getItem(K_META)||"{}"); return k in m?m[k]:dflt; }catch(e){ return dflt; } }
 function setMeta(k,v){ try{ const m=JSON.parse(localStorage.getItem(K_META)||"{}"); m[k]=v; localStorage.setItem(K_META,JSON.stringify(m)); }catch(e){} }
 function exportJSON(){ return JSON.stringify({tx:load(), meta:JSON.parse(localStorage.getItem(K_META)||"{}")}); }
 return {hash,load,save,txns,merge,removeHash,replaceAll,clear,meta,setMeta,exportJSON};
})();
