# Student Investment Simulator — Implementation Plan

**By:** Megh Shah | B.Tech Field Project

---

## What We're Building

A simple web page where a student starts with ₹1,00,000 of fake money, buys/sells stocks from a fixed list, and sees their profit or loss.

---

## Tech Stack (Beginner-Friendly)

- **HTML + CSS + JavaScript** — just files, no frameworks
- **No backend, no database** — everything stored in browser `localStorage`

---

## File Structure

```
student-investment-simulator/
├── index.html       # main page
├── style.css        # basic styling
├── app.js           # all logic
└── stocks.js        # mock stock data
```

---

## Step-by-Step Plan

### Step 1 — Create mock stock data (`stocks.js`)
- Hardcode a list of 10 stocks with a name, symbol, and price
- Example: `{ name: "Reliance", symbol: "RIL", price: 2450 }`

### Step 2 — Set up the page (`index.html`)
- Show current cash balance
- Show a dropdown to pick a stock + input for quantity
- Buy and Sell buttons
- A table to show current holdings
- A section for total P&L

### Step 3 — Write the logic (`app.js`)
- On load: set balance = ₹1,00,000 (from `localStorage` or default)
- **Buy:** subtract cost from balance, add stock to holdings
- **Sell:** add money back, remove from holdings
- **P&L:** (current price − buy price) × quantity for each stock
- Save everything to `localStorage` so it persists on refresh

### Step 4 — Add a basic chart
- Use a free library like **Chart.js** (one `<script>` tag, no install)
- Show a pie chart of how money is split across stocks

### Step 5 — Style it (`style.css`)
- Clean table layout
- Green for profit, red for loss
- Nothing fancy

---

## What Gets Demonstrated

| Feature | How |
|---|---|
| Virtual capital | Hardcoded ₹1,00,000 starting balance |
| Buy/Sell stocks | JS functions updating localStorage |
| Portfolio view | HTML table of holdings |
| P&L tracking | Calculated on the fly in JS |
| Asset allocation | Pie chart via Chart.js |

---

## Out of Scope

- No login/accounts
- No real stock prices
- No backend
- No leaderboard (can mention as future scope)
