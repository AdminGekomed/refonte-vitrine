/* Page mère (page-portail.php).
   1. Variante « portes » : zones à épargner (visages, produits) posées sur les photos, pour que la ligne lime de
      ligne-entete.js traverse les deux portes sans couvrir l'essentiel. Ce script passe avant ligne-entete.js.
   2. Variante « boucle » : une seule ligne entre par le bord gauche, fait une boucle d'écriture autour de la photo
      de la marque, passe en creux entre les deux photos, fait une boucle autour de celle du reconditionnement et
      sort par le bord droit. Chaque boucle est construite par le cap, comme les autres lignes du site (entrée progressive,
      sommet serré, sortie progressive) : la ligne se croise en X au pied de la boucle, sans rond refermé.
      Sur écran étroit, une boucle par photo, chacune d'un bord à l'autre. */
(() => {
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

 // 1. Zones à épargner : data-eviter="x1 y1 x2 y2; …" en fractions de l'image, ramenées au cadrage
 //    object-fit: cover et object-position de la photo.
 const portes = document.querySelector('.gp-portes');
 if (portes) {
  const poser = () => {
   portes.querySelectorAll('.gp-eviter').forEach(el => el.remove());
   const box = portes.getBoundingClientRect();
   portes.querySelectorAll('img[data-eviter]').forEach(img => {
    const r = img.getBoundingClientRect(), nw = +img.getAttribute('width'), nh = +img.getAttribute('height');
    const k = Math.max(r.width / nw, r.height / nh), w = nw * k, h = nh * k;
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const ox = (r.width - w) * px, oy = (r.height - h) * py;
    img.dataset.eviter.split(';').forEach(z => {
     const [x1, y1, x2, y2] = z.trim().split(/\s+/).map(Number);
     const l = Math.max(0, ox + x1 * w), t = Math.max(0, oy + y1 * h), rr = Math.min(r.width, ox + x2 * w), b = Math.min(r.height, oy + y2 * h);
     if (rr <= l || b <= t) return;
     const el = document.createElement('span');
     el.className = 'gp-eviter';
     el.setAttribute('aria-hidden', 'true');
     el.style.cssText = `left:${r.left - box.left + l}px;top:${r.top - box.top + t}px;width:${rr - l}px;height:${b - t}px`;
     el.appendChild(document.createElement('i'));
     portes.appendChild(el);
    });
   });
  };
  poser();
  addEventListener('resize', poser);
 }

 // 2. La boucle.
 const huit = document.querySelector('[data-huit]');
 if (!huit) return;
 const svg = huit.querySelector('.gp-huit__ligne'), path = svg.querySelector('path');
 const TAU = Math.PI * 2, f = v => Math.round(v * 10) / 10;
 const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
 const phi = (s, m, sd) => 0.5 * (1 + erf((s - m) / (sd * Math.SQRT2)));

 // Boucle unitaire : le cap tourne d'un tour complet (sens dir) à vitesse régulière entre 30 % et 70 % du tracé,
 // avec une entrée et une sortie très progressives : corps rond, jambages qui se croisent en X.
 // Renvoie le tracé, le point de croisement, le centre du plus grand cercle intérieur et son rayon.
 function boucle(dir) {
  const n = 720, vit = [0];
  let acc = 0;
  for (let i = 1; i <= n; i++) { const s = (i - 0.5) / n; acc += phi(s, 0.3, 0.13) - phi(s, 0.7, 0.13); vit.push(acc); }
  const pts = [[0, 0]];
  let x = 0, y = 0;
  for (let i = 1; i <= n; i++) {
   const cap = dir * TAU * vit[i] / acc;
   x += Math.cos(cap) / n; y += Math.sin(cap) / n;
   pts.push([x, y]);
  }
  // Croisement : le segment i croise le segment j.
  const inter = (a, b, c, d) => {
   const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
   if (!den) return null;
   const u = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, v = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
   return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [a[0] + u * r[0], a[1] + u * r[1]] : null;
  };
  let ci = -1, cj = -1, X = null;
  for (let i = 0; i < n && !X; i++) for (let j = i + 40; j < n; j++) { const p = inter(pts[i], pts[i + 1], pts[j], pts[j + 1]); if (p) { ci = i; cj = j; X = p; break; } }
  const poly = pts.slice(ci + 1, cj + 1);
  const dedans = (px, py) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const marge = (px, py) => poly.reduce((m, [qx, qy]) => Math.min(m, Math.hypot(qx - px, qy - py)), Infinity);
  let xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  let best = [0, 0], r = 0, l = Math.min(...xs), rt = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
  for (let pas = 0; pas < 3; pas++) {
   const g = 24;
   for (let a = 0; a <= g; a++) for (let c = 0; c <= g; c++) {
    const px = l + ((rt - l) * a) / g, py = t + ((b - t) * c) / g;
    if (!dedans(px, py)) continue;
    const m = marge(px, py);
    if (m > r) { r = m; best = [px, py]; }
   }
   const w = (rt - l) / 6, h = (b - t) / 6;
   [l, rt, t, b] = [best[0] - w, best[0] + w, best[1] - h, best[1] + h];
  }
  return { pts, ci, cj, X, centre: best, r };
 }
 // Place la boucle autour d'une photo : le croisement du côté demandé (angle de l'axe croisement → centre).
 function autour(photo, dir, axe, epaisseur) {
  const u = boucle(dir), jeu = Math.max(18, photo.R * 0.12) + epaisseur / 2, k = (photo.R + jeu) / u.r;
  const a0 = Math.atan2(u.centre[1] - u.X[1], u.centre[0] - u.X[0]), rot = axe - a0, co = Math.cos(rot), si = Math.sin(rot);
  const tr = ([x, y]) => { const dx = x - u.centre[0], dy = y - u.centre[1]; return [photo.x + k * (dx * co - dy * si), photo.y + k * (dx * si + dy * co)]; };
  // Jambages raccourcis : environ un demi-rayon de photo de part et d'autre du croisement.
  const pas = Math.max(4, Math.round((photo.R * 0.5) / (k / u.pts.length)));
  const pts = u.pts.slice(Math.max(0, u.ci - pas), Math.min(u.pts.length, u.cj + pas)).map(tr);
  const dirn = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m]; };
  return { pts, debut: pts[0], fin: pts[pts.length - 1], tDebut: dirn(pts[0], pts[3]), tFin: dirn(pts[pts.length - 4], pts[pts.length - 1]) };
 }
 // Raccord en Bézier qui respecte la direction de départ et d'arrivée.
 const raccord = (a, ta, b, tb, n = 50) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.42;
  const c1 = [a[0] + ta[0] * L, a[1] + ta[1] * L], c2 = [b[0] - tb[0] * L, b[1] - tb[1] * L];
  return Array.from({ length: n }, (_, i) => {
   const t = (i + 1) / n, v = 1 - t;
   return [v * v * v * a[0] + 3 * v * v * t * c1[0] + 3 * v * t * t * c2[0] + t * t * t * b[0], v * v * v * a[1] + 3 * v * v * t * c1[1] + 3 * v * t * t * c2[1] + t * t * t * b[1]];
  });
 };
 // Courbe de Catmull-Rom convertie en Bézier : continue et sans angle (même méthode que ligne-entete.js).
 const toPath = pts => {
  const p = pts.filter((_, i) => i % 4 === 0);
  if (p[p.length - 1] !== pts[pts.length - 1]) p.push(pts[pts.length - 1]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
   const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
   d += `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
  }
  return d;
 };
 let largeur = 0;
 const tracer = animer => {
  const corps = Array.from(huit.querySelectorAll('.gp-lobe__body')), cadres = Array.from(huit.querySelectorAll('.gp-lobe__photo'));
  [...corps, ...cadres].forEach(c => c.style.removeProperty('margin-top'));
  let box = huit.getBoundingClientRect();
  const W = box.width;
  largeur = W;
  const mesurer = () => cadres.map(el => {
   const r = el.getBoundingClientRect();
   return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, R: r.width / 2 };
  });
  let photos = mesurer();
  if (photos.length < 2) return;
  // L'une sous l'autre : la boucle dépasse au-dessus de la photo ; on laisse cette place au-dessus de chacune.
  if (photos[1].y - photos[0].y >= photos[0].R) {
   const ep0 = parseFloat(getComputedStyle(path).strokeWidth) || 24;
   cadres.forEach((el, i) => {
    const p = photos[i], dessus = p.y - p.R - Math.min(...autour(p, -1, -Math.PI / 2 - 0.1, ep0).pts.map(q => q[1])) + ep0 / 2 + 24;
    if (i > 0 && dessus > 0) el.style.marginTop = `${Math.round(dessus)}px`;
   });
   box = huit.getBoundingClientRect();
   photos = mesurer();
  }
  const ep = parseFloat(getComputedStyle(path).strokeWidth) || 24, gauche = -W * 0.04, droite = W * 1.04, E = [1, 0];
  const cote = photos[1].y - photos[0].y < photos[0].R;
  let traces;
  if (cote) {
   // Côte à côte : deux boucles d'écriture, croisement sous chaque photo, comme deux « e » liés. Entre les deux,
   // la ligne descend en creux puis remonte : jamais de passage droit.
   const [a, b] = photos, ba = autour(a, -1, -Math.PI / 2 - 0.1, ep), bb = autour(b, -1, -Math.PI / 2 + 0.1, ep);
   const creux = [(ba.fin[0] + bb.debut[0]) / 2, Math.max(ba.fin[1], bb.debut[1]) + a.R * 0.32];
   const pts = [[gauche, a.y + a.R * 0.1]];
   pts.push(...raccord(pts[0], E, ba.debut, ba.tDebut), ...ba.pts.slice(1));
   pts.push(...raccord(ba.fin, ba.tFin, creux, E), ...raccord(creux, E, bb.debut, bb.tDebut), ...bb.pts.slice(1));
   pts.push(...raccord(bb.fin, bb.tFin, [droite, b.y + b.R * 0.1], E));
   traces = [pts];
  } else {
   // L'une sous l'autre : une ligne par photo, croisement en dessous, chacune d'un bord à l'autre.
   traces = photos.map(p => {
    const bo = autour(p, -1, -Math.PI / 2 - 0.12, ep), pts = [[gauche, p.y - p.R * 0.2]];
    pts.push(...raccord(pts[0], E, bo.debut, bo.tDebut), ...bo.pts.slice(1));
    pts.push(...raccord(bo.fin, bo.tFin, [droite, p.y + p.R * 0.1], E));
    return pts;
   });
  }
  // Le texte passe sous la ligne : on le descend juste ce qu'il faut sous le point le plus bas des boucles
  // (même écart pour les deux colonnes, pour que les textes restent alignés).
  const ecart = Math.max(...photos.map(p => traces.flat().filter(([x, y]) => Math.abs(x - p.x) < p.R * 1.6 && y > p.y && y < p.y + p.R * 3).reduce((m, [, y]) => Math.max(m, y), p.y + p.R) + ep / 2 + 36 - (p.y + p.R)));
  if (corps[0] && ecart > parseFloat(getComputedStyle(corps[0]).marginTop)) corps.forEach(c => { c.style.marginTop = `${Math.round(ecart)}px`; });
  // Repère en pixels, mesuré après le décalage du texte (la zone ne grandit que vers le bas).
  svg.setAttribute('viewBox', `0 0 ${Math.round(W)} ${Math.round(huit.getBoundingClientRect().height)}`);
  path.setAttribute('d', traces.map(toPath).join(''));
  if (!animer) { svg.classList.add('is-drawn'); return; }
  svg.classList.remove('is-drawn');
  svg.getBoundingClientRect();
  requestAnimationFrame(() => svg.classList.add('is-drawn'));
 };
 (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => tracer(!reduce), reduce ? 0 : 300));
 let t;
 addEventListener('resize', () => {
  clearTimeout(t);
  t = setTimeout(() => { if (Math.abs(huit.getBoundingClientRect().width - largeur) > 1) tracer(false); }, 200);
 });
})();
