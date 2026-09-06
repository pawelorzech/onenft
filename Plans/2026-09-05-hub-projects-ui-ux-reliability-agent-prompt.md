# Prompt dla agenta: popraw UI/UX, copy i niezawodność onenft.click

Pracuj na `master` w istniejących repozytoriach. Wykonaj poniższe poprawki, dodaj testy regresyjne, sprawdź strony w przeglądarce i przedstaw wyniki. To jest specyfikacja wykonawcza na podstawie audytu z 5 września 2026, a nie polecenie ponownego napisania ogólnych rekomendacji.

## Zakres i ograniczenia

Repozytoria pod `/Users/pawelorzech/Programowanie/`:

| Repo | Strona | HEAD podczas audytu | Testy Bun |
|---|---|---|---|
| `onenft-hub` | https://onenft.click | `c178a1c` | 9/9 |
| `onenft-faces` | https://faces.onenft.click | `8a3678a` | 18/18 |
| `onenft` | https://knot.onenft.click | `4c5c3c1` | 58/58 |
| `onenft-blit` | https://blit.onenft.click | `49ba965` | 49/49 |
| `onenft-chainrun` | https://chainrun.onenft.click | `529d993` | 45/45 |

Wszystkie były na `master`. `onenft` miało 5 lokalnych commitów ponad `origin/master` i istniejące nieśledzone `Plans/`. Zachowaj cudzą pracę. Sprawdź stan przed edycją; nie rób resetu ani czyszczenia. Czytaj aktualne instrukcje repo. Używaj Bun, TypeScript i Foundry. Nie zmieniaj wygenerowanych obrazów, historycznych rendererów, tokenów ani danych źródłowych grafik w ramach zmian UI.

Zachowaj charakter stron: Syne + Newsreader, kolory pochodzące z grafiki, ostre narożniki, cienkie linie, pixel art bez rozmycia. Faces pozostaje pierwsze na hubie. Nie dodawaj przełącznika light/dark ani frameworka bez mierzalnej potrzeby. Teksty publiczne po angielsku; raport dla Pawła po polsku.

Zakres wykonania jest lokalny. Nie commituj, nie pushuj, nie publikuj na GitHub, nie wdrażaj, nie zmieniaj konfiguracji produkcji, nie uruchamiaj transakcji na mainnet ani keepera z prawdziwym kluczem bez osobnego polecenia. Do testów używaj fake providerów i lokalnego Anvil. Kwestie wymagające zmiany wdrożonego kontraktu wydziel jako blokadę, nie próbuj naprawiać ich samą zmianą strony. Nie używaj Interceptora.

## Co zostało rzeczywiście sprawdzone

- Kod routingu, szablonów HTML/CSS, skryptów portfela, agregacji huba, RPC, ENS, keepera i wybranych reguł kontraktu Faces we wszystkich pięciu repo.
- Produkcyjne HTML głównych stron, Faces `/how`, `/api/state` oraz `/yours`. Ostatnia trasa zwraca **404**, mimo że prowadzi do niej hub.
- Safari: desktop huba i Faces; wybór jednego pina bez uruchamiania płatności; widoki 390×844 Faces, Knot, Blit, Chain Run oraz hub `/wallet`. To podgląd responsywny Safari, nie fizyczny telefon z portfelem.
- Wszystkie istniejące testy Bun: **179 pass, 0 fail**. `onenft`: także `bun run typecheck` bez błędów. Nie uruchamiano pełnego audytu Foundry ani rzeczywistych transakcji.
- Osobne procesy Faces, Blit i Chain Run, z `BASE_RPC_URL=http://127.0.0.1:9`, syntetycznym adresem kontraktu i bez `DEPLOYER_KEY`: każdy zakończył start kodem **1** po błędzie odczytu kontraktu. Testy jednostkowe tego nie wykrywają.
- Lokalny probe `layout()` wykazał surowe wstawienie `</title><script>audit_marker()</script>` w Faces, Blit i Chain Run. Nie wykonywano ataku przez rekord ENS na produkcji. Kod ENS przepuszcza nazwy do tych szablonów; potraktuj ścieżkę jako istotną podatność do zamknięcia i regresji.
- Hub `handle(new Request('http://localhost/wallet/%ZZ'))` rzuca nieobsłużony `URIError`.

Pojedyncze odczyty HTTP, bez obciążania produkcji:

| Strona | HTTP | TTFB | Cały transfer HTML | HTML |
|---|---|---|---|---|
| Hub | 200 | 115 ms | 140 ms | 14 285 B |
| Faces | 200 | 437 ms | 498 ms | 46 546 B |
| Knot | 200 | 286 ms | 316 ms | 19 835 B |
| Blit | 200 | 272 ms | 307 ms | 22 827 B |
| Chain Run | 200 | 164 ms | 198 ms | 34 111 B |

