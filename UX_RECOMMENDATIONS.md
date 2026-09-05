# UX recommendations, knot.onenft.click

Written 2026-09-05 after the audit in `AUDIT_REPORT.md`. Scores are 1 to 5: Impact, Effort, Confidence, Risk. Priority = Impact × Confidence / Effort. The score is a sorting aid, not a decision.

## How the site reads today

Personas walked: a new visitor with no wallet, a returning collector, a keyboard user, someone on a slow link, someone who does not know what an NFT or ENS is.

What works: the page states its one idea in the first screen (one knot a day, the clock is the chain, claim it or it stays a gap). The colours change with the day, which is the product's own tell. The claim button is one click plus the wallet's own prompts, with messages at every step (`aria-live`). The `/how` page hands the whole algorithm to a reader who wants to port it. Every page has a way back to the hub and to the fabric. Downloads work without JavaScript through the server card. Empty states exist ("No days here yet", "nobody came, the gap stays"). No modals, no onboarding, no cookie banner.

What confuses or costs: the sidebar's "1 taken / 0 gaps / 0 yours" counters are silent about what "yours" means until a wallet is connected. The connect flow on `/yours` says "No wallet in this browser" and stops; a phone visitor has no path but typing an address. The RPC-down state was invisible before the fix and is now a sentence. The trait names (weave, caps, ground) are explained only on `/traits`. The countdown says "3 h 30 min" and the page reloads at zero without warning. Muted text was hard to read on seven palettes (fixed). The download file names differ between pages.

## A. Quick wins

| # | User problem | Change | Impact | Effort | Conf. | Risk | Score |
|---|---|---|---|---|---|---|---|
| A1 | `/yours` says "Nothing is sent anywhere", but the address becomes the URL and shows in analytics. A careful visitor feels misled later. | Rewrite to: "The wallet only tells this page which address to look up. The address is then in the page URL, like any wallet page." | 3 | 1 | 5 | 1 | 15 |
| A2 | Two download names for the same file (`onenft-day-N.svg` on day pages, `knot-day-N.svg` on holder pages). | Use `FILE_PREFIX` everywhere. | 2 | 1 | 5 | 1 | 10 |
| A3 | The page reloads at midnight while someone may be reading or mid-claim. | Show "Day N+1 has begun. Reload." in the countdown slot instead of `location.reload()`, and reload only if the claim button is not busy. | 3 | 1 | 4 | 1 | 12 |
| A4 | The address input's border (`--line`) is faint on every palette. | Border in `--muted`, focus in `--fg`. Meets 3:1. | 2 | 1 | 5 | 1 | 10 |
| A5 | A keyboard user has no way to skip the sidebar on every page. | One "Skip to today's knot" link, visible on focus. | 2 | 1 | 5 | 1 | 10 |
| A6 | "yours" counter shows `0` with no wallet, which reads as "you own nothing". | Hide the counter until an account is known (it already starts `hidden`; keep it hidden when the count is 0 and no wallet). Verify the script's `n` path. | 2 | 1 | 4 | 1 | 8 |
| A7 | The mint failure message "The network rejected it. Someone may have been faster." leaves the visitor unsure. | Add: "Reload to see who took it." with a reload link. | 2 | 1 | 4 | 1 | 8 |

