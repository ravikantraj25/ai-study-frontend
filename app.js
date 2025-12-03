/* app.js
   Auth handlers + theme + small UI helpers
   - stores token in localStorage under key: ai_study_token
   - adapt API_BASE if needed
*/

const API_BASE = 'https://ai-study-backened.onrender.com'; // <- change if your backend differs
const TOKEN_KEY = 'ai_study_token';

/* ---------- Utilities ---------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function setMsg(el, text, isError = false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#ff4d6d' : '';
}
function go(path) { window.location.href = path; }

/* ---------- Theme handling (works with your styles.css "body.dark") ---------- */
function applyTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.body.classList.toggle('dark', theme === 'dark');
}
function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  document.body.classList.toggle('dark', !isDark);
  localStorage.setItem('theme', (!isDark) ? 'dark' : 'light');
}

/* wire theme toggle buttons */
document.addEventListener('click', (ev) => {
  if (ev.target.matches('.theme-toggle')) toggleTheme();
});

/* ---------- Auth helpers ---------- */
function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function readToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

/* wrapper for JSON POST */
async function postJSON(path, body = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
  return json;
}

/* wrapper for GET */
async function getJSON(path, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method: 'GET', headers });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
  return json;
}

/* wrapper for PUT */
async function putJSON(path, body = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method: 'PUT', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
  return json;
}

/* wrapper for DELETE */
async function del(path, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method: 'DELETE', headers });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
  return json;
}

/* ---------- Page hooks ---------- */

/* Register page */
function hookRegister() {
  const btn = qs('#reg-submit');
  if (!btn) return;
  const nameEl = qs('#reg-name'), emailEl = qs('#reg-email'), passEl = qs('#reg-password'), out = qs('#reg-result');

  qs('#reg-to-login')?.addEventListener('click', ()=> go('login.html'));

  btn.addEventListener('click', async () => {
    setMsg(out, '');
    const name = nameEl.value.trim(), email = emailEl.value.trim(), password = passEl.value;
    if (!name || !email || !password) { setMsg(out, 'Please fill all fields', true); return; }
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      const res = await postJSON('/auth/register', { name, email, password });
      if (res.token) { saveToken(res.token); setMsg(out, 'Registered & logged in ✅'); setTimeout(()=> go('profile.html'), 900); }
      else { setMsg(out, res.message || 'Registered. Please login.'); setTimeout(()=> go('login.html'), 900); }
    } catch (err) { setMsg(out, err.message || 'Registration failed', true); }
    finally { btn.disabled = false; btn.textContent = 'Create Account'; }
  });
}

/* Login page */
function hookLogin() {
  const btn = qs('#login-submit');
  if (!btn) return;
  const emailEl = qs('#login-email'), passEl = qs('#login-password'), out = qs('#login-result');

  qs('#login-to-register')?.addEventListener('click', ()=> go('register.html'));

  btn.addEventListener('click', async () => {
    setMsg(out, '');
    const email = emailEl.value.trim(), password = passEl.value;
    if (!email || !password) { setMsg(out, 'Please enter email and password', true); return; }
    btn.disabled = true; btn.textContent = 'Logging in...';
    try {
      const res = await postJSON('/auth/login', { email, password });
      if (res.token) {
        saveToken(res.token);
        setMsg(out, 'Login successful ✅');
        setTimeout(()=> go('profile.html'), 700);
      } else {
        setMsg(out, res.message || 'Login failed', true);
      }
    } catch (err) {
      setMsg(out, err.message || 'Login failed', true);
    } finally {
      btn.disabled = false; btn.textContent = 'Login';
    }
  });
}

/* Profile page (view + update + logout) */
function hookProfile() {
  const info = qs('#profile-info');
  const upName = qs('#up-name'), upEmail = qs('#up-email'), updateBtn = qs('#update-submit'), out = qs('#update-result'), logout = qs('#logout-btn');
  if (!info) return;

  (async ()=>{
    const token = readToken();
    if (!token) { info.innerHTML = 'Not logged in. <a href="login.html">Login</a>'; return; }
    try {
      const u = await getJSON('/auth/me', token);
      info.innerHTML = `<div><strong>${u.name||u.fullname||'User'}</strong> — ${u.email||''}</div>`;
      upName.value = u.name || '';
      upEmail.value = u.email || '';
    } catch (err) {
      info.textContent = 'Error loading profile: ' + err.message;
    }
  })();

  if (updateBtn) {
    updateBtn.addEventListener('click', async ()=>{
      setMsg(out, '');
      const name = upName.value.trim(), email = upEmail.value.trim();
      if (!name && !email) { setMsg(out, 'Change at least one field', true); return; }
      updateBtn.disabled = true; updateBtn.textContent = 'Saving...';
      try {
        const token = readToken();
        const res = await putJSON('/auth/me', { name, email }, token);
        setMsg(out, res.message || 'Profile updated');
        setTimeout(()=> location.reload(), 900);
      } catch (err) {
        setMsg(out, err.message || 'Update failed', true);
      } finally {
        updateBtn.disabled = false; updateBtn.textContent = 'Save changes';
      }
    });
  }

  if (logout) {
    logout.addEventListener('click', () => {
      clearToken();
      go('index.html');
    });
  }
}

/* Delete account page */
function hookDelete() {
  const btn = qs('#delete-submit'); if (!btn) return;
  const confirmEl = qs('#delete-confirm'), out = qs('#delete-result'), cancel = qs('#cancel-delete');

  cancel?.addEventListener('click', ()=> go('profile.html'));

  btn.addEventListener('click', async () => {
    setMsg(out, '');
    if ((confirmEl.value || '').trim() !== 'DELETE') { setMsg(out, 'Type DELETE to confirm', true); return; }
    btn.disabled = true; btn.textContent = 'Deleting...';
    try {
      const token = readToken();
      const res = await del('/auth/me', token);
      setMsg(out, res.message || 'Account deleted');
      clearToken();
      setTimeout(()=> go('index.html'), 900);
    } catch (err) {
      setMsg(out, err.message || 'Delete failed', true);
    } finally {
      btn.disabled = false; btn.textContent = 'Delete Account';
    }
  });
}

/* Sidebar mobile toggle (keeps design same as index) */
function enableMobileMenu() {
  const menuBtn = qs('.menu-btn');
  if (!menuBtn) return;
  menuBtn.addEventListener('click', ()=> {
    const sb = qs('.sidebar');
    if (!sb) return;
    sb.classList.toggle('open');
  });
}

/* Initialize page hooks */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  enableMobileMenu();
  hookRegister();
  hookLogin();
  hookProfile();
  hookDelete();
});
