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
      <div class="sl-price">${fmt(s.price)}</div>`;
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
