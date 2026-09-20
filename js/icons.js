"use strict";
/* =============== MERCHANT / CATEGORY ICONS — original inline SVGs, stroke style, offline =============== */
const Icons = (() => {
 const S='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
 const P={
  fuel:`<path ${S} d="M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16M3 21h13M14 9h2a2 2 0 0 1 2 2v5a1.6 1.6 0 0 0 3.2 0V9.5L18 6M6.5 7h6"/>`,
  food:`<path ${S} d="M6 3v7M4 3v4a2 2 0 0 0 4 0V3M6 12v9M15 3c-1.7 1.5-2.5 4-2.5 6.5 0 2 1 3 2.5 3V21M15 3c1.7 1.5 2.5 4 2.5 6.5"/>`,
  grocery:`<path ${S} d="M3 4h2l2.4 12.2A2 2 0 0 0 9.4 18h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle ${S} cx="10" cy="21" r="1"/><circle ${S} cx="17" cy="21" r="1"/>`,
  transport:`<path ${S} d="M5 17h-1a1 1 0 0 1-1-1v-4l2-6a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 6l2 6v4a1 1 0 0 1-1 1h-1M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M5 17h10M4 11h16"/>`,
  home:`<path ${S} d="M3 11 12 4l9 7M6 9.5V20h12V9.5M10 20v-6h4v6"/>`,
  utilities:`<path ${S} d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>`,
  medicine:`<path ${S} d="M8 3h8M10 3v5.5L4.8 17a3 3 0 0 0 2.6 4.5h9.2a3 3 0 0 0 2.6-4.5L14 8.5V3M7 15h10"/>`,
  shopping:`<path ${S} d="M6 8h12l1.2 12.2a1.6 1.6 0 0 1-1.6 1.8H6.4a1.6 1.6 0 0 1-1.6-1.8L6 8zM9 10V6a3 3 0 0 1 6 0v4"/>`,
  clothing:`<path ${S} d="m9 4-5 3 2 3.5L8 9v11h8V9l2 1.5L20 7l-5-3a3 3 0 0 1-6 0z"/>`,
  entertainment:`<path ${S} d="M4 8h16v12H4zM4 8l2-4 3 1.5L11 4l3 1.5L16 4l2 1.5L20 8M10 12l5 3-5 3v-6z"/>`,
  phone:`<path ${S} d="M8 2h8a1.5 1.5 0 0 1 1.5 1.5v17A1.5 1.5 0 0 1 16 22H8a1.5 1.5 0 0 1-1.5-1.5v-17A1.5 1.5 0 0 1 8 2zM10 19h4"/>`,
  salary:`<path ${S} d="M12 3v18M8 7.5C8 6 9.7 5 12 5s4 1 4 2.5S14.3 10 12 10s-4 1-4 2.5S9.7 15 12 15s4-1 4-2.5"/><circle ${S} cx="12" cy="12" r="10"/>`,
  bank:`<path ${S} d="M3 9 12 3l9 6M4 9h16M6 9v8M10 9v8M14 9v8M18 9v8M3 20h18M4 17h16"/>`,
  invest:`<path ${S} d="M3 21h18M5 21V13M10 21V9M15 21v-8M20 21V5M13 8l7-3M17.5 4.4 20 5l-.6 2.5"/>`,
  travel:`<path ${S} d="M10.5 13.5 3 11l1.5-1.5L11 10l4.5-4.5a1.8 1.8 0 0 1 2.5 2.5L13.5 12l.5 6.5L12.5 20l-2-6.5L7 16l.2 2.3L5.7 19 4.5 16 2 14.8l1.5-1.3z"/>`,
  car:`<path ${S} d="M5 16h-2v-4l2.2-5A2 2 0 0 1 7 5.8h10a2 2 0 0 1 1.8 1.2L21 12v4h-2M5 16a2 2 0 1 0 4 0m6 0a2 2 0 1 0 4 0M9 16h6M4.5 12h15"/>`,
  laundry:`<path ${S} d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 6h.01M11 6h.01M12 15a4 4 0 1 0 0-.01M9.5 14a3 3 0 0 1 5 0"/>`,
  fees:`<path ${S} d="M5 19 19 5M7.5 8.5a2 2 0 1 0 0-.01M16.5 17.5a2 2 0 1 0 0-.01"/>`,
  misc:`<circle ${S} cx="12" cy="12" r="8"/><path ${S} d="M12 8v4l2.5 2.5"/>`
 };
 const CATMAP={Food:"food",Grocery:"grocery",Transport:"transport",Car:"car",Rent:"home",Utilities:"utilities",
  Medicine:"medicine",Shopping:"shopping",Clothing:"clothing",Entertainment:"entertainment",Personal:"shopping",
  Laundry:"laundry",Loan:"bank",Income:"salary",Investment:"invest",Travel:"travel",Electronics:"phone",
  Jewellery:"shopping",Misc:"misc"};
 const COLMAP={food:"#E07A3F",grocery:"#1B9E6B",transport:"#33628F",car:"#33628F",home:"#8A5CB8",
  utilities:"#B7811F",medicine:"#C24D5E",shopping:"#C2589E",clothing:"#C2589E",entertainment:"#5B4B97",
  phone:"#2F8F9E",salary:"#1B9E6B",bank:"#B7811F",invest:"#1B9E6B",travel:"#2F8F9E",laundry:"#2F8F9E",
  fees:"#C24D5E",misc:"#8B978F"};
 function keyFor(desc,cat,kind){
  const d=(desc||"").toUpperCase();
  if(kind==="borrowed"||kind==="debtpay") return "bank";
  if(kind==="income") return "salary";
  if(kind==="invest") return "invest";
  if(/FEE|VAT ON|INTEREST|CHARGE/.test(d)) return "fees";
  if(/PETROL|FUEL|ADNOC|ENOC|EPPCO|SHELL|GAS STATION/.test(d)) return "fuel";
  if(/TAXI|CAREEM|UBER|RTA|METRO|SALIK|BUS/.test(d)) return "transport";
  if(/TALABAT|RESTAURANT|CAFETERIA|CAFE|KITCHEN|TEA |COFFEE|MCDONALD|KFC|HARDEE|PIZZA|SHAWARMA/.test(d)) return "food";
  if(/CARREFOUR|MART|GROCER|SUPERMARKET|LULU|HYPER|COOP|BAQALA/.test(d)) return "grocery";
  if(/DEWA|SEWA|ETISALAT|\bDU\b|RECHARGE|SMART GOVERNMENT|ELECTRIC|WATER/.test(d)) return "utilities";
  if(/PHARMA|CLINIC|HOSPITAL|MEDIC/.test(d)) return "medicine";
  if(/AIRLINE|AIRWAYS|EMIRATES|FLYDUBAI|INDIGO|AIR INDIA|HOTEL|BOOKING/.test(d)) return "travel";
  if(/LAUNDRY|DRY CLEAN/.test(d)) return "laundry";
  if(/NOON|AMAZON|MALL|IKEA|STORE|SHOP/.test(d)) return "shopping";
  if(/MOBILE|PHONE|SAMSUNG|APPLE|SHARAF|JUMBO/.test(d)) return "phone";
  return CATMAP[cat]||"misc";
 }
 function chip(desc,cat,kind){
  const k=keyFor(desc,cat,kind), c=COLMAP[k]||"#8B978F";
  return `<span class="txicon" style="color:${c};background:${c}1d"><svg viewBox="0 0 24 24" width="19" height="19">${P[k]||P.misc}</svg></span>`;
 }
 return {chip,keyFor};
})();
