// Tekenmotor: streken als lijst van handelingen (voor ongedaan maken en opnieuw),
// getekend op een interne laag met vaste resolutie, getoond binnen het masker van het schild.

export const INTERNE_HOOGTE = 1600;      // px van de interne tekenlaag (scherp, ook op grote schermen)
export const REFERENTIE_SCHILDHOOGTE = 534.6; // schildhoogte op 1440 × 810: min(66vh, 540px)
export const PEN_DIKTE = 0.24;           // dikte van de kalligrafiepen t.o.v. zijn lengte
const TEKENVLAK_KLEUR = '#f6f0e5';
const TUSSENSTAND_ELKE = 25;  // na hoeveel handelingen een kopie van de laag wordt bewaard
const MAX_TUSSENSTANDEN = 8;

// Formaat in px op het referentieformaat → eenheden op de interne laag.
export function naarEenheden(px) {
  return (px * INTERNE_HOOGTE) / REFERENTIE_SCHILDHOOGTE;
}

const PEN_HOEK = { 'pen-rechts': Math.PI / 4, 'pen-links': -Math.PI / 4 };

// Hoekpunten van een veelhoekige kwast rond (0,0), of null voor rond.
function kwastVeelhoek(vorm, maat) {
  const h = maat / 2;
  if (vorm === 'vierkant') return [[-h, -h], [h, -h], [h, h], [-h, h]];
  if (vorm in PEN_HOEK) {
    const t = Math.max((maat * PEN_DIKTE) / 2, 1);
    const c = Math.cos(PEN_HOEK[vorm]), s = Math.sin(PEN_HOEK[vorm]);
    return [[-h, -t], [h, -t], [h, t], [-h, t]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
  }
  return null;
}

// Convexe omhullende (monotone ketting).
function omhullende(punten) {
  const p = punten.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kruis = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const onder = [];
  for (const q of p) {
    while (onder.length >= 2 && kruis(onder[onder.length - 2], onder[onder.length - 1], q) <= 0) onder.pop();
    onder.push(q);
  }
  const boven = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (boven.length >= 2 && kruis(boven[boven.length - 2], boven[boven.length - 1], q) <= 0) boven.pop();
    boven.push(q);
  }
  return onder.slice(0, -1).concat(boven.slice(0, -1));
}

function vulVeelhoek(ctx, punten) {
  ctx.beginPath();
  ctx.moveTo(punten[0][0], punten[0][1]);
  for (let i = 1; i < punten.length; i++) ctx.lineTo(punten[i][0], punten[i][1]);
  ctx.closePath();
  ctx.fill();
}

