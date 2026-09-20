"use strict";
/* =============== 4. RENDER =============== */
const CH = {}; // chart registry
function chart(id, cfg){ if(CH[id]) CH[id].destroy(); const c=$$(id); if(!c) return; CH[id]=new Chart(c,cfg); }
function chartDefaults(){
 const cs = getComputedStyle(document.documentElement);
 Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
 Chart.defaults.color = cs.getPropertyValue("--chart-tick").trim();
 Chart.defaults.borderColor = cs.getPropertyValue("--chart-grid").trim();
 Chart.defaults.plugins.legend.labels.boxWidth = 12;
}
const CAT_COLORS = ["#1B9E6B","#33628F","#B7811F","#CF4433","#5B4B97","#0F766E","#A85C32","#7A7F2A","#8F3D6B","#4A6FA5","#6E7B74","#2F9E8F"];
function catColor(i){ return CAT_COLORS[i % CAT_COLORS.length]; }

function kpiCard(lb, vl, sb, cls){ return `<div class="kpi ${cls||""} an"><div class="lb">${lb}</div><div class="vl num">${vl}</div><div class="sb">${sb||""}</div></div>`; }
function insight(html, action){ return `<div class="insight">${html}${action?`<span class="act">Do this: ${action}</span>`:""}</div>`; }

function dataCaveat(){
 if(!M) return "";
 const n=M.fullMonths.length, inc=M.avg.income+M.avg.refund, out=[];
 if(n===0) out.push("No complete month yet — every figure below is from a partial month and will move a lot.");
 else if(n===1) out.push("Only <b>one</b> complete month on record: treat averages as a first reading, not a trend. Trends need three.");
 else if(n===2) out.push("Two complete months on record — enough for a direction, not yet a pattern.");
 if(inc<=0) out.push("No income rows detected, so the keep-rate cannot be computed. Add your salary rows (positive amounts) or map the income column on upload.");
 if(M.lastPartial) out.push("The newest month is still running and is excluded from averages — its own progress is in the banner above.");
 return out.length? `<div class="insight" role="note"><b>Read this first.</b> ${out.join(" ")}</div>` : "";
}
function renderHero(){
 const kept = Math.max(0, Math.min(100, Math.round(M.cashKeptRate)));
 const debt = Math.max(0, Math.min(100-kept, Math.round(M.debtBurden)));
 const spent = 100-kept-debt;
 let cells="";
 for(let i=0;i<100;i++) cells += `<i class="${i<kept?"k":i<kept+debt?"d":"s"}"></i>`;
 $$("waffle").innerHTML = cells;
 if($$("heroNote")) $$("heroNote").innerHTML=dataCaveat();
 const name = "Niyaz";
 const verdictTone = M.cashKeptRate>=20 ? "You are building." : M.cashKeptRate>=8 ? "You are treading water." : "The money is leaking faster than it grows.";
 $$("heroTitle").innerHTML = `For every ${CUR} 100 you earn, you keep <span style="color:#5FD8A4">${kept}</span>.`;
 $$("heroVerdict").innerHTML =
  `${verdictTone} Across ${M.fullMonths.length} full months: real income averaged <b>${money(M.avg.income)}</b>/month, spending <b>${money(M.avg.spend)}</b>, debt payments <b>${money(M.avg.debtpay)}</b> — leaving <b>${money(M.avg.net)}</b> in your pocket. `
  + (M.totalBorrowed>0 ? `And <b>${money(M.totalBorrowed)}</b> of your inflow was borrowed, not earned.` : ``);
}

