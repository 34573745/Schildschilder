# De Schildschilder

Een tekenspel om heraldische terminologie te leren. Statische website: gewone HTML, CSS en JavaScript, zonder server en zonder build-stap.

## Stand van de bouw

Stap 1 t/m 4 zijn klaar: alle schermen werken (01 start, 02 overzicht, 03 blazoen, 04 tekenen, 05/06 onthullen en resultaat, 07 gefeliciteerd).

Gecontroleerd in stap 4:
- **Vensters:** elk scherm getest op maten van 1024 × 600 tot 3840 × 2160 (op grote schermen groeit alles mee, tot twee keer het ontwerpformaat) (en 960 × 540 en 720 × 405, oftewel 150 % en 200 % zoom): nergens scrollen, niets buiten beeld, geen overlap.
- **Toetsenbord:** het hele spel is met Tab, Enter en spatie te spelen, behalve het tekenen zelf. Na elke schermwissel staat de focus op de kop. In dialogen blijft de focus in de dialoog, Esc sluit, en daarna keert de focus terug op de knop.
- **Schermlezers:** elk scherm heeft een eigen paginatitel; knoppen en kleurstalen hebben labels; de onthulde naam wordt voorgelezen.
- **Beweging:** alle fades ca. 300 ms; met "minder beweging" (prefers-reduced-motion) verschijnt alles direct en klapt het schild direct om. Dubbelklikken tijdens een schermwissel geeft geen dubbele schermen.

Voor het testen kun je direct naar een scherm springen:

| adres | opent |
|---|---|
| `?wapen=<id>` of `#<id>` | scherm 03 van dat wapen, bijv. `?wapen=heumen` |
| `?wapen=overzicht` | scherm 02 |
| `?wapen=willekeurig` | een willekeurig wapen |
| `?wapen=einde` | scherm 07 |

Zonder iets erachter begint het spel bij het startscherm.

## Lokaal bekijken

Het spel leest bestanden in (de wapens en de data). Browsers blokkeren dat als je `index.html` gewoon dubbelklikt. Start daarom een eenvoudige webserver in deze map:

```
python3 -m http.server 8000
```

en open daarna <http://localhost:8000/?wapen=voorst>.

## Wapens toevoegen of aanpassen

1. Pas `data/schildschilder_wapens.xlsx` aan (tabblad **Wapens**; de kolomnamen niet wijzigen).
2. Zet het SVG-bestand in `wapens/`, met dezelfde naam als in de kolom `afbeelding`.
3. Zet de spreadsheet om naar JSON (Python 3, geen extra pakketten nodig):

   ```
   python3 tools/xlsx-naar-json.py
   ```

   Dit schrijft `data/wapens.json`, dat het spel leest. Wapens zonder `volgorde` komen straks alleen via "willekeurig".

## Hoe het werkt

| bestand | wat |
|---|---|
| `index.html` | de enige pagina; schermen wisselen met een fade |
| `css/stijl.css` | alle opmaak. Maten komen uit het ontwerp (1440 × 810) en schalen mee via `--u` |
| `js/main.js` | opstarten, spelverloop (levels, willekeurig) en schermwisselingen |
| `js/onderdelen.js` | gedeelde stukjes: kop met logo, home-knop |
| `js/startscherm.js` | scherm 01 |
| `js/overzichtscherm.js` | scherm 02: levelroute, thumbnails, "volgende", willekeurig |
| `js/eindscherm.js` | scherm 07 |
| `js/geluid.js` | het trompetje bij het onthullen en op 07, gemaakt met de Web Audio API (geen geluidsbestand) |
| `js/blazoenscherm.js` | scherm 03: blazoenering lezen |
| `js/onthulscherm.js` | schermen 05/06: onthullen (omklappen) en resultaat |
| `js/schaal.js` | rekent `--u` uit: elk scherm past zonder scrollen (netjes tot 1280 × 640) en groeit mee op grote schermen (tot 2×) |
| `js/schild.js` | leidt de schildvorm af uit de SVG van het wapen: de zichtbare rand, het masker en de stippellijn |
| `js/tekenen.js` | de tekenmotor: kwasten, gum, ongedaan maken en opnieuw, exporteren |
| `js/tekenscherm.js` | scherm 04: indeling, menubalk, cursor, sneltoetsen en dialogen |
| `tools/xlsx-naar-json.py` | spreadsheet → `data/wapens.json` |

**Schildvorm.** De SVG wordt onzichtbaar gerenderd. Wat duidelijk dekkend is, hoort bij het schild. Kieren tussen onderdelen worden opgevuld, en glans en bijna onzichtbare snippers tellen niet mee. Uit die vorm komen de bijsnijding, de verhouding van het tekenvlak, het masker en de stippellijn. Er staan geen vaste vormen in de code.

**Tekenen.** Elke streek wordt bewaard als handeling (kleur, vorm, formaat, punten) op een interne laag van 1600 px hoog. Ongedaan maken tekent alles opnieuw vanaf de lijst. Kwastformaten zijn gedefinieerd op het referentieformaat (10, 18, 28 en 60 px bij een schild van 534,6 px hoog) en schalen mee met het schild.

**Opslaan.** Bij "gereed" gaan twee PNG's naar `sessionStorage`: de tekening zelf (`schildschilder:tekening:<id>`, alleen de streken, doorzichtig) en een thumbnail op de schildkleur voor het overzicht (`schildschilder:duim:<id>`). Het laatst gespeelde level (`schildschilder:laatst-gespeeld`) bepaalt welk level "volgende" krijgt. Hij blijft bewaard zolang het tabblad open is. Willekeurig onthoudt in dezelfde opslag welke wapens al geweest zijn.

**Onthullen.** Het officiële wapen wordt bijgesneden tot zijn zichtbare rand, zodat het precies even groot is als de tekening en optisch links uitlijnt met zijn label.

**Trompetje.** Bij het onthullen (05, een kort "ta-ta-taaa" van ca. 0,8 s, terwijl het schild omklapt) en op 07 (een melodietje van ca. 2,7 s, bewust onder de 3 seconden). Browsers spelen pas geluid af na een klik of toetsaanslag; op beide momenten is daar net op geklikt.

## Online zetten

Upload de hele map naar GitHub en zet GitHub Pages aan (Settings → Pages → branch `main`, map `/`). De map `tools/` en de .xlsx mogen meegaan; het spel gebruikt ze niet.

## Lettertypes

- Oldania ADF Std (`fonts/`): GPL met font-uitzondering, mag op het web.
- EB Garamond: via Google Fonts.
