"use strict";
/* =============== 1. DATA & PARSING =============== */
let RAW = [];   // [dateISO, desc, amount, category, remark] — loaded from the local store at boot
let M = null;            // computed model
let CUR = "SAR";
const $$ = id => document.getElementById(id);
const fmt0 = n => (n<0?"−":"") + Math.round(Math.abs(n)).toLocaleString("en-US");
const money = n => CUR + " " + fmt0(n);
const pct = n => (Math.round(n*10)/10) + "%";
const esc = s => String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MONTH_MS = 30.44*864e5;

/* fuzzy column mapping for arbitrary uploads */
const COLMAP = {
 date:   ["date","txn date","transaction date","posting date","value date"],
 desc:   ["expense","description","merchant","narration","details","particulars","payee","item"],
 amount: ["amount","spend","debit","withdrawal","expense amount","value","amt","transaction amount"],
 credit: ["credit","deposit","income amount"],
 cat:    ["category","cat","type of expense","head"],
 type:   ["type","dr/cr","transaction type","flow"],
 rem:    ["remarks","remark","note","notes","tag","comment"]
};
function mapCols(headers){
 const H = headers.map(h=>String(h||"").trim().toLowerCase());
 const found = {};
 for(const key in COLMAP){
  let idx = -1;
  for(const alias of COLMAP[key]){ const i = H.indexOf(alias); if(i>-1){ idx=i; break; } }
  if(idx<0) for(const alias of COLMAP[key]){ const i = H.findIndex(h=>h.includes(alias)); if(i>-1){ idx=i; break; } }
  found[key]=idx;
 }
 return found;
}
function excelDate(v){
 if(v instanceof Date) return v;
 if(typeof v === "number") return new Date(Math.round((v-25569)*864e5));
 if(typeof v === "string"){ const d = new Date(v); if(!isNaN(d)) return d; }
 return null;
}
function parseWorkbook(wb){
 // pick sheet with most rows
 let best=null, bestLen=0;
 wb.SheetNames.forEach(sn=>{
  const js = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, raw:true});
  if(js.length>bestLen){ best=js; bestLen=js.length; }
 });
 if(!best || best.length<2) throw "No usable rows found in the file.";
 // find header row within first 5 rows: the one that maps date+amount+desc
 let hi=0, cols=null;
 for(let i=0;i<Math.min(5,best.length);i++){
  const c = mapCols(best[i]||[]);
  if(c.amount>-1 && c.desc>-1){ hi=i; cols=c; break; }
 }
 if(!cols) throw "Could not find Date / Description / Amount columns. Check the header row.";
 const out=[];
 for(let i=hi+1;i<best.length;i++){
  const r = best[i]; if(!r) continue;
  let amt = r[cols.amount];
  if(typeof amt==="string") amt = parseFloat(amt.replace(/[, ]/g,""));
  if(cols.credit>-1 && (amt==null||isNaN(amt))){ // separate debit/credit columns
   let cr = r[cols.credit]; if(typeof cr==="string") cr=parseFloat(cr.replace(/[, ]/g,""));
   if(cr!=null && !isNaN(cr)) amt = Math.abs(cr);
  } else if(cols.credit>-1){
   amt = -Math.abs(amt); // amount col is debit when credit col exists
   let cr = r[cols.credit]; if(typeof cr==="string") cr=parseFloat(cr.replace(/[, ]/g,""));
   if(cr!=null && !isNaN(cr) && cr!==0) amt = Math.abs(cr);
  }
  if(amt==null || isNaN(amt) || amt===0) continue;
  const desc = r[cols.desc]!=null ? String(r[cols.desc]).trim() : "";
  if(!desc) continue;
  const d = cols.date>-1 ? excelDate(r[cols.date]) : null;
  const cat = cols.cat>-1 && r[cols.cat] ? String(r[cols.cat]).trim() : "Misc";
  const typ = cols.type>-1 && r[cols.type] ? String(r[cols.type]).trim().toLowerCase() : "";
  if(typ){
   if(/^(dr|debit|expense|out|withdrawal)/.test(typ)) amt = -Math.abs(amt);
   else if(/^(cr|credit|income|in|deposit)/.test(typ)) amt = Math.abs(amt);
  } else if(amt>0 && !/income|salary|refund|cashback|invest/i.test(cat+desc) && cols.credit<0){
   // sign convention already correct in Niyaz's sheet; leave as-is
  }
  const rem = cols.rem>-1 && r[cols.rem] ? String(r[cols.rem]).trim() : "";
  out.push([d?d.toISOString().slice(0,10):null, desc, Math.round(amt*100)/100, cat, rem]);
 }
 if(!out.length) throw "Parsed 0 transactions — the amount column may be empty.";
 return out;
}

