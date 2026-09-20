# Kept — audit & improvement prompt

Paste this into a fresh session together with the repository zip (`kept.zip`).
It asks for a gap review, a mobile-usability audit, and a competitive comparison,
and it ends with the deliverable that matters: an improved repository.

---

You are acting as a senior product engineer and mobile UX reviewer for **Kept**
(repo `niyaz8951/kept`), a private, offline-first personal-finance PWA. The full
source is attached as a zip. Read the actual code before judging anything —
`index.html`, `css/app.css`, and every file in `js/` — and never assume a feature
exists because a filename suggests it.

## What Kept is
A plain HTML/CSS/JS app (no build step, no frameworks, no runtime npm, every
dependency vendored because the owner's network blocks CDNs) hosted on GitHub
Pages, installable as a phone app, with optional Supabase login and per-user
row-level-security sync. Its purpose is behaviour change, not bookkeeping: an
Excel upload seeds the history, daily entries and pasted bank SMS keep it
growing, and the app reports a corporate-style review of household money —
P&L, cash-flow statement, budgets with variance, spending controls, month-on-month
and yearly outlooks, a scrolling Analysis story, and brutal 10/20-year life math.
The single headline metric is the **keep-rate**: how much of every 100 earned stays.

## Task 1 — Gap review
Work through the app as a whole and list what is missing, broken, half-built or
inconsistent. Cover at least: the data model and dedupe/restart semantics; sync
correctness and failure handling; the accuracy and honesty of every computed
number (classification of borrowed money vs income, estimates, edge cases like a
single month of data, zero income, a partial month, deleted rows); empty and error
states; whether each screen ends with a specific measurable action rather than a
bare number; and anything a user would reasonably expect from a finance app that
isn't there. Rank findings by impact on the owner's actual goal — getting out of
debt and raising the keep-rate — not by how easy they are to fix.

## Task 2 — Mobile accessibility and ease of use
Audit the app as a phone app used one-handed, daily, in a hurry. Check tap-target
sizes and thumb reach, the cost in taps of logging one expense, scroll length and
information density on a small screen, font sizes and contrast (state the ratios
against WCAG AA), focus states and keyboard/screen-reader semantics (labels, roles,
aria-live for the path banner and messages, table headers, button names), input
types and keyboards for numeric fields, safe-area and notch handling, offline and
slow-network behaviour, what happens on first launch with no data, and whether
anything important is hidden behind hover or a mouse. Quote the specific selector
or line you are criticising and give the concrete replacement.

## Task 3 — Competitive comparison
Compare Kept with the personal-finance apps people actually use — for example
YNAB, Monarch, Copilot, Actual Budget, Firefly III, Wallet by BudgetBakers,
Money Manager, Emma, Mint's successors, and any open-source alternatives you know.
For each comparison, say plainly: what they do better than Kept and whether it is
worth copying given Kept's constraints (no server, no AI, privacy first); what Kept
already does better and should push further; and which of their patterns would
actively harm Kept's purpose. Pay attention to onboarding, transaction capture
speed, categorisation, recurring detection, goal tracking, reporting, and how they
handle data export and account deletion. Be concrete about what to adopt.

## Task 4 — Implement
Apply the improvements you recommended, respecting these hard constraints:
- plain HTML/CSS/JS only; no build step, frameworks, bundlers or runtime npm
- no CDN or external network calls except the optional Supabase API
- vendor any new dependency into `vendor/`
- add new assets to the `SHELL` list in `sw.js` and bump the cache version
- never commit personal data; sample files use invented data only
- currency-aware copy everywhere (use the selected currency and its word)
- keep the surface minimal — few screens, hard numbers, honest interpretation
- test before delivering: run the headless suite and confirm no runtime errors

## Deliverable
Return the complete improved repository as a zip, plus a short changelog that
separates (a) what you fixed, (b) what you added from the competitive review and
why, and (c) what you deliberately did not do and the reason. Prioritise ruthlessly:
if a change does not make the owner more likely to log a transaction today or cut
spending this month, say so and leave it out.
