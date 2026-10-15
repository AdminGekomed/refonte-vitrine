/* Compteur de canettes en 3D.
   Barèmes et profil de canette repris de l'artefact « Canettes Gekomed » : document « Gekomed-gain-net-reconditionnement-provisoire.pdf »,
   actualisé le 4 octobre 2026, p. 3. gain = gain net partiel estimé, déjà diminué de 0,31 kg CO₂e de reconditionnement (ne pas le resoustraire).
   Une canette aluminium 33 cl = 0,061 kg CO₂e (Metal Packaging Europe, ACV 2022, p. 64, emballage seul).
   Disposition : blocs de 5 × 3 canettes par couche, 3 couches au plus (45 par bloc), le dernier bloc contient exactement le reste.
   three.js r128 est chargé par accueil.js avant l'appel de window.GxCans(racine). */
window.GxCans = function(root){
'use strict';
var KG_PAR_CANETTE = 0.061, RECOND = 0.31;
var FAMILIES = [
  {id:'poignet', label:'Poignet et doigts'}, {id:'bottes', label:'Bottes'}, {id:'genou', label:'Genou'}, {id:'lombaires', label:'Lombaires'},
  {id:'cheville', label:'Cheville'}, {id:'colliers', label:'Colliers'}, {id:'epaule', label:'Épaule'}
];
function A(id, fam, name, neuf, gain){ return {id:id, fam:fam, name:name, neuf:neuf, gain:gain}; }
var CATALOGUE = [
  A('poignet-baleine','poignet','Poignet (baleiné)',1.00,0.69),
  A('poignet-pouce','poignet','Poignet pouce',1.40,1.09),
  A('pouce-seul','poignet','Pouce seul',0.62,0.31),
  A('poignet-doigts-tous','poignet','Poignet doigts, tous les doigts',1.90,1.59),
  A('poignet-doigts-2-3','poignet','Poignet doigts, doigts 2-3',1.40,1.09),
  A('poignet-doigts-4-5','poignet','Poignet doigts, doigts 4-5',1.40,1.09),
  A('botte-simple-courte','bottes','Botte simple, courte',5.30,4.99),
  A('botte-simple-haute','bottes','Botte simple, haute',7.20,6.89),
  A('botte-air-courte','bottes','Botte Air, courte',6.20,5.89),
  A('botte-air-haute','bottes','Botte Air, haute',8.20,7.89),
  A('genou-fixe-1-volet-40','genou','Genou fixe, un volet, 40 cm',3.40,3.09),
  A('genou-fixe-1-volet-50','genou','Genou fixe, un volet, 50 cm',4.20,3.89),
  A('genou-fixe-1-volet-60','genou','Genou fixe, un volet, 60 cm',4.90,4.59),
  A('genou-fixe-1-volet-70','genou','Genou fixe, un volet, 70 cm',5.70,5.39),
  A('genou-fixe-3-volets-40','genou','Genou fixe, trois volets, 40 cm',3.90,3.59),
  A('genou-fixe-3-volets-50','genou','Genou fixe, trois volets, 50 cm',4.80,4.49),
  A('genou-fixe-3-volets-60','genou','Genou fixe, trois volets, 60 cm',5.70,5.39),
  A('genou-fixe-3-volets-70','genou','Genou fixe, trois volets, 70 cm',6.50,6.19),
  A('genou-rigide-articule','genou','Genou rigide articulé, limitation flexion/extension',9.50,9.19),
  A('genouillere-articulee-avec','genou','Genouillère articulée avec limitation',5.20,4.89),
  A('genouillere-articulee-sans','genou','Genouillère articulée sans limitation',4.40,4.09),
  A('ceinture-simple-21','lombaires','Ceinture simple serrage, 21 cm',2.50,2.19),
  A('ceinture-simple-26','lombaires','Ceinture simple serrage, 26 cm',3.10,2.79),
  A('ceinture-double-21','lombaires','Ceinture double serrage, 21 cm',3.20,2.89),
  A('ceinture-double-26','lombaires','Ceinture double serrage, 26 cm',3.80,3.49),
  A('cheville-coque-rigide','cheville','Cheville à coque rigide',1.70,1.39),
  A('boa-micrometrique','cheville','BOA, serrage micrométrique',1.90,1.59),
  A('boa-lacet','cheville','BOA, lacet',1.70,1.39),
  A('collier-souple-7-5','colliers','Collier souple, hauteur 7,5 cm',0.46,0.15),
  A('collier-souple-9','colliers','Collier souple, hauteur 9 cm',0.55,0.24),
  A('collier-souple-11','colliers','Collier souple, hauteur 11 cm',0.65,0.34),
  A('echarpe-epaule','epaule','Écharpe d’immobilisation d’épaule',2.50,2.19)
];
var eq = function(it){ return Math.max(1, Math.round(it.gain/KG_PAR_CANETTE)); };
var f2 = function(v){ return v.toFixed(2).replace('.', ','); };
var clamp = function(v,a,b){ return Math.max(a, Math.min(b, v)); };
var easeOut = function(t){ return 1-Math.pow(1-t,3); };
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var state = {fam:'bottes', item:'botte-air-haute'};
var byId = function(id){ return CATALOGUE.filter(function(it){ return it.id===id; })[0]; };
// ?attelle=<id> : ouvre le simulateur sur ce modèle (exemples de l'accueil).
var preset = byId(new URLSearchParams(location.search).get('attelle') || '');
if (preset){ state.fam = preset.fam; state.item = preset.id; }

/* ---------------- interface ---------------- */
var famWrap = root.querySelector('.gc-fams'), modelWrap = root.querySelector('.gc-models');
var nameEl = root.querySelector('.gc-name'), figEl = root.querySelector('.gc-figure b'), unitEl = root.querySelector('.gc-unit');
var neufEl = root.querySelector('[data-gc="neuf"]'), gainEl = root.querySelector('[data-gc="gain"]'), srEl = root.querySelector('.gc-sr');
function button(cls, html, pressed, onClick){
  var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html;
  b.setAttribute('aria-pressed', pressed ? 'true' : 'false'); b.addEventListener('click', onClick); return b;
}
function renderFamilies(){
  famWrap.innerHTML = '';
  FAMILIES.forEach(function(f){
    famWrap.appendChild(button('gc-fam', f.label, f.id===state.fam, function(){
      if (state.fam===f.id) return;
      state.fam = f.id; renderFamilies();
      select(CATALOGUE.filter(function(it){ return it.fam===f.id; })[0].id);
    }));
  });
}
function renderModels(){
  modelWrap.innerHTML = '';
  CATALOGUE.filter(function(it){ return it.fam===state.fam; }).forEach(function(it){
    modelWrap.appendChild(button('gc-model', '<span>'+it.name+'</span><b>'+eq(it)+'</b>', it.id===state.item, function(){ select(it.id); }));
  });
}
var shown = 129, countAnim = null;
function select(id){
  state.item = id;
  var it = byId(id), n = eq(it);
  renderModels();
  nameEl.textContent = it.name;
  unitEl.textContent = n > 1 ? 'canettes en aluminium de 33 cl' : 'canette en aluminium de 33 cl';
  neufEl.textContent = f2(it.neuf);
  gainEl.textContent = '= ' + f2(it.gain);
  if (srEl) srEl.textContent = it.name + ' : environ ' + n + (n > 1 ? ' canettes.' : ' canette.');
  if (reduce){ shown = n; figEl.textContent = n; }
  else countAnim = {from:shown, to:n, t0:performance.now(), dur:700};
  if (ready) setCount(n);
  wake();
}

/* ---------------- 3D ---------------- */
var THREE = window.THREE;
var stage = root.querySelector('.gc-stage'), canvas = root.querySelector('.gc-canvas');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
var scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,200);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd6e2d3, 0.7));
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
var sun = new THREE.DirectionalLight(0xffffff, 0.62);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008;
scene.add(sun); scene.add(sun.target);
var rim = new THREE.DirectionalLight(0xffffff, 0.24); scene.add(rim); scene.add(rim.target);
var ground = new THREE.Mesh(new THREE.PlaneGeometry(160,160), new THREE.ShadowMaterial({opacity:0.13}));
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
var group = new THREE.Group(); scene.add(group);

