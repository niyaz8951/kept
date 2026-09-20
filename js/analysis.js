"use strict";
/* =============== ANALYSIS — the board pack rebuilt for a phone: slides become a scrolling story =============== */
function renderAnalysis(){
 if(!M){ $$("anaWrap").innerHTML='<div class="sub">Upload or add data first.</div>'; return; }
 buildSlides();                       // same engine as the desktop presentation
 $$("anaWrap").innerHTML = SL.map((s,i)=>`<div class="ana-card" data-i="${i}">${s}</div>`).join("");
 // scope chips inside card 0 re-scope the whole story
 $$("anaWrap").addEventListener("click",function h(e){
  const ch=e.target.closest(".dfchip"); if(!ch) return;
  const k=ch.dataset.scope;
  if(k.startsWith("year:")) DECKF={mode:"year",year:k.slice(5)}; else DECKF={mode:k,year:null};
  $$("anaWrap").removeEventListener("click",h);
  renderAnalysis();
 });
}