// Tekent het stuk van een streek tussen punt a en punt b (b mag gelijk zijn aan a: een stip).
function tekenStuk(ctx, streek, a, b) {
  const { vorm, maat } = streek;
  const veelhoek = kwastVeelhoek(vorm, maat);
  if (!veelhoek) {
    if (a[0] === b[0] && a[1] === b[1]) {
      ctx.beginPath();
      ctx.arc(a[0], a[1], maat / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = maat;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    return;
  }
  // De kwast schuift van a naar b: het geraakte vlak is de omhullende van de kwast op a en op b.
  const pa = veelhoek.map(([x, y]) => [x + a[0], y + a[1]]);
  if (a[0] === b[0] && a[1] === b[1]) return vulVeelhoek(ctx, pa);
  const pb = veelhoek.map(([x, y]) => [x + b[0], y + b[1]]);
  vulVeelhoek(ctx, omhullende(pa.concat(pb)));
}

function zetPenseel(ctx, streek) {
  ctx.globalCompositeOperation = streek.gum ? 'destination-out' : 'source-over';
  ctx.fillStyle = streek.kleur || '#000';
  ctx.strokeStyle = streek.kleur || '#000';
}

function tekenStreek(ctx, streek, vanaf = 0) {
  zetPenseel(ctx, streek);
  const p = streek.punten;
  if (p.length === 1 || vanaf === 0) tekenStuk(ctx, streek, p[0], p[0]);
  for (let i = Math.max(1, vanaf); i < p.length; i++) tekenStuk(ctx, streek, p[i - 1], p[i]);
  ctx.globalCompositeOperation = 'source-over';
}

export class Tekenbord {
  constructor({ canvas, schild, bijWijziging }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.schild = schild;
    this.bijWijziging = bijWijziging || (() => {});

    this.ih = INTERNE_HOOGTE;
    this.ib = Math.round(INTERNE_HOOGTE * schild.verhouding);
    this.laag = document.createElement('canvas');
    this.laag.width = this.ib;
    this.laag.height = this.ih;
    this.lctx = this.laag.getContext('2d');

    this.handelingen = []; // { soort: 'streek', ... } of { soort: 'wissen' }
    this.aantal = 0;       // hoeveel handelingen er nu gelden (de rest is "opnieuw")
    this.huidig = null;    // streek die nu getekend wordt
    this.renderGepland = false;
    this.tussenstanden = new Map(); // aantal handelingen → kopie van de laag (maakt ongedaan maken snel)
  }

  // ---------- Afmetingen ----------

  zetWeergave(cssBreedte, cssHoogte) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(cssBreedte * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHoogte * dpr));
    this.cssBreedte = cssBreedte;
    this.cssHoogte = cssHoogte;
    this.render();
  }

  // Schermcoördinaten (t.o.v. het tekenvlak, in css-px) → interne eenheden.
  naarIntern(x, y) {
    return [(x / this.cssBreedte) * this.ib, (y / this.cssHoogte) * this.ih];
  }

  // ---------- Tekenen ----------

  beginStreek(punt, { kleur, vorm, maatPx, gum }) {
    this.huidig = { soort: 'streek', kleur, vorm, maat: naarEenheden(maatPx), gum: !!gum, punten: [punt] };
    tekenStreek(this.lctx, this.huidig);
    this.planRender();
  }

  verlengStreek(punten) {
    if (!this.huidig || punten.length === 0) return;
    const vanaf = this.huidig.punten.length;
    for (const p of punten) {
      const laatste = this.huidig.punten[this.huidig.punten.length - 1];
      if (Math.abs(p[0] - laatste[0]) < 0.5 && Math.abs(p[1] - laatste[1]) < 0.5) continue;
      this.huidig.punten.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
    }
    if (this.huidig.punten.length > vanaf) {
      tekenStreek(this.lctx, this.huidig, vanaf);
      this.planRender();
    }
  }

  eindStreek() {
    if (!this.huidig) return;
    const streek = this.huidig;
    this.huidig = null;
    this.voegToe(streek);
  }

  get bezig() { return this.huidig !== null; }

  // ---------- Handelingen ----------

  voegToe(handeling) {
    this.handelingen.length = this.aantal; // "opnieuw" vervalt bij een nieuwe handeling
    for (const k of this.tussenstanden.keys()) if (k > this.aantal) this.tussenstanden.delete(k);
    this.handelingen.push(handeling);
    this.aantal = this.handelingen.length;
    if (handeling.soort === 'wissen') this.herteken();
    if (this.aantal % TUSSENSTAND_ELKE === 0) this.bewaarTussenstand();
    this.bijWijziging();
  }

  wisAlles() {
    if (!this.heeftTekening()) return;
    this.voegToe({ soort: 'wissen' });
  }

  kanOngedaan() { return this.aantal > 0 && !this.bezig; }
  kanOpnieuw() { return this.aantal < this.handelingen.length && !this.bezig; }

  ongedaan() {
    if (!this.kanOngedaan()) return;
    this.aantal--;
    this.herteken();
    this.bijWijziging();
  }

  opnieuw() {
    if (!this.kanOpnieuw()) return;
    this.aantal++;
    this.herteken();
    this.bijWijziging();
  }

  // Is er (na de laatste keer "alles wissen") met de kwast getekend?
  heeftTekening() {
    for (let i = this.aantal - 1; i >= 0; i--) {
      const h = this.handelingen[i];
      if (h.soort === 'wissen') return false;
      if (h.soort === 'streek' && !h.gum) return true;
    }
    return false;
  }

  bewaarTussenstand() {
    const kopie = document.createElement('canvas');
    kopie.width = this.ib;
    kopie.height = this.ih;
    kopie.getContext('2d').drawImage(this.laag, 0, 0);
    this.tussenstanden.set(this.aantal, kopie);
    while (this.tussenstanden.size > MAX_TUSSENSTANDEN) {
      this.tussenstanden.delete(Math.min(...this.tussenstanden.keys()));
    }
  }

  herteken() {
    this.lctx.clearRect(0, 0, this.ib, this.ih);
    let start = 0;
    for (let i = this.aantal - 1; i >= 0; i--) {
      if (this.handelingen[i].soort === 'wissen') { start = i + 1; break; }
    }
    // Begin bij de dichtstbijzijnde bewaarde tussenstand, als die er is.
    let beste = -1;
    for (const k of this.tussenstanden.keys()) if (k >= start && k <= this.aantal && k > beste) beste = k;
    if (beste > start) {
      this.lctx.drawImage(this.tussenstanden.get(beste), 0, 0);
      start = beste;
    }
    for (let i = start; i < this.aantal; i++) {
      const h = this.handelingen[i];
      if (h.soort === 'streek') tekenStreek(this.lctx, h);
    }
    this.render();
  }

  // ---------- Weergave ----------

  planRender() {
    if (this.renderGepland) return;
    this.renderGepland = true;
    requestAnimationFrame(() => {
      this.renderGepland = false;
      this.render();
    });
  }

  render() {
    const { ctx, canvas } = this;
    tekenSamengesteld(ctx, canvas.width, canvas.height, this.laag, this.schild.masker);
  }

  // Tekening als PNG (data-URL): alleen de streken, afgesneden op het schild, verder doorzichtig.
  // Op 05/06 en in het overzicht staat hij op de schildkleur (#efe3cf).
  // Met achtergrond (bijv. de schildkleur) krijgt het schild zelf die kleur: handig voor thumbnails.
  exporteer(hoogte = 900, achtergrond = null) {
    const c = document.createElement('canvas');
    c.height = hoogte;
    c.width = Math.round(hoogte * this.schild.verhouding);
    tekenSamengesteld(c.getContext('2d'), c.width, c.height, this.laag, this.schild.masker, achtergrond);
    return c.toDataURL('image/png');
  }
}

function tekenSamengesteld(ctx, b, h, laag, masker, achtergrond = TEKENVLAK_KLEUR) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, b, h);
  if (achtergrond) {
    ctx.fillStyle = achtergrond;
    ctx.fillRect(0, 0, b, h);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(laag, 0, 0, b, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(masker, 0, 0, b, h);
  ctx.restore();
}
