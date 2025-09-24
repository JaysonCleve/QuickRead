// sidepanel.js
// Quickread AI — Uses Chrome's built-in AI: Summarizer & Translator (Gemini Nano on-device)

const statusEl = document.getElementById('status');
const inputEl = document.getElementById('input');
const outputEl = document.getElementById('output');
const btnSummarize = document.getElementById('btnSummarize');
const btnTranslate = document.getElementById('btnTranslate');
const targetLang = document.getElementById('targetLang');
const summaryStyle = document.getElementById('summaryStyle');
const summaryLength = document.getElementById('summaryLength');

let cachedPayload = null; // {source, text, title, url}

// Receive initial payload from background (context menu actions)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OPEN_PANEL_WITH') {
    cachedPayload = msg.payload;
    renderInput(cachedPayload);
    if (msg.action === 'summarize') doSummarize();
    if (msg.action === 'translate') doTranslate();
  }
});

function renderInput(payload) {
  const safe = (s) => (s || '').slice(0, 4000);
  inputEl.innerHTML = `
    <div class="card">
      <h3>Eingabe (${payload?.source || 'unbekannt'})</h3>
      ${payload?.title ? `<p><strong>${escapeHtml(payload.title)}</strong></p>` : ''}
      ${payload?.url ? `<p class="muted">${escapeHtml(payload.url)}</p>` : ''}
      <pre>${escapeHtml(safe(payload?.text || ''))}</pre>
    </div>`;
}

function setStatus(text) {
  statusEl.textContent = text || '';
}

function setOutput(markdown) {
  // Minimal markdown -> HTML (bullets + paragraphs)
  const html = String(markdown || '')
    .replace(/^\s*-\s+/gm, '• ')
    .replace(/\n\n/g, '<br/><br/>');
  outputEl.innerHTML = `<div class="card"><h3>Ergebnis</h3><div>${html}</div></div>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function ensurePayload() {
  if (cachedPayload && cachedPayload.text) return cachedPayload;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Kein aktiver Tab');
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
    injectImmediately: true
  });
  const payload = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' });
  cachedPayload = payload;
  renderInput(cachedPayload);
  return payload;
}

function updateProgress(ratio) {
  const el = document.getElementById('progress'); // <progress id="progress" max="1">
  if (!el) return;
  if (ratio == null) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.value = Math.max(0, Math.min(1, ratio));
}

// --- Summarize ---
async function doSummarize() {
  try {
    setStatus('Prüfe Summarizer-Verfügbarkeit…');
    const avail = await Summarizer.availability(); // 'no' | 'readily' | 'after-download' (oder ähnlich)

    if (avail === 'no') {
      setStatus('Dieses Gerät/Profil unterstützt den Summarizer nicht.');
      return;
    }

    const payload = await ensurePayload();
    setStatus(avail === 'readily' ? 'Fasse zusammen…' : 'Lade Modell…');

    // Wichtig: create() auch aufrufen, wenn noch heruntergeladen werden muss,
    // damit wir downloadprogress-Events bekommen.
    const abort = new AbortController();
    const summarizer = await Summarizer.create({
      type: summaryStyle.value,        // 'headline' | 'key-points' | 'teaser'
      format: 'markdown',
      length: summaryLength.value,     // 'short' | 'medium' | 'long'
      signal: abort.signal,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          // e.loaded / e.total sind Bytes; total kann unbekannt sein
          if (e.total && e.total > 0) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setStatus(`Lade Modell: ${pct}%`);
            updateProgress(e.loaded / e.total);
          } else {
            setStatus('Lade Modell…');
          }
        });
      }
    });

    setStatus('Modell bereit. Fasse zusammen…');
    updateProgress(null);
    const result = await summarizer.summarize(payload.text);
    setOutput(result);
    setStatus('Fertig.');
  } catch (err) {
    console.error(err);
    updateProgress(null);
    setStatus('Fehler beim Zusammenfassen. Details in der Konsole.');
  }
}

// --- Translate ---
async function doTranslate() {
  try {
    setStatus('Prüfe Translator-Verfügbarkeit…');
    const avail = await Translator.availability({
      sourceLanguage: 'auto',
      targetLanguage: targetLang.value
    }); // 'no' | 'readily' | 'after-download' (o.ä.)

    if (avail === 'no') {
      setStatus('Translator für dieses Gerät/Sprachpaar nicht verfügbar.');
      return;
    }

    const payload = await ensurePayload();
    const text = (payload.source === 'selection' && payload.text)
      ? payload.text
      : getSelectionFallback(payload.text);

    if (!text) {
      setStatus('Keine Auswahl gefunden. Bitte Text markieren und erneut versuchen.');
      return;
    }

    setStatus(avail === 'readily' ? 'Übersetze…' : 'Lade Übersetzungsmodell…');

    const translator = await Translator.create({
      sourceLanguage: 'auto',
      targetLanguage: targetLang.value,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          if (e.total && e.total > 0) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setStatus(`Lade Übersetzungsmodell: ${pct}%`);
            updateProgress(e.loaded / e.total);
          } else {
            setStatus('Lade Übersetzungsmodell…');
          }
        });
      }
    });

    setStatus('Modell bereit. Übersetze…');
    updateProgress(null);
    const out = await translator.translate(text);
    setOutput(out);
    setStatus('Fertig.');
  } catch (err) {
    console.error(err);
    updateProgress(null);
    setStatus('Fehler beim Übersetzen. Details in der Konsole.');
  }
}

function getSelectionFallback(pageText) {
  if (!pageText) return '';
  return pageText.split(/\n\n/).slice(0, 3).join('\n\n');
}

// Buttons
btnSummarize.addEventListener('click', doSummarize);
btnTranslate.addEventListener('click', doTranslate);

// Optional: Wenn Panel ohne Nachricht geöffnet wurde, gleich den Seitentext anzeigen
(async () => {
  try {
    await ensurePayload();
  } catch (_) {
    /* ignore */
  }
})();
