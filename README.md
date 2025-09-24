# Quickread AI (Chrome Extension)


On‑device summary & translation using **Chrome Built‑in AI**.


## Features
- **Summarize** the current page or any selection into key points/headlines/teaser.
- **Translate** selected text to a chosen language with on‑device models.
- **Offline‑friendly**, privacy‑preserving (no text leaves the device).
- Context menu actions + Side Panel UI.


## Built‑in AI APIs used
- [Summarizer API] — generate summaries locally.
- [Translator API] — translate locally.


## Install (Developer Mode)
1. Clone this repo.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the `quickread-ai/` folder.
4. Open any article page, then open the **Side Panel** (puzzle icon → Quickread AI) or use right‑click.


> First run will download the on‑device models; ensure enough disk space (Chrome may require ~1–2 GB free for models).


## Building a 3‑min demo video
- Show: page open → right‑click → *Seite zusammenfassen*; switch styles/length.
- Show: highlight paragraph → *Auswahl übersetzen…*; change target language.
- Mention: on‑device, offline capable; no servers.


## Open‑source license
MIT


## Notes for judges
- No server or external API keys required; everything runs in Chrome.
- If models aren’t available on the test machine, the UI will show a status and you can retry after the download finishes.
