# Raport: UI/UX, copy i niezawodność onenft.click (wykonanie audytu z 2026-09-05)

Last verified: lokalny stan roboczy pięciu repo, 2026-09-05 | 2026-09-05

Zakres był lokalny: nic nie zostało scommitowane, wypchnięte ani wdrożone. Wszystkie zmiany leżą w drzewach roboczych (`git status` w każdym repo). Żadnej transakcji, żadnego keepera z prawdziwym kluczem. Produkcji dotknąłem tylko odczytami: `cast code` i trzy `cast call` na kontrakt Faces przez publiczny RPC oraz jeden `curl -I` obrazka.

## Bramki

| Repo | `bun test` przed | po | `tsc` | `forge test` | `git diff --check` |
|---|---|---|---|---|---|
| onenft-hub | 9/9 | **18/18** | czysty (nowy `tsconfig.json`, skrypt `typecheck`) | brak kontraktów | czysty |
| onenft-faces | 18/18 | **50/50** | czysty (nowy `tsconfig.json`; 3 błędy sprzed audytu naprawione: `cli.ts`, `sprites.ts`, `faces.ts`) | **31/31** (8 nowych) | czysty |
| onenft (Knot) | 58/58 | **74/74** | czysty | 19/19 bez zmian | czysty |
| onenft-blit | 49/49 | **70/70** | czysty (nowy) | bez zmian | czysty |
| onenft-chainrun | 45/45 | **66/66** | czysty (nowy) | bez zmian | czysty |

Razem 278 testów Bun (było 179). Każdy naprawiony błąd ma regresję, która na starym kodzie padała (stare asercje na „taken by", „nobody came", `hidden` bez CSS, `%ZZ` itd. zostały zamienione, nie usunięte).

## P1. Bezpieczeństwo, transakcje, awarie

### 1. Escape HTML i poprawne adresy w linkach (zamknięte)

- **Faces, Blit, Chain Run**: `<title>`, `og:title`, `canonical`/`og:url` przechodzą przez `esc()`; `ens.ts` z Knot (whitelist `safeName` ENSIP-15) skopiowany do wszystkich trzech. Regresja: `site.test.ts` „hostile names cannot break the title" w każdym repo, plus `ens.test.ts`.
- **Etykieta ≠ cel linku**: `holderHref(addr)`/`ownerLink()` w każdej kolekcji; `dayPage` (Knot/Blit/Chain Run) i `facePage` (Faces) linkują pełny adres. Regresja: „owner links use the full address, never the short label".
- **Hub waliduje upstream pole po polu** (`state.ts`: `count`, `color`, `ownUrl` = https na hoście kolekcji, `address`, `ensName`, `stateWord`). `javascript:` w `href`, `NaN`, `String(undefined)` nie trafiają do HTML. Regresja: „upstream data is validated field by field".
- **ENS**: cache 5000 wpisów, 6 równoległych lookupów, max 40 na wywołanie, błąd cache'owany 60 s (nie mylony z „brak nazwy"), współdzielony in-flight. Strony przekazują tylko widocznych właścicieli (`namesFor(chain, only)`). Regresje w `ens.test.ts` (3 nowe).

### 2. Faces: reveal to nie potwierdzenie (zamknięte po stronie strony)

- `autoclaim.ts`: klasa `Keeper` z wstrzykiwanymi zależnościami. Stany: `no-keeper`, `rpc-down`, `none`, `waiting`, `sent`, `confirmed`, `unknown`, `failed`. `confirmed` tylko z receiptu `success` + zdarzenie `Rolled` dla właściwego walleta (`rolledTokenOf`), albo z logu `Rolled` filtrowanego po `to` (`tokenRolledBy`), nigdy z ostatniego elementu listy holdera.
- Wysyłki serializowane (jedna kolejka na współdzielone konto), równoczesne POST dla tego samego walleta współdzielą jedno wykonanie, powtórzony POST nie wysyła drugi raz. Timeout = `unknown`; resend dopiero gdy node nie zna transakcji (`transactionKnown`) albo receipt jest `reverted` i kontrakt wciąż ma commit; limit prób.
- Restart: pusty pending odzyskuje się z kontraktu (`revealBlockOf`, `lastRollEpoch`), test „restart".
- API: `GET /api/roll/<addr>` (raport), `POST /api/reveal/<addr>` (może wysłać), `/api/state.pending` z kontraktu, `left = max − total − pending`, `soldOut` liczy pending; stare `/api/can-roll` dalej działa (alias).
- Przeglądarka (`builderScript`): maszyna stanów, snapshot pinów i ceny przy kliknięciu, galeria zablokowana do rozstrzygnięcia, zapis `onenft_roll:<chain>:<contract>:<account>` (etap, hash, epoka; bez kluczy), wznowienie po odświeżeniu, sukces = tokenId z keepera, „Check status" zamiast resendu, ręczny reveal z portfela tylko gdy keeper nie działa. Sold out to osobny komunikat. Testy: `autoclaim.test.ts` (10, w tym 20 równoczesnych POST → 1 wysyłka), `site.test.ts` (asercje na skrypt).
- Rzeczywisty flow z portfelem NIE był testowany end-to-end (brak testnetu w tym zadaniu); testy pokrywają logikę keepera i strukturę skryptu.

