# Student Investment Simulator

A browser-based stock market simulator built as a field project for financial planning. The idea came from noticing that most students learn about investing through theory — textbooks, lectures, formulas — but never actually get to practice making decisions with real stocks. The fear of losing money keeps people away. This project removes that barrier by giving you ₹1,00,000 of fake money to invest however you want, with zero real-world consequences.

---

## What it does

You get a dashboard where you can:

- **Buy and sell** from a list of 10 Indian stocks (Reliance, TCS, HDFC, etc.)
- **Track your portfolio** — how many shares you hold, what you paid, and how much they're worth now
- **See your P&L** (profit and loss) for each stock and overall
- **View a chart** breaking down how your money is spread across different stocks

Everything saves automatically in your browser, so if you close and reopen the page your portfolio is still there.

---

## How to run it

No setup needed. Just download the folder and open `index.html` in any browser.

```
student-investment-simulator/
├── index.html   ← open this
├── style.css
├── app.js
└── stocks.js
```

---

## How it works (technically)

The whole thing runs in the browser — no server, no database, no external APIs.

**`stocks.js`** holds a hardcoded list of 10 stocks with fixed prices. In a real app these would come from a live API, but for this project static data keeps things simple and self-contained.

**`app.js`** handles all the logic:
- When you buy a stock, it checks if you have enough cash, subtracts the cost, and adds the shares to your holdings. If you buy the same stock multiple times at different prices, it calculates the average buy price automatically.
- When you sell, it adds the money back and removes the shares.
- P&L is calculated live: `(current price − avg buy price) × quantity`.
- Everything gets saved to `localStorage` so it survives page refreshes.

**`index.html` + `style.css`** make up the dashboard. The layout is a two-column grid — trade panel on the left, portfolio table and allocation chart on the right — sized to fit one screen without scrolling.

---

## Financial concepts covered

| Concept | Where it shows up |
|---|---|
| Asset Allocation | The doughnut chart showing how your money is split |
| Diversification | Visible when you spread investments across multiple stocks |
| P&L Tracking | Per-stock and total profit/loss in the portfolio table |
| Risk Awareness | You can see what happens to your portfolio when one stock takes up most of it |

---

## Known limitations

Stock prices don't change — they're fixed values. In a more advanced version, you could simulate price movement using random fluctuations or pull real data from an API like Yahoo Finance or NSE's public endpoints. The leaderboard idea (comparing portfolios across multiple users) was left out since this version has no backend.
