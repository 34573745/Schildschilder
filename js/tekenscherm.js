// Scherm 04: tekenen.
import { laadSchild } from './schild.js';
import { Tekenbord, REFERENTIE_SCHILDHOOGTE, PEN_DIKTE } from './tekenen.js';
import { huidigeSchaal } from './schaal.js';

export const KLEUREN = [
  { naam: 'rood', hex: '#ee1c25' },
  { naam: 'oranje', hex: '#f7941d' },
  { naam: 'geel', hex: '#fff200' },
  { naam: 'groen', hex: '#009245' },
  { naam: 'blauw', hex: '#0a63ff' },
  { naam: 'paars', hex: '#92278f' },
  { naam: 'bruin', hex: '#8c6239' },
  { naam: 'zwart', hex: '#000000' },
  { naam: 'lichtgrijs', hex: '#e6e7e8', rand: true },
];

const VORMEN = [
  { id: 'rond', label: 'kwast rond' },
  { id: 'vierkant', label: 'kwast vierkant' },
  { id: 'pen-rechts', label: 'kwast pen schuin naar rechts' },
  { id: 'pen-links', label: 'kwast pen schuin naar links' },
];

const FORMATEN = [10, 18, 28, 60]; // px op het referentieformaat
// Het voorbeeld in de formaatknop (56 px) past tot 40 px; de grootste kwast toont daar dus 40 px.
const MAX_VOORBEELD = 40;

const ICONEN = {
  ongedaan: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  opnieuw: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  gum: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  wissen: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
};

