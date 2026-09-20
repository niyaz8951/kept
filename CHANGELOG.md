# Kept — changelog

## v10 — duplicates and the sync error

- **"ON CONFLICT DO UPDATE command cannot affect row a second time".** Postgres refuses an
  upsert batch that touches the same key twice. Your store held more than one row with the
  same `(date, amount, description)` — `replaceAll()` (the Excel upload path) wrote every
  row as-is without collapsing, so the batch carried duplicate keys and the whole push
  failed. Three fixes: the upload now collapses identical rows before storing, `push()`
  collapses by key before sending as a safety net, and a boot-time repair cleans any store
  written by an earlier version.
- **Same date + amount + description now always replaces.** `merge()` used to skip a
  matching row, so a re-import could never correct a category or remark. It now overwrites
  the stored row (newer category/remark wins) and reports `added` and `updated`
  separately — one transaction, one row, always.
- **Sync errors were painted green.** The Account panel styled every sync state as healthy;
  failures now show in coral, and a **Repair duplicates & re-sync** button collapses any
  duplicates, rewrites the cloud copy from this device, and tells you how many rows it
  merged.
- Upload confirmation now reports how many identical rows were collapsed.

## v9 — phone layout pass

- **The page could scroll sideways.** Nothing constrained the document width, so any wide
  child (the CFO statements, a KPI row, a filter bar) pushed the whole layout past the
  viewport — which is why the header covered only part of the screen in the screenshot.
  Added `html,body{max-width:100%;overflow-x:hidden}` and `*{min-width:0}` so grid and flex
  children can actually shrink, plus `max-width:100%` on tables, images and SVGs.
- **CFO view now fits a phone.** Below 640px every table wraps its text instead of forcing
  `nowrap`, figures stay on one line, padding tightens, and the least useful column is
  dropped: "% of revenue" in the P&L, "avg/month" in budget-vs-actual, "target" in the
  controls audit, the LY column in the month table, the 5-year column in the life table.
  The full numbers remain on tablet and desktop.
- **Controls stack instead of squeezing.** Filter bars, search fields and the Add form go
  to one column; fixed inline widths (220px / 240px / 190px) replaced with flexible ones.
- **Header reflows** into two comfortable rows with notch-safe padding, and the analysis
  story cards, history rows, tiles and life-plan form all get phone-sized spacing.
- Verified with a 360px overflow audit (tables inside scroll wrappers, no fixed width above
  the viewport, every grid collapses, safe-area rules present) plus the full headless suite.

## v8 — history, income entries and recurring rules

### Fixed
- **Uploaded Excel rows were invisible after a reset.** Reset cleared transactions but not
  the tombstone list (`kept_tomb`), so `Store.merge()` kept refusing those hashes — a cloud
  pull or a re-upload of the same file silently restored nothing. Reset now clears
  tombstones (and recurring rules), and `push()` drops them once the server confirms the
  deletes, so they can never accumulate into a permanent blocklist.
- **History could strand you on one month.** The month filter kept a stale value when the
  option list was rebuilt (your screenshot: "Jan 26", 1 of 2 shown). It now falls back to
  *All months* whenever the previous selection no longer exists.

### Added
- **Money in / Money out toggle** in Add. Income was only loggable by picking a magic
  "Income" category; there is now an explicit switch, the category chips change with it
  (Income / Refund / Loan for money in), and the button reads "Save income" or
  "Save expense". Enter submits.
- **Recurring rules with an end date.** Rent, EMIs, salary, subscriptions: set amount,
  category, direction, frequency (weekly / monthly / yearly), start and optional end.
  Kept writes every occurrence up to today, stops at the end date, handles month-end dates
  (a rule on the 31st lands on the last day of short months), re-runs idempotently at every
  boot thanks to hash dedupe, and tells you what the rule commits per year when you save it.

## v7 — the hero card was never inside a tab

- **Root cause of "the big banner shows on every tab".** The hero card (`<div id="hero">`,
  the keep-rate waffle and the no-data welcome) sat in the page shell *between* the nav and
  the `.tab-pane` sections, so it was never governed by tab switching — it painted on every
  screen by construction. It now lives inside `#pane-overview` and appears only there.
- Tab logic split into two honest rules: which screens have their own no-data content
  (Overview, Add, History, Life plan, Account) and which renderers can run with no data —
  Overview keeps its welcome instead of being overwritten by the generic empty state.
- A small version tag (`v7`) sits next to the wordmark, so you can tell at a glance whether
  the browser is showing the build you just uploaded or a cached one.

## v6 — boot crash fix (this is why every tab looked the same)

- **`Sync.init()` threw on every load where Supabase keys were absent.** It still wrote to
  the old header badge (`$$("syncBadge")`), which was removed when Account became its own
  section — `badge.textContent` on `null` aborted boot, so `Account.render()`,
  `History.init()`, `QuickAdd.init()` and part of the tab wiring never ran. Every tab then
  showed whatever the shell had rendered last, Account was empty, and the avatar stayed "?".
  Sync no longer touches the badge, reports its state through the Account panel instead,
  and returns cleanly when the auth sheet or keys are missing.
