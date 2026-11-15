import "./style.css";
import { auth, db, functions } from "./firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "firebase/auth";
import {
  ref, onValue, set, update, remove, push, serverTimestamp
} from "firebase/database";
import { httpsCallable } from "firebase/functions";

const $ = (s) => document.querySelector(s);
const app = $("#app");
let currentUser = null;
let activeTab = "overview";
let cache = { users: {}, licenses: {}, appConfig: {} };
let stopListeners = [];

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const notify = (msg, bad=false) => {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${bad ? "bad" : ""}`;
  setTimeout(() => el.className = "toast", 2800);
};
const callable = (name) => httpsCallable(functions, name);

function loginView() {
  app.innerHTML = `
    <main class="login-wrap">
      <section class="login-card">
        <div class="brand-mark">Z</div>
        <p class="eyebrow">CONTROL CENTER</p>
        <h1>ZYTOOLS <span>ADMIN</span></h1>
        <p class="muted">Secure administrator sign in</p>
        <form id="loginForm">
          <label>Email address<input id="email" type="email" autocomplete="username" required placeholder="admin@example.com"></label>
          <label>Password<input id="password" type="password" autocomplete="current-password" required placeholder="Your password"></label>
          <button class="primary full" type="submit">SIGN IN <b>→</b></button>
          <p id="loginError" class="error"></p>
        </form>
        <p class="tiny">Access is limited to accounts granted the Firebase admin claim.</p>
      </section>
    </main><div id="toast" class="toast"></div>`;
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true; btn.textContent = "CHECKING…";
    try {
      await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
    } catch (err) {
      $("#loginError").textContent = friendlyError(err);
      btn.disabled = false; btn.innerHTML = 'SIGN IN <b>→</b>';
    }
  });
}

function friendlyError(err) {
  const map = {
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/too-many-requests":"Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "permission-denied":"Permission denied. Check admin claim and database rules."
  };
  return map[err.code] || err.message || "Something went wrong.";
}

function shell() {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark small">Z</div><div><b>ZYTOOLS</b><small>ADMIN CONSOLE</small></div></div>
        <div class="side-label">WORKSPACE</div>
        <nav>
          <button data-tab="overview" class="nav active"><span>◈</span> Overview</button>
          <button data-tab="users" class="nav"><span>♙</span> Users</button>
          <button data-tab="licenses" class="nav"><span>⌘</span> License keys</button>
          <button data-tab="database" class="nav"><span>▤</span> Database</button>
          <button data-tab="config" class="nav"><span>⚙</span> App configuration</button>
        </nav>
        <div class="sidebar-bottom"><div class="online-dot"></div><span>Firebase connected</span><button id="logout" title="Sign out">↗</button></div>
      </aside>
      <main class="main">
        <header class="topbar"><div><p class="eyebrow">ZYTOOLS / CONTROL PANEL</p><h2 id="pageTitle">Overview</h2></div><div class="profile"><div class="avatar">A</div><div><b>Administrator</b><small id="adminEmail"></small></div></div></header>
        <section id="content" class="content"></section>
      </main>
    </div><div id="toast" class="toast"></div>`;
  $("#adminEmail").textContent = currentUser.email || currentUser.uid;
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    activeTab = b.dataset.tab;
    document.querySelectorAll(".nav").forEach(n => n.classList.toggle("active", n.dataset.tab === activeTab));
    renderTab();
  }));
  $("#logout").addEventListener("click", () => signOut(auth));
  attachData();
  renderTab();
}

function attachData() {
  stopListeners.forEach(fn => fn());
  stopListeners = [];
  for (const key of ["users","licenses","appConfig"]) {
    const unsub = onValue(ref(db, key), snap => {
      cache[key] = snap.val() || {};
      if (activeTab === "overview" || activeTab === key || activeTab === "database") renderTab();
    }, err => notify(friendlyError(err), true));
    stopListeners.push(unsub);
  }
}

