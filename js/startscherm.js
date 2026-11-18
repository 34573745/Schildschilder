// Scherm 01: start. Ridder, logo en tekst faden in; kort daarna de knop. (Bewust zonder geluid.)
import { maakScherm } from './onderdelen.js';

export function maakStartscherm({ naarOverzicht }) {
  const el = maakScherm('startscherm papier');
  el.innerHTML = `
    <main class="start-hoofd">
      <img class="start-ridder start-in" src="beeld/ridder.png" alt="Een ridder te paard met een blauwe vaandel">
      <h1 class="start-logo start-in" tabindex="-1"><img src="beeld/logo.svg" alt="De Schildschilder"></h1>
      <p class="start-tekst start-in">Blazoeneren kun je leren! Een redelijk leuk tekenspel (als je van dat soort dingen houdt)<br>voor het aanleren van heraldische terminologie.</p>
      <button type="button" class="knop knop-primair knop-groot start-knop">vang aan!</button>
    </main>`;
  el.querySelector('.start-knop').addEventListener('click', () => naarOverzicht());
  return { element: el, titel: '' };
}