/* =============== 2. CLASSIFICATION =============== */
const LOAN_RX = /loan|emi|cc_|expensetoemi/i;
const REFUND_RX = /cashback|refund|reversal|rebate/i;
const SALARY_RX = /salary|payroll|wage/i;
function normMerchant(s){
 return s.toUpperCase().replace(/\s+/g," ")
  .replace(/\b(DUBAI|SHARJAH|ABU DHABI|RIYADH|JEDDAH|ARE|UAE|SAU|SA|AE|LLC|L\.L\.C)\b/g,"")
  .replace(/\d{4,}/g,"").replace(/[*#-]+/g," ").replace(/\s+/g," ").trim() || s.toUpperCase();
}
function classify(t){
 const {desc, amt, cat} = t;
 if(amt > 0){
  if(LOAN_RX.test(desc) && !SALARY_RX.test(desc)) return "borrowed";
  if(REFUND_RX.test(desc)) return "refund";
  if(/income/i.test(cat)){
   if(SALARY_RX.test(desc) || /rent|bonus|freelance|dividend|interest|transfer from/i.test(desc)) return "income";
   // merchant-looking positive rows in Income = likely refunds
   if(/[A-Z]{3,}.*(ARE|UAE|DUBAI|\.AE|\.COM)/i.test(desc) || amt < 150) return "refund";
   return "income";
  }
  return "refund";
 }
 if(/self transfer/i.test(cat)) return "transfer";
 if(/investment/i.test(cat) || /^SIP\b/i.test(desc)) return "invest";
 if(/loan/i.test(cat)){
  if(LOAN_RX.test(desc)) return "debtpay";
  return "expense-misfiled"; // in Loan category but clearly a merchant
 }
 return "expense";
}
const ESSENTIAL = ["Rent","Grocery","Utilities","Medicine","Education","Insurance","Transport","Fuel","Car","Laundry","Salik"];
const DISCRET  = ["Food","Shopping","Entertainment","Electronics","Clothing","Home Décor","Jewellery","Personal","Footwear","Travel","Misc"];

/* =============== 3. MODEL =============== */
function build(raw){
 const txns = raw.map(r=>{
  const t = { d: r[0]?new Date(r[0]+"T00:00:00"):null, ds:r[0]||"", desc:r[1], amt:r[2], cat:r[3]||"Misc", rem:r[4]||"",
              hash: (typeof Store!=="undefined"&&Store.hash)?Store.hash(r):"" };
  t.month = t.ds ? t.ds.slice(0,7) : "unknown";
  t.kind = classify(t);
  if(t.kind==="expense-misfiled"){ t.kind="expense"; t.misfiled=true; }
  t.nm = normMerchant(t.desc);
  return t;
 }).filter(t=>t.d);
 txns.sort((a,b)=>a.d-b.d);
 const months = [...new Set(txns.map(t=>t.month))].sort();
 // drop a trailing partial month from averages if it has < 40% of median txn count
 const cntBy = {}; txns.forEach(t=>cntBy[t.month]=(cntBy[t.month]||0)+1);
 const med = [...Object.values(cntBy)].sort((a,b)=>a-b)[Math.floor(months.length/2)]||1;
 const lastPartial = cntBy[months[months.length-1]] < med*0.4;
 const fullMonths = lastPartial ? months.slice(0,-1) : months;

 const per = {}; // per-month aggregates
 months.forEach(m=>per[m]={income:0,borrowed:0,refund:0,spend:0,debtpay:0,invest:0,byCat:{},net:0});
 txns.forEach(t=>{
  const p = per[t.month];
  if(t.kind==="income") p.income += t.amt;
  else if(t.kind==="borrowed") p.borrowed += t.amt;
  else if(t.kind==="refund") p.refund += t.amt;
  else if(t.kind==="debtpay") p.debtpay += -t.amt;
  else if(t.kind==="invest") p.invest += -t.amt;
  else if(t.kind==="expense"){ p.spend += -t.amt; p.byCat[t.cat]=(p.byCat[t.cat]||0)+(-t.amt); }
 });
 months.forEach(m=>{ const p=per[m]; p.net = p.income + p.refund - p.spend - p.debtpay - p.invest; });

 const nFull = fullMonths.length||1;
 const sum = k => fullMonths.reduce((a,m)=>a+per[m][k],0);
 const avg = {income:sum("income")/nFull, spend:sum("spend")/nFull, debtpay:sum("debtpay")/nFull,
              borrowed:sum("borrowed")/nFull, refund:sum("refund")/nFull, invest:sum("invest")/nFull};
 avg.net = avg.income + avg.refund - avg.spend - avg.debtpay - avg.invest;
 const netSpend = m => per[m].spend - per[m].refund; // refunds offset spending

 // category totals (net of refunds not attributable — keep gross for clarity)
 const catTotal = {};
 txns.forEach(t=>{ if(t.kind==="expense") catTotal[t.cat]=(catTotal[t.cat]||0)+(-t.amt); });

 // merchants
 const merch = {};
 txns.forEach(t=>{ if(t.kind==="expense"){ const k=t.nm; merch[k]=merch[k]||{n:0,sum:0,cat:t.cat,months:new Set()};
  merch[k].n++; merch[k].sum+=-t.amt; merch[k].months.add(t.month); }});

 // recurring: merchant in >=3 distinct months, cv of monthly totals low OR just repeated
 const recurring = Object.entries(merch)
  .filter(([k,v])=>v.months.size>=3 && v.sum/v.months.size>=8)
  .map(([k,v])=>({name:k, monthsN:v.months.size, perMonth:v.sum/v.months.size, total:v.sum, n:v.n, cat:v.cat}))
  .sort((a,b)=>b.perMonth-a.perMonth);

 // small purchases
 const small = txns.filter(t=>t.kind==="expense" && -t.amt<=25);
 const smallByM = {}; fullMonths.forEach(m=>smallByM[m]=0);
 small.forEach(t=>{ if(smallByM[t.month]!=null) smallByM[t.month]+=-t.amt; });

 // day of week / day of month
 const dow=[0,0,0,0,0,0,0], dowN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
 const dom=new Array(31).fill(0);
 txns.forEach(t=>{ if(t.kind==="expense"){ dow[t.d.getDay()]+=-t.amt; dom[t.d.getDate()-1]+=-t.amt; }});

 // salary-day behavior: spend in 3 days after each salary vs daily average
 const salDates = txns.filter(t=>t.kind==="income" && SALARY_RX.test(t.desc)).map(t=>t.d.getTime());
 let postSal=0, postSalDays=0;
 txns.forEach(t=>{ if(t.kind==="expense" && salDates.some(s=>t.d.getTime()>=s && t.d.getTime()<s+3*864e5)) postSal+=-t.amt; });
 postSalDays = salDates.length*3 || 1;
 const totalDays = txns.length ? Math.max(1,(txns[txns.length-1].d - txns[0].d)/864e5) : 1;
 const dailyAvgSpend = sum("spend")/ (fullMonths.length*30.44 || totalDays);
 const postSalDaily = postSal/postSalDays;

 // discretionary trend (rolling 3m)
 const discBy = fullMonths.map(m=>{ let s=0; for(const c of DISCRET) s+=per[m].byCat[c]||0; return s; });
 const roll3 = discBy.map((v,i)=>{ const a=discBy.slice(Math.max(0,i-2),i+1); return a.reduce((x,y)=>x+y,0)/a.length; });

 /* ---- loans ---- */
 const loans = {};
 txns.forEach(t=>{
  if(t.kind==="borrowed"){
   const id = (t.desc.match(/SR\s?\d+/i)||[t.desc])[0].toUpperCase().replace(/\s+/g," ");
   loans[id]=loans[id]||{name:t.desc.trim(), id, disb:0, paid:0, est:false, lastPay:null, emi:0, payN:0};
   loans[id].disb += t.amt;
  }
 });
 txns.forEach(t=>{
  if(t.kind==="debtpay"){
   if(/processing fee|vat on/i.test(t.desc)) return; // fees are costs, not loans to simulate
   const srm = t.desc.match(/SR\s?\d+/i);
   let key = srm ? srm[0].toUpperCase().replace(/\s+/g," ") : normMerchant(t.desc);
   if(!loans[key]){ loans[key]={name:t.desc.trim(), id:key, disb:0, paid:0, est:true, lastPay:null, emi:0, payN:0}; }
   loans[key].paid += -t.amt; loans[key].payN++;
   loans[key].emi = Math.max(loans[key].emi, -t.amt);
   const im=((t.rem||"")+" "+t.desc).match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
   if(im && +im[2]>=+im[1]){ loans[key].iX=+im[1]; loans[key].iN=+im[2]; }
   if(/done|completed|closed|settled|paid off/i.test(t.rem||"")) loans[key].done=true;
   if(!loans[key].lastPay || t.d>loans[key].lastPay) loans[key].lastPay=t.d;
  }
 });
 const cutoff = txns.length? txns[txns.length-1].d.getTime() - 3.2*MONTH_MS : 0;
 const loanList = Object.values(loans).map(l=>{
  l.active = l.lastPay && l.lastPay.getTime() >= cutoff;
  if(l.done || (l.iN && l.iX>=l.iN)) l.active=false; // remarks say finished
  if(l.disb>0){ l.balance = Math.max(0, l.disb - l.paid); l.est = false; }
  else if(l.iN){ l.balance = Math.round((l.iN-l.iX)*l.emi); l.est = true; } // remaining installments × EMI
  else if(/home loan/i.test(l.name)){ l.balance = l.active? Math.round(l.emi*60):0; l.est = l.active; } // assume ~5y left, edit it
  else { l.balance = l.active ? Math.round(l.emi*Math.max(1,6-l.payN)) : 0; l.est = l.active; } // his CC plans run 6 months
  if(l.disb>0 && l.balance===0) l.active=false;
  // default APR estimates (transparent): CC installment plans ~ 0 fee/flat? use conservative defaults
  l.apr = /home loan/i.test(l.name)? 4 : /hdfc|sbi|cc_/i.test(l.name)? 42 : /expensetoemi/i.test(l.name)? 18 : 12;
  l.aprEst = true;
  return l;
 }).filter(l=>l.active && l.balance>0).sort((a,b)=>b.balance-a.balance);

 /* ---- discipline score ---- */
 const cashKeptRate = avg.income>0 ? Math.max(0,(avg.income+avg.refund - avg.spend - avg.debtpay - avg.invest)/avg.income*100) : 0;
 const debtBurden = avg.income>0 ? avg.debtpay/avg.income*100 : 0;
 const borrowShare = (avg.income+avg.borrowed)>0 ? avg.borrowed/(avg.income+avg.borrowed)*100 : 0;
 const smallShare = sum("spend")>0 ? (small.reduce((a,t)=>a-t.amt,0)/sum("spend")*100) : 0;
 const nets = fullMonths.map(m=>per[m].net);
 const meanNet = nets.reduce((a,b)=>a+b,0)/(nets.length||1);
 const sd = Math.sqrt(nets.reduce((a,b)=>a+(b-meanNet)**2,0)/(nets.length||1));
 const stability = avg.income>0 ? Math.max(0,100 - sd/avg.income*100) : 0;
 const cumNet = nets.reduce((a,b)=>a+b,0);
 const bufferMonths = avg.spend>0 ? Math.max(0,cumNet)/(avg.spend+avg.debtpay) : 0;
 const investRate = avg.income>0 ? avg.invest/avg.income*100 : 0;

 const factors = [
  {name:"Savings rate", w:25, val:Math.min(100, cashKeptRate/25*100), disp:pct(cashKeptRate),
   why: cashKeptRate>=20?"Strong — protect it.":cashKeptRate>=10?"Below the 20% target.":"Critically low — the core problem."},
  {name:"Debt burden", w:20, val:Math.max(0,100-debtBurden/45*100), disp:pct(debtBurden)+" of income",
   why: debtBurden<15?"Manageable.":debtBurden<30?"Heavy — every extra payment counts.":"Severe — this is eating your salary."},
  {name:"Borrowing habit", w:15, val:Math.max(0,100-borrowShare/30*100), disp:pct(borrowShare)+" of inflow",
   why: borrowShare<3?"Clean.":"Part of your 'income' was new loans."},
  {name:"Impulse spending", w:15, val:Math.max(0,100-smallShare/20*100), disp:pct(smallShare)+" in small buys",
   why: smallShare<7?"Controlled.":"Death by a thousand taps."},
  {name:"Cash-flow stability", w:15, val:stability, disp:"±"+money(sd)+"/mo",
   why: stability>70?"Predictable.":"Swings make planning impossible."},
  {name:"Investing", w:10, val:Math.min(100, investRate/10*100), disp:pct(investRate)+" of income",
   why: investRate>=5?"Building.":"Almost nothing is working for you."}
 ];
 const score = Math.round(factors.reduce((a,f)=>a+f.val*f.w,0)/100);

 /* ---- forecast ---- */
 const last3 = fullMonths.slice(-3);
 const ma = k => last3.reduce((a,m)=>a+per[m][k],0)/(last3.length||1);
 const fc = {income:ma("income")+ma("refund"), out:ma("spend")+ma("debtpay")+ma("invest")};
 fc.net = fc.income - fc.out;

 return { txns, months, fullMonths, lastPartial, per, avg, sum, catTotal, merch, recurring,
  small, smallByM, dow, dowN, dom, postSalDaily, dailyAvgSpend, discBy, roll3,
  loanList, factors, score, cashKeptRate, debtBurden, borrowShare, smallShare, stability,
  bufferMonths, cumNet, sd, fc, netSpend,
  totalBorrowed: txns.filter(t=>t.kind==="borrowed").reduce((a,t)=>a+t.amt,0),
  totalIncome: txns.filter(t=>t.kind==="income").reduce((a,t)=>a+t.amt,0),
  totalRefund: txns.filter(t=>t.kind==="refund").reduce((a,t)=>a+t.amt,0),
  totalSpend: txns.filter(t=>t.kind==="expense").reduce((a,t)=>a-t.amt,0),
  totalDebtpay: txns.filter(t=>t.kind==="debtpay").reduce((a,t)=>a-t.amt,0),
  totalInvest: txns.filter(t=>t.kind==="invest").reduce((a,t)=>a-t.amt,0),
  misfiled: txns.filter(t=>t.misfiled)
 };
}

/* payoff simulation */
function simulate(loans, extra, strategy){
 const L = loans.map(l=>({...l, bal:l.balance, minPay: l.emi>0? l.emi : Math.max(100, l.balance*0.03)}));
 let month=0, interest=0; const series=[L.reduce((a,l)=>a+l.bal,0)]; const killed=[];
 while(L.some(l=>l.bal>0) && month<240){
  month++;
  L.forEach(l=>{ if(l.bal>0){ const i=l.bal*(l.apr/100/12); l.bal+=i; interest+=i; }});
  L.forEach(l=>{ if(l.bal>0){ const p=Math.min(l.minPay,l.bal); l.bal-=p; }});
  let ex = extra;
  const order=[...L].filter(l=>l.bal>0).sort(strategy==="snow" ? (a,b)=>a.bal-b.bal : (a,b)=>b.apr-a.apr);
  for(const l of order){ if(ex<=0)break; const p=Math.min(ex,l.bal); l.bal-=p; ex-=p; }
  L.forEach(l=>{ if(l.bal<=0.5 && l.bal!==-1){ if(!killed.includes(l.id)){killed.push(l.id);} l.bal=0; }});
  series.push(L.reduce((a,l)=>a+l.bal,0));
 }
 return {months:month, interest, series, killed};
}
