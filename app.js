/* Antonio High School Inventory System
   Configure SUPABASE_URL and SUPABASE_ANON_KEY below before use.
*/
const SUPABASE_URL = "https://slwujrkglwopzfhlpinv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bImnWL3QDTnFCE24BR34fA_HnFURg2u";
const hasConfig = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = hasConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const state = { user:null, profile:null, inventory:[], transactions:[], requests:[], history:[], maintenance:[], accessRequests:[], profilesList:[], activeBorrows:new Map(), borrowRecords:[], chart:null, editingId:null, modalType:null, importRows:[], selectedIds:new Set(), visibleIds:[], deleteIds:[], selectedBorrowItemId:null, selectedReturnItemId:null, selectedMaintenanceItemId:null };
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
function isAdmin(){return ["admin","developer"].includes(role())}
function isStaff(){return role()==="staff"}
function isTeacher(){return role()==="teacher"}
function canManage(){return ["admin","developer","staff"].includes(role())}
function isPending(){return ["requester","pending"].includes(role())}
function getRequisitionerName(r){
 if(r?.requisitioner_name && String(r.requisitioner_name).trim()) return String(r.requisitioner_name).trim();
 const note=String(r?.note||"");
 if(note.startsWith("[Requisitioner:")){
  const m=note.match(/^\[Requisitioner:\s*([^\]]+)\]/);
  if(m&&m[1]) return m[1].trim();
 }
 return r?.profiles?.full_name || "User";
}
function cleanRequestNote(note=""){
 if(!note) return "—";
 return String(note).replace(/^\[Requisitioner:\s*[^\]]+\]\s*/,"").trim() || "—";
}
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
function isOverdueDate(expectedDateStr, status="borrowed"){
 if(status!=="borrowed"||!expectedDateStr)return false;
 const p=getDateAcquiredParts(expectedDateStr);
 if(!p)return false;
 const exp=new Date(p.y, p.m-1, p.d, 23, 59, 59);
 return Date.now() > exp.getTime();
}
function getOverdueDays(expectedDateStr){
 const p=getDateAcquiredParts(expectedDateStr);
 if(!p)return 0;
 const exp=new Date(p.y, p.m-1, p.d, 23, 59, 59);
 const diff=Date.now() - exp.getTime();
 return diff>0 ? Math.ceil(diff/86400000) : 0;
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
   const isOver=isCurrentlyBorrowed && isOverdueDate(meta.expected_return, "borrowed");
   const overdueDays=isOver ? getOverdueDays(meta.expected_return) : 0;
   const entry={...meta,status:isCurrentlyBorrowed?"borrowed":"returned",is_overdue:isOver,overdue_days:overdueDays};
   if(isCurrentlyBorrowed)activeMap.set(t.item_id,entry);
   records.push(entry);
  }
 }
 state.activeBorrows=activeMap;
 state.borrowRecords=records;
 state.overdueCount=[...activeMap.values()].filter(x=>x.is_overdue).length;
}
function getActiveBorrow(itemId){return state.activeBorrows?.get(itemId)||null}
function statusFor(item){return getActiveBorrow(item.id)?"borrowed":"available"}
function statusBadge(s){const map={available:["Available","available"],borrowed:["Borrowed","borrowed"],overdue:["Overdue","overdue"],returned:["Returned","returned"],in:["Available","available"],low:["Low stock","low-stock"],out:["Borrowed","borrowed"],pending:["Pending","pending"],approved:["Approved","approved"],fulfilled:["Fulfilled","fulfilled"],rejected:["Rejected","rejected"],added:["Added","in-stock"],imported:["Imported","in-stock"],updated:["Edited","low-stock"],deleted:["Deleted","out-of-stock"],in_repair:["Under service","low-stock"],repaired:["Repaired & Restored","in-stock"],condemned:["Condemned","out-of-stock"],teacher:["Teacher","teacher"],staff:["Staff","staff"]};const x=map[s]||[s,s];return `<span class="status ${x[1]}">${x[0]}</span>`}
function itemIcon(category=""){const c=category.toLowerCase();if(c.includes("it")||c.includes("computer"))return "▣";if(c.includes("office")||c.includes("paper")||c.includes("book"))return "▤";if(c.includes("lab"))return "⚗";if(c.includes("furniture"))return "▥";if(c.includes("machin")||c.includes("sport"))return "◈";return "□"}
function setPage(name){const titles={dashboard:"Dashboard",inventory:"Inventory",transactions:"Borrow/Return",requests:"Supply Requisition",maintenance:"Maintenance & Repairs",history:"History",reports:"Reports",access_requests:"Access Requests"};document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(name+"Page").classList.add("active");document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));$("crumb").textContent=titles[name]||(name[0].toUpperCase()+name.slice(1));$("sidebar").classList.remove("open");if(name==="reports")renderReports();if(name==="history")renderHistory();if(name==="maintenance")renderMaintenance();if(name==="access_requests")renderAccessRequests();}
function showApp(user,profile){state.user=user;state.profile=profile;$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");const display=profile?.full_name||user.email?.split("@")[0]||"User";$("userName").textContent=display;$("welcomeName").textContent=display.split(" ")[0];const roleTitle=role()==="admin"?"Administrator":role()==="developer"?"Developer / Admin":role()==="staff"?"Staff Custodian":"Teacher";$("userRole").textContent=roleTitle;$("avatar").textContent=display[0].toUpperCase();document.querySelectorAll('[data-go="inventory"]').forEach(b=>b.style.display=canManage()?"":"none");$("addItemBtn").style.display=canManage()?"":"none";$("importExcelBtn").style.display=canManage()?"":"none";if($("borrowItemBtn"))$("borrowItemBtn").style.display=canManage()?"":"none";if($("returnItemBtn"))$("returnItemBtn").style.display=canManage()?"":"none";if($("accessRequestsNavItem"))$("accessRequestsNavItem").classList.toggle("hidden",!isAdmin());$("requestNavCount").style.display="";loadAll()}
async function loadProfile(user){
 const fallback={id:user.id,full_name:user.email?.split("@")[0]||"User",role:"admin"};
 try{
  const {data,error}=await db.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(!error&&data)return data;
  const {data:created,error:e}=await db.from("profiles").insert({id:user.id,full_name:fallback.full_name,role:"requester"}).select().maybeSingle();
  if(!e&&created)return created;
  return fallback;
 }catch(err){
  console.warn("loadProfile notice:",err.message);
  return fallback;
 }
}
async function logAudit(entries){
 try{
  const list=(Array.isArray(entries)?entries:[entries]).map(e=>({action:e.action,item_name:e.item_name||"Inventory item",item_code:e.item_code||null,details:e.details||null,actor_id:state.user?.id||null,actor_name:actorName()}));
  const chunk=200;
  for(let i=0;i<list.length;i+=chunk){await db.from("audit_logs").insert(list.slice(i,i+chunk))}
 }catch(e){console.warn("Audit log skipped:",e.message)}
}
async function loadAll(){
 try{
  const [i,t,r,h,p,m]=await Promise.all([
   db.from("inventory_items").select("*").order("name"),
   db.from("stock_transactions").select("*, inventory_items(name, item_code)").order("created_at",{ascending:false}).limit(1000),
   db.from("item_requests").select("*, inventory_items(name, item_code)").order("created_at",{ascending:false}).limit(100),
   db.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(300),
   db.from("profiles").select("*").order("created_at",{ascending:false}),
   db.from("maintenance_logs").select("*, inventory_items(name, item_code, location, condition)").order("created_at",{ascending:false}).limit(200)
  ]);
  if(i.error)throw i.error;
  if(t.error)throw t.error;
  if(r.error)throw r.error;
  state.profilesList=p.data||[];
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
  state.maintenance=(m&&!m.error)?(m.data||[]).map(x=>({
   ...x,
   profiles:x.reported_by&&profilesMap.has(x.reported_by)?profilesMap.get(x.reported_by):{full_name:"Staff"}
  })):[];
  state.history=h.error?[]:(h.data||[]);
  if(isAdmin()){
   const acc=await db.from("access_requests").select("*").order("created_at",{ascending:false});
   state.accessRequests=(acc&&!acc.error)?(acc.data||[]):[];
  }else{
   state.accessRequests=[];
  }
  rebuildBorrowState();
  renderAll();
 }catch(e){
  toast("Could not load data: "+e.message);
  console.error(e);
 }
}
function renderAll(){renderDashboard();renderInventory();renderTransactions();renderRequests();renderMaintenance();if(isAdmin()){populateRegisteredUsersDropdown();renderAccessRequests();}renderHistory();populateCategoryFilter()}
function renderDashboard(){
 const total=state.inventory.length,borrowed=state.inventory.filter(x=>statusFor(x)==="borrowed").length,available=Math.max(0,total-borrowed),pending=state.requests.filter(x=>x.status==="pending").length,overdue=state.overdueCount||0;
 $("statTotal").textContent=number(total);
 $("statStock").textContent=number(available);
 $("statLow").textContent=number(borrowed);
 $("statPending").textContent=number(pending);
 $("requestNavCount").textContent=pending;
 const activeMaint=state.maintenance.filter(x=>x.status==="pending"||x.status==="in_repair").length;
 const navMaint=$("maintenanceNavCount");
 if(navMaint){
  if(activeMaint>0){navMaint.textContent=activeMaint;navMaint.classList.remove("hidden")}
  else{navMaint.classList.add("hidden")}
 }
 const pendingAccess=state.accessRequests.filter(x=>x.status==="pending").length;
 const navAcc=$("accessNavCount");
 if(navAcc){
  if(isAdmin()&&pendingAccess>0){navAcc.textContent=`${pendingAccess} new`;navAcc.classList.remove("hidden")}
  else{navAcc.classList.add("hidden")}
 }
 const navBorrow=$("borrowNavCount");
 if(navBorrow){
  if(overdue>0){navBorrow.textContent=`${overdue} overdue`;navBorrow.className="nav-count danger-tag";navBorrow.classList.remove("hidden")}
  else if(borrowed>0){navBorrow.textContent=borrowed;navBorrow.className="nav-count";navBorrow.classList.remove("hidden")}
  else{navBorrow.classList.add("hidden")}
 }
 const borrowedFoot=$("statBorrowedFoot");
 if(borrowedFoot){
  borrowedFoot.innerHTML=overdue>0?`<span class="danger-text"><b>⚠ ${overdue} item(s) overdue</b></span>`:"Currently borrowed out";
 }
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
 const clearBtn=$("clearDateFilterBtn");
 if(clearBtn)clearBtn.classList.toggle("hidden",!df);

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
  let matchFilter=false;
  if(f==="overdue")matchFilter=r.status==="borrowed"&&r.is_overdue;
  else if(f==="all"||!f)matchFilter=true;
  else matchFilter=r.status===f;
  return hay.includes(q)&&matchFilter;
 });
 $("transactionsBody").innerHTML=rows.length?rows.map(r=>{
  const item=state.inventory.find(x=>x.id===r.item_id);
  const itemName=item?.article||item?.name||r.inventory_items?.name||"Deleted item";
  const itemCode=item?.item_code||r.inventory_items?.item_code||"";
  const loc=item?.location?` · ${item.location}`:"";
  const isOver=r.status==="borrowed"&&r.is_overdue;
  const statusDisplay=isOver?`<span class="status overdue">Overdue (${r.overdue_days}d)</span>`:statusBadge(r.status);
  const returnDateDisplay=isOver
   ? `<strong>${esc(formatDateAcquired(r.expected_return)||"—")}</strong><br><span class="overdue-pill">⚠ Overdue (${r.overdue_days}d)</span>`
   : `<strong>${esc(formatDateAcquired(r.expected_return)||"—")}</strong>`;
  return `<tr>
   <td><strong>${esc(itemName)}</strong><br><small>${esc(itemCode||"No Property No.")}${esc(loc)}</small></td>
   <td><strong>${esc(r.borrower)}</strong></td>
   <td>${esc(r.reason||"—")}</td>
   <td>${esc(formatDateAcquired(r.borrowed_date)||date(r.created_at))}</td>
   <td>${returnDateDisplay}</td>
   <td>${statusDisplay}</td>
   <td class="actions-col">
    <div class="row-actions">
     ${r.status==="borrowed"&&canManage()?`<button class="mini-btn" data-return-item="${r.item_id}">↩ Return</button>`:""}
     <button class="mini-btn" data-print-slip="${r.id}" title="Print DepEd equipment borrower slip">🖶 Slip</button>
    </div>
   </td>
  </tr>`;
 }).join(""):`<tr><td colspan="7" class="empty-state">${f==="overdue"?"No overdue borrowed items! All borrowed equipment is within the expected return date.":f==="borrowed"?"No items are currently borrowed.":"No borrow/return records found."}</td></tr>`;
}
function renderRequests(){
 const q=($("requestSearch")?.value||"").toLowerCase().trim();
 const f=$("requestFilter")?.value||"";
 const rows=state.requests.filter(r=>{
  const reqName=getRequisitionerName(r);
  const noteClean=cleanRequestNote(r.note);
  const hay=`${reqName} ${r.profiles?.full_name||""} ${r.inventory_items?.name||""} ${noteClean}`.toLowerCase();
  return hay.includes(q)&&(!f||r.status===f);
 });
 const body=$("requestsBody");
 if(!body)return;
 if(!rows.length){
  body.innerHTML='<tr><td colspan="8" class="empty-state">No supply requisitions found.</td></tr>';
  return;
 }
 body.innerHTML=rows.map(r=>{
  const inv=state.inventory.find(x=>x.id===r.item_id);
  const currentStock=inv?Number(inv.quantity||0):0;
  const isStockLow=currentStock<Number(r.quantity)&&(r.status==="pending"||r.status==="approved");
  const stockDisplay=inv
   ? `<strong>${number(currentStock)}</strong> ${esc(inv.unit||"unit")}${isStockLow?` <span class="danger-tag" style="font-size:10px">Low stock</span>`:""}`
   : `<span class="muted">0 (Unavailable)</span>`;

  let actionCol="—";
  if(canManage()){
   if(r.status==="pending"){
    actionCol=`<div class="row-actions"><button class="mini-btn" data-request-action="approved" data-id="${r.id}" title="Approve requisition">Approve</button><button class="mini-btn danger-tag" data-request-action="rejected" data-id="${r.id}" title="Reject requisition">Reject</button><button class="mini-btn" data-ris-slip="${r.id}" title="Print DepEd Requisition and Issue Slip">🖶 RIS</button></div>`;
   }else if(r.status==="approved"){
    actionCol=`<div class="row-actions"><button class="mini-btn primary-tag" data-request-action="fulfilled" data-id="${r.id}" title="Issue items and deduct physical stock">Issue Stock</button><button class="mini-btn" data-ris-slip="${r.id}" title="Print DepEd Requisition and Issue Slip">🖶 RIS</button></div>`;
   }else{
    actionCol=`<div class="row-actions"><button class="mini-btn" data-ris-slip="${r.id}" title="Print DepEd Requisition and Issue Slip">🖶 RIS Slip</button></div>`;
   }
  }else{
   actionCol=`<button class="mini-btn" data-ris-slip="${r.id}" title="Print DepEd Requisition and Issue Slip">🖶 RIS Slip</button>`;
  }

  const reqName=getRequisitionerName(r);
  const recorder=r.profiles?.full_name;
  const hasDiffRecorder=recorder&&recorder.toLowerCase()!==reqName.toLowerCase();

  return `<tr>
   <td>${date(r.created_at)}</td>
   <td><strong>${esc(reqName)}</strong>${hasDiffRecorder?`<br><small class="muted">Recorded by: ${esc(recorder)}</small>`:""}</td>
   <td><strong>${esc(r.inventory_items?.name||inv?.article||"Supply Item")}</strong><br><small>${esc(inv?.item_code||"No Property No.")}${inv?.location?` · ${esc(inv.location)}`:""}</small></td>
   <td><strong>${number(r.quantity)}</strong> <small>${esc(inv?.unit||"unit")}</small></td>
   <td>${stockDisplay}</td>
   <td>${esc(cleanRequestNote(r.note))}</td>
   <td>${statusBadge(r.status)}</td>
   <td class="actions-col">${actionCol}</td>
  </tr>`;
 }).join("");
}
function renderMaintenance(){
 const el=$("maintenanceBody");
 if(!el)return;
 const q=($("maintenanceSearch")?.value||"").toLowerCase().trim();
 const f=$("maintenanceFilter")?.value||"";
 const rows=state.maintenance.filter(m=>{
  const itemName=m.inventory_items?.name||m.item_name||"";
  const itemCode=m.inventory_items?.item_code||m.item_code||"";
  const hay=`${itemName} ${itemCode} ${m.defect||""} ${m.technician||""} ${m.remarks||""} ${m.profiles?.full_name||""} ${m.reported_by_name||""}`.toLowerCase();
  return hay.includes(q)&&(!f||m.status===f);
 });

 if(!rows.length){
  el.innerHTML=`<tr><td colspan="7" class="empty-state">${f==="pending"?"No pending repairs.":f==="in_repair"?"No equipment currently under service.":f==="condemned"?"No condemned assets.":"No maintenance logs found."}</td></tr>`;
  return;
 }

 el.innerHTML=rows.map(m=>{
  const itemName=m.inventory_items?.name||m.item_name||"Equipment";
  const itemCode=m.inventory_items?.item_code||m.item_code||"No Property No.";
  const loc=m.inventory_items?.location?` · ${esc(m.inventory_items.location)}`:"";
  const reporter=m.profiles?.full_name||m.reported_by_name||"Staff";
  let actionBtns="—";
  if(canManage()){
   if(m.status==="pending"){
    actionBtns=`<div class="row-actions"><button class="mini-btn" data-maintenance-action="in_repair" data-id="${m.id}" title="Begin technician service">Start Service</button><button class="mini-btn primary-tag" data-maintenance-action="repaired" data-id="${m.id}" title="Mark fixed and restored to good condition">Repaired</button><button class="mini-btn danger-tag" data-maintenance-action="condemned" data-id="${m.id}" title="Declare condemned/unusable">Condemn</button></div>`;
   }else if(m.status==="in_repair"){
    actionBtns=`<div class="row-actions"><button class="mini-btn primary-tag" data-maintenance-action="repaired" data-id="${m.id}" title="Mark fixed and restored to good condition">Mark Repaired</button><button class="mini-btn danger-tag" data-maintenance-action="condemned" data-id="${m.id}" title="Declare condemned/unusable">Condemn</button></div>`;
   }else if(m.status==="repaired"){
    actionBtns=`<span class="muted" style="font-size:12px">✓ Restored</span>`;
   }else if(m.status==="condemned"){
    actionBtns=`<span class="danger-tag" style="font-size:11px">Condemned</span>`;
   }
  }

  return `<tr>
   <td>${date(m.created_at)}</td>
   <td><strong>${esc(itemName)}</strong><br><small>${esc(itemCode)}${loc}</small></td>
   <td><strong style="color:#b91c1c">${esc(m.defect||"—")}</strong></td>
   <td><strong>${esc(reporter)}</strong></td>
   <td>${esc(m.technician||"—")}${m.remarks?`<br><small class="muted">${esc(m.remarks)}</small>`:""}</td>
   <td>${statusBadge(m.status)}</td>
   <td class="actions-col">${actionBtns}</td>
  </tr>`;
 }).join("");
}
function populateRegisteredUsersDropdown(){
 const el=$("accessUserSelect");
 if(!el)return;
 const currentVal=el.value;
 const users=state.profilesList||[];
 el.innerHTML='<option value="">All Registered Accounts ('+users.length+')</option>'+
   users.map(u=>{
     const emailStr=u.email?` · ${u.email}`:"";
     return `<option value="${esc(u.id)}" ${u.id===currentVal?"selected":""}>${esc(u.full_name||"User")}${esc(emailStr)} [${esc((u.role||"requester").toUpperCase())}]</option>`;
   }).join("");
}
function renderAccessRequests(){
 const body=$("accessRequestsBody");
 if(!body)return;
 if(!isAdmin()){
  body.innerHTML='<tr><td colspan="8" class="empty-state">Only administrators and developers can view access requests.</td></tr>';
  return;
 }
 const q=($("accessSearch")?.value||"").toLowerCase().trim();
 const f=$("accessFilter")?.value||"pending";
 const selectedUserId=$("accessUserSelect")?.value||"";

 if(f==="registered_users"||Boolean(selectedUserId)){
  let users=state.profilesList||[];
  if(selectedUserId){
   users=users.filter(u=>u.id===selectedUserId);
  }
  const filtered=users.filter(u=>{
   const hay=`${u.full_name||""} ${u.email||""} ${u.role||""} ${u.id||""}`.toLowerCase();
   return hay.includes(q);
  });

  if(!filtered.length){
   body.innerHTML='<tr><td colspan="8" class="empty-state">No registered accounts found matching your query.</td></tr>';
   return;
  }

  body.innerHTML=filtered.map(u=>{
   const isSelf=state.user?.id===u.id;
   let actionCol="—";
   if(isSelf){
    actionCol=`<span class="muted" style="font-size:11px">Current Active Account (${(u.role||"admin").toUpperCase()})</span>`;
   }else{
    actionCol=`<div class="row-actions">
     <button class="mini-btn" data-reset-password="${u.id}" title="Set new password for this user">🔑 Password</button>
      ${u.role!=="staff"?`<button class="mini-btn btn-confirm" data-change-role="staff" data-user-id="${u.id}" title="Grant Staff Custodian permissions">Make Staff</button>`:""}
     ${u.role!=="teacher"?`<button class="mini-btn" data-change-role="teacher" data-user-id="${u.id}" title="Assign Teacher role">Make Teacher</button>`:""}
     ${u.role!=="admin"?`<button class="mini-btn" data-change-role="admin" data-user-id="${u.id}" title="Promote to Administrator">Make Admin</button>`:""}
     ${["staff","admin"].includes(u.role)?`<button class="mini-btn btn-cancel" data-change-role="requester" data-user-id="${u.id}" title="Revoke access">Revoke</button>`:""}
    </div>`;
   }

   return `<tr>
    <td>${u.created_at?date(u.created_at):"—"}</td>
    <td><strong>${esc(u.full_name||"School User")}</strong>${isSelf?` <span class="primary-tag" style="font-size:9px">You</span>`:""}</td>
    <td>${u.email?`<a href="mailto:${esc(u.email)}" style="color:var(--blue);text-decoration:none">${esc(u.email)}</a>`:`<span class="muted">UID: ${esc(u.id.slice(0,8))}...</span>`}</td>
    <td><small class="muted">ID: ${esc(u.id.slice(0,8))}</small></td>
    <td>${statusBadge(u.role||"requester")}</td>
    <td>${u.role==="requester"?"Pending confirmation":"Active user profile"}</td>
    <td>${["admin","developer","staff"].includes(u.role)?statusBadge("approved"):statusBadge(u.role||"pending")}</td>
    <td class="actions-col">${actionCol}</td>
   </tr>`;
  }).join("");
  return;
 }

 const rows=state.accessRequests.filter(r=>{
  const hay=`${r.full_name||""} ${r.email||""} ${r.department||""} ${r.requested_role||""} ${r.reason||""}`.toLowerCase();
  const matchesQuery=hay.includes(q);
  const matchesFilter=(!f||f==="all")?true:r.status===f;
  return matchesQuery&&matchesFilter;
 });

 if(!rows.length){
  body.innerHTML=`<tr><td colspan="8" class="empty-state">${f==="pending"?"No pending access requests at this time.":f==="all"?"No access requests found.":"No "+f+" access requests."}</td></tr>`;
  return;
 }

 body.innerHTML=rows.map(r=>{
  let actionCol="—";
  if(r.status==="pending"){
   actionCol=`<div class="row-actions">
    <button class="mini-btn btn-confirm" data-access-action="approved" data-access-role="staff" data-id="${r.id}" title="Confirm and grant staff access">✓ Confirm Staff Access</button>
    <button class="mini-btn btn-cancel" data-access-action="rejected" data-id="${r.id}" title="Cancel request">✕ Cancel</button>
    ${r.user_id?`<button class="mini-btn" data-reset-password="${r.user_id}" title="Set user password">🔑 Password</button>`:""}
   </div>`;
  }else if(r.status==="approved"){
   actionCol=`<div class="row-actions">
    <span class="status staff" style="margin-right:6px">✓ Confirmed Staff</span>
    <button class="mini-btn btn-cancel" data-access-action="rejected" data-id="${r.id}" title="Revoke / Cancel access">Revoke</button>
   </div>`;
  }else if(r.status==="rejected"){
   actionCol=`<div class="row-actions">
    <span class="danger-tag" style="font-size:10px;padding:3px 6px;border-radius:4px;margin-right:6px">✕ Cancelled</span>
    <button class="mini-btn btn-confirm" data-access-action="approved" data-access-role="staff" data-id="${r.id}" title="Re-confirm as Staff">Re-confirm Staff</button>
   </div>`;
  }

  return `<tr>
   <td>${date(r.created_at)}</td>
   <td><strong>${esc(r.full_name||"Staff Applicant")}</strong></td>
   <td><a href="mailto:${esc(r.email)}" style="color:var(--blue);text-decoration:none">${esc(r.email)}</a></td>
   <td>${esc(r.department||"Property / Staff")}</td>
   <td>${statusBadge(r.requested_role||"staff")}</td>
   <td>${esc(r.reason||"Staff account registration")}</td>
   <td>${statusBadge(r.status)}</td>
   <td class="actions-col">${actionCol}</td>
  </tr>`;
 }).join("");
}
async function adminResetUserPassword(userId){
 if(!isAdmin()){toast("Developer or Administrator privileges required.");return}
 const u=(state.profilesList||[]).find(x=>x.id===userId)||{full_name:"User",email:""};
 const label=u.full_name+(u.email?" ("+u.email+")":"");
 const newPass=prompt("Enter new password for "+label+":\n\n(Minimum 6 characters)");
 if(newPass===null)return;
 const cleanPass=newPass.trim();
 if(cleanPass.length<6){alert("Password must be at least 6 characters long.");return}
 try{
  const res=await db.rpc("admin_reset_user_password",{p_user_id:userId,p_new_password:cleanPass});
  if(res.error)throw res.error;
  if(res.data&&!res.data.success)throw new Error(res.data.error||"Password update failed");

  toast("Password updated for "+u.full_name);
  alert("✓ Password successfully updated for "+u.full_name+"!\n\nNew Password: "+cleanPass+"\n\nYou can give this password directly to the user so they can sign in.");
 }catch(e){
  toast("Password reset failed: "+e.message);
  alert("Could not reset password: "+e.message+"\n\nPlease ensure you ran the SQL function admin_reset_user_password in Supabase SQL editor.");
  console.error(e);
 }
}
async function changeUserRole(userId, newRole){
 if(!isAdmin()){toast("Developer or Administrator privileges required.");return}
 const u=(state.profilesList||[]).find(x=>x.id===userId);
 const name=u?.full_name||"User";
 if(!confirm(`Change role of ${name} to ${newRole.toUpperCase()}?`))return;

 try{
  const {error}=await db.from("profiles").update({role:newRole}).eq("id",userId);
  if(error)throw error;

  try{
   await db.from("access_requests")
    .update({
     status:newRole==="rejected"?"rejected":"approved",
     reviewed_by:state.user?.id||null,
     reviewed_at:new Date().toISOString()
    })
    .or(`user_id.eq.${userId},email.eq.${u?.email||""}`);
  }catch(err){console.warn("access_requests sync:",err.message)}



  toast(`Updated: ${name} is now ${newRole.toUpperCase()}`);
  await loadAll();
 }catch(e){
  toast("Failed to update role: "+e.message);
  console.error(e);
 }
}
async function accessRequestAction(id, action, targetRole="staff"){
 if(!isAdmin()){toast("Developer or Administrator privileges required.");return}
 const req=state.accessRequests.find(x=>x.id===id);
 if(!req)return;
 const confirmMsg=action==="approved"
  ? `Confirm ${req.full_name} (${req.email}) for STAFF access?`
  : `Cancel request for ${req.full_name} (${req.email})?`;
 if(!confirm(confirmMsg))return;

 try{
  if(action==="approved"){
   let rpcOk=false;
   try{
    const res=await db.rpc("confirm_staff_user",{p_request_id:id,p_role:targetRole});
    if(res?.data?.success)rpcOk=true;
   }catch(rpcErr){console.warn("RPC notice:",rpcErr.message)}

   if(!rpcOk){
    const updatePayload={
     status:"approved",
     reviewed_by:state.user?.id||null,
     reviewed_at:new Date().toISOString()
    };
    await db.from("access_requests").update(updatePayload).eq("id",id);
    if(req.user_id){
     await db.from("profiles").update({role:targetRole,full_name:req.full_name}).eq("id",req.user_id);
    }else{
     const pEntries=[...(state.profilesMap?.values()||[])];
     const match=pEntries.find(p=>(p.email&&p.email.toLowerCase()===req.email.toLowerCase())||(p.full_name&&p.full_name.toLowerCase()===req.full_name.toLowerCase()));
     if(match){
      await db.from("profiles").update({role:targetRole,full_name:req.full_name}).eq("id",match.id);
     }
    }
   }
   toast(`Confirmed! ${req.full_name} now has Staff access.`);
  }else{
   const updatePayload={
    status:"rejected",
    reviewed_by:state.user?.id||null,
    reviewed_at:new Date().toISOString()
   };
   await db.from("access_requests").update(updatePayload).eq("id",id);
   if(req.user_id){
    await db.from("profiles").update({role:"rejected"}).eq("id",req.user_id);
   }
   toast(`Request for ${req.full_name} was cancelled.`);
  }



  await loadAll();
 }catch(e){
  toast("Failed to update access request: "+e.message);
  console.error(e);
 }
}
function isInventoryLog(h){
 const n=(h.item_name||"").toLowerCase();
 const d=(h.details||"").toLowerCase();
 if(n.includes("password reset")||d.includes("password reset")||d.includes("password was updated")||d.includes("password"))return false;
 if(n.includes("user role")||d.includes("role updated")||d.includes("role changed"))return false;
 if(n.includes("staff access")||n.includes("access request")||d.includes("access request")||d.includes("staff access"))return false;
 return true;
}
function renderHistory(){
 const el=$("historyBody");if(!el)return;
 const q=($("historySearch")?.value||"").toLowerCase(),f=$("historyFilter")?.value||"";
 const rows=state.history
  .filter(isInventoryLog)
  .filter(h=>((`${h.item_name||""} ${h.item_code||""} ${h.details||""} ${h.actor_name||""}`.toLowerCase().includes(q)))&&(!f||h.action===f));
 el.innerHTML=rows.length?rows.map(h=>`<tr><td>${dateTime(h.created_at)}</td><td>${statusBadge(h.action)}</td><td><strong>${esc(h.item_name)}</strong></td><td>${esc(h.item_code||"—")}</td><td>${esc(h.details||"—")}</td><td><strong>${esc(h.actor_name||"User")}</strong></td></tr>`).join(""):'<tr><td colspan="6" class="empty-state">No history logs found.</td></tr>';
}
function renderReports(){const total=state.inventory.length,borrowed=state.inventory.filter(x=>statusFor(x)==="borrowed").length,available=Math.max(0,total-borrowed),qty=state.inventory.reduce((s,x)=>s+Number(x.quantity||0),0);$("reportSummary").innerHTML=[["Unique item records",total],["Available items",available],["Borrowed items",borrowed],["Total physical count",qty],["Pending requests",state.requests.filter(x=>x.status==="pending").length]].map(([a,b])=>`<div class="report-line"><span>${a}</span><strong>${number(b)}</strong></div>`).join("");const cats={};state.inventory.forEach(x=>cats[x.category||"Uncategorized"]=(cats[x.category||"Uncategorized"]||0)+1);$("reportCategories").innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="category-row"><span>${esc(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${total?n/total*100:0}%"></div></div><strong>${n}</strong></div>`).join("")||'<div class="empty-state">No category data.</div>'}
function openModal(type,title,fields,record=null){state.modalType=type;state.editingId=record?.id||null;$("modalTitle").textContent=title;$("modalEyebrow").textContent=type.toUpperCase();$("modalError").textContent="";$("modalSubmit").textContent="Save changes";$("modalSubmit").className="primary-btn";$("modalSubmit").disabled=false;$("modalFields").innerHTML=fields.map(f=>{const rawVal=record?.[f.name]??f.value??"";const val=f.type==="date"?(toISODate(rawVal)||todayISO()):rawVal;let control;if(f.options)control=`<select name="${f.name}" ${f.required?"required":""}>${f.options.map(o=>`<option value="${esc(o.value)}" ${String(val)===String(o.value)?"selected":""}>${esc(o.label)}</option>`).join("")}</select>`;else if(f.type==="textarea")control=`<textarea name="${f.name}" placeholder="${esc(f.placeholder||"")}">${esc(val)}</textarea>`;else control=`<input name="${f.name}" type="${f.type||"text"}" value="${esc(val)}" placeholder="${esc(f.placeholder||"")}" ${f.required?"required":""} ${f.min!==undefined?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""}>`;return `<label class="${f.full?"full-field":""}">${f.label}${control}</label>`}).join("");$("modalBackdrop").classList.remove("hidden")}
function closeModal(){$("modalBackdrop").classList.add("hidden");$("modalForm").reset();$("modalSubmit").textContent="Save changes";$("modalSubmit").className="primary-btn";$("modalSubmit").disabled=false;state.editingId=null;state.modalType=null;state.importRows=[];state.deleteIds=[];state.selectedBorrowItemId=null;state.selectedReturnItemId=null;state.selectedMaintenanceItemId=null}
const categories=["IT Equipment","Office Supplies","Furniture","Laboratory","Books","Sports Equipment","Machinery & Equipment","Cleaning Supplies","Other"];
function itemFields(){
 return [
  {name:"created_at",label:"Date entered",type:"date",value:todayISO(),required:true},
  {name:"seq_no",label:"NO (Sequence)"},
  {name:"school_id",label:"School ID",value:"303812"},
  {name:"district",label:"District",value:"Ramon Magsaysay"},
  {name:"school_name",label:"School Name",value:"ANTONIO NATIONAL HIGH SCHOOL"},
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
 const sample=[{"NO":1,"SCHOOL ID":"303812","DISTRICT":"Ramon Magsaysay","SCHOOL NAME":"ANTONIO NATIONAL HIGH SCHOOL","OLD PROPERTY NO.":"N/A","NEW PROPERTY NO.":"2023-07-001","SERIAL NO. / TITLE NO.":"N/A","MODEL NO.":"N/A","DATE ACQUIRED (mm/dd/yyyy)":"2023-07-10","UACS":"1060503000","ACCOUNT CATEGORY":"Property, Plant and Equipment","ACCOUNT CLASSIFICATION":"Machinery and Equipment","ACCOUNT TITLE":"Information and Communications Technology Equipment","ARTICLE / ITEM":"Television","DESCRIPTION":'Hisense Smart TV 42"',"UNIT OF MEASURE":"Unit","UNIT VALUE":10300,"QUANTITY PER PROPERTY CARD":1,"QUANTITY PER PHYSICAL COUNT":1,"LOCATION / WHEREABOUTS":"G7-Anthurium","CONDITION":"In Good Condition","USEFUL LIFE":"5","REMARKS":"Usable","AVAILABLE DOCUMENTS":"NONE","FUND SOURCE":"Private (Homeroom PTA)","FUND":"Local Cost","ACCOUNTABLE PERSON (Employee HRIS-ID No.)":"5355956","ACCOUNTABLE PERSON (Regular Employee Only)":"Mirar, Rizaneth Gay Damiao"}];
 const ws=XLSX.utils.json_to_sheet(sample);
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,"ICF Template");
 XLSX.writeFile(wb,"antonio-icf-import-template.xlsx");
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
  <label class="full-field">Item Condition upon Return
   <select name="return_condition" id="returnConditionSelect">
    <option value="In Good Condition">In Good Condition</option>
    <option value="Fair / Usable">Fair / Usable</option>
    <option value="Needs Repair">Needs Repair</option>
    <option value="Unserviceable / Damaged">Unserviceable / Damaged</option>
   </select>
  </label>
  <label class="full-field">Return Remarks / Notes (optional)<input type="text" name="return_notes" placeholder="e.g. Returned on time, complete accessories, minor wear" /></label>`;

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
  const condSelect=$("returnConditionSelect");
  if(condSelect&&item.condition){
   const match=Array.from(condSelect.options).find(o=>o.value.toLowerCase()===item.condition.toLowerCase());
   if(match)condSelect.value=match.value;
  }
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
function openRequest(){
 const opts=state.inventory.filter(x=>statusFor(x)==="available").map(x=>({value:x.id,label:`${x.article||x.name}${x.item_code?` (${x.item_code})`:""} — ${x.quantity} ${x.unit||"unit"} available`}));
 if(!opts.length)return toast("No inventory items currently available to request.");
 const defaultRequisitioner=state.profile?.full_name||state.user?.email?.split("@")[0]||"";
 openModal("request","New Supply Requisition (RIS)",[
  {name:"requisitioner_name",label:"Who Requested (Requisitioner Full Name)",value:defaultRequisitioner,placeholder:"Enter full name of teacher or staff member requesting",required:true,full:true},
  {name:"item_id",label:"Consumable / Supply Item to Requisition",options:opts,required:true},
  {name:"quantity",label:"Quantity Requested",type:"number",min:1,value:1,required:true},
  {name:"created_at",label:"Date of Requisition",type:"date",value:todayISO(),required:true},
  {name:"note",label:"Purpose / Instructional / Office Need",type:"textarea",placeholder:"e.g. For Grade 7 exam reproduction, Homeroom cleaning, etc.",full:true,required:true}
 ]);
}
function openMaintenanceModal(){
 state.modalType="maintenance";state.editingId=null;state.selectedMaintenanceItemId=null;
 $("modalTitle").textContent="Report Equipment Defect / Repair";
 $("modalEyebrow").textContent="MAINTENANCE";
 $("modalError").textContent="";
 $("modalSubmit").textContent="Submit Repair Report";
 $("modalSubmit").className="primary-btn";
 $("modalSubmit").disabled=true;
 $("modalFields").innerHTML=`
  <div class="picker-wrap">
   <label class="full-field">Search equipment to report defect (click an item below)<input type="text" id="maintenancePickerSearch" placeholder="Search by equipment name, property no., serial no., or location..." autocomplete="off" /></label>
   <div id="maintenancePickerList" class="picker-list"></div>
  </div>
  <div id="maintenancePickBanner" class="import-help">Click an equipment item from the list above.</div>
  <input type="hidden" name="item_id" id="maintenanceItemIdInput" />
  <label class="full-field">Defect / Reported Issue (Specific breakdown or malfunction)<textarea name="defect" id="maintenanceDefectInput" placeholder="Describe the defect, damaged parts, or symptoms of malfunction..." required></textarea></label>
  <label>Technician / Service Provider (optional)<input type="text" name="technician" placeholder="e.g. In-house ICT, DepEd Division Engineer, External Shop" /></label>
  <label>Initial Status
   <select name="status">
    <option value="pending">Pending Repair (Reported, awaiting technician)</option>
    <option value="in_repair">Under Service / In Repair (Technician actively servicing)</option>
   </select>
  </label>
  <label class="full-field">Remarks / Action Taken (optional)<input type="text" name="remarks" placeholder="e.g. Pulled out for parts replacement, diagnostic ongoing" /></label>`;

 const renderMaintPickerList=()=>{
  const q=($("maintenancePickerSearch")?.value||"").toLowerCase().trim();
  const matches=state.inventory.filter(x=>{
   const hay=`${x.article||""} ${x.name||""} ${x.item_code||""} ${x.serial_no||""} ${x.location||""}`.toLowerCase();
   return hay.includes(q);
  }).slice(0,80);
  const listEl=$("maintenancePickerList");
  if(!listEl)return;
  if(!matches.length){
   listEl.innerHTML='<div class="empty-state" style="padding:18px">No matching equipment found.</div>';
   return;
  }
  listEl.innerHTML=matches.map(x=>{
   const isSel=state.selectedMaintenanceItemId===x.id;
   return `<button type="button" class="picker-item ${isSel?"selected":""}" data-maintenance-pick="${x.id}">
    <div class="picker-item-info">
     <strong>${esc(x.article||x.name)}</strong>
     <small>${esc(x.item_code||"No Property No.")}${x.location?` · ${esc(x.location)}`:""} · Condition: ${esc(x.condition||"Usable")}</small>
    </div>
    ${statusBadge(statusFor(x))}
   </button>`;
  }).join("");
 };

 $("maintenancePickerSearch").addEventListener("input",renderMaintPickerList);
 $("maintenancePickerList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-maintenance-pick]");
  if(!btn)return;
  const id=btn.dataset.maintenancePick;
  const item=state.inventory.find(x=>x.id===id);
  if(!item)return;
  state.selectedMaintenanceItemId=id;
  $("maintenanceItemIdInput").value=id;
  $("modalSubmit").disabled=false;
  const banner=$("maintenancePickBanner");
  banner.className="borrow-banner ok";
  banner.innerHTML=`<strong>✓ Selected: ${esc(item.article||item.name)}</strong><div>Property No.: ${esc(item.item_code||"—")} · Location: ${esc(item.location||"—")} · Current Condition: <b>${esc(item.condition||"Usable")}</b></div>`;
  renderMaintPickerList();
  $("maintenanceDefectInput")?.focus();
 });

 renderMaintPickerList();
 $("modalBackdrop").classList.remove("hidden");
 setTimeout(()=>$("maintenancePickerSearch")?.focus(),30);
}
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
  const notes=(data.return_notes||"").trim();
  const returnCondition=(data.return_condition||"").trim()||item?.condition||"In Good Condition";

  const {error:condErr}=await db.from("inventory_items").update({condition:returnCondition}).eq("id",itemId);
  if(condErr)console.warn("Could not update item condition:",condErr.message);
  if(item)item.condition=returnCondition;

  const noteDetails=`Condition: ${returnCondition}${notes?` · Notes: ${notes}`:""}`;
  const refJson=JSON.stringify({borrower:active.borrower,returned_date:formatDateAcquired(todayISO()),condition:returnCondition});
  const {error}=await db.rpc("record_stock_transaction",{p_item_id:itemId,p_type:"in",p_quantity:1,p_reference:refJson,p_notes:noteDetails});
  if(error)throw error;
  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||"Inventory item",
   item_code:item?.item_code||null,
   details:`Returned by ${active.borrower} · ${noteDetails}`
  });
  toast(`Item returned · Condition: ${returnCondition}`);
 }
 if(state.modalType==="request"){
  data.quantity=Number(data.quantity);
  const createdAt=fromDateInput(data.created_at);
  const requisitionerName=(data.requisitioner_name||"").trim()||actorName();
  const noteContent=(data.note||"").trim()||null;

  let res=await db.from("item_requests").insert({
   item_id:data.item_id,
   quantity:data.quantity,
   requisitioner_name:requisitionerName,
   note:noteContent,
   created_at:createdAt,
   requested_by:state.user.id
  });
  if(res.error){
   const fallbackNote=`[Requisitioner: ${requisitionerName}]${noteContent?` ${noteContent}`:""}`;
   res=await db.from("item_requests").insert({
    item_id:data.item_id,
    quantity:data.quantity,
    note:fallbackNote,
    created_at:createdAt,
    requested_by:state.user.id
   });
   if(res.error)throw res.error;
  }
  const item=state.inventory.find(x=>x.id===data.item_id);
  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||"Supply Requisition",
   item_code:item?.item_code||null,
   details:`Supply requisition created for ${requisitionerName} (Qty: ${data.quantity})`
  });
  toast(`Requisition submitted for ${requisitionerName}`);
 }
 if(state.modalType==="maintenance"){
  const itemId=data.item_id||state.selectedMaintenanceItemId;
  if(!itemId)throw new Error("Please select an equipment item to report.");
  const defect=(data.defect||"").trim();
  if(!defect)throw new Error("Please describe the defect or issue.");
  const item=state.inventory.find(x=>x.id===itemId);
  const technician=(data.technician||"").trim()||null;
  const remarks=(data.remarks||"").trim()||null;
  const initialStatus=data.status||"pending";

  const payload={
   item_id:itemId,
   item_name:item?.article||item?.name||"Equipment",
   item_code:item?.item_code||null,
   defect,
   issue:defect,
   technician,
   remarks,
   status:initialStatus,
   reported_by:state.user?.id||null,
   reported_by_name:actorName()
  };

  const res=await db.from("maintenance_logs").insert(payload);
  if(res.error)throw res.error;

  const newCondition=initialStatus==="in_repair"?"Under Service / In Repair":"Needs Repair / Defective";
  const {error:cErr}=await db.from("inventory_items").update({condition:newCondition}).eq("id",itemId);
  if(cErr)console.warn("Could not update item condition:",cErr.message);
  if(item)item.condition=newCondition;

  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||"Equipment",
   item_code:item?.item_code||null,
   details:`Reported maintenance defect: ${defect} (Status: ${initialStatus})`
  });
  toast("Maintenance report submitted");
 }
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
function openSlipModal(recordId){
 const r=state.borrowRecords?.find(x=>x.id===recordId);
 if(!r)return toast("Borrow record not found.");
 const item=state.inventory.find(x=>x.id===r.item_id)||{};
 const printArea=$("borrowSlipPrintArea");
 if(!printArea)return;
 if($("slipModalTitle"))$("slipModalTitle").textContent="Equipment Borrower Slip";

 const slipNo=`SA-BORROW-${(r.id||"").slice(0,8).toUpperCase()}`;
 const overdueNotice=r.status==="borrowed"&&r.is_overdue
  ? `<div class="slip-overdue-alert no-print"><span>⚠ NOTICE: This borrowed item is OVERDUE by ${r.overdue_days} day(s)</span><span>Expected Return: ${esc(formatDateAcquired(r.expected_return))}</span></div>`
  : "";

 printArea.innerHTML=`
  <div class="slip-sheet">
   ${overdueNotice}
   <div class="slip-header">
    <p>Republic of the Philippines · Department of Education</p>
    <p>Region IX, Zamboanga Peninsula · Schools Division of Zamboanga del Sur</p>
    <h2>ANTONIO NATIONAL HIGH SCHOOL</h2>
    <p>Ramon Magsaysay, Zamboanga del Sur · School ID: 303812</p>
    <div style="font-size:13px;font-weight:800;letter-spacing:1px;margin-top:8px;text-decoration:underline">EQUIPMENT BORROWER SLIP &amp; GATE PASS</div>
   </div>

   <div class="slip-meta-grid">
    <div class="slip-meta-row"><span>Control / Slip No:</span> <strong>${esc(slipNo)}</strong></div>
    <div class="slip-meta-row"><span>Date Borrowed:</span> <strong>${esc(formatDateAcquired(r.borrowed_date)||date(r.created_at))}</strong></div>
    <div class="slip-meta-row"><span>Current Status:</span> <strong>${r.status==="borrowed"?(r.is_overdue?`OVERDUE (${r.overdue_days}d)`:"CURRENTLY BORROWED"):"RETURNED"}</strong></div>
    <div class="slip-meta-row"><span>Expected Return Date:</span> <strong style="${r.is_overdue?'color:#b91c1c':''}">${esc(formatDateAcquired(r.expected_return)||"—")}</strong></div>
   </div>

   <div class="slip-section-title">I. Borrower Information</div>
   <table class="slip-table">
    <tr>
     <th style="width:25%">Name of Borrower</th>
     <td style="width:75%"><strong>${esc(r.borrower)}</strong></td>
    </tr>
    <tr>
     <th>Purpose / Activity</th>
     <td>${esc(r.reason||"—")}</td>
    </tr>
   </table>

   <div class="slip-section-title">II. Equipment / Property Details</div>
   <table class="slip-table">
    <tr>
     <th style="width:25%">Article / Item</th>
     <td style="width:75%"><strong>${esc(item.article||item.name||r.inventory_items?.name||"Unnamed")}</strong></td>
    </tr>
    <tr>
     <th>New Property No.</th>
     <td><strong>${esc(item.item_code||"—")}</strong></td>
    </tr>
    <tr>
     <th>Old Property No. / Serial No.</th>
     <td>${esc(item.old_property_no||"—")} / ${esc(item.serial_no||item.model_no||"—")}</td>
    </tr>
    <tr>
     <th>Condition Upon Issuance</th>
     <td>${esc(item.condition||"In Good Condition")}</td>
    </tr>
    <tr>
     <th>Whereabouts / Location</th>
     <td>${esc(item.location||"—")}</td>
    </tr>
   </table>

   <div class="slip-terms">
    <strong>Terms of Borrowing &amp; Accountability:</strong>
    <ol>
     <li>The borrower acknowledges receipt of the above school property in good working condition.</li>
     <li>The borrower undertakes to exercise due diligence, care, and responsibility for the equipment.</li>
     <li>The equipment must be surrendered on or before the stated <strong>Expected Return Date</strong>. Any loss or unserviceability due to negligence shall be the accountability of the borrower in accordance with DepEd/COA Property Regulations.</li>
    </ol>
   </div>

   <div class="slip-signatures">
    <div class="slip-sig-box">
     <div class="slip-sig-line">${esc(r.borrower)}</div>
     <div class="slip-sig-sub">Borrower Signature over Printed Name<br>Date: ________________________</div>
    </div>
    <div class="slip-sig-box">
     <div class="slip-sig-line">${esc(r.recorded_by||actorName())}</div>
     <div class="slip-sig-sub">Property Custodian / Releasing Officer<br>Date: ________________________</div>
    </div>
   </div>
  </div>`;

 $("slipModalBackdrop")?.classList.remove("hidden");
}

function closeSlipModal(){
 $("slipModalBackdrop")?.classList.add("hidden");
}

function deleteItem(id){openDeleteModal([id])}
function bulkDeleteItems(){const ids=[...state.selectedIds];if(ids.length)openDeleteModal(ids)}
async function requestAction(id,status){
 try{
  const req=state.requests.find(x=>x.id===id);
  if(!req)return toast("Request record not found.");
  const item=state.inventory.find(x=>x.id===req.item_id);
  const reqName=getRequisitionerName(req);
  const noteNote=cleanRequestNote(req.note);

  if(status==="fulfilled"){
   if(!item)throw new Error("The requested item is no longer in the inventory.");
   if(Number(item.quantity||0)<Number(req.quantity||0)){
    throw new Error(`Insufficient stock: Only ${item.quantity} available in inventory, but ${req.quantity} was requested.`);
   }
   const refJson=JSON.stringify({requisitioner:reqName,type:"RIS",request_id:id});
   const noteStr=`RIS Fulfilled · Issued to ${reqName}${noteNote!=="—"?` · Purpose: ${noteNote}`:""}`;
   const {error:txErr}=await db.rpc("record_stock_transaction",{p_item_id:req.item_id,p_type:"out",p_quantity:Number(req.quantity),p_reference:refJson,p_notes:noteStr});
   if(txErr)throw txErr;
   await db.from("item_requests").update({status:"fulfilled",reviewed_by:state.user.id}).eq("id",id);
   await logAudit({
    action:"updated",
    item_name:item.article||item.name||"Supply Item",
    item_code:item.item_code||null,
    details:`Supply Requisition Fulfilled: Deducted ${req.quantity} ${item.unit||"unit"} issued to ${reqName}`
   });
   toast(`Stock issued! Deducted ${req.quantity} ${item.unit||"units"} to ${reqName}.`);
  }else{
   const {error}=await db.from("item_requests").update({status,reviewed_by:state.user.id}).eq("id",id);
   if(error)throw error;
   await logAudit({
    action:"updated",
    item_name:item?.article||item?.name||"Supply Requisition",
    item_code:item?.item_code||null,
    details:`Supply requisition status changed to '${status}' for ${reqName}`
   });
   toast(`Requisition ${status}`);
  }
  await loadAll();
 }catch(e){
  toast(e.message);
  console.error(e);
 }
}

function openRISSlipModal(requestId){
 const req=state.requests.find(x=>x.id===requestId);
 if(!req)return toast("Requisition not found.");
 const item=state.inventory.find(x=>x.id===req.item_id)||req.inventory_items||{};
 const printArea=$("borrowSlipPrintArea");
 if(!printArea)return;
 if($("slipModalTitle"))$("slipModalTitle").textContent="Requisition and Issue Slip (RIS)";

 const risNo=`RIS-${new Date(req.created_at||Date.now()).getFullYear()}-${String((req.id||"").slice(0,6)).toUpperCase()}`;
 const requisitioner=getRequisitionerName(req);
 const noteNote=cleanRequestNote(req.note);

 printArea.innerHTML=`
  <div class="slip-sheet">
   <div class="slip-header">
    <p>Republic of the Philippines · Department of Education</p>
    <p>Region IX, Zamboanga Peninsula · Schools Division of Zamboanga del Sur</p>
    <h2>ANTONIO NATIONAL HIGH SCHOOL</h2>
    <p>Ramon Magsaysay, Zamboanga del Sur · School ID: 303812</p>
    <div style="font-size:13px;font-weight:800;letter-spacing:1px;margin-top:8px;text-decoration:underline">REQUISITION AND ISSUE SLIP (RIS)</div>
    <div style="font-size:11px;color:#555;font-style:italic;margin-top:2px">Appendix 63 · DepEd Standard Form</div>
   </div>

   <div class="slip-meta-grid">
    <div class="slip-meta-row"><span>Entity / School:</span> <strong>ANTONIO NHS</strong></div>
    <div class="slip-meta-row"><span>RIS Control No.:</span> <strong>${esc(risNo)}</strong></div>
    <div class="slip-meta-row"><span>Division:</span> <strong>Zamboanga del Sur</strong></div>
    <div class="slip-meta-row"><span>Date Requested:</span> <strong>${esc(date(req.created_at))}</strong></div>
    <div class="slip-meta-row"><span>Office / Unit:</span> <strong>Academic Department</strong></div>
    <div class="slip-meta-row"><span>Status:</span> <strong>${req.status.toUpperCase()}</strong></div>
   </div>

   <div class="slip-section-title">Requisition &amp; Issuance Items</div>
   <table class="slip-table">
    <thead>
     <tr>
      <th style="width:14%">Stock / Prop No.</th>
      <th style="width:10%">Unit</th>
      <th style="width:36%">Item Description</th>
      <th style="width:12%">Qty Requested</th>
      <th style="width:12%">Qty Issued</th>
      <th style="width:16%">Remarks</th>
     </tr>
    </thead>
    <tbody>
     <tr>
      <td>${esc(item.item_code||"—")}</td>
      <td>${esc(item.unit||"Unit")}</td>
      <td><strong>${esc(item.article||item.name||"Consumable Item")}</strong>${item.description?`<br><small>${esc(item.description)}</small>`:""}</td>
      <td style="text-align:center"><strong>${number(req.quantity)}</strong></td>
      <td style="text-align:center"><strong>${req.status==="fulfilled"?number(req.quantity):"—"}</strong></td>
      <td>${esc(noteNote!=="—"?noteNote:"For school/instructional use")}</td>
     </tr>
    </tbody>
   </table>

   <div class="slip-meta-row" style="margin-top:12px;border:1px solid #d1d5db;padding:8px;border-radius:4px">
    <span>Purpose / Activity:</span> <strong>${esc(noteNote!=="—"?noteNote:"Classroom & Administrative Consumables")}</strong>
   </div>

   <div class="slip-signatures" style="grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 30px;">
    <div class="slip-sig-box">
     <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:20px">Requested by:</div>
     <div class="slip-sig-line">${esc(requisitioner)}</div>
     <div class="slip-sig-sub">Requisitioner<br>Date: ${date(req.created_at)}</div>
    </div>
    <div class="slip-sig-box">
     <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:20px">Approved by:</div>
     <div class="slip-sig-line">School Principal</div>
     <div class="slip-sig-sub">Head of School / Office<br>Date: ________________</div>
    </div>
    <div class="slip-sig-box">
     <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:20px">Issued by:</div>
     <div class="slip-sig-line">${esc(actorName())}</div>
     <div class="slip-sig-sub">Supply / Property Custodian<br>Date: ________________</div>
    </div>
    <div class="slip-sig-box">
     <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:20px">Received by:</div>
     <div class="slip-sig-line">${esc(requisitioner)}</div>
     <div class="slip-sig-sub">Recipient Signature<br>Date: ________________</div>
    </div>
   </div>
  </div>`;

 $("slipModalBackdrop")?.classList.remove("hidden");
}

async function maintenanceAction(id,newStatus){
 if(!canManage())return toast("You do not have permission to update maintenance records.");
 try{
  const m=state.maintenance.find(x=>x.id===id);
  if(!m)return toast("Maintenance record not found.");
  const item=state.inventory.find(x=>x.id===m.item_id);

  let remarks=m.remarks||"";
  if(newStatus==="repaired"){
   const input=prompt("Enter repair remarks / technician resolution (optional):", "Repaired, tested, and restored to functional condition");
   if(input===null)return;
   remarks=input.trim()||remarks;
  }else if(newStatus==="condemned"){
   const ok=confirm(`Are you sure you want to declare this equipment as CONDEMNED / UNREPAIRABLE?\n\nItem: ${item?.article||item?.name||m.item_name}`);
   if(!ok)return;
   const input=prompt("Enter reason / disposal recommendation:", "Unserviceable, beyond economic repair");
   if(input===null)return;
   remarks=input.trim()||remarks;
  }

  const isCompleted=["repaired","condemned"].includes(newStatus);
  const {error}=await db.from("maintenance_logs").update({
   status:newStatus,
   remarks:remarks||null,
   completed_at:isCompleted?new Date().toISOString():null,
   resolved_by:state.user?.id||null
  }).eq("id",id);
  if(error)throw error;

  if(m.item_id){
   if(newStatus==="repaired"){
    await db.from("inventory_items").update({condition:"In Good Condition"}).eq("id",m.item_id);
    if(item)item.condition="In Good Condition";
   }else if(newStatus==="condemned"){
    await db.from("inventory_items").update({condition:"Unserviceable / Condemned"}).eq("id",m.item_id);
    if(item)item.condition="Unserviceable / Condemned";
   }else if(newStatus==="in_repair"){
    await db.from("inventory_items").update({condition:"Under Service / In Repair"}).eq("id",m.item_id);
    if(item)item.condition="Under Service / In Repair";
   }
  }

  const statusLabel=newStatus==="repaired"?"Repaired & Restored":newStatus==="condemned"?"Condemned":newStatus==="in_repair"?"Placed under service":"Updated";
  await logAudit({
   action:"updated",
   item_name:item?.article||item?.name||m.item_name||"Equipment",
   item_code:item?.item_code||m.item_code||null,
   details:`Maintenance status changed to ${statusLabel}${remarks?` (${remarks})`:""}`
  });
  toast(`Maintenance status: ${statusLabel}`);
  await loadAll();
 }catch(e){
  toast("Failed to update maintenance: "+e.message);
  console.error(e);
 }
}

function exportCSV(){
 const cols=["seq_no","created_at","school_id","district","school_name","old_property_no","item_code","serial_no","model_no","date_acquired","uacs","account_category","account_classification","account_title","article","description","category","unit","unit_value","qty_property_card","quantity","reorder_level","location","condition","useful_life","remarks","available_documents","fund_source","fund","accountable_hris_id","accountable_person","status"];
 const lines=[cols.join(","),...state.inventory.map(x=>cols.map(k=>`"${String(k==="created_at"?toISODate(x[k]):k==="date_acquired"?(formatDateAcquired(x[k])||""):k==="status"?(statusFor(x)==="borrowed"?"Borrowed":"Available"):(x[k]??"")).replace(/"/g,'""')}"`).join(","))];
 const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="antonio-inventory.csv";a.click();URL.revokeObjectURL(a.href);
}
function showPendingScreen(user,profile){
 state.user=user;
 state.profile=profile;
 $("loginScreen")?.classList.add("hidden");
 $("app")?.classList.add("hidden");
 $("pendingScreen")?.classList.remove("hidden");
 const nameEl=$("pendingUserName");
 if(nameEl)nameEl.textContent=profile?.full_name||user.email?.split("@")[0]||"Staff Applicant";
}
async function handleSession(user){
 try{
  const p=await loadProfile(user);
  if(["requester","pending","rejected"].includes(p?.role)){
   showPendingScreen(user,p);
   return;
  }
  $("pendingScreen")?.classList.add("hidden");
  showApp(user,p);
 }catch(e){
  $("loginError").textContent=e.message;
  toast(e.message);
 }
}
function setAuthTab(tab){
 const isSign=tab==="signin";
 $("tabSignIn")?.classList.toggle("active",isSign);
 $("tabRegister")?.classList.toggle("active",!isSign);
 $("loginForm")?.classList.toggle("hidden",!isSign);
 $("registerForm")?.classList.toggle("hidden",isSign);
 $("loginError").textContent="";
 if($("registerError"))$("registerError").textContent="";
}
async function handleRegister(e){
 e.preventDefault();
 if(!db)return;
 const btn=$("regSubmitBtn");
 const errEl=$("registerError");
 if(errEl)errEl.textContent="";
 const fullName=$("regFullName")?.value?.trim();
 const email=$("regEmail")?.value?.trim();
 const password=$("regPassword")?.value;
 const department=$("regDepartment")?.value?.trim()||"General Staff";

 if(!fullName||!email||!password){
  if(errEl)errEl.textContent="Please fill out all fields.";
  return;
 }
 if(password.length<6){
  if(errEl)errEl.textContent="Password must be at least 6 characters.";
  return;
 }
 if(btn)btn.disabled=true;

 try{
  const {data,error}=await db.auth.signUp({
   email:email,
   password:password,
   options:{
    data:{full_name:fullName,department:department}
   }
  });
  if(error)throw error;

  const userId=data?.user?.id||null;
  try{
   await db.from("access_requests").insert({
    user_id:userId,
    full_name:fullName,
    email:email,
    department:department,
    requested_role:"staff",
    reason:"Staff account credentials registration",
    status:"pending"
   });
  }catch(accErr){
   console.warn("access_requests insert notice:",accErr.message);
  }

  toast("Credentials registered! Sent to Developer for confirmation.");

  if(data?.session&&data?.user){
   await handleSession(data.user);
  }else{
   alert("Thank you, "+fullName+"!\n\nYour credentials have been submitted and sent to the Developer's dashboard (Access Requests).\n\nOnce the developer confirms your staff access, you can sign in with your email and password.");
   setAuthTab("signin");
   $("loginEmail").value=email;
   $("loginPassword").value="";
  }
 }catch(err){
  if(errEl)errEl.textContent=err.message||"Unable to register credentials.";
  console.error(err);
 }finally{
  if(btn)btn.disabled=false;
 }
}
async function boot(){if(!hasConfig){$("loginError").textContent="Setup required: add your Supabase project URL and anon key in app.js, then run the SQL schema.";return}const {data:{session}}=await db.auth.getSession();if(session)await handleSession(session.user);db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){state.user=null;$("app").classList.add("hidden");$("pendingScreen")?.classList.add("hidden");$("loginScreen").classList.remove("hidden")}if(event==="SIGNED_IN"&&session&&state.user?.id!==session.user.id){setTimeout(()=>handleSession(session.user),0)}});}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db)return;$("loginError").textContent="";const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;try{const {data,error}=await db.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error){$("loginError").textContent=error.message;return}if(data?.user)await handleSession(data.user)}catch(err){$("loginError").textContent=err.message||"Unable to sign in."}finally{btn.disabled=false}});
if($("registerForm"))$("registerForm").addEventListener("submit",handleRegister);
if($("tabSignIn"))$("tabSignIn").addEventListener("click",()=>setAuthTab("signin"));
if($("tabRegister"))$("tabRegister").addEventListener("click",()=>setAuthTab("register"));
if($("switchToRegisterBtn"))$("switchToRegisterBtn").addEventListener("click",()=>setAuthTab("register"));
if($("switchToSignInBtn"))$("switchToSignInBtn").addEventListener("click",()=>setAuthTab("signin"));
if($("pendingSignOutBtn"))$("pendingSignOutBtn").addEventListener("click",()=>{db.auth.signOut();$("pendingScreen")?.classList.add("hidden");$("loginScreen")?.classList.remove("hidden")});
if($("pendingRefreshBtn"))$("pendingRefreshBtn").addEventListener("click",async()=>{
 if(!state.user){$("pendingScreen")?.classList.add("hidden");$("loginScreen")?.classList.remove("hidden");return}
 const btn=$("pendingRefreshBtn");btn.disabled=true;
 try{
  const p=await loadProfile(state.user);
  if(["staff","admin","developer"].includes(p?.role)){
   $("pendingScreen")?.classList.add("hidden");
   toast("Confirmed! You now have Staff access.");
   showApp(state.user,p);
  }else if(p?.role==="rejected"){
   toast("Your access request was cancelled by the developer.");
  }else{
   toast("Status: Still pending developer confirmation.");
  }
 }catch(e){toast("Could not check status: "+e.message)}
 finally{btn.disabled=false}
});
$("logoutBtn").addEventListener("click",()=>db.auth.signOut());$("refreshBtn").addEventListener("click",loadAll);if($("refreshAccessBtn"))$("refreshAccessBtn").addEventListener("click",loadAll);$("mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)setPage(b.dataset.page)});document.body.addEventListener("click",e=>{
 const go=e.target.closest("[data-go]");if(go)setPage(go.dataset.go);
 const edit=e.target.closest("[data-edit-item]");if(edit){const r=state.inventory.find(x=>x.id===edit.dataset.editItem);openItem(r)}
 const del=e.target.closest("[data-delete-item]");if(del)deleteItem(del.dataset.deleteItem);
 const ret=e.target.closest("[data-return-item]");if(ret)openReturnModal(ret.dataset.returnItem);
 const slip=e.target.closest("[data-print-slip]");if(slip)openSlipModal(slip.dataset.printSlip);
 const ris=e.target.closest("[data-ris-slip]");if(ris)openRISSlipModal(ris.dataset.risSlip);
 const act=e.target.closest("[data-request-action]");if(act)requestAction(act.dataset.id,act.dataset.requestAction);
 const mAct=e.target.closest("[data-maintenance-action]");if(mAct)maintenanceAction(mAct.dataset.id,mAct.dataset.maintenanceAction);
 const accAct=e.target.closest("[data-access-action]");if(accAct)accessRequestAction(accAct.dataset.id,accAct.dataset.accessAction,accAct.dataset.accessRole);
 const chRole=e.target.closest("[data-change-role]");if(chRole)changeUserRole(chRole.dataset.userId,chRole.dataset.changeRole);
 const rstPass=e.target.closest("[data-reset-password]");if(rstPass)adminResetUserPassword(rstPass.dataset.resetPassword);
});
document.body.addEventListener("change",e=>{
 const all=e.target.closest("#selectAllInventory");
 if(all){state.visibleIds.forEach(id=>{if(all.checked)state.selectedIds.add(id);else state.selectedIds.delete(id)});renderInventory();return}
 const chk=e.target.closest("[data-select-item]");
 if(chk){if(chk.checked)state.selectedIds.add(chk.dataset.selectItem);else state.selectedIds.delete(chk.dataset.selectItem);updateSelectionUI()}
});
$("bulkDeleteBtn").addEventListener("click",bulkDeleteItems);$("addItemBtn").addEventListener("click",()=>openItem());$("importExcelBtn").addEventListener("click",openImportModal);$("borrowItemBtn").addEventListener("click",openBorrowModal);$("returnItemBtn").addEventListener("click",()=>openReturnModal());$("newRequestBtn").addEventListener("click",openRequest);if($("newMaintenanceBtn"))$("newMaintenanceBtn").addEventListener("click",openMaintenanceModal);$("modalClose").addEventListener("click",closeModal);$("modalCancel").addEventListener("click",closeModal);$("modalForm").addEventListener("submit",submitModal);$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal()});
if($("closeSlipModal"))$("closeSlipModal").addEventListener("click",closeSlipModal);
if($("dismissSlipBtn"))$("dismissSlipBtn").addEventListener("click",closeSlipModal);
if($("printSlipBtn"))$("printSlipBtn").addEventListener("click",()=>window.print());
if($("slipModalBackdrop"))$("slipModalBackdrop").addEventListener("click",e=>{if(e.target===$("slipModalBackdrop"))closeSlipModal()});
function openHelpModal(){$("helpModalBackdrop")?.classList.remove("hidden")}
function closeHelpModal(){$("helpModalBackdrop")?.classList.add("hidden")}
if($("helpBtn"))$("helpBtn").addEventListener("click",openHelpModal);
if($("closeHelpModal"))$("closeHelpModal").addEventListener("click",closeHelpModal);
if($("dismissHelpBtn"))$("dismissHelpBtn").addEventListener("click",closeHelpModal);
if($("helpModalBackdrop"))$("helpModalBackdrop").addEventListener("click",e=>{if(e.target===$("helpModalBackdrop"))closeHelpModal()});
if($("clearDateFilterBtn")){
 $("clearDateFilterBtn").addEventListener("click",()=>{
  if($("dateFilter"))$("dateFilter").value="";
  renderInventory();
 });
}
$("inventorySearch").addEventListener("input",()=>{const s=document.querySelector(".table-scroll");if(s)s.scrollLeft=0;renderInventory()});$("categoryFilter").addEventListener("change",renderInventory);$("stockFilter").addEventListener("change",renderInventory);$("dateFilter").addEventListener("change",renderInventory);$("transactionSearch").addEventListener("input",renderTransactions);$("transactionFilter").addEventListener("change",renderTransactions);$("requestSearch").addEventListener("input",renderRequests);$("requestFilter").addEventListener("change",renderRequests);if($("maintenanceSearch"))$("maintenanceSearch").addEventListener("input",renderMaintenance);if($("maintenanceFilter"))$("maintenanceFilter").addEventListener("change",renderMaintenance);if($("accessSearch"))$("accessSearch").addEventListener("input",renderAccessRequests);if($("accessFilter"))$("accessFilter").addEventListener("change",()=>{if($("accessFilter").value!=="registered_users"&&$("accessUserSelect")){$("accessUserSelect").value=""}renderAccessRequests()});if($("accessUserSelect"))$("accessUserSelect").addEventListener("change",()=>{if($("accessUserSelect").value&&$("accessFilter")){$("accessFilter").value="registered_users"}renderAccessRequests()});$("historySearch").addEventListener("input",renderHistory);$("historyFilter").addEventListener("change",renderHistory);$("exportBtn").addEventListener("click",exportCSV);$("menuToggle").addEventListener("click",()=>$("sidebar").classList.add("open"));$("closeSidebar").addEventListener("click",()=>$("sidebar").classList.remove("open"));
boot();