const icoon = (naam) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="#141210" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONEN[naam]}</svg>`;

// Vormvoorbeeld (span) voor menu, formaatknoppen en cursor. maat in css-px.
function stijlVoorVorm(el, vorm, maat) {
  el.classList.toggle('vorm-rond', vorm === 'rond');
  el.classList.toggle('vorm-pen', vorm.startsWith('pen'));
  if (vorm.startsWith('pen')) {
    el.style.width = `${maat}px`;
    el.style.height = `${Math.max(maat * PEN_DIKTE, 2)}px`;
    el.dataset.hoek = vorm === 'pen-rechts' ? '45' : '-45';
  } else {
    el.style.width = `${maat}px`;
    el.style.height = `${maat}px`;
    el.dataset.hoek = '0';
  }
}

export async function maakTekenscherm({ wapen, levelTitel, naarHome, naarStart, naarGereed }) {
  const schild = await laadSchild(wapen);

  const scherm = document.createElement('div');
  scherm.className = 'scherm tekenscherm';
  scherm.innerHTML = `
    <header class="kop">
      <a class="logo-link" href="./" data-actie="start"><img src="beeld/logo.svg" alt="De Schildschilder"></a>
    </header>
    <main class="tekenen-hoofd">
      <section class="blazoen-kolom" aria-labelledby="level-kop">
        <h1 class="level-kop" id="level-kop" tabindex="-1"></h1>
        <p class="blazoen-tekst"></p>
      </section>
      <div class="schild-kolom">
        <div class="tekenvlak">
          <canvas role="img" aria-label="Tekenvlak in de vorm van het schild"></canvas>
          <svg class="omtrek" aria-hidden="true" preserveAspectRatio="none">
            <path fill="none" stroke="#9c958b" stroke-width="1.5" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>
          </svg>
          <div class="kwast-cursor" aria-hidden="true"></div>
        </div>
      </div>
      <aside class="menubalk" aria-label="Tekengereedschap">
        <h2 class="menu-kop">Kleuren</h2>
        <div class="kleuren">
          ${KLEUREN.map((k) => `<button type="button" class="kleurstaal${k.rand ? ' met-rand' : ''}" data-kleur="${k.naam}" aria-label="${k.naam}" aria-pressed="false" style="background:${k.hex}"></button>`).join('')}
        </div>
        <div class="menu-afstand"></div>
        <h2 class="menu-kop">Kwast vorm</h2>
        <div class="vormen">
          ${VORMEN.map((v) => `<button type="button" class="vormknop" data-vorm="${v.id}" aria-label="${v.label}" aria-pressed="false"><span></span></button>`).join('')}
        </div>
        <div class="menu-afstand"></div>
        <h2 class="menu-kop">Kwast formaat</h2>
        <div class="formaten">
          ${FORMATEN.map((_, i) => `<button type="button" class="formaatknop" data-formaat="${i}" aria-label="formaat ${i + 1}" aria-pressed="false"><span></span></button>`).join('')}
        </div>
        <div class="menu-afstand"></div>
        <div class="gereedschap">
          <button type="button" class="toolknop" data-actie="ongedaan" aria-label="Ongedaan maken" title="Ongedaan maken (Ctrl+Z)">${icoon('ongedaan')}</button>
          <button type="button" class="toolknop" data-actie="opnieuw" aria-label="Opnieuw" title="Opnieuw (Ctrl+Shift+Z)">${icoon('opnieuw')}</button>
          <button type="button" class="toolknop" data-actie="gum" aria-label="Gum" aria-pressed="false" title="Gum">${icoon('gum')}</button>
          <button type="button" class="toolknop" data-actie="wissen" aria-label="Alles wissen" title="Alles wissen">${icoon('wissen')}</button>
        </div>
      </aside>
    </main>
    <footer class="voet">
      <div><button type="button" class="knop knop-secundair" data-actie="home">home</button></div>
      <div><button type="button" class="knop knop-primair verborgen" data-actie="gereed" tabindex="-1" aria-hidden="true">gereed</button></div>
    </footer>

    <dialog class="melding" data-dialoog="home" aria-labelledby="home-titel">
      <div class="melding-inhoud">
        <h2 id="home-titel">Terug naar home?</h2>
        <p>Je tekening is nog niet af. Als je nu teruggaat, gaat hij verloren.</p>
        <div class="melding-knoppen">
          <button type="button" class="knop knop-secundair" data-antwoord="blijf">blijf tekenen</button>
          <button type="button" class="knop knop-primair" data-antwoord="ga">naar home</button>
        </div>
      </div>
    </dialog>

    <dialog class="melding" data-dialoog="wissen" aria-labelledby="wissen-titel">
      <div class="melding-inhoud">
        <h2 id="wissen-titel">Alles wissen?</h2>
        <p>Je hele tekening wordt gewist.</p>
        <div class="melding-knoppen">
          <button type="button" class="knop knop-secundair" data-antwoord="blijf">annuleren</button>
          <button type="button" class="knop knop-primair" data-antwoord="ga">wissen</button>
        </div>
      </div>
    </dialog>
  `;

  const $ = (sel) => scherm.querySelector(sel);
  const $$ = (sel) => [...scherm.querySelectorAll(sel)];

  $('.level-kop').textContent = levelTitel;
  $('.blazoen-tekst').textContent = wapen.blazoen;

  const vlak = $('.tekenvlak');
  const canvas = vlak.querySelector('canvas');
  const omtrek = vlak.querySelector('.omtrek');
  omtrek.setAttribute('viewBox', `0 0 ${schild.omtrek.breedte} ${schild.omtrek.hoogte}`);
  omtrek.querySelector('path').setAttribute('d', schild.omtrek.d);
  const cursor = vlak.querySelector('.kwast-cursor');
  const knopGereed = $('[data-actie="gereed"]');

  // ---------- Toestand ----------
  const toestand = { kleur: 'blauw', vorm: 'rond', formaat: 1, gum: false };
  const kleurHex = () => KLEUREN.find((k) => k.naam === toestand.kleur).hex;

  const bord = new Tekenbord({ canvas, schild, bijWijziging: werkBij });

  function werkBij() {
    $$('.kleurstaal').forEach((b) => zetGekozen(b, !toestand.gum && b.dataset.kleur === toestand.kleur));
    $$('.vormknop').forEach((b) => zetGekozen(b, b.dataset.vorm === toestand.vorm));
    $$('.formaatknop').forEach((b) => zetGekozen(b, Number(b.dataset.formaat) === toestand.formaat));
    zetGekozen($('[data-actie="gum"]'), toestand.gum);

    // Formaatvoorbeelden in de gekozen kleur en vorm.
    const s = huidigeSchaal();
    $$('.formaatknop').forEach((b) => {
      const span = b.firstElementChild;
      stijlVoorVorm(span, toestand.vorm, Math.min(FORMATEN[Number(b.dataset.formaat)], MAX_VOORBEELD) * s);
      span.style.display = 'block';
      span.style.background = kleurHex();
      span.style.boxShadow = toestand.kleur === 'lichtgrijs' ? 'inset 0 0 0 1px #cfc6b8' : 'none';
      span.style.transform = `rotate(${span.dataset.hoek}deg)`;
    });

    $('[data-actie="ongedaan"]').disabled = !bord.kanOngedaan();
    $('[data-actie="opnieuw"]').disabled = !bord.kanOpnieuw();
    $('[data-actie="wissen"]').disabled = !bord.heeftTekening();

    const getekend = bord.heeftTekening();
    knopGereed.classList.toggle('verborgen', !getekend);
    knopGereed.tabIndex = getekend ? 0 : -1;
    knopGereed.setAttribute('aria-hidden', String(!getekend));

    werkCursorBij();
  }

  function zetGekozen(knop, aan) {
    knop.classList.toggle('geselecteerd', aan);
    if (knop.hasAttribute('aria-pressed')) knop.setAttribute('aria-pressed', String(aan));
  }

  // Vormiconen in het menu (vast, donker, zoals in het ontwerp).
  $$('.vormknop').forEach((b) => {
    const span = b.firstElementChild;
    span.style.display = 'block';
    span.style.background = '#141210';
    const v = b.dataset.vorm;
    if (v === 'rond') { span.style.width = span.style.height = 'calc(30 * var(--u))'; span.style.borderRadius = '50%'; }
    else if (v === 'vierkant') { span.style.width = span.style.height = 'calc(28 * var(--u))'; }
    else {
      span.style.width = 'calc(34 * var(--u))';
      span.style.height = 'calc(9 * var(--u))';
      span.style.borderRadius = 'calc(3 * var(--u))';
      span.style.transform = `rotate(${v === 'pen-rechts' ? 45 : -45}deg)`;
    }
  });

  // ---------- Menu ----------
  scherm.querySelector('.menubalk').addEventListener('click', (e) => {
    const knop = e.target.closest('button');
    if (!knop) return;
    if (knop.dataset.kleur) { toestand.kleur = knop.dataset.kleur; toestand.gum = false; }
    else if (knop.dataset.vorm) toestand.vorm = knop.dataset.vorm;
    else if (knop.dataset.formaat) toestand.formaat = Number(knop.dataset.formaat);
    else if (knop.dataset.actie === 'gum') toestand.gum = !toestand.gum;
    else if (knop.dataset.actie === 'ongedaan') bord.ongedaan();
    else if (knop.dataset.actie === 'opnieuw') bord.opnieuw();
    else if (knop.dataset.actie === 'wissen') {
      vraag('wissen').then((ja) => { if (ja) bord.wisAlles(); });
      return;
    }
    werkBij();
  });

  // ---------- Cursor ----------
  let cursorPos = null;
  function werkCursorBij() {
    const maatCss = FORMATEN[toestand.formaat] * (bord.cssHoogte / REFERENTIE_SCHILDHOOGTE || 1);
    stijlVoorVorm(cursor, toestand.vorm, maatCss);
    cursor.style.background = toestand.gum ? '#ffffff' : kleurHex();
    cursor.classList.toggle('gum', toestand.gum);
    plaatsCursor();
  }
  function plaatsCursor() {
    if (!cursorPos) { cursor.classList.remove('zichtbaar'); return; }
    const b = parseFloat(cursor.style.width), h = parseFloat(cursor.style.height);
    cursor.style.transform = `translate(${cursorPos[0] - b / 2}px, ${cursorPos[1] - h / 2}px) rotate(${cursor.dataset.hoek}deg)`;
    cursor.classList.add('zichtbaar');
  }

  // ---------- Tekenen met muis of pen ----------
  // De hele middelste kolom is tekenzone: zo kun je ook net buiten de rand beginnen.
  // Het masker van het schild snijdt de streek af.
  const zone = $('.schild-kolom');
  const relatief = (e) => {
    const r = vlak.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  zone.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (bord.bezig) return;
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    const [x, y] = relatief(e);
    cursorPos = [x, y];
    plaatsCursor();
    bord.beginStreek(bord.naarIntern(x, y), {
      kleur: kleurHex(), vorm: toestand.vorm, maatPx: FORMATEN[toestand.formaat], gum: toestand.gum,
    });
  });

  zone.addEventListener('pointermove', (e) => {
    const [x, y] = relatief(e);
    if (e.pointerType !== 'touch') { cursorPos = [x, y]; plaatsCursor(); }
    if (!bord.bezig || !zone.hasPointerCapture(e.pointerId)) return;
    const gebeurtenissen = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const lijst = gebeurtenissen.length ? gebeurtenissen : [e];
    bord.verlengStreek(lijst.map((g) => { const [gx, gy] = relatief(g); return bord.naarIntern(gx, gy); }));
  });

  const stop = () => { if (bord.bezig) bord.eindStreek(); };
  zone.addEventListener('pointerup', stop);
  zone.addEventListener('pointercancel', stop);
  zone.addEventListener('lostpointercapture', stop);
  zone.addEventListener('pointerleave', () => { if (!bord.bezig) { cursorPos = null; plaatsCursor(); } });
  zone.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- Sneltoetsen ----------
  function toets(e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'z') return;
    if (scherm.querySelector('dialog[open]')) return;
    e.preventDefault();
    if (e.shiftKey) bord.opnieuw(); else bord.ongedaan();
  }
  document.addEventListener('keydown', toets);

  // ---------- Dialogen ----------
  function vraag(naam) {
    const d = scherm.querySelector(`dialog[data-dialoog="${naam}"]`);
    return new Promise((klaar) => {
      const kies = (e) => {
        const knop = e.target.closest('[data-antwoord]');
        if (!knop) return;
        afsluiten(knop.dataset.antwoord === 'ga');
      };
      const annuleer = (e) => { e.preventDefault(); afsluiten(false); };
      function afsluiten(ja) {
        d.removeEventListener('click', kies);
        d.removeEventListener('cancel', annuleer);
        d.close();
        klaar(ja);
      }
      d.addEventListener('click', kies);
      d.addEventListener('cancel', annuleer);
      d.showModal();
    });
  }

  async function verlaat(doel) {
    if (bord.heeftTekening() && !(await vraag('home'))) return;
    doel();
  }

  $('[data-actie="home"]').addEventListener('click', () => verlaat(naarHome));
  $('.logo-link').addEventListener('click', (e) => { e.preventDefault(); verlaat(naarStart); });
  knopGereed.addEventListener('click', () => {
    if (!bord.heeftTekening()) return;
    // Groot (voor 05/06) en een thumbnail op de schildkleur voor het overzicht: 83 px × 2 (meegroeien op
    // grote schermen) × 2 (scherpe schermen) = 332 px hoog.
    naarGereed({ groot: bord.exporteer(900), duim: bord.exporteer(332, '#efe3cf') });
  });

  // ---------- Afmetingen ----------
  const schildKolom = zone;
  const blazoenKolom = $('.blazoen-kolom');

  function indeling() {
    const s = huidigeSchaal();
    // Schild: zo groot als in het ontwerp, min(66vh, 540px), maar nooit groter dan de ruimte.
    const beschikbaarH = schildKolom.clientHeight;
    const beschikbaarB = schildKolom.clientWidth;
    let h = Math.min(window.innerHeight * 0.66, 540 * s, beschikbaarH, beschikbaarB / schild.verhouding);
    h = Math.max(50, Math.floor(h));
    const b = Math.round(h * schild.verhouding);
    vlak.style.width = `${b}px`;
    vlak.style.height = `${h}px`;
    bord.zetWeergave(b, h);

    // Afspraak: de tekst krimpt niet mee. Past een blazoenering niet, dan melden we dat (voor de bouwer),
    // zodat de opdrachtgever kan beslissen wat er moet gebeuren.
    if (blazoenKolom.scrollHeight > blazoenKolom.clientHeight + 1) {
      console.warn(`Blazoenering van ${wapen.id} past niet bij ${window.innerWidth} × ${window.innerHeight}.`);
      scherm.dataset.blazoenPastNiet = 'true';
    } else {
      delete scherm.dataset.blazoenPastNiet;
    }
    werkBij();
  }

  const waarnemer = new ResizeObserver(() => indeling());

  return {
    element: scherm,
    titel: `${levelTitel}: tekenen`,
    bord, // voor testen
    opgebouwd() {
      waarnemer.observe(schildKolom);
      waarnemer.observe(blazoenKolom);
      indeling();
    },
    opruimen() {
      waarnemer.disconnect();
      document.removeEventListener('keydown', toets);
    },
  };
}
