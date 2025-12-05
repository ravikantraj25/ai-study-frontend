/* -----------------------------------------------------------------------------
   AI-STUDY FRONTEND — FINAL STABLE VERSION (100% Backend Compatible)
   -----------------------------------------------------------------------------*/

const API_BASE = window.API_BASE || "https://ai-study-backened.onrender.com";
const TOKEN_KEY = "ai_study_token";
const USERNAME_KEY = "ai_study_user";
const DEBUG = false;

/* ---------- Helpers ---------- */
function dbg(...a){ if(DEBUG) console.log(...a); }
function qs(s, r=document){ return r.querySelector(s); }
function go(p){ location.href = p; }
function setMsg(el, msg, err=false){
  if(!el) return;
  if(typeof msg === "object") msg = JSON.stringify(msg, null, 2);
  el.innerHTML = msg;
  el.style.color = err ? "#ff4d6d" : "";
}
function saveToken(t){ if(t) localStorage.setItem(TOKEN_KEY, t); }
function readToken(){ return localStorage.getItem(TOKEN_KEY); }
function clearToken(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USERNAME_KEY); }
function escapeHtml(t){ return String(t||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }
function showLoader(el){ if(el) el.classList.remove("hidden"); }
function hideLoader(el){ if(el) el.classList.add("hidden"); }

/* ---------- Response Parsing ---------- */
async function parseResponse(res){
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  if(ct.includes("json")){
    try { return await res.json(); } catch(e){}
  }

  try {
    const clone = res.clone();
    const maybe = await clone.json().catch(()=>null);
    if(maybe) return maybe;
  } catch(e){}

  return await res.text().catch(()=>null);
}

function prettyErr(parsed, status){
  if(!parsed) return `Error ${status}`;
  if(typeof parsed === "string") return parsed;
  if(parsed.message) return parsed.message;
  if(parsed.error) return parsed.error;
  return JSON.stringify(parsed);
}

/* ---------- HTTP Wrapper ---------- */
async function request(method, path, data=null, token=null, opts={}){
  const headers = {};
  if(!opts.form) headers["Content-Type"] = "application/json";
  if(token) headers["Authorization"] = `Bearer ${token}`;

  const body = opts.form ? data : (data ? JSON.stringify(data) : null);

  dbg("REQUEST", method, path, body);

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body });
  } catch(e){
    throw new Error("Network error: " + (e.message || e));
  }

  const parsed = await parseResponse(res);

  if(!res.ok) throw new Error(prettyErr(parsed, res.status));

  return parsed;
}

const post = (p,d,t,o={}) => request("POST",p,d,t,o);
const get  = (p,t) => request("GET",p,null,t);
const put  = (p,d,t) => request("PUT",p,d,t);
const del  = (p,t) => request("DELETE",p,null,t);

/* -----------------------------------------------------------------------------
   AUTH: REGISTER
-----------------------------------------------------------------------------*/
function hookRegister(){
  const btn = qs("#reg-submit"); if(!btn) return;

  btn.onclick = async ()=>{
    const name = qs("#reg-name").value.trim();
    const email = qs("#reg-email").value.trim();
    const password = qs("#reg-password").value;
    const mobile = qs("#reg-mobile")?.value?.trim();
    const out = qs("#reg-result");

    if(!name || !email || !password) return setMsg(out,"All fields required",true);

    btn.disabled = true; btn.innerText = "Creating...";

    try {
      const res = await post("/auth/register",{ name,email,password,mobile });
      setMsg(out,res.message || "Account created ✓");
      setTimeout(()=>go("login.html"),700);
    } catch(e){
      setMsg(out,e.message,true);
    }

    btn.disabled = false; btn.innerText = "Create Account";
  };
}

/* -----------------------------------------------------------------------------
   AUTH: LOGIN (returns access_token)
-----------------------------------------------------------------------------*/
function hookLogin(){
  const btn = qs("#login-submit"); if(!btn) return;

  btn.onclick = async ()=>{
    const email = qs("#login-email").value.trim();
    const password = qs("#login-password").value;
    const out = qs("#login-result");

    if(!email || !password) return setMsg(out,"Email + password required",true);

    btn.disabled = true; btn.innerText = "Logging in...";

    try {
      const res = await post("/auth/login",{ email,password });
      const token = res.access_token;
      if(!token) throw new Error("Token missing");

      saveToken(token);
      const name = res.user?.name || "User";
      localStorage.setItem(USERNAME_KEY,name);

      setMsg(out,"Login successful ✓");
      setTimeout(()=>go("profile.html"),600);

    } catch(e){
      setMsg(out,"Login failed: "+e.message,true);
    }

    btn.disabled = false; btn.innerText = "Login";
  };
}

