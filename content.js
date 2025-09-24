// content.js
// Extract selection or best‑effort main text from the page without external libs.


function getSelectionText() {
    const sel = window.getSelection();
    return sel && sel.toString().trim() ? sel.toString().trim() : "";
    }
    
    
    function extractMainText() {
    // Prefer <article> blocks
    const article = document.querySelector("article");
    if (article) return article.innerText.trim();
    
    
    // Fallback: combine large <p> blocks
    const ps = Array.from(document.querySelectorAll("main p, .content p, .post p, p"))
    .map(p => p.innerText.trim())
    .filter(t => t.split(/\s+/).length > 5);
    const text = ps.join("\n\n");
    if (text.length > 400) return text;
    
    
    // Last resort: whole body text
    return document.body?.innerText?.trim() || "";
    }
    
    
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_SELECTION_TEXT") {
    sendResponse({ source: "selection", text: getSelectionText() });
    return true;
    }
    if (msg.type === "GET_PAGE_TEXT") {
    sendResponse({ source: "page", text: extractMainText(), title: document.title, url: location.href });
    return true;
    }
    });