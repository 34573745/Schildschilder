// Een lullig middeleeuws trompetje bij het onthullen (05) en op het eindscherm (07),
// gemaakt met de Web Audio API (geen geluidsbestand nodig).
//
// Browsers laten geen geluid afspelen voordat de bezoeker iets heeft aangeklikt of getypt.
// Daarom speelt het trompetje alleen als er al een interactie is geweest; anders blijft het stil
// (en komt het ook niet alsnog later, op een vreemd moment).

const NOTEN = { G4: 392.0, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0 };

// [noot, duur in seconden, { buig: centen omlaag aan het eind }]
export const FANFARES = {
  // Onthullen: een kort "ta-ta-taaa" terwijl het schild omklapt (ca. 0,8 s), in dezelfde stijl.
  onthul: [['C5', 0.11], ['E5', 0.11], ['G5', 0.58, { buig: 60 }]],
  // Gefeliciteerd: een klein heraut-melodietje van drie zinnetjes (ca. 2,7 s), met een slap staartje.
  // Bewust korter dan 3 seconden: langer geluid dat vanzelf speelt, hoort een stopknop te hebben.
  einde: [
    ['G4', 0.13], ['C5', 0.13], ['E5', 0.13], ['G5', 0.4],
    ['F5', 0.13], ['E5', 0.13], ['F5', 0.13], ['A5', 0.4],
    ['G5', 0.13], ['E5', 0.13], ['D5', 0.13], ['C5', 0.75, { buig: 70 }],
  ],
};

const VOLUME = 0.28;

let context = null;

export function speelFanfare(naam) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  // Nog geen interactie geweest? Dan mag de browser toch niets afspelen: stil blijven.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    context = context || new AC();
    const speel = () => schrijfFanfare(context, context.destination, FANFARES[naam], context.currentTime + 0.05);
    if (context.state === 'suspended') context.resume().then(speel, () => {});
    else speel();
  } catch {
    /* geen geluid mogelijk: geen probleem */
  }
}

// Schrijft de fanfare in een (Offline)AudioContext. Los gehouden zodat hij ook offline te renderen is.
export function schrijfFanfare(ctx, uit, reeks, start) {
  const hoofd = ctx.createGain();
  hoofd.gain.value = VOLUME;
  hoofd.connect(uit);
  let t = start;
  for (const [noot, duur, opties = {}] of reeks) {
    blaas(ctx, hoofd, NOTEN[noot], t, duur * 0.88, opties.buig || 0);
    t += duur;
  }
  return t - start;
}

// Eén geblazen toon: zaagtand + blokgolf door een filter dat bij de aanzet "opengaat" (koperklank),
// met een kleine aanloop in toonhoogte, en vibrato op lange tonen.
function blaas(ctx, uit, freq, t, duur, buig) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(freq * 1.2, t);
  filter.frequency.linearRampToValueAtTime(freq * 6, t + 0.035);
  filter.frequency.exponentialRampToValueAtTime(freq * 3.2, t + 0.15);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.025);
  env.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
  env.gain.setValueAtTime(0.7, t + Math.max(0.12, duur - 0.06));
  env.gain.exponentialRampToValueAtTime(0.0001, t + duur);

  filter.connect(env);
  env.connect(uit);

  const lfo = ctx.createOscillator();
  const lfoDiepte = ctx.createGain();
  lfo.frequency.value = 5.2;
  lfoDiepte.gain.setValueAtTime(0, t);
  if (duur > 0.3) lfoDiepte.gain.linearRampToValueAtTime(14, t + duur); // vibrato zwelt aan (centen)
  lfo.connect(lfoDiepte);

  for (const [vorm, mengsel, ontstem] of [['sawtooth', 0.6, 0], ['square', 0.25, 7]]) {
    const osc = ctx.createOscillator();
    osc.type = vorm;
    osc.frequency.value = freq;
    osc.detune.setValueAtTime(-45 + ontstem, t); // inzetten iets te laag…
    osc.detune.linearRampToValueAtTime(ontstem, t + 0.05); // …en dan omhoog
    if (buig) {
      osc.detune.setValueAtTime(ontstem, t + duur * 0.55);
      osc.detune.linearRampToValueAtTime(ontstem - buig, t + duur); // slap staartje
    }
    lfoDiepte.connect(osc.detune);
    const g = ctx.createGain();
    g.gain.value = mengsel;
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    osc.stop(t + duur + 0.02);
  }
  lfo.start(t);
  lfo.stop(t + duur + 0.02);
}