To nie są Core Web Vitals, percentyle ani dowód odporności na awarie. Nie sprzedawaj tych pomiarów jako pełnego testu wydajności.

## Kolejność realizacji

1. Zamknij ryzyka bezpieczeństwa i błędnego sukcesu transakcji; odseparuj problem wdrożonego kontraktu Faces.
2. Napraw startup/RPC, stany nieaktualnych danych i odzyskiwanie transakcji.
3. Napraw breadcrumb, niedziałające linki i sprzeczne informacje.
4. Popraw mobilną hierarchię, kreator, kontrast, formularze i pobieranie.
5. Wykonaj pełną macierz regresji oraz pomiary przed/po; podaj ograniczenia.

## P1. Bezpieczeństwo, transakcje i awarie

### 1. Escape HTML i poprawne adresy w linkach

Pliki: `src/ens.ts`, `src/site.ts`, `src/pages.ts` w kolekcjach; `src/state.ts` i `src/site.ts` huba.

- Faces, Blit i Chain Run mają nieescapowane `<title>`, `og:title` oraz fragmenty z nazwą ENS. Przenieś odpowiednie zabezpieczenia już istniejące w Knot, ale sprawdź wszystkie konteksty: tekst, atrybut, URL, RSS, JSON osadzony w skrypcie. Nie polegaj wyłącznie na filtrowaniu nazwy przy pobraniu. Nie odrzucaj poprawnych nazw bez potrzeby; jeśli ich nie obsługujesz, pokaż adres.
- Oddziel **etykietę** właściciela od **celu linku**. `dayPage` także w Knot używa `href="/${label(o, names)}"`; bez ENS `label` zwraca skrót `0x…`, który nie jest poprawną trasą portfela. Faces ma analogiczny błąd w `facePage`. URL buduj z pełnego adresu; skrót jest tylko tekstem.
- W hubie waliduj schematy danych upstream: dozwolone stany, nieujemne skończone liczby, kolory `#RRGGBB`, URL HTTPS na oczekiwanym hoście kolekcji. `String(undefined)` i `NaN` nie są poprawnymi fallbackami. Escape nie blokuje `javascript:` w `href`.
- Ogranicz cache i współbieżność ENS. Nie rób lookupu wszystkich historycznych właścicieli na każdą stronę. Błąd ENS ma dawać adres, bez blokowania obrazu ani mylenia timeoutu z nieistniejącą nazwą.

Odbiór: hostile-name fixtures nie tworzą tagów/atrybutów; pełny adres bez ENS otwiera poprawny holder; nazwa z Unicode ma bezpieczne zachowanie; wadliwy JSON upstream nie trafia do HTML jako aktywny URL ani fikcyjne zero.

### 2. Faces: wysłanie reveal nie oznacza potwierdzenia

Pliki: `onenft-faces/src/autoclaim.ts`, `server.ts`, `site.ts`, `contract.ts`.

Obecnie `revealFor()` zwraca hash po `writeContract`, usuwa wallet z `unrevealed`, a API ustawia `revealed: Boolean(hash)`. Browser mówi „Revealed” i po arbitralnych 3 sekundach wybiera ostatnią twarz z holder API. To może pokazać stary token, błędny sukces lub zgubić wznowienie.

- Zdefiniuj rozłączne stany: gotowy, potwierdzenie portfela, commit wysłany, commit potwierdzony, oczekiwanie na reveal, reveal wysłany, reveal potwierdzony, oczekiwanie na indeksowanie, sukces, błąd, nieznany wynik.
- Sukces dopiero po receipt ze statusem sukcesu. Token ID bierz ze zdarzenia `Rolled` właściwej transakcji/walleta, nie z ostatniego elementu listy właściciela. Rozróżniaj autora rolla i obecnego holdera.
- Keeper musi śledzić wysłane hashe do rozstrzygnięcia. Zabezpiecz równoczesny POST i tick, powtórzone POST oraz nonce współdzielonego konta. Usuwaj pending dopiero po potwierdzeniu albo wiarygodnym odczycie stanu.
- Timeout oznacza nieznany wynik, nie automatyczną zgodę na ponowne wysłanie. Przed retry sprawdź receipt i stan kontraktu. Dodaj ograniczone timeouty HTTP/pollingu, backoff i czytelne „Check status”. Nie loguj surowych sekretów ani konfiguracji RPC.
- Po odświeżeniu, powrocie do karty i restarcie serwera odzyskaj operację. Minimalny lokalny zapis identyfikuj przez chainId + contract + account; hash i etap, bez kluczy. Traktuj zapis jako wskazówkę do odczytu z chaina. Nie uruchamiaj nowej płatności automatycznie.
- Brak keepera, brak środków keepera, 503, zerwane połączenie i lag indeksowania mają osobne komunikaty. Manual reveal może być świadomą akcją portfela z informacją o gas; nigdy samoczynną kolejną transakcją.
- API `pending` odczytuj z kontraktu albo jasno nazwij jako niepełny stan skanera. Obecnie to rozmiar `unrevealed`, nie `pending()`; licznik potrafi być zaniżony. Wolne miejsca licz z `totalSupply + pending`.