- **One module can no longer take down the app.** QuickAdd, History, Account and Sync each
  boot inside their own error boundary; a failure is logged and the rest still runs. A
  corrupted stored dataset now shows a recoverable message ("export and re-upload") instead
  of a blank page.
- **"This month, so far" hid itself when there is no data** instead of rendering an empty shell.
- Cache version bumped to `kept-v6`. **After uploading the new files, hard-refresh once**
  (Ctrl+Shift+R, or on the phone close and reopen the installed app) so the old service
  worker releases the cached scripts.

## v5 — path banner fixes

- **The banner appeared on every screen.** It is a Home panel, not a site-wide header:
  it now renders only on Overview and clears on every other tab.
- **Nonsense keep-rate ("kept -24077%").** A month where the salary never landed was
  still scored, so a normal month of spending divided by near-zero income produced an
  absurd percentage. The path check now scores the most recent complete month whose
  income is at least 40% of your usual, says plainly how many months it skipped and why,
  clamps any rate to ±100%, and reports "NOT SCORED" when no month has a real salary yet.
- **Month-to-date measured from the wrong day.** The "day N" came from the last row in
  the file (day 1 in your screenshot), not the calendar. It now uses today's date, only
  when the running month actually is the current month, and reads "under/over pace"
  instead of contradicting the headline.

## v4 — review pass (gap review, mobile accessibility, competitive comparison)

### (a) Fixed

- **Deleted transactions came back.** `Store.merge()` had no tombstones, so any row
  deleted locally was re-added by the next `Sync.pull()`. Deletes are now recorded in
  `kept_tomb`, merge refuses resurrected hashes, and `push()` deletes those rows
  server-side. Cleared on a fresh upload.
- **Offline writes were silently lost.** `queuePush()` fired regardless of connectivity
  and swallowed errors. It now checks `navigator.onLine`, records the failure in the
  Account panel, and retries automatically on the `online` event.
- **Dishonest numbers on thin data.** One month of history produced confident averages,
  and zero detected income produced a 0% keep-rate that looked like a verdict. The hero
  now carries a data-sufficiency note: one/two months flagged as "not yet a pattern",
  missing income rows explained (with the fix), and the running partial month named as
  excluded from averages.
- **Blank screens with no data.** Analysis-only tabs rendered empty. Each now shows an
  empty state with two buttons: log an expense, or upload the Excel. Original markup is
  cached and restored when data arrives.
- **Accessibility.** Added: skip link, `<main>` landmark, `role=tablist`/`tab`/
  `tabpanel` with `aria-selected`, `hidden` on inactive panes, `aria-current` in the
  bottom nav, `aria-live="polite"` on the path banner, `role=alert` on auth messages,
  `aria-label`s on icon-only controls and filters, `<label for>` on every form input.
- **Tap targets and contrast.** 44px minimum on every button, chip and tab (52px in the
  bottom nav, 52px amount field); `.sub` and secondary text moved from `--grey`
  (~3.4:1, below AA) to `--ink2` (~5.9:1 on card); `:focus-visible` ring everywhere;
  `prefers-reduced-motion` honoured.
- **Mobile keyboards.** Amount field is `inputmode="decimal"` with `step`/`min`, text
  fields carry `enterkeyhint="done"`.

### (b) Added from the competitive review

- **One-tap repeat tiles** (Add tab) — the pattern behind Wallet/Money Manager's speed.
  Merchants seen three or more times become buttons pre-filled with your usual amount
  and category: logging a repeat expense is two taps, not eight. This is the single
  change most likely to make the owner log something today.
- **"This month, so far" on Home** — YNAB's envelope burn-down, kept honest. Out/in/kept
  to date against a pro-rata pace, the six tightest envelopes as bars, and one specific
  instruction ("freeze X for the rest of the month"). Everything else in Kept explains
  the past; this is the only panel that can still change the current month.

### (c) Deliberately not done

- **Bank aggregation (Plaid/SaltEdge, à la Monarch/Copilot/Emma).** Needs a paid server
  and hands transaction data to a third party — it contradicts the no-server, privacy-first
  constraint. The SMS-paste parser already covers same-day capture.
- **Multi-account balances and reconciliation (Firefly III, Actual Budget).** Real
  double-entry accounting is a large surface that improves bookkeeping accuracy, not
  behaviour. Kept's thesis is the keep-rate, not a balanced ledger.
- **Goals/savings-buckets UI (Monarch, Emma).** The Life plan already states the only
  goals that matter in money and years; buckets would add screens without adding pressure.
- **Push notifications and streaks.** Would need a server and permission prompts, and
  gamified streaks reward opening the app rather than cutting spending.
- **CSV import mapping wizard.** The auto-mapper plus the sample file covers the
  formats seen so far; a wizard is onboarding polish, not a spending decision.
