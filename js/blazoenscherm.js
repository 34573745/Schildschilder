// Scherm 03: de blazoenering lezen. Geen timer: de speler klikt zelf op "begin!".
import { kopHtml, homeKnopHtml, koppelNavigatie, maakScherm } from './onderdelen.js';

export function maakBlazoenscherm({ wapen, titel, naarTekenen, naarHome, naarStart }) {
  const el = maakScherm('blazoenscherm');
  el.innerHTML = `
    ${kopHtml()}
    <main class="blazoen-hoofd">
      <div class="blazoen-blok">
        <h1 class="blazoen-titel" tabindex="-1"></h1>
        <p class="blazoen-groot"></p>
        <div class="blazoen-actie">
          <button type="button" class="knop knop-primair" data-actie="begin">begin!</button>
          <span class="blazoen-hint">Neem gerust de tijd om te lezen. De tekst blijft straks links staan.</span>
        </div>
      </div>
    </main>
    <footer class="voet">
      <div>${homeKnopHtml()}</div>
      <div></div>
    </footer>`;
  el.querySelector('.blazoen-titel').textContent = titel;
  el.querySelector('.blazoen-groot').textContent = wapen.blazoen;
  koppelNavigatie(el, { naarStart, naarHome });
  el.querySelector('[data-actie="begin"]').addEventListener('click', () => naarTekenen());

  return {
    element: el,
    titel: `${titel}: lees de blazoenering`,
    opgebouwd() {
      const blok = el.querySelector('.blazoen-hoofd');
      if (blok.scrollHeight > blok.clientHeight + 1) {
        console.warn(`Blazoenering van ${wapen.id} past niet op scherm 03 bij ${innerWidth} × ${innerHeight}.`);
      }
    },
  };
}
