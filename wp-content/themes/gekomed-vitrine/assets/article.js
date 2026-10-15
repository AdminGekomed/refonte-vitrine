/* Article : sommaire qui suit la lecture (intertitre en cours et parties lues), barre de lecture sous l'en-tête,
   sommaire repliable sur mobile. Sans JavaScript, le sommaire reste une simple liste de liens. */
(() => {
 const root = document.querySelector('[data-article]');
 if (!root) return;
 const contenu = root.querySelector('[data-article-contenu]');
 const nav = root.querySelector('.gv-sommaire');
 const barre = document.querySelector('[data-lecture]');
 const liens = nav ? Array.from(nav.querySelectorAll('.gv-sommaire__liste a')) : [];
 const titres = liens.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
 const entete = () => document.querySelector('.gv-header')?.offsetHeight ?? 0;
 let ticking = false;

 function maj() {
  ticking = false;
  // Partie en cours : le dernier intertitre passé au premier tiers de l'écran ; en bas de page, le dernier visible.
  const decalage = entete() + 48, seuil = Math.max(decalage, innerHeight * 0.3);
  const enBas = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  let actif = -1;
  titres.forEach((h, i) => { const top = h.getBoundingClientRect().top; if (top <= seuil || (enBas && top < innerHeight)) actif = i; });
  liens.forEach((a, i) => {
   a.classList.toggle('is-active', i === actif);
   a.classList.toggle('is-passed', i < actif);
   if (i === actif) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  if (barre) {
   const r = contenu.getBoundingClientRect();
   const total = r.height - innerHeight + decalage;
   barre.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, (decalage - r.top) / total)) : 0})`;
  }
 }
 const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(maj); } };
 addEventListener('scroll', onScroll, { passive: true });
 addEventListener('resize', onScroll, { passive: true });

 // Sommaire repliable (mobile) : il se replie après le choix d'une partie.
 if (nav) {
  const toggle = nav.querySelector('.gv-sommaire__toggle');
  const ouvrir = v => { nav.classList.toggle('is-open', v); toggle.setAttribute('aria-expanded', String(v)); };
  toggle.addEventListener('click', () => ouvrir(!nav.classList.contains('is-open')));
  liens.forEach(a => a.addEventListener('click', () => ouvrir(false)));
  nav.classList.add('is-enhanced');
 }
 maj();
})();
