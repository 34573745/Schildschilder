// Alle maten in de CSS zijn ontworpen op 1440 × 810 en worden vermenigvuldigd met --u.
// Bij kleinere vensters krimpt --u mee, zodat elk scherm zonder scrollen past
// (gegarandeerd netjes tot 1280 × 640; daaronder wordt alles nog kleiner).
// Op grotere schermen groeit alles mee, tot maximaal twee keer het ontwerpformaat.

export const REFERENTIE_BREEDTE = 1440;
export const REFERENTIE_HOOGTE = 810;
const MINIMUM = 0.5;
const MAXIMUM = 2;

let schaal = 1;

export function huidigeSchaal() {
  return schaal;
}

export function werkSchaalBij() {
  const s = Math.min(window.innerWidth / REFERENTIE_BREEDTE, window.innerHeight / REFERENTIE_HOOGTE);
  schaal = Math.max(MINIMUM, Math.min(MAXIMUM, s));
  document.documentElement.style.setProperty('--u', `${schaal}px`);
  return schaal;
}
