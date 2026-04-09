const STARTING_BALANCE = 100000;

let balance  = parseFloat(localStorage.getItem("balance")) || STARTING_BALANCE;
let holdings = JSON.parse(localStorage.getItem("holdings") || "{}");

let pieChart = null;

const fmt  = n => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmt2 = n => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// ── Math helpers ──────────────────────────────────────
function linearTrend(history) {
  const n = history.length, xm = (n - 1) / 2;
  const ym = history.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  history.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  const slope = den ? num / den : 0;
  const pct = (slope / history[n - 1]) * 100;
  return pct;
}

function volatility(history) {
  const returns = [];
  for (let i = 1; i < history.length; i++)
    returns.push((history[i] - history[i - 1]) / history[i - 1] * 100);
  const mean = returns.reduce((a, b) => a + b) / returns.length;
  const std  = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
  return std;
}

function sparklineSVG(history) {
  const w = 54, h = 20;
  const min = Math.min(...history), max = Math.max(...history), range = max - min || 1;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = history[history.length - 1] >= history[0];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? "#4ade80" : "#f87171"}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// ── Init ─────────────────────────────────────────────
function init() {
  const select = document.getElementById("stock-select");
  STOCKS.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.symbol;
    opt.textContent = `${s.name} (${s.symbol})`;
    select.appendChild(opt);
  });

  document.getElementById("qty-input").addEventListener("input", () => {
    const sym = document.getElementById("stock-select").value;
    const qty = parseInt(document.getElementById("qty-input").value) || 0;
    updatePreviews(getStock(sym), qty);
  });

  buildStockList();
  onStockChange();
  render();
}

function save() {
  localStorage.setItem("balance",  balance);
  localStorage.setItem("holdings", JSON.stringify(holdings));
}

function resetSim() {
  if (!confirm("Reset everything and start over?")) return;
  localStorage.clear();
  balance = STARTING_BALANCE;
  holdings = {};
  save();
  render();
  showMsg("", "");
}

// ── Stock List ────────────────────────────────────────
function buildStockList() {
  const ul = document.getElementById("stock-list");
  ul.innerHTML = "";
  STOCKS.forEach(s => {
    const li = document.createElement("li");
    li.id = "sl-" + s.symbol;
    li.innerHTML = `
      <div>
        <div class="sl-name">${s.name}</div>
        <div class="sl-sym">${s.symbol}</div>
      </div>
      <div class="sl-right">
        ${sparklineSVG(s.history)}
        <div class="sl-price">${fmt(s.price)}</div>
      </div>`;
    li.onclick = () => {
      document.getElementById("stock-select").value = s.symbol;
      onStockChange();
    };
    ul.appendChild(li);
  });
}

function onStockChange() {
  const sym   = document.getElementById("stock-select").value;
  const stock = getStock(sym);
  const qty   = parseInt(document.getElementById("qty-input").value) || 0;
  updatePreviews(stock, qty);
  highlightActiveStock(sym);
  renderAnalytics(Object.keys(holdings));
}

function updatePreviews(stock, qty) {
  document.getElementById("selected-price").textContent = fmt(stock.price);
  document.getElementById("est-cost").textContent = qty > 0 ? fmt(stock.price * qty) : "—";
}

function highlightActiveStock(sym) {
  document.querySelectorAll("#stock-list li").forEach(li => li.classList.remove("active"));
  const el = document.getElementById("sl-" + sym);
  if (el) el.classList.add("active");
}

// ── Trade ─────────────────────────────────────────────
function getStock(symbol) { return STOCKS.find(s => s.symbol === symbol); }

function buyStock() {
  const symbol = document.getElementById("stock-select").value;
  const qty    = parseInt(document.getElementById("qty-input").value);
  if (!qty || qty <= 0) { showMsg("Enter a valid quantity.", "error"); return; }

  const stock = getStock(symbol);
  const cost  = stock.price * qty;
  if (cost > balance) { showMsg(`Need ${fmt(cost)} — not enough cash.`, "error"); return; }

  balance -= cost;
  if (holdings[symbol]) {
    const old = holdings[symbol], totalQty = old.qty + qty;
    holdings[symbol].buyPrice = ((old.buyPrice * old.qty) + (stock.price * qty)) / totalQty;
    holdings[symbol].qty = totalQty;
  } else {
    holdings[symbol] = { name: stock.name, buyPrice: stock.price, qty };
  }

  save(); render();
  showMsg(`Bought ${qty} share(s) of ${stock.name}.`, "success");
}

function sellStock() {
  const symbol = document.getElementById("stock-select").value;
  const qty    = parseInt(document.getElementById("qty-input").value);
  if (!qty || qty <= 0)           { showMsg("Enter a valid quantity.", "error"); return; }
  if (!holdings[symbol])          { showMsg("You don't own this stock.", "error"); return; }
  if (qty > holdings[symbol].qty) { showMsg("Not enough shares to sell.", "error"); return; }

  const stock = getStock(symbol);
  balance += stock.price * qty;
  holdings[symbol].qty -= qty;
  if (holdings[symbol].qty === 0) delete holdings[symbol];

  save(); render();
  showMsg(`Sold ${qty} share(s) of ${stock.name}.`, "success");
}

