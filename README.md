# kept.

**How much of your money stays yours.**

Kept is a free, private, mobile-first web app that runs your household like a company.
It reads your transaction history (Excel upload or daily entries), builds a corporate-style
money review — P&L, cash-flow statement, zero-based budgets with variance, spending
controls audited PASS/FAIL, month-on-month and yearly outlooks — and confronts you with
the 10/20-year arithmetic of staying on or off the path.

No server. No build step. No tracking. Your data lives in your browser; optionally sync it
to your own free Supabase project with login.

Live at: `https://niyaz8951.github.io/kept/` (after the steps below)

## 1 · Put it online (5 minutes, free)

```bash
git init && git add -A && git commit -m "kept: first commit"
git remote add origin git@github.com:niyaz8951/kept.git
git branch -M main && git push -u origin main
```

Then in GitHub: **Settings → Pages → Source: GitHub Actions**.
The included workflow deploys on every push to `main`.

**Install it like an app:** open the URL on your phone → Chrome menu →
*Add to Home screen* (iPhone: Safari → Share → *Add to Home Screen*).
Kept runs full-screen and fully offline.

### Optional: custom domain
Since you own `thinkneering.com`: in the repo create a file `CNAME` containing
`kept.thinkneering.com`, and at your DNS add a CNAME record
`kept → niyaz8951.github.io`. GitHub Pages handles HTTPS automatically.

## 2 · Optional: free login + cross-device sync (Supabase)

1. Create a free project at https://supabase.com
2. SQL editor → run `supabase/schema.sql` (two tables locked by Row Level Security —
   every login sees only its own rows)
3. Project Settings → API → copy the Project URL and anon public key into `config.js`,
   commit, push. The header shows **Sign in**; the anon key is meant to be public — RLS is the lock.

## 3 · Feeding Kept

- **History**: header → *Upload* → your Excel/CSV. Columns are auto-mapped (Date,
  Description/Expense, Amount with negatives as spending, or Debit/Credit, Category,
  Remarks). Re-uploads are de-duplicated — one growing file or monthly statements both work.
- **Daily** (the habit that beats every statement): **Add today** — amount, category chip,
  save. Or paste bank SMS messages, one per line; amounts, merchants and dates are parsed
  and categorized automatically.

## 4 · What Kept tells you

- **Home** — the keep-rate hero, discipline score, honest income (borrowed ≠ earned), and
  the **path banner**: on the ramp to your target keep-rate or deviating, in money, plus
  ahead/behind pro-rata for the current month.
- **CFO view** — household P&L with margins, three-section cash-flow statement, cost
  structure & break-even day, five spending controls audited on the latest month,
  editable budget-vs-actual variance.
- **Month-on-month** — years overlaid Jan–Dec, vs-prior-year cards, three-month
  projections and computed cautions.
- **Analysis** — the 18-part board pack as a scrolling mobile story (desktop *Present*
  gives the fullscreen deck with laser pointer).
- **Life plan** — profile (age, children's birth years, majors), then the brutal math:
  5/10/20-year and retirement outcomes on your current path vs 20% vs 40%, education
  coverage per child, and the compounded cost of every undisciplined year — all in
  today's money.

## 5 · Privacy model

Local mode keeps everything in `localStorage` on your device — clearing site data erases
it, so keep your Excel as backup or enable sync. Sync mode stores rows in *your* Supabase
project under *your* account; `schema.sql` policies mean no other login can read them.
This repository contains no analytics and no personal data.

## 6 · Hacking on it

Plain HTML/CSS/JS, zero dependencies at runtime. `js/core.js` is the engine;
`js/render*.js` the dashboard; `js/deck.js` the review content; `js/life.js` the
projections and path logic. Chart.js and SheetJS are vendored in `vendor/` for offline
use. MIT licensed.