function stat(label, value, icon, tone) {
  return `<article class="stat"><div class="stat-top"><span>${label}</span><i class="${tone}">${icon}</i></div><strong>${value}</strong><small>Realtime database</small></article>`;
}
function renderTab() {
  const titles = {overview:"Overview",users:"User management",licenses:"License management",database:"Database viewer",config:"App configuration"};
  $("#pageTitle").textContent = titles[activeTab];
  const c = $("#content");
  if (activeTab === "overview") {
    c.innerHTML = `
      <div class="welcome"><div><p class="eyebrow">SYSTEM STATUS / LIVE</p><h1>Welcome back, <span>Admin.</span></h1><p class="muted">Manage your ZYTOOLS application from one secure place.</p></div><div class="pulse">● LIVE</div></div>
      <div class="stats">
        ${stat("REGISTERED USERS", Object.keys(cache.users).length, "♙","blue")}
        ${stat("LICENSE KEYS", Object.keys(cache.licenses).length, "⌘","purple")}
        ${stat("ACTIVE KEYS", Object.values(cache.licenses).filter(x=>x && x.status==="active").length, "✓","green")}
        ${stat("BANNED USERS", Object.values(cache.users).filter(x=>x && x.banned===true).length, "⊘","red")}
      </div>
      <div class="panel"><div class="panel-head"><div><p class="eyebrow">QUICK ACCESS</p><h3>Control center</h3></div></div><div class="quick-grid"><button data-go="users">♙ <b>Manage users</b><small>Review user records and access</small></button><button data-go="licenses">⌘ <b>License keys</b><small>Create and revoke license keys</small></button><button data-go="database">▤ <b>Database viewer</b><small>Inspect permitted data</small></button><button data-go="config">⚙ <b>App configuration</b><small>Update app settings</small></button></div></div>`;
    document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{activeTab=b.dataset.go;document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.tab===activeTab));renderTab();});
  } else if (activeTab === "users") renderUsers(c);
  else if (activeTab === "licenses") renderLicenses(c);
  else if (activeTab === "database") renderDatabase(c);
  else renderConfig(c);
}

function renderUsers(c) {
  const users = Object.entries(cache.users);
  c.innerHTML = `<div class="toolbar"><div><p class="muted">App user records stored in Realtime Database.</p></div><button class="primary" id="addUser">＋ ADD USER RECORD</button></div>
  <div class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>USER ID</th><th>EMAIL / LABEL</th><th>STATUS</th><th>LICENSE</th><th>ACTIONS</th></tr></thead><tbody>${users.map(([id,u])=>`<tr><td class="mono">${esc(id)}</td><td>${esc(u.email||u.name||"—")}</td><td><span class="status ${u.banned?"danger":"good"}">${u.banned?"BANNED":"ACTIVE"}</span></td><td>${esc(u.licenseKey||"—")}</td><td><button class="mini" data-edit-user="${esc(id)}">EDIT</button> <button class="mini ${u.banned?"green-btn":"red-btn"}" data-ban="${esc(id)}" data-state="${u.banned?"1":"0"}">${u.banned?"UNBAN":"BAN"}</button></td></tr>`).join("") || `<tr><td colspan="5" class="empty">No user records yet.</td></tr>`}</tbody></table></div></div>`;
  $("#addUser").onclick=()=>userDialog();
  document.querySelectorAll("[data-edit-user]").forEach(b=>b.onclick=()=>userDialog(b.dataset.editUser,cache.users[b.dataset.editUser]));
  document.querySelectorAll("[data-ban]").forEach(b=>b.onclick=()=>toggleBan(b.dataset.ban,b.dataset.state==="1"));
}
function userDialog(id="", u={}) {
  const email=prompt("User email or display label:",u.email||u.name||""); if(email===null)return;
  const licenseKey=prompt("License key (optional):",u.licenseKey||""); if(licenseKey===null)return;
  const key=id||push(ref(db,"users")).key;
  set(ref(db,"users/"+key),{...u,email,licenseKey,banned:!!u.banned,updatedAt:Date.now()})
    .then(()=>notify("User record saved.")).catch(e=>notify(friendlyError(e),true));
}
async function toggleBan(uid, currentlyBanned) {
  const action = currentlyBanned ? "unban" : "ban";
  if(!confirm(`${action.toUpperCase()} this Firebase Authentication account?`))return;
  try {
    const result=await callable("setUserDisabled")({uid,disabled:!currentlyBanned});
    notify(result.data.message || `Account ${action}ned.`);
  } catch(e) { notify(friendlyError(e),true); }
}