Odbiór: opóźniony/reverted receipt nie pokazuje sukcesu; wielokrotny POST nie wysyła duplikatów; keeper crash/restart wraca do oczekującej operacji; holder API ze starą odpowiedzią nie kieruje do starej twarzy; sold out nie jest komunikatem „You rolled today”.

### 3. Faces: osobny problem reguł losowania kontraktu

`contracts/src/OneNFT.sol:168` pozwala na reveal w bloku `commitBlock + 1`, a seed używa `blockhash(commitBlock + 1)`. Hash bieżącego bloku jest zerowy. Komentarz opisuje też zerowy hash po wyjściu poza okno 256 bloków. Jest więc niespójność między kodem a obietnicą na `/how`, że następny blok wybiera twarz i nikt nie może podejrzeć wyniku. Seed zawiera również token ID zależny od kolejności reveal.

To ustalenie z lokalnego źródła, nie pełny audyt bytecode wdrożonego kontraktu ani dowiedziony atak na produkcję. Napisz lokalne testy Foundry dla granic `B`, `B+1`, `B+2`, ostatniego dostępnego hasha i okresu po nim. Sprawdź wpływ kolejności reveal. Zweryfikuj zgodność źródła z wdrożeniem odczytem, bez transakcji. Przedstaw wpływ i możliwe rozwiązania jako osobny raport. Samo opóźnienie keepera nie naprawi publicznej funkcji kontraktu. Nie obiecuj „fair”/„cannot peek” bez dowodu; nie zmieniaj i nie wdrażaj kontraktu pod pozorem poprawki UX.

### 4. Start strony i wszystkie obrazy nie mogą zależeć od RPC

Pliki: `src/server.ts`, `src/contract.ts`, `src/ens.ts` kolekcji.

- Faces, Blit i Chain Run mają nieobsłużone `await chainState()` przed `Bun.serve`. Potwierdzony exit 1 przy dead RPC. Zapewnij start serwera i rendererowych tras podczas awarii; Knot ma częściową poprawkę, wykorzystaj ją świadomie.
- Wszystkie kolekcje odczytują chain przed rozpoznaniem większości tras. Nawet `/health`, obraz elementu Faces lub statyczna instrukcja czeka na RPC. Trasuj zasoby niezależne od chaina wcześniej. Renderowanie zapisanego tokena ma używać poprawnego przypisanego renderera/cache; nie podstawiaj nowej twarzy ani 404, gdy RPC nie odpowiada.
- Dodaj współdzielenie trwającego odczytu, jawne deadline i kontrolowany fallback RPC. Nie uruchamiaj N identycznych multicall przy N żądaniach po TTL. Serwuj last-good z informacją o wieku; odświeżaj w tle. Nie resetuj wieku danych na nieudanym odczycie.
- Rozróżniaj: kontrakt nie skonfigurowany, świeże dane, stare dane, brak danych podczas awarii. Faces dziś po awarii potrafi pokazać supply 0 i „Rolling opens with the contract”, a API zwraca zdrowo wyglądające zero. Brak danych nigdy nie oznacza „nobody rolled”, „gap” ani pustego walleta.
- Knot: `offline = contractEnabled() && !chain` nie wykrywa zwróconego `lastGood`. Blit/Chain Run też mają last-good bez metadanych świeżości. Propaguj stan do home, dnia, holdera, API i huba; nie pokazuj pewnego „Available” na podstawie starego stanu.
- Rozdziel liveness od readiness/dependency status; nie twórz restart loopa tylko dlatego, że zewnętrzny RPC padł. Diagnostyka ma pokazywać wiek ostatniego sukcesu, stale count i lag skanera bez URL-i z kluczami.
- Zegar UTC obliczaj z aktualnego czasu. Przy recovery zsynchronizuj `startEpoch` z konfiguracją/kontraktem; obecnie Knot robi to tylko w boot path. Nie używaj wczorajszego cached `day` jako dzisiaj.

