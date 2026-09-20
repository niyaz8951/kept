"use strict";
function renderHabits(){
 // borrowed truth
 const bt = M.txns.filter(t=>t.kind==="borrowed");
 const perLoanPay = M.avg.debtpay;
 $$("borrowTruth").innerHTML =
  `<div class="g3">`+
  kpiCard("Borrowed over the period", money(M.totalBorrowed), bt.length+" disbursements", "bad")
 +kpiCard("Share of all inflow", pct(M.borrowShare), "money that must be paid back — with interest", M.borrowShare<3?"ok":"bad")
 +kpiCard("Now repaying", money(perLoanPay)+"/mo", pct(M.debtBurden)+" of every salary", M.debtBurden<15?"ok":"bad")
 +`</div>`
 + insight(`Pattern detected: ${bt.length? "new credit-card loans were taken while old ones were still being repaid ("+bt.map(t=>t.month).join(", ")+"). Each new loan felt like income for one month and became a fixed cost for many." : "no new borrowing in this period — keep it that way."}`,
   bt.length? "declare a borrowing freeze: no new loans until at least two current ones are closed." : "keep the freeze on; redirect closed EMIs into savings.");

 // day of week
 const dowTot=M.dow.reduce((a,b)=>a+b,0);
 const wkndIdx=[0,5,6]; // Sun, Fri, Sat (Gulf weekend Fri/Sat + Sun)
 const wknd=(M.dow[5]+M.dow[6])/dowTot*100;
 $$("dowSub").textContent = `Fri+Sat carry ${pct(wknd)} of all spending.`;
 chart("chDow",{type:"bar",data:{labels:M.dowN,datasets:[{data:M.dow,
  backgroundColor:M.dowN.map((d,i)=>(i===5||i===6)?"#CF4433":"#33628F"),borderRadius:5}]},
  options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.parsed.y)}}},
  scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}}}});
 $$("dowInsight").innerHTML = wknd>32 ? insight(`Weekend spending is <b>${pct(wknd)}</b> of the total — clearly above the 2/7 baseline (~29%). Weekends are your expensive habitat: malls, dining, deliveries.`,"set a fixed weekend cash budget of "+money(Math.round(M.avg.spend*0.2))+" and stop when it's gone.")
  : insight(`Weekend share is <b>${pct(wknd)}</b> — close to neutral. Spending isn't driven by the weekend itself.`);

 // day of month
 chart("chDom",{type:"line",data:{labels:[...Array(31)].map((_,i)=>i+1),
  datasets:[{data:M.dom,borderColor:"#B7811F",backgroundColor:"#B7811F33",fill:true,tension:.35,pointRadius:0,borderWidth:2}]},
  options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.parsed.y)}}},
  scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}}}});
 const ratio = M.dailyAvgSpend? M.postSalDaily/M.dailyAvgSpend : 1;
 $$("domInsight").innerHTML = ratio>1.35 ?
  insight(`Salary-day effect confirmed: in the <b>3 days after salary</b> you spend <b>${(Math.round(ratio*10)/10)}×</b> your normal daily rate (${money(M.postSalDaily)}/day vs ${money(M.dailyAvgSpend)}/day). The money feels big, so it moves fast.`,
   "automate a transfer to savings on salary day itself — spend what's left, not save what's left.")
  : insight(`Post-salary spending is ${(Math.round(ratio*10)/10)}× your daily average — no dangerous salary-day spike.`,"still automate savings on salary day; discipline you don't need is discipline you keep.");

 // small purchases
 const smSum = M.small.reduce((a,t)=>a-t.amt,0), smAvg = smSum/(M.fullMonths.length||1);
 $$("smallSub").textContent = `${M.small.length} purchases of ${CUR} 25 or less — ${pct(M.smallShare)} of all spending.`;
 chart("chSmall",{type:"bar",data:{labels:M.fullMonths,datasets:[{data:M.fullMonths.map(m=>M.smallByM[m]||0),backgroundColor:"#CF443399",borderRadius:4}]},
  options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.parsed.y)}}},
  scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}}}});
 $$("smallInsight").innerHTML = insight(
  `<b>${M.small.length}</b> tiny swipes cost <b>${money(smSum)}</b> — that's <b>${money(smAvg)}/month</b>, <b>${money(smAvg*12)}/year</b>. Individually invisible, collectively a loan EMI.`,
  `for 14 days, no purchase under ${CUR} 25 without writing it down first. Friction kills impulse.`);

 // lifestyle inflation
 const first3 = M.roll3[Math.min(2,M.roll3.length-1)]||0, last = M.roll3[M.roll3.length-1]||0;
 const infl = first3? (last-first3)/first3*100 : 0;
 chart("chLife",{type:"line",data:{labels:M.fullMonths,datasets:[
  {label:"Discretionary / mo",data:M.discBy,borderColor:"#9AA59E",borderDash:[4,4],pointRadius:0,borderWidth:1.5,tension:.3},
  {label:"3-mo average",data:M.roll3,borderColor:"#CF4433",backgroundColor:"#CF443322",fill:true,pointRadius:0,borderWidth:2.5,tension:.3}]},
  options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}},
  scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}}}});
 $$("lifeInsight").innerHTML = infl>10 ?
  insight(`Lifestyle inflation detected: discretionary spending's rolling average moved from <b>${money(first3)}</b> to <b>${money(last)}</b> (<b>+${pct(infl)}</b>). Income rises are being absorbed by lifestyle, not savings.`,
   "cap discretionary at "+money(Math.round(first3))+"/month; route every future raise 50% to debt, 50% to savings.")
  : infl<-10 ? insight(`Discretionary spending is <b>down ${pct(-infl)}</b> versus the start — genuine improvement. Lock it in before it creeps back.`,"convert the reduction into an automatic transfer of "+money(Math.round(first3-last))+"/month.")
  : insight(`Discretionary spending is roughly flat (${pct(infl)} change). Stable, but flat spending with rising income should mean rising savings — check that it does.`);

 // recurring table
 let h=`<thead><tr><th>Merchant / charge</th><th>Category</th><th class="r">Months seen</th><th class="r">Avg per month</th><th class="r">Annualized</th></tr></thead><tbody>`;
 M.recurring.slice(0,15).forEach(r=>{
  h+=`<tr><td>${esc(r.name)}</td><td>${esc(r.cat)}</td><td class="r num">${r.monthsN}</td><td class="r num">${money(r.perMonth)}</td><td class="r num neg">${money(r.perMonth*12)}</td></tr>`;});
 $$("recurTable").innerHTML = h+"</tbody>";
}

