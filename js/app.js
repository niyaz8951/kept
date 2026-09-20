/* =============== 6. WIRING & BOOT =============== */
const PANE_HTML = {};
const HERO_HTML = document.getElementById("hero") ? document.getElementById("hero").innerHTML : "";
const RENDERERS={overview:renderOverview,spending:renderSpending,cfo:renderCFO,months:renderMonths,add:()=>{},history:()=>History.render(true),account:()=>Account.render(),analysis:renderAnalysis,life:()=>Life.renderLife(),habits:renderHabits,cuts:renderCuts,debt:renderDebt,save:renderSave,forecast:renderForecast,coach:renderCoach};
const done={};
function showTab(t){
 document.querySelectorAll("nav.tabs button").forEach(b=>{ const on=b.dataset.t===t;
  b.classList.toggle("on",on); b.setAttribute("role","tab"); b.setAttribute("aria-selected",on?"true":"false"); });
 document.querySelectorAll("#bnav button").forEach(b=>{ const on=b.dataset.t===t;
  b.classList.toggle("on",on); b.setAttribute("aria-current",on?"page":"false"); });
 document.querySelectorAll(".tab-pane").forEach(p=>{ const on=p.id==="pane-"+t;
  p.classList.toggle("on",on); p.setAttribute("role","tabpanel"); if(on) p.removeAttribute("hidden"); else p.setAttribute("hidden",""); });
 const always={add:1,life:1,account:1,history:1};
 if(!M && !always[t]){
  const pane=$$("pane-"+t);
  if(pane && !pane.dataset.emptied){ pane.dataset.emptied="1"; PANE_HTML[t]=PANE_HTML[t]||pane.innerHTML;
   pane.innerHTML='<div class="card an"><h3>Nothing to analyse yet</h3><div class="sub">This screen needs transactions. Upload your Excel in <b>Account → Your data</b>, or log today\'s spending in <b>Add</b> — the analysis appears the moment there is data.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="bigbtn" style="width:auto;padding:12px 18px" onclick="showTab(\'add\')">Log an expense</button><button class="bigbtn ghost" style="width:auto;padding:12px 18px" onclick="showTab(\'account\')">Upload Excel</button></div></div>';
  }
 }
 if((M||always[t]) && !done[t]){ RENDERERS[t](); done[t]=true; }
 if(typeof updateBanner==="function") updateBanner();
 window.scrollTo({top:0});
}
function renderAll(){
 for(const k in done) delete done[k];
 document.querySelectorAll(".tab-pane[data-emptied]").forEach(p=>{
  const k=p.id.replace("pane-",""); if(PANE_HTML[k]) p.innerHTML=PANE_HTML[k]; delete p.dataset.emptied; });
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
function setTheme(t){
 document.documentElement.dataset.theme=t;
 try{localStorage.setItem("kept_theme",t);}catch(e){}
 if(M) renderAll();
}

$$("spendPeriod").addEventListener("change",()=>{ renderSpending(); });
$$("momChips").addEventListener("click",e=>{ const c=e.target.closest(".mchip"); if(!c) return;
 MST[c.dataset.mk]=c.dataset.v; renderMonths(); });
$$("bvTable").addEventListener("change",e=>{ const i=e.target.closest(".bud"); if(!i) return;
 const b=budgetLoad(); b[i.dataset.c]=+i.value||0; budgetSave(b); renderBudget(); });
$$("txSearch").addEventListener("input",()=>{ renderTxTable(); });
$$("retPct").addEventListener("change",()=>renderSave());
$$("extraPay").addEventListener("input",()=>{ renderPayoff(); });
function handleUpload(e){
 const f=e.target.files[0]; if(!f) return;
 const rd=new FileReader();
 rd.onload=ev=>{
  try{
   const wb=XLSX.read(ev.target.result,{type:"array",cellDates:true});
   const rows=parseWorkbook(wb);
   if(!rows.length){ alert("No usable rows found — download the sample Excel to see the expected format."); e.target.value=""; return; }
   const cur=Store.load().length;
   if(cur && !confirm("Uploading RESTARTS Kept with this file as the new source of truth.\n\nYour current "+cur+" transactions (including daily entries)"+((typeof Sync!=="undefined"&&Sync.user&&Sync.user())?" and your cloud copy":"")+" will be replaced by the "+rows.length+" rows in this file.\n\nExport first if you need a backup. Continue?")){ e.target.value=""; return; }
   Store.replaceAll(rows);
   Store.setMeta("pathBase",null);
   RAW=Store.txns();
   M=RAW.length?build(RAW):null;
   $$("spendPeriod").innerHTML='<option value="all">All months</option>';
   for(const k in done) delete done[k];
   if(M) renderAll();
   if(typeof History!=="undefined") History.refresh();
   if(typeof Sync!=="undefined"&&Sync.user&&Sync.user()) Sync.replaceCloud(); else if(typeof Sync!=="undefined") Sync.queuePush();
   alert("Fresh start: "+rows.length+" transactions loaded. From here, add daily entries — Kept keeps one continuous record.");
   e.target.value="";
   showTab("overview");
  }catch(err){ alert("Could not read that file: "+err); e.target.value=""; }
 };
 rd.readAsArrayBuffer(f);
}
$$("acctBtn").addEventListener("click",()=>showTab("account"));
function updateBanner(){
 const b=$$("pathBanner"); if(!b) return;
 const onOverview=document.querySelector("nav.tabs button.on")?.dataset.t==="overview";
 if(!M||!onOverview){ b.className="banner"; b.innerHTML=""; return; }   // Home only — it is not a site-wide header
 const st=Life.pathStatus(); if(!st){ b.className="banner"; b.innerHTML=""; return; }
 let txt=st.line;
 if(st.mtd&&st.mtd.sameMonth){
  const ahead=st.mtd.delta<=0;
  txt+=` · ${monthShort(M.months[M.months.length-1])} to day ${st.mtd.day}: ${money(Math.round(st.mtd.spent))} out against ${money(Math.round(st.mtd.budget))} pro-rata — <b>${money(Math.round(Math.abs(st.mtd.delta)))} ${ahead?"under":"over"}</b> pace.`;
 }
 b.innerHTML=txt; b.className="banner on "+st.cls;
}
(function boot(){
 try{ const t=localStorage.getItem("kept_theme"); if(t) document.documentElement.dataset.theme=t; }catch(e){}
 CUR=Store.meta("cur","AED");
 RAW=Store.txns();
 QuickAdd.init();
 History.init();
 Account.render();
 if(RAW.length){ M=build(RAW); renderAll(); }
 else {
  $$("hero").innerHTML='<div class="empty"><h2>Kept starts with one question:<br>how much of your money stays yours?</h2><p>Upload the Excel you already keep (Date, Description, Amount — negative = spent, Category), or start logging today in the <b>Add today</b> tab. Everything stays on this device unless you sign in.</p><p><button class="bigbtn ghost" id="uploadBtn" style="width:auto;padding:10px 18px;margin-right:8px">⬆ Upload expense Excel</button><button class="bigbtn ghost" id="sampleBtn" style="width:auto;padding:10px 18px">📄 Download sample Excel</button></p></div>';
  $$("sampleBtn").addEventListener("click",()=>Account.sample());
  $$("uploadBtn").addEventListener("click",()=>{ showTab("account"); setTimeout(()=>$$("acFile").click(),120); });
  updateBanner();
 }
 if(typeof Sync!=="undefined") Sync.init();
 if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
})();