### 3. Faces: reguły losowania kontraktu (osobny raport, blokada)

`onenft-faces/docs/REVEAL_WINDOW.md` + `contracts/test/RevealWindow.t.sol` (8 testów, wszystkie zielone). Potwierdzone lokalnie: reveal w bloku B+1 czyta `blockhash` = 0; B+2…B+257 prawdziwy hash; od B+258 znowu 0; tokenId w seedzie zależy od kolejności reveali; od B+2 seed jest policzalny przed wysłaniem reveala; losowanie 1/1 idzie przy pinach. Wdrożony bytecode (`0x3774…1752`, Base mainnet) jest bajt w bajt równy lokalnemu buildowi poza 256 bajtami immutables (metadane też zgodne), więc ustalenie dotyczy kontraktu na żywo. Stan przy odczycie: `totalSupply` 2, `pending` 0. Kontrakt jest niezmienialny; opcje (zaakceptować i opisać, nowy kontrakt bez tokenId w seedzie, reveal od B+2 z wygasaniem) są w raporcie jako decyzja Pawła. Strona przestała obiecywać „nobody can peek".

### 4. Start i obrazy bez RPC (zamknięte)

- Wspólny `swr.ts` (stale-while-revalidate: świeże → od razu; stare → od razu + jeden współdzielony refresh; brak wartości → czekanie tylko do deadline 2,5 s; backoff 3 s → 60 s; status z wiekiem, błąd bez URL-i). Testy `swr.test.ts` (5) w każdym repo.
- `contract.ts` w czterech kolekcjach na `Swr`; boot nie `await`uje chaina; `/health` = liveness bez RPC, `/ready` = readiness JSON (503 tylko gdy skonfigurowany kontrakt nigdy nie odczytany). Trasy bez chaina (spec, obrazy dni, items, preview, `/how`, `/go`) odpowiadają przed jakimkolwiek odczytem.
- Stany: `unknown` (nigdy nie „gap"/„0"), `stale` z notatką „Collection status could not be refreshed. Showing data from HH:MM UTC.", `known`. W API blok `chain` w każdej odpowiedzi. Faces przy braku danych pokazuje `?`, nie „0 of 10,000", i nie „Nobody has rolled yet". `startEpoch` synchronizowany przy każdym udanym odczycie, nie tylko na boot; dzień zawsze z zegara (Blit/Chain Run brały dzień z cache).
- Faces: odczyt jest atomowy (błąd RPC w multicallu wywala cały refresh, `revert` = brak tokena); holder/face przy braku danych = 503, nie 404.
- Testy procesowe `server.test.ts` (5 repo): martwy RPC → boot, `/health`, obrazy i spec w <1,5 s, `/ready` 503, holder 503 HTML i JSON, 404 JSON dla `/api/*`; zawieszony RPC → 20 równoczesnych wejść ≤ 2 odczyty RPC, strona ≤ deadline; bez kontraktu → „opens today". Hub: 1 dobry + 1 zawieszony + 1 śmieciowy + 1 martwy upstream.
- Obrazki „dzisiejsze" (`/day/N.png`, `/day/N-1024.png`) cache 5 min: p95 pod 20 równoległymi spadło z 3272 ms do 1,0 ms.

## P2. Nawigacja i przepływy

### 5. Breadcrumb (zamknięte)

`<nav aria-label="Breadcrumb"><ol>` w każdej kolekcji: `onenft.click / Faces / Face #12`, `aria-current="page"`, separatory `aria-hidden`. Na mobile w jednej linii (desktop: kolumna w sidebarze). Menu ujednolicone: Explore/Rarity, Traits/One of ones, Assets, How it works, Your wallet, All collections. Hub ma własny breadcrumb `onenft.click / Your wallet`. Przekierowania root huba nie zmienione (test).

