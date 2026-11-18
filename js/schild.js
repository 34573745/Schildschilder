// Leidt de vorm van een schild af uit het eigen SVG-bestand van het wapen (overdracht § 5).
//
// De SVG wordt onzichtbaar gerenderd. Uit de pixels halen we:
//  - de werkelijke zichtbare rand (zonder de onzichtbare marges van de viewBox),
//  - een masker (het schild als dichte vorm, gaatjes tussen onderdelen opgevuld),
//  - de omtrek als pad, voor de stippellijn.
// Bijna onzichtbare snippers (lage dekking) en glans/schaduw tellen niet mee.

const ANALYSE_HOOGTE = 1600; // px waarop het hele viewBox-vlak wordt geanalyseerd
const DREMPEL = 127;          // dekking (0-255) waarboven een pixel bij het schild hoort

const cache = new Map();

export function laadSchild(wapen) {
  if (!cache.has(wapen.id)) cache.set(wapen.id, maakSchild(wapen));
  return cache.get(wapen.id);
}

async function maakSchild(wapen) {
  const url = `wapens/${encodeURIComponent(wapen.afbeelding)}`;
  const antwoord = await fetch(url);
  if (!antwoord.ok) throw new Error(`Kan ${url} niet laden`);
  const tekst = await antwoord.text();

  const svgDoc = new DOMParser().parseFromString(tekst, 'image/svg+xml');
  const svg = svgDoc.documentElement;
  const [vx, vy, vw, vh] = leesViewBox(svg);

  const schaal = ANALYSE_HOOGTE / vh;
  const W = Math.round(vw * schaal);
  const H = ANALYSE_HOOGTE;

  // Firefox tekent een SVG zonder eigen breedte/hoogte niet op een canvas: zet die er dus in.
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const blobUrl = URL.createObjectURL(blob);
  const img = await laadAfbeelding(blobUrl);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const pixels = ctx.getImageData(0, 0, W, H).data;

  // 1. Welke pixels horen duidelijk bij het schild?
  const vol = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) vol[i] = pixels[i * 4 + 3] > DREMPEL ? 1 : 0;

  // 2. Alles wat vanaf de rand van het vlak bereikbaar is zonder door het schild te gaan, is "buiten".
  //    Wat overblijft is "binnen": zo worden kiertjes tussen onderdelen van het wapen opgevuld.
  //    Eerst verdikken we het schild een paar pixels, zodat ook haarfijne kieren die tot de rand
  //    doorlopen dicht zijn; daarna zetten we "buiten" weer even ver terug (morfologische sluiting).
  const R_SLUIT = 4; // ca. 0,25 % van de analysehoogte
  const buiten = verdik(vulVanafRand(verdik(vol, W, H, R_SLUIT), W, H), W, H, R_SLUIT);

  // 3. Zichtbare rand (bounding box van binnen).
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!buiten[y * W + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`Geen schild gevonden in ${wapen.afbeelding}`);
  const mb = x1 - x0 + 1;
  const mh = y1 - y0 + 1;

  // 4. Masker: binnen = dicht; buiten direct naast de rand houdt zijn eigen (lage) dekking voor een zachte rand.
  const masker = document.createElement('canvas');
  masker.width = mb;
  masker.height = mh;
  const mctx = masker.getContext('2d');
  const md = mctx.createImageData(mb, mh);
  const binnen = new Uint8Array(mb * mh);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mb; x++) {
      const bron = (y + y0) * W + (x + x0);
      if (!buiten[bron]) binnen[y * mb + x] = 1;
    }
  }
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mb; x++) {
      const i = y * mb + x;
      let a = 0;
      if (binnen[i]) a = 255;
      else if (grenstAanBinnen(binnen, mb, mh, x, y)) a = pixels[((y + y0) * W + (x + x0)) * 4 + 3];
      md.data[i * 4 + 3] = a;
    }
  }
  mctx.putImageData(md, 0, 0);

  // 5. Omtrek voor de stippellijn.
  const punten = vereenvoudig(volgRand(binnen, mb, mh), 0.8);
  const d = 'M' + punten.map(([x, y]) => `${(x + 0.5).toFixed(1)},${(y + 0.5).toFixed(1)}`).join('L') + 'Z';

  // Officieel wapen, bijgesneden tot de zichtbare rand (zodat het optisch uitlijnt met de tekening).
  const bijgesneden = svgDoc.documentElement.cloneNode(true);
  const bx = vx + x0 / schaal, by = vy + y0 / schaal, bb = mb / schaal, bh = mh / schaal;
  bijgesneden.setAttribute('viewBox', `${bx} ${by} ${bb} ${bh}`);
  bijgesneden.setAttribute('width', Math.round(bb * 4));
  bijgesneden.setAttribute('height', Math.round(bh * 4));
  bijgesneden.setAttribute('preserveAspectRatio', 'none');
  const officieelUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(bijgesneden)], { type: 'image/svg+xml' }));

  return {
    wapen,
    blobUrl,
    officieelUrl,        // het officiële wapen, bijgesneden
    maskerUrl: masker.toDataURL('image/png'), // voor CSS mask-image
    // Bijsnijding in SVG-eenheden (voor het officiële wapen naast de tekening).
    bijsnijding: { x: bx, y: by, b: bb, h: bh },
    verhouding: mb / mh, // breedte / hoogte van de zichtbare vorm
    masker,              // canvas mb × mh, alfa = schildvorm
    omtrek: { d, breedte: mb, hoogte: mh },
  };
}