// profil de la canette (hauteur depuis le fond, rayon ; corps r = 50), repère de l'artefact
var TOPH = 176, PR_LO = 18, PR_HI = 147, U = 0.01;
var PROFILE = (function(){
  var p = [], i, t, s;
  for (i = 0; i <= 14; i++){ t = i/14; p.push([14*t, 39 + 11*Math.sin(Math.PI/2*t)]); }
  p.push([150, 50]);
  for (i = 1; i <= 12; i++){ t = i/12; s = t*t*(3-2*t); p.push([150 + 16*t, 50 - 8.8*s]); }
  p.push([167.5, 42.6], [174.5, 42.6], [TOPH, 42.2]);
  return p;
})();
var V = function(r, h){ return new THREE.Vector2(r*U, h*U); };
var outer = [V(0,3.2), V(30,1.8), V(37,0)].concat(PROFILE.map(function(q){ return V(q[1], q[0]); }));
outer.push(V(41.5,176.2));
var inner = [V(40,175.6), V(39.2,173.6), V(38.4,171.4), V(36,171.2), V(35,170.6), V(34,171.2), V(0,171.2)];
var SEG = 40, T_HULL = 0.022;
var bodyGeo = new THREE.LatheGeometry(outer.concat(inner), SEG);
var hullGeo = new THREE.LatheGeometry([new THREE.Vector2(0,-T_HULL)].concat(outer.map(function(p){ return new THREE.Vector2(p.x+T_HULL, Math.max(p.y,-T_HULL)); }), [new THREE.Vector2(0,176.2*U+T_HULL)]), SEG);
var sleeveGeo = new THREE.CylinderGeometry(0.503, 0.503, (PR_HI-PR_LO)*U, 56, 1, true); sleeveGeo.translate(0, (PR_LO+PR_HI)/2*U, 0);
var tabGeo = (function(){
  var s = new THREE.Shape(), x = -0.08, y = -0.22, w = 0.16, h = 0.31, r = 0.075;
  s.moveTo(x+r, y); s.lineTo(x+w-r, y); s.quadraticCurveTo(x+w, y, x+w, y+r); s.lineTo(x+w, y+h-r); s.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  s.lineTo(x+r, y+h); s.quadraticCurveTo(x, y+h, x, y+h-r); s.lineTo(x, y+r); s.quadraticCurveTo(x, y, x+r, y);
  var hole = new THREE.Path(); hole.absellipse(0, -0.13, 0.046, 0.054, 0, Math.PI*2, true); s.holes.push(hole);
  var g = new THREE.ExtrudeGeometry(s, {depth:0.012, bevelEnabled:true, bevelThickness:0.004, bevelSize:0.004, bevelSegments:2, curveSegments:12});
  g.rotateX(-Math.PI/2); g.translate(0, 1.722, 0); g.rotateY(Math.PI + 0.5); return g;
})();
// décor imprimé : fond blanc, vagues vert ruban, aucun texte ni logo
var printTex = (function(){
  var c = document.createElement('canvas'); c.width = 1024; c.height = 424;
  var x = c.getContext('2d'), W = c.width, H = c.height;
  x.fillStyle = '#f7f9f5'; x.fillRect(0, 0, W, H);
  function band(yc, amp, th, col, ph){
    x.beginPath();
    for (var i = 0; i <= 256; i++){ var u = i/256; x.lineTo(u*W, H*(yc + amp*Math.sin(2*Math.PI*2*u + ph))); }
    for (var j = 256; j >= 0; j--){ var v = j/256; x.lineTo(v*W, H*(yc + th + amp*Math.sin(2*Math.PI*2*v + ph + 0.35))); }
    x.closePath(); x.fillStyle = col; x.fill();
  }
  band(0.6, 0.075, 0.11, '#6FAE3E', 2.2);
  band(0.8, 0.06, 0.035, '#BBD8A3', 2.7);
  x.fillStyle = '#6FAE3E'; x.fillRect(0, 0, W, H*0.025); x.fillRect(0, H*0.975, W, H*0.025);
  var t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
})();
var MAT = {
  metal: new THREE.MeshPhongMaterial({color:0xE4E9E4, specular:0xffffff, shininess:70}),
  print: new THREE.MeshLambertMaterial({color:0xffffff, map:printTex}),
  tab: new THREE.MeshPhongMaterial({color:0xF2F5F2, specular:0xffffff, shininess:90}),
  hull: new THREE.MeshBasicMaterial({color:0x7E978A, side:THREE.BackSide})
};
var MAX = 160;
function inst(geo, mat, shadow){
  var m = new THREE.InstancedMesh(geo, mat, MAX);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false;
  m.castShadow = !!shadow; m.receiveShadow = !!shadow; group.add(m); return m;
}
var meshes = [inst(bodyGeo, MAT.metal, true), inst(sleeveGeo, MAT.print, true), inst(tabGeo, MAT.tab, false), inst(hullGeo, MAT.hull, false)];
// socle blanc sous les blocs, cerné d'un filet
var BASE_H = 0.12;
var baseGeo = new THREE.BoxGeometry(1, BASE_H, 1); baseGeo.translate(0, BASE_H/2, 0);
var base = new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({color:0xffffff}));
base.castShadow = true; base.receiveShadow = true;
base.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({color:0x7E978A})));
group.add(base);