### 6. `/yours` i portfel (zamknięte, z zastrzeżeniem)

- Faces: nowa strona `/yours` (+ `/go`), holder z belką pobierania SVG/PNG/JPEG i wyborem rozmiaru, jak w daily. Martwy link z huba zniknął.
- Formularze: `<label>`, przykład `0x1234… or name.eth`, „View wallet", `pattern`; zły input wraca na `/yours?bad=…` z komunikatem (esc), także w hubie (`/wallet?bad=`).
- `connectScript`: `accountsChanged`, `disconnect`, 4001, -32002 (pending), pusta lista; „No wallet detected. Enter a public address to browse, or open this site in your wallet's browser to connect."; oznaczenia „yours" przeliczane przy zmianie konta.
- Hub: „Found N tokens in A of B collections. X could not be checked.", per-kolekcja last-good z wiekiem + „Try again", `/wallet/%ZZ` → 302 z `bad`, `/api/wallet/%ZZ.json` → 400 JSON, 503 JSON gdy żadna kolekcja nie odpowiedziała; canonical i `og:url` per strona, `noindex` + `robots.txt Disallow: /wallet/` (decyzja: adresów nie indeksujemy).
- **Nie zrobione**: WalletConnect/mobilny connector (wymaga project ID i zależności; copy kieruje do przeglądarki portfela).

### 7. Północ, powrót do karty, aktywna transakcja (zamknięte)

`location.reload()` usunięty ze wszystkich pięciu stron; zamiast tego `#newday` „A new UTC day has started. Refresh to see it." z przyciskiem, przeliczenie przy `visibilitychange`. Faces trzyma draft pinów w `onenft_pins:<contract>` ze stemplem cen (zmiana cen odrzuca draft). Po wysłaniu hasha zawsze „View transaction" + „Check status".

## Copy (P2)

Rejestr zmian (before → after, wszystkie po angielsku, bez półpauz):

| Miejsce | Było | Jest |
|---|---|---|
| Hub H1 / lead | „One a day, on chain, forever." / „N collections live here…" | „On-chain art, one day at a time." / „Explore 4 collections on Base. Knot, Blit and Chain Run offer one token per UTC day. Faces lets each wallet roll once a day, while supply remains." (liczba generowana) |
| Hub karta Faces | „Pin up to three things for a small fee" | „Leave all traits to chance, or pin up to 12 traits and colours for a fee that starts at 0.0005 ETH and doubles with every pin, up to 1.024 ETH. Rare and legendary traits cannot be pinned. The collection ends at 10,000 faces." (stałe `FACES_*` w `collections.ts`, test porównuje je z `spec.json` Faces) |
| Hub „The format" | „no file can go missing", „Everything is CC0", „token contract is the same in every collection" | „The image and its rules live on chain; this site and the collection sites only show them, and they need a working chain connection to do so.", „Images are CC0. Each site's assets page says what else is…", „The daily collections share one token contract…; Faces has its own contract and its own rules… Its API differs too." |
| Hub CTA | „Open faces.onenft.click" + „Newest face" | „Explore Faces" (host jako podpis) + „Face #12, the one above" (link zgodny z miniaturą); status i „Updated N ago" per karta |
| Faces lead | „Every wallet rolls one face a day, free… Rare things cannot be bought." | „Roll one face per wallet each UTC day. Leave every trait to chance, or pin up to 12 traits and colours for a fee." + w hint „Rare and legendary traits cannot be pinned" |
| Faces CTA | „Roll for free" | „Roll a face" / „Roll with N pins"; „0 ETH mint fee. You pay network gas." / „Pin fee 0.002 ETH plus network gas." |
| Faces pin help | brak | „A pin fixes one trait or colour to a common or uncommon item; the first pin costs 0.0005 ETH and each additional pin doubles the total pin fee, up to 1.024 ETH for 12; network gas is extra" (`pinRule()` z `PIN_PRICES_WEI`/`MAX_PINS`, użyte na home, `/how`, `spec.json`) |
| Faces `spec.json.rule` | „up to three pins" | generowany z `pinRule()`; `oneOfOneOdds` „per roll, with or without pins; a one of one keeps the pinned background and ground colour and replaces every other pin" |
| Faces `/how` | „so nobody can peek and retry", „one block later" | opis seedu zgodny z kontraktem (zero hash w B+1 i po 256 blokach, tokenId zależny od kolejności), „the site does not claim more than the contract gives"; „Any roll, pinned or not, takes one…; the pin fee is not returned" |
| Faces wiersze / strona twarzy | „rolled by" z `ownerOf` | „held by X" z `ownerOf`; „Rolled by Y" tylko z eventu `Rolled` (osobno gdy różne); „held by the treasury" vs „the treasury's daily roll" |
| Faces 1/1 na stronie twarzy | brak | „A one of one is a full drawing. It kept the pinned background and ground colour, if any, and replaced every other pin." |
| Faces „u" i „1/1" | tylko litera | rarity: „Tier "u" in the builder marks an uncommon item… "1/1": a drawing that exists once"; `title="uncommon"` na markerze |
| Daily stany dnia | „still nobody's / taken by / nobody came, the gap stays" | „Available today / Claimed, held by X / Reserved for the author / Unclaimed day / Status unavailable"; gap: „This day ended without a claim. It can no longer be minted." (`dayState()` + `STATE_TEXT`) |
| Daily lead dnia | „The contract tied this knot at midnight UTC" | „Day N, DATE UTC. The day number alone determines this knot. The next day starts in …" |
| Daily „no server" | „The image lives in the contract, not on a server." | „The image and its rules live in the contract. This site only shows them." |
| Daily `/how` | brak sekcji o claimie | „Claiming a day": 0 ETH mint fee, gas, tenth day, „Nothing mints by itself at midnight" |
| `/yours` (4 strony) | „Nothing is sent anywhere." | „Viewing a wallet needs no transaction and no signature. Its public address appears in the page URL and is sent to this site to load its tokens… each site connects on its own." |
| `/assets` licencje | „Everything here is CC0: … this site" | obrazy/generator/kontrakty/tekst CC0; „The site's code in the repository carries its own license file; the fonts Syne and Newsreader are under the SIL Open Font License; the libraries… keep their own licenses." (bez relicencjonowania kodu) |
| Transakcje | „Sent. Waiting for the network." | „Transaction sent. Waiting for confirmation." + „View transaction"; „Your roll is committed. Waiting for the reveal."; „We cannot confirm the transaction yet. Check its status before trying again."; „Your roll is committed, but the reveal service is unavailable. Check again." |
| RSS/ICS | „The contract tied today's knot… Claim it, free, gas only" | „A new day, a new knot. Claim it before midnight UTC. 0 ETH mint fee, network gas only" |
| Faces „Every wallet rolls" | | „One roll per wallet each UTC day while supply remains." + „Sold out. Every face has been rolled or is being revealed." (liczy pending) |

