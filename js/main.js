// Opstart, spelverloop en schermwisselingen.
//
// 01 start → 02 overzicht → 03 blazoen → 04 tekenen → 05/06 onthullen → 03 volgend level
//                                                              └─ laatste level → 07 gefeliciteerd
// Home (02) kan vanaf elk scherm behalve 01; het logo leidt naar 01.
import { werkSchaalBij } from './schaal.js';
import { laadSchild } from './schild.js';
import { maakStartscherm } from './startscherm.js';
import { maakOverzichtscherm } from './overzichtscherm.js';
import { maakBlazoenscherm } from './blazoenscherm.js';
import { maakTekenscherm } from './tekenscherm.js';
import { maakOnthulscherm } from './onthulscherm.js';
import { maakEindscherm } from './eindscherm.js';

const app = document.getElementById('app');
const FADE_MS = 300;
const minderBeweging = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const isLokaal = ['localhost', '127.0.0.1'].includes(location.hostname);

let huidig = null; // { element, opgebouwd?, opruimen? }
let bezigMetWisselen = false;

werkSchaalBij();
window.addEventListener('resize', werkSchaalBij);

async function toon(maak) {
  if (bezigMetWisselen) return;
  bezigMetWisselen = true;
  try {
    const scherm = await maak();
    if (huidig) {
      huidig.element.classList.remove('zichtbaar');
      if (!minderBeweging()) await wacht(FADE_MS);
      huidig.opruimen?.();
      huidig.element.remove();
    }
    huidig = scherm;
    if (isLokaal) window.__scherm = scherm;
    app.append(scherm.element);
    scherm.opgebouwd?.();
    document.title = scherm.titel ? `${scherm.titel} – De Schildschilder` : 'De Schildschilder';
    scherm.element.querySelector('h1')?.focus({ preventScroll: true });
    requestAnimationFrame(() => requestAnimationFrame(() => scherm.element.classList.add('zichtbaar')));
  } finally {
    bezigMetWisselen = false;
  }
}

// ---------- Data en sessie ----------

let wapens = [];
let levels = []; // wapens met een volgorde, oplopend; wapens zonder volgorde komen alleen via willekeurig

const SLEUTEL = {
  duim: (id) => `schildschilder:duim:${id}`,
  tekening: (id) => `schildschilder:tekening:${id}`,
  laatst: 'schildschilder:laatst-gespeeld',
  gehad: 'schildschilder:willekeurig-gehad',
};

function lees(sleutel) {
  try { return sessionStorage.getItem(sleutel); } catch { return null; }
}
function schrijf(sleutel, waarde) {
  try { sessionStorage.setItem(sleutel, waarde); } catch { /* opslag vol of uit: het spel werkt verder */ }
}

function titelVoor(wapen, modus) {
  return modus === 'willekeurig' ? 'Willekeurig' : `Level ${wapen.volgorde}`;
}

function volgendLevel(wapen) {
  const i = levels.findIndex((w) => w.id === wapen.id);
  return i >= 0 && i < levels.length - 1 ? levels[i + 1] : null;
}

// Willekeurig uit de hele database; binnen een sessie liever geen wapen dat al geweest is.
function kiesWillekeurig() {
  let gehad = [];
  try { gehad = JSON.parse(lees(SLEUTEL.gehad) || '[]'); } catch { /* geen geldige lijst */ }
  let keuze = wapens.filter((w) => !gehad.includes(w.id));
  if (keuze.length === 0) {
    gehad = [];
    keuze = wapens;
  }
  const wapen = keuze[Math.floor(Math.random() * keuze.length)];
  schrijf(SLEUTEL.gehad, JSON.stringify([...gehad, wapen.id]));
  return wapen;
}

// Bewaart de tekening zolang de speler op de site is (overdracht § 5).
function bewaarTekening(wapen, modus, { groot, duim }) {
  schrijf(SLEUTEL.duim(wapen.id), duim);
  schrijf(SLEUTEL.tekening(wapen.id), groot);
  if (modus === 'level') schrijf(SLEUTEL.laatst, wapen.id);
}

// ---------- Schermen ----------