/* ---------- cuts ---------- */
function buildCuts(){
 const cuts = {quick:[], med:[], major:[]};
 const nM = M.fullMonths.length||1;
 const catPM = c => (M.catTotal[c]||0)/nM;
 const push=(arr,name,why,save)=>{ if(save>=20) cuts[arr].push({name,why,save:Math.round(save)}); };

 // quick
 const smAvg = M.small.reduce((a,t)=>a-t.amt,0)/nM;
 push("quick","Freeze purchases under "+CUR+" 25","You average "+Math.round(M.small.length/nM)+" tiny buys/month.", smAvg*0.6);
 const subs = M.recurring.filter(r=>/E&|DIGITAL|APP|OSN|NETFLIX|SPOTIFY|PRIME|STARZ|ANGHAMI|MEMBER|SUBSCRIP/i.test(r.name));
 if(subs.length) push("quick","Cancel or downgrade digital subscriptions", subs.map(s=>s.name).join(", "), subs.reduce((a,s)=>a+s.perMonth,0)*0.7);
 const amz = Object.entries(M.merch).filter(([k])=>/AMAZON|NOON(?!.*MINUTES)|SHEIN|LANDMARK/i.test(k)).reduce((a,[k,v])=>a+v.sum,0)/nM;
 push("quick","24-hour rule on online shopping","Amazon/Noon-type orders average "+money(amz)+"/month.", amz*0.35);

 // medium
 const food = catPM("Food");
 push("med","Cook 2 more dinners a week","Dining & delivery run "+money(food)+"/month.", food*0.3);
 const groc = catPM("Grocery");
 if(groc>0) push("med","Weekly grocery list + one shop","Frequent top-up trips inflate grocery to "+money(groc)+"/month.", groc*0.12);
 push("med","Set a hard weekend budget","Weekends carry a heavy share of spending.", M.avg.spend*0.06);
 const laundry = catPM("Laundry"); if(laundry>25) push("med","Cut outsourced laundry to alternate weeks", money(laundry)+"/month currently.", laundry*0.4);

 // major
 const rent = catPM("Rent");
 if(rent>M.avg.income*0.3) push("major","Renegotiate or right-size housing","Rent is "+pct(rent/M.avg.income*100)+" of income (guideline: ≤30%).", rent*0.12);
 const elec = catPM("Electronics")+catPM("Jewellery");
 if(elec>150) push("major","12-month pause on electronics & jewellery","These averaged "+money(elec)+"/month — lumpy, high-regret categories.", elec*0.8);
 if(M.loanList.length>2) push("major","Consolidate the credit-card loans","Fewer, cheaper EMIs; stops the borrow-repay-borrow loop.", M.avg.debtpay*0.12);
 push("major","Automate savings on salary day","Pay yourself first — the only cut that is really a raise.", Math.max(300,M.avg.income*0.08));

 return cuts;
}
function renderCuts(){
 const cuts = buildCuts();
 const nM=M.fullMonths.length||1;
 // leaks: top annualized bleeds
 const leakItems=[];
 const add=(n,s,d)=>leakItems.push({n,s,d});
 const smAvg=M.small.reduce((a,t)=>a-t.amt,0)/nM;
 add("Small purchases ≤ "+CUR+" 25", smAvg, Math.round(M.small.length/nM)+" swipes a month");
 Object.entries(M.catTotal).filter(([c])=>DISCRET.includes(c)).sort((a,b)=>b[1]-a[1]).slice(0,5)
  .forEach(([c,v])=>add(c+" (discretionary)", v/nM, "category total "+money(v)));
 M.recurring.slice(0,4).forEach(r=>add("Recurring: "+r.name, r.perMonth, r.monthsN+" months running"));
 const feeSum = M.txns.filter(t=>t.kind==="expense"&&/fee|charge|vat on fee|processing/i.test(t.desc)).reduce((a,t)=>a-t.amt,0);
 if(feeSum>0) add("Bank & processing fees", feeSum/nM, "pure waste — "+money(feeSum)+" total");
 leakItems.sort((a,b)=>b.s-a.s);
 $$("leaks").innerHTML = leakItems.slice(0,10).map((l,i)=>
  `<div class="leak"><div class="rank num">${i+1}</div><div class="nm"><b>${esc(l.n)}</b><span>${esc(l.d)}</span></div>
   <div class="amt"><b class="num">${money(l.s)}/mo</b><span class="num">${money(l.s*12)}/year</span></div></div>`).join("");

 const block=(arr,el)=>{ $$(el).innerHTML = arr.map(c=>
  `<div class="checkline"><div><b>${esc(c.name)}</b><br><span style="color:var(--grey);font-size:12px">${esc(c.why)}</span></div>
   <span class="sv num">≈ ${money(c.save)}/mo</span></div>`).join("") || "<span class='section-note'>Nothing significant found here — good.</span>"; };
 block(cuts.quick,"cutsQuick"); block(cuts.med,"cutsMed"); block(cuts.major,"cutsMajor");

 const all=[...cuts.quick,...cuts.med,...cuts.major];
 $$("commitList").innerHTML = all.map((c,i)=>
  `<label class="checkline" style="cursor:pointer"><input type="checkbox" class="cmt" data-v="${c.save}" data-n="${esc(c.name)}">
   <div><b>${esc(c.name)}</b></div><span class="sv num">${money(c.save)}/mo</span></label>`).join("");
 document.querySelectorAll(".cmt").forEach(cb=>cb.addEventListener("change",updCommit));
 loadCommits(); updCommit();
}
function updCommit(){
 let s=0,n=0; document.querySelectorAll(".cmt").forEach(cb=>{ if(cb.checked){s+=+cb.dataset.v;n++;} });
 const yr=s*12;
 $$("commitTotal").innerHTML = n? `Pledged: <span class="num">${money(s)}/month → ${money(yr)}/year.</span> That is ${pct(M.avg.income?s/M.avg.income*100:0)} of income moved from leaks to savings.` : "Pledged: 0 — tick at least the quick wins.";
 try{ localStorage.setItem("mr_commits", JSON.stringify([...document.querySelectorAll(".cmt")].map(cb=>cb.checked))); }catch(e){}
}
function loadCommits(){ try{ const v=JSON.parse(localStorage.getItem("mr_commits")||"[]");
 document.querySelectorAll(".cmt").forEach((cb,i)=>cb.checked=!!v[i]); }catch(e){} }