## UI, mobile, dostępność (P2)

- **Hierarchia mobile** (390×844, weryfikowane w Chrome przez same-origin iframe, bo okno Chrome nie schodzi poniżej ~500 px; to nie jest fizyczny telefon): sidebar = breadcrumb + H1 + jedno zdanie; grafika zaczyna się na 293 px (Knot 390), 329 px (Faces preview), 431 px (hub, cała grafika w viewporcie); licznik dni/CTA obok grafiki, menu pod sekcją. Brak poziomego overflow przy 320/390/430 (scrollWidth ≤ viewport). H1 „continuous" nie łamie liter (`overflow-wrap:normal`, 29 px przy ≤360 px).
- **Faces builder**: grupy jako `<details open>` z `role="group" aria-labelledby`, przyciski `aria-pressed` + `aria-label="Pin X"`, podpis „Pinned: X / Luck decides" per grupa (`aria-live`), pasek kategorii z kotwicami, na mobile tylko pierwsza grupa otwarta. Sticky stage na mobile = 248 px (było 432 po pierwszej wersji; pierwotnie preview + pusty obszar): preview 120 px | podsumowanie pinów, cena, CTA, opłata. Zweryfikowane w przeglądarce: sticky działa po przewinięciu, `Clear pins` ma `display:none` przy 0 pinach (computed style, nie atrybut) dzięki `[hidden]{display:none!important}` w każdym repo (ten sam błąd ukrywał `#newday` w Knot). Błąd preview: jedna próba ponowienia, potem komunikat, piny zostają.
- **Kontrast**: `textFor()` (ink dociągany do czerni/bieli do 4.5:1), `mutedFor()` (4.5:1), `edgeFor()` (3:1 dla obramowań inputów/kontrolek). Testy: Knot 1100 dni, Blit/Chain Run 400 dni, Faces wszystkie 16 ground, hub 4 pary w tym szare na szarym. Obrazy NFT nietknięte.
- **A11y**: skip link, `id="main"`, `aria-live` na komunikatach, `focus-visible` także dla `input`/`summary`, cele dotykowe ≥44 px dla linków menu, breadcrumbów, przycisków pobierania (hub: było 30 px) i rozmiarów.
- **Pobieranie**: prefiksy `knot-day-N`, `blit-day-N`, `chainrun-day-N`, `faces-face-N`; bez JS „PNG" prowadzi do prawdziwego `/…/N-1024.png` (resvg, pixel art bez wygładzania), „JPEG" ukryty bez JS z `<noscript>`; skrypt: jeden download naraz, `AbortController` 20 s, timeout rysowania/enkodowania, `decode()`, `toBlob(null)` obsłużony, sprzątanie object URL, `aria-busy`, etykiety „Download PNG of Face #12".