Odbiór: cold boot offline działa, `/health` i statyczne zasoby odpowiadają bez oczekiwania na RPC; stany własności są „unknown/stale”; recovery bez restartu; 20 równoczesnych lokalnych odczytów dzieli jeden refresh; awaria jednego upstreamu nie blokuje innych kolekcji.

## P2. Nawigacja i przepływy

### 5. Breadcrumb wszędzie, szczególnie Faces

Pliki: Faces `site.ts:topBar`, `homePage`, `pages.ts`; odpowiedniki `crumb()` w pozostałych kolekcjach.

- Faces ma u góry tylko link do samego siebie; hub jest dopiero w footerze. Dodaj widoczny breadcrumb wzorowany na Blit, ale semantyczny: `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`. `onenft.click` → `Faces` → bieżąca strona/token; bieżący element z `aria-current="page"`, dekoracyjne separatory ukryte dla AT.
- Na home wystarczą hub i nazwa kolekcji. Na podstronach także sensowna etykieta bieżącej strony. Hub osiągalny bez przewijania na desktopie i 320–430 px. Wszystkie zwykłe podstrony i 404 mają ten sam wzór; embed zachowuje swój kompaktowy charakter i poprawny target do wyjścia.
- Ujednolić etykiety: „All collections”, „Your wallet”, „How it works”, „Traits”/„Rarity” zgodnie z znaczeniem. Dodać „All collections” także do menu Faces.
- Zachować stare przekierowania root huba do Knot z path/query; nie przejmować przez hub `/how`, `/day/*`, `/feed.xml` itd.

### 6. Faces `/yours` i wallet całego ekosystemu

Hub linkuje do `https://faces.onenft.click/yours` w kilku miejscach; produkcja zwraca 404. Dodaj rzeczywistą stronę `/yours` z connect/read-only lookup + formularzem `/go`, zgodną z pozostałymi kolekcjami. Alternatywa architektoniczna jest dopuszczalna tylko jeśli usuwa wszystkie martwe linki i zachowuje łatwe odnalezienie własnych Faces.

- Daj widoczny label formularza, przykład ENS/adresu, „View wallet” zamiast „Show”. Błędny input zostaje w formularzu z konkretną informacją, nie robi niemego redirectu.
- Gdy nie ma portfela, wpisanie publicznego adresu pozostaje używalne. Komunikat wyjaśnia co zrobić w wallet browserze na telefonie. Docelowe połączenie mobilne wdrażaj na uzasadnionym, przetestowanym connectorze; brak project ID nie blokuje browse ani wklejenia adresu.
- Obsłuż `accountsChanged`, `chainChanged`, `disconnect`, odmowę 4001, request pending, pustą listę kont. Zmiana konta czyści oznaczenia „yours” i przelicza uprawnienia. Nie przenosi operacji konta A do B.
- Połączenie portfela jest osobne dla originów/subdomen. Nie obiecuj, że hub automatycznie połączy portfel z każdą stroną. Samo oglądanie walleta nie wymaga podpisu/transakcji.
- Jeśli część kolekcji nie odpowiada, suma na hubie ma być „N tokens found in 3 of 4 collections”, nie „Every token” i pozornie pełne 0. Pokaż retry przy danej sekcji. Stary poprawny wynik można zachować z datą.
- Obsłuż wadliwe percent-encoding (`/wallet/%ZZ`) i błędny format API jako kontrolowane 400 JSON. Missing != unavailable: 404 dla nieistniejącego zasobu, 503 dla niedostępnego odczytu, nigdy HTML udający JSON.
- Popraw canonical i `og:url` walletów huba; teraz layout wskazuje root dla wszystkich stron. Zdecyduj o indeksowaniu adresów świadomie, bez automatycznego ujawniania większej ilości danych.

### 7. Midnight, powrót do karty i aktywna transakcja

W kolekcjach COUNTDOWN wykonuje `location.reload()` po upływie czasu. Faces traci nieutrwalone piny; inne strony tracą kontekst, a polling transakcji może zostać przerwany.

- Nowy dzień pokaż jako „A new UTC day has started. Refresh to see it.” z akcją. Nie reloaduj strony podczas aktywnego flow. Przy powrocie do karty przelicz czas i stan z chaina, nie kontynuuj starego licznika.
- Zachowaj draft pinów przez odświeżenie, o ile nadal są poprawne dla renderera; wykryj zmianę reguł/ceny. Odrzucone/stare wartości nie mogą zmienić kwoty w tle.
- Po wysłaniu hasha zawsze pozostaw działające „View transaction” i „Check status”. Nie zostawiaj permanentnie disabled przycisku bez dalszej drogi. Retry odczytu nie jest retry płatności.