/* -----------------------------------------------------------------------------
   PROFILE PAGE
-----------------------------------------------------------------------------*/
function hookProfile(){
  const info = qs("#profile-info"); if(!info) return;

  // Load profile
  (async ()=>{
    try {
      const user = await get("/auth/me",readToken());
      qs("#up-name").value = user.name;
      qs("#up-mobile").value = user.mobile;
      info.innerHTML = `<b>${user.name}</b> — ${user.email}`;
    } catch(e){
      info.innerHTML = "Not logged in.";
    }
  })();

  // Update profile
  qs("#update-submit")?.addEventListener("click", async ()=>{
    const name = qs("#up-name").value.trim();
    const mobile = qs("#up-mobile").value.trim();
    const out = qs("#update-result");

    try {
      const res = await put("/auth/me",{ name,mobile },readToken());

      if(res.user?.name) localStorage.setItem(USERNAME_KEY,res.user.name);

      setMsg(out,"Updated ✓");
      setTimeout(()=>location.reload(),700);

    } catch(e){
      setMsg(out,e.message,true);
    }
  });

  // Logout
  qs("#logout-btn")?.addEventListener("click",()=>{
    clearToken();
    go("../index.html");
  });
}

/* -----------------------------------------------------------------------------
   DELETE ACCOUNT
-----------------------------------------------------------------------------*/
function hookDelete(){
  const btn = qs("#delete-submit"); if(!btn) return;

  btn.onclick = async ()=>{
    const confirmValue = qs("#delete-confirm").value.trim();
    const out = qs("#delete-result");

    if(confirmValue !== "DELETE") return setMsg(out,"Type DELETE to confirm",true);

    btn.disabled = true; btn.innerText = "Deleting...";

    try {
      await del("/auth/me",readToken());
      clearToken();
      go("../index.html");
    } catch(e){
      setMsg(out,e.message,true);
    }

    btn.disabled = false; btn.innerText = "Delete Account";
  };
}

/* -----------------------------------------------------------------------------
   TOOLS: PDF SUMMARY
-----------------------------------------------------------------------------*/
function hookSummarize(){
  const btn = qs("#summarize-btn");
  const fileInput = qs("#pdfFile");
  const out = qs("#summarize-result");
  const loader = qs("#loader");

  if(!btn || !fileInput) return;

  btn.onclick = async ()=>{
    const f = fileInput.files?.[0];
    if(!f) return setMsg(out,"Choose PDF file",true);

    const fd = new FormData();
    fd.append("file",f);

    try {
      showLoader(loader);

      const res = await request("POST","/summarize",fd,readToken(),{ form:true });

      if(res.summary)
        out.innerHTML = `<pre>${escapeHtml(res.summary).replace(/\n/g,"<br>")}</pre>`;
      else
        out.innerHTML = `<pre>${escapeHtml(JSON.stringify(res,null,2))}</pre>`;

    } catch(e){
      setMsg(out,e.message,true);
    }

    hideLoader(loader);
  };
}

/* -----------------------------------------------------------------------------
   EXPLAIN TOPIC
-----------------------------------------------------------------------------*/
function hookExplain(){
  const topicEl = qs("#explain-topic");
  const btn = qs("#explain-btn") || qs("#explain-submit");
  const out = qs("#explain-result");
  const loader = qs("#loader");

  if(!btn || !topicEl) return;

  btn.onclick = async ()=>{
    const topic = topicEl.value.trim();
    if(!topic) return setMsg(out,"Enter topic",true);

    try {
      showLoader(loader);

      const res = await post("/explain",{ topic },readToken());

      if(res.explanation) out.innerHTML = explainFormatter(res.explanation);
      else out.innerHTML = `<pre>${escapeHtml(JSON.stringify(res,null,2))}</pre>`;

    } catch(e){
      setMsg(out,e.message,true);
    }

    hideLoader(loader);
  };
}

function explainFormatter(blocks){
  if(!Array.isArray(blocks))
    return `<pre>${escapeHtml(JSON.stringify(blocks,null,2))}</pre>`;

  let html = "";
  blocks.forEach(sec=>{
    html += `<div class="explain-block">`;

    if(sec.title) html += `<h3>${escapeHtml(sec.title)}</h3>`;
    if(sec.paragraph) html += `<p>${escapeHtml(sec.paragraph)}</p>`;

    if(sec.bullets){
      html += "<ul>";
      sec.bullets.forEach(b=> html += `<li>${escapeHtml(b)}</li>`);
      html += "</ul>";
    }

    if(sec.examples){
      html += "<h4>Examples</h4><ul>";
      sec.examples.forEach(e=> html += `<li>${escapeHtml(e)}</li>`);
      html += "</ul>";
    }

    if(sec.faqs){
      html += "<h4>FAQs</h4>";
      sec.faqs.forEach(f=>{
        html += `<p><b>Q:</b> ${escapeHtml(f.q)}</p>`;
        html += `<p><b>A:</b> ${escapeHtml(f.a)}</p>`;
      });
    }

    html += "</div>";
  });

  return html;
}

