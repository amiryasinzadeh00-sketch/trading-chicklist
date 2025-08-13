Confluence Calculator — Mobile PWA (v2 FULL)
====================================================

What’s inside
-------------
- index.html            — main page (mobile-first)
- styles.css            — dark/light themes, scalable text
- app.js                — logic (W/D/4H sync, multi-markets, Save Image/JSON)
- service-worker.js     — offline caching
- manifest.webmanifest  — enables Add to Home Screen
- icons/                — app icons

What changed (your requests)
----------------------------
1) Timeframe Sync is now separate: Weekly +10%, Daily +10%, 4H +10%.
2) Text size control (Small / Normal / Large) that persists.
3) Multi-market workspaces: add/rename/delete markets and switch between them — each market has its own saved state.
4) Save results:
   - Save Image: generates a PNG ticket you can store in Files/Photos.
   - Export JSON: saves your current state as a .json file.

How to deploy on GitHub Pages
-----------------------------
1) Unzip and upload ALL files (root-level, not the zip itself) to your repo.
2) In Settings → Pages → Source: Deploy from a branch; Branch: main; Folder: / (root).
3) Open your Pages URL on your phone; Add to Home Screen.
4) If you previously installed the app, refresh or reinstall to clear old cache.

Tips
----
- If you ever see a white page, open Developer Tools → Console to see missing file errors.
- To force a fresh cache: open the site, hard refresh (Ctrl/Cmd+Shift+R), or clear site data.
