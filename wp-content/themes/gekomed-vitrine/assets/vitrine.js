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
 // Menu : au survol, une boucle lime entoure l'item, tracée à la main (un tour et un léger dépassement, comme un mot
 // entouré au feutre). Elle est calculée à la taille de chaque lien, pour garder un trait d'épaisseur constante.
 const NS='http://www.w3.org/2000/svg';
 const boucle=(W,H,graine)=>{
  const hasard=n=>{const x=Math.sin(graine*12.9898+n*78.233)*43758.5453;return x-Math.floor(x);};
  const cx=W/2,cy=H/2,a=W/2-3,b=H/2-3,pente=(hasard(1)-.5)*.07,phase=hasard(2)*6.28,depart=Math.PI*(.93+hasard(3)*.08);
  const forme=v=>Math.sign(v)*Math.abs(v)**.8;
  const pts=[];
  for(let i=0;i<=96;i++){
   const t=i/96,th=depart+t*Math.PI*2*1.1,k=(.94+.06*t)*(1+.02*Math.sin(2*th+phase));
   const x=a*k*forme(Math.cos(th)),y=b*k*forme(Math.sin(th));
   pts.push([cx+x*Math.cos(pente)-y*Math.sin(pente),cy+x*Math.sin(pente)+y*Math.cos(pente)]);
  }
  const f=v=>Math.round(v*10)/10;
  let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
  for(let i=0;i<pts.length-1;i++){
   const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
   d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
 };
 const boucles=()=>document.querySelectorAll('.gv-nav a').forEach((a,i)=>{
  let svg=a.querySelector('.gv-nav__boucle');
  if(!svg){
   svg=document.createElementNS(NS,'svg');svg.setAttribute('class','gv-nav__boucle');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
   const path=document.createElementNS(NS,'path');path.setAttribute('pathLength','1');svg.appendChild(path);a.appendChild(svg);
  }
  const r=svg.getBoundingClientRect();
  if(!r.width||!r.height)return;
  svg.setAttribute('viewBox',`0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
  svg.firstChild.setAttribute('d',boucle(Math.round(r.width),Math.round(r.height),i+1));
 });
 boucles();
 (document.fonts?document.fonts.ready:Promise.resolve()).then(boucles);
 let attente;addEventListener('resize',()=>{clearTimeout(attente);attente=setTimeout(boucles,150);});
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