Metrics for A: claim success rate (receipt status 1 / send attempts, from the client's own flow, no personal data), bounce on `/yours`, Umami events for "download" clicks by kind.

## B. Medium scope

| # | User problem | Change | Impact | Effort | Conf. | Risk | Score |
|---|---|---|---|---|---|---|---|
| B1 | Phone visitors with a wallet app cannot claim: injected wallets only. | WalletConnect or the Base mini-app path (roadmap 5 and 7). Needs a project id or a Farcaster signature. | 4 | 4 | 3 | 2 | 3 |
| B2 | A visitor who never saw Truchet tiles lands on jargon. | A one-line glossary on hover/focus for each trait name on the home page (`<abbr title>` or a `<details>` under the trait list), pulling `TRAIT_NOTES` that already exist in `pages.ts`. | 3 | 2 | 4 | 1 | 6 |
| B3 | When the RPC is down the site now says so, but silently: the operator finds out from a visitor. | An uptime check on `/health` with `contract` in the body (roadmap 1). The owner must opt in to any notification; the operational rule forbids proactive pings without consent. | 4 | 2 | 4 | 1 | 8 |
| B4 | The site has no Content Security Policy; the fix added only frame and sniff headers. | Move the four inline scripts to `/site.js`, the CSS to `/site.css` (palette variables can stay inline via a nonce or `style-src 'unsafe-inline'`), then ship `default-src 'self'; script-src 'self' <umami>; font-src fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; connect-src 'self' <umami>; img-src 'self' data: blob:`. | 3 | 3 | 4 | 2 | 4 |
| B5 | A single public RPC is the site's only chain source. | `BASE_RPC_URL` on a dedicated provider with viem `fallback([...])` over two transports (roadmap 1). | 4 | 2 | 5 | 1 | 10 |
| B6 | The `Claimed` log scan restarts from block 50,880,000 on every container start. | Persist `scanned` and the claims map to a small JSON file on a volume, or read from a dedicated RPC in 100k-block chunks (roadmap 8). | 2 | 2 | 4 | 2 | 4 |
| B7 | The container runs as root. | `USER bun` in the Dockerfile (the base image ships that user). | 2 | 1 | 5 | 1 | 10 |

## C. Experiments

| # | Question | How to test | Success metric |
|---|---|---|---|
| C1 | Does a preview of tomorrow's knot on the home page bring people back before midnight? | Add a small "tomorrow" tile under today's knot for two weeks, compare `/`→ return visits within 24 h in Umami (per-visitor counts only, no identity). | Return rate up; no rise in claims that revert. |
| C2 | Do people want the RSS/calendar or a Farcaster feed? | Count `/feed.xml` and `/calendar.ics` fetches by user agent class for a month. | Decide which channel to invest in (roadmap 9). |
| C3 | Is the 60-row fabric on the home page the right length once the collection is months old? | At day 120, sample scroll depth (Umami event at row 20/40/60). | If fewer than 10% reach row 40, cut to 30 rows and link the calendar. |
| C4 | Does naming the gap ("nobody came") make the empty days feel like part of the work or like failure? | Ask five collectors in a 10-minute call, or a one-question poll on Farcaster. | Qualitative; informs copy only. |

## D. Rejected

| Idea | Why not |
|---|---|
| Light/dark toggle | Decided against: the colours belong to the day. Adding a toggle removes the product's one visual signature. |
| A wallet library (RainbowKit, Web3Modal) for the desktop flow | The EIP-1193 flow is 40 lines and works; a library adds a build step and 200 kB for no desktop gain. Mobile is B1, a narrower add. |
| Per-address claim caps | Decided; first-come is the design. |
| Collecting wallet analytics (which address clicked what) | Privacy cost with no product question behind it. Umami page paths already carry more than needed (A1). |
| Server-side PNG for every download size | The browser draws PNG/JPEG from the SVG at 1024/2048/4096 already; the server card stays as the no-JavaScript fallback. |
| Rate limiting on `/name.eth` lookups | No evidence of abuse; the cache cap (P3-2) bounds memory. Revisit if the L1 RPC starts refusing. |
| A rewrite of the string-template HTML into a framework | The whole site is 1,100 lines of templates with tests; the risk that was found (ENS strings) is fixed at the source. |

## Roadmap

- **Next patch** (this branch): P1 and P2 fixes, typecheck gate. Then A1, A2, A4, B7.
- **Next release**: B5 (dedicated RPC with fallback), A3, A5, A6, A7, B2.
- **Larger release**: B1 (mobile wallets), B4 (CSP with external scripts), B6 (persisted log scan), B3 if the owner opts in.
- **To validate first**: C1 to C4.

## Metrics to keep

- Claim funnel: button click → wallet prompt → send → receipt (client-side events, no address). Target: 80% of sends confirmed.
- RPC health: share of requests served from `lastGood` (add a counter to `/health`). Target: under 1% per day.
- Site availability from an external check. Target: 99.9%.
- Time to first render of `/` (Umami's page timing). Target: under 1.5 s at p75.
- Downloads by kind and size. No target; informs whether the size picker matters.
- Gaps per week (public on `/explore`). The product's own pulse.
