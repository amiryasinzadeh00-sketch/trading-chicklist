(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  // ----- Multi-market storage helpers -----
  const KEY_MARKETS = "cc_markets";
  const KEY_ACTIVE  = "cc_active_market";

  function loadMarkets() {
    try { return JSON.parse(localStorage.getItem(KEY_MARKETS) || "[]"); } catch { return []; }
  }
  function saveMarkets(list) { localStorage.setItem(KEY_MARKETS, JSON.stringify(list)); }
  function getActiveMarketId() { return localStorage.getItem(KEY_ACTIVE) || ""; }
  function setActiveMarketId(id) { localStorage.setItem(KEY_ACTIVE, id); }

  function loadState(marketId) {
    try { return JSON.parse(localStorage.getItem("cc_state_" + marketId) || "{}"); } catch { return {}; }
  }
  function saveState(marketId, obj) {
    localStorage.setItem("cc_state_" + marketId, JSON.stringify(obj));
  }

  // Defaults and weights (sync to W/D/4H @ +10 each)
  const DEFAULTS = {
    rrMin: 2.5,
    textSize: "normal",
    weights: {
      sync: { W: 10, D: 10, H4: 10 },
      swing: {
        "Weekly & Daily": [
          ["At/Rejected W AOI", 10],
          ["At/Rejected D AOI", 10],
          ["Touching/Rejecting W 50 EMA", 5],
          ["Touching/Rejecting D 50 EMA", 5],
          ["Round Psychological Level", 5],
          ["Rejection from W previous structure point", 10],
          ["Rejection from D previous structure point", 10],
          ["W Candlestick Rejection", 10],
          ["D Candlestick Rejection", 10],
          ["W Patterns - H&S / Double Top or Bottom", 10],
          ["D Patterns - H&S / Double Top or Bottom", 10]
        ],
        "4H": [
          ["Touching/Rejecting 50 EMA", 5],
          ["Candlestick Rejection", 10],
          ["Rejection from previous structure point", 5],
          ["Patterns", 10]
        ],
        "Entry": [
          ["Shift of Structure (required)", 10, "reqShift"],
          ["Engulfing (required)", 10, "reqEngulf"],
          ["Pattern", 5]
        ]
      },
      day: {
        "Daily & 4H": [
          ["At/Rejected D AOI", 10],
          ["At/Rejected 4H AOI", 5],
          ["Touching/Rejecting D 50 EMA", 5],
          ["Touching/Rejecting 4H 50 EMA", 5],
          ["Round Psychological Level", 5],
          ["Rejection from D previous structure point", 10],
          ["Rejection from 4H previous structure point", 5],
          ["D Candlestick Rejection", 10],
          ["4H Candlestick Rejection", 10],
          ["D Patterns - H&S / Double Top or Bottom", 10],
          ["4H Patterns - H&S / Double Top or Bottom", 10]
        ],
        "Entry": [
          ["Shift of Structure (required)", 10, "reqShift"],
          ["Engulfing (required)", 10, "reqEngulf"],
          ["Pattern", 5]
        ]
      },
      scalp: {
        "Sync (4H/2H/1H)": [
          ["4H & 2H in sync", 5],
          ["2H & 1H in sync", 5],
          ["All 3 aligned", 5]
        ],
        "4H & 2H": [
          ["At/Rejected 4H AOI", 5],
          ["At/Rejected 2H AOI", 5],
          ["Touching/Rejecting 4H 50 EMA", 5],
          ["Touching/Rejecting 2H 50 EMA", 5],
          ["Round Psychological Level", 5],
          ["Rejection from 4H previous structure point", 5],
          ["Rejection from 2H previous structure point", 5],
          ["4H Candlestick Rejection", 5],
          ["2H Candlestick Rejection", 5],
          ["4H Patterns - H&S / Double Top/Bottom", 5],
          ["2H Patterns - H&S / Double Top/Bottom", 5]
        ],
        "1H": [
          ["Touching/Rejecting 50 EMA", 5],
          ["Candlestick Rejection", 5],
          ["Rejection from previous structure point", 5],
          ["Patterns", 5]
        ],
        "Entry (1H / 30M / 15M)": [
          ["Shift of Structure (required)", 10, "reqShift"],
          ["Engulfing (required)", 10, "reqEngulf"]
        ]
      }
    }
  };

  // ----- Initialize Markets -----
  function ensureDefaultMarket() {
    let markets = loadMarkets();
    if (!markets.length) {
      const id = "EURUSD";
      markets = [{ id, name: "EUR/USD" }];
      saveMarkets(markets);
      setActiveMarketId(id);
      saveState(id, { ...DEFAULTS, pair: "EUR/USD" });
    }
  }

  function populateMarketSelect() {
    const sel = $("#marketSelect");
    sel.innerHTML = "";
    const markets = loadMarkets();
    const active = getActiveMarketId();
    markets.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === active) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function currentState() {
    const active = getActiveMarketId();
    return loadState(active);
  }

  function persist(partial) {
    const active = getActiveMarketId();
    const S = Object.assign({}, currentState(), partial || {});
    saveState(active, S);
  }

  function addMarket() {
    const name = prompt("New market (e.g., GBP/USD or XAU/USD):", "GBP/USD");
    if (!name) return;
    const id = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || `MKT${Date.now()}`;
    const markets = loadMarkets();
    if (markets.some(m => m.id === id)) { alert("A market with a similar id exists. Try another name."); return; }
    markets.push({ id, name });
    saveMarkets(markets);
    saveState(id, { ...DEFAULTS, pair: name });
    setActiveMarketId(id);
    populateMarketSelect();
    loadIntoUI();
  }

  function renameMarket() {
    const markets = loadMarkets();
    const active = getActiveMarketId();
    const idx = markets.findIndex(m => m.id === active);
    if (idx < 0) return;
    const newName = prompt("Rename market:", markets[idx].name);
    if (!newName) return;
    markets[idx].name = newName;
    saveMarkets(markets);
    const st = currentState();
    st.pair = newName;
    persist(st);
    populateMarketSelect();
    loadIntoUI();
  }

  function deleteMarket() {
    const markets = loadMarkets();
    const active = getActiveMarketId();
    if (!confirm("Delete this market and its saved state?")) return;
    const filtered = markets.filter(m => m.id !== active);
    saveMarkets(filtered);
    localStorage.removeItem("cc_state_" + active);
    if (filtered.length) {
      setActiveMarketId(filtered[0].id);
    } else {
      ensureDefaultMarket();
    }
    populateMarketSelect();
    loadIntoUI();
  }

  // ----- UI setup -----
  function applyTextSize(size) {
    const map = { small: "14px", normal: "16px", large: "18px" };
    document.documentElement.style.setProperty("--fs", map[size] || "16px");
  }

  function riskSuggestion(monthIndex, acctType) {
    const best = [0,1,2,9,10,11]; // Jan–Mar, Oct–Dec
    const slow = [5,6];           // Jun, Jul
    const isBest = best.includes(monthIndex);
    const isSlow = slow.includes(monthIndex);
    if (acctType === "Live") {
      if (isBest) return "2–4%";
      if (isSlow) return "2%";
      return "2–3%";
    }
    if (acctType === "Funded") {
      if (isBest) return "2–3%";
      if (isSlow) return "1%";
      return "1–2%";
    }
    if (isBest) return "0.5–1.5%";
    if (isSlow) return "0.5–1%";
    return "0.5–1%";
  }

  function keyFor(t, g, n) { return `w:${t}|g:${g}|i:${n}`; }

  function loadIntoUI() {
    const S = Object.assign({}, DEFAULTS, currentState());
    // Theme
    if ((S.theme || "dark") === "light") document.body.classList.add("light"); else document.body.classList.remove("light");
    // Text size
    $("#textSize").value = S.textSize || "normal";
    applyTextSize(S.textSize || "normal");

    // Basic
    $("#pair").value = S.pair || "";
    $("#bias").value = S.bias || "";
    $("#acctType").value = S.acctType || "Live";
    $("#tradeType").value = S.tradeType || "swing";
    $("#riskPct").value = S.riskPct || "";
    $("#rrMin").value = S.rrMin || DEFAULTS.rrMin;
    $("#rrPlanned").value = S.rrPlanned || "";
    $("#slBuffer").value = S.slBuffer || 6;
    $("#brokerUrl").value = S.brokerUrl || "";
    $("#tvUrl").value = S.tvUrl || "";
    $("#syncW").checked = !!S.syncW;
    $("#syncD").checked = !!S.syncD;
    $("#syncH4").checked = !!S.syncH4;

    // Month
    const monthEl = $("#month");
    if (!monthEl.options.length) {
      MONTHS.forEach((m,i)=>{
        const opt = document.createElement("option");
        opt.value = i; opt.textContent = m;
        monthEl.appendChild(opt);
      });
    }
    monthEl.value = (S.month != null) ? S.month : new Date().getMonth();

    renderSections(S);
    renderWeightsEditor(S);
    calc();
  }

  function renderSections(S) {
    const t = $("#tradeType").value;
    const box = $("#sections");
    box.innerHTML = "";
    const weights = (S.weights || DEFAULTS.weights)[t];
    for (const [group, items] of Object.entries(weights)) {
      const sec = document.createElement("div");
      sec.className = "section";
      const h3 = document.createElement("h3"); h3.textContent = group;
      sec.appendChild(h3);
      items.forEach(([name, pts, idKey]) => {
        const line = document.createElement("div");
        line.className = "line";
        const left = document.createElement("label");
        left.className = "check";
        const input = document.createElement("input");
        input.type = "checkbox";
        const key = keyFor(t, group, name);
        const cur = currentState();
        input.checked = !!cur[key];
        input.addEventListener("change", () => { persist({ [key]: input.checked }); calc(); });
        left.appendChild(input);
        const span = document.createElement("span"); span.textContent = name;
        left.appendChild(span);
        const right = document.createElement("span"); right.className = "badge"; right.textContent = `+${pts}%`;
        line.appendChild(left); line.appendChild(right);
        sec.appendChild(line);

        if (idKey === "reqShift") {
          $("#reqShift").checked = !!cur[key];
          input.addEventListener("change",()=>{$("#reqShift").checked=input.checked;});
          $("#reqShift").addEventListener("change",()=>{input.checked=$("#reqShift").checked; persist({ [key]: $("#reqShift").checked }); calc();});
        }
        if (idKey === "reqEngulf") {
          $("#reqEngulf").checked = !!cur[key];
          input.addEventListener("change",()=>{$("#reqEngulf").checked=input.checked;});
          $("#reqEngulf").addEventListener("change",()=>{input.checked=$("#reqEngulf").checked; persist({ [key]: $("#reqEngulf").checked }); calc();});
        }
      });
      box.appendChild(sec);
    }
  }

  function renderWeightsEditor(S) {
    const box = $("#weightsEditor");
    box.innerHTML = "";
    const weights = S.weights || DEFAULTS.weights;

    // Sync
    const gSync = document.createElement("div");
    gSync.className = "group";
    gSync.innerHTML = `<div class="small tag">Timeframe Sync Weights</div>`;
    for (const key of ["W","D","H4"]) {
      const row = document.createElement("div");
      row.className = "row";
      const lab = document.createElement("label");
      lab.textContent = key==="W" ? "Weekly" : key==="D" ? "Daily" : "4H";
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = 0; inp.step = 1;
      inp.value = (weights.sync?.[key] ?? DEFAULTS.weights.sync[key]);
      inp.addEventListener("change", ()=>{
        weights.sync[key] = parseFloat(inp.value || 0);
        persist({ weights }); calc();
      });
      row.appendChild(lab); row.appendChild(inp);
      gSync.appendChild(row);
    }
    box.appendChild(gSync);

    // Mode groups
    for (const mode of ["swing","day","scalp"]) {
      const modeBox = document.createElement("div");
      modeBox.className = "group";
      const title = document.createElement("div");
      title.className = "small tag";
      title.textContent = `Weights: ${mode.toUpperCase()}`;
      modeBox.appendChild(title);
      for (const [group, items] of Object.entries(weights[mode])) {
        const gTitle = document.createElement("div");
        gTitle.style.fontWeight = "700";
        gTitle.style.margin = "6px 0";
        gTitle.textContent = group;
        modeBox.appendChild(gTitle);
        items.forEach((item, idx) => {
          const [name, pts] = item;
          const row = document.createElement("div");
          row.className = "row";
          const lab = document.createElement("label"); lab.textContent = name;
          const inp = document.createElement("input"); inp.type = "number"; inp.min = 0; inp.step = 1; inp.value = pts;
          inp.addEventListener("change", ()=>{
            weights[mode][group][idx][1] = parseFloat(inp.value || 0);
            persist({ weights }); calc();
          });
          row.appendChild(lab); row.appendChild(inp);
          modeBox.appendChild(row);
        });
      }
      box.appendChild(modeBox);
    }
  }

  function calc() {
    const S = Object.assign({}, DEFAULTS, currentState());
    const t = $("#tradeType").value;
    const weights = (S.weights || DEFAULTS.weights)[t];
    let total = 0;

    // Sync: W(+), D(+), 4H(+)
    const w = $("#syncW").checked ? (S.weights.sync?.W ?? 10) : 0;
    const d = $("#syncD").checked ? (S.weights.sync?.D ?? 10) : 0;
    const h4 = $("#syncH4").checked ? (S.weights.sync?.H4 ?? 10) : 0;
    total += w + d + h4;

    // Confluences
    for (const [group, items] of Object.entries(weights)) {
      for (const [name, pts] of items) {
        const key = keyFor(t, group, name);
        if (S[key]) total += pts;
      }
    }

    // Grade
    let grade = "—";
    if (total >= 90) grade = "A";
    else if (total >= 80) grade = "B";
    else if (total >= 70) grade = "C";
    else if (total >= 60) grade = "D";
    else if (total >= 50) grade = "F";
    $("#score").textContent = `${total}%`;
    $("#grade").textContent = grade;

    // Blockers
    let reason = "";
    const reqShift = $("#reqShift").checked;
    const reqEng = $("#reqEngulf").checked;
    const rrMin = parseFloat($("#rrMin").value || DEFAULTS.rrMin);
    const rrPlan = parseFloat($("#rrPlanned").value || "0");
    if (!reqShift) reason = "Shift of Structure is required.";
    else if (!reqEng) reason = "Engulfing confirmation is required.";
    else if (!rrPlan || rrPlan < rrMin) reason = `Planned RR must be ≥ ${rrMin}.`;
    $("#blocker").textContent = reason;
    $("#btnEnter").disabled = !!reason;

    // Risk advice
    const advice = riskSuggestion(parseInt($("#month").value,10), $("#acctType").value);
    $("#riskAdvice").textContent = advice;

    // Persist some fields
    persist({
      pair: $("#pair").value,
      bias: $("#bias").value,
      acctType: $("#acctType").value,
      tradeType: $("#tradeType").value,
      riskPct: $("#riskPct").value,
      rrMin: rrMin,
      rrPlanned: $("#rrPlanned").value,
      slBuffer: $("#slBuffer").value,
      brokerUrl: $("#brokerUrl").value,
      tvUrl: $("#tvUrl").value,
      syncW: $("#syncW").checked,
      syncD: $("#syncD").checked,
      syncH4: $("#syncH4").checked,
      month: $("#month").value
    });
  }

  // Ticket generation (text)
  function buildTicket() {
    const nl = "\n";
    const t = $("#tradeType").value;
    const name = t==="swing"?"Swing/Inter-Day":t==="day"?"Day Trade":"Scalp";
    const msg = [
      `Market: ${$("#marketSelect").selectedOptions[0]?.textContent || "-"}`,
      `Pair: ${$("#pair").value || "-"}`,
      `Bias: ${$("#bias").value || "-"}`,
      `Type: ${name}`,
      `Score: ${$("#score").textContent} | Grade: ${$("#grade").textContent}`,
      `RR: ${$("#rrPlanned").value || "-"} (min ${$("#rrMin").value})`,
      `Risk: ${$("#riskPct").value || "-"}% (suggested ${$("#riskAdvice").textContent})`,
      `SL buffer: ${$("#slBuffer").value || "-"} pips`,
      `Sync: W ${$("#syncW").checked ? "✔" : "✘"}, D ${$("#syncD").checked ? "✔" : "✘"}, 4H ${$("#syncH4").checked ? "✔" : "✘"}`
    ].join(nl);
    return msg;
  }

  async function shareTicket() {
    const msg = buildTicket();
    if (navigator.share) {
      try { await navigator.share({ title: "Confluence Ticket", text: msg }); return; } catch(_){}
    }
    try { await navigator.clipboard.writeText(msg); alert("Copied to clipboard ✅"); }
    catch { prompt("Copy your ticket:", msg); }
  }

  // Save Image: draw a clean ticket PNG on canvas and download
  function saveImage() {
    const msg = buildTicket();
    const lines = msg.split("\n");
    const pad = 20, lh = 28, width = 900;
    const height = pad*2 + lh * lines.length + 40;

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    // background
    ctx.fillStyle = "#0f1115"; ctx.fillRect(0,0,width,height);
    // card
    ctx.fillStyle = "#151822"; ctx.fillRect(10,10,width-20,height-20);
    // title
    ctx.fillStyle = "#fff"; ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Confluence Ticket", pad, pad + 6 + 22);
    // body
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto";
    let y = pad + 40;
    lines.forEach(line => { ctx.fillText(line, pad, y); y += lh; });
    // footer
    ctx.fillStyle = "#9aa1ac"; ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Generated by Confluence Calculator", pad, height - pad);
    const link = document.createElement("a");
    link.download = "confluence-ticket.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Export JSON
  function exportJSON() {
    const blob = new Blob([JSON.stringify(currentState(), null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "confluence-state.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  // Event bindings
  function bindEvents() {
    $("#btnShare").addEventListener("click", shareTicket);
    $("#btnSaveImage").addEventListener("click", saveImage);
    $("#btnExportJson").addEventListener("click", exportJSON);
    $("#btnTV").addEventListener("click", ()=>{
      const url = $("#tvUrl").value.trim(); if (url) window.open(url, "_blank"); else alert("Add a TradingView URL in Settings.");
    });
    $("#btnBroker").addEventListener("click", ()=>{
      const url = $("#brokerUrl").value.trim(); if (url) window.open(url, "_blank"); else alert("Add your broker URL in Settings.");
    });
    $("#btnEnter").addEventListener("click", ()=>{ shareTicket(); });

    // Inputs
    ["pair","bias","acctType","tradeType","riskPct","rrMin","rrPlanned","slBuffer","brokerUrl","tvUrl","month"].forEach(id=>{
      $( "#" + id ).addEventListener("input", ()=>{ if (id==="tradeType") renderSections(Object.assign({}, DEFAULTS, currentState())); calc(); });
    });
    $("#syncW").addEventListener("change", ()=>{calc()});
    $("#syncD").addEventListener("change", ()=>{calc()});
    $("#syncH4").addEventListener("change", ()=>{calc()});

    // Theme + text size
    $("#btnDark").addEventListener("click", () => {
      document.body.classList.toggle("light");
      persist({ theme: document.body.classList.contains("light") ? "light" : "dark" });
    });
    $("#textSize").addEventListener("change", () => {
      const size = $("#textSize").value;
      applyTextSize(size);
      persist({ textSize: size });
    });

    // Markets
    $("#marketSelect").addEventListener("change", () => {
      setActiveMarketId($("#marketSelect").value);
      loadIntoUI();
    });
    $("#btnAddMarket").addEventListener("click", addMarket);
    $("#btnRenameMarket").addEventListener("click", renameMarket);
    $("#btnDeleteMarket").addEventListener("click", deleteMarket);

    // Reset weights
    $("#btnReset").addEventListener("click", ()=>{
      if (confirm("Reset all weights to defaults for this market?")) {
        const cur = currentState();
        cur.weights = DEFAULTS.weights;
        persist(cur);
        renderWeightsEditor(cur);
        renderSections(cur);
        calc();
      }
    });
  }

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('./service-worker.js').catch(_=>{});
    });
  }

  // Boot
  function boot() {
    // Ensure months rendered
    const monthEl = $("#month");
    if (!monthEl.options.length) {
      MONTHS.forEach((m,i)=>{
        const opt = document.createElement("option");
        opt.value = i; opt.textContent = m;
        monthEl.appendChild(opt);
      });
    }
    ensureDefaultMarket();
    populateMarketSelect();
    bindEvents();
    loadIntoUI();
  }

  boot();
})();