## Wydajność (lokalnie, warm cache, 60 próbek, 20 równoległych, bez kontraktu)

| Strona | p50 ms | p95 ms | bajty |
|---|---|---|---|
| Knot home | 3.4 | 5.2 | 20,556 |
| Knot `/day/1.svg` | 0.6 | 1.1 | 4,081 |
| Knot `/day/1-1024.png` (dzisiejszy) | 1646.7 → **0.7** | 3272.3 → **1.0** | 84,142 |
| Knot `/api/summary` | 1.0 | 2.0 | 1,207 |
| Blit home | 3.9 | 6.9 | 23,488 |
| Chain Run home | 9.6 | 13.8 | 34,797 |
| Faces home | 4.4 | 7.9 | 70,320 |
| Faces preview / item | 2.4 / 1.6 | 5.1 / 3.7 | |
| Hub home / `/wallet` | 4.1 / 1.0 | 5.1 / 1.3 | 16,952 / 12,872 |

`/api/days` przy 365 dniach: 157,604 B; przy 1000 dniach: 431,726 B. Nowy `/api/summary`: ~1,2 KB. Hub czyta `summary` i cofa się do `days` dla strony bez niego. Budżet „warm p95 <200 ms przy 20" spełniony lokalnie; to nie są Core Web Vitals ani pomiar produkcji. LCP/CLS/INP na profilu mobilnym nie mierzyłem.

## Nieprzetestowane / rzeczywiste blokady

1. **Kontrakt Faces** (pkt 3): niezmienialny; wybór między akceptacją a nowym kontraktem należy do Pawła. Strona i keeper są bezpieczniejsze, ale nie usuwają właściwości publicznej funkcji `reveal`.
2. **Prawdziwy portfel**: flow commit/reveal, `accountsChanged`, replacement tx i odmowa sieci nie były wykonane z żywym portfelem ani na Sepolii; pokryte fake-deps (keeper) i asercjami na skrypt. Anvil nie był potrzebny do testów jednostkowych; Foundry pokrywa granice bloków.
3. **Mobile**: podgląd przez iframe w Chrome desktop; brak fizycznego telefonu, 200% zoom i czytnika ekranu nie sprawdzałem ręcznie.
4. **Cold boot Faces przy 10,000 twarzach**: nie mierzone (brak fixture chaina); `refreshFaces` dalej dociąga brakujące rekordy po 500 w multicallu; paginacja holdera/galerii nie zrobiona.
5. **CSP**: nie dodałem (wymagałoby listy hostów fontów/analityki/RPC i etapu report-only na stagingu); dodane `x-content-type-options`, `referrer-policy`, `x-frame-options` w Faces, Blit, Chain Run i hubie (Knot miał).
6. **`/api/state.palette`**: Faces nie zwraca kolorów strony; hub bierze paletę z Knot jak dotąd.
7. Lokalne fonty zamiast Google Fonts: nie zmienione, bez pomiaru waterfallu.
8. Hub przy braku odpowiedzi jednej kolekcji w JSON `api/collections.json` zwraca `today: null` i `hub.known:false`; konsumenci zewnętrzni powinni to uwzględnić (kompatybilne rozszerzenie, stare pola zostały).

## Pliki

- Wspólne nowe: `src/swr.ts`, `src/swr.test.ts`, `src/server.test.ts` (5 repo); `src/ens.test.ts` (Faces, Blit, Chain Run); `tsconfig.json` (Faces, Blit, Chain Run, hub).
- Faces: `contracts/test/RevealWindow.t.sol`, `docs/REVEAL_WINDOW.md`.
- Zrzuty: `Plans/screens/hub-after-390-320-wallet.jpg`, `Plans/screens/faces-after-390-sticky.jpg` (przed: opis w audycie; nie mam zrzutów sprzed zmian z tej sesji).
- `Plans/` w Knot był nieśledzony przed audytem i pozostaje nieśledzony.