var SP = 1.03, GAP = 0.8, STACK_H = 1.74, BLOC = 45, COUCHE = 15;
var JITTER = [0, -0.32, 0.26, -0.15, 0.4, -0.45, 0.12];
function spot(i){
  var b = Math.floor(i/BLOC), j = i%BLOC, lvl = Math.floor(j/COUCHE), w = j%COUCHE;
  return {x: b*(5*SP + GAP) + (w%5)*SP, y: lvl*STACK_H, z: -(2 - Math.floor(w/5))*SP};
}
function bounds(n){
  var b = {minx:Infinity, maxx:-Infinity, minz:Infinity, maxz:-Infinity, maxy:0};
  for (var i = 0; i < n; i++){
    var p = spot(i);
    b.minx = Math.min(b.minx, p.x); b.maxx = Math.max(b.maxx, p.x); b.minz = Math.min(b.minz, p.z); b.maxz = Math.max(b.maxz, p.z);
    b.maxy = Math.max(b.maxy, p.y);
  }
  return b;
}

var N = 0, drawn = 0, cans = [];
for (var k = 0; k < MAX; k++) cans.push({dropAt:-1, shrinkAt:-1});
var view = {yaw:32*Math.PI/180, pitch:28*Math.PI/180};
var frame = null, frameTarget = null;   // centre et dimensions de la pile, interpolés
function targetFrame(n){
  var b = bounds(Math.max(1, n));
  return {cx:(b.minx+b.maxx)/2, cz:(b.minz+b.maxz)/2, w:b.maxx-b.minx+1.5, d:b.maxz-b.minz+1.5, h:b.maxy+1.78+BASE_H};
}
function setCount(n){
  var now = performance.now();
  if (n > N){
    var spread = Math.min(16, 1100/(n-N));
    for (var i = N; i < n; i++){ cans[i].shrinkAt = -1; cans[i].dropAt = reduce ? -1 : now + (i-N)*spread; }
  } else {
    for (var j = n; j < N; j++) cans[j].shrinkAt = reduce ? now - 1000 : now + (N-1-j)*4;
  }
  drawn = Math.max(drawn, n); N = n;
  frameTarget = targetFrame(n);
  if (!frame || reduce) frame = Object.assign({}, frameTarget);
}

var mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), yAxis = new THREE.Vector3(0,1,0);
function updateInstances(now){
  var busy = false, last = 0;
  for (var i = 0; i < drawn; i++){
    var c = cans[i], p = spot(i), y = BASE_H + p.y, s = 1;
    if (c.dropAt >= 0){
      var t = (now - c.dropAt)/520;
      if (t < 0) s = 0; else if (t < 1) y += 3.2*(1 - easeOut(t)); else c.dropAt = -1;
      busy = true;
    }
    if (c.shrinkAt >= 0){
      var u = (now - c.shrinkAt)/260;
      if (u < 0) s = 1; else if (u < 1){ s = 1 - easeOut(u); y += u*0.6; } else s = 0;
      if (u < 1) busy = true;
    }
    if (i >= N && c.shrinkAt < 0) s = 0;
    if (s > 0.001) last = i + 1;
    q.setFromAxisAngle(yAxis, view.yaw + JITTER[i%7]);
    pos.set(p.x, y, p.z); scl.set(s, s, s);
    mtx.compose(pos, q, scl);
    for (var m = 0; m < meshes.length; m++) meshes[m].setMatrixAt(i, mtx);
  }
  if (!busy) drawn = N;
  for (var n = 0; n < meshes.length; n++){ meshes[n].count = Math.max(last, Math.min(drawn, MAX)); meshes[n].instanceMatrix.needsUpdate = true; }
  return busy;
}

