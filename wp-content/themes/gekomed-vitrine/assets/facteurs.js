/* Facteurs d'émission par matière (page Économies carbone) : panneau de détail et schéma d'attelle pour la matière
   survolée, sélectionnée au clavier ou touchée. Textes posés avec textContent. */
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
  detail('value').textContent = d.kg;
  detail('range').textContent = d.range;
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
