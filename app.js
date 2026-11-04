/* San Antonio High School Inventory System
   Configure SUPABASE_URL and SUPABASE_ANON_KEY below before use.
*/
const SUPABASE_URL = "https://slwujrkglwopzfhlpinv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bImnWL3QDTnFCE24BR34fA_HnFURg2u";
const hasConfig = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = hasConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const state = { user:null, profile:null, inventory:[], transactions:[], requests:[], history:[], activeBorrows:new Map(), borrowRecords:[], chart:null, editingId:null, modalType:null, importRows:[], selectedIds:new Set(), visibleIds:[], deleteIds:[], selectedBorrowItemId:null, selectedReturnItemId:null };
const today = new Date();
$("todayLabel").textContent = today.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
$("year").textContent = today.getFullYear();

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function number(v){return Number(v||0).toLocaleString()}
function todayISO(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function toISODate(v){if(!v)return "";const s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const d=new Date(s);return isNaN(d)?"":new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function fromDateInput(v){return v?new Date(String(v).slice(0,10)+"T12:00:00").toISOString():new Date().toISOString()}
function date(v){if(!v)return "—";const s=String(v);const d=/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+"T12:00:00"):new Date(s);return isNaN(d)?"—":d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function dateTime(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?"—":d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}

const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function cleanCell(v){if(v===undefined||v===null)return "";const s=String(v).trim();return s}
function cleanProp(v){const s=cleanCell(v);return /^(n\/?a|none|-+|\.+)$/i.test(s)?"":s}

function getDateAcquiredParts(v){
 if(v===undefined||v===null)return null;
 const s=String(v).trim();
 if(!s||/^(n\/?a|none|-+|\.+)$/i.test(s))return null;
 if(typeof v==="number"||/^\d{5}$/.test(s)){
  const num=Number(v);
  if(num>20000&&num<80000){
   const d=new Date(Math.round((num-25569)*86400*1000));
   if(!isNaN(d.getTime()))return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate()};
  }
 }
 const mdy=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
 if(mdy){
  const m=parseInt(mdy[1],10),d=parseInt(mdy[2],10),y=parseInt(mdy[3],10);
  if(m>=1&&m<=12&&d>=1&&d<=31&&y>=1900&&y<=2100)return {y,m,d};
 }
 const ymd=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
 if(ymd){
  const y=parseInt(ymd[1],10),m=parseInt(ymd[2],10),d=parseInt(ymd[3],10);
  if(m>=1&&m<=12&&d>=1&&d<=31&&y>=1900&&y<=2100)return {y,m,d};
 }
 const parsed=new Date(s.includes("T")?s:s+"T12:00:00");
 if(!isNaN(parsed.getTime())){
  const y=parsed.getFullYear();
  if(y>=1900&&y<=2100)return {y,m:parsed.getMonth()+1,d:parsed.getDate()};
 }
 return null;
}

function formatDateAcquired(v){
 const p=getDateAcquiredParts(v);
 if(!p){const s=cleanCell(v);return /^(n\/?a|none|-+|\.+)$/i.test(s)?"":s}
 const mm=String(p.m).padStart(2,"0");
 const dd=String(p.d).padStart(2,"0");
 return `${mm}/${dd}/${p.y}`;
}

function dateAcquiredSearchTokens(v){
 const raw=String(v||"").trim();
 const p=getDateAcquiredParts(v);
 if(!p)return raw;
 const mm=String(p.m).padStart(2,"0");
 const dd=String(p.d).padStart(2,"0");
 const yyyy=String(p.y);
 const mName=MONTH_NAMES[p.m-1];
 const mShort=MONTH_SHORT[p.m-1];
 return [
  raw,
  `${mm}/${dd}/${yyyy}`,
  `${p.m}/${p.d}/${yyyy}`,
  `${mm}-${dd}-${yyyy}`,
  `${yyyy}-${mm}-${dd}`,
  `${yyyy}/${mm}/${dd}`,
  `${mName} ${dd}, ${yyyy}`,
  `${mName} ${p.d}, ${yyyy}`,
  `${mName} ${dd},${yyyy}`,
  `${mName} ${p.d},${yyyy}`,
  `${mName} ${dd} ${yyyy}`,
  `${mName} ${p.d} ${yyyy}`,
  `${mShort} ${dd}, ${yyyy}`,
  `${mShort} ${p.d}, ${yyyy}`,
  `${mShort} ${dd},${yyyy}`,
  `${mShort} ${p.d},${yyyy}`,
  `${mShort} ${dd} ${yyyy}`,
  `${mShort} ${p.d} ${yyyy}`,
  `${mShort}. ${dd}, ${yyyy}`,
  `${mShort}. ${p.d}, ${yyyy}`,
  `${dd} ${mName} ${yyyy}`,
  `${p.d} ${mName} ${yyyy}`,
  `${dd} ${mShort} ${yyyy}`,
  `${p.d} ${mShort} ${yyyy}`,
  `${mName} ${dd}`,
  `${mName} ${p.d}`,
  `${mShort} ${dd}`,
  `${mShort} ${p.d}`,
  `${mName} ${yyyy}`,
  `${mShort} ${yyyy}`,
  mName,
  mShort
 ].join(" ");
}
function role(){return state.profile?.role||"requester"}
function actorName(){const n=state.profile?.full_name,e=state.user?.email;return n&&e&&n!==e?`${n} (${e})`:(n||e||"User")}
function canManage(){return ["admin","staff"].includes(role())}
function parseBorrowMeta(t){
 let borrower="",expected_return="",borrowed_date=toISODate(t.created_at);
 const raw=String(t.reference||"").trim();
 if(raw.startsWith("{")){
  try{
   const p=JSON.parse(raw);
   borrower=p.borrower||"";
   expected_return=p.expected_return||"";
   if(p.borrowed_date)borrowed_date=p.borrowed_date;
  }catch(e){borrower=raw}
 }else{
  borrower=raw;
 }
 if(!borrower)borrower=t.profiles?.full_name||"Borrower";
 return {
  id:t.id,
  item_id:t.item_id,
  type:t.type,
  borrower,
  reason:t.notes||"—",
  expected_return,
  borrowed_date,
  created_at:t.created_at,
  recorded_by:t.profiles?.full_name||"Staff",
  inventory_items:t.inventory_items
 };
}
function rebuildBorrowState(){
 const activeMap=new Map();
 const seen=new Set();
 const records=[];
 for(const t of state.transactions){
  if(!t.item_id)continue;
  const meta=parseBorrowMeta(t);
  const isLatest=!seen.has(t.item_id);
  seen.add(t.item_id);
  if(t.type==="out"){
   const isCurrentlyBorrowed=isLatest;
   const entry={...meta,status:isCurrentlyBorrowed?"borrowed":"returned"};
   if(isCurrentlyBorrowed)activeMap.set(t.item_id,entry);
   records.push(entry);
  }
 }
 state.activeBorrows=activeMap;
 state.borrowRecords=records;
}
function getActiveBorrow(itemId){return state.activeBorrows?.get(itemId)||null}
function statusFor(item){return getActiveBorrow(item.id)?"borrowed":"available"}
function statusBadge(s){const map={available:["Available","available"],borrowed:["Borrowed","borrowed"],returned:["Returned","returned"],in:["Available","available"],low:["Low stock","low-stock"],out:["Borrowed","borrowed"],pending:["Pending","pending"],approved:["Approved","approved"],fulfilled:["Fulfilled","fulfilled"],rejected:["Rejected","rejected"],added:["Added","in-stock"],imported:["Imported","in-stock"],updated:["Edited","low-stock"],deleted:["Deleted","out-of-stock"]};const x=map[s]||[s,s];return `<span class="status ${x[1]}">${x[0]}</span>`}
function itemIcon(category=""){const c=category.toLowerCase();if(c.includes("it")||c.includes("computer"))return "▣";if(c.includes("office")||c.includes("paper")||c.includes("book"))return "▤";if(c.includes("lab"))return "⚗";if(c.includes("furniture"))return "▥";if(c.includes("machin")||c.includes("sport"))return "◈";return "□"}
function setPage(name){const titles={dashboard:"Dashboard",inventory:"Inventory",transactions:"Borrow/Return",requests:"Requests",history:"History",reports:"Reports"};document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(name+"Page").classList.add("active");document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));$("crumb").textContent=titles[name]||(name[0].toUpperCase()+name.slice(1));$("sidebar").classList.remove("open");if(name==="reports")renderReports();if(name==="history")renderHistory()}
function showApp(user,profile){state.user=user;state.profile=profile;$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");const display=profile?.full_name||user.email?.split("@")[0]||"User";$("userName").textContent=display;$("welcomeName").textContent=display.split(" ")[0];$("userRole").textContent=role();$("avatar").textContent=display[0].toUpperCase();document.querySelectorAll('[data-go="inventory"]').forEach(b=>b.style.display=canManage()?"":"none");$("addItemBtn").style.display=canManage()?"":"none";$("importExcelBtn").style.display=canManage()?"":"none";if($("borrowItemBtn"))$("borrowItemBtn").style.display=canManage()?"":"none";if($("returnItemBtn"))$("returnItemBtn").style.display=canManage()?"":"none";$("requestNavCount").style.display="";loadAll()}
async function loadProfile(user){const fallback={id:user.id,full_name:user.email?.split("@")[0]||"User",role:"requester"};const {data,error}=await db.from("profiles").select("*").eq("id",user.id).maybeSingle();if(error)throw error;if(!data){const {data:created,error:e}=await db.from("profiles").insert(fallback).select().single();if(e)return fallback;return created}return data}
async function logAudit(entries){
 try{
  const list=(Array.isArray(entries)?entries:[entries]).map(e=>({action:e.action,item_name:e.item_name||"Inventory item",item_code:e.item_code||null,details:e.details||null,actor_id:state.user?.id||null,actor_name:actorName()}));
  const chunk=200;
  for(let i=0;i<list.length;i+=chunk){await db.from("audit_logs").insert(list.slice(i,i+chunk))}
 }catch(e){console.warn("Audit log skipped:",e.message)}
}
async function loadAll(){
 try{
  const [i,t,r,h,p]=await Promise.all([
   db.from("inventory_items").select("*").order("name"),
   db.from("stock_transactions").select("*, inventory_items(name, item_code)").order("created_at",{ascending:false}).limit(1000),
   db.from("item_requests").select("*, inventory_items(name, item_code)").order("created_at",{ascending:false}).limit(100),
   db.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(300),
   db.from("profiles").select("id, full_name, role")
  ]);
  if(i.error)throw i.error;
  if(t.error)throw t.error;
  if(r.error)throw r.error;
  const profilesMap=new Map((p.data||[]).map(x=>[x.id,x]));
  state.profilesMap=profilesMap;
  state.inventory=(i.data||[]).map(x=>({
   ...x,
   profiles:x.created_by&&profilesMap.has(x.created_by)?profilesMap.get(x.created_by):{full_name:"Staff"}
  }));
  state.transactions=(t.data||[]).map(x=>({
   ...x,
   profiles:x.recorded_by&&profilesMap.has(x.recorded_by)?profilesMap.get(x.recorded_by):{full_name:"Staff"}
  }));
  state.requests=(r.data||[]).map(x=>({
   ...x,
   profiles:x.requested_by&&profilesMap.has(x.requested_by)?profilesMap.get(x.requested_by):{full_name:"User"}
  }));
  state.history=h.error?[]:(h.data||[]);
  rebuildBorrowState();
  renderAll();
 }catch(e){
  toast("Could not load data: "+e.message);
  console.error(e);
 }
}
function renderAll(){renderDashboard();renderInventory();renderTransactions();renderRequests();renderHistory();populateCategoryFilter()}
function renderDashboard(){const total=state.inventory.length,borrowed=state.inventory.filter(x=>statusFor(x)==="borrowed").length,available=Math.max(0,total-borrowed),pending=state.requests.filter(x=>x.status==="pending").length;$("statTotal").textContent=number(total);$("statStock").textContent=number(available);$("statLow").textContent=number(borrowed);$("statPending").textContent=number(pending);$("requestNavCount").textContent=pending;
 const ctx=$("stockChart");if(state.chart)state.chart.destroy();state.chart=new Chart(ctx,{type:"doughnut",data:{labels:["Available","Borrowed"],datasets:[{data:[available,borrowed],backgroundColor:["#159b70","#df737b"],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"72%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} items`}}}}});
 const cats={};state.inventory.forEach(x=>{const c=x.category||"Uncategorized";cats[c]=(cats[c]||0)+1});const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);$("categoryList").innerHTML=sorted.length?sorted.map(([n,v])=>`<div class="category-row"><span>${esc(n)}</span><div class="bar-track"><div class="bar-fill" style="width:${total?Math.max(4,v/total*100):0}%"></div></div><strong>${v}</strong></div>`).join(""):'<div class="empty-state">No inventory data yet.</div>';
 $("recentTransactions").innerHTML=state.transactions.slice(0,4).length?state.transactions.slice(0,4).map(t=>{const m=parseBorrowMeta(t);return `<div class="activity-row"><div class="activity-icon ${t.type==="in"?"green":"amber"}">${t.type==="in"?"↩":"⇄"}</div><div class="activity-copy"><strong>${esc(t.inventory_items?.name||"Inventory item")}</strong><small>${t.type==="in"?`Returned by ${esc(m.borrower)}`:`Borrowed by ${esc(m.borrower)}`}${t.type==="out"&&m.expected_return?` · Return: ${esc(formatDateAcquired(m.expected_return))}`:""}</small></div><span class="activity-time">${date(t.created_at)}</span></div>`}).join(""):'<div class="empty-state">No borrow/return activity yet.</div>'}
function populateCategoryFilter(){const el=$("categoryFilter"),v=el.value,cats=[...new Set(state.inventory.map(x=>x.category).filter(Boolean))].sort();el.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");el.value=cats.includes(v)?v:""}
const inventoryColumns = [
 { id: "seq_no", label: "NO", search: (x, idx) => String(x.seq_no || (idx + 1)), render: (x, idx) => esc(x.seq_no || (idx + 1)) },
 { id: "created_at", label: "DATE ENTERED", search: x => `${date(x.created_at)} ${toISODate(x.created_at)}`, render: x => date(x.created_at) },
 { id: "entered_by", label: "ENTERED BY", search: x => x.profiles?.full_name || "Staff", render: x => esc(x.profiles?.full_name || "Staff") },
 { id: "school_id", label: "SCHOOL ID", search: x => x.school_id || "", render: x => esc(x.school_id || "—") },
 { id: "district", label: "DISTRICT", search: x => x.district || "", render: x => esc(x.district || "—") },
 { id: "school_name", label: "SCHOOL NAME", search: x => x.school_name || "", render: x => esc(x.school_name || "—") },
 { id: "old_property_no", label: "OLD PROPERTY NO.", search: x => x.old_property_no || "", render: x => esc(x.old_property_no || "—") },
 { id: "item_code", label: "NEW PROPERTY NO.", search: x => x.item_code || "", render: x => `<strong>${esc(x.item_code || "—")}</strong>` },
 { id: "serial_no", label: "SERIAL NO. / TITLE NO.", search: x => x.serial_no || "", render: x => esc(x.serial_no || "—") },
 { id: "model_no", label: "MODEL NO.", search: x => x.model_no || "", render: x => esc(x.model_no || "—") },
 { id: "date_acquired", label: "DATE ACQUIRED (mm/dd/yyyy)", search: x => dateAcquiredSearchTokens(x.date_acquired), render: x => esc(formatDateAcquired(x.date_acquired) || "—") },
 { id: "uacs", label: "UACS", search: x => x.uacs || "", render: x => esc(x.uacs || "—") },
 { id: "account_category", label: "ACCOUNT CATEGORY", search: x => x.account_category || "", render: x => esc(x.account_category || "—") },
 { id: "account_classification", label: "ACCOUNT CLASSIFICATION", search: x => x.account_classification || "", render: x => esc(x.account_classification || "—") },
 { id: "account_title", label: "ACCOUNT TITLE", search: x => x.account_title || "", render: x => esc(x.account_title || "—") },
 { id: "article", label: "ARTICLE / ITEM", search: x => `${x.article || ""} ${x.name || ""}`, render: x => `<strong>${esc(x.article || x.name || "—")}</strong>` },
 { id: "description", label: "DESCRIPTION", search: x => x.description || "", render: x => esc(x.description || "—") },
 { id: "category", label: "CATEGORY", search: x => x.category || "", render: x => esc(x.category || "—") },
 { id: "unit", label: "UNIT OF MEASURE", search: x => x.unit || "", render: x => esc(x.unit || "Unit") },
 { id: "unit_value", label: "UNIT VALUE", search: x => (x.unit_value !== null && x.unit_value !== undefined && x.unit_value !== "" ? String(x.unit_value) : ""), render: x => (x.unit_value !== null && x.unit_value !== undefined && x.unit_value !== "" ? `₱${Number(x.unit_value).toLocaleString()}` : "—") },
 { id: "qty_property_card", label: "QTY (PROPERTY CARD)", search: x => String(x.qty_property_card ?? x.quantity ?? ""), render: x => number(x.qty_property_card ?? x.quantity) },
 { id: "quantity", label: "QTY (PHYSICAL COUNT)", search: x => String(x.quantity ?? ""), render: x => `<strong>${number(x.quantity)}</strong>` },
 { id: "location", label: "LOCATION / WHEREABOUTS", search: x => x.location || "", render: x => esc(x.location || "—") },
 { id: "condition", label: "CONDITION", search: x => x.condition || "", render: x => esc(x.condition || "—") },
 { id: "useful_life", label: "USEFUL LIFE", search: x => x.useful_life || "", render: x => esc(x.useful_life || "—") },
 { id: "remarks", label: "REMARKS", search: x => x.remarks || "", render: x => esc(x.remarks || "—") },
 { id: "available_documents", label: "AVAILABLE DOCUMENTS", search: x => x.available_documents || "", render: x => esc(x.available_documents || "—") },
 { id: "fund_source", label: "FUND SOURCE", search: x => x.fund_source || "", render: x => esc(x.fund_source || "—") },
 { id: "fund", label: "FUND", search: x => x.fund || "", render: x => esc(x.fund || "—") },
 { id: "accountable_hris_id", label: "ACCOUNTABLE HRIS-ID", search: x => x.accountable_hris_id || "", render: x => esc(x.accountable_hris_id || "—") },
 { id: "accountable_person", label: "ACCOUNTABLE PERSON", search: x => x.accountable_person || "", render: x => esc(x.accountable_person || "—") },
 { id: "status", label: "STATUS", search: x => statusFor(x)==="borrowed"?`borrowed ${getActiveBorrow(x.id)?.borrower||""}`:"available", render: x => statusBadge(statusFor(x)) },
];

function updateSelectionUI(){
 const btn=$("bulkDeleteBtn"),all=$("selectAllInventory");
 const count=state.selectedIds.size;
 if(btn){btn.classList.toggle("hidden",!canManage()||count===0);btn.textContent=`Delete selected (${count})`}
 if(all){all.style.display=canManage()?"":"none";all.checked=state.visibleIds.length>0&&state.visibleIds.every(id=>state.selectedIds.has(id))}
}
function renderInventory(){
 const valid=new Set(state.inventory.map(x=>x.id));
 [...state.selectedIds].forEach(id=>{if(!valid.has(id))state.selectedIds.delete(id)});
 const q=$("inventorySearch").value.toLowerCase().trim(),cat=$("categoryFilter").value,sf=$("stockFilter").value,df=$("dateFilter")?.value||"";
 const rows=state.inventory.filter(x=>{
  const hay=[x.seq_no,x.profiles?.full_name,x.school_id,x.district,x.school_name,x.old_property_no,x.item_code,x.serial_no,x.model_no,dateAcquiredSearchTokens(x.date_acquired),x.uacs,x.account_category,x.account_classification,x.account_title,x.article,x.name,x.description,x.category,x.location,x.condition,x.remarks,x.fund_source,x.fund,x.accountable_hris_id,x.accountable_person,statusFor(x),getActiveBorrow(x.id)?.borrower||""].join(" ").toLowerCase();
  return hay.includes(q)&&(!cat||x.category===cat)&&(!sf||statusFor(x)===sf)&&(!df||toISODate(x.created_at)===df);
 });
 state.visibleIds=rows.map(x=>x.id);

 let cols=[...inventoryColumns];
 const matchedColIds=new Set();
 if(q&&rows.length){
  const scores={};
  inventoryColumns.forEach(c=>{scores[c.id]=0});
  rows.forEach((r,idx)=>{
   inventoryColumns.forEach(c=>{
    if(c.search(r,idx).toLowerCase().includes(q))scores[c.id]+=1;
   });
  });
  const matchedCols=inventoryColumns.filter(c=>scores[c.id]>0);
  if(matchedCols.length>0){
   matchedCols.sort((a,b)=>scores[b.id]-scores[a.id]);
   matchedCols.forEach(c=>matchedColIds.add(c.id));
   const restCols=inventoryColumns.filter(c=>!matchedColIds.has(c.id));
   cols=[...matchedCols,...restCols];
  }
 }

 const hintEl=$("searchHint");
 if(hintEl){
  if(q&&matchedColIds.size>0){
   const matchedNames=cols.filter(c=>matchedColIds.has(c.id)).map(c=>c.label);
   hintEl.textContent=`⚲ Front column: ${matchedNames.join(", ")}`;
   hintEl.classList.remove("hidden");
  }else{
   hintEl.textContent="";
   hintEl.classList.add("hidden");
  }
 }

 const headRow=$("inventoryHeadRow");
 if(headRow){
  headRow.innerHTML=`
   <th class="check-col"><input type="checkbox" id="selectAllInventory" title="Select all visible items" /></th>
   ${cols.map(c=>`<th class="${matchedColIds.has(c.id)?"matched-col-th":""}">${esc(c.label)}${matchedColIds.has(c.id)?' <span class="col-match-tag">MATCH</span>':""}</th>`).join("")}
   <th class="actions-col">ACTIONS</th>`;
 }

 $("inventoryBody").innerHTML=rows.length?rows.map((x,idx)=>`<tr>
  <td class="check-col">${canManage()?`<input type="checkbox" class="row-check" data-select-item="${x.id}" ${state.selectedIds.has(x.id)?"checked":""} />`:""}</td>
  ${cols.map(c=>`<td class="${matchedColIds.has(c.id)?"matched-col-td":""}">${c.render(x,idx)}</td>`).join("")}
  <td class="actions-col">${canManage()?`<div class="row-actions"><button class="mini-btn" data-edit-item="${x.id}">Edit</button><button class="mini-btn danger" data-delete-item="${x.id}">Delete</button></div>`:"—"}</td>
 </tr>`).join(""):`<tr><td colspan="${cols.length+2}" class="empty-state">No matching inventory items found.</td></tr>`;

 $("inventoryFooter").textContent=`Showing ${rows.length} of ${state.inventory.length} inventory records`;
 updateSelectionUI();
}
function renderTransactions(){
 const q=($("transactionSearch")?.value||"").toLowerCase().trim(),f=$("transactionFilter")?.value||"borrowed";
 const list=state.borrowRecords||[];
 const rows=list.filter(r=>{
  const item=state.inventory.find(x=>x.id===r.item_id);
  const itemName=item?.article||item?.name||r.inventory_items?.name||"";
  const itemCode=item?.item_code||r.inventory_items?.item_code||"";
  const hay=`${itemName} ${itemCode} ${r.borrower} ${r.reason} ${dateAcquiredSearchTokens(r.expected_return)} ${dateAcquiredSearchTokens(r.borrowed_date)}`.toLowerCase();
  const matchFilter=f==="all"||!f||r.status===f;
  return hay.includes(q)&&matchFilter;
 });
 $("transactionsBody").innerHTML=rows.length?rows.map(r=>{
  const item=state.inventory.find(x=>x.id===r.item_id);
  const itemName=item?.article||item?.name||r.inventory_items?.name||"Deleted item";
  const itemCode=item?.item_code||r.inventory_items?.item_code||"";
  const loc=item?.location?` · ${item.location}`:"";
  return `<tr>
   <td><strong>${esc(itemName)}</strong><br><small>${esc(itemCode||"No Property No.")}${esc(loc)}</small></td>
   <td><strong>${esc(r.borrower)}</strong></td>
   <td>${esc(r.reason||"—")}</td>
   <td>${esc(formatDateAcquired(r.borrowed_date)||date(r.created_at))}</td>
   <td><strong>${esc(formatDateAcquired(r.expected_return)||"—")}</strong></td>
   <td>${statusBadge(r.status)}</td>
   <td class="actions-col">${r.status==="borrowed"&&canManage()?`<button class="mini-btn" data-return-item="${r.item_id}">↩ Return</button>`:"—"}</td>
  </tr>`;
 }).join(""):`<tr><td colspan="7" class="empty-state">${f==="borrowed"?"No items are currently borrowed.":"No borrow/return records found."}</td></tr>`;
}
function renderRequests(){const q=$("requestSearch").value.toLowerCase(),f=$("requestFilter").value;const rows=state.requests.filter(r=>(`${r.profiles?.full_name||""} ${r.inventory_items?.name||""} ${r.note||""}`.toLowerCase().includes(q))&&(!f||r.status===f));$("requestsBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${date(r.created_at)}</td><td>${esc(r.profiles?.full_name||"User")}</td><td>${esc(r.inventory_items?.name||"Item")}</td><td>${number(r.quantity)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.note||"—")}</td><td>${canManage()&&r.status==="pending"?`<div class="row-actions"><button class="mini-btn" data-request-action="approved" data-id="${r.id}">Approve</button><button class="mini-btn" data-request-action="rejected" data-id="${r.id}">Reject</button></div>`:canManage()&&r.status==="approved"?`<button class="mini-btn" data-request-action="fulfilled" data-id="${r.id}">Mark fulfilled</button>`:"—"}</td></tr>`).join(""):'<tr><td colspan="7" class="empty-state">No requests found.</td></tr>'}
function renderHistory(){
 const el=$("historyBody");if(!el)return;
 const q=($("historySearch")?.value||"").toLowerCase(),f=$("historyFilter")?.value||"";
 const rows=state.history.filter(h=>(`${h.item_name||""} ${h.item_code||""} ${h.details||""} ${h.actor_name||""}`.toLowerCase().includes(q))&&(!f||h.action===f));
 el.innerHTML=rows.length?rows.map(h=>`<tr><td>${dateTime(h.created_at)}</td><td>${statusBadge(h.action)}</td><td><strong>${esc(h.item_name)}</strong></td><td>${esc(h.item_code||"—")}</td><td>${esc(h.details||"—")}</td><td><strong>${esc(h.actor_name||"User")}</strong></td></tr>`).join(""):'<tr><td colspan="6" class="empty-state">No history logs found.</td></tr>';
}
function renderReports(){const total=state.inventory.length,borrowed=state.inventory.filter(x=>statusFor(x)==="borrowed").length,available=Math.max(0,total-borrowed),qty=state.inventory.reduce((s,x)=>s+Number(x.quantity||0),0);$("reportSummary").innerHTML=[["Unique item records",total],["Available items",available],["Borrowed items",borrowed],["Total physical count",qty],["Pending requests",state.requests.filter(x=>x.status==="pending").length]].map(([a,b])=>`<div class="report-line"><span>${a}</span><strong>${number(b)}</strong></div>`).join("");const cats={};state.inventory.forEach(x=>cats[x.category||"Uncategorized"]=(cats[x.category||"Uncategorized"]||0)+1);$("reportCategories").innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="category-row"><span>${esc(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${total?n/total*100:0}%"></div></div><strong>${n}</strong></div>`).join("")||'<div class="empty-state">No category data.</div>'}
function openModal(type,title,fields,record=null){state.modalType=type;state.editingId=record?.id||null;$("modalTitle").textContent=title;$("modalEyebrow").textContent=type.toUpperCase();$("modalError").textContent="";$("modalSubmit").textContent="Save changes";$("modalSubmit").className="primary-btn";$("modalSubmit").disabled=false;$("modalFields").innerHTML=fields.map(f=>{const rawVal=record?.[f.name]??f.value??"";const val=f.type==="date"?(toISODate(rawVal)||todayISO()):rawVal;let control;if(f.options)control=`<select name="${f.name}" ${f.required?"required":""}>${f.options.map(o=>`<option value="${esc(o.value)}" ${String(val)===String(o.value)?"selected":""}>${esc(o.label)}</option>`).join("")}</select>`;else if(f.type==="textarea")control=`<textarea name="${f.name}" placeholder="${esc(f.placeholder||"")}">${esc(val)}</textarea>`;else control=`<input name="${f.name}" type="${f.type||"text"}" value="${esc(val)}" placeholder="${esc(f.placeholder||"")}" ${f.required?"required":""} ${f.min!==undefined?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""}>`;return `<label class="${f.full?"full-field":""}">${f.label}${control}</label>`}).join("");$("modalBackdrop").classList.remove("hidden")}
function closeModal(){$("modalBackdrop").classList.add("hidden");$("modalForm").reset();$("modalSubmit").textContent="Save changes";$("modalSubmit").className="primary-btn";$("modalSubmit").disabled=false;state.editingId=null;state.modalType=null;state.importRows=[];state.deleteIds=[];state.selectedBorrowItemId=null;state.selectedReturnItemId=null}
const categories=["IT Equipment","Office Supplies","Furniture","Laboratory","Books","Sports Equipment","Machinery & Equipment","Cleaning Supplies","Other"];
function itemFields(){
 return [
  {name:"created_at",label:"Date entered",type:"date",value:todayISO(),required:true},
  {name:"seq_no",label:"NO (Sequence)"},
  {name:"school_id",label:"School ID",value:"303812"},
  {name:"district",label:"District",value:"Ramon Magsaysay"},
  {name:"school_name",label:"School Name",value:"SAN ANTONIO NATIONAL HIGH SCHOOL"},
  {name:"old_property_no",label:"Old Property No."},
  {name:"item_code",label:"New Property No."},
  {name:"serial_no",label:"Serial No. / Title No."},
  {name:"model_no",label:"Model No."},
  {name:"date_acquired",label:"Date Acquired (mm/dd/yyyy)"},
  {name:"uacs",label:"UACS"},
  {name:"account_category",label:"Account Category"},
  {name:"account_classification",label:"Account Classification"},
  {name:"account_title",label:"Account Title"},
  {name:"article",label:"Article / Item",required:true},
  {name:"description",label:"Description / Specification"},
  {name:"category",label:"Dashboard Category",options:categories.map(x=>({value:x,label:x}))},
  {name:"unit",label:"Unit of Measure",value:"Unit"},
  {name:"unit_value",label:"Unit Value (₱)",type:"number",min:0,step:"0.01"},
  {name:"qty_property_card",label:"Quantity per Property Card",type:"number",min:0,value:1},
  {name:"quantity",label:"Quantity per Physical Count",type:"number",min:0,value:1,required:true},
  {name:"reorder_level",label:"Reorder Level",type:"number",min:0,value:0},
  {name:"location",label:"Location / Whereabouts"},
  {name:"condition",label:"Condition",value:"In Good Condition"},
  {name:"useful_life",label:"Useful Life"},
  {name:"remarks",label:"Remarks",value:"Usable"},
  {name:"available_documents",label:"Available Documents"},
  {name:"fund_source",label:"Fund Source"},
  {name:"fund",label:"Fund"},
  {name:"accountable_hris_id",label:"Accountable Person (HRIS-ID No.)"},
  {name:"accountable_person",label:"Accountable Person (Regular Employee Only)"}
 ];
}
function openItem(record=null){if(!canManage())return toast("You do not have permission to manage inventory.");openModal("item",record?"Edit inventory item":"Add inventory item",itemFields(),record?{...record,article:record.article||record.name}:null)}
function normKey(k){return String(k??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}
function mapDepEdCategory(accTitle="",accClass="",article=""){
 const t=`${accTitle} ${accClass} ${article}`.toLowerCase();
 if(t.includes("information and communications")||t.includes("ict ")||/\b(laptop|computer|printer|television|tv|projector|router|tablet|monitor|hard drive|flash drive|speaker|microphone|camera|drone)\b/.test(t))return "IT Equipment";
 if(t.includes("furniture")||/\b(table|chair|desk|cabinet|shelf|bookshelf|sofa|divider|bench)\b/.test(t))return "Furniture";
 if(t.includes("technical and scientific")||t.includes("laboratory")||t.includes("medical")||/\b(microscope|beaker|test tube|scale|compass|thermometer|multimeter|oscilloscope)\b/.test(t))return "Laboratory";
 if(t.includes("books")||/\b(book|textbook|dictionary|encyclopedia|module)\b/.test(t))return "Books";
 if(t.includes("sports")||/\b(ball|chess|badminton|volleyball|basketball|baseball|boxing|athletic|net|racket|stopwatch)\b/.test(t))return "Sports Equipment";
 if(t.includes("office equipment")||t.includes("printing equipment")||/\b(paper|stapler|puncher|folder|envelope|marker|pen|ink|toner|calculator|typewriter|binding|laminat|fan|aircon|air condition|dispenser)\b/.test(t))return "Office Supplies";
 if(t.includes("machinery")||t.includes("agricultural")||t.includes("disaster")||t.includes("communications equipment")||t.includes("construction")||/\b(mower|grasscutter|generator|pump|welding|extinguisher|ladder|wheelbarrow|tool)\b/.test(t))return "Machinery & Equipment";
 return "Other";
}
function normalizeExcelRow(raw){
 const norm={};Object.entries(raw||{}).forEach(([k,v])=>{const nk=normKey(k);if(nk)norm[nk]=v});
 const pick=(...keys)=>{for(const k of keys){const val=cleanCell(norm[k]);if(val!=="")return val}return ""};
 const article=pick("article_item","article");
 const rawDesc=pick("description","item_description","specification");
 const fallbackName=pick("name","item_name","item","product","description_name");
 let name="";
 if(article){
  if(rawDesc&&rawDesc.toLowerCase()!==article.toLowerCase()&&!rawDesc.toLowerCase().startsWith(article.toLowerCase()))name=`${article} — ${rawDesc}`;
  else name=article;
 }else{
  name=fallbackName||rawDesc;
 }
 if(!name||/^(article\s*\/?\s*item|item\s*name|icf|uis\s*id\s*no|school\s*name|general\s*curricular)$/i.test(article||name))return null;
 const newProp=pick("new_property_no","item_code","property_no","code","sku","item_no","item_number");
 const oldProp=pick("old_property_no");
 const code=cleanProp(newProp)||cleanProp(oldProp)||newProp||null;
 const explicitCat=pick("category","type","group");
 const accTitle=pick("account_title");
 const accClass=pick("account_classification");
 const accCat=pick("account_category");
 const category=explicitCat?(categories.find(c=>c.toLowerCase()===explicitCat.toLowerCase())||explicitCat):mapDepEdCategory(accTitle,accClass||accCat,article||name);
 const qtyCardRaw=pick("quantity_per_property_card","qty_property_card");
 const qtyPhysRaw=pick("quantity_per_physical_count","quantity","qty","stock","count","on_hand")||qtyCardRaw;
 const qtyCard=Math.max(0,Math.round(Number(String(qtyCardRaw||qtyPhysRaw||"0").replace(/,/g,""))||0));
 const qty=Math.max(0,Math.round(Number(String(qtyPhysRaw||"0").replace(/,/g,""))||0));
 const reorderRaw=pick("reorder_level","reorder","min_stock","minimum");
 const reorder=reorderRaw!==""?Math.max(0,parseInt(reorderRaw,10)||0):0;
 const uvalRaw=pick("unit_value");
 const uvalNum=uvalRaw!==""&&!/^(n\/?a|none|-+)$/i.test(uvalRaw)?Number(String(uvalRaw).replace(/[^0-9.-]/g,"")):null;
 return {
  seq_no:pick("no","seq_no")||null,
  school_id:pick("school_id")||null,
  district:pick("district")||null,
  school_name:pick("school_name")||null,
  old_property_no:oldProp||null,
  item_code:code,
  serial_no:pick("serial_no_title_no","serial_no")||null,
  model_no:pick("model_no","model")||null,
  date_acquired:formatDateAcquired(norm.date_acquired_mm_dd_yyyy??norm.date_acquired)||null,
  uacs:pick("uacs")||null,
  account_category:accCat||null,
  account_classification:accClass||null,
  account_title:accTitle||null,
  article:article||name,
  name,
  description:rawDesc||null,
  category,
  unit:pick("unit_of_measure","unit","uom","units")||"Unit",
  unit_value:uvalNum!==null&&!isNaN(uvalNum)?uvalNum:null,
  qty_property_card:qtyCard,
  quantity:qty,
  reorder_level:reorder,
  location:pick("location_whereabouts","location","storage_location","room","shelf")||null,
  condition:pick("condition")||null,
  useful_life:pick("useful_life")||null,
  remarks:pick("remarks")||null,
  available_documents:pick("available_documents")||null,
  fund_source:pick("fund_source")||null,
  fund:pick("fund")||null,
  accountable_hris_id:pick("accountable_person_employee_hris_id_no","accountable_hris_id")||null,
  accountable_person:pick("accountable_person_regular_employee_only","accountable_person")||null
 };
}
function extractWorkbookRows(wb){
 const headerSignals=["article_item","new_property_no","quantity_per_physical_count","name","item_name","item_code","product"];
 for(const sheetName of wb.SheetNames){
  const sheet=wb.Sheets[sheetName];
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
  if(!matrix.length)continue;
  let hIdx=-1,headers=[];
  for(let i=0;i<Math.min(matrix.length,25);i++){
   const rowKeys=matrix[i].map(normKey);
   if(rowKeys.some(k=>headerSignals.includes(k))){hIdx=i;headers=rowKeys;break}
  }
  if(hIdx===-1)continue;
  const parsed=[];
  for(let r=hIdx+1;r<matrix.length;r++){
   const row=matrix[r];
   if(!row||!row.some(c=>String(c??"").trim()!==""))continue;
   const firstCells=row.slice(0,8).map(c=>String(c??"").trim().toLowerCase());
   if(firstCells.some(c=>c==="icf"||c==="uis id no"||c==="general curricular offering"||c.startsWith("accountable person (employee hris")))break;
   const obj={};
   headers.forEach((h,colIdx)=>{if(h&&obj[h]===undefined)obj[h]=row[colIdx]});
   const item=normalizeExcelRow(obj);
   if(item)parsed.push(item);
  }
  if(parsed.length)return parsed;
 }
 return [];
}
function downloadTemplate(){
 if(!window.XLSX)return toast("Excel library is still loading.");
 const sample=[{"NO":1,"SCHOOL ID":"303812","DISTRICT":"Ramon Magsaysay","SCHOOL NAME":"SAN ANTONIO NATIONAL HIGH SCHOOL","OLD PROPERTY NO.":"N/A","NEW PROPERTY NO.":"2023-07-001","SERIAL NO. / TITLE NO.":"N/A","MODEL NO.":"N/A","DATE ACQUIRED (mm/dd/yyyy)":"2023-07-10","UACS":"1060503000","ACCOUNT CATEGORY":"Property, Plant and Equipment","ACCOUNT CLASSIFICATION":"Machinery and Equipment","ACCOUNT TITLE":"Information and Communications Technology Equipment","ARTICLE / ITEM":"Television","DESCRIPTION":'Hisense Smart TV 42"',"UNIT OF MEASURE":"Unit","UNIT VALUE":10300,"QUANTITY PER PROPERTY CARD":1,"QUANTITY PER PHYSICAL COUNT":1,"LOCATION / WHEREABOUTS":"G7-Anthurium","CONDITION":"In Good Condition","USEFUL LIFE":"5","REMARKS":"Usable","AVAILABLE DOCUMENTS":"NONE","FUND SOURCE":"Private (Homeroom PTA)","FUND":"Local Cost","ACCOUNTABLE PERSON (Employee HRIS-ID No.)":"5355956","ACCOUNTABLE PERSON (Regular Employee Only)":"Mirar, Rizaneth Gay Damiao"}];
 const ws=XLSX.utils.json_to_sheet(sample);
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,"ICF Template");
 XLSX.writeFile(wb,"san-antonio-icf-import-template.xlsx");
}
function openImportModal(){
 if(!canManage())return toast("You do not have permission to import inventory.");
 state.modalType="import";state.editingId=null;state.importRows=[];
 $("modalTitle").textContent="Import from Excel";
 $("modalEyebrow").textContent="BULK IMPORT";
 $("modalError").textContent="";
 $("modalSubmit").textContent="Import items";
 $("modalFields").innerHTML=`
  <label class="full-field">Date entered<input type="date" id="importDateInput" name="created_at" value="${todayISO()}" required /></label>
  <div class="import-box">
   <strong>Select one or multiple DepEd ICF Excel (.xlsx, .xls) or CSV files</strong>
   <p class="muted" style="margin-top:4px">All 28 columns of the <strong>DepEd Division Inventory Count Form (ICF)</strong> will be imported and saved.</p>
   <input type="file" id="excelFileInput" accept=".xlsx,.xls,.csv" multiple required />
  </div>
  <div class="import-help">
   <strong>All 28 DepEd ICF columns supported:</strong> <code>NO</code>, <code>SCHOOL ID</code>, <code>DISTRICT</code>, <code>SCHOOL NAME</code>, <code>OLD PROPERTY NO.</code>, <code>NEW PROPERTY NO.</code>, <code>SERIAL NO. / TITLE NO.</code>, <code>MODEL NO.</code>, <code>DATE ACQUIRED</code>, <code>UACS</code>, <code>ACCOUNT CATEGORY</code>, <code>ACCOUNT CLASSIFICATION</code>, <code>ACCOUNT TITLE</code>, <code>ARTICLE / ITEM</code>, <code>DESCRIPTION</code>, <code>UNIT OF MEASURE</code>, <code>UNIT VALUE</code>, <code>QUANTITY PER PROPERTY CARD</code>, <code>QUANTITY PER PHYSICAL COUNT</code>, <code>LOCATION / WHEREABOUTS</code>, <code>CONDITION</code>, <code>USEFUL LIFE</code>, <code>REMARKS</code>, <code>AVAILABLE DOCUMENTS</code>, <code>FUND SOURCE</code>, <code>FUND</code>, <code>ACCOUNTABLE HRIS-ID</code>, <code>ACCOUNTABLE PERSON</code>.<br>
   <button type="button" id="downloadTemplateBtn" class="text-btn" style="padding:4px 0;margin-top:4px">↓ Download sample DepEd ICF Excel template</button>
  </div>
  <div id="importPreviewWrap" class="import-preview hidden"></div>`;
 $("downloadTemplateBtn").addEventListener("click",downloadTemplate);
 $("excelFileInput").addEventListener("change",async e=>{
  const files=Array.from(e.target.files||[]);
  $("modalError").textContent="";
  state.importRows=[];
  const wrap=$("importPreviewWrap");
  wrap.classList.add("hidden");
  if(!files.length)return;
  try{
   const parsed=[];
   for(const file of files){
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array"});
    parsed.push(...extractWorkbookRows(wb));
   }
   if(!parsed.length){$("modalError").textContent="No valid inventory rows found. Make sure your file(s) use the DepEd Inventory Count Form format or have an 'ARTICLE / ITEM' or 'name' column.";return}
   state.importRows=parsed;
   $("modalSubmit").textContent=`Import ${parsed.length} items`;
   wrap.classList.remove("hidden");
   wrap.innerHTML=`<table><thead><tr><th>NO</th><th>NEW PROP NO.</th><th>ARTICLE / ITEM</th><th>DESCRIPTION</th><th>ACCOUNT TITLE</th><th>QTY</th><th>UNIT VALUE</th><th>LOCATION</th><th>CONDITION</th><th>ACCOUNTABLE PERSON</th></tr></thead><tbody>${parsed.slice(0,25).map((r,i)=>`<tr><td>${esc(r.seq_no||(i+1))}</td><td>${esc(r.item_code||"—")}</td><td><strong>${esc(r.article||r.name)}</strong></td><td>${esc(r.description||"—")}</td><td>${esc(r.account_title||r.category)}</td><td>${number(r.quantity)}</td><td>${r.unit_value!==null?`₱${Number(r.unit_value).toLocaleString()}`:"—"}</td><td>${esc(r.location||"—")}</td><td>${esc(r.condition||"—")}</td><td>${esc(r.accountable_person||"—")}</td></tr>`).join("")}</tbody></table><div class="table-footer">${parsed.length} item(s) detected from ${files.length} file(s)${parsed.length>25?" (previewing first 25)":""}</div>`;
  }catch(err){$("modalError").textContent="Could not read file: "+(err.message||"Invalid Excel file")}
 });
 $("modalBackdrop").classList.remove("hidden");
}
function openBorrowModal(){
 if(!canManage())return toast("You do not have permission to record borrow transactions.");
 if(!state.inventory.length)return toast("Add an inventory item first.");
 state.modalType="borrow";state.editingId=null;state.selectedBorrowItemId=null;
 $("modalTitle").textContent="Borrow Item";
 $("modalEyebrow").textContent="BORROW / RETURN";
 $("modalError").textContent="";
 $("modalSubmit").textContent="Confirm Borrow";
 $("modalSubmit").className="primary-btn";
 $("modalSubmit").disabled=true;
 const nextWeek=new Date(Date.now()+7*86400000);
 const defaultReturn=new Date(nextWeek.getTime()-nextWeek.getTimezoneOffset()*60000).toISOString().slice(0,10);
 $("modalFields").innerHTML=`
  <div class="picker-wrap">
   <label class="full-field">Search item to borrow (click an item below to select)<input type="text" id="borrowPickerSearch" placeholder="Search by item name, property no., serial no., or location..." autocomplete="off" /></label>
   <div id="borrowPickerList" class="picker-list"></div>
  </div>
  <div id="borrowPickBanner" class="import-help">Click an item from the list above to check availability and borrow it.</div>
  <input type="hidden" name="item_id" id="borrowItemIdInput" />
  <label>Who Borrowed (Full Name)<input type="text" name="borrower" id="borrowerNameInput" placeholder="Enter name of person borrowing" required /></label>
  <label>Expected Date to Return<input type="date" name="expected_return" id="expectedReturnInput" value="${defaultReturn}" required /></label>
  <label class="full-field">Reason for Borrowing<textarea name="reason" id="borrowReasonInput" placeholder="Enter purpose or reason for borrowing this item..." required></textarea></label>`;

 let highlightedId=null;
 const renderPickerList=()=>{
  const q=($("borrowPickerSearch")?.value||"").toLowerCase().trim();
  const matches=state.inventory.filter(x=>{
   const hay=`${x.article||""} ${x.name||""} ${x.item_code||""} ${x.serial_no||""} ${x.location||""} ${x.accountable_person||""}`.toLowerCase();
   return hay.includes(q);
  }).slice(0,80);
  const listEl=$("borrowPickerList");
  if(!listEl)return;
  if(!matches.length){
   listEl.innerHTML='<div class="empty-state" style="padding:18px">No matching inventory items found.</div>';
   return;
  }
  listEl.innerHTML=matches.map(x=>{
   const st=statusFor(x);
   const active=getActiveBorrow(x.id);
   const isSel=highlightedId===x.id;
   const selClass=isSel?(st==="borrowed"?"selected-borrowed":"selected"):"";
   return `<button type="button" class="picker-item ${selClass}" data-borrow-pick="${x.id}">
    <div class="picker-item-info">
     <strong>${esc(x.article||x.name)}</strong>
     <small>${esc(x.item_code||"No Property No.")}${x.location?` · ${esc(x.location)}`:""}${active?` · Borrowed by ${esc(active.borrower)}`:""}</small>
    </div>
    ${statusBadge(st)}
   </button>`;
  }).join("");
 };

 $("borrowPickerSearch").addEventListener("input",renderPickerList);
 $("borrowPickerList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-borrow-pick]");
  if(!btn)return;
  const id=btn.dataset.borrowPick;
  const item=state.inventory.find(x=>x.id===id);
  if(!item)return;
  highlightedId=id;
  const active=getActiveBorrow(id);
  const banner=$("borrowPickBanner");
  $("modalError").textContent="";
  if(active){
   state.selectedBorrowItemId=null;
   $("borrowItemIdInput").value="";
   $("modalSubmit").disabled=true;
   banner.className="borrow-banner conflict";
   banner.innerHTML=`<strong>⚠ Item is currently borrowed by ${esc(active.borrower)}</strong><div>Item: <b>${esc(item.article||item.name)}</b> ${item.item_code?`(${esc(item.item_code)})`:""}<br>Reason: ${esc(active.reason||"—")} · Expected Return: <b>${esc(formatDateAcquired(active.expected_return)||"—")}</b></div>`;
   toast(`Item is currently borrowed by ${active.borrower}`);
  }else{
   state.selectedBorrowItemId=id;
   $("borrowItemIdInput").value=id;
   $("modalSubmit").disabled=false;
   banner.className="borrow-banner ok";
   banner.innerHTML=`<strong>✓ Selected: ${esc(item.article||item.name)}</strong><div>Property No.: ${esc(item.item_code||"—")} · Location: ${esc(item.location||"—")} · Status: <b>Available</b></div>`;
   $("borrowerNameInput")?.focus();
  }
  renderPickerList();
 });

 renderPickerList();
 $("modalBackdrop").classList.remove("hidden");
 setTimeout(()=>$("borrowPickerSearch")?.focus(),30);
}

function openReturnModal(preselectedItemId=null){
 if(!canManage())return toast("You do not have permission to process returns.");
 state.modalType="return";state.editingId=null;state.selectedReturnItemId=preselectedItemId||null;
 $("modalTitle").textContent="Return Item";
 $("modalEyebrow").textContent="BORROW / RETURN";
 $("modalError").textContent="";
 $("modalSubmit").textContent="Confirm Return";
 $("modalSubmit").className="primary-btn";
 $("modalSubmit").disabled=!preselectedItemId;
 $("modalFields").innerHTML=`
  <div class="picker-wrap">
   <label class="full-field">Search borrowed item to return (click an item below)<input type="text" id="returnPickerSearch" placeholder="Search by item name, property no., or borrower name..." autocomplete="off" /></label>
   <div id="returnPickerList" class="picker-list"></div>
  </div>
  <div id="returnPickBanner" class="import-help">Click a borrowed item above to return it to inventory.</div>
  <input type="hidden" name="item_id" id="returnItemIdInput" value="${esc(preselectedItemId||"")}" />
  <label class="full-field">Return Remarks / Condition (optional)<input type="text" name="return_notes" placeholder="e.g. Returned in good condition" /></label>`;

 const selectForReturn=(id)=>{
  const item=state.inventory.find(x=>x.id===id);
  const active=getActiveBorrow(id);
  const banner=$("returnPickBanner");
  if(!item||!active){
   state.selectedReturnItemId=null;
   $("returnItemIdInput").value="";
   $("modalSubmit").disabled=true;
   return;
  }
  state.selectedReturnItemId=id;
  $("returnItemIdInput").value=id;
  $("modalSubmit").disabled=false;
  banner.className="borrow-banner ok";
  banner.innerHTML=`<strong>↩ Returning: ${esc(item.article||item.name)} ${item.item_code?`(${esc(item.item_code)})`:""}</strong><div>Borrowed by: <b>${esc(active.borrower)}</b> · Reason: ${esc(active.reason||"—")} · Expected Return: <b>${esc(formatDateAcquired(active.expected_return)||"—")}</b></div>`;
 };

 const renderReturnList=()=>{
  const q=($("returnPickerSearch")?.value||"").toLowerCase().trim();
  const borrowedItems=state.inventory.filter(x=>statusFor(x)==="borrowed");
  const matches=borrowedItems.filter(x=>{
   const b=getActiveBorrow(x.id);
   const hay=`${x.article||""} ${x.name||""} ${x.item_code||""} ${x.location||""} ${b?.borrower||""} ${b?.reason||""}`.toLowerCase();
   return hay.includes(q);
  });
  const listEl=$("returnPickerList");
  if(!listEl)return;
  if(!borrowedItems.length){
   listEl.innerHTML='<div class="empty-state" style="padding:18px">No items are currently borrowed.</div>';
   return;
  }
  if(!matches.length){
   listEl.innerHTML='<div class="empty-state" style="padding:18px">No matching borrowed items found.</div>';
   return;
  }
  listEl.innerHTML=matches.map(x=>{
   const b=getActiveBorrow(x.id);
   const isSel=state.selectedReturnItemId===x.id;
   return `<button type="button" class="picker-item ${isSel?"selected":""}" data-return-pick="${x.id}">
    <div class="picker-item-info">
     <strong>${esc(x.article||x.name)}</strong>
     <small>${esc(x.item_code||"No Property No.")} · Borrowed by: <b>${esc(b?.borrower||"Borrower")}</b> · Expected: ${esc(formatDateAcquired(b?.expected_return)||"—")}</small>
    </div>
    ${statusBadge("borrowed")}
   </button>`;
  }).join("");
 };

 $("returnPickerSearch").addEventListener("input",renderReturnList);
 $("returnPickerList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-return-pick]");
  if(!btn)return;
  selectForReturn(btn.dataset.returnPick);
  renderReturnList();
 });

 if(preselectedItemId)selectForReturn(preselectedItemId);
 renderReturnList();
 $("modalBackdrop").classList.remove("hidden");
}
function openRequest(){const opts=state.inventory.filter(x=>statusFor(x)==="available").map(x=>({value:x.id,label:`${x.article||x.name} (${x.quantity} ${x.unit||"pcs"} available)`}));if(!opts.length)return toast("No available inventory items to request.");openModal("request","Create supply request",[{name:"item_id",label:"Requested item",options:opts,required:true},{name:"quantity",label:"Quantity",type:"number",min:1,required:true},{name:"created_at",label:"Date entered",type:"date",value:todayISO(),required:true},{name:"note",label:"Purpose / note",type:"textarea",full:true}])}
function openDeleteModal(ids){
 if(!canManage())return toast("You do not have permission to delete inventory.");
 if(!ids.length)return;
 state.modalType="delete";state.editingId=null;state.deleteIds=ids;
 const items=ids.map(id=>state.inventory.find(x=>x.id===id)).filter(Boolean);
 $("modalTitle").textContent=ids.length===1?"Confirm Item Deletion":`Confirm Bulk Deletion (${ids.length} items)`;
 $("modalEyebrow").textContent="SECURITY CHECK";
 $("modalError").textContent="";
 $("modalSubmit").textContent=`Confirm & Delete (${ids.length})`;
 $("modalSubmit").className="danger-btn";
 $("modalSubmit").disabled=false;
 $("modalFields").innerHTML=`
  <div class="import-help" style="background:#fff5f6;border-color:#f5c6cb;color:#8a2a33">
   <strong>You are about to permanently delete ${ids.length} inventory record(s):</strong><br>
   ${items.slice(0,8).map(x=>`• ${esc(x.article||x.name)} ${x.item_code?`(${esc(x.item_code)})`:""}`).join("<br>")}
   ${items.length>8?`<br><em>…and ${items.length-8} more item(s)</em>`:""}
  </div>
  <label class="full-field">Reason for deletion (optional)<input name="reason" type="text" placeholder="e.g. Duplicate entry, condemned item, data correction" /></label>
  <label class="full-field">Confirm your password to proceed<input name="password" type="password" required autocomplete="current-password" placeholder="Enter your account password" /></label>`;
 $("modalBackdrop").classList.remove("hidden");
}
async function submitModal(e){e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());$("modalSubmit").disabled=true;try{
 if(state.modalType==="item"){
  const isEdit=Boolean(state.editingId);
  const prev=isEdit?state.inventory.find(x=>x.id===state.editingId):null;
  data.quantity=Number(data.quantity||0);
  data.qty_property_card=Number(data.qty_property_card||data.quantity||0);
  data.reorder_level=Number(data.reorder_level||0);
  data.unit_value=data.unit_value!==""&&data.unit_value!==undefined?Number(data.unit_value):null;
  data.item_code=data.item_code||null;
  data.name=data.article?(data.description&&data.description.toLowerCase()!==data.article.toLowerCase()?`${data.article} — ${data.description}`:data.article):(data.name||data.description||"Unnamed item");
  if(data.date_acquired)data.date_acquired=formatDateAcquired(data.date_acquired)||null;
  if(data.created_at)data.created_at=fromDateInput(data.created_at);else delete data.created_at;
  const res=isEdit?await db.from("inventory_items").update(data).eq("id",state.editingId):await db.from("inventory_items").insert({...data,created_by:state.user.id});
  if(res.error)throw res.error;
  await logAudit({
   action:isEdit?"updated":"added",
   item_name:data.article||data.name,
   item_code:data.item_code,
   details:isEdit?`Updated record (Qty: ${prev?.quantity??"—"} → ${data.quantity}, Location: ${data.location||"—"})`:`Added item (Qty: ${data.quantity} ${data.unit||"Unit"}, Location: ${data.location||"—"})`
  });
  toast(isEdit?"Item updated":"Item added");
 }
 if(state.modalType==="borrow"){
  const itemId=data.item_id||state.selectedBorrowItemId;
  if(!itemId)throw new Error("Please search and click an available item to borrow first.");
  const active=getActiveBorrow(itemId);
  if(active)throw new Error(`Item is currently borrowed by ${active.borrower}.`);
  const borrower=(data.borrower||"").trim();
  const reason=(data.reason||"").trim();
  const expectedReturn=formatDateAcquired(data.expected_return)||data.expected_return||"";
  if(!borrower)throw new Error("Please enter the name of the person borrowing.");
  if(!reason)throw new Error("Please enter the reason for borrowing.");
  if(!expectedReturn)throw new Error("Please choose the expected return date.");
  const item=state.inventory.find(x=>x.id===itemId);
  if(Number(item?.quantity||0)<1){
   await db.from("inventory_items").update({quantity:1}).eq("id",itemId);
  }
  const refJson=JSON.stringify({borrower,expected_return:expectedReturn,borrowed_date:formatDateAcquired(todayISO())});
  const {error}=await db.rpc("record_stock_transaction",{p_item_id:itemId,p_type:"out",p_quantity:1,p_reference:refJson,p_notes:reason});
  if(error)throw error;
  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||"Inventory item",
   item_code:item?.item_code||null,
   details:`Borrowed by ${borrower} · Reason: ${reason} · Expected return: ${expectedReturn}`
  });
  toast(`Borrowed by ${borrower}`);
 }
 if(state.modalType==="return"){
  const itemId=data.item_id||state.selectedReturnItemId;
  if(!itemId)throw new Error("Please select a borrowed item to return.");
  const active=getActiveBorrow(itemId);
  if(!active)throw new Error("This item is already marked as Available.");
  const item=state.inventory.find(x=>x.id===itemId);
  const notes=(data.return_notes||"").trim()||"Returned";
  const refJson=JSON.stringify({borrower:active.borrower,returned_date:formatDateAcquired(todayISO())});
  const {error}=await db.rpc("record_stock_transaction",{p_item_id:itemId,p_type:"in",p_quantity:1,p_reference:refJson,p_notes:notes});
  if(error)throw error;
  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||"Inventory item",
   item_code:item?.item_code||null,
   details:`Returned by ${active.borrower}${data.return_notes?.trim()?` · Notes: ${data.return_notes.trim()}`:""}`
  });
  toast("Item returned and marked Available");
 }
 if(state.modalType==="request"){data.quantity=Number(data.quantity);const createdAt=fromDateInput(data.created_at);const res=await db.from("item_requests").insert({item_id:data.item_id,quantity:data.quantity,note:data.note||null,created_at:createdAt,requested_by:state.user.id});if(res.error)throw res.error;toast("Request submitted")}
 if(state.modalType==="import"){
  if(!state.importRows.length)throw new Error("Please select an Excel file with valid inventory items first.");
  const entryDate=fromDateInput(data.created_at);
  const rows=state.importRows.map(r=>({...r,created_at:entryDate,created_by:state.user.id}));
  const chunk=200;
  for(let i=0;i<rows.length;i+=chunk){
   const {error}=await db.from("inventory_items").insert(rows.slice(i,i+chunk));
   if(error)throw error;
  }
  const previewNames=rows.slice(0,3).map(r=>r.article||r.name).join(", ");
  await logAudit({
   action:"imported",
   item_name:`Bulk Excel Import (${rows.length} items)`,
   item_code:rows[0]?.item_code||null,
   details:`Imported ${rows.length} item(s) for date ${toISODate(entryDate)}: ${previewNames}${rows.length>3?"…":""}`
  });
  toast(`Imported ${rows.length} item(s) from Excel`);
 }
 if(state.modalType==="delete"){
  const ids=state.deleteIds||[];
  if(!ids.length)throw new Error("No items selected for deletion.");
  if(!data.password)throw new Error("Please enter your password to confirm deletion.");
  const {error:authErr}=await db.auth.signInWithPassword({email:state.user.email,password:data.password});
  if(authErr)throw new Error("Incorrect password. Deletion was not authorized.");
  const itemsToDelete=ids.map(id=>state.inventory.find(x=>x.id===id)).filter(Boolean);
  const chunk=200;
  for(let i=0;i<ids.length;i+=chunk){
   const {error}=await db.from("inventory_items").delete().in("id",ids.slice(i,i+chunk));
   if(error)throw error;
  }
  ids.forEach(id=>state.selectedIds.delete(id));
  const reasonNote=data.reason?.trim()?` · Reason: ${data.reason.trim()}`:"";
  if(itemsToDelete.length<=10){
   await logAudit(itemsToDelete.map(x=>({
    action:"deleted",
    item_name:x.article||x.name,
    item_code:x.item_code,
    details:`Deleted (Qty: ${x.quantity}, Location: ${x.location||"—"})${reasonNote}`
   })));
  }else{
   const sample=itemsToDelete.slice(0,4).map(x=>x.article||x.name).join(", ");
   await logAudit({
    action:"deleted",
    item_name:`Bulk Deleted (${itemsToDelete.length} items)`,
    item_code:itemsToDelete[0]?.item_code||null,
    details:`Deleted ${itemsToDelete.length} items (${sample}…)${reasonNote}`
   });
  }
  toast(`Deleted ${ids.length} item(s)`);
 }
 closeModal();await loadAll()
 }catch(err){$("modalError").textContent=err.message||"Something went wrong."}finally{$("modalSubmit").disabled=false}}
function deleteItem(id){openDeleteModal([id])}
function bulkDeleteItems(){const ids=[...state.selectedIds];if(ids.length)openDeleteModal(ids)}
async function requestAction(id,status){try{const {error}=await db.from("item_requests").update({status,reviewed_by:state.user.id}).eq("id",id);if(error)throw error;toast("Request updated");await loadAll()}catch(e){toast(e.message)}}
function exportCSV(){
 const cols=["seq_no","created_at","school_id","district","school_name","old_property_no","item_code","serial_no","model_no","date_acquired","uacs","account_category","account_classification","account_title","article","description","category","unit","unit_value","qty_property_card","quantity","reorder_level","location","condition","useful_life","remarks","available_documents","fund_source","fund","accountable_hris_id","accountable_person","status"];
 const lines=[cols.join(","),...state.inventory.map(x=>cols.map(k=>`"${String(k==="created_at"?toISODate(x[k]):k==="date_acquired"?(formatDateAcquired(x[k])||""):k==="status"?(statusFor(x)==="borrowed"?"Borrowed":"Available"):(x[k]??"")).replace(/"/g,'""')}"`).join(","))];
 const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="san-antonio-inventory.csv";a.click();URL.revokeObjectURL(a.href);
}
async function handleSession(user){try{const p=await loadProfile(user);showApp(user,p)}catch(e){$("loginError").textContent=e.message;toast(e.message)}}
async function boot(){if(!hasConfig){$("loginError").textContent="Setup required: add your Supabase project URL and anon key in app.js, then run the SQL schema.";return}const {data:{session}}=await db.auth.getSession();if(session)await handleSession(session.user);db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){state.user=null;$("app").classList.add("hidden");$("loginScreen").classList.remove("hidden")}if(event==="SIGNED_IN"&&session&&state.user?.id!==session.user.id){setTimeout(()=>handleSession(session.user),0)}});}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db)return;$("loginError").textContent="";const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;try{const {data,error}=await db.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error){$("loginError").textContent=error.message;return}if(data?.user)await handleSession(data.user)}catch(err){$("loginError").textContent=err.message||"Unable to sign in."}finally{btn.disabled=false}});
$("logoutBtn").addEventListener("click",()=>db.auth.signOut());$("refreshBtn").addEventListener("click",loadAll);$("mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)setPage(b.dataset.page)});document.body.addEventListener("click",e=>{const go=e.target.closest("[data-go]");if(go)setPage(go.dataset.go);const edit=e.target.closest("[data-edit-item]");if(edit){const r=state.inventory.find(x=>x.id===edit.dataset.editItem);openItem(r)}const del=e.target.closest("[data-delete-item]");if(del)deleteItem(del.dataset.deleteItem);const ret=e.target.closest("[data-return-item]");if(ret)openReturnModal(ret.dataset.returnItem);const act=e.target.closest("[data-request-action]");if(act)requestAction(act.dataset.id,act.dataset.requestAction)});
document.body.addEventListener("change",e=>{
 const all=e.target.closest("#selectAllInventory");
 if(all){state.visibleIds.forEach(id=>{if(all.checked)state.selectedIds.add(id);else state.selectedIds.delete(id)});renderInventory();return}
 const chk=e.target.closest("[data-select-item]");
 if(chk){if(chk.checked)state.selectedIds.add(chk.dataset.selectItem);else state.selectedIds.delete(chk.dataset.selectItem);updateSelectionUI()}
});
$("bulkDeleteBtn").addEventListener("click",bulkDeleteItems);$("addItemBtn").addEventListener("click",()=>openItem());$("importExcelBtn").addEventListener("click",openImportModal);$("borrowItemBtn").addEventListener("click",openBorrowModal);$("returnItemBtn").addEventListener("click",()=>openReturnModal());$("newRequestBtn").addEventListener("click",openRequest);$("modalClose").addEventListener("click",closeModal);$("modalCancel").addEventListener("click",closeModal);$("modalForm").addEventListener("submit",submitModal);$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});$("inventorySearch").addEventListener("input",()=>{const s=document.querySelector(".table-scroll");if(s)s.scrollLeft=0;renderInventory()});$("categoryFilter").addEventListener("change",renderInventory);$("stockFilter").addEventListener("change",renderInventory);$("dateFilter").addEventListener("change",renderInventory);$("transactionSearch").addEventListener("input",renderTransactions);$("transactionFilter").addEventListener("change",renderTransactions);$("requestSearch").addEventListener("input",renderRequests);$("requestFilter").addEventListener("change",renderRequests);$("historySearch").addEventListener("input",renderHistory);$("historyFilter").addEventListener("change",renderHistory);$("exportBtn").addEventListener("click",exportCSV);$("menuToggle").addEventListener("click",()=>$("sidebar").classList.add("open"));$("closeSidebar").addEventListener("click",()=>$("sidebar").classList.remove("open"));
boot();