var sw = 1, sh = 1;
function resize(){
  sw = Math.max(1, stage.clientWidth); sh = Math.max(1, stage.clientHeight);
  renderer.setSize(sw, sh, false);
}
// la pile occupe la zone laissée libre par le chiffre (à droite sur ordinateur, sous le chiffre sur mobile)
function layoutCamera(){
  var f = frame, narrow = sw < 620;
  var region = narrow ? {fx:0.9, fy:0.5, cx:0.5, cy:0.3} : {fx:0.52, fy:0.7, cx:0.7, cy:0.42};
  group.position.set(-f.cx, 0, -f.cz);
  var target = new THREE.Vector3(0, f.h*0.42, 0);
  var dir = new THREE.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw)*Math.cos(view.pitch));
  camera.position.copy(target).addScaledVector(dir, 50); camera.up.set(0,1,0); camera.lookAt(target); camera.updateMatrixWorld();
  var inv = camera.matrixWorldInverse, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, v = new THREE.Vector3();
  for (var a = 0; a < 8; a++){
    v.set(a&1 ? f.w/2 : -f.w/2, a&2 ? f.h : 0, a&4 ? f.d/2 : -f.d/2).applyMatrix4(inv);
    minx = Math.min(minx, v.x); maxx = Math.max(maxx, v.x); miny = Math.min(miny, v.y); maxy = Math.max(maxy, v.y);
  }
  var bw = maxx - minx, bh = maxy - miny, aspect = sw/sh;
  var vw = Math.max(bw/region.fx, bh/region.fy*aspect, 6), vh = vw/aspect;
  var cx = (minx + maxx)/2, cy = (miny + maxy)/2;
  camera.left = cx - vw*region.cx; camera.right = camera.left + vw;
  camera.bottom = cy - vh*region.cy; camera.top = camera.bottom + vh;
  camera.updateProjectionMatrix();
  var ext = Math.max(f.w, f.d)/2 + 4;
  sun.position.set(-2.5, 10, 4.5); sun.target.position.set(0, 0, 0);
  Object.assign(sun.shadow.camera, {left:-ext, right:ext, top:ext, bottom:-ext, near:0.5, far:40}); sun.shadow.camera.updateProjectionMatrix();
  rim.position.set(6, 3, -2); rim.target.position.set(0, 0.8, 0);
  base.scale.set(f.w, 1, f.d); base.position.set(f.cx, 0, f.cz);
}

/* ---------------- boucle à la demande ---------------- */
var visible = false, running = false, lastActive = 0, ready = false, started = false, drag = null;
function wake(){ lastActive = performance.now(); if (visible && !running){ running = true; requestAnimationFrame(tick); } }
function tick(now){
  var busy = !!drag;
  if (countAnim){
    var k = clamp((now - countAnim.t0)/countAnim.dur, 0, 1);
    shown = Math.round(countAnim.from + (countAnim.to - countAnim.from)*easeOut(k));
    figEl.textContent = shown; busy = true;
    if (k >= 1) countAnim = null;
  }
  if (ready){
    if (frame && frameTarget){
      var moved = false;
      ['cx','cz','w','d','h'].forEach(function(key){ var dv = frameTarget[key] - frame[key]; if (Math.abs(dv) > 0.002){ frame[key] += dv*0.14; moved = true; } else frame[key] = frameTarget[key]; });
      if (moved) busy = true;
    }
    if (updateInstances(now)) busy = true;
    if (frame) layoutCamera();
    renderer.render(scene, camera);
  }
  if (busy) lastActive = now;
  if (visible && now - lastActive < 900) requestAnimationFrame(tick); else running = false;
}

canvas.addEventListener('pointerdown', function(e){
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  drag = {id:e.pointerId, x:e.clientX};
  if (e.pointerType !== 'touch'){ try { canvas.setPointerCapture(e.pointerId); } catch(err){} }
  canvas.classList.add('is-drag'); wake();
});
canvas.addEventListener('pointermove', function(e){
  if (!drag || drag.id !== e.pointerId) return;
  view.yaw -= (e.clientX - drag.x)*0.008; drag.x = e.clientX; wake();
});
function endDrag(){ drag = null; canvas.classList.remove('is-drag'); }
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

new ResizeObserver(function(){ resize(); wake(); }).observe(stage);
resize();
renderFamilies();
renderModels();
ready = true;
if (preset){ shown = eq(preset); figEl.textContent = shown; select(preset.id); }
root.classList.add('is-ready');
new IntersectionObserver(function(entries){
  visible = entries[0].isIntersecting;
  if (visible && !started){ started = true; setCount(eq(byId(state.item))); }
  if (visible) wake();
}, {threshold:0.3}).observe(stage);
};
