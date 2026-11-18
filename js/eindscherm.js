// Scherm 07: gefeliciteerd.
import { speelFanfare } from './geluid.js';
import { kopHtml, homeKnopHtml, koppelNavigatie, maakScherm } from './onderdelen.js';

export function maakEindscherm({ naarHome, naarStart }) {
  const el = maakScherm('eindscherm papier');
  el.innerHTML = `
    ${kopHtml()}
    <main class="eind-hoofd">
      <img class="eind-toeter" src="beeld/toeter.png" alt="Een middeleeuwse muzikant die op een lange toeter blaast">
      <h1 class="eind-titel" tabindex="-1">Gefeliciteerd!</h1>
      <p class="eind-tekst">Je hebt alle wapens getekend. Daarmee lees je de taal van de heraldiek al een stuk beter dan de meeste mensen. Nieuwsgierig geworden? Zoek het wapen van je eigen gemeente op en kijk of je de beschrijving nu kunt lezen.</p>
    </main>
    <footer class="voet">
      <div>${homeKnopHtml()}</div>
      <div></div>
    </footer>`;
  koppelNavigatie(el, { naarStart, naarHome });
  return {
    element: el,
    titel: 'Gefeliciteerd!',
    opgebouwd() {
      speelFanfare('einde');
    },
  };
}