/* Live month: envelope burn-down per category + the one action for today */
function renderThisMonth(){
 const box=$$("thisMonth"); if(!box) return;
 const card=box.closest(".card");
 if(!M){ if(card) card.style.display="none"; return; }
 if(card) card.style.display="";
 const cur=M.months[M.months.length-1]; if(!cur){ box.innerHTML=""; return; }
 const p=M.per[cur], day=Math.max(1,new Date().getDate()), left=Math.max(0,30.44-day);
 const bud=(typeof budgetFor==="function")?budgetFor():{};
 const rows=Object.entries(bud).map(([c,b])=>{
  const spent=p.byCat[c]||0, share=b>0?spent/b*100:0;
  return {c,b,spent,share,over:spent>b};
 }).sort((a,b)=>b.share-a.share).slice(0,6);
 const over=rows.filter(r=>r.over);
 const outSoFar=p.spend+p.debtpay+p.invest, inSoFar=p.income+p.refund;
 const pace=(M.avg.spend+M.avg.debtpay+M.avg.invest)*day/30.44;
 const worst=rows[0];
 box.innerHTML=`<div class="kpis" style="grid-template-columns:repeat(3,1fr)">`
  +kpiCard("Out so far this month",money(outSoFar),`day ${day} · pace says ${money(Math.round(pace))}`, outSoFar<=pace?"ok":"bad")
  +kpiCard("In so far",money(inSoFar),"salary, refunds","ok")
  +kpiCard("Kept so far",money(inSoFar-outSoFar),`${left>0?Math.round(left)+" days left to protect it":"month closing"}`, inSoFar-outSoFar>=0?"ok":"bad")
  +`</div>`
  + rows.map(r=>`<div class="envrow"><span class="envname">${esc(r.c)}</span>
     <span class="envtrack"><i style="width:${Math.min(100,r.share)}%;background:${r.over?"var(--coral)":r.share>80?"var(--amber)":"var(--leaf)"}"></i></span>
     <span class="envval num">${fmt0(r.spent)}<small>/${fmt0(r.b)}</small></span></div>`).join("")
  + insight(over.length
     ? `<b>${over.length}</b> ${over.length===1?"envelope is":"envelopes are"} already over for ${monthShort(cur)}: ${over.map(o=>esc(o.c)+" by "+money(o.spent-o.b)).join(", ")}.`
     : worst? `Tightest envelope: <b>${esc(worst.c)}</b> at ${pct(worst.share)} used with ${Math.round(left)} days to go.`
            : `No budgets set yet — the CFO view proposes them from your own history in one tap.`,
    over.length ? `freeze ${esc(over[0].c)} for the rest of ${monthShort(cur)}; every ${CUR} not spent there is kept.`
                : `keep ${worst?esc(worst.c):"discretionary spend"} under its envelope for the remaining ${Math.round(left)} days.`);
}
function renderOverview(){
 const a = M.avg, cls=(v,g,w)=>v>=g?"ok":v>=w?"warn":"bad";
 const srCls = cls(M.cashKeptRate,20,10);
 const dbCls = M.debtBurden<15?"ok":M.debtBurden<30?"warn":"bad";
 const totalDebt = M.loanList.reduce((s,l)=>s+l.balance,0);
 $$("kpis").innerHTML =
  kpiCard("Avg monthly income (real)", money(a.income), `+ ${money(a.refund)} refunds & cashback`, "ok")
 +kpiCard("Avg monthly spending", money(a.spend), `${money(a.spend/30.44)} per day`, a.spend<a.income*0.6?"ok":a.spend<a.income*0.8?"warn":"bad")
 +kpiCard("Net savings / month", money(a.net), `savings rate ${pct(M.cashKeptRate)}`, srCls)
 +kpiCard("Debt outstanding", money(totalDebt), `${M.loanList.length} active loans · ${pct(M.debtBurden)} of income goes to debt`, dbCls)
 +kpiCard("Cash built over period", money(M.cumNet), `${M.fullMonths.length} full months on file`, M.cumNet>0?"ok":"bad")
 +kpiCard("Emergency buffer", (Math.round(M.bufferMonths*10)/10)+" mo", "target 6 months of outflow", M.bufferMonths>=6?"ok":M.bufferMonths>=2?"warn":"bad")
 +kpiCard("Borrowed inflow", money(M.totalBorrowed), `${pct(M.borrowShare)} of everything that came in`, M.borrowShare<3?"ok":M.borrowShare<10?"warn":"bad")
 +kpiCard("Invested so far", money(M.totalInvest), `${pct(M.avg.income? M.avg.invest/M.avg.income*100:0)} of income`, M.totalInvest>a.income?"ok":M.totalInvest>0?"warn":"bad");

 // gauge
 const s=M.score, col = s>=70?"var(--leaf)":s>=45?"var(--amber)":"var(--coral)";
 const C=2*Math.PI*70;
 $$("gauge").innerHTML = `<svg width="170" height="170"><circle cx="85" cy="85" r="70" fill="none" stroke="var(--line2)" stroke-width="14"/>
  <circle cx="85" cy="85" r="70" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round"
   stroke-dasharray="${C}" stroke-dashoffset="${C*(1-s/100)}"/></svg>
  <div class="gv"><b class="num">${s}</b><span>${s>=70?"Disciplined":s>=45?"Recovering":"At risk"}</span></div>`;
 $$("factors").innerHTML = M.factors.map(f=>{
  const fc = f.val>=70?"var(--leaf)":f.val>=45?"var(--amber)":"var(--coral)";
  return `<div class="factor"><span>${f.name} <span style="color:var(--grey)">(${f.w}%)</span></span>
   <span class="bar"><i style="width:${Math.round(f.val)}%;background:${fc}"></i></span>
   <span class="num">${Math.round(f.val)}</span></div>`; }).join("");
 const worst=[...M.factors].sort((a,b)=>a.val-b.val)[0];
 const second=[...M.factors].sort((a,b)=>a.val-b.val)[1];
 $$("scoreWhy").innerHTML = insight(
  `Your score is <b>${s}/100</b>. It is being dragged down mostly by <b>${worst.name.toLowerCase()}</b> (${worst.disp} — ${worst.why}) and <b>${second.name.toLowerCase()}</b> (${second.disp}).`,
  worst.name==="Savings rate" ? `move a fixed ${money(Math.max(500,M.avg.income*0.1))} to savings the day salary lands — before any spending.` :
  worst.name==="Debt burden" ? `add ${money(500)}/month extra to the highest-rate loan (see Debt plan).` :
  worst.name==="Investing" ? `restart the SIP and automate ${money(Math.max(200,M.avg.income*0.05))}/month.` :
  `see the Cut costs tab — the top 3 leaks alone free ${money(900)}+/month.`);

 // trend chart
 const L = M.fullMonths;
 chart("chTrend", {type:"bar", data:{labels:L, datasets:[
  {label:"Real income", data:L.map(m=>M.per[m].income+M.per[m].refund), backgroundColor:"#33628F99", borderRadius:4, order:2},
  {label:"Spending", data:L.map(m=>M.per[m].spend), backgroundColor:"#CF443399", borderRadius:4, order:2},
  {label:"Debt payments", data:L.map(m=>M.per[m].debtpay), backgroundColor:"#B7811F99", borderRadius:4, order:2},
  {label:"Kept (net)", type:"line", data:L.map(m=>M.per[m].net), borderColor:"#1B9E6B", backgroundColor:"#1B9E6B",
   tension:.3, borderWidth:2.5, pointRadius:3, order:1}]},
  options:{maintainAspectRatio:false, interaction:{mode:"index",intersect:false},
   scales:{x:{grid:{display:false}}, y:{ticks:{callback:v=>fmt0(v)}}},
   plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});

 // honest income statement
 const grand = M.totalIncome+M.totalRefund;
 $$("honest").innerHTML =
  kpiCard("Actually earned", money(M.totalIncome), "salary, rent & other real income","ok")
 +kpiCard("Refunds & cashback", money(M.totalRefund), "money clawed back — good habit","ok")
 +kpiCard("Borrowed", money(M.totalBorrowed), "loan disbursements that looked like income","bad")
 +kpiCard("Spent on life", money(M.totalSpend), pct(grand?M.totalSpend/grand*100:0)+" of real inflow","warn")
 +kpiCard("Paid to lenders", money(M.totalDebtpay), "principal + interest + fees","warn")
 +kpiCard("Put into investments", money(M.totalInvest), M.totalInvest<1000?"almost nothing":"","bad");
 $$("honestInsight").innerHTML = insight(
  `Counting borrowed money as income hides the truth. Real position: earned <b>${money(grand)}</b>, all-in outflow <b>${money(M.totalSpend+M.totalDebtpay+M.totalInvest)}</b>, kept <b>${money(M.cumNet)}</b>. `+
  (M.totalBorrowed>M.totalInvest*5?`You borrowed <b>${fmt0(M.totalInvest?M.totalBorrowed/M.totalInvest:999)}×</b> more than you invested over this period.`:``),
  "from today, record loan disbursements in a 'Loan In' category, never 'Income'.");
 renderThisMonth();
}
function renderSpending(){
 const sel = $$("spendPeriod");
 if(sel.options.length===1) M.months.slice().reverse().forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; sel.appendChild(o); });
 const period = sel.value;
 const inP = t => period==="all" || t.month===period;
 const cats={};
 M.txns.forEach(t=>{ if(t.kind==="expense" && inP(t)) cats[t.cat]=(cats[t.cat]||0)+(-t.amt); });
 const entries = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
 const tot = entries.reduce((a,e)=>a+e[1],0);
 const nM = period==="all" ? M.fullMonths.length : 1;
 $$("spendSub").textContent = period==="all" ? `Total ${CUR} ${fmt0(tot)} across ${M.fullMonths.length} full months.` : `${period}: ${CUR} ${fmt0(tot)}.`;

 chart("chCat", {type:"doughnut", data:{labels:entries.map(e=>e[0]),
  datasets:[{data:entries.map(e=>e[1]), backgroundColor:entries.map((e,i)=>catColor(i)), borderWidth:0}]},
  options:{maintainAspectRatio:false, cutout:"58%",
   plugins:{legend:{position:"right"}, tooltip:{callbacks:{label:c=>` ${c.label}: ${money(c.parsed)} (${pct(c.parsed/tot*100)})`}}}}});

 // treemap (slice-and-dice CSS flex)
 const top = entries.slice(0,10); const rest = entries.slice(10).reduce((a,e)=>a+e[1],0);
 if(rest>0) top.push(["Other",rest]);
 $$("treemap").innerHTML = top.map((e,i)=>{
  const share=e[1]/tot;
  return `<div class="tm" style="flex:${Math.max(share*100,4)} 1 ${Math.max(share*300,70)}px;background:${catColor(i)}">
   <b>${esc(e[0])}</b><span class="num">${money(e[1])} · ${pct(share*100)}</span></div>`; }).join("");

 // stacked monthly
 const L=M.fullMonths, topCats = Object.entries(M.catTotal).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);
 const ds = topCats.map((c,i)=>({label:c, data:L.map(m=>M.per[m].byCat[c]||0), backgroundColor:catColor(i), stack:"s", borderRadius:2}));
 ds.push({label:"Other", data:L.map(m=>{ let s=M.per[m].spend; topCats.forEach(c=>s-=M.per[m].byCat[c]||0); return Math.max(0,s); }), backgroundColor:"#9AA59E", stack:"s"});
 chart("chStack", {type:"bar", data:{labels:L, datasets:ds},
  options:{maintainAspectRatio:false, scales:{x:{stacked:true,grid:{display:false}}, y:{stacked:true,ticks:{callback:v=>fmt0(v)}}},
   plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});

 // merchants
 const mer = Object.entries(M.merch).filter(([k,v])=>{
   if(period==="all") return true;
   return M.txns.some(t=>t.kind==="expense"&&t.nm===k&&t.month===period);
  }).map(([k,v])=>{
   if(period==="all") return {k, sum:v.sum, n:v.n};
   let s=0,n=0; M.txns.forEach(t=>{ if(t.kind==="expense"&&t.nm===k&&t.month===period){s+=-t.amt;n++;} });
   return {k, sum:s, n};
  }).sort((a,b)=>b.sum-a.sum).slice(0,12);
 const mmax = mer[0]?mer[0].sum:1;
 $$("merchants").innerHTML = mer.map(m=>
  `<div class="leak"><div class="nm"><b>${esc(m.k)}</b><span>${m.n} transactions</span></div>
   <div style="flex:1.2"><div class="bar"><i style="width:${m.sum/mmax*100}%;background:var(--blue)"></i></div></div>
   <div class="amt"><b class="num" style="color:var(--ink)">${money(m.sum)}</b></div></div>`).join("");

 // category table
 let ct = `<thead><tr><th>Category</th><th class="r">Total</th><th class="r">Per month</th><th class="r">Share</th><th class="r">Txns</th></tr></thead><tbody>`;
 entries.forEach(e=>{
  const n = M.txns.filter(t=>t.kind==="expense"&&t.cat===e[0]&&inP(t)).length;
  ct += `<tr><td>${esc(e[0])}</td><td class="r num">${money(e[1])}</td><td class="r num">${money(e[1]/nM)}</td><td class="r num">${pct(e[1]/tot*100)}</td><td class="r num">${n}</td></tr>`; });
 $$("catTable").innerHTML = ct+"</tbody>";

 renderTxTable();
}
function renderTxTable(){
 const q = $$("txSearch").value.toLowerCase();
 const period = $$("spendPeriod").value;
 const rows = M.txns.filter(t=> (period==="all"||t.month===period) &&
   (!q || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q))).slice().reverse().slice(0,600);
 $$("txCount").textContent = rows.length+" transactions shown (newest first, max 600).";
 let h = `<thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Kind</th><th class="r">Amount</th></tr></thead><tbody>`;
 rows.forEach(t=>{
  h += `<tr><td class="num">${t.ds}</td><td style="white-space:normal;max-width:340px">${esc(t.desc)}</td><td>${esc(t.cat)}</td>
   <td><span class="pill ${t.kind==="income"?"ok":t.kind==="borrowed"?"bad":t.kind==="debtpay"?"warn":t.kind==="refund"?"info":t.kind==="invest"?"info":"warn"}" style="${t.kind==="expense"?"background:var(--line2);color:var(--grey)":""}">${t.kind}</span></td>
   <td class="r num ${t.amt<0?"neg":"pos"}">${money(t.amt)}</td></tr>`; });
 $$("txTable").innerHTML = h+"</tbody>";
}




