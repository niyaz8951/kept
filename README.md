# Money Recovery — Financial Wellbeing

Run your home like a company. A free, private, mobile-first web app that reads your
transaction history (Excel or daily entries), builds a corporate-style view of your
money — P&L, cash-flow statement, budgets with variance, spending controls, month-on-month
and yearly outlooks — and confronts you with the 10/20-year arithmetic of staying on
or off the path.

No server required. No build step. No tracking. Your data lives in your browser;
optionally sync it, encrypted in transit, to your own free Supabase project with login.

## 1 · Get it online (5 minutes, free)

1. Create a new GitHub repository and upload everything in this folder
   (or `git init && git add -A && git commit -m "init" && git push`).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
   The included workflow (`.github/workflows/pages.yml`) deploys on every push to `main`.
3. Open `https://<your-username>.github.io/<repo>/` on your phone.
4. **Install it like an app**: Chrome on Android → menu → *Add to Home screen*
   (iPhone: Safari → Share → *Add to Home Screen*). It runs full-screen and offline.

Until you configure sync, the app is **local-only**: nothing ever leaves your device.

## 2 · Optional: free login + cross-device sync (Supabase)

1. Create a free project at https://supabase.com.
2. In the Supabase dashboard → SQL editor → paste and run `supabase/schema.sql`
   (creates two tables protected by Row Level Security — each login sees only its own rows).
3. Project Settings → API → copy the **Project URL** and **anon public** key into `config.js`.
4. Commit and push. The header now shows **Sign in** — create your account with
   email + password. Your history and profile sync automatically; other devices
   pull it after login. (The anon key is designed to be public; RLS is the lock.)

## 3 · Feeding it data

- **History**: header → *Upload* → your Excel/CSV. Column names are auto-mapped
  (Date, Description/Expense, Amount with negatives as spending — or Debit/Credit
  columns, Category, Remarks). Re-uploading is safe: rows are de-duplicated,
  so keep one growing file or upload monthly statements — either works.
- **Daily** (the habit that beats every statement): **Add today** tab — amount,
  category chip, save. Or paste your bank SMS/notifications, one per line; amounts,
  merchants and dates are parsed and categorized automatically.

## 4 · What it tells you

- **Home** — keep-rate hero, discipline score, honest income (borrowed ≠ earned),
  and the **path banner**: whether the latest month is on the ramp to your target
  keep-rate, and whether the current month is ahead or behind pro-rata, in money.
- **CFO view** — household P&L with margins, three-section cash-flow statement,
  cost structure & break-even day, five spending controls audited PASS/FAIL,
  zero-based budget vs actual variance (editable envelopes).
- **Month-on-month** — years overlaid Jan–Dec, per-month vs-prior-year cards,
  projections for the next three months and computed cautions.
- **Analysis** — the full 18-part board pack as a scrolling mobile story
  (the desktop *Present* button still gives the fullscreen deck with laser pointer).
- **Life plan** — profile (age, children's birth years, majors like house/car/education),
  then the brutal math: 5/10/20-year and retirement-age outcomes on your current path
  vs 20% vs 40%, education coverage per child, and the compounded cost of every
  undisciplined year. Inflation-adjusted, so the numbers are in today's money.

## 5 · Privacy model

- Local mode: everything in `localStorage` on your device. Clearing site data erases it —
  export regularly (upload files are your backup) or enable sync.
- Sync mode: rows go to *your* Supabase project under *your* account; RLS policies in
  `schema.sql` mean no other login can read them. This repo contains no analytics.

## 6 · Hacking on it

Plain HTML/CSS/JS, no framework, no bundler. `js/core.js` is the engine
(parsing, classification, the monthly model); `js/render*.js` the dashboard;
`js/deck.js` the presentation/story content; `js/life.js` the projections and
path logic. Chart.js and SheetJS are vendored for full offline use. MIT licensed.
