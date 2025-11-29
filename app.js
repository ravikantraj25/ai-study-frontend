/* ============================================================
   PREMIUM AI STUDY APP – CLEAN PRODUCTION VERSION (v5.1)
   ============================================================ */

const BASE_URL = "https://ai-study-backened.onrender.com";

/* ------------------------------------------------------------
   SIDEBAR (Mobile + Desktop)
------------------------------------------------------------- */
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

/* ------------------------------------------------------------
   THEME TOGGLE (Dark / Light)
------------------------------------------------------------- */
function toggleTheme() {
    document.body.classList.toggle("dark");
}

/* ------------------------------------------------------------
   GLOBAL LOADER
------------------------------------------------------------- */
function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "block";
}

function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
}

/* ------------------------------------------------------------
   BUTTON RIPPLES (Premium Motion)
------------------------------------------------------------- */
document.addEventListener("click", function (e) {
    if (!e.target.classList.contains("btn")) return;

    const rect = e.target.getBoundingClientRect();
    e.target.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.target.style.setProperty("--y", `${e.clientY - rect.top}px`);

    e.target.classList.add("ripple");
    setTimeout(() => e.target.classList.remove("ripple"), 400);
});

/* ------------------------------------------------------------
   COPY TEXT
------------------------------------------------------------- */
function copyText(id) {
    const el = document.getElementById(id);
    if (!el) {
        alert("Nothing to copy.");
        return;
    }

    const text = el.innerText || el.textContent || "";
    if (!text.trim()) {
        alert("Nothing to copy.");
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => alert("Copied!"))
        .catch(() => alert("Copy failed."));
}

/* ------------------------------------------------------------
   DOWNLOAD AS PDF (Browser Print)
------------------------------------------------------------- */
function downloadAsPDF(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const content = el.innerText || el.textContent || "";
    const win = window.open("", "", "width=800,height=600");
    win.document.write(`<pre>${content}</pre>`);
    win.document.close();
    win.print();
}