"use strict";
/* =============== 4b. MONTH-ON-MONTH TAB (pipeline "Yearly Chart" pattern) =============== */
const MN2=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MST={hl:"all", view:"bars", metric:"out"};
const METRICS={out:["Money out","spend + EMIs + investing"], inc:["Money in","salary, rent, cashback"], kept:["Kept","what stayed with you"]};
function mval(p,met){ if(!p) return null;
 return met==="inc" ? p.income+p.refund : met==="kept" ? p.net : p.spend+p.debtpay+p.invest; }
function yearsOf(){ return [...new Set(M.months.map(m=>m.slice(0,4)))].sort(); }
function ycol(y,ys){ const pal=["#8B978F","#33628F","#B7811F","#5B4B97"];
 return y===ys[ys.length-1] ? "#1B9E6B" : pal[ys.indexOf(y)%pal.length]; }

/* projection: half recent 3-month run-rate, half same-month-last-year (when it exists) */
function projNext(k){
 const last=M.months[M.months.length-1], out=[];
 const l3=M.fullMonths.slice(-3);
 const ra=key=>l3.reduce((a,m)=>a+mval(M.per[m],key),0)/(l3.length||1);
 for(let i=1;i<=k;i++){
  const d=new Date(last+"-01T00:00:00"); d.setMonth(d.getMonth()+i);
  const mm=d.toISOString().slice(0,7), ly=(+mm.slice(0,4)-1)+mm.slice(4);
  const pLY=M.per[ly];
  const o={m:mm, proj:true};
  for(const key of ["out","inc","kept"]){
   const r=ra(key), s=pLY?mval(pLY,key):null;
   o[key]= s!=null ? 0.5*r+0.5*s : r;
  }
  o.seasonal = pLY && mval(pLY,"out") > M.avg.spend+M.avg.debtpay+M.avg.invest ? mval(pLY,"out") : null;
  if(pLY){ const cats=Object.entries(pLY.byCat).sort((a,b)=>b[1]-a[1]); o.driver=cats[0]?cats[0][0]:null; o.driverAmt=cats[0]?cats[0][1]:0; }
  out.push(o);
 }
 return out;
}
function cautions(){
 const avgOut=M.avg.spend+M.avg.debtpay+M.avg.invest, list=[];
 projNext(3).forEach(p=>{ if(p.seasonal && p.seasonal>avgOut*1.15){
  list.push({sev:p.seasonal>avgOut*1.5?"High":"Medium",
   txt:`<b>${monthShort(p.m)}</b> is historically expensive: same month last year cost <b>${money(p.seasonal)}</b> vs your ${money(avgOut)} average${p.driver?`, driven by <b>${esc(p.driver)}</b> (${money(p.driverAmt)})`:""}.`,
   act:`pre-decide a ${monthShort(p.m)} cap of ${money(Math.round(avgOut*1.05))} before the month starts.`}); }});
 const nM3=M.fullMonths.slice(-3);
 Object.entries(M.catTotal).forEach(([c,tot])=>{
  const all=tot/(M.fullMonths.length||1);
  const rec=nM3.reduce((a,m)=>a+(M.per[m].byCat[c]||0),0)/(nM3.length||1);
  if(rec>all*1.35 && rec-all>=100) list.push({sev:"Medium",
   txt:`<b>${esc(c)}</b> is trending up: ${money(rec)}/month lately vs ${money(all)} normally — lifestyle inflation in motion.`,
   act:`return ${esc(c)} to ${money(Math.round(all))} next month; the difference goes to the loan.`});
 });
 const surge=M.dailyAvgSpend?M.postSalDaily/M.dailyAvgSpend:1;
 if(surge>=1.15) list.push({sev:"Medium",
  txt:`Salary-day surge: daily spend runs <b>${Math.round(surge*10)/10}×</b> normal in the 3 days after payday.`,
  act:`move the savings standing order to salary day, before the surge can happen.`});
 if(M.borrowShare>0) list.push({sev:"High",
  txt:`<b>${pct(M.borrowShare)}</b> of inflow this period was new borrowing — the next expensive month will tempt another loan.`,
  act:`borrowing freeze stays on; expensive months are handled by the cap, not by credit.`});
 return list.sort((a,b)=>(a.sev==="High"?0:1)-(b.sev==="High"?0:1));
}