const naarStart = () => toon(() => maakStartscherm({ naarOverzicht }));

const naarOverzicht = () => toon(async () => {
  // Lege schilden in het overzicht hebben één vaste vorm: die van level 1, afgeleid uit zijn SVG.
  const vorm = await laadSchild(levels[0]);
  const gespeeld = new Map();
  for (const w of levels) {
    const duim = lees(SLEUTEL.duim(w.id));
    if (duim) gespeeld.set(w.id, duim);
  }
  return maakOverzichtscherm({
    levels, gespeeld, vorm,
    laatstGespeeld: lees(SLEUTEL.laatst),
    naarLevel: (wapen) => naarBlazoen(wapen, 'level'),
    naarWillekeurig: () => naarBlazoen(kiesWillekeurig(), 'willekeurig'),
    naarStart,
  });
});

const navigatie = { naarHome: naarOverzicht, naarStart };

// Schildvormen alvast op de achtergrond berekenen, zodat schermwissels direct beginnen.
function bereidVoor(wapen) {
  if (wapen) laadSchild(wapen).catch(() => {});
}

function naarBlazoen(wapen, modus) {
  bereidVoor(wapen); // wordt gebruikt door 04 en 05/06; de speler is nu nog aan het lezen
  return toon(() => maakBlazoenscherm({
    wapen,
    titel: titelVoor(wapen, modus),
    naarTekenen: () => naarTekenen(wapen, modus),
    ...navigatie,
  }));
}

function naarTekenen(wapen, modus) {
  return toon(() => maakTekenscherm({
    wapen,
    levelTitel: titelVoor(wapen, modus),
    naarHome: navigatie.naarHome,
    naarStart: navigatie.naarStart,
    naarGereed: (afbeeldingen) => {
      bewaarTekening(wapen, modus, afbeeldingen);
      naarOnthullen(wapen, modus, afbeeldingen.groot);
    },
  }));
}

function naarOnthullen(wapen, modus, tekening) {
  return toon(async () => {
    const schild = await laadSchild(wapen);
    let volgende;
    if (modus === 'willekeurig') {
      volgende = { label: 'nog een willekeurige', actie: () => naarBlazoen(kiesWillekeurig(), 'willekeurig') };
    } else {
      const nieuw = volgendLevel(wapen);
      volgende = nieuw
        ? { label: `level ${nieuw.volgorde}`, actie: () => naarBlazoen(nieuw, 'level') }
        : { label: 'afronden', actie: naarEinde };
    }
    return maakOnthulscherm({
      wapen, schild, tekening, volgende,
      titel: titelVoor(wapen, modus),
      ...navigatie,
    });
  });
}

const naarEinde = () => toon(() => maakEindscherm(navigatie));

// ---------- Start ----------

async function start() {
  try {
    wapens = await (await fetch('data/wapens.json')).json();
  } catch {
    app.innerHTML = '<p style="padding:2rem">De wapens konden niet worden geladen. Open het spel via een webserver (zie README).</p>';
    return;
  }
  levels = wapens.filter((w) => Number.isInteger(w.volgorde)).sort((a, b) => a.volgorde - b.volgorde);
  // De vorm van de lege schilden in het overzicht (level 1) alvast voorbereiden, als de browser even niets doet.
  (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => bereidVoor(levels[0]));

  // Voor testen: ?wapen=<id> of #<id> opent dat wapen (scherm 03); #overzicht, #einde en #willekeurig
  // openen dat scherm meteen. Zonder iets begint het spel bij het startscherm.
  const gevraagd = new URLSearchParams(location.search).get('wapen') || decodeURIComponent(location.hash.slice(1));
  if (gevraagd === 'overzicht') return naarOverzicht();
  if (gevraagd === 'einde') return naarEinde();
  if (gevraagd === 'willekeurig') return naarBlazoen(kiesWillekeurig(), 'willekeurig');
  const wapen = wapens.find((w) => w.id === gevraagd);
  if (wapen) return naarBlazoen(wapen, wapen.volgorde ? 'level' : 'willekeurig');
  return naarStart();
}

start();
