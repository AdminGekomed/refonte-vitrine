/* Formulaires de la vitrine : champs conditionnels (affichés selon le sujet choisi) et message d'envoi mis au point. */
(() => {
 document.querySelectorAll('.gv-form').forEach(form => {
  const fields = Array.from(form.querySelectorAll('[data-show-if]'));
  const sync = () => fields.forEach(field => {
   const [name, value] = JSON.parse(field.dataset.showIf);
   const source = form.elements['gv_' + name];
   const on = !!source && source.value === value;
   field.hidden = !on;
   field.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = !on; });
  });
  form.addEventListener('change', sync);
  sync();
  // Un seul envoi : le bouton se désactive le temps de la requête.
  form.addEventListener('submit', () => {
   const button = form.querySelector('button[type="submit"]');
   if (button) setTimeout(() => { button.disabled = true; button.setAttribute('aria-busy', 'true'); }, 0);
  });
 });
 const done = document.querySelector('.gv-form-done');
 if (done) done.focus({ preventScroll: true });
})();