/* -----------------------------------------------------------------------------
   MAKE NOTES
-----------------------------------------------------------------------------*/
function hookMakeNotes(){
  const btn = qs("#notes-submit");
  if(!btn) return;

  btn.onclick = async ()=>{
    const text = qs("#notes-text").value.trim();
    const out = qs("#notes-result");
    const loader = qs("#loader");

    if(!text) return setMsg(out,"Enter text",true);

    try {
      showLoader(loader);
      const res = await post("/make-notes",{ text },readToken());
      out.innerHTML = `<pre>${escapeHtml(res.notes || JSON.stringify(res,null,2))}</pre>`;
    } catch(e){
      setMsg(out,e.message,true);
    }

    hideLoader(loader);
  };
}

/* -----------------------------------------------------------------------------
   MCQ GENERATOR
-----------------------------------------------------------------------------*/
function hookMCQ(){
  const btn = qs("#mcq-submit");
  if(!btn) return;

  btn.onclick = async ()=>{
    const text = qs("#mcq-text").value.trim();
    const count = Number(qs("#mcq-count").value) || 5;
    const out = qs("#mcq-result");
    const loader = qs("#loader");

    if(!text) return setMsg(out,"Enter topic",true);

    try {
      showLoader(loader);

      const res = await post("/make-mcq",{ text,count },readToken());

      let html = "<ol>";
      res.forEach(q=>{
        html += `<li><b>${escapeHtml(q.question)}</b><ul>`;
        q.options.forEach(o=> html += `<li>${escapeHtml(o)}</li>`);
        html += "</ul></li>";
      });
      html += "</ol>";
      
      out.innerHTML = html;

    } catch(e){
      setMsg(out,e.message,true);
    }

    hideLoader(loader);
  };
}

/* -----------------------------------------------------------------------------
   QnA
-----------------------------------------------------------------------------*/
function hookQnA(){
  const btn = qs("#qna-submit");
  if(!btn) return;

  btn.onclick = async ()=>{
    const text = qs("#qna-question").value.trim();
    const out = qs("#qna-result");
    const loader = qs("#loader");

    if(!text) return setMsg(out,"Enter question",true);

    try {
      showLoader(loader);
      const res = await post("/qna",{ question:text },readToken());
      out.innerHTML = `<p>${escapeHtml(res.answer)}</p>`;
    } catch(e){
      setMsg(out,e.message,true);
    }

    hideLoader(loader);
  };
}

/* -----------------------------------------------------------------------------
   NOTES HISTORY
-----------------------------------------------------------------------------*/
function hookNotesList(){
  const cont = qs("#notes-list");
  if(!cont) return;

  (async ()=>{
    try {
      const res = await get("/notes",readToken());
      if(!Array.isArray(res) || !res.length){ 
        cont.innerHTML = "<p>No notes found</p>"; 
        return;
      }

      cont.innerHTML = res.map(n=>`
        <div class="note-card">
          <strong>${escapeHtml(n.title || "Note")}</strong>
          <p>${escapeHtml((n.content || n.summary || "").slice(0,200))}...</p>
        </div>
      `).join("");

    } catch(e){
      cont.innerHTML = `<p>${escapeHtml(e.message)}</p>`;
    }
  })();
}

/* -----------------------------------------------------------------------------
   GLOBAL UI INIT
-----------------------------------------------------------------------------*/
function initGlobalUI(){
  const t = readToken();
  const name = localStorage.getItem(USERNAME_KEY) || "";

  if(qs("#user-name-short")) qs("#user-name-short").innerText = name;

  if(qs("#nav-login")) qs("#nav-login").style.display = t ? "none" : "inline-block";
  if(qs("#nav-register")) qs("#nav-register").style.display = t ? "none" : "inline-block";
  if(qs("#nav-profile")) qs("#nav-profile").style.display = t ? "inline-block" : "none";
  if(qs("#nav-logout")) qs("#nav-logout").style.display = t ? "inline-block" : "none";

  qs("#nav-logout")?.addEventListener("click",()=>{
    clearToken();
    go("../index.html");
  });
}

function enableMobileMenu(){
  qs(".menu-btn")?.addEventListener("click",()=>{
    qs(".sidebar")?.classList.toggle("open");
  });
}

/* -----------------------------------------------------------------------------
   DOM READY INITIALIZATION
-----------------------------------------------------------------------------*/
document.addEventListener("DOMContentLoaded",()=>{

  if(localStorage.getItem("theme")==="dark") document.body.classList.add("dark");

  initGlobalUI();
  enableMobileMenu();

  hookRegister();
  hookLogin();
  hookProfile();
  hookDelete();

  hookSummarize();
  hookExplain();
  hookMakeNotes();
  hookMCQ();
  hookQnA();
  hookNotesList();

  dbg("AI Study Frontend Loaded", { API_BASE });
});