## P2. Copy: popraw znaczenie, nie tylko styl

Zrób rejestr wszystkich tekstów user-facing: home, CTA, tooltipy, aria-label, placeholdery, zero/error/pending states, strony tokenów/holderów, `/how`, `/rarity`/`traits`, `/ones`, `/assets`, 404, meta/OG, RSS, opisy API i pliki download. Każdy wpis: aktualna treść, proponowana treść, źródło faktu, plik. Fakty liczbowe wyprowadzaj z danych/stałych zamiast duplikować w pięciu miejscach.

### 8. Obowiązkowe korekty faktów

| Problem | Poprawka |
|---|---|
| Hub `collections.ts`: „up to three”, „small fee” | Dwanaście pinów; jawna cena rosnąca wykładniczo. 1.024 ETH nie opisuj jako małej opłaty. |
| Faces `api.ts:specJson`: rule nadal mówi o trzech pinach | Generuj opis z `PIN_KEYS`, `MAX_PINS` i cen; test zgodności ze stroną i kontraktem. |
| Faces `/ones`, `/rarity`, `oneOfOneOdds` mówią „without pins” | Lokalny `OneNFT.reveal` losuje 1/1 niezależnie od pinów. Zweryfikuj wdrożenie, ujednolić copy i wyjaśnij wpływ 1/1 na płatne piny. Nie sugeruj gwarancji wyglądu, której kontrakt nie zapewnia. |
| Hub meta: każda kolekcja ma jeden token dziennie; hero „forever” | Rozróżnij trzy daily i Faces per-wallet z cap 10 000. Meta musi oddawać obie mechaniki. |
| „Every wallet rolls …” | „Each wallet can roll … while supply remains.” Uwzględnij pending i wykorzystany dzień. |
| „Roll for free” bez gas przy głównej decyzji | „Roll a face” + „0 ETH mint fee. You pay network gas.” Przy pinach pełna opłata w ETH + gas obok CTA. |
| „Rare things cannot be bought” | „Rare and legendary traits cannot be pinned.” Pierwsze zdanie jest mylące przy handlu wtórnym. |
| „Nothing is sent anywhere” na `/yours` daily | „Viewing a wallet needs no transaction. Its public address appears in the page URL and is sent to this site to load its tokens.” Dopasuj do faktycznej analityki/logów. |
| „Rolled by” z aktualnego `owners` | „Held by” dla holdera; „Rolled by” tylko z eventu roll. Tak samo status treasury nie wynika wyłącznie z obecnego właściciela. |
| „The contract drew … at midnight” | „This artwork is determined by the UTC day.” Nie sugeruj automatycznej transakcji ani mintu o północy. |
| „No server … no file can go missing” | Wyjaśnij, że renderer/metadata są on-chain, ale dostęp przez stronę nadal zależy od strony i RPC. Usuń absolutną obietnicę dostępności. |
| „Everything is CC0” vs README „Code: MIT” i licencje deps/fontów | Ustal rzeczywisty zakres licencji z plików. Nie relikencjonuj kodu w audycie. Osobno prawa do obrazów, kodu, materiałów źródłowych i fontów. |
| Hub: wszystkie kolekcje mają te same API i kontrakt | Opis daily dotyczy trzech kolekcji; Faces ma inne endpointy i kontrakt. „Three repos” doprecyzuj jako trzy daily przykłady. |

### 9. Proponowane brzmienie do wdrożenia i dopasowania do stanu

- Hub H1: **“On-chain art, one day at a time.”**
- Hub lead: **“Explore four collections on Base. Knot, Blit and Chain Run offer one token per UTC day. Faces lets each wallet roll once a day, while supply remains.”** Liczbę kolekcji generuj.
- Faces card: **“Roll one face per wallet each UTC day. Leave all traits to chance, or pin up to 12 traits and colours for an added fee. The collection ends at 10,000 faces.”**
- Pin help: **“A pin fixes one trait or colour. The first pin costs 0.0005 ETH. Each additional pin doubles the total pin fee, up to 1.024 ETH for 12. Network gas is extra.”** Dodaj wyjaśnienie wyjątku 1/1 po potwierdzeniu reguł.
- Daily availability: **“Available today”**, **“Claimed”**, **“Reserved for the author”**, **“Unclaimed day”**, **“Status unavailable”** jako osobne stany. „Gap” wyjaśnij: **“This day ended without a claim. It can no longer be minted.”**
- Transaction sent: **“Transaction sent. Waiting for confirmation.”** Link **“View transaction”**.
- Commit confirmed: **“Your roll is committed. Waiting for the reveal.”**
- Unknown receipt: **“We cannot confirm the transaction yet. Check its status before trying again.”**
- Keeper issue: **“Your roll is committed, but the reveal service is unavailable. Check again.”** Nie twierdź, że mint się nie powiódł.
- RPC stale: **“Collection status could not be refreshed. Showing data from {time}.”**
- Partial wallet: **“Found {count} tokens in {available} of {total} collections. {name} could not be checked.”**
- No injected wallet: **“No wallet detected. Enter a public address to browse, or open this site in your wallet’s browser to connect.”**

