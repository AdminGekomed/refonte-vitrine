/* Empreinte des matières d'une botte de marche (page Économies carbone) : panneau de détail et schéma de la botte pour la
   matière survolée, sélectionnée au clavier ou touchée. Textes posés avec textContent. */
(() => {
 const root = document.querySelector('[data-facteurs]');
 if (!root) return;
 const rows = Array.from(root.querySelectorAll('.gx-fact__row'));
 const illu = root.querySelector('.gx-fact__illu');
 const detail = name => root.querySelector(`[data-d="${name}"]`);
 let active = rows[0];

 function render() {
  rows.forEach(row => row.setAttribute('aria-pressed', String(row === active)));
  const d = active.dataset;
  detail('name').textContent = d.name;
  detail('sub').textContent = d.sub;
  detail('share').textContent = d.share;
  detail('masse').textContent = d.masse;
  detail('facteur').textContent = d.facteur;
  detail('use').textContent = d.use;
  if (illu) illu.dataset.active = d.part;
 }
 const pick = row => { if (row !== active) { active = row; render(); } };
 rows.forEach(row => {
  row.addEventListener('click', () => pick(row));
  row.addEventListener('focus', () => pick(row));
  row.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pick(row); });
 });
 render();
})();