/* ============================================================
   🔵 FEATURE 1 — SUMMARIZE PDF
============================================================ */
function summarizePDF() {
    const fileInput = document.getElementById("pdfFile");
    const file = fileInput?.files?.[0];

    if (!file) {
        alert("Please select a PDF file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    showLoader();

    fetch(`${BASE_URL}/summarize`, {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.summary) {
                alert("No summary received from server.");
                return;
            }
            renderSummary(data.summary);
        })
        .catch(err => {
            console.error(err);
            alert("Something went wrong while summarizing.");
        })
        .finally(() => hideLoader());
}

/* Notion-style summary renderer */
function renderSummary(text) {
    const result = document.getElementById("result");
    if (!result) return;

    if (!text) {
        result.innerHTML = "<p>No summary generated.</p>";
        return;
    }

    let html = text
        .replace(/\x1b\[[0-9;]*m/g, "") // remove ANSI
        .replace(/### (.*)/g, `<h3 class="nt-h3">📌 $1</h3>`)
        .replace(/## (.*)/g, `<h2 class="nt-h2">📘 $1</h2>`)
        .replace(/# (.*)/g, `<h1 class="nt-h1">🟦 $1</h1>`)
        .replace(/\*\*(.*?)\*\*/g, `<span class="nt-bold">$1</span>`)
        .replace(/^- (.*)/gm, `<li class="nt-li">• $1</li>`)
        .replace(/\n\n/g, "<br>")
        .replace(/\n/g, "<br>");

    result.innerHTML = `<div class="notion-box">${html}</div>`;
}

/* ============================================================
   🔵 FEATURE 2 — MAKE NOTES
============================================================ */
function makeNotes() {
    const textArea = document.getElementById("notesInput");
    const text = textArea?.value.trim() || "";

    if (!text) {
        alert("Please enter some text.");
        return;
    }

    showLoader();

    fetch(`${BASE_URL}/make-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.notes || !Array.isArray(data.notes)) {
                alert("Invalid notes received from server.");
                return;
            }
            renderNotes(data.notes);
        })
        .catch(err => {
            console.error(err);
            alert("Error generating notes.");
        })
        .finally(() => hideLoader());
}


/* Build notes into premium cards */
/* Build notes into premium cards */
function renderNotes(notesArray) {
    const out = document.getElementById("notesOutput");
    if (!out) return;

    let html = `
        <div class="notes-header-card">
            <h2>📝 Premium Bullet Notes</h2>
            <p>Clean, structured notes generated from your text.</p>
        </div>

        <div class="note-section-card">
            <h3>Notes</h3>
            <ul>
                ${notesArray.map(n => `<li>${n}</li>`).join("")}
            </ul>
        </div>
    `;

    out.innerHTML = `<div class="notes-container">${html}</div>`;
}



/* ============================================================
   🔵 FEATURE 3 — EXPLAIN TOPIC (JSON FROM BACKEND)
============================================================ */
function explainTopic() {
    const input = document.getElementById("explainInput");
    const topic = input?.value.trim() || "";

    if (!topic) {
        alert("Please enter a topic.");
        return;
    }

    showLoader();

    fetch(`${BASE_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
    })
        .then(res => res.json())
        .then(data => {
            const out = document.getElementById("explanationOutput"); // FIXED ID
            if (!out) return;

            if (data.error) {
                out.innerHTML = `<p style="color:red;">${data.error}</p>`;
                return;
            }

            const sections = data.explanation;

            // If backend accidentally returns raw text, display as-is
            if (!Array.isArray(sections)) {
                out.innerHTML = `<p>${sections || "No explanation available."}</p>`;
                return;
            }

            renderExplanationFromJson(sections);
        })
        .catch(err => {
            console.error(err);
            alert("Error explaining topic.");
        })
        .finally(() => hideLoader());
}


/* ----------------------------------------------------------
   PREMIUM — Notion/Superhuman Style Explanation Renderer
------------------------------------------------------------ */
function renderExplanationFromJson(sections) {
    const out = document.getElementById("explanationOutput");
    if (!out) return;

    let html = `
        <div class="explain-header-card">
            <h2>🔍 Premium Explanation</h2>
            <p>Beautifully structured explanation based on your topic.</p>
        </div>
    `;

    sections.forEach(sec => {
        const title = sec.title || "Section";
        const paragraph = sec.paragraph || "";
        const bullets = Array.isArray(sec.bullets) ? sec.bullets : [];
        const examples = Array.isArray(sec.examples) ? sec.examples : [];
        const terms = Array.isArray(sec.important_terms) ? sec.important_terms : [];
        const faqs = Array.isArray(sec.faqs) ? sec.faqs : [];

        html += `
            <div class="explain-section">
                <h3>📘 ${title}</h3>

                ${paragraph ? `<p>${paragraph}</p>` : ""}

                ${bullets.length ? `
                    <h4>🔹 Key Points</h4>
                    <ul>${bullets.map(b => `<li>${b}</li>`).join("")}</ul>
                ` : ""}

                ${examples.length ? `
                    <h4>🌿 Examples</h4>
                    <ul>${examples.map(e => `<li>${e}</li>`).join("")}</ul>
                ` : ""}

                ${terms.length ? `
                    <h4>🧠 Important Terms</h4>
                    <ul>${terms.map(t => `<li>${t}</li>`).join("")}</ul>
                ` : ""}

                ${faqs.length ? `
                    <h4>❓ FAQs</h4>
                    <ul>
                        ${faqs.map(f => `<li><strong>${f.q}</strong> – ${f.a}</li>`).join("")}
                    </ul>
                ` : ""}
            </div>
        `;
    });

    out.innerHTML = html;
}


/* ============================================================
   🔵 FEATURE 4 — MCQs
============================================================ */
function makeMCQ() {
    const input = document.getElementById("mcqInput");
    const text = input?.value.trim() || "";

    if (!text) {
        alert("Please enter text to generate MCQs.");
        return;
    }

    showLoader();

    fetch(`${BASE_URL}/make-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.mcqs) {
                alert("No MCQs received.");
                return;
            }
            renderMCQs(data.mcqs);
        })
        .catch(err => {
            console.error(err);
            alert("Error generating MCQs.");
        })
        .finally(() => hideLoader());
}

/* Premium MCQ Renderer */
function renderMCQs(text) {
    const out = document.getElementById("mcqOutput");
    if (!out) return;

    const lines = (typeof text === "string" ? text : JSON.stringify(text))
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    let html = `<div class="mcq-container"><div class="mcq-header">MCQs</div>`;

    let currentQuestionOpen = false;

    lines.forEach(line => {
        // Question line: "1. What is..."
        if (/^\d+\./.test(line)) {
            if (currentQuestionOpen) {
                html += "</ul>"; // close previous options list
            }
            html += `<div class="mcq-question">${line}</div>`;
            html += `<ul class="mcq-options">`;
            currentQuestionOpen = true;
        }
        // Options: "A) something"
        else if (/^[A-D]\)/i.test(line)) {
            const opt = line.replace(/^[A-D]\)\s*/, "");
            html += `<li>${opt}</li>`;
        }
        // Correct answer line
        else if (/^Correct answer:/i.test(line)) {
            if (currentQuestionOpen) {
                html += "</ul>";
                currentQuestionOpen = false;
            }
            html += `<div class="mcq-correct">${line}</div>`;
        }
    });

    if (currentQuestionOpen) html += "</ul>";

    html += "</div>";
    out.innerHTML = html;
}

/* ============================================================
   🔵 FEATURE 5 — QnA CHAT
============================================================ */
function addMessage(msg, type) {
    const box = document.getElementById("chatBox");
    if (!box) return;

    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.innerText = msg;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function askChat() {
    const text = document.getElementById("textInput")?.value.trim() || "";
    const question = document.getElementById("questionInput")?.value.trim() || "";

    if (!text) {
        alert("Please paste some text (from PDF) first.");
        return;
    }
    if (!question) {
        alert("Please enter a question.");
        return;
    }

    addMessage(question, "user");
    showLoader();

    fetch(`${BASE_URL}/qna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, question })
    })
        .then(res => res.json())
        .then(data => {
            addMessage(data.answer || "No answer received.", "bot");
            const questionInput = document.getElementById("questionInput");
            if (questionInput) questionInput.value = "";
        })
        .catch(err => {
            console.error(err);
            alert("Error getting answer.");
        })
        .finally(() => hideLoader());
}

/* ============================================================
   NOTES HISTORY (Notes Page)
============================================================ */
function loadNotes() {
    const container = document.getElementById("notesContainer");
    if (!container) return;

    showLoader();

    fetch(`${BASE_URL}/notes`)
        .then(res => res.json())
        .then(notes => {
            if (!Array.isArray(notes) || notes.length === 0) {
                container.innerHTML = "<p>No notes saved yet.</p>";
                return;
            }

            container.innerHTML = notes
                .map(n => `
                    <div class="note-card">
                        <h3>${n.pdf_name || "Untitled Note"}</h3>
                        <p>${(n.summary || "").slice(0, 160)}...</p>
                    </div>
                `)
                .join("");
        })
        .catch(err => {
            console.error(err);
            alert("Error loading notes.");
        })
        .finally(() => hideLoader());
}

if (window.location.pathname.includes("notes.html")) {
    window.addEventListener("DOMContentLoaded", loadNotes);
}
