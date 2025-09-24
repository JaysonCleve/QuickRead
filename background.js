// background.js
// Creates context menu entries and routes requests to the side panel.

// Beim Installieren Side-Panel-Optionen setzen
chrome.runtime.onInstalled.addListener(async () => {
    await chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true });
  });
  
  // Klick aufs Toolbar-Icon -> Side Panel des aktiven Tabs öffnen
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.id) return;
    await chrome.sidePanel.open({ tabId: tab.id });
  });
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
    id: "qr_summarize_page",
    title: "Quickread AI: Seite zusammenfassen",
    contexts: ["page"]
    });
    
    
    chrome.contextMenus.create({
    id: "qr_summarize_selection",
    title: "Quickread AI: Auswahl zusammenfassen",
    contexts: ["selection"]
    });
    
    
    chrome.contextMenus.create({
    id: "qr_translate_selection",
    title: "Quickread AI: Auswahl übersetzen…",
    contexts: ["selection"]
    });
    });
    
    
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;
    
    
    // Ensure content script is present
    await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
    injectImmediately: true
    });
    
    
    // Open side panel and send a command
    await chrome.sidePanel.open({ tabId: tab.id });
    
    
    if (info.menuItemId === "qr_summarize_page") {
    chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_TEXT" }, (payload) => {
    chrome.runtime.sendMessage({ type: "OPEN_PANEL_WITH", action: "summarize", payload });
    });
    }
    
    
    if (info.menuItemId === "qr_summarize_selection") {
    chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION_TEXT" }, (payload) => {
    chrome.runtime.sendMessage({ type: "OPEN_PANEL_WITH", action: "summarize", payload });
    });
    }
    
    
    if (info.menuItemId === "qr_translate_selection") {
    chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION_TEXT" }, (payload) => {
    chrome.runtime.sendMessage({ type: "OPEN_PANEL_WITH", action: "translate", payload });
    });
    }
});