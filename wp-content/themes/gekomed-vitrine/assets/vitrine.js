(() => {
 // Le ruban du catalogue se dessine quand il entre à l'écran.
 const ribbons=document.querySelectorAll('.gv-ribbon:not(.gv-ribbon--hero)');
 if(ribbons.length&&'IntersectionObserver' in window){
  document.documentElement.classList.add('gv-js');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('is-drawn');observer.unobserve(entry.target);}
  }),{threshold:.25});
  ribbons.forEach(ribbon=>observer.observe(ribbon));
 }
 const toggle=document.querySelector('.gv-menu-toggle'), nav=document.querySelector('.gv-nav');
 const close=()=>{toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Ouvrir le menu');nav?.classList.remove('is-open');};
 toggle?.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'Fermer le menu':'Ouvrir le menu');nav.classList.toggle('is-open',expanded);});
 nav?.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle?.focus();}});
 document.addEventListener('click',e=>{if(!e.target.closest('.gv-header'))close();});
 document.querySelectorAll('.gv-faq details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('.gv-faq details').forEach(other=>{if(other!==item)other.open=false;});}));
 const video=document.querySelector('.gv-video__play');
 video?.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/2QEFPaveJ_k?autoplay=1';frame.title='Présentation de Gekomed';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;video.parentElement.replaceChildren(frame);});
 document.querySelectorAll('[data-logo-carousel]').forEach(carousel=>{
  const pause=carousel.querySelector('[data-logo-pause]');
  const label=carousel.querySelector('[data-logo-pause-label]');
  const icon=carousel.querySelector('[data-logo-pause-icon]');
  if(!pause||!label||!icon)return;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false;
  const sync=()=>{
   carousel.classList.toggle('is-enhanced',!reducedMotion.matches);
   carousel.classList.toggle('is-paused',paused);
   pause.hidden=reducedMotion.matches;
   pause.setAttribute('aria-pressed',String(paused));
   label.textContent=paused?'Reprendre le défilement':'Mettre en pause';
   icon.textContent=paused?'▶':'Ⅱ';
  };
  pause.addEventListener('click',()=>{paused=!paused;sync();});
  reducedMotion.addEventListener('change',sync);
  sync();
 });
 document.querySelectorAll('[data-mail-carousel]').forEach(carousel=>{
  const slides=Array.from(carousel.querySelectorAll('[data-mail-slide]'));
  const dots=Array.from(carousel.querySelectorAll('[data-mail-go]'));
  const viewport=carousel.querySelector('.gv-mail-viewport');
  const controls=carousel.querySelector('[data-mail-controls]');
  const status=carousel.querySelector('[data-mail-status]');
  const previous=carousel.querySelector('[data-mail-prev]');
  const next=carousel.querySelector('[data-mail-next]');
  if(!slides.length||!viewport||!controls||!status||!previous||!next)return;
  let current=0, pointer=null;
  const show=index=>{
   current=(index+slides.length)%slides.length;
   slides.forEach((slide,i)=>{slide.hidden=i!==current;});
   dots.forEach((dot,i)=>{
    if(i===current)dot.setAttribute('aria-current','true');
    else dot.removeAttribute('aria-current');
   });
   status.textContent='Message '+(current+1)+' sur '+slides.length;
  };
  previous.addEventListener('click',()=>show(current-1));
  next.addEventListener('click',()=>show(current+1));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
  viewport.addEventListener('keydown',event=>{
   if(event.target!==viewport)return;
   const positions={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:slides.length-1};
   if(Object.prototype.hasOwnProperty.call(positions,event.key)){
    event.preventDefault();show(positions[event.key]);
   }
  });
  viewport.addEventListener('pointerdown',event=>{
   if(event.pointerType==='touch'&&event.isPrimary!==false)
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  viewport.addEventListener('pointerup',event=>{
   if(!pointer||pointer.id!==event.pointerId)return;
   const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
   pointer=null;
   if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));
  });
  viewport.addEventListener('pointercancel',()=>{pointer=null;});
  carousel.classList.add('is-enhanced');
  show(0);controls.hidden=slides.length<2;
 });
})();