Zachowaj osobowość projektu w krótkich opisach. W akcjach, cenach i błędach używaj jednoznacznego języka. Szczegóły algorytmu, seed, tokenId, block.timestamp, wagi i API przenieś do „How it works”/„For developers”, zamiast obciążać pierwszy ekran. Wyjaśnij skróty „1/1” i „u”; samo oznaczenie literą nie wystarcza.

## P2. UI, mobile i dostępność

### 10. Najpierw grafika i decyzja, potem dokumentacja

Potwierdzone w Safari 390×844: home Faces, Knot, Blit i Chain Run pokazują najpierw długi sidebar; grafika nie mieści się na pierwszym ekranie. Knot dodatkowo łamie „continuous” na „continuou” i samotne „s”.

- Na mobile kolejność DOM/layout: breadcrumb → krótki tytuł i jedno zdanie → grafika/podgląd → stan i CTA z kosztem → pozostałe informacje. Nie rób wizualnego reorderu sprzecznego z kolejnością klawiatury.
- Desktop zachowuje artystyczny sidebar, ale skróć lead. Liczniki i linki techniczne są drugorzędne. H1 ma naturalne łamanie bez samotnych liter przy 320, 360, 390 i 430 px oraz 200% zoom.
- Hub: krótsze CTA „Explore Faces”, „Explore Knot”, itd. Nazwa hosta może być podpisem. Rozróżnij wejście do kolekcji i konkretnego tokena; nie dawaj dwóch równie mocnych akcji o praktycznie tym samym celu. Link do tokena musi odpowiadać temu, co pokazuje miniatura.
- Dodaj zwięzły status i datę aktualizacji bez przeciążania kart. Umożliwiaj przejście między kolekcjami i do walleta bez szukania footera.

### 11. Faces builder

- Galeria ma dwanaście grup i długi ciąg miniaturek. Dodaj czytelny wybór kategorii/rozwijane sekcje, zachowując łatwy dostęp do wszystkich. W mobile pokaż podgląd i zwięzłe podsumowanie wybranych pinów; CTA z ceną osiągalne po zmianie cechy.
- W Safari po przewinięciu mobilnego kreatora widać ucięty podgląd i duży pusty obszar przy `.stage`. Sprawdź sticky, wysokość i overflow; nie kopiuj obecnego sticky panelu bez testu 390×844 i powiększenia tekstu. Sticky nie może zajmować większości ekranu ani zakrywać fokusu.
- Wybrane elementy mają obecnie tylko klasę `.on`, bez stanu dostępnego dla czytnika. Dodaj `aria-pressed` albo poprawny model radio z odznaczeniem „Random”; każda grupa nazwana. Widoczne nazwy na dotyk, nie tylko `title`.
- Cena, preview i lista pinów aktualizują się spójnie. Snapshot pinów i ceny zamroź dla transakcji; edycja w trakcie promptu walleta nie może sugerować, że zmieni już wysłaną transakcję.
- `Clear pins` było widoczne przy zerowej liczbie pinów mimo `hidden`; reguła `.cta{display:flex}` nadpisuje oczekiwane ukrycie. Napraw kaskadę (`[hidden]` lub właściwy selektor) i testuj widoczność w browserze, nie sam atrybut.
- Obsłuż błąd preview, szybkie zmiany, offline, wolną odpowiedź. Nie chowaj błędów z powodu kolejnego `update()`.

### 12. Kontrast i formularze

Obliczone z produkcyjnych zmiennych CSS pobranych podczas audytu:

| Strona | `fg/bg` | `muted/bg` | `line/bg` |
|---|---|---|---|
| Hub | 13.27 | 5.72 | 1.57 |
| Faces | 9.05 | **3.77** | 1.45 |
| Knot | 13.27 | 5.72 | 1.57 |
| Blit | 8.53 | **3.55** | 1.37 |
| Chain Run | ~4.50 | **3.03** | 1.36 |

