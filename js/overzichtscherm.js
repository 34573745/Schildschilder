// Scherm 02: overzicht. Levelroute met kleine schilden, verbonden door een lijn.
// Niet gespeeld: leeg schild met het levelnummer (geen gemeentenaam, die zou het antwoord verraden).
// Gespeeld (in deze sessie): thumbnail van de eigen tekening met de gemeentenaam eronder.
// Volgende: het eerste niet-gespeelde level na het laatst gespeelde, met rode ring.
import { kopHtml, koppelNavigatie, maakScherm } from './onderdelen.js';

export function maakOverzichtscherm({ levels, gespeeld, laatstGespeeld, vorm, naarLevel, naarWillekeurig, naarStart }) {
  const volgende = bepaalVolgende(levels, gespeeld, laatstGespeeld);

  const el = maakScherm('overzichtscherm');
  el.innerHTML = `
    ${kopHtml()}
    <main class="overzicht-hoofd">
      <div class="overzicht-kop">
        <h1 class="overzicht-titel" tabindex="-1">Kies een level</h1>
        <p class="overzicht-sub">Begin bij level 1, of stap in waar je wilt.</p>
      </div>
      <div class="levelroute-strook">
        <ol class="levelroute"></ol>
      </div>
      <div class="overzicht-voet">
        <p class="overzicht-noot">Je tekeningen blijven hier staan zolang je op de site bent.</p>
        <div class="overzicht-willekeurig">
          <span>of probeer een willekeurig wapen</span>
          <button type="button" class="knop knop-primair" data-actie="willekeurig">willekeurig</button>
        </div>
      </div>
    </main>
    <div class="overzicht-onderruimte"></div>`;

  const route = el.querySelector('.levelroute');
  const lijn = document.createElement('li');
  lijn.className = 'levelroute-lijn';
  lijn.setAttribute('aria-hidden', 'true');
  route.append(lijn);

  for (const wapen of levels) {
    const duim = gespeeld.get(wapen.id);
    const isVolgende = volgende && volgende.id === wapen.id;
    const li = document.createElement('li');
    li.className = 'level-item';
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'level-knop' + (isVolgende ? ' is-volgende' : '') + (duim ? ' is-gespeeld' : '');
    knop.setAttribute('aria-label',
      duim ? `Level ${wapen.volgorde}, gespeeld: ${wapen.gemeente}` : `Level ${wapen.volgorde}${isVolgende ? ', volgende' : ''}`);

    const schild = document.createElement('span');
    schild.className = 'level-schild';
    if (duim) {
      const img = document.createElement('img');
      img.src = duim;
      img.alt = '';
      schild.append(img);
    } else {
      const leeg = document.createElement('span');
      leeg.className = 'level-leeg';
      leeg.style.webkitMaskImage = leeg.style.maskImage = `url(${vorm.maskerUrl})`;
      leeg.style.aspectRatio = String(vorm.verhouding);
      const nummer = document.createElement('span');
      nummer.className = 'level-nummer';
      nummer.textContent = wapen.volgorde;
      leeg.append(nummer);
      schild.append(leeg);
    }
    const onder = document.createElement('span');
    onder.className = 'level-onder';
    onder.setAttribute('aria-hidden', 'true');
    const label = duim ? wapen.gemeente : isVolgende ? 'volgende' : '';
    if (label) {
      const tekst = document.createElement('span');
      tekst.textContent = label;
      onder.append(tekst);
    }

    // Schild (met schaduw) en eventueel de ring (zonder schaduw) in één houder.
    const houder = document.createElement('span');
    houder.className = 'level-schild-houder';
    houder.append(schild);
    if (isVolgende && !duim) houder.append(maakRing(vorm));
    knop.append(houder, onder);
    knop.addEventListener('click', () => naarLevel(wapen));
    li.append(knop);
    route.append(li);
  }

  el.querySelector('[data-actie="willekeurig"]').addEventListener('click', () => naarWillekeurig());
  koppelNavigatie(el, { naarStart, naarHome: () => {} });

  return {
    element: el,
    titel: 'Kies een level',
    opgebouwd() {
      // Bij veel levels: schuif de strook zo dat "volgende" in beeld staat.
      const strook = el.querySelector('.levelroute-strook');
      const doel = el.querySelector('.is-volgende');
      if (doel && strook.scrollWidth > strook.clientWidth) {
        const s = strook.getBoundingClientRect();
        const d = doel.getBoundingClientRect();
        strook.scrollLeft += d.left - s.left - (s.width - d.width) / 2;
      }
    },
  };
}

// Ring om het volgende schild: een dunne rode stippellijn langs de omtrek van de schildvorm,
// strak om het schild heen (2 px erbuiten).
const SVG_NS = 'http://www.w3.org/2000/svg';

function maakRing(vorm) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'level-ring');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${vorm.omtrek.breedte} ${vorm.omtrek.hoogte}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const pad = document.createElementNS(SVG_NS, 'path');
  pad.setAttribute('d', vorm.omtrek.d);
  pad.setAttribute('fill', 'none');
  pad.setAttribute('stroke-dasharray', '4 3');
  pad.setAttribute('vector-effect', 'non-scaling-stroke');
  pad.style.stroke = 'var(--primair)';
  pad.style.strokeWidth = '1.5px';
  svg.append(pad);
  return svg;
}

function bepaalVolgende(levels, gespeeld, laatstGespeeld) {
  const start = levels.findIndex((w) => w.id === laatstGespeeld);
  for (let i = start + 1; i < levels.length; i++) if (!gespeeld.has(levels[i].id)) return levels[i];
  return levels.find((w) => !gespeeld.has(w.id)) || null;
}