function renderLicenses(c) {
  const entries=Object.entries(cache.licenses);
  c.innerHTML=`<div class="toolbar"><p class="muted">Create and manage license records used by your app.</p><button class="primary" id="newKey">＋ GENERATE KEY</button></div>
  <div class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>LICENSE KEY</th><th>OWNER</th><th>STATUS</th><th>EXPIRES</th><th>ACTIONS</th></tr></thead><tbody>${entries.map(([id,v])=>`<tr><td class="mono">${esc(id)}</td><td>${esc(v.owner||"Unassigned")}</td><td><span class="status ${v.status==="active"?"good":"danger"}">${esc((v.status||"inactive").toUpperCase())}</span></td><td>${v.expiresAt?esc(new Date(v.expiresAt).toLocaleDateString()):"Never"}</td><td><button class="mini" data-toggle-key="${esc(id)}">${v.status==="active"?"DISABLE":"ENABLE"}</button> <button class="mini red-btn" data-delete-key="${esc(id)}">DELETE</button></td></tr>`).join("")||`<tr><td colspan="5" class="empty">No license keys created.</td></tr>`}</tbody></table></div></div>`;
  $("#newKey").onclick=async()=>{
    const key="ZY-"+crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase();
    try{await set(ref(db,"licenses/"+key),{status:"active",owner:"",createdAt:Date.now(),expiresAt:null});notify("License key created.");}
    catch(e){notify(friendlyError(e),true);}
  };
  document.querySelectorAll("[data-toggle-key]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.toggleKey, old=cache.licenses[id]||{};
    try{await update(ref(db,"licenses/"+id),{status:old.status==="active"?"disabled":"active",updatedAt:Date.now()});notify("License updated.");}catch(e){notify(friendlyError(e),true);}
  });
  document.querySelectorAll("[data-delete-key]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Delete this license record?"))return;
    try{await remove(ref(db,"licenses/"+b.dataset.deleteKey));notify("License deleted.");}catch(e){notify(friendlyError(e),true);}
  });
}
function renderDatabase(c) {
  c.innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">READ-ONLY INSPECTOR</p><h3>Realtime Database snapshot</h3></div><button class="mini" id="refreshDb">REFRESH</button></div><p class="muted">This view shows only the admin-protected paths exposed to this dashboard.</p><pre class="json-view">${esc(JSON.stringify(cache,null,2))}</pre></div>`;
  $("#refreshDb").onclick=()=>{attachData();notify("Refreshing database…");};
}
function renderConfig(c) {
  const cfg=cache.appConfig||{};
  c.innerHTML=`<div class="panel config-panel"><div class="panel-head"><div><p class="eyebrow">REMOTE SETTINGS</p><h3>Application configuration</h3></div><span class="status good">ADMIN ONLY</span></div>
  <label>Application name<input id="cfgName" value="${esc(cfg.appName||"ZYTOOLS")}"></label>
  <label>Announcement<textarea id="cfgAnnouncement" rows="4">${esc(cfg.announcement||"")}</textarea></label>
  <label>Minimum supported version<input id="cfgVersion" value="${esc(cfg.minimumVersion||"1.0.0")}"></label>
  <label class="switch-row"><span><b>Maintenance mode</b><small>Tell compatible clients the app is under maintenance.</small></span><input id="cfgMaintenance" type="checkbox" ${cfg.maintenance===true?"checked":""}></label>
  <button class="primary" id="saveConfig">SAVE CONFIGURATION →</button></div>`;
  $("#saveConfig").onclick=async()=>{
    const data={appName:$("#cfgName").value.trim(),announcement:$("#cfgAnnouncement").value.trim(),minimumVersion:$("#cfgVersion").value.trim(),maintenance:$("#cfgMaintenance").checked,updatedAt:Date.now()};
    try{await set(ref(db,"appConfig"),data);notify("Configuration saved.");}catch(e){notify(friendlyError(e),true);}
  };
}

onAuthStateChanged(auth, async user => {
  currentUser=user;
  if(!user){stopListeners.forEach(fn=>fn());loginView();return;}
  try {
    const token=await user.getIdTokenResult(true);
    if(token.claims.admin!==true){await signOut(auth);loginView();$("#loginError")?.replaceChildren(document.createTextNode("This account does not have administrator access."));return;}
    shell();
  } catch(e){await signOut(auth);loginView();notify(friendlyError(e),true);}
});