/* =============== 4c. CFO VIEW — corporate finance applied at home =============== */
const FIXEDCATS=["Rent","Utilities","Insurance","Internet","Mobile","Bills","School","Education"];
const ESSVARCATS=["Grocery","Groceries","Transport","Car","Fuel","Medicine","Health","Medical"];
function catClass(c){ return FIXEDCATS.includes(c)?"fixed":ESSVARCATS.includes(c)?"ess":"disc"; }
function feeScan(m){ let tot=0,n=0;
 m.txns.forEach(t=>{ if(t.kind!=="income"&&t.amt<0&&/fee|vat on|interest|finance charge|late payment/i.test(t.desc)){tot+=-t.amt;n++;} });
 return {tot,n};
}
function plModel(m){
 const nM=m.fullMonths.length||1, g=k=>m.sum(k)/nM;
 let F=0,E=0;
 Object.entries(m.catTotal).forEach(([c,v])=>{ const cl=catClass(c); if(cl==="fixed")F+=v; else if(cl==="ess")E+=v; });
 F/=nM; E/=nM;
 const rev=g("income")+g("refund"), spend=g("spend"), D=Math.max(0,spend-F-E);
 const op=rev-spend, P=g("debtpay"), I=g("invest"), net=op-P-I;
 return {rev,F,E,D,spend,op,opM:rev?op/rev*100:0,P,I,net,netM:rev?net/rev*100:0};
}
function cfModel(m){
 const op=m.totalIncome+m.totalRefund-m.totalSpend;
 const fin=m.totalBorrowed-m.totalDebtpay;
 const inv=-m.totalInvest;
 return {op, borrowedIn:m.totalBorrowed, repaid:m.totalDebtpay, fin, inv, net:op+fin+inv};
}
function breakevenModel(m){
 const p=plModel(m), committed=p.F+p.P;
 const day=p.rev>0?Math.min(31,Math.ceil(committed/(p.rev/30.44))):31;
 return {committed, share:p.rev?committed/p.rev*100:0, day, p};
}
function budgetLoad(){ try{ return JSON.parse(localStorage.getItem("kept_budget")||"{}"); }catch(e){ return {}; } }
function budgetSave(o){ try{ localStorage.setItem("kept_budget",JSON.stringify(o)); }catch(e){}
 if(typeof Sync!=="undefined"&&Sync.queuePush) Sync.queuePush(); }
