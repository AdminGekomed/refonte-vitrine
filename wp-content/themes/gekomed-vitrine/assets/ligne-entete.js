/* Ligne lime de fond de l'en-tête des pages intérieures.
   À chaque affichage, une nouvelle ligne traverse l'en-tête du bord gauche au bord droit : de grandes courbes
   amples (le cap ondule sans cesse, jamais de ligne droite ni d'angle) et, souvent, une ou deux boucles
   d'écriture liée, de formes et de tailles différentes. Parmi plusieurs tirages, on garde celui qui laisse le texte lisible :
   la ligne peut passer derrière le titre, jamais derrière le chapeau ni la rubrique.
   Le même tracé sert aux calques [data-ligne-fond] : des lignes en fond de page, à des hauteurs variables,
   tracées quand elles arrivent à l'écran ; et aux séparateurs [data-ligne-separateur] entre deux sections. */
(() => {
 const svg = document.querySelector('.gv-page-hero__line');
 const fonds = document.querySelectorAll('[data-ligne-fond]');
 const separateurs = document.querySelectorAll('[data-ligne-separateur]');
 if (!svg && !fonds.length && !separateurs.length) return;
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const TAU = Math.PI * 2;
 const between = (a, b) => a + Math.random() * (b - a);

 // Boucle d'écriture liée, construite par le cap : le trait tourne d'un tour complet en trois temps,
 // une entrée progressive (~90°), un sommet serré (~180°) et une sortie progressive (~90°), avec un léger
 // virage continu sur les jambages entre les trois. Ni pointe ni ligne droite : le cap varie toujours en douceur.
 function makeLoop(c, d, dir) {
  const se = d * between(0.38, 0.6), st = d * between(0.2, 0.32), sx = d * between(0.38, 0.6);
  const wIn = between(0.2, 0.3), wTop = between(0.42, 0.54), wOut = 1 - wIn - wTop, base = between(0.06, 0.12);
  const M = 1600, lo = c - d * 2.6, hi = c + d * 2.6, cdf = new Float64Array(M + 1);
  const bell = (s, m, sg) => Math.exp(-0.5 * ((s - m) / sg) ** 2) / sg;
  let acc = 0;
  for (let i = 1; i <= M; i++) {
   const s = lo + ((hi - lo) * (i - 0.5)) / M, u = (s - (c - d)) / (2 * d);
   acc += wIn * bell(s, c - d, se) + wTop * bell(s, c, st) + wOut * bell(s, c + d, sx) + (u > 0 && u < 1 ? (base * Math.sin(Math.PI * u)) / d : 0);
   cdf[i] = acc;
  }
  for (let i = 0; i <= M; i++) cdf[i] /= acc;
  const turn = s => (s <= lo ? 0 : s >= hi ? 1 : cdf[Math.round(((s - lo) / (hi - lo)) * M)]);
  return { c, d, dir, turn, from: c - d * 1.7, to: c + d * 1.7 };
 }
 // Intègre le cap le long du tracé (longueur 1) : grandes vagues + un tour complet par boucle.
 function integrate(waves, loops, n) {
  const pts = [[0, 0]];
  let x = 0, y = 0;
  for (let i = 1; i <= n; i++) {
   const s = (i - 0.5) / n;
   let cap = 0;
   for (const w of waves) cap += w.a * Math.sin(TAU * w.f * s + w.p);
   for (const l of loops) cap += l.dir * TAU * l.turn(s);
   x += Math.cos(cap) / n; y += Math.sin(cap) / n;
   pts.push([x, y]);
  }
  return pts;
 }
 // Fait entrer la ligne par le bord gauche et sortir par le bord droit (rotation et échelle uniformes).
 function place(pts, from, to) {
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
  const k = Math.hypot(to[0] - from[0], to[1] - from[1]) / Math.hypot(x1 - x0, y1 - y0);
  const rot = Math.atan2(to[1] - from[1], to[0] - from[0]) - Math.atan2(y1 - y0, x1 - x0);
  const c = Math.cos(rot) * k, s = Math.sin(rot) * k;
  return pts.map(([x, y]) => [from[0] + (x - x0) * c - (y - y0) * s, from[1] + (x - x0) * s + (y - y0) * c]);
 }
 const N = 1600;
 const side = () => (Math.random() < 0.5 ? -1 : 1);
 function candidate(W, H, noLoops) {
  const waves = [
   { a: between(0.5, 0.8), f: between(0.6, 1.1), p: between(0, TAU) },
   { a: between(0.06, 0.14), f: between(1.5, 2.4), p: between(0, TAU) },
  ];
  // Une boucle, ou deux de tailles différentes ; sur mobile, une seule, plus grande en proportion.
  const draw = Math.random(), count = noLoops ? 0 : draw < 0.15 ? 0 : draw < 0.68 || W < 700 ? 1 : 2;
  const loops = count === 1 ? [makeLoop(between(0.3, 0.7), W < 700 ? between(0.15, 0.21) : between(0.11, 0.17), side())]
   : count === 2 ? [makeLoop(between(0.22, 0.34), between(0.08, 0.12), side()), makeLoop(between(0.64, 0.78), between(0.1, 0.14), side())] : [];
  const pts = place(integrate(waves, loops, N), [-W * 0.06, between(0.12, 0.6) * H], [W * 1.06, between(0.1, 0.75) * H]);
  const inLoop = new Uint8Array(N + 1);
  // Chaque boucle doit tenir entière dans l'en-tête.
  for (const l of loops) {
   for (let i = Math.max(0, Math.floor(l.from * N)); i <= Math.min(N, Math.ceil(l.to * N)); i++) {
    const [x, y] = pts[i];
    if (x < W * 0.02 || x > W * 0.98 || y < 14 || y > H - 14) return null;
    inLoop[i] = 1;
   }
  }
  return { pts, inLoop, loops: loops.length, biggest: loops.reduce((m, l) => Math.max(m, l.d), 0) };
 }
 const hit = (boxes, x, y) => boxes.some(b => x > b.l && x < b.r && y > b.t && y < b.b);
 // Coût d'un tracé : hors cadre (3), sur le chapeau ou la rubrique (2), boucle sur le titre (2,5),
 // simple passage derrière le titre (0,5), rapporté au nombre de points visibles.
 function score(c, title, other, W, H) {
  let bad = 0, seen = 0;
  for (let i = 0; i < c.pts.length; i += 3) {
   const [x, y] = c.pts[i];
   if (x < 0 || x > W) continue;
   seen++;
   if (y < 12 || y > H - 12) bad += 3;
   else if (hit(other, x, y)) bad += 2;
   else if (hit(title, x, y)) bad += c.inLoop[i] ? 2.5 : 0.5;
  }
  return bad / Math.max(1, seen);
 }
 // Courbe de Catmull-Rom convertie en Bézier : continue et sans angle.
 function toPath(pts) {
  const p = pts.filter((_, i) => i % 5 === 0);
  if (p[p.length - 1] !== pts[pts.length - 1]) p.push(pts[pts.length - 1]);
  const f = v => Math.round(v * 10) / 10;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
   const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
   d += `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
  }
  return d;
 }

 // Meilleur tracé parmi plusieurs tirages (texte à éviter facultatif).
 function tirage(W, H, title = [], other = [], tries = 500) {
  // Le plus souvent on cherche une ligne avec des boucles ; de temps en temps, une simple ondulation suffit.
  const wantLoops = Math.random() < 0.8;
  let best = null, bestScore = Infinity;
  for (let i = 0; i < tries && bestScore > 0.015; i++) {
   const c = candidate(W, H);
   if (!c) continue;
   // Avec boucles, on préfère les grandes.
   const s = score(c, title, other, W, H) + (wantLoops ? (c.loops ? 0.05 * (1 - Math.min(1, c.biggest / (W < 700 ? 0.2 : 0.16))) : 0.08) : 0);
   if (s < bestScore) { best = c.pts; bestScore = s; }
  }
  return best || candidate(W, H, true).pts;
 }

 // 1. En-tête des pages intérieures.
 if (svg) {
  const hero = svg.closest('.gv-page-hero'), path = svg.querySelector('path');
  let width = 0;
  const render = animate => {
   const rect = hero.getBoundingClientRect(), W = rect.width, H = rect.height, m = 18;
   width = W;
   const boxes = selector => Array.from(hero.querySelectorAll(selector)).flatMap(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return Array.from(range.getClientRects());
   }).map(b => ({ l: b.left - rect.left - m, r: b.right - rect.left + m, t: b.top - rect.top - m, b: b.bottom - rect.top + m }));
   const title = boxes('h1'), other = boxes('.gv-page-hero__lead p, .gv-page-hero__lead .gv-actions, .gv-page-hero__run > *');
   svg.setAttribute('viewBox', `0 0 ${Math.round(W)} ${Math.round(H)}`);
   path.setAttribute('d', toPath(tirage(W, H, title, other)));
   if (!animate) { svg.classList.add('is-drawn'); return; }
   svg.classList.remove('is-drawn');
   svg.getBoundingClientRect();
   requestAnimationFrame(() => svg.classList.add('is-drawn'));
  };
  // On attend les polices et la montée du titre pour mesurer le texte à sa place.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => render(!reduce), reduce ? 0 : 420));
  let timer;
  addEventListener('resize', () => {
   clearTimeout(timer);
   timer = setTimeout(() => { if (Math.abs(hero.getBoundingClientRect().width - width) > 1) render(false); }, 200);
  });
 }

 // 2. Fond de page : des lignes d'un bord à l'autre, à des hauteurs et des écarts variables, chacune tracée quand
 //    elle arrive à l'écran. Si le calque nomme un en-tête (data-ligne-fond=".selecteur"), la première ligne part
 //    du fond de cet en-tête et descend dans la page, en évitant son texte comme sur les autres en-têtes.
 //    Avec data-ligne-seule, une seule ligne occupe toute la hauteur du calque (fond d'une section) ; data-ligne-titre
 //    nomme ce qu'elle peut traverser (un titre), data-ligne-eviter ce qu'elle doit contourner.
 //    Chaque ligne s'efface quand elle quitte l'écran et se retrace, autrement, quand elle y revient.
 //    Les tracés se préparent quand le navigateur est libre ; le calque suit la hauteur de la page (filtres,
 //    pagination) en retirant ou en ajoutant des lignes.
 const NS = 'http://www.w3.org/2000/svg';
 const idle = window.requestIdleCallback ? cb => requestIdleCallback(cb, { timeout: 2000 }) : cb => setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: true }), 80);
 fonds.forEach(calque => {
  const racine = calque.parentElement, seule = calque.hasAttribute('data-ligne-seule');
  const entete = calque.dataset.ligneFond ? racine.querySelector(calque.dataset.ligneFond) : null;
  let width = 0, bandes = [];
  const file = [], parEl = new WeakMap();
  // Texte de l'en-tête (et ce que nomme data-ligne-eviter dans la page), dans le repère d'une ligne qui commence à `top`.
  const texte = top => {
   const r = calque.getBoundingClientRect(), m = 18;
   const boxes = (racine, sel) => Array.from(racine.querySelectorAll(sel)).flatMap(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return Array.from(range.getClientRects());
   }).map(b => ({ l: b.left - r.left - m, r: b.right - r.left + m, t: b.top - r.top - top - m, b: b.bottom - r.top - top + m }));
   const choix = (sel, enTete) => [...(entete && enTete ? boxes(entete, enTete) : []), ...(sel ? boxes(racine, sel) : [])];
   // Sur écran étroit, data-ligne-eviter-etroit s'ajoute à ce qu'il faut contourner (un encadré opaque, par exemple).
   const etroit = calque.clientWidth < 700 && calque.dataset.ligneEviterEtroit ? boxes(racine, calque.dataset.ligneEviterEtroit) : [];
   return [choix(calque.dataset.ligneTitre, 'h1'), [...choix(calque.dataset.ligneEviter, '.gv-eyebrow, h1 ~ p'), ...etroit]];
  };
  const preparer = b => {
   if (b.pret) return;
   const [title, other] = b.premiere ? texte(b.top) : [[], []];
   b.path.setAttribute('d', toPath(tirage(b.W, b.h, title, other, b.premiere ? 400 : 150)));
   b.pret = true;
  };
  const vider = deadline => {
   while (file.length && (deadline.didTimeout || deadline.timeRemaining() > 12)) preparer(file.shift());
   if (file.length) idle(vider);
  };
  // Une ligne se trace quand elle arrive à l'écran et s'efface dès qu'elle en est entièrement sortie ;
  // au retour, elle se retrace avec une nouvelle forme.
  const io = 'IntersectionObserver' in window && !reduce ? new IntersectionObserver(entries => entries.forEach(e => {
   if (!e.isIntersecting) return;
   const b = parEl.get(e.target);
   io.unobserve(e.target);
   preparer(b);
   b.affichee = true;
   e.target.getBoundingClientRect();
   requestAnimationFrame(() => { if (b.affichee) e.target.classList.add('is-drawn'); });
  }), { rootMargin: '0px 0px -20% 0px' }) : null;
  const sortie = io ? new IntersectionObserver(entries => entries.forEach(e => {
   const b = parEl.get(e.target);
   if (e.isIntersecting || !b || !b.affichee) return;
   b.affichee = false;
   b.pret = false;
   e.target.classList.remove('is-drawn');
   file.push(b);
   idle(vider);
   io.observe(e.target);
  })) : null;
  const hauteur = W => (W < 700 ? between(260, 380) : between(380, 600));
  const hauteurMax = W => (W < 700 ? 380 : 600);
  const ecart = W => (W < 700 ? between(420, 760) : between(560, 1050));
  function bande(top, W, h, premiere = false) {
   const el = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
   el.setAttribute('class', 'gv-ligne-fond');
   el.setAttribute('viewBox', `0 0 ${Math.round(W)} ${Math.round(h)}`);
   el.setAttribute('preserveAspectRatio', 'none');
   el.setAttribute('aria-hidden', 'true');
   el.setAttribute('focusable', 'false');
   el.style.top = `${Math.round(top)}px`;
   el.style.height = `${Math.round(h)}px`;
   path.setAttribute('pathLength', '1');
   el.appendChild(path);
   calque.appendChild(el);
   const b = { el, path, W, h, top, bas: top + h, premiere, pret: false };
   parEl.set(el, b);
   if (io) { if (!premiere) file.push(b); io.observe(el); sortie.observe(el); } else { preparer(b); el.classList.add('is-drawn'); }
   return b;
  }
  function suivre() {
   const W = calque.clientWidth, H = calque.clientHeight;
   if (!W || !H) return;
   // Ligne unique : refaite si la section change nettement de hauteur.
   if (seule && bandes.length && Math.abs(bandes[0].h - H) > 40) width = 0;
   if (Math.abs(W - width) > 1) {
    width = W;
    bandes.forEach(b => b.el.remove());
    bandes = [];
    file.length = 0;
    io?.disconnect();
    sortie?.disconnect();
   }
   if (seule) {
    if (!bandes.length) bandes.push(bande(0, W, H, true));
    return;
   }
   bandes = bandes.filter(b => b.bas <= H || (io?.unobserve(b.el), sortie?.unobserve(b.el), b.el.remove(), false));
   let top;
   if (bandes.length) top = bandes[bandes.length - 1].bas + ecart(W);
   else if (entete) {
    // À cheval sur le bas de l'en-tête : un peu plus de la moitié de la ligne dans l'en-tête.
    const h = hauteur(W) * 1.15, bas = entete.getBoundingClientRect().bottom - calque.getBoundingClientRect().top;
    bandes.push(bande(Math.max(0, bas - h * between(0.5, 0.68)), W, h, true));
    top = bandes[0].bas + ecart(W);
   } else top = between(40, 220);
   while (top + hauteurMax(W) <= H) {
    const b = bande(top, W, hauteur(W));
    bandes.push(b);
    top = b.bas + ecart(W);
   }
   if (file.length) idle(vider);
  }
  let t;
  const relancer = () => { clearTimeout(t); t = setTimeout(suivre, 150); };
  // On attend les polices pour mesurer le texte de l'en-tête à sa place.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
   if ('ResizeObserver' in window) new ResizeObserver(relancer).observe(calque);
   else addEventListener('resize', relancer);
   suivre();
  });
 });

 // 3. Séparateur entre deux sections : une ligne d'un bord à l'autre de l'écran, tracée de gauche à droite quand
 //    elle arrive à l'écran. La section qui suit (data-apres-ligne) reste cachée jusqu'à la fin du tracé.
 separateurs.forEach(sep => {
  const el = sep.querySelector('svg'), path = el.querySelector('path');
  const suite = sep.nextElementSibling?.hasAttribute('data-apres-ligne') ? sep.nextElementSibling : null;
  let width = 0, t;
  const preparer = () => {
   const W = sep.clientWidth, H = sep.clientHeight;
   if (!W || !H) return;
   width = W;
   el.setAttribute('viewBox', `0 0 ${Math.round(W)} ${Math.round(H)}`);
   path.setAttribute('d', toPath(tirage(W, H, [], [], 300)));
  };
  const montrer = () => suite?.classList.add('is-in');
  addEventListener('resize', () => {
   clearTimeout(t);
   t = setTimeout(() => { if (width && Math.abs(sep.clientWidth - width) > 1) preparer(); }, 200);
  });
  if (reduce || !('IntersectionObserver' in window)) { preparer(); el.classList.add('is-drawn'); montrer(); return; }
  suite?.classList.add('is-attente');
  idle(() => { if (!width) preparer(); });
  const io = new IntersectionObserver(entries => {
   if (!entries.some(e => e.isIntersecting)) return;
   io.disconnect();
   if (!width) preparer();
   path.addEventListener('transitionend', montrer, { once: true });
   setTimeout(montrer, 2600); // si la fin du tracé n'est pas signalée (onglet en arrière-plan)
   el.getBoundingClientRect();
   requestAnimationFrame(() => el.classList.add('is-drawn'));
  }, { rootMargin: '0px 0px -25% 0px' });
  io.observe(sep);
 });
})();
