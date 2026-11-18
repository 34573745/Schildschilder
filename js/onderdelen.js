// Kleine gedeelde bouwstenen voor de schermen.

export function kopHtml() {
  return `<header class="kop">
    <a class="logo-link" href="./" data-actie="start"><img src="beeld/logo.svg" alt="De Schildschilder"></a>
  </header>`;
}

export function homeKnopHtml() {
  return '<button type="button" class="knop knop-secundair" data-actie="home">home</button>';
}

// Koppelt logo (naar start) en home-knop (naar overzicht) aan een scherm.
export function koppelNavigatie(el, { naarStart, naarHome }) {
  el.querySelector('.logo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    naarStart();
  });
  el.querySelector('[data-actie="home"]')?.addEventListener('click', () => naarHome());
}

export function maakScherm(klasse) {
  const el = document.createElement('div');
  el.className = `scherm ${klasse}`;
  return el;
}