// ── Render ────────────────────────────────────────────
function render() {
  const symbols = Object.keys(holdings);

  const portValue = symbols.reduce((s, sym) => s + getStock(sym).price * holdings[sym].qty, 0);
  const totalPL   = symbols.reduce((s, sym) => {
    const h = holdings[sym];
    return s + (getStock(sym).price - h.buyPrice) * h.qty;
  }, 0);

  document.getElementById("balance").textContent    = fmt(balance);
  document.getElementById("port-value").textContent = fmt(portValue);

  const plEl = document.getElementById("total-pl");
  plEl.textContent = (totalPL >= 0 ? "+" : "−") + fmt(Math.abs(totalPL));
  plEl.style.color = totalPL > 0 ? "#4ade80" : totalPL < 0 ? "#f87171" : "#e2e8f0";

  // Table
  const tbody = document.getElementById("portfolio-body");
  if (symbols.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No holdings yet — buy something!</td></tr>`;
  } else {
    tbody.innerHTML = "";
    symbols.forEach(sym => {
      const h = holdings[sym], current = getStock(sym).price;
      const pl = (current - h.buyPrice) * h.qty;
      const cls = pl >= 0 ? "profit" : "loss", sign = pl >= 0 ? "+" : "−";
      tbody.innerHTML += `
        <tr>
          <td><span class="td-name">${h.name}</span><span class="td-sym">${sym}</span></td>
          <td>${h.qty}</td>
          <td>${fmt2(h.buyPrice)}</td>
          <td>${fmt(current)}</td>
          <td class="${cls}">${sign}${fmt(Math.abs(pl))}</td>
        </tr>`;
    });
  }

  renderChart(symbols);
  renderAnalytics(symbols);
}

function renderChart(symbols) {
  const ctx = document.getElementById("pie-chart").getContext("2d");
  const emptyMsg = document.getElementById("chart-empty");
  if (pieChart) pieChart.destroy();

  if (symbols.length === 0) { emptyMsg.style.display = "block"; return; }
  emptyMsg.style.display = "none";

  const colors = ["#818cf8","#34d399","#fbbf24","#f87171","#22d3ee","#c084fc","#fb923c","#2dd4bf","#a3e635","#e879f9"];

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: symbols,
      datasets: [{ data: symbols.map(s => getStock(s).price * holdings[s].qty), backgroundColor: colors.slice(0, symbols.length), borderWidth: 0 }]
    },
    options: {
      cutout: "64%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#4b5e78", font: { size: 10 }, boxWidth: 8, padding: 8 } }
      }
    }
  });
}

function renderAnalytics(symbols) {
  const set = id => document.getElementById(id);

  if (symbols.length === 0) {
    ["an-divScore","an-concentration","an-topHolding","an-portTrend","an-best","an-worst"]
      .forEach(id => { set(id).innerHTML = `<span class="an-label">${labelFor(id)}</span><span class="an-val muted">—</span>`; });
    return;
  }

  const portValue = symbols.reduce((s, sym) => s + getStock(sym).price * holdings[sym].qty, 0);

  // Diversification
  set("an-divScore").innerHTML = `
    <span class="an-label">Diversification</span>
    <span class="an-val">${symbols.length} <span class="an-sub">of 10 stocks</span></span>`;

  // Concentration (max single position %)
  let topSym = symbols[0], topVal = 0;
  symbols.forEach(sym => {
    const val = getStock(sym).price * holdings[sym].qty;
    if (val > topVal) { topVal = val; topSym = sym; }
  });
  const topPct = portValue > 0 ? (topVal / portValue) * 100 : 0;
  const concLevel = topPct > 50 ? ["High","badge-high"] : topPct > 30 ? ["Medium","badge-mid"] : ["Low","badge-low"];
  set("an-concentration").innerHTML = `
    <span class="an-label">Concentration</span>
    <span class="an-val"><span class="badge ${concLevel[1]}">${concLevel[0]}</span></span>`;

  // Top holding
  set("an-topHolding").innerHTML = `
    <span class="an-label">Largest Position</span>
    <span class="an-val">${topSym} <span class="an-sub">${topPct.toFixed(1)}%</span></span>`;

  // Portfolio trend (weighted avg of linear trends)
  let weightedTrend = 0;
  symbols.forEach(sym => {
    const w = portValue > 0 ? (getStock(sym).price * holdings[sym].qty) / portValue : 0;
    weightedTrend += linearTrend(getStock(sym).history) * w;
  });
  const trendCls = weightedTrend >= 0 ? "profit" : "loss";
  const trendDir = weightedTrend >= 0 ? "▲" : "▼";
  set("an-portTrend").innerHTML = `
    <span class="an-label">Portfolio Trend</span>
    <span class="an-val ${trendCls}">${trendDir} ${Math.abs(weightedTrend).toFixed(2)}% <span class="an-sub">est.</span></span>`;

  // Best / worst performer
  let bestSym = null, worstSym = null, bestPct = -Infinity, worstPct = Infinity;
  symbols.forEach(sym => {
    const pct = ((getStock(sym).price - holdings[sym].buyPrice) / holdings[sym].buyPrice) * 100;
    if (pct > bestPct)  { bestPct  = pct;  bestSym  = sym; }
    if (pct < worstPct) { worstPct = pct;  worstSym = sym; }
  });

  set("an-best").innerHTML = `
    <span class="an-label">Best Performer</span>
    <span class="an-val profit">${bestSym} <span class="an-sub">${bestPct >= 0 ? "+" : ""}${bestPct.toFixed(1)}%</span></span>`;

  set("an-worst").innerHTML = `
    <span class="an-label">Worst Performer</span>
    <span class="an-val loss">${worstSym} <span class="an-sub">${worstPct >= 0 ? "+" : ""}${worstPct.toFixed(1)}%</span></span>`;
}

function labelFor(id) {
  const map = { "an-divScore":"Diversification","an-concentration":"Concentration","an-topHolding":"Largest Position","an-portTrend":"Portfolio Trend","an-best":"Best Performer","an-worst":"Worst Performer" };
  return map[id] || "";
}

function showMsg(text, type) {
  const el = document.getElementById("trade-msg");
  el.textContent = text;
  el.className   = "msg " + type;
}

init();