To bieżące palety, nie wszystkie przyszłe. `--muted` służy m.in. do 14–17 px tekstu. Knot ma już `mutedFor()` i test; siostry/hub nadal mają stały mix.

- Zapewnij minimum 4.5:1 dla zwykłego tekstu, 3:1 dla dużego oraz istotnych granic kontrolek i fokusu. Dekoracyjna hairline nie musi mieć kontrastu inputu. Wyłączone kontrolki oceniaj zgodnie z ich znaczeniem.
- Testuj wszystkie palety Knot, wszystkie ground Faces i reprezentatywne/pełne osiągalne kombinacje Blit/Chain Run, z określonym zasięgiem testu. Kolor UI można dostosować bez zmiany obrazu NFT.
- Widoczny focus dla linków, buttonów, inputów i wyboru pinów; skip link do main; logiczne headingi i landmarki; stany asynchroniczne w `aria-live` bez czytania odliczania co chwilę.
- Praktyczny cel dotykowy 44×44 dla głównych kontrolek; małe linki muszą mieć odpowiednie odstępy. Na hubie downloady są teraz wysokie na 30 px. Nie zniekształcaj całej typografii tylko po to, by osiągnąć metrykę.

### 13. Pobieranie i informacje o plikach

- Faces holder ma galerię bez takiej samej belki pobierania jak daily. Zapewnij spójne SVG/PNG/JPEG, rozmiar i czytelną informację, co jest obrazem, a co kartą 1200×630.
- Hub nazywa Faces `faces-day-N`; używaj `faces-face-N`, daily `collection-day-N`. Ujednolić prefix Knot między stronami.
- Kliknięcie PNG/JPEG bez JS ma prowadzić do rzeczywistego właściwego formatu lub jasno opisanego fallbacku, nie SVG podpisanego PNG.
- Dodaj timeout/abort, per-download busy, obsługę image decode i `toBlob(null)`, sprzątanie object URL. Nie twórz kilku canvas 4096×4096 naraz przez wieloklik. Zachowaj pixel rendering i poprawne tło JPEG.
- W hubie etykiety „Download PNG for Face #N” dostępne dla AT, widoczne SVG/PNG/JPEG mogą pozostać krótkie. Cross-origin fetch i CORS sprawdź bez portfela.

## P2/P3. Wydajność i spójność huba

### 14. Cache i agregacja

`onenft-hub/src/state.ts`: TTL domyślnie 20 s, timeout requestu 6 s. `stateOf` oczekuje na refresh, brak in-flight dedupe. Po awarii zwraca stare dane bez oznaczenia; kolejne żądania ponawiają fetch. Dla daily może dojść drugi sekwencyjny odczyt palette. `/wallet/<who>` najpierw czeka na wallet, potem na `allStates()`.

- Zastosuj stale-while-revalidate, współdzielony refresh, backoff i timestamp ostatniego poprawnego pobrania. Timeout ma być ograniczeniem całego refreshu, nie wielokrotnie sumowanym budżetem ukrytym w retry.
- Uniezależnij render huba od najwolniejszej kolekcji. Cold cache: szybki shell/ograniczony deadline i częściowe wyniki; warm cache: odpowiedź z cache, background refresh. Nie pokazuj uszkodzonego obrazka bez fallbacku.
- Wallet i palette/state pobieraj współbieżnie, jeśli nadal są potrzebne. W cache portfela zachowuj ostatnie dobre dane per kolekcja, a nie zastępuj całej poprzedniej odpowiedzi samymi błędami.
- Hub dziś pobiera całe `/api/days` do tally. Zmierz rozmiar i czas dla 1, 365 i 1000 dni. Jeśli rośnie istotnie, daj kompatybilny summary endpoint zawierający dzisiejszy stan, tally, palette i freshness; nie psuj legacy redirectów/API.
- Faces SSR robi ENS dla wszystkich owners i odczytuje wszystkie brakujące rekordy; ogranicz koszt danych niewidocznych na danej stronie. Zmierz cold boot przy 10 000 tokenach na fixture, paginuj holder/gallery, ogranicz cache i kolejki.
- Nie serwuj częściowo nieudanych multicall jako kompletnej historii. Faces `multicallBatch` zamienia wszystkie błędy na null; `refreshOwners` mimo tego ustawia czas całego refreshu. Zapewnij atomowy snapshot albo jawny partial status i retry brakujących danych.
- Lazy-load obrazów poniżej pierwszego ekranu, priorytet tylko dla faktycznego hero, stały aspect ratio. Rozważ lokalne fonty po porównaniu waterfallu; nie twierdź, że to przyspieszy stronę bez pomiaru.