/* ---------- debt ---------- */
function renderDebt(){
 const L=M.loanList, tot=L.reduce((a,l)=>a+l.balance,0), emi=L.reduce((a,l)=>a+l.emi,0);
 $$("debtKpis").innerHTML =
  kpiCard("Total outstanding", money(tot), L.length+" active loans", tot?"bad":"ok")
 +kpiCard("Combined EMIs", money(emi)+"/mo", pct(M.avg.income?emi/M.avg.income*100:0)+" of monthly income", emi<M.avg.income*0.15?"ok":"warn")
 +kpiCard("Paid to lenders so far", money(M.totalDebtpay), "over the whole period","warn")
 +kpiCard("Weighted avg rate", pct(tot? L.reduce((a,l)=>a+l.apr*l.balance,0)/tot :0)+" ", "estimates — edit below","warn");

 let h=`<thead><tr><th>Loan</th><th class="r">Balance</th><th class="r">APR %</th><th class="r">EMI</th><th class="r">Paid so far</th><th>Last payment</th></tr></thead><tbody>`;
 L.forEach((l,i)=>{ h+=`<tr><td>${esc(l.name)} ${l.est?'<span class="est">estimate</span>':""}</td>
  <td class="r"><input class="inp num lb-bal" data-i="${i}" type="number" value="${Math.round(l.balance)}" style="width:110px;text-align:right"></td>
  <td class="r"><input class="inp num lb-apr" data-i="${i}" type="number" step="0.5" value="${l.apr}" style="width:70px;text-align:right"> <span class="est">est.</span></td>
  <td class="r num">${money(l.emi)}</td><td class="r num">${money(l.paid)}</td>
  <td class="num">${l.lastPay?l.lastPay.toISOString().slice(0,10):"—"}</td></tr>`; });
 $$("loanTable").innerHTML = h+"</tbody>";
 document.querySelectorAll(".lb-bal").forEach(inp=>inp.addEventListener("change",e=>{ M.loanList[+e.target.dataset.i].balance=+e.target.value||0; M.loanList[+e.target.dataset.i].est=false; renderPayoff(); }));
 document.querySelectorAll(".lb-apr").forEach(inp=>inp.addEventListener("change",e=>{ M.loanList[+e.target.dataset.i].apr=+e.target.value||0; renderPayoff(); }));
 renderPayoff();
}
function renderPayoff(){
 const extra=+$$("extraPay").value; $$("extraLbl").textContent=money(extra);
 const L=M.loanList.filter(l=>l.balance>0);
 if(!L.length){ $$("payoffCompare").innerHTML="<div class='insight'>No active loans detected — nothing to simulate. If that's wrong, your sheet may be missing loan rows.</div>"; if(CH.chPayoff)CH.chPayoff.destroy(); $$("payoffReco").innerHTML=""; return; }
 const base=simulate(L,0,"snow"), snow=simulate(L,extra,"snow"), ava=simulate(L,extra,"ava");
 const start=M.months[M.months.length-1];
 const dfDate=n=>{ const d=new Date(start+"-01"); d.setMonth(d.getMonth()+n); return d.toLocaleDateString("en-GB",{month:"short",year:"numeric"}); };
 const labels=[...Array(Math.max(snow.series.length,ava.series.length,base.series.length))].map((_,i)=>i);
 chart("chPayoff",{type:"line",data:{labels,datasets:[
  {label:"Minimums only",data:base.series,borderColor:"#9AA59E",borderDash:[5,4],pointRadius:0,borderWidth:1.5},
  {label:"Snowball +"+fmt0(extra),data:snow.series,borderColor:"#33628F",pointRadius:0,borderWidth:2.2,tension:.2},
  {label:"Avalanche +"+fmt0(extra),data:ava.series,borderColor:"#1B9E6B",pointRadius:0,borderWidth:2.2,tension:.2}]},
  options:{maintainAspectRatio:false,scales:{x:{title:{display:true,text:"months from now"},grid:{display:false}},y:{ticks:{callback:v=>fmt0(v)}}},
  plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});
 const row=(n,s)=>`<div class="leak"><div class="nm"><b>${n}</b><span>debt-free ${dfDate(s.months)} · ${s.months} months</span></div>
  <div class="amt"><b class="num" style="color:var(--ink)">${money(s.interest)}</b><span>interest paid</span></div></div>`;
 $$("payoffCompare").innerHTML = row("Minimums only",base)+row("Snowball",snow)+row("Avalanche",ava)
  + `<div class="insight" style="margin-top:10px">Adding <b>${money(extra)}/month</b> saves <b>${money(Math.max(0,base.interest-ava.interest))}</b> in interest and brings freedom forward by <b>${Math.max(0,base.months-ava.months)} months</b>.</div>`;
 const diff=snow.interest-ava.interest;
 const firstKill = L.slice().sort((a,b)=>a.balance-b.balance)[0];
 const reco = diff>200
  ? `<b>Recommendation: Avalanche.</b> Your highest-rate debt is expensive enough that maths beats motivation — avalanche saves ${money(diff)} more than snowball. Target <b>${esc(L.slice().sort((a,b)=>b.apr-a.apr)[0].name)}</b> first.`
  : `<b>Recommendation: Snowball.</b> The interest difference is only ${money(Math.abs(diff))}, so take the psychology: kill <b>${esc(firstKill.name)}</b> (${money(firstKill.balance)}) first, feel the win, roll its EMI into the next loan.`;
 $$("payoffReco").innerHTML = insight(reco, "fix the extra payment as a standing order the day after salary, not a month-end leftover.");
}

/* ---------- save & grow ---------- */
function renderSave(){
 const inc=M.avg.income, ret=(+$$("retPct").value||0)/100;
 const scen=[{n:"Conservative",p:10,c:"#33628F"},{n:"Aggressive",p:20,c:"#B7811F"},{n:"Extreme",p:40,c:"#1B9E6B"}];
 const grow=(pm,years)=>{ const r=ret/12,n=years*12; return r? pm*((Math.pow(1+r,n)-1)/r) : pm*n; };
 $$("saveCards").innerHTML = scen.map(s=>{
  const pm=inc*s.p/100;
  return `<div class="kpi" style="border-left-color:${s.c}"><div class="lb">${s.n} — ${s.p}% of income</div>
   <div class="vl num">${money(pm)}<span style="font-size:13px;font-weight:600;color:var(--grey)">/mo</span></div>
   <div class="sb num">1y <b>${money(grow(pm,1))}</b> · 3y <b>${money(grow(pm,3))}</b> · 5y <b>${money(grow(pm,5))}</b> · 10y <b>${money(grow(pm,10))}</b></div></div>`; }).join("");
 const years=[...Array(11)].map((_,i)=>i);
 chart("chSave",{type:"line",data:{labels:years,datasets:scen.map(s=>({label:s.n+" ("+s.p+"%)",
  data:years.map(y=>grow(inc*s.p/100,y)),borderColor:s.c,backgroundColor:s.c+"22",pointRadius:2,borderWidth:2.2,tension:.25,fill:true}))},
  options:{maintainAspectRatio:false,scales:{x:{title:{display:true,text:"years"},grid:{display:false}},y:{ticks:{callback:v=>fmt0(v)}}},
  plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});

 // emergency fund
 const ess = ESSENTIAL.reduce((a,c)=>a+(M.catTotal[c]||0),0)/(M.fullMonths.length||1) + M.avg.debtpay;
 const target=ess*6, have=Math.max(0,M.cumNet), p=Math.min(100,have/target*100);
 $$("efund").innerHTML = `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
  <span>Built (cash kept): <b class="num">${money(have)}</b></span><span>Target: <b class="num">${money(target)}</b></span></div>
  <div class="bar" style="height:14px"><i style="width:${p}%"></i></div>
  <div class="section-note" style="margin-top:8px">Essentials + EMIs run ${money(ess)}/month; six months of that is your floor.</div>`
  + insight(p>=100?`Fully funded. Everything above ${money(target)} should now go to debt, then investments.` :
    `You are <b>${pct(p)}</b> of the way there — missing <b>${money(target-have)}</b>. At your current net of ${money(M.avg.net)}/month, that's <b>${M.avg.net>0?Math.ceil((target-have)/M.avg.net)+" months":"never (net is not positive)"}</b>.`,
    p<100?`open a separate account named 'Do not touch' and automate ${money(Math.max(300,Math.round(M.avg.income*0.1)))} into it on salary day.`:null);

 // budget vs actual
 const nM=M.fullMonths.length||1;
 const actual={Essentials:0,Lifestyle:0,Debt:M.avg.debtpay,Savings:Math.max(0,M.avg.net),Investing:M.avg.invest};
 for(const c in M.catTotal){ (ESSENTIAL.includes(c)?0:1)? actual.Lifestyle+=M.catTotal[c]/nM : actual.Essentials+=M.catTotal[c]/nM; }
 const rec={Essentials:.45,Lifestyle:.15,Debt:.20,Savings:.15,Investing:.05};
 const labels=Object.keys(rec);
 chart("chBudget",{type:"bar",data:{labels,datasets:[
  {label:"Recommended",data:labels.map(k=>rec[k]*M.avg.income),backgroundColor:"#1B9E6B99",borderRadius:4},
  {label:"Your actual",data:labels.map(k=>actual[k]),backgroundColor:"#CF443399",borderRadius:4}]},
  options:{maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}},
  plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});
 const gap=actual.Lifestyle-rec.Lifestyle*M.avg.income;
 $$("budgetInsight").innerHTML = insight(gap>50?
  `Lifestyle runs <b>${money(gap)}</b>/month over the recovery allocation. That gap is exactly your missing savings.`:
  `Lifestyle is within the recovery allocation — the constraint now is income and debt, not spending.`,
  gap>50?`move ${money(Math.round(gap/2))} of it to savings this month; the plan absorbs the other half gradually.`:null);
}

/* ---------- forecast & risks ---------- */
function renderForecast(){
 const f=M.fc, months=12, L=M.fullMonths;
 const start=new Date(L[L.length-1]+"-01");
 const flabels=[...Array(months)].map((_,i)=>{const d=new Date(start);d.setMonth(d.getMonth()+i+1);return d.toISOString().slice(0,7);});
 let cum=Math.max(0,M.cumNet); const cumSeries=[]; flabels.forEach(()=>{cum+=f.net; cumSeries.push(cum);});
 const totalDebt=M.loanList.reduce((a,l)=>a+l.balance,0);
 const sim=simulate(M.loanList,+($$("extraPay")?.value||500),"ava");
 const dfd=(n)=>{const d=new Date(start);d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-GB",{month:"short",year:"numeric"});};
 $$("fcKpis").innerHTML =
  kpiCard("Next month (projected)", money(f.net), `${money(f.income)} in − ${money(f.out)} out`, f.net>0?"ok":"bad")
 +kpiCard("Next quarter", money(f.net*3), "at current 3-month pace", f.net>0?"ok":"bad")
 +kpiCard("Cash in 12 months", money(cumSeries[11]), "if nothing changes", cumSeries[11]>M.cumNet?"ok":"bad")
 +kpiCard("Debt-free date", totalDebt? dfd(sim.months):"Now", totalDebt? "avalanche + current extra payment":"no active loans", totalDebt?"warn":"ok");
 const histNet=L.map(m=>M.per[m].net); let hc=0; const histCum=histNet.map(v=>hc+=v);
 chart("chForecast",{type:"line",data:{labels:[...L,...flabels],datasets:[
  {label:"Cash position (actual)",data:[...histCum,...Array(months).fill(null)],borderColor:"#33628F",backgroundColor:"#33628F22",fill:true,pointRadius:0,borderWidth:2.2,tension:.2},
  {label:"Cash position (projected)",data:[...Array(L.length-1).fill(null),histCum[histCum.length-1],...cumSeries],borderColor:"#1B9E6B",borderDash:[6,4],backgroundColor:"#1B9E6B1A",fill:true,pointRadius:0,borderWidth:2.2,tension:.2}]},
  options:{maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>fmt0(v)}},x:{grid:{display:false}}},
  plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+": "+money(c.parsed.y)}}}}});
 $$("fcInsight").innerHTML = insight(`At the recent pace you add <b>${money(f.net)}</b>/month. Every ${money(100)} cut from leaks moves the 12-month line up by ${money(1200)} — cuts compound faster than income raises because they repeat automatically.`,
  "re-upload next month's sheet and check this line moved up, not sideways.");

 // risks
 const risks=[];
 const R=(sev,name,why)=>risks.push({sev,name,why});
 if(M.cashKeptRate<10) R(4,"Savings rate below 10%","One bad month wipes out several good ones. This is the root risk behind everything else.");
 if(M.bufferMonths<2) R(4,"Emergency buffer under 2 months","A car repair or medical bill goes straight onto a credit card — restarting the debt loop.");
 if(M.debtBurden>25) R(3,"Debt burden above 25% of income","EMIs of "+money(M.avg.debtpay)+"/month crowd out saving and investing.");
 if(M.borrowShare>5) R(3,"Borrow-to-spend pattern","New loans were taken during the period. Borrowing to fund lifestyle compounds against you.");
 if(M.sd>M.avg.income*0.5) R(2,"Volatile cash flow","Monthly net swings ±"+money(M.sd)+" — budgeting by feel fails at this volatility.");
 if(M.smallShare>10) R(2,"Impulse micro-spending","Small buys are "+pct(M.smallShare)+" of spending — the leak with the least memory.");
 if(M.totalInvest<M.avg.income) R(2,"Nothing working for you","Total invested is under one month's income. Inflation quietly taxes idle cash.");
 const jw=(M.catTotal["Jewellery"]||0)+(M.catTotal["Electronics"]||0);
 if(jw>M.avg.income*1.5) R(1,"Lumpy big-ticket purchases","Jewellery + electronics totalled "+money(jw)+" — plan these as funded goals, not surprises.");
 risks.sort((a,b)=>b.sev-a.sev);
 const sevName=["","Low","Medium","High","Critical"], sevCls=["","info","warn","bad","bad"];
 $$("risks").innerHTML = risks.map(r=>`<div class="risk"><span class="pill ${sevCls[r.sev]}">${sevName[r.sev]}</span>
  <div class="body"><b>${r.name}</b><p>${r.why}</p></div></div>`).join("") || "<div class='insight'>No material risks detected. Rare — verify the data is complete.</div>";

 // anomalies
 const an=[];
 M.misfiled.forEach(t=>an.push(`<b>${esc(t.desc)}</b> (${t.ds}, ${money(t.amt)}) sits in the <b>Loan</b> category but looks like a normal purchase — recategorize it in the sheet.`));
 const exp=M.txns.filter(t=>t.kind==="expense");
 const mean=exp.reduce((a,t)=>a-t.amt,0)/(exp.length||1);
 const sd2=Math.sqrt(exp.reduce((a,t)=>a+((-t.amt)-mean)**2,0)/(exp.length||1));
 exp.filter(t=>-t.amt>mean+4*sd2).sort((a,b)=>a.amt-b.amt).slice(0,6)
  .forEach(t=>an.push(`Outlier: <b>${esc(t.desc)}</b> — ${money(-t.amt)} on ${t.ds} (${esc(t.cat)}). One-off or a pattern starting?`));
 $$("anoms").innerHTML = an.length? "<ul class='mono-list'>"+an.map(a=>`<li>${a}</li>`).join("")+"</ul>" : "<div class='section-note'>Nothing unusual found.</div>";
}

