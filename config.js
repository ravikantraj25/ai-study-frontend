// config.js

// 1. Your Backend URL (Use your Render URL here)
window.API_BASE = "https://ai-study-backened.onrender.com"; 

// 2. Token Helper
// This helps your tool pages (Explain, Notes) find the user's token
// We will set this token in index.html later.
window.getAuthToken = () => {
    return localStorage.getItem("ai_study_token");
};