function budgetFor(){
 const saved=budgetLoad(), nM=M.fullMonths.length||1, out={};
 Object.entries(M.catTotal).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([c,v])=>{
  const avg=v/nM, cl=catClass(c);
  out[c]= saved[c]!=null ? +saved[c] : Math.max(10,Math.round((cl==="disc"?avg*0.8:cl==="ess"?avg*0.95:avg)/10)*10);
 });
 return out;
}
function controlsModel(m){
 const lm=m.fullMonths[m.fullMonths.length-1], tx=m.txns.filter(t=>t.month===lm);
 const disc=tx.filter(t=>t.kind==="expense"&&catClass(t.cat)==="disc");
 const big=disc.filter(t=>-t.amt>=100).length;
 const micro=tx.filter(t=>t.kind==="expense"&&-t.amt<=25).length;
 const borrowed=tx.filter(t=>t.kind==="borrowed").reduce((a,t)=>a+t.amt,0);
 const invested=tx.filter(t=>t.kind==="invest").reduce((a,t)=>a-t.amt,0);
 const discSpend=disc.reduce((a,t)=>a-t.amt,0);
 const p=plModel(m);
 return {lm, rules:[
  {r:"Purchases ≥ "+CUR+" 100 in want-categories need a 24-hour approval", tgt:"≤ 3 unplanned", act:big+" purchases", ok:big<=3},
  {r:"Micro-purchases (≤ "+CUR+" 25) capped like petty cash", tgt:"≤ 30 / month", act:micro+" purchases", ok:micro<=30},
  {r:"Discretionary spend inside its envelope", tgt:money(Math.round(p.D)), act:money(Math.round(discSpend)), ok:discSpend<=p.D*1.05},
  {r:"Zero new borrowing — expenses are never financed", tgt:CUR+" 0", act:money(borrowed), ok:borrowed<=0},
  {r:"Pay-yourself-first transfer leaves on salary day", tgt:"> "+CUR+" 0 invested/saved", act:money(invested), ok:invested>0}
 ]};
}
function gapsModel(m){
 const fees=feeScan(m), nM=m.fullMonths.length||1, g=[];
 if(m.totalBorrowed>0) g.push({t:"“A loan is money in.”",
  ev:`${money(m.totalBorrowed)} of credit-card loans sat in your Income category, next to salary.`,
  fix:"A loan is negative money — future salary already spent. Book it as Debt In, never Income."});
 const smAll=m.small.reduce((a,t)=>a-t.amt,0);
 if(m.small.length>200) g.push({t:"“Small amounts don't count.”",
  ev:`${m.small.length} purchases of ${CUR} 25 or less add to ${money(smAll)} — ${pct(m.totalIncome?smAll/m.totalIncome*100:0)} of everything you earned.`,
  fix:"Corporates cap petty cash for exactly this reason. Count transactions, not just amounts."});
 if(fees.tot>50) g.push({t:"“Fees are just how banks work.”",
  ev:`${fees.n} pure-fee rows (processing fees, VAT on fees, FX fees) = ${money(fees.tot)} paid for the privilege of spending.`,
  fix:"Fees are a price like any other. One card, right currency, no CC loans — most of this goes to zero."});
 if(m.totalInvest < m.avg.income) g.push({t:"“Saving is what survives the month.”",
  ev:`Total invested over ${nM} months: ${money(m.totalInvest)} — less than one month's salary. Savings only happened when spending left room, which it rarely did.`,
  fix:"Reverse the order: savings leave on salary day by standing order; the month lives on the rest."});
 const be=breakevenModel(m);
 if(be.share>45) g.push({t:"“My salary is mine to spend.”",
  ev:`Fixed commitments + EMIs consume ${pct(be.share)} of income — your salary is spoken for until day ${be.day} of every month.`,
  fix:"Only the money after day "+be.day+" is a decision. Know your break-even like a CFO knows theirs."});
 const cf=cfModel(m);
 if(cf.op>0 && m.totalDebtpay>cf.op*0.5) g.push({t:"“I'm earning, so I'm getting ahead.”",
  ev:`Operating surplus over the period was ${money(cf.op)}, but ${money(m.totalDebtpay)} left for lenders — the surplus works for the bank, not for you.`,
  fix:"Track kept-after-financing as the only bottom line. Revenue is vanity, kept is sanity."});
 return g;
}
function renderCFO(){
 const p=plModel(M), cf=cfModel(M), be=breakevenModel(M), fees=feeScan(M);
 const row=(lb,v,cls,ind)=>`<tr class="${cls||""}"><td style="${ind?"padding-left:22px;color:var(--ink2)":""}">${lb}</td><td class="r num" style="font-weight:${cls?700:400}">${money(Math.round(v))}</td><td class="r num" style="color:var(--grey)">${p.rev?pct(v/p.rev*100):"—"}</td></tr>`;
 $$("plTable").innerHTML=`<thead><tr><th>Line — average / month</th><th class="r">Amount</th><th class="r">% of revenue</th></tr></thead><tbody>`
  +row("Revenue (salary + other + cashback)",p.rev,"h")
  +row("Committed costs (rent, utilities, bills)",-p.F,"",1)+row("Essential variable (grocery, transport, health)",-p.E,"",1)
  +row("Discretionary (food out, shopping, wants)",-p.D,"",1)
  +row("Operating surplus — before financing",p.op,"h")
  +row("Financing: EMIs & repayments",-p.P,"",1)+row("Investing",-p.I,"",1)
  +row("Net kept — the household's profit",p.net,"h")+"</tbody>";
 $$("plInsight").innerHTML=insight(
  `Operating margin <b>${pct(p.opM)}</b>; net margin <b style="color:${p.netM>=15?"var(--leaf)":p.netM>=5?"var(--amber)":"var(--coral)"}">${pct(p.netM)}</b>. A company running at ${pct(p.netM)} net would be in the boardroom explaining itself${p.D>p.net?` — discretionary spend (${money(Math.round(p.D))}) is ${p.net>0?fmt0(p.D/Math.max(1,p.net))+"× the profit":"eating the entire profit"}`:""}.`,
  `treat ${money(Math.round(p.D*0.8))} as the discretionary envelope; anything above needs the 24-hour approval rule.`);
 const crow=(lb,v,b)=>`<tr><td style="${b?"font-weight:700":""}">${lb}</td><td class="r num" style="font-weight:${b?700:400};color:${v>=0?"var(--leaf)":"var(--coral)"}">${(v>=0?"+":"")+fmt0(Math.round(v))}</td></tr>`;
 $$("cfTable").innerHTML=`<thead><tr><th>Section — whole period</th><th class="r">${CUR}</th></tr></thead><tbody>`
  +crow("Operating (earned − living costs)",cf.op,1)
  +crow("Financing: loans taken",cf.borrowedIn)+crow("Financing: repaid to lenders",-cf.repaid)+crow("Financing net",cf.fin,1)
  +crow("Investing",cf.inv,1)+crow("Net cash movement",cf.net,1)+"</tbody>";
 $$("cfInsight").innerHTML=insight(cf.op<0?
  `Living costs exceeded earnings by <b>${money(-cf.op)}</b> — the gap was financed by borrowing. That is a company burning cash to pay salaries.`:
  `You generated <b>${money(cf.op)}</b> from operations, but financing took <b>${money(cf.repaid)}</b> back out${cf.fin<0?` (net ${money(-cf.fin)} to lenders)`:""}. The operating engine works — the balance sheet is the problem.`,
  "goal for the next 12 months: financing net stays negative (repaying), operating stays positive, investing turns real.");
 $$("beBox").innerHTML=
  `<div class="kpis" style="grid-template-columns:repeat(3,1fr)">`
  +kpiCard("Fixed burn / month",money(Math.round(be.committed)),"rent + bills + EMIs — leaves before you choose", be.share<40?"ok":be.share<55?"warn":"bad")
  +kpiCard("Break-even day","Day "+be.day,"salary is spoken for until here", be.day<=12?"ok":be.day<=18?"warn":"bad")
  +kpiCard("Bank fees paid",money(Math.round(fees.tot)),fees.n+" pure-fee rows in the file", fees.tot<100?"ok":"bad")
  +`</div>`
  +insight(`${pct(be.share)} of revenue is committed before the month begins. Every fixed cost you cut is worth 12× its monthly value per year and lowers the day your money becomes yours.`,
   `pick one fixed cost this quarter (rent, a plan, a subscription) and renegotiate or kill it.`);
 const ctl=controlsModel(M);
 $$("ctlTable").innerHTML=`<thead><tr><th>Rule</th><th class="r">Target</th><th class="r">${monthShort(ctl.lm)} actual</th><th class="r">Status</th></tr></thead><tbody>`
  +ctl.rules.map(r=>`<tr><td style="white-space:normal">${r.r}</td><td class="r">${r.tgt}</td><td class="r num">${r.act}</td><td class="r"><span class="pill ${r.ok?"ok":"bad"}">${r.ok?"PASS":"FAIL"}</span></td></tr>`).join("")+"</tbody>";
 const passed=ctl.rules.filter(r=>r.ok).length;
 $$("ctlInsight").innerHTML=insight(`Controls passed: <b>${passed}/${ctl.rules.length}</b> in ${monthShort(ctl.lm)}. In a company, a failed control triggers a corrective action, not guilt.`,
  `next month's audit re-runs automatically on upload — pick the one FAIL you will flip first.`);
 renderBudget();
 const gaps=gapsModel(M);
 $$("gapsBox").innerHTML=gaps.map((g,i)=>
  `<div class="insight"><b>Gap ${i+1} — ${g.t}</b><br><span style="color:var(--ink2)">Evidence: ${g.ev}</span><span class="act">New model: ${g.fix}</span></div>`).join("");
}
function renderBudget(){
 const bud=budgetFor(), nM=M.fullMonths.length||1, lm=M.fullMonths[M.fullMonths.length-1];
 let within=0, n=0, h=`<thead><tr><th>Category</th><th class="r">Avg / month</th><th class="r">Budget (edit)</th><th class="r">${monthShort(lm)} actual</th><th class="r">Variance</th><th class="r">Status</th></tr></thead><tbody>`;
 Object.entries(bud).forEach(([c,bv])=>{
  const avg=(M.catTotal[c]||0)/nM, act=M.per[lm].byCat[c]||0, va=bv-act; n++; if(va>=0)within++;
  h+=`<tr><td>${esc(c)} <span style="color:var(--grey);font-size:11px">${catClass(c)==="fixed"?"fixed":catClass(c)==="ess"?"essential":"discretionary"}</span></td>
   <td class="r num">${fmt0(avg)}</td>
   <td class="r"><input class="inp bud" data-c="${esc(c)}" type="number" value="${bv}" style="width:90px;text-align:right"></td>
   <td class="r num">${fmt0(act)}</td>
   <td class="r num" style="color:${va>=0?"var(--leaf)":"var(--coral)"};font-weight:700">${(va>=0?"+":"")+fmt0(va)}</td>
   <td class="r"><span class="pill ${va>=0?"ok":"bad"}">${va>=0?"WITHIN":"OVER"}</span></td></tr>`;
 });
 const tot=Object.values(bud).reduce((a,v)=>a+v,0);
 $$("bvTable").innerHTML=h+"</tbody>";
 $$("bvInsight").innerHTML=insight(
  `Budget compliance in ${monthShort(lm)}: <b>${within}/${n}</b> categories within envelope. Total budgeted: <b>${money(tot)}</b> against average revenue ${money(Math.round(M.avg.income+M.avg.refund))} — leaving <b style="color:${(M.avg.income+M.avg.refund-tot)>0?"var(--leaf)":"var(--coral)"}">${money(Math.round(M.avg.income+M.avg.refund-tot))}</b> pre-assigned to savings and debt before the month starts.`,
  `zero-based rule: if a category has no budget line, it has no money. Adjust the numbers above until the leftover matches your savings target.`);
}


