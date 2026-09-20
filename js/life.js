"use strict";
/* =============== LIFE MATH — brutal 10/20-year arithmetic + the path check =============== */
const Life = (() => {
 const DEF={age:32, retireAge:60, ret:7, infl:3, nw:0, kids:[], majors:[], kidCost:250000, targetRate:20, rampMonths:6};
 function prof(){ return Object.assign({},DEF,Store.meta("profile",{})); }
 function saveProf(p){ Store.setMeta("profile",p); }
 function fvMonthly(s,annualPct,years){ const r=annualPct/100/12,n=years*12;
  return r? s*((Math.pow(1+r,n)-1)/r) : s*n; }
 function fvLump(v,annualPct,years){ return v*Math.pow(1+annualPct/100,years); }
 function realRate(p){ return ((1+p.ret/100)/(1+p.infl/100)-1)*100; }

 /* the path: reach targetRate% keep-rate within rampMonths of the baseline month */
 function pathStatus(){
  if(!M||!M.fullMonths.length) return null;
  const p=prof();
  let base=Store.meta("pathBase",null);
  if(!base){ base={m:M.fullMonths[M.fullMonths.length-1], rate:Math.max(0,M.cashKeptRate)}; Store.setMeta("pathBase",base); }
  const lm=M.fullMonths[M.fullMonths.length-1];
  const dm=(new Date(lm+"-01") - new Date(base.m+"-01"))/(30.44*864e5);
  const should=Math.min(p.targetRate, base.rate + (p.targetRate-base.rate)*Math.max(0,Math.round(dm))/p.rampMonths);
  const pm=M.per[lm], inc=pm.income+pm.refund, actual=inc>0?pm.net/inc*100:0;
  const diff=actual-should;
  const amt=Math.round(Math.abs(diff)/100*inc);
  // month-to-date check on the partial month
  let mtd=null;
  if(M.lastPartial){
   const cur=M.months[M.months.length-1];
   const day=Math.max(1,+((M.txns.filter(t=>t.month===cur).slice(-1)[0]||{}).dateISO||"1").slice(8));
   const spent=mval(M.per[cur],"out");
   const budget=(M.avg.spend+M.avg.debtpay+M.avg.invest)*day/30.44;
   mtd={day,spent,budget,delta:spent-budget};
  }
  const ok=diff>=-2;
  return {ok, should, actual, diff, amt, lm, mtd,
   cls: ok ? (diff>=0?"ok":"warn") : "bad",
   short: ok? `on path: ${monthShort(lm)} kept ${pct(actual)} vs ${pct(should)} planned.`
            : `off path by ${money(amt)} in ${monthShort(lm)} — planned ${pct(should)}, actual ${pct(actual)}.`,
   line: ok? `ON PATH — ${monthShort(lm)} kept ${pct(actual)} against a plan of ${pct(should)}. Hold the line.`
           : `DEVIATION — ${monthShort(lm)} kept ${pct(actual)} vs the ${pct(should)} the ramp requires: ${money(amt)} slipped. The plan only works if the ramp holds.`};
 }

 function renderLife(){
  const p=prof();
  // profile form
  $$("lifeForm").innerHTML=[
   ["Age", "age"],["Retire at","retireAge"],["Expected return % / yr","ret"],["Inflation % / yr","infl"],
   ["Savings you hold today","nw"],["Cost of one child's degree (today)","kidCost"],["Target keep-rate %","targetRate"]
  ].map(([lb,k])=>`<div class="liferow"><label>${lb}</label><input class="inp lf" data-k="${k}" type="number" value="${p[k]}"></div>`).join("")
  +`<div class="liferow"><label>Children's birth years (comma separated)</label><input class="inp lf" data-k="kids" value="${(p.kids||[]).join(", ")}"></div>`
  +`<div class="liferow"><label>Major expense: label, year, amount (one per line)</label><textarea class="inp lf" data-k="majors" rows="3" style="width:100%">${(p.majors||[]).map(m=>m.join(", ")).join("\n")}</textarea></div>`;
  $$("lifeForm").querySelectorAll(".lf").forEach(i=>i.addEventListener("change",()=>{
   const q=prof();
   if(i.dataset.k==="kids") q.kids=i.value.split(",").map(s=>parseInt(s)).filter(Boolean);
   else if(i.dataset.k==="majors") q.majors=i.value.split("\n").map(l=>l.split(",").map(s=>s.trim())).filter(a=>a.length===3).map(a=>[a[0],+a[1],+a[2]]);
   else q[i.dataset.k]=+i.value;
   saveProf(q); renderLife();
  }));
  if(!M){ $$("lifeBrutal").innerHTML='<div class="sub">Upload or enter data first — the arithmetic needs your real numbers.</div>'; return; }
  const inc=M.avg.income+M.avg.refund, keep=Math.max(0,M.cashKeptRate);
  const sNow=inc*keep/100, s20=inc*0.20, s40=inc*0.40;
  const yearsToRet=Math.max(1,p.retireAge-p.age), rr=realRate(p);
  const annualExp=(M.avg.spend+M.avg.debtpay)*12;
  const corpus=annualExp*25;
  const path=(s)=>({y5:fvLump(p.nw,rr,5)+fvMonthly(s,rr,5), y10:fvLump(p.nw,rr,10)+fvMonthly(s,rr,10),
                    y20:fvLump(p.nw,rr,20)+fvMonthly(s,rr,20), ret:fvLump(p.nw,rr,yearsToRet)+fvMonthly(s,rr,yearsToRet)});
  const A=path(sNow), B=path(s20), C=path(s40);
  const rowsHtml=[["Current path — "+pct(keep)+" kept",A,"bad"],["Disciplined — 20%",B,""],["Extreme — 40%",C,"good"]]
   .map(([lb,v,cls])=>`<tr><td>${lb}</td><td class="r num">${fmt0(v.y5)}</td><td class="r num">${fmt0(v.y10)}</td><td class="r num">${fmt0(v.y20)}</td><td class="r num" style="font-weight:800">${fmt0(v.ret)}</td></tr>`).join("");
  $$("lifeTable").innerHTML=`<thead><tr><th>Path (today's money, ${pct(rr)} real)</th><th class="r">5 yrs</th><th class="r">10 yrs</th><th class="r">20 yrs</th><th class="r">At ${p.retireAge}</th></tr></thead><tbody>${rowsHtml}</tbody>`;
  const b=[];
  const covNow=corpus>0?A.ret/corpus*100:0, cov20=corpus>0?B.ret/corpus*100:0;
  b.push({bad:covNow<60, t:`Retirement needs about <b>${money(Math.round(corpus))}</b> (25× your annual outflow). Your current path reaches <b>${pct(covNow)}</b> of it by ${p.retireAge}. The 20% path reaches <b>${pct(cov20)}</b>. This gap is the price of today's habits, compounded ${yearsToRet} years.`});
  const monthsRet=A.ret/Math.max(1,annualExp/12);
  b.push({bad:monthsRet<120, t:`Translated: at the current pace you arrive at ${p.retireAge} with <b>${Math.round(monthsRet)} months</b> of living costs. After that, the money depends on someone else.`});
  (p.kids||[]).forEach((by,i)=>{
   const yrs=Math.max(0,by+18-new Date().getFullYear());
   const cost=fvLump(p.kidCost,p.infl,yrs), have=fvLump(p.nw,rr,yrs)+fvMonthly(sNow,rr,yrs);
   b.push({bad:have<cost, t:`Child ${i+1} reaches university in <b>${yrs} years</b>; the degree will cost ~<b>${money(Math.round(cost))}</b> then. Current path has <b>${money(Math.round(Math.min(have,cost)))}</b> of it${have<cost?` — <b>${pct(have/cost*100)}</b> covered, and that assumes nothing else competes for the same money`:" — covered, if nothing derails it"}.`});
  });
  (p.majors||[]).forEach(([lb,yr,amt])=>{
   const yrs=Math.max(0,yr-new Date().getFullYear());
   const need=Math.round(amt/Math.max(1,yrs*12));
   b.push({bad:need>sNow, t:`<b>${esc(lb)}</b> in ${yr} needs <b>${money(need)}/month</b> from today. You currently free up ${money(Math.round(sNow))}/month for everything future.`});
  });
  const lost=fvMonthly(s20,rr,yearsToRet)-fvMonthly(s20,rr,Math.max(0,yearsToRet-1));
  b.push({bad:true, t:`Every year spent at ~0% savings deletes roughly <b>${money(Math.round(lost))}</b> from your ${p.retireAge}-year-old self. Not later money — this year's decision.`});
  const st=pathStatus();
  if(st) b.unshift({bad:!st.ok, t:st.line});
  $$("lifeBrutal").innerHTML=b.map(x=>`<div class="brutal ${x.bad?"":"good"}">${x.t}</div>`).join("");
 }
 return {prof, pathStatus, renderLife};
})();
