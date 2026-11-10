# Stem van de aflevering — Ginger Cat Daily Dose #01

Dit is de tekst die in `ginger-cat-daily-dose-01.mp4` te horen is (Nederlands, 74 s).
De opname in `stemmen/*.mp3` is een **voorbeeldstem** zodat de video compleet is — het is
geen echte menselijke opname. Wil je je eigen stem? Neem elke regel apart op met dezelfde
bestandsnaam, en render opnieuw:

```bash
python3 maak_aflevering.py            # 16:9 → ginger-cat-daily-dose-01.mp4
python3 maak_aflevering.py --formaat 9:16
```

Het script leest de duur van elk audiobestand en maakt de scène precies zo lang — je hoeft
dus niets aan te passen als je in- of uitademt. Neem op met je telefoon op 20 cm afstand,
in een kamer met gordijnen en zonder galm.

| # | Bestand | Duur in beeld | Wat je zegt |
|---|---|---|---|
| — | introkaart | 3,0 s | (stil) |
| 01 | `01-zeven-uur.mp3` | 6,6 s | Zeven uur, en ze staat al aan de deur. Ik heb mijn koffie nog niet vast. |
| 02 | `02-kroeg.mp3` | 7,3 s | De kroeg op de hoek? Die is van haar. Ze loopt naar binnen alsof ze de eigenaar is. |
| 03 | `03-zebrapad.mp3` | 7,7 s | Aan het zebrapad blijft ze staan. Echt waar. Pas als het licht groen wordt, stapt ze over. |
| 04 | `04-vrienden.mp3` | 7,4 s | Ze kiest haar eigen vrienden. Honden krijgen een twee op de tien. Mensen een tien. |
| 05 | `05-tegels.mp3` | 7,7 s | Natte tegels weigert ze. Maar een bakkerij ruikt ze van drie straten ver. |
| 06 | `06-twintig-minuten.mp3` | 7,3 s | Twintig minuten, geen minuut meer. Zij beslist waar we stoppen, niet ik. |
| 07 | `07-dag-een.mp3` | 6,1 s | Dag één was één straat, en een bankje dat nu van haar is. |
| 08 | `08-zee.mp3` | 7,5 s | De zee, voor het eerst. Ze bleef vijf minuten stokstijf staan kijken. |
| 09 | `09-slaap.mp3` | 5,9 s | En dan, thuis, is de batterij leeg. Niet storen. |
| 10 | `10-outro.mp3` | 7,3 s | Elke zondag een nieuwe wandeling. Ginger Cat Daily Dose, nummer één. |

**Opnameregel:** één zin per ademhaling, en na elke zin een halve seconde stilte. De video
zet zelf 0,6 s stilte vóór en 0,9 s na elke zin (`stem.lead` / `stem.tail` in
`aflevering.json`).