/* current calendar year, month by month: actuals for closed months, fixed + projected for coming months */
function yearOutlook(){
 const ys=yearsOf(), y=ys[ys.length-1];
 const last=M.months[M.months.length-1], lastIdx=+last.slice(5)-1;
 const pj=(11-lastIdx)>0?projNext(11-lastIdx):[];
 const be=breakevenModel(M);
 const rows=[];
 for(let i=0;i<12;i++){
  const key=y+"-"+String(i+1).padStart(2,"0"), p=M.per[key];
  if(p){
   let F=p.debtpay; Object.entries(p.byCat).forEach(([c,v])=>{ if(catClass(c)==="fixed")F+=v; });
   const out=mval(p,"out"), inn=mval(p,"inc");
   rows.push({m:key,label:MN2[i],inn,out,F,V:Math.max(0,out-F),kept:p.net,
    status: key===last&&M.lastPartial?"In progress":"Closed", part:key===last&&M.lastPartial});
  } else if(key>last){
   const pr=pj.find(x=>x.m===key);
   if(pr) rows.push({m:key,label:MN2[i],inn:pr.inc,out:pr.out,F:Math.min(be.committed,pr.out),V:Math.max(0,pr.out-be.committed),kept:pr.kept,status:"Projected",proj:true});
  }
 }
 return {y,rows,committed:be.committed};
}
/* combined bar+line SVG for the year outlook: solid = actual, shaded+dashed = projected (pipeline "Yearly Chart" style) */
function yearSVG(yo){
 const rows=yo.rows.filter(r=>r.status!=="—"), W=1000,H=330,L=70,R=14,T=28,B=44;
 let max=1; rows.forEach(r=>{max=Math.max(max,r.out||0,r.inn||0);}); const top=niceTop(max);
 const iw=(W-L-R)/12, bw=Math.min(44,iw*0.55);
 let x='<svg viewBox="0 0 '+W+' '+(H+34)+'" width="100%" style="display:block">';
 for(let i=0;i<=4;i++){ const v=top*i/4, yy=T+(H-T-B)*(1-i/4);
  x+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="rgba(255,255,255,.12)"/>'
   +'<text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11" fill="#9DBFA9">'+fmt0(v)+'</text>'; }
 const cx=i=>L+iw*i+iw/2;
 yo.rows.forEach((r,i)=>{
  x+='<text x="'+cx(i)+'" y="'+(H-B+18)+'" text-anchor="middle" font-size="11.5" fill="#C7DACD">'+r.label+'</text>';
  if(r.status==="—"||r.out==null) return;
  const hh=(H-T-B)*(r.out/top), fh=(H-T-B)*((r.F||0)/top), bx=cx(i)-bw/2, by=H-B-hh;
  if(r.proj){
   x+='<rect x="'+bx+'" y="'+by.toFixed(1)+'" width="'+bw+'" height="'+Math.max(2,hh).toFixed(1)+'" rx="3" fill="#F08A7B" fill-opacity=".28" stroke="#F08A7B" stroke-opacity=".7" stroke-dasharray="5 4"/>';
   x+='<rect x="'+bx+'" y="'+(H-B-fh).toFixed(1)+'" width="'+bw+'" height="'+Math.max(2,fh).toFixed(1)+'" rx="3" fill="#F0B14C" fill-opacity=".38"/>';
  } else {
   x+='<rect x="'+bx+'" y="'+by.toFixed(1)+'" width="'+bw+'" height="'+Math.max(2,hh).toFixed(1)+'" rx="3" fill="#F08A7B" fill-opacity="'+(r.part?".5":".85")+'" style="transform-origin:'+cx(i)+'px '+(H-B)+'px;animation:growY .7s cubic-bezier(.22,.8,.3,1) '+(i*0.04).toFixed(2)+'s backwards"/>';
   x+='<rect x="'+bx+'" y="'+(H-B-fh).toFixed(1)+'" width="'+bw+'" height="'+Math.max(2,fh).toFixed(1)+'" rx="3" fill="#B7811F" fill-opacity=".9"/>';
  }
 });
 let dAct="", dProj="", prev=null;
 yo.rows.forEach((r,i)=>{ if(r.inn==null) return;
  const px=cx(i), py=H-B-(H-T-B)*(r.inn/top), pt=(prev==null?"M":"L")+px.toFixed(1)+" "+py.toFixed(1)+" ";
  if(r.proj){ if(prev&&!prev.proj) dProj+="M"+prev.x.toFixed(1)+" "+prev.y.toFixed(1)+" "; dProj+="L"===pt[0]?pt:pt.replace("M","L"); if(!dProj.startsWith("M"))dProj="M"+dProj.slice(1); }
  else dAct+=pt;
  prev={x:px,y:py,proj:r.proj};
 });
 if(dAct) x+='<path d="'+dAct+'" fill="none" stroke="#5FD8A4" stroke-width="3"/>';
 if(dProj) x+='<path d="'+dProj+'" fill="none" stroke="#5FD8A4" stroke-width="2.5" stroke-dasharray="6 5" stroke-opacity=".8"/>';
 yo.rows.forEach((r,i)=>{ if(r.inn==null) return;
  x+='<circle cx="'+cx(i)+'" cy="'+(H-B-(H-T-B)*(r.inn/top)).toFixed(1)+'" r="4" fill="#fff" stroke="#5FD8A4" stroke-width="2"'+(r.proj?' stroke-dasharray="2 2"':'')+'/>'; });
 const lg=[["#F08A7B","Money out — actual",.85],["#B7811F","of which fixed + EMIs",.9],["#F08A7B","projected (dashed)",.3],["#5FD8A4","Money in (line)",1]];
 let lx=L; lg.forEach(g=>{ x+='<rect x="'+lx+'" y="'+(H+8)+'" width="12" height="12" rx="2" fill="'+g[0]+'" fill-opacity="'+g[2]+'"/><text x="'+(lx+17)+'" y="'+(H+18)+'" font-size="11.5" fill="#C7DACD">'+g[1]+'</text>'; lx+=g[1].length*6.4+40; });
 return '<div class="dchart">'+x+'</svg></div>';
}