/* ---------- coach ---------- */
function renderCoach(){
 const good=[], bad=[];
 if(M.totalRefund>500) good.push(`You claw money back — ${money(M.totalRefund)} in cashback and refunds. That instinct is an asset.`);
 if(M.stability>60) good.push("Cash flow is reasonably steady month to month.");
 const closed = M.txns.filter(t=>/completed/i.test(t.rem)).length;
 if(closed) good.push("You have actually closed loans before ('completed' notes in your sheet) — you finish what you start when you focus.");
 if(M.cashKeptRate>=15) good.push(`A ${pct(M.cashKeptRate)} savings rate is above many households carrying this much debt.`);
 const lastN=M.per[M.fullMonths[M.fullMonths.length-1]]?.net||0;
 if(lastN>0) good.push(`Your latest full month ended positive (${money(lastN)}).`);
 if(!good.length) good.push("You uploaded the data and looked. Most people never do this part.");

 if(M.borrowShare>3) bad.push(`Borrowing while repaying: ${money(M.totalBorrowed)} of new loans arrived during the period. Each one converts next year's salary into this month's spending.`);
 if(M.smallShare>8) bad.push(`${M.small.length} micro-purchases — ${pct(M.smallShare)} of all spending happens in amounts you don't even remember.`);
 if(M.totalInvest<M.avg.income*0.5) bad.push(`Investing is nearly absent (${money(M.totalInvest)} total). Debt is being fought; wealth is not being built.`);
 if(M.debtBurden>20) bad.push(`${pct(M.debtBurden)} of income goes to lenders before you see it.`);
 const jw=M.catTotal["Jewellery"]||0; if(jw>3000) bad.push(`${money(jw)} on jewellery while carrying interest-bearing debt is the single most expensive decision on file.`);
 $$("coachGood").innerHTML="<ul class='mono-list'>"+good.map(g=>`<li>${g}</li>`).join("")+"</ul>";
 $$("coachBad").innerHTML="<ul class='mono-list'>"+bad.map(g=>`<li>${g}</li>`).join("")+"</ul>";

 const keepPct=Math.round(M.cashKeptRate);
 $$("reality").innerHTML =
  `<p style="font-size:14.5px;line-height:1.7">Out of every ${CUR} 100 earned, <b>${keepPct}</b> stayed with you. `+
  `${money(M.totalDebtpay)} went to lenders and ${money(M.totalSpend)} to lifestyle, while ${money(M.totalInvest)} — effectively nothing — went to your future. `+
  `The pattern in the data is not an income problem: it is a <b>retention problem</b>. Money arrives (sometimes borrowed to feel like it arrived), accelerates out within days of salary, and leaks through ${M.small.length} purchases too small to notice. `+
  `Nothing here is fatal — the same file shows you close loans when you decide to. The fix is boring and mechanical: automate savings on salary day, freeze new borrowing, kill loans in order, and make the leaks visible (they are now).</p>`;

 const plan={
  "This week":[`Move ${money(Math.max(300,Math.round(M.avg.income*0.1)))} to a separate savings account today`,
   "Tick your commitments in the Cut costs tab","Cancel one recurring charge you didn't remember having",
   `No purchases under ${CUR} 25 for 7 days`],
  "This month":[`Set a standing order: savings on salary day, extra ${money(+($$("extraPay")?.value||500))} to the target loan the day after`,
   "Fix the miscategorized rows listed in Anomalies","Set a weekend budget and track it once",
   "Recategorize loan disbursements as 'Loan In', not Income"],
  "90 days":["Close the smallest loan completely and roll its EMI forward","Emergency fund to 2 months of essentials",
   "One full month with zero new borrowing and zero jewellery/electronics","Re-upload monthly — the score must rise 2 of 3 months"],
  "12 months":["All credit-card loans closed (see Debt plan date)","Emergency fund at 6 months",
   `Savings rate at 20%+ (from ${pct(M.cashKeptRate)})`,"SIP running automatically at 5–10% of income"]
 };
 $$("plan").innerHTML = Object.entries(plan).map(([k,v])=>
  `<div><h4 style="margin-bottom:8px;color:var(--pine2)">${k}</h4><ul class="mono-list">${v.map(x=>`<li>${x}</li>`).join("")}</ul></div>`).join("");

 // accountability table
 const L=M.fullMonths;
 if(L.length>=2){
  const last=L[L.length-1], prev3=L.slice(-4,-1);
  const avgOf=(ms,fn)=>ms.reduce((a,m)=>a+fn(M.per[m]),0)/(ms.length||1);
  const rows=[
   ["Real income",p=>p.income,false],["Spending",p=>p.spend,true],["Debt payments",p=>p.debtpay,false],
   ["Net kept",p=>p.net,false],["Small purchases",null,true],["New borrowing",p=>p.borrowed,true]];
  let h=`<thead><tr><th>Metric</th><th class="r">${last}</th><th class="r">Avg prior 3 mo</th><th class="r">Change</th><th>Verdict</th></tr></thead><tbody>`;
  rows.forEach(([n,fn,lowerBetter])=>{
   let a,b;
   if(n==="Small purchases"){ a=M.smallByM[last]||0; b=avgOf(prev3,()=>0)||prev3.reduce((x,m)=>x+(M.smallByM[m]||0),0)/(prev3.length||1); }
   else { a=fn(M.per[last]); b=avgOf(prev3,fn); }
   const d=a-b, better = lowerBetter? d<0 : d>0;
   const vb = Math.abs(d)<Math.max(20,b*0.03) ? ["flat","info"] : better? ["improving","ok"] : ["worse","bad"];
   h+=`<tr><td>${n}</td><td class="r num">${money(a)}</td><td class="r num">${money(b)}</td>
    <td class="r num ${d>=0?(lowerBetter?"neg":"pos"):(lowerBetter?"pos":"neg")}">${d>=0?"+":""}${fmt0(d)}</td>
    <td><span class="pill ${vb[1]}">${vb[0]}</span></td></tr>`; });
  $$("acctTable").innerHTML=h+"</tbody>";
 }
}
