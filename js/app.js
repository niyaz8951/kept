/* =============== 6. WIRING & BOOT =============== */
const HERO_HTML = document.getElementById("hero") ? document.getElementById("hero").innerHTML : "";
const RENDERERS={overview:renderOverview,spending:renderSpending,cfo:renderCFO,months:renderMonths,add:()=>{},analysis:renderAnalysis,life:()=>Life.renderLife(),habits:renderHabits,cuts:renderCuts,debt:renderDebt,save:renderSave,forecast:renderForecast,coach:renderCoach};
const done={};
function showTab(t){
 document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
 document.querySelectorAll("#bnav button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
 document.querySelectorAll(".tab-pane").forEach(p=>p.classList.toggle("on",p.id==="pane-"+t));
 const always={add:1,life:1};
 if((M||always[t]) && !done[t]){ RENDERERS[t](); done[t]=true; }
 window.scrollTo({top:0});
}
function renderAll(){
 for(const k in done) delete done[k];
 if(!document.getElementById("waffle") && HERO_HTML) $$("hero").innerHTML=HERO_HTML;   // restore hero after the empty-state welcome
 chartDefaults(); renderHero(); updateBanner(); showTab(document.querySelector("nav.tabs button.on").dataset.t);
 // pre-render current tab happens in showTab; others lazy
}
$$("tabs").addEventListener("click",e=>{ const b=e.target.closest("button"); if(b) showTab(b.dataset.t); });
$$("bnav").addEventListener("click",e=>{ const b=e.target.closest("button"); if(b) showTab(b.dataset.t); });
$$("presBtn").addEventListener("click",openDeck);
$$("dPrev").addEventListener("click",e=>{e.stopPropagation();go(-1);});
$$("dNext").addEventListener("click",e=>{e.stopPropagation();go(1);});
$$("dExit").addEventListener("click",e=>{e.stopPropagation();closeDeck();});
$$("dLaser").addEventListener("click",e=>{ e.stopPropagation();
 const on=$$("deck").classList.toggle("laser");
 $$("dLaser").classList.toggle("on",on); if(!on)$$("deck").classList.remove("hascursor"); });
$$("dFs").addEventListener("click",e=>{ e.stopPropagation(); fsManual=true; setTimeout(()=>fsManual=false,400); isFs()?fsOff():fsOn(); });
/* startup-slide filter chips rebuild the deck for the chosen period */
$$("slide").addEventListener("click",e=>{
 const ch=e.target.closest(".dfchip"); if(!ch) return;
 e.stopPropagation();
 const k=ch.dataset.scope;
 if(k.startsWith("year:")){ DECKF={mode:"year",year:k.slice(5)}; } else { DECKF={mode:k,year:null}; }
 buildSlides(); pi=0; drawSlide();
});
/* click to advance: left quarter = previous, the rest = next (controls excepted) */
document.querySelector("#deck .stage").addEventListener("click",e=>{
 if(e.target.closest(".deckbar")||e.target.closest(".dfchip")||e.target.closest("button")||e.defaultPrevented) return;
 const r=e.currentTarget.getBoundingClientRect();
 go(((e.clientX-r.left)/r.width)<0.25?-1:1);
});
$$("themeBtn").addEventListener("click",()=>{
 const dark=document.documentElement.dataset.theme==="dark";
 document.documentElement.dataset.theme=dark?"light":"dark";
 $$("themeBtn").textContent=dark?"Dark":"Light";
 try{localStorage.setItem("kept_theme",document.documentElement.dataset.theme);}catch(e){}
 renderAll();
});
$$("cur").addEventListener("change",e=>{ CUR=e.target.value; renderAll(); });
$$("spendPeriod").addEventListener("change",()=>{ renderSpending(); });
$$("momChips").addEventListener("click",e=>{ const c=e.target.closest(".mchip"); if(!c) return;
 MST[c.dataset.mk]=c.dataset.v; renderMonths(); });
$$("bvTable").addEventListener("change",e=>{ const i=e.target.closest(".bud"); if(!i) return;
 const b=budgetLoad(); b[i.dataset.c]=+i.value||0; budgetSave(b); renderBudget(); });
$$("txSearch").addEventListener("input",()=>{ renderTxTable(); });
$$("retPct").addEventListener("change",()=>renderSave());
$$("extraPay").addEventListener("input",()=>{ renderPayoff(); });
$$("file").addEventListener("change",e=>{
 const f=e.target.files[0]; if(!f) return;
 const rd=new FileReader();
 rd.onload=ev=>{
  try{
   const wb=XLSX.read(ev.target.result,{type:"array",cellDates:true});
   const rows=parseWorkbook(wb);
   if(!rows.length){ alert("No usable rows found — download the sample Excel to see the expected format."); return; }
   const cur=Store.load().length;
   if(cur && !confirm("Uploading a file RESTARTS Kept with this file as the new source of truth.\n\nYour current "+cur+" transactions (including daily entries)"+((typeof Sync!=="undefined"&&Sync.user&&Sync.user())?" and your cloud copy":"")+" will be replaced by the "+rows.length+" rows in this file.\n\nExport first if you need a backup. Continue?")) { e.target.value=""; return; }
   Store.replaceAll(rows);
   Store.setMeta("pathBase",null);           // the ramp restarts from this upload
   RAW=Store.txns();
   M=RAW.length?build(RAW):null;
   $$("spendPeriod").innerHTML='<option value="all">All months</option>';
   if(M) renderAll();
   if(typeof Sync!=="undefined"&&Sync.user&&Sync.user()) Sync.replaceCloud(); else if(typeof Sync!=="undefined") Sync.queuePush();
   alert("Fresh start: "+rows.length+" transactions loaded. The path baseline has been reset — this file is now the source of truth.");
   e.target.value="";
   window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){ alert("Could not read that file: "+err); }
 };
 rd.readAsArrayBuffer(f);
});
$$("acctClose").addEventListener("click",()=>$$("acctSheet").classList.remove("on"));
$$("sampleLink").addEventListener("click",e=>{ e.preventDefault(); Account.sample(); });
function updateBanner(){
 const b=$$("pathBanner"); if(!M){ b.className="banner"; return; }
 const st=Life.pathStatus(); if(!st){ b.className="banner"; return; }
 let txt=st.line;
 if(st.mtd) txt+=` · Month so far (day ${st.mtd.day}): ${money(Math.round(st.mtd.spent))} out vs ${money(Math.round(st.mtd.budget))} pro-rata — ${st.mtd.delta<=0?"<b>"+money(Math.round(-st.mtd.delta))+" ahead</b>":"<b>"+money(Math.round(st.mtd.delta))+" behind</b>"}.`;
 b.innerHTML=txt; b.className="banner on "+st.cls;
}
(function boot(){
 try{ const t=localStorage.getItem("kept_theme"); if(t){document.documentElement.dataset.theme=t; $$("themeBtn").textContent=t==="dark"?"Light":"Dark";} }catch(e){}
 CUR=Store.meta("cur","AED"); $$("cur").value=CUR;
 $$("cur").addEventListener("change",()=>Store.setMeta("cur",CUR));
 RAW=Store.txns();
 QuickAdd.init();
 if(RAW.length){ M=build(RAW); renderAll(); }
 else {
  $$("hero").innerHTML='<div class="empty"><h2>Kept starts with one question:<br>how much of your money stays yours?</h2><p>Upload the Excel you already keep (Date, Description, Amount — negative = spent, Category), or start logging today in the <b>Add today</b> tab. Everything stays on this device unless you sign in.</p><p><button class="bigbtn ghost" id="sampleBtn" style="width:auto;padding:10px 18px">📄 Download sample Excel</button></p></div>';
  $$("sampleBtn").addEventListener("click",()=>Account.sample());
  updateBanner();
 }
 if(typeof Sync!=="undefined") Sync.init();
 if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
})();