function renderMonths(){
 const ys=yearsOf();
 // chips
 $$("momChips").innerHTML =
  `<span class="mlb">Highlight</span><span class="mchip ${MST.hl==="all"?"on":""}" data-mk="hl" data-v="all">All</span>`
  + ys.map(y=>`<span class="mchip ${MST.hl===y?"on":""}" data-mk="hl" data-v="${y}" style="border-left:4px solid ${ycol(y,ys)}">${y}</span>`).join("")
  + `<span class="mlb" style="margin-left:14px">View</span>`
  + ["bars","lines"].map(v=>`<span class="mchip ${MST.view===v?"on":""}" data-mk="view" data-v="${v}">${v[0].toUpperCase()+v.slice(1)}</span>`).join("")
  + `<span class="mlb" style="margin-left:14px">Metric</span>`
  + Object.keys(METRICS).map(k=>`<span class="mchip ${MST.metric===k?"on":""}" data-mk="metric" data-v="${k}">${METRICS[k][0]}</span>`).join("");
 $$("momTitle").textContent = `Yearly chart — ${METRICS[MST.metric][0]} (${METRICS[MST.metric][1]})`;
 // chart: one dataset per calendar year over Jan..Dec
 const dim=v=>MST.hl!=="all"&&MST.hl!==v;
 const ds=ys.map(y=>{ const col=ycol(y,ys);
  return { label:y, data:MN2.map((_,i)=>{ const key=y+"-"+String(i+1).padStart(2,"0"); return M.per[key]?Math.round(mval(M.per[key],MST.metric)):null; }),
   backgroundColor:dim(y)?col+"33":col+"CC", borderColor:dim(y)?col+"44":col, borderWidth:MST.view==="lines"?(dim(y)?1.5:3):1,
   tension:.3, spanGaps:true, pointRadius:dim(y)?2:4, pointBackgroundColor:"#fff", fill:false, borderRadius:4 }; });
 chart("chMoM",{type:MST.view==="lines"?"line":"bar",
  data:{labels:MN2,datasets:ds},
  options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
   plugins:{legend:{position:"top"}},scales:{y:{beginAtZero:true}}}});
 // per-month cards for the latest year: vs same month prior year
 const yNow=ys[ys.length-1], yPrev=ys.length>1?ys[ys.length-2]:null;
 $$("momCards").innerHTML = MN2.map((nm,i)=>{
  const key=yNow+"-"+String(i+1).padStart(2,"0"), pkey=yPrev?yPrev+"-"+String(i+1).padStart(2,"0"):null;
  const v=M.per[key]?mval(M.per[key],MST.metric):null, pv=pkey&&M.per[pkey]?mval(M.per[pkey],MST.metric):null;
  let d="<b>—</b> vs prior year";
  if(v!=null&&pv!=null){ const dd=v-pv, good=MST.metric==="out"?dd<=0:dd>=0;
   d=`<b style="color:${good?"var(--leaf)":"var(--coral)"}">${dd>=0?"▲":"▼"} ${fmt0(Math.abs(dd))}</b> vs ${yPrev}`; }
  return `<div class="mcard"><div class="mm">${nm}</div><div class="mv num">${v!=null?fmt0(v):"—"}</div><div class="md">${d}</div></div>`;
 }).join("");
 // forecast
 const pj=projNext(3), inAvg=Math.round(pj[0].inc);
 $$("momForecast").innerHTML = pj.map(p=>
  `<div class="insight"><b>${monthShort(p.m)}</b> — projected out: <b>${money(Math.round(p.out))}</b>, projected kept: <b style="color:${p.kept>=0?"var(--leaf)":"var(--coral)"}">${money(Math.round(p.kept))}</b>${p.seasonal?` · <span style="color:var(--coral)">seasonally expensive month</span>`:""}</div>`).join("")
  + insight(`Three-month picture: about <b>${money(Math.round(pj.reduce((a,p)=>a+p.out,0)))}</b> will go out against ~${money(inAvg*3)} in if nothing changes.`,
    `decide now which projected month you will beat, and by how much — write the number down.`);
 // cautions
 const cl=cautions();
 $$("momCaution").innerHTML = cl.length? cl.map(c=>insight(`<b style="color:${c.sev==="High"?"var(--coral)":"var(--amber)"}">${c.sev}</b> · ${c.txt}`, c.act)).join("")
  : insight("No pattern-based warnings right now. The next upload re-checks this.","keep the streak: same rules next month.");
 // table
 const rows=M.months.map(m=>{ const p=M.per[m], ly=(+m.slice(0,4)-1)+m.slice(4), pl=M.per[ly];
  const dOut=pl? mval(p,"out")-mval(pl,"out") : null;
  const rate=p.income+p.refund>0? p.net/(p.income+p.refund)*100 : 0;
  return `<tr><td>${monthShort(m)}</td><td class="num">${fmt0(p.income+p.refund)}</td><td class="num">${fmt0(p.spend)}</td><td class="num">${fmt0(p.debtpay)}</td>
   <td class="num" style="color:${p.net>=0?"var(--leaf)":"var(--coral)"};font-weight:700">${fmt0(p.net)}</td><td class="num">${pct(rate)}</td>
   <td class="num" style="color:${dOut==null?"var(--grey)":dOut<=0?"var(--leaf)":"var(--coral)"}">${dOut==null?"—":(dOut>=0?"+":"")+fmt0(dOut)+" out"}</td></tr>`; }).reverse().join("");
 const prows=projNext(3).map(p=>
  `<tr style="opacity:.75"><td>${monthShort(p.m)} · <i>projected</i></td><td class="num">${fmt0(Math.round(p.inc))}</td><td class="num" colspan="2">${fmt0(Math.round(p.out))} out (all)</td>
   <td class="num" style="color:${p.kept>=0?"var(--leaf)":"var(--coral)"};font-weight:700">${fmt0(Math.round(p.kept))}</td><td class="num">${pct(p.inc>0?p.kept/p.inc*100:0)}</td><td class="num" style="color:var(--grey)">pattern</td></tr>`).join("");
 $$("momTable").innerHTML =
  `<tr><th>Month</th><th class="num">Money in</th><th class="num">Spend</th><th class="num">EMIs</th><th class="num">Kept</th><th class="num">Rate</th><th class="num">vs same month LY</th></tr>`
  + prows.split("</tr>").reverse().join("</tr>") + rows;
}
