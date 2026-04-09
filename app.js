const STARTING_BALANCE = 100000;

let balance  = parseFloat(localStorage.getItem("balance")) || STARTING_BALANCE;
let holdings = JSON.parse(localStorage.getItem("holdings") || "{}");

let pieChart = null;

function fmt(n) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmt2(n) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ── Analytics helpers ──────────────────────────────────
function sparklineSVG(history) {
  const w = 56, h = 22;
  const min = Math.min(...history), max = Math.max(...history);
  const range = max - min || 1;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = history[history.length - 1] >= history[0];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? "#4ade80" : "#f87171"}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function linearTrend(history) {
  const n = history.length;
  const xm = (n - 1) / 2;
  const ym = history.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  history.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  const slope = den ? num / den : 0;
  const predicted = history[n - 1] + slope;
  const pct = ((predicted - history[n - 1]) / history[n - 1]) * 100;
  return { predicted, pct };
}

function renderAnalytics(symbols) {
  // Best / worst by % gain among holdings
  const best  = document.getElementById("an-best");
  const worst = document.getElementById("an-worst");
  const pred  = document.getElementById("an-predict");

  if (symbols.length === 0) {
    best.innerHTML = worst.innerHTML = pred.innerHTML = "";
    return;
  }

  let bestSym = null, worstSym = null, bestPct = -Infinity, worstPct = Infinity;
  symbols.forEach(sym => {
    const h = holdings[sym];
    const pct = ((getStock(sym).price - h.buyPrice) / h.buyPrice) * 100;
    if (pct > bestPct)  { bestPct  = pct;  bestSym  = sym; }
    if (pct < worstPct) { worstPct = pct;  worstSym = sym; }
  });

  best.innerHTML  = bestSym  ? `<span class="an-label">Best</span><span class="an-val profit">${holdings[bestSym].name.split(" ")[0]} <small>${bestPct >= 0 ? "+" : ""}${bestPct.toFixed(1)}%</small></span>` : "";
  worst.innerHTML = worstSym ? `<span class="an-label">Worst</span><span class="an-val loss">${holdings[worstSym].name.split(" ")[0]} <small>${worstPct >= 0 ? "+" : ""}${worstPct.toFixed(1)}%</small></span>` : "";

  // Trend prediction for selected stock
  const sym   = document.getElementById("stock-select").value;
  const stock = getStock(sym);
  const { pct } = linearTrend(stock.history);
  const dir  = pct >= 0 ? "▲" : "▼";
  const cls  = pct >= 0 ? "profit" : "loss";
  pred.innerHTML = `<span class="an-label">${stock.symbol} Trend</span><span class="an-val ${cls}">${dir} ${Math.abs(pct).toFixed(2)}% <small>est. next</small></span>`;
}

// ── Init ──────────────────────────────────────────────
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
  balance  = STARTING_BALANCE;
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
function getStock(symbol) {
  return STOCKS.find(s => s.symbol === symbol);
}

function buyStock() {
  const symbol = document.getElementById("stock-select").value;
  const qty    = parseInt(document.getElementById("qty-input").value);

  if (!qty || qty <= 0) { showMsg("Enter a valid quantity.", "error"); return; }

  const stock = getStock(symbol);
  const cost  = stock.price * qty;

  if (cost > balance) {
    showMsg(`Need ${fmt(cost)} — not enough cash.`, "error");
    return;
  }

  balance -= cost;

  if (holdings[symbol]) {
    const old      = holdings[symbol];
    const totalQty = old.qty + qty;
    holdings[symbol].buyPrice = ((old.buyPrice * old.qty) + (stock.price * qty)) / totalQty;
    holdings[symbol].qty      = totalQty;
  } else {
    holdings[symbol] = { name: stock.name, buyPrice: stock.price, qty };
  }

  save();
  render();
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

  save();
  render();
  showMsg(`Sold ${qty} share(s) of ${stock.name}.`, "success");
}

// ── Render ────────────────────────────────────────────
function render() {
  const symbols = Object.keys(holdings);

  const portValue = symbols.reduce((sum, sym) => sum + getStock(sym).price * holdings[sym].qty, 0);
  const totalPL   = symbols.reduce((sum, sym) => {
    const h = holdings[sym];
    return sum + (getStock(sym).price - h.buyPrice) * h.qty;
  }, 0);

  document.getElementById("balance").textContent   = fmt(balance);
  document.getElementById("port-value").textContent = fmt(portValue);

  const plEl = document.getElementById("total-pl");
  plEl.textContent  = (totalPL >= 0 ? "+" : "−") + fmt(Math.abs(totalPL));
  plEl.style.color  = totalPL > 0 ? "#4ade80" : totalPL < 0 ? "#f87171" : "#f1f5f9";

  const tbody = document.getElementById("portfolio-body");
  if (symbols.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No holdings yet — buy something!</td></tr>`;
  } else {
    tbody.innerHTML = "";
    symbols.forEach(sym => {
      const h       = holdings[sym];
      const current = getStock(sym).price;
      const pl      = (current - h.buyPrice) * h.qty;
      const cls     = pl >= 0 ? "profit" : "loss";
      const sign    = pl >= 0 ? "+" : "−";

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
  const ctx      = document.getElementById("pie-chart").getContext("2d");
  const emptyMsg = document.getElementById("chart-empty");
  if (pieChart) pieChart.destroy();

  if (symbols.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  const colors = ["#6366f1","#22c55e","#f59e0b","#ef4444","#06b6d4","#a855f7","#ec4899","#14b8a6","#f97316","#84cc16"];

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: symbols,
      datasets: [{
        data: symbols.map(s => getStock(s).price * holdings[s].qty),
        backgroundColor: colors.slice(0, symbols.length),
        borderWidth: 0,
      }]
    },
    options: {
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#94a3b8", font: { size: 11 }, boxWidth: 10, padding: 10 }
        }
      }
    }
  });
}

function showMsg(text, type) {
  const el = document.getElementById("trade-msg");
  el.textContent = text;
  el.className   = "msg " + type;
}

init();
