"use strict";
/* =============== 5. PRESENTATION MODE =============== */
let SL=[], pi=0, DM=null, DECKF={mode:"all", year:null};
function sbar(name,val,max,bad){ return `<div class="sbar ${bad?"bad":""}"><span class="nm">${esc(name)}</span>
 <span class="tr"><i style="width:${Math.max(2,val/max*100)}%"></i></span><span class="vv num">${money(val)}</span></div>`; }

/* ---- deck scope (filters on the startup slide) ---- */
function deckYears(){ return [...new Set(RAW.map(r=>String(r[0]||"").slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort(); }
function scopedRaw(){
 if(DECKF.mode==="year") return RAW.filter(r=>String(r[0]||"").slice(0,4)===DECKF.year);
 if(DECKF.mode==="last12"||DECKF.mode==="last6"){
  const n = DECKF.mode==="last12"?12:6;
  const ms=[...new Set(RAW.map(r=>String(r[0]||"").slice(0,7)))].sort();
  const keep=new Set(ms.slice(-n));
  return RAW.filter(r=>keep.has(String(r[0]||"").slice(0,7)));
 }
 return RAW;
}
function scopeLabel(){
 if(DECKF.mode==="year") return "Year "+DECKF.year;
 if(DECKF.mode==="last12") return "Last 12 months";
 if(DECKF.mode==="last6") return "Last 6 months";
 return "All time";
}
const CURWORD_MAP={SAR:"riyal",AED:"dirham",INR:"rupee",USD:"dollar"};
function curword(){ return CURWORD_MAP[CUR]||"unit of it"; }
function niceTop(v){ const p=Math.pow(10,Math.floor(Math.log10(v||1))); const n=v/p;
 return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
/* grouped bars, ported from the pipeline deck (gBars) and re-skinned for the dark canvas */
function gbars(items,o){
 o=o||{}; const W=o.W||900,H=o.h||330,L=70,R=14,T=30,B=44,fz=o.fs||1;
 let max=0; items.forEach(d=>{max=Math.max(max,d.a||0,d.b||0);}); const top=niceTop(max||1);
 const iw=(W-L-R)/items.length, pair=items.some(d=>d.b!=null)?2:1;
 const bw=Math.min(46,iw*0.32), gp=5;
 let x='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block">';
 for(let i=0;i<=4;i++){ const v=top*i/4, y=T+(H-T-B)*(1-i/4);
  x+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="rgba(255,255,255,.12)"/>'
   +'<text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="'+(11*fz)+'" fill="#9DBFA9">'+fmt0(v)+'</text>'; }
 items.forEach((d,i)=>{
  const cx=L+iw*i+iw/2, x0=cx-(pair*bw+(pair-1)*gp)/2;
  [[d.a,o.ca||"#5FD8A4"],[d.b,o.cb||"#F08A7B"]].slice(0,pair).forEach((p,j)=>{
   const hh=(H-T-B)*((p[0]||0)/top), bx=x0+j*(bw+gp), by=H-B-hh;
   x+='<rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(hh,0).toFixed(1)
    +'" fill="'+p[1]+'" rx="3" style="transform-origin:'+(bx+bw/2).toFixed(1)+'px '+(H-B)
    +'px;animation:growY .7s cubic-bezier(.22,.8,.3,1) '+(i*0.05).toFixed(2)+'s backwards"/>';
   if(hh>0&&items.length<=13) x+='<text x="'+(bx+bw/2)+'" y="'+(by-5)+'" text-anchor="middle" font-size="'+(9.5*fz)
    +'" fill="#C7DACD" style="animation:fade .5s ease '+(0.4+i*0.05).toFixed(2)+'s backwards">'+fmt0(p[0])+'</text>';
  });
  x+='<text x="'+cx+'" y="'+(H-B+18)+'" text-anchor="middle" font-size="'+(11.5*fz)+'" fill="#C7DACD">'+esc(d.label)+'</text>';
 });
 if(o.legend){ x+='<rect x="'+L+'" y="4" width="11" height="11" fill="'+(o.ca||"#5FD8A4")+'" rx="2"/>'
  +'<text x="'+(L+16)+'" y="14" font-size="'+(11.5*fz)+'" fill="#C7DACD">'+esc(o.legend[0])+'</text>'
  +'<rect x="'+(L+150)+'" y="4" width="11" height="11" fill="'+(o.cb||"#F08A7B")+'" rx="2"/>'
  +'<text x="'+(L+166)+'" y="14" font-size="'+(11.5*fz)+'" fill="#C7DACD">'+esc(o.legend[1])+'</text>'; }
 return '<div class="dchart">'+x+'</svg></div>';
}
function monthShort(m){ const d=new Date(m+"-01T00:00:00"); return d.toLocaleDateString("en-GB",{month:"short"})+" "+String(d.getFullYear()).slice(2); }

/* ---- per-calendar-year aggregates ---- */
function yearAgg(m){
 const by={};
 m.months.forEach(mo=>{ const y=mo.slice(0,4); by[y]=by[y]||{inc:0,out:0,months:0};
  const p=m.per[mo]; by[y].inc+=p.income+p.refund; by[y].out+=p.spend+p.debtpay+p.invest; by[y].months++; });
 return Object.entries(by).sort((a,b)=>a[0]<b[0]?-1:1).map(([y,v])=>({y, ...v, kept:v.inc-v.out, rate:v.inc>0?(v.inc-v.out)/v.inc*100:0}));
}

function startSlide(){
 const years=deckYears();
 const chips=[["all","All time"],...years.map(y=>["year:"+y,y])];
 const ms=[...new Set(RAW.map(r=>String(r[0]||"").slice(0,7)))].sort();
 if(ms.length>12) chips.push(["last12","Last 12 months"]);
 if(ms.length>6)  chips.push(["last6","Last 6 months"]);
 const cur=DECKF.mode==="year"?"year:"+DECKF.year:DECKF.mode;
 const dm=DM, nM=dm?dm.fullMonths.length||1:1;
 return `<div class="kick">Money Recovery · Financial Review</div>
  <h2>One continuous story:<br><b>${ms[0]?monthShort(ms[0]):""} → ${ms.length?monthShort(ms[ms.length-1]):""}</b> and onward</h2>
  <p class="lead">Choose the period to present, then click the right side of the screen (or press →). Press <b>L</b> for the laser pointer, <b>Esc</b> to exit.</p>
  <div class="dfilters">${chips.map(([k,lb])=>`<span class="dfchip ${k===cur?"on":""}" data-scope="${k}">${lb}</span>`).join("")}</div>
  ${dm?`<div class="sgrid c3">
   <div class="sbox"><div class="lb">Scope</div><div class="vl">${scopeLabel()}</div><div class="sb">${dm.fullMonths.length} full month${dm.fullMonths.length===1?"":"s"}${dm.lastPartial?" + 1 partial":""}</div></div>
   <div class="sbox"><div class="lb">Real income in scope</div><div class="vl num">${money(dm.sum("income")+dm.sum("refund"))}</div><div class="sb">${money(dm.avg.income)}/month avg</div></div>
   <div class="sbox"><div class="lb">Kept in scope</div><div class="vl num" style="color:${dm.cashKeptRate>=20?"#5FD8A4":"#F08A7B"}">${pct(dm.cashKeptRate)}</div><div class="sb">of every ${curword()} earned</div></div>
  </div>`:""}`;
}

function buildSlides(){
 const sr=scopedRaw();
 DM = sr.length ? build(sr) : null;
 if(!DM){ SL=[startSlide()]; return; }
 const pjF=projNext(3), clF=cautions(), gapsF=gapsModel(M).slice(0,4), yoF=yearOutlook();   // forecast, cautions & money-model gaps always from the full, latest data
 const saveM=M; M=DM;                       // scoped model drives every slide + the cut engine
 try{
 const nM=M.fullMonths.length||1, kept=Math.round(M.cashKeptRate);
 const cats=Object.entries(M.catTotal).sort((a,b)=>b[1]-a[1]);
 const cmax=cats[0]?cats[0][1]:1;
 const cuts=buildCuts(); const allCuts=[...cuts.quick,...cuts.med,...cuts.major].sort((a,b)=>b.save-a.save);
 const cutTot=allCuts.reduce((a,c)=>a+c.save,0);
 const totalDebt=M.loanList.reduce((a,l)=>a+l.balance,0);
 const extra=+($$("extraPay")?.value||500);
 const sim=totalDebt?simulate(M.loanList,extra,"ava"):null;
 const simBase=totalDebt?simulate(M.loanList,0,"snow"):null;
 const start=new Date(M.months[M.months.length-1]+"-01");
 const dfd=n=>{const d=new Date(start);d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-GB",{month:"long",year:"numeric"});};
 const smAvg=M.small.reduce((a,t)=>a-t.amt,0)/nM;
 const pl=plModel(M), cfm=cfModel(M), bem=breakevenModel(M), ctlm=controlsModel(M), feem=feeScan(M);
 const target20=Math.round(M.avg.income*0.2);
 const yaF=yearAgg(saveM||M);   // full dataset, independent of the deck scope
 const yaLast=yaF[yaF.length-1], yaPrev=yaF.length>1?yaF[yaF.length-2]:null;
 const yaTrend = yaPrev
  ? (yaLast.kept>=yaPrev.kept
     ? `${yaLast.y} is keeping <b style="color:#5FD8A4">${money(yaLast.kept-yaPrev.kept)}</b> more than ${yaPrev.y}. Direction: right. Now steepen it.`
     : `${yaLast.y} is keeping <b style="color:#F08A7B">${money(yaPrev.kept-yaLast.kept)}</b> less than ${yaPrev.y}. The line is bending the wrong way — this deck is the correction.`)
  : `First year on record. Every upload from here extends this chart into ${+yaLast.y+1} and beyond.`;
 const mom=M.fullMonths.slice(-12);
 const momBest=mom.length?mom.reduce((a,b)=>M.per[a].net>=M.per[b].net?a:b):null;
 const momWorst=mom.length?mom.reduce((a,b)=>M.per[a].net<=M.per[b].net?a:b):null;

 SL=[
 startSlide(),
 // keep rate
 `<div class="kick">${scopeLabel()} — the single number that matters</div>
  <h2>Of every ${CUR} 100 earned,<br>you keep <b>${kept}</b>.</h2>
  <div class="big num" style="color:${kept>=20?"#5FD8A4":"#F08A7B"}">${kept}%</div>
  <p class="lead" style="margin-top:18px">The target is <b style="color:#5FD8A4">20%</b>. Every point of savings rate ≈ <b>${money(M.avg.income*0.01)}</b>/month ≈ <b>${money(M.avg.income*0.12)}</b>/year. This presentation exists to move this number.</p>`,
 // household P&L
 `<div class="kick">The household P&amp;L · ${scopeLabel()}</div>
  <h2>Run the home like a company:<br>revenue, costs, <b>profit</b></h2>
  <div class="dsplit" style="align-items:start">
   <div><table class="dtbl">
    <tr><th>Line — avg / month</th><th>${CUR}</th><th>% rev</th></tr>
    <tr><td style="font-weight:700">Revenue</td><td style="font-weight:700">${fmt0(pl.rev)}</td><td>100%</td></tr>
    <tr><td>Committed (rent, bills)</td><td>−${fmt0(pl.F)}</td><td>${pct(pl.rev?pl.F/pl.rev*100:0)}</td></tr>
    <tr><td>Essentials (grocery, transport, health)</td><td>−${fmt0(pl.E)}</td><td>${pct(pl.rev?pl.E/pl.rev*100:0)}</td></tr>
    <tr><td>Discretionary (wants)</td><td>−${fmt0(pl.D)}</td><td>${pct(pl.rev?pl.D/pl.rev*100:0)}</td></tr>
    <tr><td style="font-weight:700">Operating surplus</td><td style="font-weight:700;color:${pl.op>=0?"#5FD8A4":"#F08A7B"}">${fmt0(pl.op)}</td><td>${pct(pl.opM)}</td></tr>
    <tr><td>Financing (EMIs)</td><td>−${fmt0(pl.P)}</td><td>${pct(pl.rev?pl.P/pl.rev*100:0)}</td></tr>
    <tr><td>Investing</td><td>−${fmt0(pl.I)}</td><td>${pct(pl.rev?pl.I/pl.rev*100:0)}</td></tr>
    <tr><td style="font-weight:700">Net kept — profit</td><td style="font-weight:700;color:${pl.net>=0?"#5FD8A4":"#F08A7B"}">${fmt0(pl.net)}</td><td>${pct(pl.netM)}</td></tr>
   </table></div>
   <div><p class="lead" style="font-size:clamp(13px,1.6vw,18px)">A business keeping ${pct(pl.netM)} of revenue would be called ${pl.netM>=15?"healthy — protect the margin":pl.netM>=5?"fragile — one bad quarter from losses":"distressed — the board would demand a turnaround plan"}. Discretionary is the only line management fully controls: ${money(Math.round(pl.D))}/month of pure decisions.</p></div>
  </div>`,
 // cost structure & break-even
 `<div class="kick">Cost structure</div>
  <h2>Until <b>day ${bem.day}</b> of every month,<br>your salary is not yours</h2>
  <div class="sgrid c3">
   <div class="sbox"><div class="lb">Fixed burn / month</div><div class="vl num">${money(Math.round(bem.committed))}</div><div class="sb">rent + bills + EMIs — leaves before any choice</div></div>
   <div class="sbox"><div class="lb">Committed share</div><div class="vl num" style="color:${bem.share<40?"#5FD8A4":bem.share<55?"#F0B14C":"#F08A7B"}">${pct(bem.share)}</div><div class="sb">of revenue is spoken for on day 1</div></div>
   <div class="sbox"><div class="lb">Paid in pure fees</div><div class="vl num" style="color:${feem.tot<100?"#5FD8A4":"#F08A7B"}">${money(Math.round(feem.tot))}</div><div class="sb">${feem.n} fee &amp; VAT-on-fee rows in the file</div></div>
  </div>
  <p class="lead" style="margin-top:2.5%">Every fixed cost cut is worth 12× its monthly value a year and pulls the break-even day earlier. CFO move: renegotiate one fixed line per quarter.</p>`,
 // month on month
 `<div class="kick">Month on month · ${scopeLabel()}</div>
  <h2>The rhythm of the money —<br><b>in</b> vs <span class="bad">out</span>, every month</h2>
  ${gbars(mom.map(mo=>({label:monthShort(mo), a:M.per[mo].income+M.per[mo].refund, b:M.per[mo].spend+M.per[mo].debtpay+M.per[mo].invest})),{legend:["Money in","Money out"],h:310})}
  <p class="lead" style="margin-top:1.5%">${momBest?`Best month: <b style="color:#5FD8A4">${monthShort(momBest)}</b> (kept ${money(M.per[momBest].net)}). Worst: <b style="color:#F08A7B">${monthShort(momWorst)}</b> (${money(M.per[momWorst].net)}). Same salary, very different endings — the gap between those two months is behavior, not income.`:""}</p>`,
 // yearly chart — current year: actuals, then fixed + projected to December (pipeline Yearly Chart style)
 `<div class="kick">Yearly chart · ${yoF.y}</div>
  <h2>The whole year on one page —<br>actual so far, <b>projected</b> to December</h2>
  ${yearSVG(yoF)}
  <p class="lead" style="margin-top:1%">Solid bars are money already gone; dashed bars are the projection from your own pattern — the amber base inside each bar is the fixed burn (${money(Math.round(yoF.committed))}/month) that leaves whether you decide anything or not.</p>`,
 // month-by-month table — history, present and coming months with fixed vs projected
 `<div class="kick">Month by month · ${yoF.y} — history, present and outlook</div>
  <h2>Closed months are facts.<br>Coming months are <b>choices</b>.</h2>
  <div style="margin-top:1.5%"><table class="dtbl" style="font-size:clamp(10.5px,1.15vw,14px)">
   <tr><th>Month</th><th>In</th><th>Fixed + EMIs</th><th>Variable</th><th>Total out</th><th>Kept</th><th>Status</th></tr>
   ${yoF.rows.map(r=>r.out==null?"":`<tr style="${r.proj?"opacity:.8":""}"><td>${r.label}</td><td>${fmt0(Math.round(r.inn))}</td><td>${fmt0(Math.round(r.F))}</td><td>${fmt0(Math.round(r.V))}</td><td style="font-weight:700">${fmt0(Math.round(r.out))}</td><td style="color:${r.kept>=0?"#5FD8A4":"#F08A7B"};font-weight:700">${fmt0(Math.round(r.kept))}</td><td style="color:${r.proj?"#F0B14C":r.part?"#7ED8AC":"#9DBFA9"}">${r.status}</td></tr>`).join("")}
   ${(()=>{const rs=yoF.rows.filter(r=>r.out!=null);const t=k=>rs.reduce((a,r)=>a+(r[k]||0),0);
     return `<tr style="border-top:2px solid rgba(255,255,255,.3)"><td style="font-weight:800">Year</td><td style="font-weight:800">${fmt0(Math.round(t("inn")))}</td><td style="font-weight:800">${fmt0(Math.round(t("F")))}</td><td style="font-weight:800">${fmt0(Math.round(t("V")))}</td><td style="font-weight:800">${fmt0(Math.round(t("out")))}</td><td style="font-weight:800;color:${t("kept")>=0?"#5FD8A4":"#F08A7B"}">${fmt0(Math.round(t("kept")))}</td><td></td></tr>`;})()}
  </table></div>
  <p class="lead" style="margin-top:1.2%">The variable column of every Projected row is the only money still up for negotiation this year — beat the projection there and the Kept column rewrites itself.</p>`,
 // what comes next — spending forecast + cautions from his own habits
 `<div class="kick">What comes next — projected from your own pattern</div>
  <h2>If nothing changes, this is<br>what the next 3 months <b>cost</b></h2>
  <div class="sgrid c3">
  ${pjF.map(p=>`<div class="sbox"><div class="lb">${monthShort(p.m)}${p.seasonal?" · historically expensive":""}</div>
   <div class="vl num" style="color:${p.seasonal?"#F08A7B":"#F0F6F1"}">${money(Math.round(p.out))}</div>
   <div class="sb">out · kept <b style="color:${p.kept>=0?"#5FD8A4":"#F08A7B"}">${money(Math.round(p.kept))}</b>${p.driver&&p.seasonal?` · watch ${esc(p.driver)}`:""}</div></div>`).join("")}
  </div>
  <p class="lead" style="margin-top:2.5%">${clF.length?`Be cautious: ${clF[0].txt.replace(/<\/?b>/g,"")} The counter-move: ${clF[0].act}`:`No seasonal traps in sight — the projection holds if the rules hold.`}</p>`,
 // yearly — always the FULL history, whatever the scope, so the long game never disappears
 `<div class="kick">Year on year — the long game</div>
  <h2>One <b>continuous</b> story:<br>every year the file grows</h2>
  <div class="dsplit">
   <div>${gbars(yaF.map(v=>({label:v.y+(v.months<12?" · "+v.months+"mo":""), a:v.inc, b:v.out})),{legend:["Money in","Money out"],h:300,W:640,fs:1.1})}</div>
   <div><table class="dtbl"><tr><th>Year</th><th>In</th><th>Out</th><th>Kept</th><th>Rate</th></tr>
    ${yaF.map(v=>`<tr><td>${v.y}</td><td>${fmt0(v.inc)}</td><td>${fmt0(v.out)}</td><td style="color:${v.kept>=0?"#5FD8A4":"#F08A7B"};font-weight:700">${fmt0(v.kept)}</td><td>${pct(v.rate)}</td></tr>`).join("")}
   </table>
   <p class="lead" style="font-size:clamp(12px,1.4vw,16px);margin-top:4%">${yaTrend}</p></div>
  </div>`,
 // cash flow statement (supersedes the honest-income view)
 `<div class="kick">Cash flow statement · ${scopeLabel()}</div>
  <h2>Operating, financing, investing —<br>where the cash <b>really</b> moved</h2>
  <div class="sgrid c3">
   <div class="sbox"><div class="lb">Operating</div><div class="vl num" style="color:${cfm.op>=0?"#5FD8A4":"#F08A7B"}">${(cfm.op>=0?"+":"")+fmt0(cfm.op)}</div><div class="sb">earned minus living costs</div></div>
   <div class="sbox"><div class="lb">Financing net</div><div class="vl num" style="color:${cfm.fin<=0?"#F0B14C":"#F08A7B"}">${(cfm.fin>=0?"+":"")+fmt0(cfm.fin)}</div><div class="sb">borrowed +${fmt0(cfm.borrowedIn)} · repaid −${fmt0(cfm.repaid)}</div></div>
   <div class="sbox"><div class="lb">Investing</div><div class="vl num">${fmt0(cfm.inv)}</div><div class="sb">building assets${-cfm.inv<1000?" — almost none yet":""}</div></div>
  </div>
  <p class="lead" style="margin-top:2.5%">${cfm.op<0?`Living costs exceeded earnings — the household burned cash and loans filled the hole. Rule one of the turnaround: operating must go positive.`:`Operations generate cash; financing drains it back to lenders. A loan is never income — it is a claim on future salary. The plan: financing stays negative (repaying), then investing takes over.`}</p>`,
 // where it goes
 `<div class="kick">Where it goes · ${scopeLabel()}</div><h2>Top spending categories<br><b>per month</b></h2>`
  + cats.slice(0,7).map(([c,v])=>sbar(c, v/nM, cmax/nM, DISCRET.includes(c))).join("")
  + `<p class="lead" style="margin-top:14px">Coral bars are discretionary — that is the negotiable zone.</p>`,
 // money-model gaps — evidence from his own file, always full data
 `<div class="kick">The audit finding</div>
  <h2>Where the model of money<br>was <span class="bad">wrong</span> — with evidence</h2>
  <div style="margin-top:2%">${gapsF.map((g,i)=>`<p class="lead" style="margin-top:1.6%;font-size:clamp(12.5px,1.55vw,18px)"><b style="color:#F0B14C">${i+1} · ${g.t}</b><br>${g.ev} <b style="color:#5FD8A4">→ ${g.fix}</b></p>`).join("")}</div>`,
 // habits — graded against the data, conclusion computed from what is actually true
 (()=>{ const surge=M.dailyAvgSpend?M.postSalDaily/M.dailyAvgSpend:1;
   const hb=[];
   hb.push({bad:smAvg*12>1000, lb:"Micro-spending", vl:String(M.small.length),
     sb:`purchases ≤ ${CUR} 25 = ${money(smAvg)}/mo = <b>${money(smAvg*12)}/yr</b>`, cost:smAvg*12});
   hb.push({bad:surge>=1.15, lb:"Salary-day surge", vl:(Math.round(surge*10)/10)+"×",
     sb: surge>=1.15?`daily spend jumps ${pct((surge-1)*100)} in the 3 days after salary`:`spending stays steady after payday — this habit is under control`, cost:0});
   hb.push({bad:M.borrowShare>0, lb:"Borrow-to-spend", vl:pct(M.borrowShare),
     sb: M.borrowShare>0?`of inflow was new loans — spending next year's salary`:`no new borrowing in this period — keep it at zero`, cost:0});
   const bad=hb.filter(h=>h.bad), yr=bad.reduce((a,h)=>a+h.cost,0);
   const title = bad.length>=2?`${["","One behavior is","Two behaviors are","Three behaviors are"][bad.length]}<br>quietly draining the account`
     : bad.length===1?`One behavior is<br>quietly draining the account`:`The habits are under control —<br><b>keep them there</b>`;
   const concl = bad.length
     ? `${bad.map(h=>h.lb).join(", ")} ${bad.length>1?"aren't":"isn't"} a salary problem — ${yr>0?`the measurable part alone is ~<b style="color:#F08A7B">${money(yr)}</b> a year, `:""}and each one reverses with a single rule, starting this month.`
     : `Nothing here needs fixing. Protect these habits — they are what turns income into wealth.`;
   return `<div class="kick">The habits · ${scopeLabel()}</div><h2>${title}</h2>
  <div class="sgrid c3">`+hb.map(h=>`<div class="sbox"><div class="lb">${h.lb}</div><div class="vl num" style="color:${h.bad?"#F08A7B":"#5FD8A4"}">${h.vl}</div><div class="sb">${h.sb}</div></div>`).join("")
  +`</div><p class="lead" style="margin-top:2.5%">${concl}</p>`; })(),
 // cuts — full sentences under each bar, nothing truncated
 `<div class="kick">The cut list — savings first</div><h2>Recover <b>${money(cutTot)}</b> per month<br>without earning one ${curword()} more</h2>
  <div style="margin-top:2%">`
  + allCuts.slice(0,5).map((c,i)=>{ const w=Math.max(3,c.save/(allCuts[0]?allCuts[0].save:1)*100);
    return `<div class="cutrow"><div class="cbar"><i style="width:${w}%"></i><b class="${w>86?"":"out"}">${money(c.save)}/mo</b></div>
     <div class="cname">${esc(c.name)}. <span>${esc(c.why)}</span></div></div>`; }).join("")
  + `</div><p class="lead" style="margin-top:1.5%">Annualized: <b style="color:#5FD8A4">${money(cutTot*12)}</b> — a raise you give yourself, repeating every month.</p>`,
 // debt
 totalDebt? `<div class="kick">The debt plan</div><h2>Debt-free by <b>${dfd(sim.months)}</b></h2>
  <div class="sgrid c3">
   <div class="sbox"><div class="lb">Outstanding today</div><div class="vl num">${money(totalDebt)}</div><div class="sb">${M.loanList.length} active loans</div></div>
   <div class="sbox"><div class="lb">Strategy</div><div class="vl">Avalanche</div><div class="sb">+ ${money(extra)}/month extra, highest rate first</div></div>
   <div class="sbox"><div class="lb">Interest saved</div><div class="vl num" style="color:#5FD8A4">${money(Math.max(0,simBase.interest-sim.interest))}</div><div class="sb">${Math.max(0,simBase.months-sim.months)} months earlier than minimums</div></div>
  </div>
  <p class="lead" style="margin-top:20px">Every closed loan's EMI rolls into the next loan — then into savings. The freeze on new borrowing is non-negotiable.</p>`
  : `<div class="kick">The debt plan</div><h2><b>No active loans.</b><br>Keep it that way.</h2><p class="lead">Redirect what used to be EMIs into the savings plan on the next slide.</p>`,
 // savings plan
 `<div class="kick">The savings plan</div><h2>Pay yourself <b>first</b> —<br>${money(target20)} on salary day</h2>
  <div class="sgrid c3">
   <div class="sbox"><div class="lb">In 1 year</div><div class="vl num">${money(target20*12)}</div></div>
   <div class="sbox"><div class="lb">In 3 years</div><div class="vl num">${money(target20*36*1.06)}</div><div class="sb">at ~6% return</div></div>
   <div class="sbox"><div class="lb">In 10 years</div><div class="vl num" style="color:#5FD8A4">${money(target20*12*13.6)}</div><div class="sb">compounding does the heavy lifting</div></div>
  </div>
  <p class="lead" style="margin-top:20px">Order of money from now on: savings → EMIs → essentials → lifestyle. Lifestyle gets what is left, not the other way around.</p>`,
 // house controls — corporate approval workflow, audited on every upload
 `<div class="kick">House controls — the approval workflow</div>
  <h2>Five standing rules.<br><b>Audited on every upload.</b></h2>
  <div style="margin-top:2%"><table class="dtbl">
   <tr><th>Rule</th><th>Target</th><th>${monthShort(ctlm.lm)}</th><th></th></tr>
   ${ctlm.rules.map(r=>`<tr><td style="text-align:left;white-space:normal">${r.r}</td><td>${r.tgt}</td><td>${r.act}</td><td style="color:${r.ok?"#5FD8A4":"#F08A7B"};font-weight:800">${r.ok?"PASS":"FAIL"}</td></tr>`).join("")}
  </table></div>
  <p class="lead" style="margin-top:2%">No willpower involved: standing order to savings on salary day, extra ${money(+($$("extraPay")?.value||500))} to the target loan the day after, and every FAIL above gets one corrective action this month.</p>`,
 // thank you — the last word, and only this
 `<div style="text-align:center"><h2 style="font-size:clamp(52px,9vw,130px)">Thank <b>you.</b></h2></div>`
 ];
 } finally { M=saveM; }
}
function drawSlide(){ $$("slide").innerHTML='<div class="sp">'+SL[pi]+'</div>'; $$("dProg").style.width=((pi+1)/SL.length*100)+"%"; $$("dCnt").textContent=(pi+1)+" / "+SL.length; }
function go(d){ pi=Math.max(0,Math.min(SL.length-1,pi+d)); drawSlide(); }
function isFs(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function fsOn(){ const e=document.documentElement, r=e.requestFullscreen||e.webkitRequestFullscreen;
 if(r){ try{const p=r.call(e); if(p&&p.catch)p.catch(()=>{});}catch(_){}} }
function fsOff(){ if(!isFs()) return; const x=document.exitFullscreen||document.webkitExitFullscreen;
 if(x){ try{const p=x.call(document); if(p&&p.catch)p.catch(()=>{});}catch(_){}} }
function openDeck(){ if(!M) return; buildSlides(); pi=0; drawSlide();
 const dk=$$("deck"); dk.classList.add("on"); dk.classList.add("laser"); $$("dLaser").classList.add("on"); document.body.classList.add("deckopen"); fsOn(); }
function closeDeck(){ fsOff(); $$("deck").classList.remove("on","hascursor"); document.body.classList.remove("deckopen"); }
document.addEventListener("keydown",e=>{
 if(!$$("deck").classList.contains("on")) return;
 if(e.key==="ArrowRight"||e.key===" "||e.key==="PageDown"){go(1);e.preventDefault();}
 else if(e.key==="ArrowLeft"||e.key==="PageUp"){go(-1);e.preventDefault();}
 else if(e.key==="Escape"){closeDeck();}
 else if(e.key==="Home"){pi=0;drawSlide();} else if(e.key==="End"){pi=SL.length-1;drawSlide();}
 else if(e.key==="l"||e.key==="L"){$$("dLaser").click();}
 else if(e.key==="f"||e.key==="F"){$$("dFs").click();}
});
/* laser pointer */
(function(){ const lz=$$("laser"), dk=$$("deck"); let hide;
 dk.addEventListener("mousemove",e=>{
  if(!dk.classList.contains("laser")) return;
  lz.style.left=e.clientX+"px"; lz.style.top=e.clientY+"px";
  const overBar=e.target.closest&&e.target.closest(".deckbar");
  dk.classList.toggle("hascursor",!overBar);
  clearTimeout(hide); hide=setTimeout(()=>dk.classList.remove("hascursor"),2600); });
 dk.addEventListener("mouseleave",()=>dk.classList.remove("hascursor"));
})();
/* leaving fullscreen (Esc in fullscreen) closes the deck, as in the pipeline presentation */
let fsManual=false;
function fsChange(){ if(!isFs() && !fsManual && $$("deck").classList.contains("on")) closeDeck(); }
document.addEventListener("fullscreenchange",fsChange);
document.addEventListener("webkitfullscreenchange",fsChange);


