// Schermen 05 (onthullen) en 06 (resultaat): één scherm in twee toestanden.
import { kopHtml, homeKnopHtml, koppelNavigatie, maakScherm } from './onderdelen.js';
import { huidigeSchaal } from './schaal.js';
import { speelFanfare } from './geluid.js';

const OMKLAP_MS = 800;
const minderBeweging = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function maakOnthulscherm({ wapen, schild, titel, tekening, volgende, naarHome, naarStart }) {
  const el = maakScherm('onthulscherm');
  el.innerHTML = `
    ${kopHtml()}
    <main class="onthul-hoofd">
      <section class="blazoen-kolom onthul-blazoen" aria-labelledby="onthul-titel">
        <h1 class="level-kop" id="onthul-titel" tabindex="-1"></h1>
        <p class="blazoen-tekst"></p>
      </section>
      <figure class="schild-figuur">
        <figcaption class="figuur-kop"><span class="figuur-naam">Jouw tekening</span></figcaption>
        <div class="schild-vak tekening-vak">
          <div class="schildvorm-vlak schildkleur"></div>
          <img class="tekening-img" alt="Jouw tekening">
        </div>
      </figure>
      <figure class="schild-figuur officieel-figuur">
        <figcaption class="figuur-kop naam-kop" aria-live="polite">
          <span class="figuur-provincie"></span><span class="figuur-naam"></span>
        </figcaption>
        <div class="schild-vak omklap">
          <div class="omklap-binnen">
            <div class="omklap-voor">
              <div class="schildvorm-vlak grijs"></div>
              <button type="button" class="knop knop-primair knop-onthul" data-actie="onthul">onthul!</button>
            </div>
            <div class="omklap-achter">
              <img class="officieel-img" alt="">
            </div>
          </div>
          ${wapen.wiki_url ? '<a class="leer-meer" target="_blank" rel="noopener">Leer meer over dit wapen &gt;</a>' : ''}
        </div>
      </figure>
    </main>
    <footer class="voet">
      <div>${homeKnopHtml()}</div>
      <div><button type="button" class="knop knop-primair verborgen" data-actie="volgende" tabindex="-1" aria-hidden="true"></button></div>
    </footer>`;

  const $ = (s) => el.querySelector(s);
  $('.level-kop').textContent = titel;
  $('.blazoen-tekst').textContent = wapen.blazoen;
  $('.tekening-img').src = tekening;
  $('.officieel-img').src = schild.officieelUrl;
  el.querySelectorAll('.schildvorm-vlak').forEach((v) => {
    v.style.webkitMaskImage = v.style.maskImage = `url(${schild.maskerUrl})`;
  });
  const link = $('.leer-meer');
  if (link) link.href = wapen.wiki_url;
  const knopVolgende = $('[data-actie="volgende"]');
  knopVolgende.textContent = volgende.label;
  knopVolgende.addEventListener('click', () => volgende.actie());
  koppelNavigatie(el, { naarStart, naarHome });

  // ---------- Onthullen ----------
  $('[data-actie="onthul"]').addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    speelFanfare('onthul');
    const snel = minderBeweging();
    el.classList.add('omgeklapt');
    setTimeout(() => {
      $('.naam-kop .figuur-provincie').textContent = wapen.provincie;
      $('.naam-kop .figuur-naam').textContent = wapen.gemeente;
      $('.officieel-img').alt = `Het officiële wapen van ${wapen.gemeente}`;
      el.classList.add('onthuld');
      document.title = `${titel}: ${wapen.gemeente} – De Schildschilder`;
      knopVolgende.classList.remove('verborgen');
      knopVolgende.tabIndex = 0;
      knopVolgende.removeAttribute('aria-hidden');
      requestAnimationFrame(() => knopVolgende.focus({ preventScroll: true }));
    }, snel ? 0 : OMKLAP_MS);
  });

  // ---------- Afmetingen: beide schilden precies even groot ----------
  const hoofd = $('.onthul-hoofd');
  function indeling() {
    const s = huidigeSchaal();
    const stijl = getComputedStyle(hoofd);
    const binnenH = hoofd.clientHeight - parseFloat(stijl.paddingTop) - parseFloat(stijl.paddingBottom);
    const binnenB = hoofd.clientWidth - parseFloat(stijl.paddingLeft) - parseFloat(stijl.paddingRight);
    const boven = (56 + 14) * s;   // figuurkop + tussenruimte
    const onder = (14 + 32) * s;   // ruimte voor de link onder het wapen
    let h = Math.min(window.innerHeight * 0.56, 460 * s, binnenH - boven - onder);
    const maxB = (binnenB - 260 * s - 2 * 56 * s) / 2; // blazoenkolom + twee tussenruimtes
    h = Math.max(60, Math.floor(Math.min(h, maxB / schild.verhouding)));
    const b = Math.round(h * schild.verhouding);
    el.querySelectorAll('.schild-vak').forEach((v) => {
      v.style.width = `${b}px`;
      v.style.height = `${h}px`;
    });
    const blok = $('.onthul-blazoen');
    if (blok.scrollHeight > blok.clientHeight + 1) {
      console.warn(`Blazoenering van ${wapen.id} past niet op scherm 05/06 bij ${innerWidth} × ${innerHeight}.`);
    }
  }
  const waarnemer = new ResizeObserver(indeling);

  return {
    element: el,
    titel: `${titel}: onthullen`,
    opgebouwd() {
      waarnemer.observe(hoofd);
      indeling();
    },
    opruimen() {
      waarnemer.disconnect();
    },
  };
}