### 15. Podstawy operacyjne

- Jawne statusy HTTP i spójny content-type także przy błędach; zewnętrzny JSON nie jest zaufany. Kontrolowany error boundary routingu.
- Sprawdź nagłówki ochronne w siostrach i hubie; zachowaj działanie embedów, obrazów cross-origin, analytics i wallet connectorów. CSP dobierz do rzeczywistych zasobów, najlepiej etap report-only lokalnie/staging; nie kopiuj polityki blokującej wymagane połączenia.
- Logi operacyjne mają identyfikator zdarzenia i typ błędu, bez kluczy, pełnego RPC URL czy surowych requestów portfela. Telemetria transakcji nie może niepotrzebnie łączyć adresów z zachowaniem użytkownika.
- Weryfikuj read-only readiness, cache age, lag scan, czas RPC. Propozycję monitoringu/SLO oddziel od wdrożenia zewnętrznej usługi.

## Weryfikacja i definicja gotowości

Nie wystarczy „bun test passed”. Do każdego naprawionego błędu dodaj regresję, która zawodzi na starej implementacji. Testy HTML sprawdzające obecność tekstu nie dowodzą działania portfela, hidden CSS ani sticky.

1. **Routing:** hub → każda kolekcja → token → pełny adres holdera → hub; Faces `/yours`; legacy redirects path/query; 404/400/503; invalid ENS; malformed percent encoding; canonical.
2. **UI/browser:** 320, 360, 390, 430, 768, 1024 i 1440 px; 200% zoom, klawiatura, reduced motion; hero widoczne przed długą dokumentacją, bez łamanych pojedynczych liter i poziomego overflow; screenshoty przed/po dla home i Faces builder.
3. **Wallet fake provider:** brak walleta, odmowa, puste konta, zła sieć, odmowa switch, accountsChanged A→B, disconnect przed i po wysłaniu, pending dłuższe niż timeout, replacement/revert, refresh karty. Zero automatycznych duplikatów transakcji; wyświetlany sukces oparty o receipt.
4. **Faces:** 0/1/2/12 pinów, cena z BigInt, czyszczenie, wznowienie draftu, sold out z pending, wykorzystany dzień, keeper offline/restart/race, stale holder, wynik 1/1 przy pinach, recovered token ID z eventu. Osobno lokalne testy granic blockhash z punktu 3.
5. **Awaria:** cold/warm start z dead RPC, hung RPC, timeout ENS, częściowy multicall, jeden/all upstreamy huba niedostępne, recovery, nowy dzień UTC podczas outage. Statyczne zasoby i browse nie czekają na sieć bez końca. Nie powstają fikcyjne gaps/zera/404.
6. **Wydajność lokalna:** minimum 30 próbek cold/warm dla home, wallet i obrazów przy kontrolowanej współbieżności; p50/p95, liczba RPC/upstream requests, heap/cache, bajty odpowiedzi. Fixtures 365/1000 dni i do 10 000 Faces. Bez load testu produkcji.
7. **Budżety odbioru do zweryfikowania pomiarem:** warm cached HTML lokalnie p95 <200 ms przy concurrency 20; brak zależności liveness/statycznego zasobu od RPC; ograniczony cold dependency deadline, przykładowo 2 s do częściowego wyniku; brak wzrostu requestów RPC liniowo z liczbą równoczesnych wejść. Dla mobilnego renderu mierz LCP/CLS/INP na opisanym profilu; cele LCP ≤2.5 s, CLS ≤0.1, INP ≤200 ms traktuj jako cele, nie wynik tego audytu.
8. **Gates:** `bun test` w każdym zmienionym repo, `bun run typecheck` w Knot; dodaj sensowną kontrolę typów tam, gdzie jej brak, jeśli dotykasz skryptów/runtime. Odpowiednie `forge test` dla lokalnych testów kontraktu/reguł. `git diff --check`, przegląd zakresu diffu. Nie regeneruj historycznych grafik tylko dla testu.

Oddaj listę zamkniętych punktów z plikami i dowodem, copy before/after, metryki before/after, screenshoty, nieprzetestowane scenariusze i rzeczywiste blokady. W szczególności odróżnij bezpieczniejsze UI/keeper od nierozwiązanego problemu publicznego kontraktu. Nie deklaruj „100% bez rozłączeń”: zewnętrzne portfele i RPC mogą zawieść, ale użytkownik ma zawsze widzieć prawdziwy stan i mieć bezpieczną drogę wznowienia.
