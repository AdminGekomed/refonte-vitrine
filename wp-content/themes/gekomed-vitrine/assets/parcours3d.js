/* ==========================================================================
   Parcours d'une attelle (accueil, section « Nous collectons vos attelles usagées »)
   Scène 3D pilotée par le défilement, de la borne de la pharmacie jusqu'au
   carton de l'atelier. La caméra cadre chaque poste et ses gestes. Mêmes matériaux
   que les maquettes (objets blancs, filets vert profond) ; l'attelle est le
   seul objet en vert ruban. Chargé par accueil.js, rendu à la demande.
   ========================================================================== */
(function(){
'use strict';

window.GxParcours = function(root){
 var THREE = window.THREE;
 var pin = root.querySelector('.gx-journey__pin');
 var canvas = root.querySelector('.gx-journey__canvas');
 var phaseEls = [].slice.call(root.querySelectorAll('.gx-phase'));
 var beatEls = [].slice.call(root.querySelectorAll('.gx-beat'));
 var gotos = [].slice.call(root.querySelectorAll('[data-goto]'));
 var introEl = root.querySelector('.gx-journey__intro'), nowEl = root.querySelector('.gx-journey__now');
 var textEl = root.querySelector('.gx-journey__text'), indexEl = root.querySelector('.gx-journey__index');
 var prevBtn = root.querySelector('[data-journey-prev]'), nextBtn = root.querySelector('[data-journey-next]');
 var statusEl = root.querySelector('.gx-journey__status'), progressEl = root.querySelector('.gx-journey__bar');
 var orbitEl = root.querySelector('.gx-journey__orbit');
 var narrow = window.matchMedia('(max-width: 980px)').matches, failed = false, assetLoads = [];
 var entryLayer = 'structure', entrance = {active:false, start:0, end:0, items:[], resolve:null};

 /* ---------- moteur ---------- */
 var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
 renderer.setClearColor(0xF4F8F2, 1);
 renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 var scene = new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xffffff, 0xB4C0B7, 0.86));
 var SUN = new THREE.Vector3(-5, 10, 3), SH = narrow ? 3.6 : 5;
 var sun = new THREE.DirectionalLight(0xffffff, 0.4);
 sun.castShadow = true; sun.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
 Object.assign(sun.shadow.camera, {left:-SH, right:SH, top:SH, bottom:-SH, near:0.5, far:40});
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
 scene.add(sun); scene.add(sun.target);
 var fill = new THREE.DirectionalLight(0xffffff, 0.14); fill.position.set(6, 4, 8); scene.add(fill);
 var ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.ShadowMaterial({opacity:0.08}));
 ground.rotation.x = -Math.PI/2; ground.position.set(5, -0.081, 0); ground.receiveShadow = true; scene.add(ground);

 /* ---------- matériaux (palette des maquettes) ---------- */
 function lam(c, o){ var m = new THREE.MeshLambertMaterial({color:c}); if (o) Object.keys(o).forEach(function(k){ m[k] = o[k]; }); return m; }
 var DS = THREE.DoubleSide;
 var M = {
  body: lam(0xffffff), bodyDS: lam(0xffffff, {side:DS}),
  dark: lam(0xC9D1CB), darkDS: lam(0xC9D1CB, {side:DS}),
  felt: lam(0xEEF2EE), feltDS: lam(0xEEF2EE, {side:DS}), metal: lam(0xF1F3F2, {emissive:new THREE.Color(0x2B2D2C)}), metalDS: lam(0xF1F3F2, {side:DS, emissive:new THREE.Color(0x2B2D2C)}),
  green: lam(0x5E9A35), greenDS: lam(0x5E9A35, {side:DS}),
  strap: lam(0x1F4A3A, {side:DS}),
  shell: lam(0xffffff, {side:DS}), press: lam(0x474D4A), black: lam(0x1B1E1D, {side:DS}), tape: lam(0xBDA27E),
  glass: lam(0xDCE8E2, {transparent:true, opacity:.3, depthWrite:false}),
  liquid: lam(0xB4D9C0, {transparent:true, opacity:.55, depthWrite:false}),
  line: new THREE.LineBasicMaterial({color:0x0F3E2E, transparent:true, opacity:.32}),
  soft: new THREE.LineBasicMaterial({color:0x0F3E2E, transparent:true, opacity:.18})
 };

 function finish(p, m, g, o){
  m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false;
  if (o.edges !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, o.thr || 1), o.line || M.line));
  if (o.ro) m.renderOrder = o.ro;
  if (p === W) m.userData.entryLayer = entryLayer;
  p.add(m); return m;
 }
 function box(p, w, h, d, x, y, z, o){
  o = o || {};
  var g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, o.mat || M.body);
  m.position.set(x, y + h/2, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  return finish(p, m, g, o);
 }
 // Boîte à angles arrondis : contour courbe et biseau réellement subdivisé.
 // Même convention que box : y est le bas, o.radius règle le rayon extérieur.
 var roundedGeometries = Object.create(null);
 function roundedBox(p, w, h, d, x, y, z, o){
  o = o || {};
  var r = Math.min(o.radius || Math.min(w, h, d)*0.16, Math.min(w, h, d)*0.24);
  var segments=o.segments || o.seg || 4, key=[w,h,d,r,segments].join('|'), g=roundedGeometries[key];
  if(!g){
   var hw = w/2 - r, hh = h/2 - r, q = Math.min(r, hw*0.9, hh*0.9), shape = new THREE.Shape();
   shape.moveTo(-hw + q, -hh); shape.lineTo(hw - q, -hh); shape.quadraticCurveTo(hw, -hh, hw, -hh + q);
   shape.lineTo(hw, hh - q); shape.quadraticCurveTo(hw, hh, hw - q, hh);
   shape.lineTo(-hw + q, hh); shape.quadraticCurveTo(-hw, hh, -hw, hh - q);
   shape.lineTo(-hw, -hh + q); shape.quadraticCurveTo(-hw, -hh, -hw + q, -hh);
   g = new THREE.ExtrudeGeometry(shape, {depth:d - 2*r, steps:1, bevelEnabled:true, bevelThickness:r, bevelSize:r, bevelSegments:segments, curveSegments:segments});
   g.translate(0, 0, -(d - 2*r)/2); roundedGeometries[key]=g;
  }
  var m = new THREE.Mesh(g, o.mat || M.body); m.position.set(x, y + h/2, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.thr === undefined) o.thr = 32;
  return finish(p, m, g, o);
 }
 function cyl(p, rt, rb, h, x, y, z, o){
  o = o || {}; o.thr = o.thr || 40;
  var g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 28, 1, !!o.open, o.ts || 0, o.tl || Math.PI*2);
  var m = new THREE.Mesh(g, o.mat || M.body);
  if (o.center) m.position.set(x, y, z); else m.position.set(x, y + h/2, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  return finish(p, m, g, o);
 }
 function group(p, x, y, z, ry){ var g = new THREE.Group(); g.position.set(x, y, z); if (ry) g.rotation.y = ry; if (p === W) g.userData.entryLayer = entryLayer; p.add(g); return g; }
 // Une unité d'entrée conserve les positions absolues du parcours, sans
 // changer les parents : toutes ses pièces partagent une seule transformation.
 function entryUnit(name, start, end, layer){
  W.children.slice(start, end).forEach(function(obj){ obj.userData.entryUnit = name; obj.userData.entryLayer = layer || 'furniture'; });
 }
 function rnd(seed){ return function(){ seed = (seed*9301 + 49297) % 233280; return seed/233280; }; }

 /* ---------- textures dessinées (étiquette, enseigne) ---------- */
 function tex(w, h, draw){
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var t = new THREE.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.userData = {c:c, draw:draw}; paint(t); return t;
 }
 function paint(t){ var c = t.userData.c, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); t.userData.draw(g, c.width, c.height); t.needsUpdate = true; }
 var labelTex = tex(384, 640, function(g, w, h){
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6FAE3E'; g.fillRect(0, 0, w, 18);
  g.fillStyle = '#0F3E2E';
  g.font = '500 54px "DM Sans", sans-serif'; g.fillText('Gekomed', 30, 98);
  g.font = '500 20px "JetBrains Mono", monospace';
  g.fillText('ATTELLE', 32, 162); g.fillText('RECONDITIONNÉE', 32, 194);
  g.fillStyle = '#EAF2E5'; g.fillRect(30, 240, w - 60, 86);
  g.fillStyle = '#0F3E2E'; g.fillText('GENOU', 48, 277); g.fillText('CONTRÔLÉE', 48, 307);
  g.font = '400 18px "JetBrains Mono", monospace'; g.fillText('GK-0417', 32, 379); g.fillText('Traçabilité Gekomed', 32, 412);
  var x = 32, i = 0, bw = [3, 2, 5, 2, 4, 3, 6, 2], gap = [3, 4, 2, 5, 3, 2, 4, 3];
  while (x < w - 32){ g.fillRect(x, 458, bw[i % 8], 112); x += bw[i % 8] + gap[i % 8]; i++; }
  g.fillText('0417 · GENOU', 32, 608);
 });
 var logoUrl = root.getAttribute('data-logo'), logoImg = logoUrl ? new Image() : null;
 var signTex = tex(1024, 220, function(g, w, h){
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111814';
  g.font = '400 92px "DM Sans", sans-serif'; g.fillText('Atelier', 52, 142);
  var lw = g.measureText('Atelier ').width;
  if (logoImg && logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, 52 + lw, 142 - 78, 78*logoImg.naturalWidth/logoImg.naturalHeight, 78*1.03);
  else g.fillText('Gekomed', 52 + lw, 142);
 });
 if (logoImg){
  assetLoads.push(new Promise(function(resolve){
   var timer = setTimeout(resolve, 2000);
   logoImg.onload = function(){ clearTimeout(timer); if (!failed){ paint(signTex); render(); } resolve(); };
   logoImg.onerror = function(){ clearTimeout(timer); resolve(); };
   logoImg.src = logoUrl;
  }));
 }

 /* ---------- objets ---------- */
 var W = new THREE.Group(); scene.add(W);
 var DESK = 0.75;

 // Attelle d'immobilisation du genou, comme sur les photos Gekomed : manchon rembourré ouvert
 // sur l'avant, quatre sangles larges à boucle latérale, bande avant, logo, baleines latérales.
 function braceR(y){ var t = (y + 0.32)/0.64; return 0.064 + 0.028*t + 0.008*Math.sin(t*Math.PI); }
 function makeBrace(shell, strap, pad){
  var g = new THREE.Group(), out = [], inn = [], GAP = Math.PI*0.46;
  for (var i = 0; i <= 16; i++){ var y = -0.32 + i*0.04; out.push(new THREE.Vector2(braceR(y), y)); inn.push(new THREE.Vector2(braceR(y) - 0.012, y)); }
  var og = new THREE.LatheGeometry(out, 40, GAP/2, Math.PI*2 - GAP);
  finish(g, new THREE.Mesh(og, shell), og, {thr:30});
  var ig = new THREE.LatheGeometry(inn, 40, GAP/2, Math.PI*2 - GAP);
  finish(g, new THREE.Mesh(ig, pad), ig, {edges:false, shadow:false});
  [-0.255, -0.09, 0.075, 0.24].forEach(function(y){
   var rb = braceR(y - 0.036) + 0.008, rt = braceR(y + 0.036) + 0.008;
   cyl(g, rt, rb, 0.072, 0, y, 0, {center:true, open:true, mat:strap, seg:40});
   box(g, 0.014, 0.05, 0.03, (rt + rb)/2 + 0.006, y - 0.025, 0, {mat:M.metal, edges:false});
  });
  var tilt = Math.atan2(braceR(0.32) - braceR(-0.32), 0.64), rm = (braceR(0.32) + braceR(-0.32))/2;
  var band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.006), strap);
  band.position.set(0, 0, rm + 0.01); band.rotation.x = tilt; finish(g, band, band.geometry, {edges:false});
  var logo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.026, 0.004), M.body);
  logo.position.set(0, 0.24, braceR(0.24) + 0.018); logo.rotation.x = tilt; finish(g, logo, logo.geometry, {edges:false, shadow:false});
  [-1, 1].forEach(function(sd){
   var st = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.6, 0.018), M.metal);
   st.position.set(sd*(rm + 0.003), 0, 0); st.rotation.z = -sd*tilt; finish(g, st, st.geometry, {edges:false});
  });
  return g;
 }

 // Sac de collecte translucide : profil de révolution, ouvert dans la borne puis noué.
 var BAG_OPEN = [[0.146, 0], [0.148, 0.03], [0.149, 0.15], [0.15, 0.45], [0.151, 0.62], [0.152, 0.72], [0.153, 0.8], [0.155, 0.86]];
 var BAG_TIED = [[0.146, 0], [0.147, 0.03], [0.148, 0.15], [0.148, 0.42], [0.142, 0.6], [0.105, 0.71], [0.045, 0.78], [0.022, 0.81]];
 var NP = BAG_OPEN.length, BS = 32, CREASES = 7;
 function prof(k, j){ var a = BAG_OPEN[j], b = BAG_TIED[j]; return [a[0] + (b[0] - a[0])*k, a[1] + (b[1] - a[1])*k]; }
 function bagShape(geo, k){
  var pos = geo.attributes.position;
  for (var i = 0; i <= BS; i++){
   var phi = i/BS*Math.PI*2, s = Math.sin(phi), c = Math.cos(phi);
   for (var j = 0; j < NP; j++){ var p = prof(k, j); pos.setXYZ(i*NP + j, p[0]*s, p[1], p[0]*c); }
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
 }
 function ringInto(arr, o, r, y){
  for (var i = 0; i < 24; i++){
   var a = i/24*Math.PI*2, b = (i + 1)/24*Math.PI*2;
   arr[o++] = r*Math.sin(a); arr[o++] = y; arr[o++] = r*Math.cos(a);
   arr[o++] = r*Math.sin(b); arr[o++] = y; arr[o++] = r*Math.cos(b);
  }
  return o;
 }
 function bagLines(k, arr){
  var o = 0;
  for (var c = 0; c < CREASES; c++){
   var phi = c/CREASES*Math.PI*2 + 0.3, s = Math.sin(phi), co = Math.cos(phi);
   for (var j = 2; j < NP - 1; j++){
    var a = prof(k, j), b = prof(k, j + 1);
    arr[o++] = a[0]*s; arr[o++] = a[1]; arr[o++] = a[0]*co;
    arr[o++] = b[0]*s; arr[o++] = b[1]; arr[o++] = b[0]*co;
   }
  }
  var t = prof(k, NP - 1);
  o = ringInto(arr, o, t[0], t[1]);
  ringInto(arr, o, BAG_OPEN[1][0], BAG_OPEN[1][1]);
 }
 function makeBag(k, mat, line){
  var g = new THREE.Group();
  var geo = new THREE.LatheGeometry(BAG_OPEN.map(function(p){ return new THREE.Vector2(p[0], p[1]); }), BS);
  bagShape(geo, k);
  var mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 2; g.add(mesh);
  var bottom = new THREE.Mesh(new THREE.CircleGeometry(BAG_OPEN[0][0], 32), mat); bottom.rotation.x = -Math.PI/2; bottom.renderOrder = 2; g.add(bottom);
  var arr = new Float32Array((CREASES*(NP - 3)*2 + 96)*3), lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(arr, 3)); bagLines(k, arr);
  g.add(new THREE.LineSegments(lg, line));
  var knot = group(g, 0, BAG_TIED[NP - 1][1], 0);
  var km = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), mat); km.renderOrder = 2; knot.add(km);
  [-1, 1].forEach(function(s){
   var e = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 12), mat);
   e.position.set(s*0.03, 0.045, 0); e.rotation.z = -s*0.6; e.renderOrder = 2; knot.add(e);
  });
  knot.scale.setScalar(Math.max(0.001, k)); knot.visible = k > 0.02;
  g.userData = {geo:geo, arr:arr, lg:lg, knot:knot, k:k};
  return g;
 }
 function setBag(g, k){
  var d = g.userData; if (Math.abs(d.k - k) < 1e-4) return;
  d.k = k; bagShape(d.geo, k); bagLines(k, d.arr); d.lg.attributes.position.needsUpdate = true;
  d.knot.scale.setScalar(Math.max(0.001, k)); d.knot.visible = k > 0.02;
 }

 // Carton fermé avec bande adhésive (stock prêt à partir)
 function carton(p, w, h, d, x, y, z, tape, ry){
  var g = group(p, x, y, z, ry);
  roundedBox(g, w, h, d, 0, 0, 0, {radius:.003, segments:3, line:M.soft});
  roundedBox(g, w*0.18, 0.006, d + 0.004, 0, h, 0, {radius:.001, segments:3, mat:tape || M.felt, edges:false, shadow:false});
  roundedBox(g, w*0.18, h*0.35, 0.006, 0, h*0.65, d/2 + 0.003, {radius:.001, segments:3, mat:tape || M.felt, edges:false, shadow:false});
  // Joint des rabats et fine épaisseur du carton, visibles autour de l'adhésif.
  [-1,1].forEach(function(side){
   box(g,(w - w*.18)/2,.0009,.001,side*w*.295,h+.0008,0,{mat:M.dark,edges:false,shadow:false});
   box(g,.001,h-.014,.001,side*(w/2-.012),.007,d/2+.0006,{mat:M.felt,edges:false,shadow:false});
  });
  roundedBox(g,w*.23,h*.2,.001, w*.27,h*.32,d/2+.001,{radius:.0002,mat:M.felt,edges:false,shadow:false});
  for(var j=0;j<12;j++) box(g,.0013+(j%3)*.0005,h*.07,.001,w*.18+j*w*.014,h*.35,d/2+.002,{mat:M.strap,edges:false,shadow:false});
  return g;
 }
 // Poste de travail : plateau, piètement en T, panneau de feutre
 function desk(p, cx, cz, w, d){
  var entryStart = p.children.length;
  roundedBox(p, w, 0.03, d, cx, DESK - 0.03, cz, {mat:M.dark, radius:.005, segments:5, line:M.soft});
  roundedBox(p, w-.07, .012, d-.04, cx, DESK-.042, cz, {mat:M.body,radius:.002,segments:3,edges:false});
  [-1, 1].forEach(function(s){
   var x = cx + s*(w/2 - 0.08);
   roundedBox(p, 0.05, DESK - 0.03, 0.05, x, 0, cz, {mat:M.metal,radius:.004,segments:4,line:M.soft});
   roundedBox(p, 0.06, 0.03, d - 0.06, x, 0, cz, {mat:M.metal,radius:.004,segments:4,line:M.soft});
   // Patins souples enveloppant les extrémités des traverses métalliques.
   [-1, 1].forEach(function(end){
    roundedBox(p, 0.076, 0.042, 0.078, x, -0.002, cz + end*(d/2 - 0.056), {mat:M.press, radius:0.009, seg:5, line:M.soft});
   });
   roundedBox(p, 0.05, 0.04, d - 0.1, x, DESK - 0.07, cz, {mat:M.metal,radius:.004,segments:4,line:M.soft});
   roundedBox(p,.076,.028,.08,x,.03,cz,{radius:.005,segments:3,mat:M.dark,line:M.soft});
   roundedBox(p,.074,.022,.11,x,DESK-.09,cz,{radius:.003,segments:3,mat:M.dark,line:M.soft});
   [.08,DESK-.08].forEach(function(y){
    cyl(p,.005,.005,.003,x,y,cz+.027,{center:true,rx:Math.PI/2,seg:12,mat:M.press,edges:false,shadow:false});
   });
  });
  roundedBox(p, w - 0.04, 0.42, 0.025, cx, DESK, cz - d/2 + 0.025, {mat:M.felt,radius:.004,segments:4,line:M.soft});
  // Bordure arrière et attaches du panneau ; la face reste libre pour les repères du parcours.
  roundedBox(p,w-.04,.012,.029,cx,DESK+.408,cz-d/2+.025,{mat:M.dark,radius:.002,segments:3,edges:false});
  [-1,1].forEach(function(side){ roundedBox(p,.028,.04,.036,cx+side*(w/2-.11),DESK-.015,cz-d/2+.025,{radius:.003,mat:M.metal,line:M.soft}); });
  if (p === W) entryUnit('desk-' + cx, entryStart);
 }

 /* ---------- décor : pharmacie, passage, atelier ---------- */
 function slab(x0, x1, z0, z1){ box(W, x1 - x0, 0.08, z1 - z0, (x0 + x1)/2, -0.08, (z0 + z1)/2); }
 var pharmacyFloorStart = W.children.length;
 slab(-2.3, 2.0, -1.45, 1.0);
 slab(2.0, 4.2, -0.42, 0.62);
 slab(4.2, 15.65, -1.62, 1.0);
 for (var dx = 2.16; dx < 4.0; dx += 0.42) box(W, 0.2, 0.004, 0.035, dx + 0.1, 0, 0.5, {mat:M.dark, edges:false, shadow:false});

 // Pharmacie : mobilier arrondi, produits en volume et comptoir équipé.
 var pharmacyDecorStart = W.children.length;
 box(W, 4.2, 1.7, 0.1, -0.2, 0, -1.35);
 box(W, 0.1, 1.7, 1.45, -2.25, 0, -0.67);
 roundedBox(W, 4.12, 0.06, 0.035, -0.2, 0.015, -1.29, {mat:M.felt, edges:false});
 entryLayer = 'details';
 var cross = group(W, 0.95, 1.36, -1.27);
 var crossS = new THREE.Shape(), ca = 0.05, cl = 0.17;
 [[-ca, cl], [ca, cl], [ca, ca], [cl, ca], [cl, -ca], [ca, -ca], [ca, -cl], [-ca, -cl], [-ca, -ca], [-cl, -ca], [-cl, ca], [-ca, ca]].forEach(function(pt, i){ if (i) crossS.lineTo(pt[0], pt[1]); else crossS.moveTo(pt[0], pt[1]); });
 var crossG = new THREE.ExtrudeGeometry(crossS, {depth:0.034, bevelEnabled:true, bevelThickness:0.008, bevelSize:0.006, bevelSegments:4}); crossG.translate(0, 0, -0.017);
 finish(cross, new THREE.Mesh(crossG, M.green), crossG, {thr:32});
 (function pharmacy(){
  entryLayer = 'furniture';
  var r = rnd(31), mutedGreen = lam(0xDDE8DA), screen = lam(0x173D2F), rubber = lam(0x607068);
  function pack(p, x, y, z, w, h, d, accent){
   roundedBox(p, w, h, d, x, y, z, {radius:0.003, seg:3, line:M.soft});
   box(p, w*0.9, h*0.18, 0.0015, x, y + h*0.08, z + d/2 + 0.002, {mat:accent ? M.green : mutedGreen, edges:false, shadow:false});
   box(p, w*0.52, 0.003, 0.0015, x - w*0.12, y + h*0.64, z + d/2 + 0.002, {mat:M.dark, edges:false, shadow:false});
   box(p, w*0.38, 0.003, 0.0015, x - w*0.19, y + h*0.56, z + d/2 + 0.002, {mat:M.dark, edges:false, shadow:false});
  }
  function bottle(p, x, y, z, h){
   var rad = h*0.18, profile = [[0,0], [rad*0.82,0], [rad,0.01], [rad,h*0.7], [rad*0.82,h*0.8], [rad*0.52,h*0.87], [rad*0.52,h*0.94]];
   var geo = new THREE.LatheGeometry(profile.map(function(pt){ return new THREE.Vector2(pt[0], pt[1]); }), 36);
   var m = new THREE.Mesh(geo, M.body); m.position.set(x,y,z); finish(p,m,geo,{thr:35,line:M.soft});
   cyl(p, rad*0.63, rad*0.63, h*0.09, x, y + h*0.92, z, {mat:mutedGreen, seg:36, thr:45});
   cyl(p, rad*1.009, rad*1.009, h*0.23, x, y + h*0.33, z, {mat:M.felt, seg:36, edges:false});
   roundedBox(p, rad*0.8, h*0.05, 0.002, x, y + h*0.44, z + rad + 0.001, {mat:M.green, edges:false});
  }
  function fillShelf(p, w, y, z, depth, seed){
   var rand = rnd(seed), x = -w/2 + 0.035, index = 0;
   while (x < w/2 - 0.095){
    var pw = 0.078 + rand()*0.032, ph = 0.13 + rand()*0.085;
    if (index % 4 === 1){ bottle(p,x + pw/2,y,z,ph); bottle(p,x + pw/2,y,z - depth*0.45,ph); }
    else pack(p,x + pw/2,y,z,pw - 0.012,ph,depth,index % 3 === 0);
    x += pw + 0.008; index++;
   }
  }
  // Armoire ouverte avec joues épaisses, tablette à lèvres et rangées de flacons.
  var shelves = group(W, -2.02, 0, -0.62, Math.PI/2), sw = 1.2, sd = 0.34, sh = 1.5;
  roundedBox(shelves, sw, sh, 0.028, 0, 0, -sd/2 + 0.014, {mat:M.felt, radius:0.006});
  [-1,1].forEach(function(side){ roundedBox(shelves,0.045,sh,sd,side*(sw/2 - 0.0225),0,0,{radius:0.008}); });
  [0.08,0.45,0.82,1.19].forEach(function(y,i){
   roundedBox(shelves,sw - 0.08,0.025,sd - 0.018,0,y,0,{mat:M.metal,radius:0.005});
   roundedBox(shelves,sw - 0.1,0.025,0.017,0,y + 0.005,sd/2 - 0.009,{mat:M.felt,radius:0.003,edges:false});
   fillShelf(shelves,sw - 0.12,y + 0.025,0.065,0.125,11 + i*7);
  });
  roundedBox(shelves,sw,0.045,sd,0,sh - 0.045,0,{radius:0.008});
  // Comptoir avec plinthe en retrait, façades et plan de travail biseauté.
  var counterStart = W.children.length;
  roundedBox(W,1.09,0.86,0.5,1.25,0.06,-0.54,{radius:0.025,seg:5});
  roundedBox(W,1.0,0.06,0.41,1.25,0,-0.54,{mat:M.dark,radius:0.01,edges:false});
  roundedBox(W,1.2,0.05,0.59,1.25,0.92,-0.54,{mat:M.dark,radius:0.012,seg:5});
  [1.0,1.5].forEach(function(x){
   roundedBox(W,0.47,0.72,0.01,x,0.12,-0.284,{mat:M.felt,radius:0.002,line:M.soft});
   roundedBox(W,0.12,0.012,0.017,x,0.75,-0.271,{mat:M.metal,radius:0.003,line:M.soft});
  });
  // Caisse : pied, écran orienté vers l'accueil, clavier et tiroir intégré.
  entryLayer = 'details';
  var till = group(W,1.45,0.97,-0.6,-0.12);
  roundedBox(till,0.28,0.043,0.22,0,0,0,{mat:M.felt,radius:0.009});
  roundedBox(till,0.055,0.085,0.05,0,0.043,-0.045,{mat:M.metal,radius:0.009});
  var display = group(till,0,0.11,-0.05); display.rotation.x = -0.12;
  roundedBox(display,0.25,0.18,0.027,0,0,0,{mat:M.dark,radius:0.006,seg:5});
  roundedBox(display,0.223,0.146,0.003,0,0.017,0.016,{mat:screen,radius:0.0007,edges:false,shadow:false});
  box(display,0.17,0.007,0.001,0,0.132,0.018,{mat:mutedGreen,edges:false,shadow:false});
  [0.07,0.088,0.106].forEach(function(y){ box(display,0.11,0.004,0.001,-0.03,y,0.018,{mat:M.felt,edges:false,shadow:false}); });
  roundedBox(till,0.21,0.008,0.065,0,0.043,0.065,{mat:M.dark,radius:0.002});
  for(var ky=0;ky<3;ky++) for(var kx=0;kx<9;kx++) roundedBox(till,0.015,0.003,0.013,-0.085 + kx*0.021,0.051,0.045 + ky*0.018,{mat:M.body,radius:0.0006,seg:2,edges:false,shadow:false});
  entryUnit('comptoir-pharmacie', counterStart);
  // Armoire à tiroirs : façades séparées, poignées courbes et porte-étiquettes.
  var drawersStart = W.children.length;
  entryLayer = 'furniture';
  roundedBox(W,0.74,1.06,0.25,1.49,0,-1.17,{radius:0.012,seg:5});
  for(var cx=0;cx<3;cx++) for(var cy=0;cy<6;cy++){
   var xx=1.25 + cx*0.24, yy=0.035 + cy*0.168;
   roundedBox(W,0.225,0.151,0.012,xx,yy,-1.038,{mat:M.felt,radius:0.002,seg:3,line:M.soft});
   roundedBox(W,0.065,0.014,0.02,xx,yy + 0.105,-1.022,{mat:M.metal,radius:0.003,seg:4,line:M.soft});
   roundedBox(W,0.069,0.022,0.0018,xx,yy + 0.045,-1.03,{mat:M.body,radius:0.0004,edges:false,shadow:false});
  }
  entryUnit('armoire-pharmacie', drawersStart);
  // Terminal de paiement arrondi avec écran encastré et touches en volume.
  var counterAccessoriesStart = W.children.length;
  entryLayer = 'details';
  var pay = group(W,1.04,0.972,-0.43,0.15); pay.rotation.x = -0.18;
  roundedBox(pay,0.092,0.032,0.125,0,0,0,{mat:M.press,radius:0.007,seg:5});
  roundedBox(pay,0.062,0.002,0.044,0,0.032,-0.029,{mat:screen,radius:0.0004,edges:false,shadow:false});
  for(var py=0;py<3;py++) for(var px=0;px<3;px++) roundedBox(pay,0.012,0.002,0.01,-0.021 + px*0.021,0.032,0.009 + py*0.014,{mat:px===2 && py===2 ? M.green : M.dark,radius:0.0004,seg:2,edges:false,shadow:false});
  pack(W,0.79,0.972,-0.64,0.09,0.12,0.06,true); bottle(W,0.84,0.972,-0.51,0.11);
  entryUnit('comptoir-pharmacie', counterAccessoriesStart);
  // Îlot double face : montants arrondis et produits mêlant boîtes et flacons.
  entryLayer = 'furniture';
  var g = group(W,-1.3,0,0.5,0.05);
  roundedBox(g,1.0,0.1,0.44,0,0,0,{mat:M.dark,radius:0.016,seg:5});
  [-1,1].forEach(function(side){ roundedBox(g,0.045,0.94,0.42,side*0.4775,0.1,0,{radius:0.008}); });
  roundedBox(g,0.91,0.9,0.025,0,0.1,0,{mat:M.felt,radius:0.005});
  [0.1,0.42,0.74].forEach(function(y,i){
   roundedBox(g,0.92,0.025,0.42,0,y,0,{mat:M.metal,radius:0.005});
   fillShelf(g,0.9,y + 0.025,0.12,0.11,41 + i*5);
   var back = group(g,0,0,0,Math.PI); fillShelf(back,0.9,y + 0.025,0.12,0.11,51 + i*5);
  });
  roundedBox(g,1.0,0.04,0.44,0,1.0,0,{radius:0.009,seg:5});
  // Balance à plateau et afficheur : silhouettes arrondies et surface antidérapante.
  var sc = group(W,-1.95,0,0.32,0.4);
  roundedBox(sc,0.32,0.06,0.36,0,0,0,{mat:M.dark,radius:0.013,seg:5});
  roundedBox(sc,0.276,0.006,0.304,0,0.06,0,{mat:rubber,radius:0.0013,edges:false});
  roundedBox(sc,0.055,1.04,0.055,0,0.06,-0.14,{mat:M.metal,radius:0.012});
  roundedBox(sc,0.21,0.17,0.065,0,1.05,-0.12,{radius:0.014,seg:5});
  roundedBox(sc,0.16,0.066,0.003,0,1.125,-0.086,{mat:screen,radius:0.0007,edges:false,shadow:false});
 })();

 entryLayer = 'details';

 // Borne Gekomed avec les vrais visuels d'impression (« Box Finale - Imprimeur du Roi », avril 2025) :
 // 4 faces de 33 × 86 cm (façade « Je dépose mes attelles usagées », « Nous collectons… », QR, chiffres),
 // couvercle aux 4 étapes autour de l'ouverture, logos sur les rebords avant et arrière.
 // Façade et côté droit transparents pendant le dépôt.
 var texLoader = new THREE.TextureLoader();
 function artTex(url){
  if (!url) return null;
  var ready, fail;
  assetLoads.push(new Promise(function(resolve, reject){ ready = resolve; fail = reject; }));
  var t = texLoader.load(url, function(){ ready(); if (visible()) render(); }, undefined, fail);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
 }
 var facesTex = artTex(root.getAttribute('data-borne-faces')), lidTex = artTex(root.getAttribute('data-borne-lid'));
 function remapUV(geo, u0, u1, v0, v1){
  var uv = geo.attributes.uv;
  for (var i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i)*(u1 - u0), v0 + uv.getY(i)*(v1 - v0));
  uv.needsUpdate = true; return geo;
 }
 var BW = 0.335, BH = 0.86, BT = 0.012, xray = [];
 function xm(base){ var m = base.clone(); m.transparent = true; xray.push(m); return m; }
 M.box = lam(0x476C57);
 var artMat = facesTex ? lam(0xffffff, {map:facesTex}) : M.box, lidMat = lidTex ? lam(0xffffff, {map:lidTex}) : M.box;
 var xl = M.line.clone(), xb = xm(M.box), xart = xm(artMat);
 // l'affiche de la borne, encadrée au mur de la pharmacie
 (function sheet(){
  var SW = 0.28, SH = 0.5, sg = new THREE.PlaneGeometry(SW, SH, 16, 28), sp = sg.attributes.position;
  for (var i = 0; i < sp.count; i++){
   var u = sp.getX(i)/SW + 0.5, v = sp.getY(i)/SH + 0.5, c = (u - v) - 0.62;
   if (c > 0){ var a = c*1.9; sp.setZ(i, 0.06*a*a); sp.setY(i, sp.getY(i) + 0.03*a*a); }
  }
  sg.computeVertexNormals();
  if (facesTex) remapUV(sg, 0, 0.25, 0.04, 0.98);
  var front = new THREE.Mesh(sg, facesTex ? lam(0xffffff, {map:facesTex}) : M.box), back = new THREE.Mesh(sg, lam(0xF4F6F4, {side:THREE.BackSide}));
  [front, back].forEach(function(m){ m.position.set(0.35, 1.03, -1.297); m.receiveShadow = true; W.add(m); });
  front.castShadow = true;
 })();
 entryLayer = 'furniture';
 var borne = group(W, 0, 0, 0);
 box(borne, BW, BH, BT, 0, 0, -BW/2 + BT/2, {mat:M.box});
 box(borne, BT, BH, BW, -BW/2 + BT/2, 0, 0, {mat:M.box});
 box(borne, BW, 0.03, BW, 0, 0, 0, {mat:M.box});
 box(borne, BT, BH, BW - 2*BT, BW/2 - BT/2, 0, 0, {mat:xb, line:xl, shadow:false, ro:3});
 box(borne, BW, BH, BT, 0, 0, BW/2 - BT/2, {mat:xb, line:xl, shadow:false, ro:3});
 // Faces imprimées : atlas avant | droite | arrière | gauche
 [[0, 0, BW/2, 0, true], [1, BW/2, 0, Math.PI/2, true], [2, 0, -BW/2, Math.PI, false], [3, -BW/2, 0, -Math.PI/2, false]].forEach(function(f){
  var geo = remapUV(new THREE.PlaneGeometry(BW, BH), f[0]/4, (f[0] + 1)/4, 0, 1);
  var pm = new THREE.Mesh(geo, f[4] ? xart : artMat);
  var n = new THREE.Vector3(Math.sin(f[3]), 0, Math.cos(f[3]));
  pm.position.set(f[1] + n.x*0.002, BH/2, f[2] + n.z*0.002); pm.rotation.y = f[3];
  pm.receiveShadow = true; if (f[4]) pm.renderOrder = 3; borne.add(pm);
 });
 // Couvercle : dessus percé (visuel des étapes calé sur l'ouverture), rebords avant et arrière imprimés.
 var CW = BW + 0.032, CH = 0.1, OX = 0.115, OZ = 0.11, cap = group(borne, 0, BH - 0.02, 0);
 box(cap, CW, CH, 0.012, 0, 0, CW/2 - 0.006, {mat:M.box}); box(cap, CW, CH, 0.012, 0, 0, -CW/2 + 0.006, {mat:M.box});
 box(cap, 0.012, CH, CW - 0.024, CW/2 - 0.006, 0, 0, {mat:M.box}); box(cap, 0.012, CH, CW - 0.024, -CW/2 + 0.006, 0, 0, {mat:M.box});
 var capS = new THREE.Shape();
 capS.moveTo(-CW/2, -CW/2); capS.lineTo(CW/2, -CW/2); capS.lineTo(CW/2, CW/2); capS.lineTo(-CW/2, CW/2); capS.lineTo(-CW/2, -CW/2);
 var capH = new THREE.Path();
 capH.moveTo(-OX, -OZ); capH.lineTo(-OX, OZ); capH.lineTo(OX, OZ); capH.lineTo(OX, -OZ); capH.lineTo(-OX, -OZ);
 capS.holes.push(capH);
 var capG = new THREE.ExtrudeGeometry(capS, {depth:0.012, bevelEnabled:false});
 // UV du dessus en mètres : le carré intérieur des étapes (57 % de l'image) épouse l'ouverture.
 var ART = (2*OX/0.57), LT = 512/784, cuv = capG.attributes.uv;
 for (var ci = 0; ci < cuv.count; ci++) cuv.setXY(ci, 0.5 + cuv.getX(ci)/ART, (1 - LT) + (0.5 + cuv.getY(ci)/ART)*LT);
 capG.rotateX(-Math.PI/2);
 var capTop = new THREE.Mesh(capG, lidMat); capTop.position.y = CH - 0.012; finish(cap, capTop, capG, {thr:30});
 [[CW/2 + 0.001, 0, 512, 648], [-CW/2 - 0.001, Math.PI, 648, 784]].forEach(function(r){
  var rg = remapUV(new THREE.PlaneGeometry(CW, CH), 0, 1, 1 - r[3]/784, 1 - r[2]/784);
  var rp = new THREE.Mesh(rg, lidMat); rp.position.set(0, CH/2, r[0]); rp.rotation.y = r[1]; cap.add(rp);
 });

 // Diable : tubes lisses, poignées courbes, pneus profilés et moyeux distincts.
 var truck = group(W, 0.95, 0, 0, Math.PI/2), frame = group(truck, 0, 0.1, 0);
 [-.17,.17].forEach(function(x){
  cyl(frame,.018,.018,1.12,x,-.07,-.03,{mat:M.metal,seg:32,thr:35});
  var bend=new THREE.CatmullRomCurve3([new THREE.Vector3(x,1.025,-.03),new THREE.Vector3(x,1.069,-.055),new THREE.Vector3(x,1.052,-.105),new THREE.Vector3(x,1.035,-.14)]);
  var bendG=new THREE.TubeGeometry(bend,18,.016,16,false);
  finish(frame,new THREE.Mesh(bendG,M.metal),bendG,{edges:false});
  cyl(frame,.022,.022,.084,x,1.035,-.174,{rx:Math.PI/2,center:true,mat:M.press,seg:32,thr:35});
  for(var ridge=0;ridge<5;ridge++) cyl(frame,.023,.023,.002,x,1.035,-.202+ridge*.014,{rx:Math.PI/2,center:true,mat:M.press,seg:28,edges:false});
  roundedBox(frame,.042,.052,.05,x,.24,-.03,{mat:M.dark,radius:.005,segments:3,line:M.soft});
 });
 [.29,.515,.995].forEach(function(y){cyl(frame,.013,.013,.34,0,y,-.03,{rz:Math.PI/2,center:true,mat:M.metal,seg:28,thr:35});});
 roundedBox(frame,.4,.022,.4,0,-.085,.18,{mat:M.dark,radius:.0035,segments:4,line:M.soft});
 roundedBox(frame,.38,.013,.016,0,-.063,.374,{mat:M.metal,radius:.003,segments:3,line:M.soft});
 // Le logement du sac garde son repère exact sur la bavette.
 var slot=group(frame,0,-.063,.2),wheels=[];
 var tyreProfile=[[.03,-.028],[.071,-.028],[.093,-.022],[.1,-.012],[.1,.012],[.093,.022],[.071,.028],[.03,.028]].map(function(p){return new THREE.Vector2(p[0],p[1]);});
 var tyreGeo=new THREE.LatheGeometry(tyreProfile,48);tyreGeo.rotateZ(Math.PI/2);
 [-.22,.22].forEach(function(x){
  var wheel=group(truck,x,.1,0),side=x<0?-1:1;
  finish(wheel,new THREE.Mesh(tyreGeo,M.press),tyreGeo,{edges:false});
  cyl(wheel,.062,.062,.058,0,0,0,{rz:Math.PI/2,center:true,mat:M.metal,seg:40,thr:35});
  cyl(wheel,.026,.026,.064,0,0,0,{rz:Math.PI/2,center:true,mat:M.dark,seg:32,thr:35});
  cyl(wheel,.012,.012,.07,0,0,0,{rz:Math.PI/2,center:true,mat:M.metal,seg:28,edges:false});
  [-1,1].forEach(function(face){
   var ringG=new THREE.TorusGeometry(.083,.002,8,48),ring=new THREE.Mesh(ringG,M.dark);
   ring.rotation.y=Math.PI/2;ring.position.x=face*.026;wheel.add(ring);
  });
  for(var bolt=0;bolt<5;bolt++){
   var a=bolt/5*Math.PI*2;
   cyl(wheel,.004,.004,.003,side*.031,Math.cos(a)*.043,Math.sin(a)*.043,{rz:Math.PI/2,center:true,mat:M.press,seg:12,edges:false,shadow:false});
  }
  roundedBox(truck,.042,.14,.042,x-side*.028,.09,-.042,{radius:.005,mat:M.metal,segments:4,line:M.soft});
  wheels.push(wheel);
 });
 cyl(truck,.012,.012,.46,0,.1,0,{rz:Math.PI/2,center:true,mat:M.metal,seg:28,edges:false});

 // La pharmacie arrive complète, socle et murs compris, autour d'un pivot
 // commun. Les sols du passage et de l'atelier restent dans leurs unités.
 entryUnit('pharmacie-complete', pharmacyFloorStart, pharmacyFloorStart + 1);
 entryUnit('pharmacie-complete', pharmacyDecorStart);

 // Atelier : panneaux de paroi, plinthe et bandeau supérieur adoucis.
 entryLayer = 'structure';
 roundedBox(W,11.4,1.9,.1,9.95,0,-1.55,{radius:.008,segments:4,line:M.soft});
 roundedBox(W,11.4,.06,.012,9.95,.01,-1.492,{radius:.002,segments:3,mat:M.felt,edges:false});
 roundedBox(W,11.4,.018,.112,9.95,1.88,-1.55,{radius:.003,segments:3,mat:M.felt,line:M.soft});
 [7.75,10.95,13.95,15.25].forEach(function(x){box(W,.002,1.77,.001,x,.08,-1.499,{mat:M.felt,edges:false,shadow:false});});
 entryLayer = 'furniture';
 desk(W,5.75,-.55,1.3,.65);
 var logStep = 0;
 // Le tri initial reprend les champs de l'application : famille, marque et note d'état,
 // puis ajout confirmé. Les gros libellés restent lisibles dans la scène.
 var screenTex = tex(768, 480, function(g, w, h){
  function panel(x, y, pw, ph, radius, fill){
   g.fillStyle = fill; g.beginPath();
   g.moveTo(x + radius, y); g.lineTo(x + pw - radius, y);
   g.quadraticCurveTo(x + pw, y, x + pw, y + radius); g.lineTo(x + pw, y + ph - radius);
   g.quadraticCurveTo(x + pw, y + ph, x + pw - radius, y + ph); g.lineTo(x + radius, y + ph);
   g.quadraticCurveTo(x, y + ph, x, y + ph - radius); g.lineTo(x, y + radius);
   g.quadraticCurveTo(x, y, x + radius, y); g.fill();
  }
  function text(txt, x, y, size, color, weight){
   g.fillStyle = color || '#183D2D'; g.font = (weight || '500') + ' ' + size + 'px "DM Sans", sans-serif'; g.fillText(txt, x, y);
  }
  g.fillStyle = '#F4F7F3'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0F3E2E'; g.fillRect(0, 0, w, 62);
  text('Gekomed', 26, 42, 33, '#fff'); text('Tri initial', 486, 41, 31, '#fff');
  panel(20, 78, w - 40, 382, 14, '#fff');
  text('Nouvelle attelle', 42, 122, 35);
  text('Famille', 42, 164, 25, '#78847C'); text('Marque', 407, 164, 25, '#78847C');
  panel(40, 176, 320, 64, 8, logStep >= 1 ? '#EAF3E4' : '#F3F5F2');
  panel(405, 176, 320, 64, 8, logStep >= 4 ? '#EAF3E4' : '#F3F5F2');
  text(logStep >= 1 ? 'Genou' : 'Sélectionner', 58, 219, 31, logStep >= 1 ? '#0F3E2E' : '#95A098');
  text(logStep >= 4 ? 'Renseignée' : 'Sélectionner', 423, 219, 31, logStep >= 4 ? '#0F3E2E' : '#95A098');
  text('État de l’attelle', 42, 287, 28);
  var score = logStep >= 8 ? 7 : Math.max(0, logStep - 4)*2;
  panel(42, 306, 500, 22, 11, '#E3E8E2');
  if (score) panel(42, 306, 500*score/10, 22, 11, '#6FAE3E');
  text(score ? score + ' / 10' : '— / 10', 566, 331, 39);
  if (logStep < 11){
   panel(40, 364, 398, 68, 10, logStep === 10 ? '#6FAE3E' : '#0F3E2E');
   text(logStep === 10 ? 'Enregistrement…' : 'AJOUTER L’ATTELLE', 62, 409, 29, '#fff');
   text('app.gekomed.com', 486, 408, 23, '#78847C');
   if (logStep >= 5){
    var px = logStep < 9 ? 350 : 376, py = logStep < 9 ? 313 : 397;
    g.fillStyle = '#fff'; g.strokeStyle = '#183D2D'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(px, py - 14); g.lineTo(px + 22, py + 7); g.lineTo(px + 8, py + 10); g.lineTo(px + 4, py + 25); g.closePath(); g.fill(); g.stroke();
   }
  } else {
   panel(40, 362, 686, 70, 10, '#E6F3DD');
   text('✓ Attelle ajoutée avec succès', 61, 407, 31, '#326B27');
  }
 });
 entryLayer = 'details';
 var LT2 = {x:6.15, z:-0.575}, laptop = group(W, LT2.x, DESK + 0.014, LT2.z, 0.12);
 roundedBox(laptop, 0.43, 0.024, 0.28, 0, 0, 0, {radius:.009, segments:5, mat:M.metal, edges:false});
  roundedBox(laptop, 0.354, 0.002, 0.13, 0, 0.024, -0.046, {radius:.003, mat:M.black, edges:false, shadow:false});
  laptop.userData.entryUnit = 'desk-5.75'; laptop.userData.entryLayer = 'furniture';
 for (var keyRow = 0; keyRow < 5; keyRow++){
  for (var keyColumn = 0; keyColumn < 10; keyColumn++){
   roundedBox(laptop, 0.029, 0.002, 0.019, -0.15 + keyColumn*0.0333, 0.026, -0.09 + keyRow*0.024, {radius:.002, segments:2, mat:M.dark, edges:false, shadow:false});
  }
 }
 roundedBox(laptop, 0.114, 0.002, 0.06, 0, 0.025, 0.074, {radius:.005, segments:4, mat:M.dark, edges:false, shadow:false});
 roundedBox(laptop, 0.106, 0.002, 0.052, 0, 0.027, 0.074, {radius:.004, segments:4, mat:M.felt, edges:false, shadow:false});
 [-1, 1].forEach(function(side){
  cyl(laptop, 0.01, 0.01, 0.076, side*0.14, 0.028, -0.123, {rz:Math.PI/2, center:true, mat:M.dark, seg:24, edges:false});
  for (var speakerSlot = 0; speakerSlot < 7; speakerSlot++) box(laptop, .009, .001, .0015, side*.194, .025, -.08 + speakerSlot*.013, {mat:M.dark, edges:false, shadow:false});
 });
 box(laptop, .013, .002, .003, .18, .024, .103, {mat:M.green, edges:false, shadow:false});
 var lid = group(laptop, 0, 0.03, -0.123); lid.rotation.x = -0.16;
 roundedBox(lid, 0.425, 0.287, 0.016, 0, 0, 0, {radius:.008, segments:5, mat:M.metal, edges:false});
 roundedBox(lid, 0.400, 0.262, 0.003, 0, 0.012, 0.009, {radius:.004, segments:4, mat:M.black, edges:false, shadow:false});
 var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.385, 0.241), new THREE.MeshBasicMaterial({map:screenTex}));
 scr.position.set(0, 0.143, 0.011); lid.add(scr);
 cyl(lid, .0025, .0025, .001, 0, .278, .011, {rx:Math.PI/2, center:true, mat:M.black, seg:16, edges:false, shadow:false});

 var sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.26, 0.012), [M.body, M.body, M.body, M.body, lam(0xffffff, {map:signTex}), M.body]);
 sign.position.set(6.0, 1.42, -1.494); finish(W, sign, sign.geometry, {shadow:false});
 var pileBraces = [];
 var pileMat = lam(0xEEF4F0, {transparent:true, opacity:.4, side:DS, depthWrite:false});
 [[4.6, -1.24, 0.3], [5.08, -1.27, 1.1], [4.85, -0.8, 2.2]].forEach(function(b){
  var bag = makeBag(1, pileMat, M.soft); bag.position.set(b[0], 0, b[1]); bag.rotation.y = b[2]; W.add(bag);
  var inner = makeBrace(M.bodyDS, M.darkDS, M.feltDS); inner.position.set(0, 0.36, 0); bag.add(inner); pileBraces.push(inner);
 });
 // Étagère murale : bord arrondi, consoles et flacons profilés.
 var wallShelfStart = W.children.length;
 roundedBox(W,1.0,.025,.2,7.0,1.36,-1.4,{mat:M.metal,radius:.004,segments:4,line:M.soft});
 [6.63,7.37].forEach(function(x){roundedBox(W,.018,.13,.10,x,1.255,-1.435,{mat:M.dark,radius:.003,segments:3,line:M.soft});});
 [6.66,6.82,6.98,7.3].forEach(function(x,i){
  var h=.2-(i%2)*.04,profile=[[0,0],[.035,0],[.043,.012],[.043,h*.71],[.034,h*.85],[.018,h*.91],[.018,h],[0,h]].map(function(pt){return new THREE.Vector2(pt[0],pt[1]);});
  var geo=new THREE.LatheGeometry(profile,32),bottle=new THREE.Mesh(geo,M.body);bottle.position.set(x,1.385,-1.4);finish(W,bottle,geo,{thr:35});
  cyl(W,.021,.021,.026,x,1.385+h,-1.4,{seg:28,mat:M.dark,thr:35});
  roundedBox(W,.047,h*.27,.001,x,1.385+h*.34,-1.356,{mat:M.felt,radius:.0002,edges:false,shadow:false});
 });

 entryUnit('etagere-atelier', wallShelfStart);
 // Bac de désinfection : cuve en inox, façades vitrées, bain teinté.
 entryLayer = 'furniture';
 var TK = {x:7.0, z:-0.45, y:0.85};
 var tank = group(W, TK.x, 0, TK.z);
 var tankFrontMat = lam(0xEDF2EE, {transparent:true, opacity:1, side:DS});
 // Pieds télescopiques, manchons et patins : les volumes métalliques ont un vrai biseau.
 [-1, 1].forEach(function(sx){ [-1, 1].forEach(function(sz){
  roundedBox(tank, .04, .385, .04, sx*.46, .015, sz*.26, {radius:.003, segments:4, mat:M.metal, thr:35});
  roundedBox(tank, .048, .032, .048, sx*.46, .302, sz*.26, {radius:.004, segments:4, mat:M.dark, thr:35});
  roundedBox(tank, .053, .025, .053, sx*.46, 0, sz*.26, {radius:.009, segments:5, mat:M.press, thr:35});
  cyl(tank, .0035, .0035, .0015, sx*.46, .319, sz*.285, {rx:Math.PI/2, center:true, seg:16, mat:M.press, edges:false});
 }); });
 [-1, 1].forEach(function(side){
  roundedBox(tank, .91, .022, .026, 0, .305, side*.26, {radius:.003, mat:M.metal, thr:35});
  roundedBox(tank, .026, .022, .50, side*.46, .305, 0, {radius:.003, mat:M.metal, thr:35});
 });
 roundedBox(tank, 1.0, .03, .6, 0, .4, 0, {radius:.006, segments:5, mat:M.metal, thr:35});
 roundedBox(tank, 1.0, .55, .035, 0, .4, -.2825, {radius:.007, segments:5, thr:35});
 roundedBox(tank, 1.0, .55, .035, 0, .4, .2825, {radius:.007, segments:5, mat:tankFrontMat, shadow:false, ro:3, thr:35});
 roundedBox(tank, .035, .55, .53, -.4825, .4, 0, {radius:.007, segments:5, thr:35});
 roundedBox(tank, .035, .55, .53, .4825, .4, 0, {radius:.007, segments:5, mat:tankFrontMat, shadow:false, ro:3, thr:35});
 box(tank, 0.93, 0.42, 0.53, 0, 0.43, 0, {mat:M.liquid, edges:false, shadow:false, receive:false, ro:1});
 roundedBox(tank, 1.03, .022, .05, 0, .95, .29, {radius:.005, segments:6, mat:M.metal, thr:35});
 roundedBox(tank, 1.03, .022, .05, 0, .95, -.29, {radius:.005, segments:6, mat:M.metal, thr:35});
 roundedBox(tank, .05, .022, .53, -.49, .95, 0, {radius:.005, segments:6, mat:M.metal, thr:35});
 roundedBox(tank, .05, .022, .53, .49, .95, 0, {radius:.005, segments:6, mat:M.metal, thr:35});
 // Vidange et vis visibles restent en dehors du volume de bain et de l'attelle.
 cyl(tank, .024, .024, .012, -.30, .431, .306, {rx:Math.PI/2, center:true, seg:32, mat:M.dark, thr:35});
 cyl(tank, .01, .01, .02, -.30, .431, .319, {rx:Math.PI/2, center:true, seg:24, mat:M.metal, edges:false});
 roundedBox(tank, .06, .009, .013, -.30, .424, .331, {radius:.002, mat:M.strap, edges:false});
 [-.40, .40].forEach(function(x){ cyl(tank, .003, .003, .001, x, .935, .301, {rx:Math.PI/2, center:true, seg:16, mat:M.dark, edges:false}); });
 var ripples = [0, 1].map(function(){
  var r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({color:0x0F3E2E, transparent:true, opacity:0, depthWrite:false, side:DS}));
  r.rotation.x = -Math.PI/2; r.position.set(TK.x, TK.y + 0.002, TK.z); r.renderOrder = 2; r.visible = false; W.add(r); return r;
 });

 // Bulles limitées à l'immersion : aucun éclat artificiel à la sortie du bain.
 var BUB = 26, bubR = rnd(41), bubBase = [];
 var bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), lam(0xffffff, {transparent:true, opacity:.75, depthWrite:false}), BUB);
 for (var bi2 = 0; bi2 < BUB; bi2++) bubBase.push({x:TK.x + (bubR() - 0.5)*0.7, z:TK.z + (bubR() - 0.5)*0.34, r:0.007 + bubR()*0.012, ph:bubR(), sp:0.7 + bubR()*0.8});
 bubbles.renderOrder = 2; bubbles.castShadow = false; bubbles.visible = false; W.add(bubbles);

 // Lavage à la main : évier inox sur meuble, eau savonneuse et mousse, robinet, flacon pompe,
 // pulvérisateur, éponge ; une brosse frotte l'attelle pendant l'étape (aucun personnage).
 var sinkStart = W.children.length;
 var SK = {x:8.55, z:-0.55, w:1.1, d:0.62, h:0.86, bx:8.43, bw:0.74, bd:0.42};
 // Un tube courbe et un profil de révolution servent aux petits équipements de l'atelier.
 function stationTube(p, pts, radius, mat, segments){
  var path = new THREE.CatmullRomCurve3(pts.map(function(v){ return new THREE.Vector3(v[0], v[1], v[2]); }));
  var geo = new THREE.TubeGeometry(path, segments || 28, radius, 12, false), mesh = new THREE.Mesh(geo, mat || M.metal);
  return finish(p, mesh, geo, {edges:false});
 }
 function stationProfile(p, points, x, y, z, mat, segments){
  var geo = new THREE.LatheGeometry(points.map(function(v){ return new THREE.Vector2(v[0], v[1]); }), segments || 40);
  var mesh = new THREE.Mesh(geo, mat || M.body); mesh.position.set(x, y, z);
  return finish(p, mesh, geo, {edges:false});
 }
 roundedBox(W, SK.w, SK.h - .115, SK.d, SK.x, .075, SK.z, {radius:.012, segments:5, thr:35});
 [-1, 1].forEach(function(sx){ [-1, 1].forEach(function(sz){
  cyl(W, .016, .018, .06, SK.x + sx*.49, .018, SK.z + sz*.25, {seg:28, mat:M.metal, thr:35});
  roundedBox(W, .042, .024, .042, SK.x + sx*.49, 0, SK.z + sz*.25, {radius:.007, segments:4, mat:M.press, edges:false});
 }); });
 roundedBox(W, 1.03, .037, .012, SK.x, .079, SK.z + SK.d/2, {radius:.004, mat:M.dark, edges:false});
 [-1, 1].forEach(function(side){
  roundedBox(W, .533, .635, .014, SK.x + side*.274, .156, SK.z + SK.d/2 + .008, {radius:.005, segments:4, mat:M.felt, thr:35});
  [.257, .677].forEach(function(y){ roundedBox(W, .014, .037, .018, SK.x + side*.515, y, SK.z + SK.d/2 + .015, {radius:.003, mat:M.dark, edges:false}); });
  var hx = SK.x + side*.052, hz = SK.z + SK.d/2 + .028;
  stationTube(W, [[hx,.536,hz],[hx,.545,hz+.022],[hx,.631,hz+.022],[hx,.640,hz]], .006, M.metal, 16);
 });
 var bx0 = SK.bx - SK.bw/2, bx1 = SK.bx + SK.bw/2, bz0 = SK.z - SK.bd/2, bz1 = SK.z + SK.bd/2, ctop = SK.h - 0.04;
 roundedBox(W, bx0 - (SK.x - SK.w/2), .04, SK.d, (SK.x - SK.w/2 + bx0)/2, ctop, SK.z, {radius:.006, segments:5, mat:M.metal, thr:35});
 roundedBox(W, SK.x + SK.w/2 - bx1, .04, SK.d, (bx1 + SK.x + SK.w/2)/2, ctop, SK.z, {radius:.007, segments:5, mat:M.metal, thr:35});
 roundedBox(W, SK.bw, .04, bz0 - (SK.z - SK.d/2), SK.bx, ctop, (SK.z - SK.d/2 + bz0)/2, {radius:.007, segments:5, mat:M.metal, thr:35});
 roundedBox(W, SK.bw, .04, SK.z + SK.d/2 - bz1, SK.bx, ctop, (bz1 + SK.z + SK.d/2)/2, {radius:.007, segments:5, mat:M.metal, thr:35});
 roundedBox(W, SK.bw, .012, SK.bd, SK.bx, SK.h - .25, SK.z, {radius:.002, segments:4, mat:M.metalDS, edges:false});
 roundedBox(W, SK.bw, .24, .006, SK.bx, SK.h - .25, bz0, {radius:.0014, segments:3, mat:M.metalDS, edges:false});
 roundedBox(W, SK.bw, .24, .006, SK.bx, SK.h - .25, bz1, {radius:.0014, segments:3, mat:M.metalDS, edges:false});
 roundedBox(W, .006, .24, SK.bd, bx0, SK.h - .25, SK.z, {radius:.0014, segments:3, mat:M.metalDS, edges:false});
 roundedBox(W, .006, .24, SK.bd, bx1, SK.h - .25, SK.z, {radius:.0014, segments:3, mat:M.metalDS, edges:false});
 // Crépine ronde au fond du bac ; son niveau et celui de l'eau restent identiques.
 cyl(W, .037, .038, .004, SK.bx, SK.h - .237, SK.z, {seg:40, mat:M.dark, edges:false});
 cyl(W, .028, .028, .001, SK.bx, SK.h - .233, SK.z, {seg:40, mat:M.metal, edges:false});
 for (var drainHole = 0; drainHole < 8; drainHole++){
  var da = drainHole/8*Math.PI*2;
  cyl(W, .0028, .0028, .0006, SK.bx + Math.cos(da)*.017, SK.h - .232, SK.z + Math.sin(da)*.017, {seg:12, mat:M.black, edges:false, shadow:false});
 }
 var soapMat = lam(0xC4DEDA, {transparent:true, opacity:.76, depthWrite:false});
 box(W, SK.bw - 0.01, 0.17, SK.bd - 0.01, SK.bx, SK.h - 0.24, SK.z, {mat:soapMat, edges:false, shadow:false, receive:false, ro:1});
 cyl(W, .027, .030, .008, SK.bx, SK.h, bz0 - .07, {seg:40, mat:M.dark, edges:false});
 cyl(W, .022, .026, .042, SK.bx, SK.h + .008, bz0 - .07, {seg:40, mat:M.metal, edges:false});
 stationTube(W, [[SK.bx,SK.h+.035,bz0-.07],[SK.bx,SK.h+.19,bz0-.07],[SK.bx,SK.h+.285,bz0-.045],[SK.bx,SK.h+.307,bz0+.025],[SK.bx,SK.h+.28,bz0+.10],[SK.bx,SK.h+.25,bz0+.11]], .013, M.metal, 28);
 cyl(W, .016, .016, .012, SK.bx, SK.h + .246, bz0 + .11, {seg:32, mat:M.dark, edges:false});
 cyl(W, .012, .012, .002, SK.bx, SK.h + .244, bz0 + .11, {seg:32, mat:M.press, edges:false});
 cyl(W, .013, .016, .032, SK.bx + .055, SK.h, bz0 - .06, {seg:32, mat:M.metal, edges:false});
 roundedBox(W, .058, .008, .018, SK.bx + .063, SK.h + .032, bz0 - .06, {radius:.004, segments:4, mat:M.metal, edges:false});
 // produits sur le plan
 var PX = SK.x + 0.36;
 stationProfile(W, [[0,0],[.031,0],[.040,.008],[.043,.022],[.043,.131],[.039,.168],[.025,.194],[.015,.202],[0,.202]], PX, SK.h, SK.z - .12, M.body, 40);
 cyl(W, .016, .017, .019, PX, SK.h + .20, SK.z - .12, {seg:32, mat:M.strap, edges:false});
 cyl(W, .008, .008, .027, PX, SK.h + .219, SK.z - .12, {seg:24, mat:M.metal, edges:false});
 roundedBox(W, .080, .014, .026, PX + .026, SK.h + .247, SK.z - .12, {radius:.003, segments:4, mat:M.strap, edges:false});
 cyl(W, .005, .005, .010, PX + .061, SK.h + .238, SK.z - .12, {seg:20, mat:M.strap, edges:false});
 cyl(W, .0434, .0434, .056, PX, SK.h + .055, SK.z - .12, {seg:32, open:true, ts:-.82, tl:1.64, mat:M.green, edges:false, shadow:false});
 stationProfile(W, [[0,0],[.025,0],[.034,.009],[.037,.025],[.037,.111],[.032,.14],[.018,.163],[.014,.170],[0,.170]], PX + .02, SK.h, SK.z + .02, M.body, 40);
 cyl(W, .016, .018, .019, PX + .02, SK.h + .16, SK.z + .02, {seg:32, mat:M.dark, edges:false});
 roundedBox(W, .060, .031, .087, PX + .02, SK.h + .178, SK.z + .038, {radius:.006, segments:5, mat:M.dark, thr:35});
 cyl(W, .009, .012, .021, PX + .02, SK.h + .196, SK.z + .086, {rx:Math.PI/2, center:true, seg:28, mat:M.strap, edges:false});
 stationTube(W, [[PX+.02,SK.h+.184,SK.z+.063],[PX+.02,SK.h+.164,SK.z+.079],[PX+.02,SK.h+.136,SK.z+.064]], .0045, M.dark, 12);
 cyl(W, .0374, .0374, .045, PX + .02, SK.h + .044, SK.z + .02, {seg:32, open:true, ts:-.78, tl:1.56, mat:M.felt, edges:false, shadow:false});
 roundedBox(W, .11, .008, .075, PX - .02, SK.h, SK.z + .19, {radius:.003, segments:4, mat:M.green, edges:false});
 roundedBox(W, .11, .037, .075, PX - .02, SK.h + .008, SK.z + .19, {radius:.009, segments:5, mat:M.felt, thr:35});
 // Mousse savonneuse : amas de bulles de tailles variées, avec un relief plus lisible
 // sur l'inox clair. Les petits anneaux et reflets évitent l'effet de galets blancs.
 var FOAM = 230, foamR = rnd(23), foamBase = [];
 var foamMat = new THREE.MeshPhongMaterial({color:0xf5faf7, specular:0x93aba3, shininess:48});
 var foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), foamMat, FOAM);
 var foamRims = new THREE.InstancedMesh(new THREE.TorusGeometry(.78, .045, 5, 20), lam(0xABC7BD), 34);
 var foamGlints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({color:0xffffff}), 34);
 var foamClusters = [[-.24,-.09],[-.08,.09],[.14,.08],[.25,-.06],[.02,-.12]];
 for (var fi = 0; fi < FOAM; fi++){
  var near = fi < 130, cl = foamClusters[fi % foamClusters.length];
  var fx = SK.bx + (near ? cl[0] + (foamR() - .5)*.15 : (foamR() - .5)*(SK.bw - .08));
  var fz = SK.z + (near ? cl[1] + (foamR() - .5)*.11 : (foamR() - .5)*(SK.bd - .08));
  var fr = fi % 5 === 0 ? .020 + foamR()*.012 : .007 + foamR()*.014;
  foamBase.push({x:fx, z:fz, y:SK.h - .043 + foamR()*.018, r:fr, near:near});
  foam.setColorAt(fi, new THREE.Color(fi % 4 === 0 ? 0xD4E4DC : fi % 3 === 0 ? 0xE6F0EA : 0xffffff));
 }
 foam.castShadow = true; foam.receiveShadow = true; W.add(foam);
 foamRims.castShadow = foamGlints.castShadow = false; W.add(foamRims); W.add(foamGlints);
 var fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fs = new THREE.Vector3(), fp = new THREE.Vector3(), foamK = -1, foamNearK = -1;
 var rimQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
 function setFoam(k, kn){
  if (Math.abs(k - foamK) < 1e-3 && Math.abs(kn - foamNearK) < 1e-3) return; foamK = k; foamNearK = kn;
  foamBase.forEach(function(b, i){
   var r = b.r*(b.near ? kn*.74 : k), y = b.y + r*.48;
   fp.set(b.x, y, b.z); fs.set(r, r*.88, r); fm.compose(fp, fq, fs); foam.setMatrixAt(i, fm);
   if (i < 34){
    fp.set(b.x, y + r*.56, b.z); fs.set(r, r, r); fm.compose(fp, rimQ, fs); foamRims.setMatrixAt(i, fm);
    fp.set(b.x - r*.25, y + r*.72, b.z + r*.18); fs.set(r*.16, r*.08, r*.22); fm.compose(fp, fq, fs); foamGlints.setMatrixAt(i, fm);
   }
  });
  foam.instanceMatrix.needsUpdate = foamRims.instanceMatrix.needsUpdate = foamGlints.instanceMatrix.needsUpdate = true;
 }

 // Armoire séchante collective : caisson métallique, rideaux translucides, tringle
 // et supports d'air en partie basse. Aucun nom ni logo de fabricant.
 var DY = {x:9.95, z:-.55, w:1.31, h:1.95, d:.50};
 // Le modèle complet tourne et se déplace devant la façade avant d’entrer.
 var DY_FRONT = DY.z + DY.d/2 + .42;
 entryUnit('lavage', sinkStart);
 var dryer = group(W, DY.x, 0, DY.z);
 var dryerSteel = lam(0xD3DCD7), dryerInside = lam(0xBFCFC6);
 var curtainMat = lam(0xE5F1EB, {transparent:true, opacity:.14, depthWrite:false, side:DS});
 [-1,1].forEach(function(side){
  roundedBox(dryer,.035,1.87,.5,side*(DY.w/2-.018),.055,0,{radius:.004,mat:dryerSteel,line:M.soft});
  [-.19,.19].forEach(function(z){ cyl(dryer,.018,.023,.065,side*.58,0,z,{mat:M.press,seg:20,edges:false}); });
  stationTube(dryer,[[side*(DY.w/2+.003),1.06,-.08],[side*(DY.w/2+.035),1.06,-.08],[side*(DY.w/2+.035),1.24,-.08],[side*(DY.w/2+.003),1.24,-.08]],.007,M.dark,12);
 });
 box(dryer,DY.w-.07,1.83,.018,0,.065,-.241,{mat:dryerInside,line:M.soft});
 roundedBox(dryer,DY.w,.055,.5,0,1.895,0,{radius:.004,mat:dryerSteel,line:M.soft});
 roundedBox(dryer,DY.w,.055,.5,0,.06,0,{radius:.004,mat:dryerSteel,line:M.soft});
 roundedBox(dryer,DY.w-.08,.27,.43,0,.115,-.005,{radius:.006,mat:M.metal,line:M.soft});
 for(var grille=0;grille<14;grille++) box(dryer,.058,.006,.003,-.52+grille*.08,.24,.212,{mat:M.dark,edges:false,shadow:false});
 cyl(dryer,.012,.012,DY.w-.12,0,1.705,0,{center:true,rz:Math.PI/2,mat:M.press,edges:false});
 [-.40,0,.40].forEach(function(x){
  stationTube(dryer,[[x-.10,1.54,.01],[x,1.63,.01],[x+.10,1.54,.01],[x-.10,1.54,.01]],.005,M.metal,12);
  stationTube(dryer,[[x,1.63,.01],[x,1.69,.01],[x+.025,1.72,.01],[x+.04,1.695,.01]],.004,M.press,12);
 });
 [-.40,.40].forEach(function(x){
  var spare=makeBrace(M.feltDS,M.darkDS,M.feltDS); spare.scale.setScalar(.82); spare.position.set(x,1.23,.025); dryer.add(spare);
 });
 for(var nozzle=0;nozzle<10;nozzle++) [-.11,.11].forEach(function(z){
  cyl(dryer,.012,.012,.13,-.52+nozzle*.116,.386,z,{seg:16,mat:M.metal,edges:false});
  cyl(dryer,.017,.017,.024,-.52+nozzle*.116,.516,z,{seg:16,mat:M.press,edges:false});
 });
 // Les lames centrales s'écartent à l'entrée et à la sortie, puis se referment.
 var dryerCurtains = [], curtainEdgeMat = lam(0xAFC8BA,{transparent:true,opacity:.35,depthWrite:false});
 for(var strip=0;strip<8;strip++){
  var stripX = -.546+strip*.156, blade = group(dryer,stripX,1.86,.252);
  box(blade,.148,1.31,.002,0,-1.31,0,{mat:curtainMat,edges:false,shadow:false,receive:false,ro:7});
  box(blade,.002,1.31,.002,-.074,-1.31,.002,{mat:curtainEdgeMat,edges:false,shadow:false,ro:7});
  if (Math.abs(stripX)<.25) dryerCurtains.push({mesh:blade,x:stripX,side:stripX<0?-1:1});
 }
 roundedBox(dryer,DY.w-.05,.032,.025,0,1.863,.252,{radius:.003,mat:M.dark,edges:false});
 roundedBox(dryer,.09,.13,.07,-DY.w/2-.05,.35,-.05,{radius:.006,mat:M.dark,edges:false});
 box(dryer,.018,.024,.006,-DY.w/2-.05,.43,-.011,{mat:M.strap,edges:false});
 var dryerLightMat=new THREE.MeshBasicMaterial({color:0xCF5B42});
 cyl(dryer,.005,.005,.003,-DY.w/2-.031,.454,-.011,{rx:Math.PI/2,center:true,mat:dryerLightMat,edges:false,shadow:false});
 // Trois ondes rouges discrètes remontent dans le caisson pendant le séchage.
 var heatWaves=[], heatLevel=0, heatSegments=48;
 for(var wave=0;wave<3;wave++){
  var heatGeo=new THREE.BufferGeometry(), heatPos=new Float32Array((heatSegments+1)*2*3), heatIdx=[];
  for(var hi2=0;hi2<heatSegments;hi2++){var a=hi2*2;heatIdx.push(a,a+1,a+2,a+1,a+3,a+2);}
  heatGeo.setAttribute('position',new THREE.BufferAttribute(heatPos,3));heatGeo.setIndex(heatIdx);
  var heatMat=new THREE.MeshBasicMaterial({color:0xCB4A3D,transparent:true,opacity:0,side:DS,depthWrite:false});
  var heatMesh=new THREE.Mesh(heatGeo,heatMat);heatMesh.position.z=.18;heatMesh.renderOrder=6;heatMesh.frustumCulled=false;heatMesh.visible=false;dryer.add(heatMesh);heatWaves.push(heatMesh);
 }
 function updateHeat(time){
  heatWaves.forEach(function(mesh,i){
   mesh.visible=heatLevel>.01;if(!mesh.visible)return;
   var f=(time*.27+i/3)%1, arr=mesh.geometry.attributes.position.array;
   mesh.position.y=.57+f*1.20;mesh.material.opacity=heatLevel*.52*Math.sin(Math.PI*f);
   for(var j=0;j<=heatSegments;j++){
    var x=(j/heatSegments-.5)*1.10,y=Math.sin(j/heatSegments*Math.PI*3+time*1.6+i*.7)*.026;
    var idx=j*6;arr[idx]=arr[idx+3]=x;arr[idx+1]=y-.008;arr[idx+4]=y+.008;arr[idx+2]=arr[idx+5]=0;
   }
   mesh.geometry.attributes.position.needsUpdate=true;
  });
 }
 // L'oxygène actif est représenté symboliquement par de fines particules
 // bleues qui circulent autour des attelles, en plus des ondes de chaleur.
 var oxygen = group(dryer,0,0,0), oxygenParticles=[], oxygenLevel=0;
 oxygen.visible=false;
 var oxygenCoreMat=new THREE.MeshBasicMaterial({color:0x2789B0,transparent:true,opacity:0,depthWrite:false});
 var oxygenHaloMat=new THREE.MeshBasicMaterial({color:0x59B9C8,transparent:true,opacity:0,depthWrite:false,side:DS});
 var oxygenSphere=new THREE.SphereGeometry(.012,10,8), oxygenHalo=new THREE.TorusGeometry(.025,.0025,5,24);
 for(var oi=0;oi<18;oi++){
  var particle=group(oxygen,0,0,0), core=new THREE.Mesh(oxygenSphere,oxygenCoreMat), halo=new THREE.Mesh(oxygenHalo,oxygenHaloMat);
  core.renderOrder=halo.renderOrder=8;particle.add(core);particle.add(halo);
  oxygenParticles.push({mesh:particle,side:oi%2 ? 1 : -1,phase:oi/18});
 }
 // Diffuseur et témoin bleus discrets intégrés au caisson inférieur.
 roundedBox(dryer,.15,.024,.004,.37,.32,.217,{radius:.003,mat:M.felt,edges:false,shadow:false});
 var oxygenLampMat=new THREE.MeshBasicMaterial({color:0xC1DADB});
 for(var ol=0;ol<3;ol++) cyl(dryer,.008,.008,.003,.325+ol*.045,.332,.221,{center:true,rx:Math.PI/2,seg:16,mat:oxygenLampMat,edges:false,shadow:false});
 function updateOxygen(time){
  oxygen.visible=oxygenLevel>.01;
  oxygenLampMat.color.setHex(oxygen.visible ? 0x2789B0 : 0xC1DADB);
  if(!oxygen.visible)return;
  oxygenCoreMat.opacity=oxygenLevel*.88;oxygenHaloMat.opacity=oxygenLevel*.60;
  oxygenParticles.forEach(function(item,i){
   var f=(time*.16+item.phase)%1, sway=time*.8+item.phase*Math.PI*2;
   item.mesh.position.set(item.side*(.29+Math.sin(sway)*.11),.56+f*1.08,.13+Math.cos(sway)*.04);
   item.mesh.rotation.y=Math.sin(sway)*.35;
   item.mesh.scale.setScalar(.65+.35*Math.sin(Math.PI*f));
  });
 }
 // Deux brosses détaillées : corps arrondi, poignée ajourée et touffes de poils.
 function makeBrush(){
  var g = new THREE.Group(); W.add(g);
  roundedBox(g, .195, .03, .078, 0, .026, 0, {radius:.012, segments:5, thr:35});
  roundedBox(g, .18, .007, .065, 0, .022, 0, {radius:.003, mat:M.dark, edges:false});
  var bristles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0017, .0014, .025, 8), M.dark, 216);
  var bm = new THREE.Matrix4(), bp = new THREE.Vector3(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(1,1,1), j = 0;
  for (var x = 0; x < 18; x++) for (var z = 0; z < 12; z++){
   bp.set((x - 8.5)*.009, .0125, (z - 5.5)*.0045); bm.compose(bp,bq,bs); bristles.setMatrixAt(j++, bm);
  }
  bristles.castShadow = true; g.add(bristles);
  [-1,1].forEach(function(side){ roundedBox(g,.027,.052,.033,side*.057,.05,0,{radius:.012,segments:5,thr:35}); });
  roundedBox(g,.14,.026,.036,0,.09,0,{radius:.012,segments:6,thr:35});
  for (var k = -3; k <= 3; k++) roundedBox(g,.004,.003,.024,k*.015,.116,0,{radius:.001,mat:M.felt,edges:false});
  return g;
 }
 var brush = makeBrush(), controlBrush = makeBrush();
 brush.userData.entryUnit = 'lavage'; brush.userData.entryLayer = 'furniture';
 controlBrush.userData.entryUnit = 'desk-9.9'; controlBrush.userData.entryLayer = 'furniture';

 // Les postes suivants sont décalés pour réserver une place à l’armoire.
 var AFTER_DRYER = 1.8, downstreamStart = W.children.length;
 // Contrôle (brosse, rasoir textile, applicateur), puis carton et imprimante.
 entryLayer = 'furniture';
 desk(W, 9.9, -0.575, 1.4, 0.75);
 desk(W, 11.6, -0.575, 1.7, 0.75);
 entryLayer = 'details';
 // Rasoir textile : grille perforée en métal, réservoir et poignée avec bouton.
 var controlStart = W.children.length;
 var shaver = group(W, 10.36, DESK, -.69);
 cyl(shaver,.047,.049,.014,0,0,0,{seg:48,mat:M.metal,edges:false});
 cyl(shaver,.038,.043,.052,0,.014,0,{seg:48,mat:M.felt,thr:35});
 roundedBox(shaver,.07,.11,.06,0,.058,-.018,{radius:.025,segments:6,thr:35});
 roundedBox(shaver,.035,.006,.022,0,.166,-.018,{radius:.008,mat:M.strap,edges:false});
 var holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.002,.002,.0006,8),M.black,61), hm = new THREE.Matrix4(), hi = 0;
 // La face perforée est orientée vers le textile, visible lorsque le rasoir est relevé.
 hm.makeTranslation(0,-.0003,0); holes.setMatrixAt(hi++,hm);
 [12,20,28].forEach(function(n,ring){ for(var j=0;j<n;j++){ var a=j/n*Math.PI*2; hm.makeTranslation(Math.cos(a)*(.012+ring*.01),-.0003,Math.sin(a)*(.012+ring*.01));holes.setMatrixAt(hi++,hm); } });
 shaver.add(holes);
 var LP = {x:9.62, z:-0.86};
 // Lampe articulée : bras doubles, axes et capot profilé conservent la même zone éclairée.
 stationProfile(W, [[0,0],[.060,0],[.071,.005],[.073,.012],[.067,.022],[.045,.030],[0,.030]], LP.x, DESK, LP.z, M.dark, 48);
 roundedBox(W, .022, .005, .012, LP.x + .023, DESK + .028, LP.z + .027, {radius:.002, mat:M.strap, edges:false});
 [-1,1].forEach(function(side){
  var ax = LP.x + side*.019;
  stationTube(W, [[ax,DESK+.033,LP.z],[ax,DESK+.312,LP.z+.034]], .007, M.metal, 1);
  stationTube(W, [[ax,DESK+.312,LP.z+.034],[ax,DESK+.579,LP.z]], .007, M.metal, 1);
  stationTube(W, [[ax,DESK+.579,LP.z],[ax,DESK+.560,LP.z+.291]], .007, M.metal, 1);
 });
 [[.035,0],[.312,.034],[.579,0],[.560,.291]].forEach(function(joint){
  cyl(W, .021, .021, .061, LP.x, DESK + joint[0], LP.z + joint[1], {rz:Math.PI/2, center:true, seg:36, mat:M.dark, edges:false});
  cyl(W, .008, .008, .003, LP.x + .032, DESK + joint[0], LP.z + joint[1], {rz:Math.PI/2, center:true, seg:20, mat:M.press, edges:false});
 });
 stationTube(W, [[LP.x,DESK+.560,LP.z+.291],[LP.x,DESK+.588,LP.z+.327],[LP.x,DESK+.579,LP.z+.38]], .012, M.metal, 18);
 stationProfile(W, [[.10,0],[.102,.009],[.098,.020],[.087,.041],[.067,.063],[.037,.078],[0,.083]], LP.x, DESK + .5, LP.z + .38, M.body, 56);
 cyl(W, .096, .099, .007, LP.x, DESK + .5, LP.z + .38, {seg:48, mat:M.dark, edges:false});
 cyl(W, .090, .090, .002, LP.x, DESK + .499, LP.z + .38, {seg:48, mat:M.felt, edges:false, shadow:false});
 stationTube(W, [[LP.x-.018,DESK+.028,LP.z-.025],[LP.x-.066,DESK+.012,LP.z-.064],[LP.x-.084,DESK-.020,LP.z-.063]], .003, M.press, 12);
 var coneMat = new THREE.MeshBasicMaterial({color:0xE2F0D3, transparent:true, opacity:0, depthWrite:false, side:DS});
 var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.27, 0.5, 32, 1, true), coneMat);
 cone.position.set(LP.x, DESK + 0.25, LP.z + 0.38); cone.renderOrder = 5; cone.visible = false; W.add(cone);
 var scanMat = new THREE.MeshBasicMaterial({color:0x6FAE3E, transparent:true, opacity:0, depthWrite:false, side:DS});
 var scan = group(W, 9.42, DESK, -0.45);
 var scanLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.44), scanMat); scanLine.position.y = 0.3; scan.add(scanLine);
 var beam = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), scanMat); beam.rotation.y = Math.PI/2; beam.position.y = 0.15; scan.add(beam);
 scanLine.renderOrder = beam.renderOrder = 5; scan.visible = false;

 // Étiquettes textiles « Reconditionné par Gekomed », en petite pile sur le poste de contrôle.
 var TG = {x:10.32, z:-0.32}, tagEdge = lam(0x123F2E);
 box(W, 0.12, 0.012, 0.042, TG.x, DESK, TG.z, {mat:tagEdge, ry:0.25});
 var tagTex = artTex(root.getAttribute('data-etiquette'));
 var tag = new THREE.Group(), tagM = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.002, 0.0363), [tagEdge, tagEdge, tagTex ? lam(0xffffff, {map:tagTex}) : tagEdge, tagEdge, tagEdge, tagEdge]);
 tagM.position.y = 0.001; tag.add(tagM); W.add(tag);

 // Applicateur rectangulaire : il prend l'étiquette et la presse sur l'attelle.
 var ST = {x:10.12, z:-0.26};
 roundedBox(W,.14,.018,.075,ST.x,DESK,ST.z,{radius:.008,mat:M.dark,ry:.2});
 var stamp = new THREE.Group(); W.add(stamp);
 roundedBox(stamp,.118,.008,.043,0,0,0,{radius:.003,mat:M.black,edges:false});
 roundedBox(stamp,.13,.026,.053,0,.008,0,{radius:.008,segments:5,thr:35});
 cyl(stamp,.012,.015,.044,0,.034,0,{seg:24,thr:35});
 roundedBox(stamp,.064,.037,.039,0,.077,0,{radius:.015,segments:6,thr:35});

 // Imprimante de bureau : coque arrondie, sortie à l'extrémité avant et rouleau d'entraînement.
 entryUnit('desk-9.9', controlStart);
 var packingStart = W.children.length;
 var PR = {x:11.12, z:-0.62};
 var pr = group(W,PR.x,DESK,PR.z);
 roundedBox(pr,.28,.025,.35,0,0,0,{radius:.012,mat:M.dark,thr:35});
 roundedBox(pr,.28,.14,.33,0,.025,-.008,{radius:.03,segments:8,thr:35});
 roundedBox(pr,.25,.065,.14,0,.13,-.08,{radius:.025,segments:8,thr:35});
 // Le nez de la machine fait face au carton, la fente n'est pas sur le capot.
 roundedBox(pr,.22,.045,.035,0,.042,.16,{radius:.012,mat:M.dark,thr:35});
 box(pr,.168,.012,.004,0,.08,.180,{mat:M.black,edges:false});
 cyl(pr,.008,.008,.163,0,.078,.181,{seg:24,center:true,rz:Math.PI/2,mat:M.press,edges:false});
 roundedBox(pr,.025,.007,.038,.084,.163,-.025,{radius:.008,mat:M.strap,edges:false});
 for(var vent=0;vent<6;vent++) roundedBox(pr,.002,.036,.004,.141,.059,-.08+vent*.016,{radius:.001,mat:M.dark,edges:false});
 [-1,1].forEach(function(side){ roundedBox(pr,.007,.035,.052,side*.143,.095,.02,{radius:.003,mat:M.dark,edges:false}); });

 // Papier adhésif au format portrait. Il est révélé depuis la fente avant.
 var label = new THREE.Group(); W.add(label);
 var labelMat = new THREE.MeshLambertMaterial({map:labelTex,side:DS,polygonOffset:true,polygonOffsetFactor:-2});
 var lm = new THREE.Mesh(new THREE.PlaneGeometry(.12,.20),labelMat);
 lm.renderOrder=6; label.add(lm); label.visible=false;
 var CT = {x:11.95, z:-0.5, w:0.88, h:0.3, d:0.44};
 var crate = group(W, CT.x, DESK, CT.z);
  roundedBox(crate, CT.w, 0.02, CT.d, 0, 0, 0,{radius:.002,segments:3,line:M.soft});
  [-1,1].forEach(function(side){
   roundedBox(crate,CT.w,CT.h,.012,0,0,side*(CT.d/2-.006),{radius:.0016,segments:3,mat:M.bodyDS,line:M.soft});
   roundedBox(crate,.012,CT.h,CT.d-.024,side*(CT.w/2-.006),0,0,{radius:.0016,segments:3,mat:M.bodyDS,line:M.soft});
   // Fines couches de papier sur les chants ; elles restent sous les rabats fermés.
   box(crate,CT.w-.027,.001,.013,0,CT.h-.005,side*(CT.d/2-.006),{mat:M.felt,edges:false,shadow:false});
   box(crate,.013,.001,CT.d-.026,side*(CT.w/2-.006),CT.h-.005,0,{mat:M.felt,edges:false,shadow:false});
  });
  function flap(px, pz, y, w, len, alongX){
  var f = group(crate, px, y, pz);
  if (alongX){
   roundedBox(f,w,len,.012,0,0,0,{radius:.0016,segments:3,mat:M.bodyDS,line:M.soft});
   box(f,w-.02,.001,.001,0,.012,.0064,{mat:M.felt,edges:false,shadow:false});
  }else{
   roundedBox(f,.012,len,w,0,0,0,{radius:.0016,segments:3,mat:M.bodyDS,line:M.soft});
   box(f,.001,.001,w-.02,.0064,.012,0,{mat:M.felt,edges:false,shadow:false});
  }
  return f;
 }
 var flapF = flap(0, CT.d/2 - 0.006, CT.h, CT.w, CT.d/2 - 0.008, true), flapB = flap(0, -CT.d/2 + 0.006, CT.h, CT.w, CT.d/2 - 0.008, true);
 var flapR = flap(CT.w/2 - 0.006, 0, CT.h - 0.013, CT.d - 0.03, 0.2, false), flapL = flap(-CT.w/2 + 0.006, 0, CT.h - 0.013, CT.d - 0.03, 0.2, false);
 function tapePiece(geo, x, y, z){ var t = new THREE.Mesh(geo, M.tape); t.position.set(x, y, z); t.visible = false; crate.add(t); return t; }
 var TW = 0.07, TL = 0.12;
 var tapeL = tapePiece(new THREE.BoxGeometry(0.004, TL, TW).translate(0, TL/2, 0), -CT.w/2 - 0.008, CT.h + 0.009 - TL, 0);
 var tapeT = tapePiece(new THREE.BoxGeometry(CT.w + 0.02, 0.004, TW).translate((CT.w + 0.02)/2, 0, 0), -CT.w/2 - 0.01, CT.h + 0.008, 0);
 var tapeR = tapePiece(new THREE.BoxGeometry(0.004, TL, TW).translate(0, -TL/2, 0), CT.w/2 + 0.008, CT.h + 0.009, 0);
 entryUnit('desk-11.6', packingStart);
 var stockStart = W.children.length;
 carton(W, 0.5, 0.3, 0.4, 12.8, 0, -1.15, M.tape, 0.04);
 carton(W, 0.5, 0.3, 0.4, 13.34, 0, -1.12, M.tape, -0.03);
 carton(W, 0.46, 0.28, 0.38, 13.05, 0.3, -1.14, M.tape, 0.1);
 entryUnit('stock-cartons', stockStart);

 W.children.slice(downstreamStart).forEach(function(obj){ obj.position.x += AFTER_DRYER; });

 // L'attelle et son sac
 var brace = makeBrace(M.shell, M.black, M.feltDS); brace.userData.entryLayer = 'subject'; W.add(brace);
 var bagMat = lam(0xE2E8E4, {transparent:true, opacity:.46, side:DS, depthWrite:false});
 var bagLine = new THREE.LineBasicMaterial({color:0x0F3E2E, transparent:true, opacity:.28});
 var bag = makeBag(0, bagMat, bagLine); W.add(bag);
 W.updateMatrixWorld(true);

 /* ---------- chronologie ---------- */
 var BEATS = [['intro', .85], ['depot', 1], ['collecte', 1.2], ['transport', 1.15], ['reception', 1.7], ['desinfection', 1.1],
  ['lavage', 1.25], ['sechage', 1.55], ['controle', 2.4], ['carton', 1.5], ['etiquette', 1.4], ['fin', .45]];
 var B = {}, U = 0;
 BEATS.forEach(function(b){ B[b[0]] = {s:U, l:b[1]}; U += b[1]; });
 root.style.setProperty('--gx-units', U);
 function at(name, f){ return B[name].s + B[name].l*f; }
 function sm(t){ return t <= 0 ? 0 : t >= 1 ? 1 : t*t*t*(t*(t*6 - 15) + 10); }
 function io(t){ t = t < 0 ? 0 : t > 1 ? 1 : t; return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
 function lin(t){ return t < 0 ? 0 : t > 1 ? 1 : t; }
 // Courbe d'arrivée du site (--gv-ease : cubic-bezier(.2,.7,.2,1)), résolue en x par Newton puis par bissection.
 function bezier(x1, y1, x2, y2){
  function at(t, p1, p2){ return ((1 - 3*p2 + 3*p1)*t + (3*p2 - 6*p1))*t*t + 3*p1*t; }
  function slope(t, p1, p2){ return 3*(1 - 3*p2 + 3*p1)*t*t + 2*(3*p2 - 6*p1)*t + 3*p1; }
  return function(x){
   if (x <= 0) return 0; if (x >= 1) return 1;
   var t = x, i, d;
   for (i = 0; i < 8; i++){ d = at(t, x1, x2) - x; if (Math.abs(d) < 1e-5) return at(t, y1, y2); var sl = slope(t, x1, x2); if (Math.abs(sl) < 1e-6) break; t -= d/sl; }
   var lo = 0, hi = 1; t = x;
   for (i = 0; i < 24; i++){ d = at(t, x1, x2) - x; if (Math.abs(d) < 1e-5) break; if (d < 0) lo = t; else hi = t; t = (lo + hi)/2; }
   return at(t, y1, y2);
  };
 }
 var easeEnter = bezier(.2, .7, .2, 1);
 function num(keys){
  return function(u){
   var n = keys.length;
   if (u <= keys[0][0]) return keys[0][1];
   for (var i = 1; i < n; i++) if (u < keys[i][0]){ var a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1])*(b[2] || sm)((u - a[0])/(b[0] - a[0])); }
   return keys[n - 1][1];
  };
 }
 function pose(keys){
  keys.forEach(function(k){ k.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(k[2][0], k[2][1], k[2][2], 'YXZ')); });
  return function(u, obj){
   var n = keys.length, a = keys[n - 1], b = a, t = 0;
   if (u <= keys[0][0]) a = b = keys[0];
   else for (var i = 1; i < n; i++) if (u < keys[i][0]){ a = keys[i - 1]; b = keys[i]; t = (b[3] || sm)((u - a[0])/(b[0] - a[0])); break; }
   obj.position.set(a[1][0] + (b[1][0] - a[1][0])*t, a[1][1] + (b[1][1] - a[1][1])*t, a[1][2] + (b[1][2] - a[1][2])*t);
   obj.quaternion.copy(a.q).slerp(b.q, t);
  };
 }
 function UP(ry){ return [0, ry, 0]; }
 var LX = [-Math.PI/2, Math.PI/2, 0], LZ = [-Math.PI/2, 0, 0], PI = Math.PI;

 var braceAt = pose([
  [0, [0, 1.45, 0], UP(0.35)],
  [at('depot', .12), [0, 1.42, 0], UP(0.55)],
  [at('depot', .72), [0, 0.398, 0], UP(0.7)],
  [at('reception', .42), [5.6, 1.115, -0.5], UP(PI/2 + 0.7)],
  [at('reception', .52), [5.62, 1.5, -0.5], UP(PI/2 + 0.7)],
  [at('reception', .64), [5.60, 0.815, -0.48], LX],
  [at('desinfection', .08), [5.60, 0.815, -0.48], LX],
  [at('desinfection', .28), [6.45, 1.5, -0.45], LX],
  [at('desinfection', .4), [7.0, 1.5, -0.45], LX],
  [at('desinfection', .56), [7.0, 0.62, -0.45], LX],
  [at('desinfection', .74), [7.0, 0.6, -0.45], [-PI/2 + 0.12, PI/2, 0.1]],
  [at('desinfection', .92), [7.0, 1.5, -0.45], LX],
  [at('lavage', .2), [8.43, 1.3, -0.52], LX],
  [at('lavage', .32), [8.43, 0.8, -0.55], LX],
  [at('lavage', .55), [8.43, 0.79, -0.55], [-PI/2 + 0.08, PI/2, 0.06]],
  [at('lavage', .78), [8.43, 0.8, -0.55], LX],
  [at('lavage', .92), [8.43, 1.28, -0.52], LX],
  [at('sechage', .06), [8.43, 1.28, -0.52], LX],
  [at('sechage', .13), [8.43, 1.28, DY_FRONT], LX],
  [at('sechage', .19), [8.43, 1.28, DY_FRONT], UP(0)],
  [at('sechage', .30), [DY.x, 1.25, DY_FRONT], UP(0)],
  [at('sechage', .43), [DY.x, 1.23, DY.z + .025], UP(0)],
  [at('sechage', .79), [DY.x, 1.23, DY.z + .025], UP(0)],
  [at('sechage', .90), [DY.x, 1.28, DY_FRONT], UP(0)],
  [at('controle', .02), [DY.x, 1.28, DY_FRONT], UP(0)],
  [at('controle', .10), [9.2 + AFTER_DRYER, 1.32, DY_FRONT], UP(0)],
  [at('controle', .17), [9.2 + AFTER_DRYER, 1.32, -0.35], LX],
  [at('controle', .23), [9.75 + AFTER_DRYER, 0.815, -0.45], LX],
  [at('carton', .08), [9.75 + AFTER_DRYER, 0.815, -0.45], LX],
  [at('carton', .28), [11.0 + AFTER_DRYER, 1.45, -0.45], LX],
  [at('carton', .45), [CT.x + AFTER_DRYER, 1.45, CT.z], LX],
  [at('carton', .65), [CT.x + AFTER_DRYER, 0.845, CT.z], LX]
 ]);
 var U_IN_BAG = at('depot', .72), U_OUT_BAG = at('reception', .42);
 var IN_BAG = new THREE.Matrix4().makeTranslation(0, 0.36, 0).multiply(new THREE.Matrix4().makeRotationY(0.7));

 var SLOT0 = [1.15, 0.037, 0], SLOT1 = [4.82, 0.037, 0];
 var bagAt = pose([
  [0, [0, 0.038, 0], [0, 0, 0]],
  [at('collecte', .14), [0, 0.038, 0], [0, 0, 0]],
  [at('collecte', .42), [0, 1.22, 0], [0, 0.4, 0]],
  [at('collecte', .7), [1.15, 1.22, 0], [0, 1.2, 0]],
  [at('collecte', .94), SLOT0, [0, PI/2, 0]],
  [at('reception', .1), SLOT1, [0, PI/2, 0]],
  [at('reception', .32), [5.2, 1.22, -0.25], [0, PI/2, 0]],
  [at('reception', .38), [5.6, 0.755, -0.5], [0, PI/2, 0]]
 ]);
 var U_BAG_ON = at('collecte', .94), U_BAG_OFF = at('reception', .1);
 var bagTie = num([[0, 0], [at('collecte', .18), 0], [at('collecte', .4), 1], [at('reception', .5), 1], [at('reception', .47), 0]]);
 var bagFade = num([[0, 0], [at('collecte', .12), 0], [at('collecte', .24), 1], [at('reception', .45), 1], [at('reception', .59), 0]]);
 var bagDeflate = num([[0, 1], [at('reception', .47), 1], [at('reception', .59), 0.3]]);

 var truckX = num([[0, 0.95], [at('transport', .08), 0.95], [at('transport', .88), 4.62, io]]);
 var truckTilt = num([[0, 0], [at('transport', 0), 0], [at('transport', .14), -0.42], [at('transport', .82), -0.42], [at('transport', .98), 0]]);
 var capUp = num([[0, 0], [at('collecte', 0), 0], [at('collecte', .13), 0.44], [at('collecte', .64), 0.44], [at('collecte', .84), 0]]);
 var capBack = num([[0, 0], [at('collecte', .03), 0], [at('collecte', .16), -0.46], [at('collecte', .62), -0.46], [at('collecte', .8), 0]]);
 var capTilt = num([[0, 0], [at('collecte', .03), 0], [at('collecte', .16), -0.35], [at('collecte', .62), -0.35], [at('collecte', .8), 0]]);
 var xrayA = num([[0, 1], [at('depot', .3), 1], [at('depot', .58), 0.14], [at('collecte', .48), 0.14], [at('collecte', .66), 1]]);
 var tankXray = num([[0, 1], [at('desinfection', .4), 1], [at('desinfection', .55), 0.2], [at('desinfection', .78), 0.2], [at('desinfection', .95), 1]]);
 var rip = [num([[0, 0], [at('desinfection', .5), 0], [at('desinfection', .8), 1, lin]]), num([[0, 0], [at('desinfection', .84), 0], [at('desinfection', 1), 1, lin]])];
 var LOG0 = at('reception', .65), LOG1 = at('reception', .96);
 var BUB0 = at('desinfection', .52), BUB1 = at('desinfection', .86);
 var foamA = num([[0, 0.6], [at('lavage', .26), 0.6], [at('lavage', .44), 1.15], [at('lavage', .8), 1.25], [at('sechage', .1), 0.85]]);
 var foamNear = num([[0, 0.5], [at('lavage', .3), 0.5], [at('lavage', .5), 1.6], [at('lavage', .8), 1.8], [at('sechage', .1), 0.9]]);
 var curtainOpen = num([[0,0],[at('sechage',.02),0],[at('sechage',.16),1],[at('sechage',.43),1],[at('sechage',.52),0],[at('sechage',.77),0],[at('sechage',.80),1],[at('controle',.10),1],[at('controle',.18),0]]);
 var heatA = num([[0,0],[at('sechage',.43),0],[at('sechage',.53),1],[at('sechage',.76),1],[at('sechage',.84),0]]);
 var BR_REST = [SK.bx, SK.h, SK.z + SK.d/2 - 0.05], SCRUB0 = at('lavage', .4), SCRUB1 = at('lavage', .8);
 var brushAt = pose([
  [0, BR_REST, [0, 0, 0]],
  [at('lavage', .3), BR_REST, [0, 0, 0]],
  [at('lavage', .38), [8.43, 0.98, -0.55], [0, 0, 0]],
  [SCRUB0, [8.43, 0.875, -0.55], [0, 0, 0]],
  [SCRUB1, [8.43, 0.875, -0.55], [0, 0, 0]],
  [at('lavage', .88), [8.6, 1.0, -0.45], [0, 0.2, 0]],
  [at('lavage', .98), BR_REST, [0, 0, 0]]
 ]);
 // Seconde brosse, puis rasoir textile : gestes successifs sur l'attelle sèche.
 var CB_REST=[9.36,DESK,-.25], CSCRUB0=at('controle',.29), CSCRUB1=at('controle',.43);
 var controlBrushAt=pose([
  [0,CB_REST,[0,.2,0]], [at('controle',.24),CB_REST,[0,.2,0]],
  [at('controle',.27),[9.75,1.03,-.45],[0,0,0]],
  [CSCRUB0,[9.75,.8785,-.45],[0,0,0]], [CSCRUB1,[9.75,.8785,-.45],[0,0,0]],
  [at('controle',.46),[9.46,1.02,-.3],[0,.2,0]], [at('controle',.48),CB_REST,[0,.2,0]]
 ]);
 var SH_REST=[10.36,DESK,-.69], SHAVE0=at('controle',.49), SHAVE1=at('controle',.63);
 var shaverAt=pose([
  [0,SH_REST,[.3,0,0]], [at('controle',.44),SH_REST,[.3,0,0]],
  [at('controle',.47),[9.75,1.08,-.45],[0,0,0]],
  [SHAVE0,[9.75,.8796,-.45],[0,0,0]], [SHAVE1,[9.75,.8796,-.45],[0,0,0]],
  [at('controle',.66),[10.18,1.06,-.6],[.3,0,0]], [at('controle',.69),SH_REST,[.3,0,0]]
 ]);
 var coneA = num([[0,0],[at('controle',.2),0],[at('controle',.27),1],[at('carton',.06),1],[at('carton',.2),0]]);
 var SCAN0 = at('controle', .64), SCAN1 = at('controle', .82);
 var scanX = num([[0,9.42],[SCAN0,9.42],[SCAN1,10.08,lin]]);
 // Le rouleau entraîne une étiquette portrait vers l'avant, avant son collage sur le carton fermé.
 var U_LABEL=at('etiquette',.08), U_LABEL_OUT=at('etiquette',.36), U_LABEL_ON=at('etiquette',.82);
 var labelFeed=num([[0,0],[U_LABEL,0],[U_LABEL_OUT,1]]);
 var labelAt=pose([
  [0,[PR.x,DESK+.077,PR.z+.184],[-PI/2,0,0]],
  [U_LABEL_OUT,[PR.x,DESK+.077,PR.z+.285],[-PI/2,0,0]],
  [at('etiquette',.48),[PR.x+.15,1.23,PR.z+.28],[-.55,0,.08]],
  [at('etiquette',.65),[CT.x,1.3,CT.z],[-PI/2,0,0]],
  [U_LABEL_ON,[CT.x,DESK+CT.h+.014,CT.z],[-PI/2,0,0]]
 ]);
 // Une seule flexion suivie du retour, sur une plage deux fois plus longue.
 var FLEX0=at('controle',.64), FLEX1=at('controle',.82), FLEXMAX=1.15, flexAxis=new THREE.Vector3(0,0,1), bracePivot=null;
 function flexA(u){ if(u<=FLEX0||u>=FLEX1)return 0; var t=(u-FLEX0)/(FLEX1-FLEX0), sn=Math.sin(t*PI);return -FLEXMAX*sn*sn; }
 // Le rectangle reste sous la semelle pendant le geste ; il se détache seulement au contact.
 // Le renfort supérieur du modèle est légèrement oblique dans l'axe de l'attelle.
 var TAG_REST=[TG.x,DESK+.013,TG.z], TAG_ON=[9.58,.8728,-.46], TAG_ROT=[0,.32,0], U_TAG_PICK=at('controle',.75), U_TAG=at('controle',.89);
 var tagFixedAt=pose([[0,TAG_ON,TAG_ROT]]);
 var STAMP_REST=[ST.x,DESK+.018,ST.z], STAMP_ON=[TAG_ON[0],TAG_ON[1]+.002,TAG_ON[2]];
 var stampAt=pose([
  [0,STAMP_REST,[0,.2,0]], [at('controle',.70),STAMP_REST,[0,.2,0]],
  [at('controle',.73),[TG.x,DESK+.1,TG.z],[0,.25,0]],
  [U_TAG_PICK,[TG.x,DESK+.015,TG.z],[0,.25,0]],
  [at('controle',.79),[TG.x,1.15,TG.z],[0,.25,0]],
  [at('controle',.85),[STAMP_ON[0],1.12,STAMP_ON[2]],TAG_ROT],
  [U_TAG,STAMP_ON,TAG_ROT], [at('controle',.905),STAMP_ON,TAG_ROT],
  [at('controle',.94),[STAMP_ON[0],1.12,STAMP_ON[2]],TAG_ROT],
  [at('controle',.99),STAMP_REST,[0,.2,0]]
 ]);
 var sideA = num([[0, 1.2], [at('carton', .66), 1.2], [at('carton', .78), -PI/2]]);
 var topA = num([[0, 1.02], [at('carton', .74), 1.02], [at('carton', .88), -PI/2]]);
 var tapeA = num([[0, 0], [at('carton', .86), 0], [at('carton', .98), 1]]);

 var zoomA=num([[0,.82],[at('depot',.5),.96],[at('collecte',.55),.92],[at('transport',.25),.8],[at('transport',.8),.82],
  [at('reception',.4),1.04],[at('reception',.7),1.4],[at('reception',.98),1.4],
  [at('desinfection',.5),1.12],[at('lavage',.4),1.18],[at('lavage',.85),1.18],[at('sechage',.28),.91],[at('sechage',.94),.91],
  [at('controle',.28),1.3],[at('controle',.76),1.3],[at('controle',.9),1.38],
  [at('carton',.25),1.08],[at('carton',.8),1.12],[at('etiquette',.18),1.18],[at('etiquette',.7),1.26],[U,.98]]);
 var azA=num([[0,.62],[at('depot',.6),.7],[at('collecte',.8),.8],[at('transport',.5),.95],
  [at('reception',.45),.5],[at('reception',.7),.3],[at('reception',.98),.3],
  [at('desinfection',.5),.72],[at('lavage',.4),.66],[at('lavage',.85),.64],[at('sechage',.28),.30],[at('sechage',.94),.30],[at('controle',.35),.60],[at('controle',.99),.60],
  [at('carton',.28),-.14],[at('carton',.7),-.14],[at('etiquette',.1),.34],[at('etiquette',.6),.44],[U,.8]]);
 var elA=num([[0,.5],[at('depot',.6),.66],[at('collecte',.6),.6],[at('transport',.5),.55],
  [at('reception',.65),.34],[at('reception',.98),.34],[at('desinfection',.55),.72],
  [at('lavage',.4),.78],[at('lavage',.85),.72],[at('sechage',.28),.20],[at('sechage',.94),.20],[at('controle',.3),.7],[at('carton',.6),.78],
  [at('etiquette',.2),.55],[at('etiquette',.7),.8],[U,.66]]);
 // Le tri réserve un temps de lecture à l'ordinateur, les autres gestes gardent un poste stable.
 var cameraAt=pose([
  [0,[0,.95,0],UP(0)], [at('collecte',.18),[0,.95,0],UP(0)],
  [at('collecte',.94),[1.15,.82,0],UP(0)], [at('transport',.08),[1.15,.82,0],UP(0)],
  [at('transport',.88),[4.82,.82,0],UP(0),io],
  [at('reception',.42),[5.68,1.02,-.48],UP(0)], [at('reception',.7),[5.95,.99,-.55],UP(0)],
  [at('desinfection',.08),[5.95,.99,-.55],UP(0)], [at('desinfection',.4),[7,.97,-.45],UP(0)],
  [at('desinfection',.92),[7,.97,-.45],UP(0)], [at('lavage',.25),[8.43,.97,-.55],UP(0)],
  [at('sechage',.02),[8.43,.97,-.55],UP(0)], [at('sechage',.19),[8.43,1.03,DY_FRONT],UP(0)],
  [at('sechage',.30),[DY.x,1.03,DY.z],UP(0)],
  [at('controle',.02),[DY.x,1.03,DY.z],UP(0)], [at('controle',.23),[9.8+AFTER_DRYER,.96,-.45],UP(0)],
  [at('carton',.08),[9.8+AFTER_DRYER,.96,-.45],UP(0)], [at('carton',.45),[CT.x+AFTER_DRYER,1.02,CT.z],UP(0)],
  [at('carton',.98),[CT.x+AFTER_DRYER,1.02,CT.z],UP(0)], [at('etiquette',.18),[(PR.x+CT.x)/2+AFTER_DRYER,.97,-.4],UP(0)],
  [at('etiquette',.6),[CT.x+AFTER_DRYER,1.02,CT.z],UP(0)]
 ]),cameraProbe=new THREE.Object3D();
 function afterDryerPose(fn){ return function(u,obj){ fn(u,obj);obj.position.x+=AFTER_DRYER; }; }
 controlBrushAt=afterDryerPose(controlBrushAt);shaverAt=afterDryerPose(shaverAt);labelAt=afterDryerPose(labelAt);
 tagFixedAt=afterDryerPose(tagFixedAt);stampAt=afterDryerPose(stampAt);
 var mA=new THREE.Matrix4(),tmpS=new THREE.Vector3(),probe=new THREE.Object3D();
 function matAt(fn,u){ fn(u,probe);probe.scale.set(1,1,1);probe.updateMatrix();return probe.matrix.clone(); }
 var TAG_OFF=matAt(braceAt,U_TAG).invert().multiply(matAt(tagFixedAt,U_TAG));
 var TAG_CARRIED=new THREE.Matrix4().makeTranslation(0,-.002,0);

 /* ---------- caméra ---------- */
 var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80), T = new THREE.Vector3(), dir = new THREE.Vector3();
 var vw = 1, vh = 1, frameX = 0.5, frameY = 0.5, frameHeight = 1;
 // La couverture seule est manipulable. Ces écarts se fondent dans le cadrage
 // du parcours au défilement, sans modifier les poses des modèles.
 var hero = {az:0, el:0}, heroReady = false, heroEnabled = false, heroPointer = null;
 function limit(n, min, max){ return Math.min(max, Math.max(min, n)); }
 function cancelHeroGesture(){
  var pointer = heroPointer; heroPointer = null;
  if (pointer && orbitEl){
   try { if (orbitEl.hasPointerCapture(pointer.id)) orbitEl.releasePointerCapture(pointer.id); } catch(e){}
  }
  if (orbitEl) orbitEl.classList.remove('is-drag');
 }
 function syncHeroControls(){
  heroEnabled = !!orbitEl && !failed && heroReady && current === 0 && requestedStep === null;
  root.classList.toggle('is-hero-interactive', heroEnabled);
  if (orbitEl){ orbitEl.inert = !heroEnabled; orbitEl.setAttribute('aria-hidden', heroEnabled ? 'false' : 'true'); orbitEl.setAttribute('tabindex', heroEnabled ? '0' : '-1'); }
  if (!heroEnabled) cancelHeroGesture();
 }
 function resetHero(){ cancelHeroGesture(); hero.az = hero.el = 0; }
 function heroRotate(dx, dy){
  hero.az = (hero.az - dx*.007) % (2*PI);
  hero.el = limit(hero.el + dy*.006, .12 - elA(0), 1.35 - elA(0));
  kick();
 }
 function heroPointerDown(e){
  if (!heroEnabled || (e.pointerType !== 'touch' && e.button !== 0)) return;
  if (heroPointer){ cancelHeroGesture(); return; }
  var type = e.pointerType || 'mouse';
  heroPointer = {id:e.pointerId, type:type, x:e.clientX, y:e.clientY, startX:e.clientX, startY:e.clientY, dragging:type !== 'touch'};
  try { orbitEl.setPointerCapture(e.pointerId); } catch(err){}
  if (type !== 'touch'){ e.preventDefault(); orbitEl.classList.add('is-drag'); }
 }
 function heroPointerMove(e){
  var p = heroPointer; if (!heroEnabled || !p || p.id !== e.pointerId) return;
  if (p.type === 'touch' && !p.dragging){
   var sx = e.clientX-p.startX, sy = e.clientY-p.startY;
   // L'intention verticale appartient au défilement natif de la page.
   if (Math.abs(sy) > 7 && Math.abs(sy) > Math.abs(sx)){ cancelHeroGesture(); return; }
   if (Math.abs(sx) < 7 || Math.abs(sx) < Math.abs(sy)*1.2) return;
   p.dragging = true; orbitEl.classList.add('is-drag');
  }
  heroRotate(e.clientX-p.x, e.clientY-p.y); p.x = e.clientX; p.y = e.clientY;
 }
 function heroPointerEnd(e){ if (heroPointer && heroPointer.id === e.pointerId) cancelHeroGesture(); }
 function heroKey(e){
  if (!heroEnabled || e.ctrlKey || e.metaKey || e.altKey) return;
  var dx = 0, dy = 0, key = e.key;
  if (key === 'ArrowLeft') dx = -24; else if (key === 'ArrowRight') dx = 24;
  else if (key === 'ArrowUp') dy = -24; else if (key === 'ArrowDown') dy = 24;
  else if (key === 'Home' || key === 'Escape'){ resetHero(); kick(); }
  else return;
  if (dx || dy) heroRotate(dx,dy);
  e.preventDefault();
 }
 if (orbitEl){
  orbitEl.addEventListener('pointerdown', heroPointerDown);
  orbitEl.addEventListener('pointermove', heroPointerMove);
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(name){ orbitEl.addEventListener(name, heroPointerEnd); });
  orbitEl.addEventListener('keydown', heroKey);
 }
 window.addEventListener('blur', cancelHeroGesture);
 function frameLayout(){
  if (narrow){
   var active = current > 0 ? nowEl : introEl;
   var copyBottom = textEl.offsetTop + active.offsetTop + active.offsetHeight + 24;
   var floor = Math.max(copyBottom + 100, vh - 92);
   frameX = 0.5; frameY = Math.min(0.84, (copyBottom + floor)/2/vh);
   frameHeight = Math.max(180, floor - copyBottom)/vh;
   root.style.setProperty('--gx-copy-bottom', copyBottom + 'px');
  } else {
   var left = textEl.offsetLeft + textEl.offsetWidth + 32;
   var right = indexEl.offsetLeft - 32;
   frameX = Math.min(0.65, Math.max(0.5, (left + right)/2/vw));
   frameY = 0.5; frameHeight = 1;
  }
 }
 function placeCamera(az, el, zoom){
  dir.set(Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el));
  cam.position.copy(T).addScaledVector(dir, 30); cam.lookAt(T);
  var asp = vw/vh;
  var view = narrow ? Math.max(1.9/frameHeight, 1.75/asp)/(Math.min(1.3, zoom)) : Math.max(2.6, 1.85/asp)/zoom;
  var offX = -(frameX - 0.5)*view*asp, offY = (frameY - 0.5)*view;
  cam.top = view/2 + offY; cam.bottom = -view/2 + offY;
  cam.left = -view*asp/2 + offX; cam.right = view*asp/2 + offX;
  cam.updateProjectionMatrix();
  sun.position.copy(T).add(SUN); sun.target.position.copy(T);
 }

 /* ---------- application d'un instant ---------- */
 function apply(u){
  var tx = truckX(u);
  truck.position.x = tx; frame.rotation.x = truckTilt(u);
  wheels.forEach(function(w){ w.rotation.x = (tx - 0.95)/0.1; });
  truck.updateMatrixWorld(true);

  cap.position.set(0, BH - 0.02 + capUp(u), capBack(u)); cap.rotation.x = capTilt(u);
  var xo = xrayA(u);
  xray.forEach(function(m){ m.opacity = xo; m.depthWrite = xo > 0.99; });
  xl.opacity = 0.32*(0.55 + 0.45*xo);
  tankFrontMat.opacity = tankXray(u); tankFrontMat.depthWrite = tankFrontMat.opacity > 0.99;

  if (u >= U_BAG_ON && u < U_BAG_OFF){ slot.matrixWorld.decompose(bag.position, bag.quaternion, tmpS); bag.scale.set(1, 1, 1); }
  else { bagAt(u, bag); bag.scale.set(1, bagDeflate(u), 1); }
  setBag(bag, bagTie(u));
  var bo = bagFade(u); bagMat.opacity = 0.46*bo; bagLine.opacity = 0.28*bo; bag.visible = bo > 0.01;
  bag.updateMatrix();

  if (u >= U_IN_BAG && u < U_OUT_BAG){ mA.multiplyMatrices(bag.matrix, IN_BAG); mA.decompose(brace.position, brace.quaternion, tmpS); }
  else braceAt(u, brace);
  brace.updateMatrix();

  ripples.forEach(function(r, i){
   var t = rip[i](u); r.visible = t > 0 && t < 1;
   r.scale.set(0.06 + t*0.4, 0.04 + t*0.22, 1); r.material.opacity = 0.42*(1 - t);
  });
  // Bulles pendant le bain uniquement.
  bubbles.visible = u > BUB0 && u < BUB1;
  if (bubbles.visible){
   var bt = (u - BUB0)/(BUB1 - BUB0), env = Math.sin(PI*bt);
   bubBase.forEach(function(b, i){
    var f = (bt*4*b.sp + b.ph) % 1, r = b.r*env;
    fp.set(b.x, TK.y - 0.2 + f*0.2, b.z); fs.set(r, r, r); fm.compose(fp, fq, fs); bubbles.setMatrixAt(i, fm);
   });
   bubbles.instanceMatrix.needsUpdate = true;
  }
  var ls = Math.round(Math.min(1, Math.max(0, (u - LOG0)/(LOG1 - LOG0)))*12);
  if (ls !== logStep){ logStep = ls; paint(screenTex); }
  setFoam(foamA(u), foamNear(u));
  var curtain = curtainOpen(u);
  dryerCurtains.forEach(function(blade){blade.mesh.position.x=blade.x+blade.side*.18*curtain;blade.mesh.rotation.z=blade.side*.07*curtain;});
  heatLevel=heatA(u);oxygenLevel=heatLevel;
  var treatmentTime=performance.now()/1000;updateHeat(treatmentTime);updateOxygen(treatmentTime);
  brushAt(u, brush);
  if (u > SCRUB0 && u < SCRUB1){
   var st = (u - SCRUB0)/(SCRUB1 - SCRUB0);
   brush.position.x += 0.2*Math.sin(st*PI*10)*Math.sin(st*PI); brush.rotation.y = 0.12*Math.sin(st*PI*10 + 1);
  }
  var co = coneA(u); coneMat.opacity = 0.18*co; cone.visible = co > 0.01;
  scan.visible = u > SCAN0 && u < SCAN1;
  if (scan.visible){ scan.position.x = scanX(u) + AFTER_DRYER; scanMat.opacity = 0.5*Math.sin(PI*(u - SCAN0)/(SCAN1 - SCAN0)); }

  controlBrushAt(u,controlBrush);
  if(u>CSCRUB0&&u<CSCRUB1){
   var cs=(u-CSCRUB0)/(CSCRUB1-CSCRUB0);
   controlBrush.position.x+=.20*Math.sin(cs*PI*8)*Math.sin(cs*PI);controlBrush.rotation.y=.10*Math.sin(cs*PI*8);
  }
  shaverAt(u,shaver);
  if(u>SHAVE0&&u<SHAVE1){
   var sh=(u-SHAVE0)/(SHAVE1-SHAVE0);
   shaver.position.x+=.22*Math.sin(sh*PI*6)*Math.sin(sh*PI);shaver.rotation.z=.025*Math.sin(sh*PI*30);
  }
  label.visible=u>=U_LABEL;
  labelAt(u,label);label.scale.set(1,1,1);
  if(u<=U_LABEL_OUT){
   var feed=labelFeed(u);label.scale.y=Math.max(.001,feed);
   label.position.set(PR.x+AFTER_DRYER,DESK+.077,PR.z+.184+.1*feed);
  }

  var s = sideA(u), t = topA(u), tp = tapeA(u);
  flapF.rotation.x = t; flapB.rotation.x = -t; flapR.rotation.z = -s; flapL.rotation.z = s;
  [[tapeL, 'y', tp/0.15], [tapeT, 'x', (tp - 0.15)/0.7], [tapeR, 'y', (tp - 0.85)/0.15]].forEach(function(t){
   var k = Math.min(1, Math.max(0, t[2])); t[0].visible = k > 0.001; t[0].scale[t[1]] = Math.max(0.001, k);
  });

  if (bracePivot) bracePivot.quaternion.setFromAxisAngle(flexAxis, flexA(u));
  stampAt(u,stamp);stamp.updateMatrix();
  if(u>=U_TAG){mA.multiplyMatrices(brace.matrix,TAG_OFF);mA.decompose(tag.position,tag.quaternion,tmpS);}
  else if(u>=U_TAG_PICK){
   mA.multiplyMatrices(stamp.matrix,TAG_CARRIED);mA.decompose(tag.position,tag.quaternion,tmpS);
  }else{tag.position.set(TAG_REST[0]+AFTER_DRYER,TAG_REST[1],TAG_REST[2]);tag.rotation.set(0,.25,0);}
  cameraAt(u, cameraProbe); T.copy(cameraProbe.position);
  overlay(u);
  var fade = limit((u/B.depot.s - .25)/.75, 0, 1);
  var influence = 1 - fade*fade*(3 - 2*fade), az = azA(u) + hero.az*influence, el = elA(u) + hero.el*influence;
  placeCamera(az, el, zoomA(u));
 }

 /* ---------- textes et sommaire ---------- */
 var DOM_OF = {intro:0, depot:1, collecte:2, transport:3, reception:4, desinfection:5, lavage:6, sechage:7, controle:8, carton:9, etiquette:10, fin:10};
 var PHASE_OF = [-1, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2];
 var REST = [.8, .95, .95, .98, .66, .72, .68, .98, .99, .96];
 var TOTAL = beatEls.length;
 var current = -1, requestedStep = null;
 function overlay(u){
  root.style.setProperty('--gx-p', (u/U).toFixed(4));
  var name = 'intro';
  for (var i = 0; i < BEATS.length; i++) if (u >= B[BEATS[i][0]].s) name = BEATS[i][0];
  var k = DOM_OF[name];
  if (k === current){ syncHeroControls(); return; }
  current = k;
  if (requestedStep === k) requestedStep = null;
  if (k > 0) resetHero();
  syncHeroControls();
  root.classList.toggle('is-started', k > 0);
  introEl.setAttribute('aria-hidden', k > 0 ? 'true' : 'false'); introEl.inert = k > 0;
  nowEl.setAttribute('aria-hidden', k === 0 ? 'true' : 'false');
  indexEl.inert = k === 0;
  beatEls.forEach(function(el, i){ el.classList.toggle('is-on', i === k - 1); el.setAttribute('aria-hidden', i === k - 1 ? 'false' : 'true'); });
  phaseEls.forEach(function(el, i){ el.classList.toggle('is-on', i === PHASE_OF[k]); el.setAttribute('aria-hidden', i === PHASE_OF[k] ? 'false' : 'true'); });
  gotos.forEach(function(el, i){
   el.classList.toggle('is-on', i === k - 1); el.classList.toggle('is-done', i < k - 1);
   if (i === k - 1) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
  });
  if (prevBtn) prevBtn.disabled = k === 0;
  if (nextBtn){ nextBtn.disabled = k === TOTAL; nextBtn.setAttribute('aria-label', k === 0 ? 'Commencer le parcours' : 'Étape suivante'); }
  if (statusEl) statusEl.textContent = k === 0 ? 'Le parcours' : String(k).padStart(2, '0') + ' / ' + TOTAL;
  if (progressEl) progressEl.setAttribute('aria-valuenow', k);
  frameLayout();
 }

 /* ---------- défilement, rendu à la demande ---------- */
 var goal = 0, shown = -1, raf = 0, last = 0, span = 1, headerOff = 0;
 function measure(){
  headerOff = parseFloat(getComputedStyle(pin).top) || 0;
  span = Math.max(1, root.offsetHeight - pin.offsetHeight);
  var r = root.getBoundingClientRect();
  return Math.min(1, Math.max(0, (headerOff - r.top)/span));
 }
 function visible(){ var r = root.getBoundingClientRect(); return !failed && !document.hidden && r.bottom > headerOff && r.top < window.innerHeight; }
 function render(){ if (!failed) renderer.render(scene, cam); }
 function setLoadProgress(value){
  if (root._gxSetLoadProgress) root._gxSetLoadProgress(value);
  else root.style.setProperty('--gx-load', value);
 }
 // Les poses du parcours restent la référence : restituer chaque objet avant
 // la frame suivante, puis superposer uniquement l'arrivée initiale.
 function restoreEntrance(){
  entrance.items.forEach(function(item){
   if (!item.saved) return;
   item.obj.position.copy(item.position); item.obj.scale.copy(item.scale); item.obj.visible = item.visible; item.saved = false;
  });
 }
 function finishEntrance(){
  restoreEntrance(); entrance.active = false; entrance.items = [];
  root.classList.remove('is-entering', 'is-loading'); root.setAttribute('aria-busy', 'false');
  if (!failed){ root.classList.add('is-ready'); heroReady = true; syncHeroControls(); }
  if (entrance.resolve){ var done = entrance.resolve; entrance.resolve = null; done(); }
 }
 function updateEntrance(now){
  // Un visiteur qui défile ou revient à une étape conserve immédiatement sa pose.
  if (goal > B.depot.s/U || !visible()){ finishEntrance(); return; }
  var elapsed = now - entrance.start;
  if (elapsed >= entrance.end){ finishEntrance(); return; }
  entrance.items.forEach(function(item){
   var obj = item.obj, k = 1 - easeEnter(limit((elapsed - item.delay)/item.duration, 0, 1));
   item.position.copy(obj.position); item.scale.copy(obj.scale); item.visible = obj.visible; item.saved = true;
   if (k <= 0) return;
   // Chaque unité (la pharmacie entière, un meuble, l'attelle) est visible dès la première image,
   // sous le fondu de la toile, et se pose d'un peu plus haut en retrouvant sa taille autour de
   // son pied : jamais d'apparition depuis zéro, aucun accessoire séparé de son meuble.
   var scale = 1 - item.shrink*k;
   obj.scale.multiplyScalar(scale);
   obj.position.sub(item.pivot).multiplyScalar(scale).add(item.pivot);
   obj.position.y += item.lift*k;
  });
 }
 function drawFrame(u, now){
  restoreEntrance(); apply(u);
  if (entrance.active) updateEntrance(now || performance.now());
  render();
 }
 function startEntrance(){
  return new Promise(function(resolve){
   entrance.resolve = resolve;
   goal = measure(); shown = goal;
   if (failed || !visible() || goal > B.depot.s/U){ if (root._gxCancelSiteLoading) root._gxCancelSiteLoading(); finishEntrance(); return; }
   // Décor : se pose en 1 s depuis 22 cm plus haut et 94 % de sa taille, de gauche à droite sur 220 ms.
   // Attelle : se pose ensuite, de plus haut, pour devenir le dernier temps de la scène.
   var DECOR = {delay:120, spread:220, duration:1000, lift:.22, shrink:.06}, SUBJECT = {delay:320, duration:1100, lift:.5, shrink:.1};
   W.updateMatrixWorld(true);
   var units = {};
   W.children.forEach(function(obj){
    var name = obj.userData.entryUnit || obj.uuid;
    if (!units[name]) units[name] = {layer:obj.userData.entryLayer || 'details', bounds:new THREE.Box3(), position:obj.position.clone()};
    // Three r128 ne mesure pas les matrices d'instances : le caisson et
    // ses équipements définissent le pivot, la mousse suit la même unité.
    if (obj.visible && !obj.isInstancedMesh) units[name].bounds.union(new THREE.Box3().setFromObject(obj));
   });
   Object.keys(units).forEach(function(name){
    var unit = units[name], bounds = unit.bounds;
    unit.pivot = bounds.isEmpty() ? unit.position : W.worldToLocal(new THREE.Vector3((bounds.min.x + bounds.max.x)/2,bounds.min.y,(bounds.min.z + bounds.max.z)/2));
    var cfg = unit.layer === 'subject' ? SUBJECT : DECOR;
    unit.delay = cfg.delay + (cfg === DECOR ? limit((unit.pivot.x + 2.3)/4.5,0,1)*DECOR.spread : 0); unit.duration = cfg.duration;
    unit.lift = cfg.lift; unit.shrink = cfg.shrink;
   });
   entrance.items = W.children.map(function(obj){
    var unit = units[obj.userData.entryUnit || obj.uuid];
    return {obj:obj, position:obj.position.clone(), scale:obj.scale.clone(), visible:obj.visible, saved:false,
     delay:unit.delay, duration:unit.duration, pivot:unit.pivot, lift:unit.lift, shrink:unit.shrink};
   });
   // Fin de l'entrée : dernière unité posée, et au plus tôt après l'arrivée du texte (accueil.css, 0,55 s + 3 × 80 ms + 0,7 s).
   entrance.end = Math.max(1600, Math.max.apply(null, entrance.items.map(function(item){ return item.delay + item.duration; })));
   entrance.start = performance.now(); entrance.active = true;
   setLoadProgress('1'); root.classList.add('is-entering');
   if (root._gxRevealSite) root._gxRevealSite();
   drawFrame(shown*U, entrance.start); kick();
  });
 }
 function tick(now){
  raf = 0;
  if (!visible()){ if (entrance.active) finishEntrance(); return; }
  var dt = Math.min(0.064, Math.max(0.001, (now - last)/1000)); last = now;
  if (shown < 0 || Math.abs(goal - shown) > 0.24) shown = goal;
  else shown += (goal - shown)*(1 - Math.exp(-dt*14));
  if (Math.abs(goal - shown) < 0.00004) shown = goal;
  drawFrame(shown*U, now);
  if (shown !== goal || heatLevel > .01 || entrance.active) raf = requestAnimationFrame(tick);
 }
 function kick(){ if (!raf && visible()){ last = performance.now(); raf = requestAnimationFrame(tick); } }
 function onScroll(){ goal = measure(); if (visible()) kick(); else { if (entrance.active) finishEntrance(); if (raf) cancelAnimationFrame(raf); raf = 0; shown = -1; } }
 window.addEventListener('scroll', onScroll, {passive:true});
 document.addEventListener('visibilitychange', function(){
  if (document.hidden){ if (entrance.active) finishEntrance(); if (raf) cancelAnimationFrame(raf); raf = 0; shown = -1; }
  if (document.hidden) cancelHeroGesture();
  else { goal = measure(); kick(); }
 });

 var renderWidth = 0, renderHeight = 0, renderRatio = 0;
 function resize(){
  if (failed) return;
  vw = Math.max(1, pin.clientWidth); vh = Math.max(1, pin.clientHeight); narrow = window.matchMedia('(max-width: 980px)').matches;
  var ratio = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 1.75);
  if (renderWidth !== vw || renderHeight !== vh || renderRatio !== ratio){
   renderer.setPixelRatio(ratio); renderer.setSize(vw, vh, false);
   renderWidth = vw; renderHeight = vh; renderRatio = ratio;
  }
  goal = measure(); shown = goal; frameLayout();
  drawFrame(shown*U);
 }
 var resizeObserver;
 if ('ResizeObserver' in window){ resizeObserver = new ResizeObserver(resize); resizeObserver.observe(pin); resizeObserver.observe(textEl); }
 else window.addEventListener('resize', resize);
 resize();

 function goTo(k){
  requestedStep = k;
  syncHeroControls();
  var u = 0;
  if (k > 0){ var b = B[BEATS[k][0]]; u = b.s + b.l*REST[k - 1]; }
  goal = measure();
  var y = window.scrollY + root.getBoundingClientRect().top - headerOff + (u/U)*span;
  window.scrollTo({top:Math.round(y), behavior:'smooth'});
 }
 gotos.forEach(function(btn, i){
  btn.addEventListener('click', function(){ goTo(i + 1); });
 });
 if (prevBtn) prevBtn.addEventListener('click', function(){ goTo(Math.max(0, (requestedStep === null ? current : requestedStep) - 1)); });
 if (nextBtn) nextBtn.addEventListener('click', function(){ goTo(Math.min(TOTAL, (requestedStep === null ? current : requestedStep) + 1)); });
 // Ces ancres appartiennent au parcours : éviter le second défilement
 // délégué par le thème parent et prendre en compte l'en-tête fixe.
 [].slice.call(root.querySelectorAll('a[href^="#"]')).forEach(function(link){
  link.addEventListener('click', function(event){
   var target = document.getElementById(link.getAttribute('href').slice(1));
   if (!target) return;
   event.preventDefault(); event.stopImmediatePropagation(); requestedStep = null;
   var y = window.scrollY + target.getBoundingClientRect().top - headerOff - 24;
   target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true});
   // « Passer » saute directement à la suite, sans faire défiler tout le parcours.
   window.scrollTo({top:Math.max(0, Math.round(y)), behavior: link.hasAttribute('data-passer') ? 'instant' : 'smooth'});
  }, true);
 });
 function manualScroll(){ requestedStep = null; }
 window.addEventListener('wheel', manualScroll, {passive:true});
 window.addEventListener('touchstart', manualScroll, {passive:true});

 // Une perte de contexte GPU ou une préférence d'accessibilité rétablit
 // le parcours illustré, sans laisser un canvas vide ni une longue zone figée.
 function fallback(){
  if (failed) return; failed = true;
  if (root._gxCancelSiteLoading) root._gxCancelSiteLoading();
  finishEntrance();
  syncHeroControls();
  if (raf) cancelAnimationFrame(raf); raf = 0;
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('wheel', manualScroll); window.removeEventListener('touchstart', manualScroll);
  root.classList.add('is-fallback'); root.classList.remove('is-ready', 'is-loading', 'is-entering');
  var process = root.closest('.gx-process'); if (process) process.classList.remove('is-journey');
  renderer.dispose();
 }
 canvas.addEventListener('webglcontextlost', fallback);
 var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', function(e){ if (e.matches) fallback(); });
 var shortViewport = window.matchMedia('(max-width: 980px) and (max-height: 600px)');
 if (shortViewport.addEventListener) shortViewport.addEventListener('change', function(e){ if (e.matches) fallback(); });

 // Les polices du site servent aussi à l'étiquette et à l'enseigne.
 if (document.fonts && document.fonts.load){
  assetLoads.push(new Promise(function(resolve){
   var timer = setTimeout(resolve, 1500);
   Promise.all([document.fonts.load('500 58px "DM Sans"'), document.fonts.load('400 92px "DM Sans"'), document.fonts.load('500 21px "JetBrains Mono"'), document.fonts.load('500 86px "DM Sans"')])
    .then(function(){ if (!failed){ [labelTex, signTex, screenTex].forEach(paint); render(); } })
    .catch(function(){}).then(function(){ clearTimeout(timer); resolve(); });
  }));
 }
 /* ---------- modèle 3D d'attelle ----------
    « Leg brace » par Anhbodoi36 (Vô nghiệm, Sketchfab), CC BY 4.0, converti par refonte/attelle-3d/convertir.py
    en trois blocs (coque, sangles, métal) dans assets/modeles/attelle.bin. L'attelle dessinée reste affichée
    pendant le chargement ou à défaut. Le modèle est recentré, mis dans l'axe y (longueur 0,64, largeur ≤ 0,22
    pour passer l'ouverture de la borne et tenir dans le sac), recoloré et fileté comme le reste de la scène. */
 var MODEL_FIX = new THREE.Euler(0, 0, 0, 'YXZ'), ROLES = ['shell', 'strap', 'metal'];
 function pad4(n){ return (n + 3) & ~3; }
 function parseBrace(buf){
  var dv = new DataView(buf), n = dv.getUint32(4, true), o = 20, heads = [], parts = [];
  parts.hinge = new THREE.Vector3(dv.getFloat32(8, true), dv.getFloat32(12, true), dv.getFloat32(16, true));
  for (var i = 0; i < n; i++, o += 40){
   heads.push({role:dv.getUint32(o, true), seg:dv.getUint32(o + 4, true), v:dv.getUint32(o + 8, true), i:dv.getUint32(o + 12, true),
    min:[dv.getFloat32(o + 16, true), dv.getFloat32(o + 20, true), dv.getFloat32(o + 24, true)],
    step:[dv.getFloat32(o + 28, true), dv.getFloat32(o + 32, true), dv.getFloat32(o + 36, true)]});
  }
  heads.forEach(function(h){
   var q = new Int16Array(buf, o, h.v*3), pos = new Float32Array(h.v*3), k; o += pad4(h.v*6);
   for (k = 0; k < h.v*3; k++) pos[k] = h.min[k % 3] + (q[k] + 32767)*h.step[k % 3];
   var nq = new Int8Array(buf, o, h.v*3), nrm = new Float32Array(h.v*3); o += pad4(h.v*3);
   for (k = 0; k < h.v*3; k++) nrm[k] = nq[k]/127;
   var idx = new Uint16Array(buf.slice(o, o + h.i*2)); o += pad4(h.i*2);
   var geo = new THREE.BufferGeometry();
   geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
   geo.setIndex(new THREE.BufferAttribute(idx, 1));
   parts.push({geo:geo, role:ROLES[h.role], seg:h.seg});
  });
  return parts;
 }
 // Modèle : version compressée (gzip, attelle.binz) décompressée par le navigateur, sinon attelle.bin.
 // La progression suit les octets reçus : c'est la plus grosse ressource du parcours.
 var modelShare = 0;
 function fetchModel(url, onProgress){
  return fetch(url).then(function(r){
   if (!r.ok) throw new Error(r.status);
   var total = +r.headers.get('content-length') || 0;
   if (!r.body || !r.body.getReader || !total) return r.arrayBuffer();
   var reader = r.body.getReader(), chunks = [], got = 0;
   function pump(){
    return reader.read().then(function(step){
     if (step.done){ var out = new Uint8Array(got), o = 0; chunks.forEach(function(c){ out.set(c, o); o += c.length; }); return out.buffer; }
     chunks.push(step.value); got += step.value.length; onProgress(Math.min(1, got/total));
     return pump();
    });
   }
   return pump();
  }).then(function(buf){
   var head = new Uint8Array(buf, 0, 2);
   if (head[0] !== 0x1f || head[1] !== 0x8b) return buf;
   return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  });
 }
 function swapBrace(target, parts, mats){
  while (target.children.length) target.remove(target.children[0]);
  var pivot = new THREE.Group(); pivot.position.copy(parts.hingeT); target.add(pivot);
  parts.forEach(function(pt){ finish(pt.seg ? pivot : target, new THREE.Mesh(pt.geo, mats[pt.role]), pt.geo, {thr:28}); });
  return pivot;
 }
 function useModel(parts){
  if (failed) return;
  var box3 = new THREE.Box3();
  parts.forEach(function(pt){ pt.geo.computeBoundingBox(); box3.union(pt.geo.boundingBox); });
  var size = box3.getSize(new THREE.Vector3()), ctr = box3.getCenter(new THREE.Vector3());
  var m = new THREE.Matrix4().makeTranslation(-ctr.x, -ctr.y, -ctr.z), rot = new THREE.Matrix4(), L, A, Bw;
  if (size.x >= size.y && size.x >= size.z){ rot.makeRotationZ(Math.PI/2); L = size.x; A = size.y; Bw = size.z; }
  else if (size.z >= size.y){ rot.makeRotationX(-Math.PI/2); L = size.z; A = size.x; Bw = size.y; }
  else { L = size.y; A = size.x; Bw = size.z; }
  var k = Math.min(0.64/L, 0.22/Math.max(A, Bw));
  m.premultiply(rot).premultiply(new THREE.Matrix4().makeScale(k, k, k)).premultiply(new THREE.Matrix4().makeRotationFromEuler(MODEL_FIX));
  parts.hingeT = parts.hinge.clone().applyMatrix4(m);
  flexAxis.set(0, 0, 1).transformDirection(m);
  parts.forEach(function(pt){
   pt.geo.applyMatrix4(m);
   if (pt.seg) pt.geo.translate(-parts.hingeT.x, -parts.hingeT.y, -parts.hingeT.z);
   pt.geo.computeBoundingSphere();
  });
  bracePivot = swapBrace(brace, parts, {shell:M.shell, strap:M.black, metal:M.metal});
  pileBraces.forEach(function(b){ swapBrace(b, parts, {shell:M.bodyDS, strap:M.darkDS, metal:M.body}); });
  root.classList.add('has-model');
  apply(shown*U); render();
 }
 var modelRaw = root.getAttribute('data-brace-model'), modelZ = root.getAttribute('data-brace-model-z');
 var modelUrl = modelZ && window.DecompressionStream ? modelZ : modelRaw;
 // Progression réelle : 0,28 après three.js, puis le modèle (80 % du reste, octet par octet) et les petites ressources.
 var loadedCount = 0, smallCount = assetLoads.length;
 function progress(){ setLoadProgress(String(.28 + .6*((modelUrl ? modelShare*.8 : .8) + .2*loadedCount/Math.max(1, smallCount)))); }
 if (modelUrl && window.fetch){
  assetLoads.push(fetchModel(modelUrl, function(k){ modelShare = k; progress(); })
   .catch(function(){ return modelZ && modelUrl === modelZ && modelRaw ? fetchModel(modelRaw, function(k){ modelShare = k; progress(); }) : null; })
   .then(function(buf){ modelShare = 1; if (buf) useModel(parseBrace(buf)); progress(); }).catch(function(){ modelShare = 1; progress(); }));
 }
 var assetsReady = new Promise(function(resolve, reject){
  var timer = setTimeout(function(){ reject(new Error('scene-timeout')); }, 10000);
  Promise.all(assetLoads.map(function(promise, i){ return promise.then(function(){
   if (i < smallCount){ loadedCount++; progress(); }
  }); })).then(function(){ clearTimeout(timer); resolve(); }, function(error){ clearTimeout(timer); reject(error); });
 });
 return assetsReady.then(function(){
  if (failed) return;
  if (reducedMotion.matches || shortViewport.matches){ fallback(); return; }
  resize(); renderer.compile(scene, cam); render(); setLoadProgress('.96');
  // Aucune attente ajoutée : le chargeur se lève dès que la scène est prête.
 }).then(function(){
  if (failed) return;
  if (reducedMotion.matches || shortViewport.matches){ fallback(); return; }
  return startEntrance();
 }).catch(fallback);
};
})();