function leesViewBox(svg) {
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return vb;
  const b = parseFloat(svg.getAttribute('width'));
  const h = parseFloat(svg.getAttribute('height'));
  if (b > 0 && h > 0) {
    svg.setAttribute('viewBox', `0 0 ${b} ${h}`);
    return [0, 0, b, h];
  }
  throw new Error('SVG zonder viewBox of afmetingen');
}

function laadAfbeelding(src) {
  return new Promise((ok, fout) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fout(new Error('Afbeelding laden mislukt'));
    img.src = src;
  });
}

function vulVanafRand(vol, W, H) {
  const buiten = new Uint8Array(W * H);
  const stapel = new Int32Array(W * H);
  let n = 0;
  const duw = (i) => {
    if (!vol[i] && !buiten[i]) {
      buiten[i] = 1;
      stapel[n++] = i;
    }
  };
  for (let x = 0; x < W; x++) { duw(x); duw((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { duw(y * W); duw(y * W + W - 1); }
  while (n > 0) {
    const i = stapel[--n];
    const x = i % W;
    if (x > 0) duw(i - 1);
    if (x < W - 1) duw(i + 1);
    if (i >= W) duw(i - W);
    if (i < W * (H - 1)) duw(i + W);
  }
  return buiten;
}

// Verdikt een 0/1-raster met een vierkant van (2r+1) × (2r+1).
function verdik(bron, W, H, r) {
  const tussen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const rij = y * W;
    for (let x = 0; x < W; x++) {
      if (!bron[rij + x]) continue;
      const a = Math.max(0, x - r), z = Math.min(W - 1, x + r);
      for (let k = a; k <= z; k++) tussen[rij + k] = 1;
    }
  }
  const uit = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!tussen[y * W + x]) continue;
      const a = Math.max(0, y - r), z = Math.min(H - 1, y + r);
      for (let k = a; k <= z; k++) uit[k * W + x] = 1;
    }
  }
  return uit;
}

function grenstAanBinnen(binnen, b, h, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < b && ny < h && binnen[ny * b + nx]) return true;
    }
  }
  return false;
}

// Moore-buurtvolging langs de buitenrand van het "binnen"-gebied.
function volgRand(binnen, b, h) {
  const isBinnen = (x, y) => x >= 0 && y >= 0 && x < b && y < h && binnen[y * b + x] === 1;
  let sx = -1, sy = -1;
  zoek: for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      if (isBinnen(x, y)) { sx = x; sy = y; break zoek; }
    }
  }
  // Richtingen met de klok mee (y naar beneden): W, NW, N, NO, O, ZO, Z, ZW
  const R = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const punten = [[sx, sy]];
  let cx = sx, cy = sy, terug = 0; // we kwamen "van het westen" (buiten)
  const max = b * h * 2;
  for (let stap = 0; stap < max; stap++) {
    let gevonden = false;
    for (let k = 1; k <= 8; k++) {
      const r = (terug + k) % 8;
      const nx = cx + R[r][0], ny = cy + R[r][1];
      if (isBinnen(nx, ny)) {
        const vorige = (r + 7) % 8;
        const px = cx + R[vorige][0], py = cy + R[vorige][1];
        cx = nx; cy = ny;
        terug = R.findIndex(([dx, dy]) => dx === px - cx && dy === py - cy);
        gevonden = true;
        break;
      }
    }
    if (!gevonden) break; // losse pixel
    if (cx === sx && cy === sy) break;
    punten.push([cx, cy]);
  }
  return punten;
}

// Ramer–Douglas–Peucker
function vereenvoudig(punten, eps) {
  if (punten.length < 3) return punten;
  const houd = new Uint8Array(punten.length);
  houd[0] = houd[punten.length - 1] = 1;
  const stapel = [[0, punten.length - 1]];
  while (stapel.length) {
    const [a, z] = stapel.pop();
    const [ax, ay] = punten[a], [zx, zy] = punten[z];
    const dx = zx - ax, dy = zy - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < z; i++) {
      const [px, py] = punten[i];
      const dist = Math.abs(dy * px - dx * py + zx * ay - zy * ax) / len;
      if (dist > maxD) { maxD = dist; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      houd[idx] = 1;
      stapel.push([a, idx], [idx, z]);
    }
  }
  return punten.filter((_, i) => houd[i]);
}
