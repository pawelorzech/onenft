# onenft.click

Jeden splot Truchet na dobę, wyliczony z numeru bloku Base. Nikt go nie rysuje i nikt nie może go opóźnić.

## Jak to działa

- **Doba** = `blockNumber / 43200` (całkowicie). Przy ~2 s/blok to około dzień, ale granica wędruje względem zegara ściennego.
- **Ziarno** = doba przez splitmix64. Osiem bitów na paletę, potem po dwa bity na każdą z 64 komórek siatki 8×8.
- **Cztery stany komórki**: ćwierćłuki w dwóch orientacjach, przelot pionowy, przelot poziomy.
- **Wyjście**: jedna ścieżka SVG narysowana dwa razy (cień + sznur), ~5 kB, docelowo zwracane z kontraktu jako `data:` URI.
- **Strona nie ma własnej palety.** Bierze kolory z palety dzisiejszej doby, więc wygląda inaczej w każdej z ośmiu epok.

Cały strumień losowy jest opisany na `/format`, żeby dało się go przepisać w dowolnym języku. Cała arytmetyka mieści się w uint64 pod przyszłe przepisanie na Solidity.

## Uruchomienie

```sh
bun test
PORT=3000 bun run src/server.ts
```

Zmienne: `PORT`, `BASE_RPC_URL` (domyślnie `https://mainnet.base.org`), `START_EPOCH` (epoka doby 1; domyślnie 1178).

## Trasy

- `/` tkanina: dzisiejsza doba i wszystkie wcześniejsze
- `/doba/N` pojedyncza doba, `/doba/N.svg` surowy plik (przeszłe doby cache'owane na rok)
- `/dzis.svg` dzisiejszy splot
- `/format` opis formatu
- `/zdrowie` healthcheck

## Plan

Bramki z projektu: (1) renderer publicznie bez portfela ← tu jesteśmy, (2) 90 dób pod nazwiskiem, (3) format jako specyfikacja, (4) Base Sepolia, (5) mainnet, gdy kilkunastu nieznajomych spyta „da się to mieć".

Kontrakt tokenu będzie niezmienny. Renderer będzie osobnym kontraktem, którego adres zapisuje się per token w chwili odbioru, więc poprawki dotykają tylko przyszłych dób.
