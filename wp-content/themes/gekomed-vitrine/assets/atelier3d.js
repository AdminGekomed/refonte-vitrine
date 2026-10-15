/* Visite 3D de l'atelier Gekomed.
   Construction de la maquette reprise de l'artefact « Ateliers Gekomed, vue 3D »,
   interface réécrite pour la vitrine : couleurs du site, rendu à la demande, molette laissée au défilement de la page.
   three.js r128 est chargé par accueil.js avant l'appel de window.GxAtelier(racine). */
window.GxAtelier = function(root){
"use strict";
var SMALL = Math.min(window.innerWidth, window.innerHeight) < 700;
var GREEN = 0x6FAE3E;
var S = 1, OX = 0, OZ = 0;
function X(p){return p*S-OX;} function Z(p){return p*S-OZ;} function L(p){return p*S;}
function R(x0,y0,x1,y1){return {x:X((x0+x1)/2), z:Z((y0+y1)/2), w:L(x1-x0), d:L(y1-y0)};}
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function hex(n){return '#'+n.toString(16).padStart(6,'0');}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function easeIO(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function easeOut(t){return 1-Math.pow(1-t,3);}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function readTheme(){
  return {paper:0xffffff, body:0xffffff, ink:0x0F3E2E, poche:0xC9D6CC, dark:0xD3DAD5, felt:0xF1F4F1, floor:0xffffff, tint:0xE8F0E5, grid:0xE7EAE8, metal:0xE0E5E1, glass:0xDCE6E1, hatch:'#D6DED8'};
}
var T = readTheme();

var stage = root.querySelector('.ga-stage');
var canvas = root.querySelector('.ga-canvas');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
var scene, sun, grid;
function newScene(half, map){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(T.paper);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e6e6, 0.78));
  sun = new THREE.DirectionalLight(0xffffff, 0.42);
  sun.position.set(-6,14,-9); sun.castShadow = true;
  sun.shadow.mapSize.set(map,map);
  var sc = sun.shadow.camera; sc.left=-half; sc.right=half; sc.top=half; sc.bottom=-half; sc.near=1; sc.far=60;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  var fill = new THREE.DirectionalLight(0xffffff, 0.12); fill.position.set(8,6,10); scene.add(fill);
  grid = new THREE.GridHelper(200,200,T.grid,T.grid); grid.position.y = -0.06; scene.add(grid);
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.ShadowMaterial({opacity:0.1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.055; ground.receiveShadow = true; scene.add(ground);
}

var M = {
  body: new THREE.MeshLambertMaterial({color:T.body}),
  dark: new THREE.MeshLambertMaterial({color:T.dark}),
  darkDS: new THREE.MeshLambertMaterial({color:T.dark, side:THREE.DoubleSide}),
  felt: new THREE.MeshLambertMaterial({color:T.felt}),
  metal: new THREE.MeshLambertMaterial({color:T.metal}),
  green: new THREE.MeshLambertMaterial({color:GREEN}),
  greenDS: new THREE.MeshLambertMaterial({color:GREEN, side:THREE.DoubleSide}),
  poche: new THREE.MeshBasicMaterial({color:T.poche}),
  floor: new THREE.MeshLambertMaterial({color:T.floor}),
  glass: new THREE.MeshLambertMaterial({color:T.glass, transparent:true, opacity:.4, depthWrite:false, side:THREE.DoubleSide}),
  pvc: new THREE.MeshLambertMaterial({color:T.glass, transparent:true, opacity:.2, depthWrite:false, side:THREE.DoubleSide}),
  line: new THREE.LineBasicMaterial({color:T.ink, transparent:true, opacity:.3}),
  soft: new THREE.LineBasicMaterial({color:T.ink, transparent:true, opacity:.2})
};

/* hatch texture */
var hatchCv = document.createElement('canvas'); hatchCv.width = hatchCv.height = 64;
function drawHatch(){
  var g = hatchCv.getContext('2d');
  g.fillStyle = hex(T.floor); g.fillRect(0,0,64,64);
  g.strokeStyle = T.hatch; g.lineWidth = 2; g.beginPath();
  for (var i=-64;i<=128;i+=16){ g.moveTo(i,64); g.lineTo(i+64,0); }
  g.stroke();
}
drawHatch();
var hatchTextures = [];
function hatchTex(w,d){
  var t = new THREE.CanvasTexture(hatchCv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w*2.2, d*2.2);
  hatchTextures.push(t); return t;
}

function finish(parent,m,g,o){
  m.castShadow = o.shadow!==false; m.receiveShadow = true;
  m.userData.paint = o.paint!==false;
  m.userData.base = m.material; m.userData.base0 = m.material;
  if (o.detail) m.userData.detail = o.detail;
  if (o.obj===false) m.userData.noZone = true;
  if (o.edges!==false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, o.thr||1), o.line||M.line));
  parent.add(m); return m;
}
function box(parent,w,h,d,x,y,z,o){
  o = o||{};
  var g = new THREE.BoxGeometry(w,h,d);
  var m = new THREE.Mesh(g, o.mat||M.body);
  m.position.set(x, y+h/2, z);
  if (o.ry) m.rotation.y = o.ry;
  return finish(parent,m,g,o);
}
/* Arrondis géométriques partagés : les contours courbes et les biseaux apportent
   du volume sans multiplier les subdivisions des grandes faces planes. */
var roundedGeometryCache = {};
M.rubber = new THREE.MeshLambertMaterial({color:0x65716B});
M.screen = new THREE.MeshLambertMaterial({color:0x264738});
function roundedBox(parent,w,h,d,x,y,z,o){
  o=o||{};
  var r=Math.min(o.radius||Math.min(w,h,d)*0.16,Math.min(w,h,d)*0.24), seg=o.segments||o.seg||3;
  if(SMALL)seg=Math.min(seg,2);
  var hw=w/2-r, hh=h/2-r, q=Math.min(o.cornerRadius||r,hw*0.9,hh*0.9);
  var key=[w,h,d,r,q,seg].join('_'), g=roundedGeometryCache[key];
  if (!g){
    var sh=new THREE.Shape();
    sh.moveTo(-hw+q,-hh); sh.lineTo(hw-q,-hh); sh.quadraticCurveTo(hw,-hh,hw,-hh+q);
    sh.lineTo(hw,hh-q); sh.quadraticCurveTo(hw,hh,hw-q,hh);
    sh.lineTo(-hw+q,hh); sh.quadraticCurveTo(-hw,hh,-hw,hh-q);
    sh.lineTo(-hw,-hh+q); sh.quadraticCurveTo(-hw,-hh,-hw+q,-hh);
    g=new THREE.ExtrudeGeometry(sh,{depth:d-2*r,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:seg,curveSegments:seg});
    g.translate(0,0,-(d-2*r)/2); roundedGeometryCache[key]=g;
  }
  var m=new THREE.Mesh(g,o.mat||M.body); m.position.set(x,y+h/2,z);
  if(o.rx)m.rotation.x=o.rx; if(o.ry)m.rotation.y=o.ry; if(o.rz)m.rotation.z=o.rz;
  if(o.thr===undefined)o.thr=SMALL?46:32;
  return finish(parent,m,g,o);
}
var stockGeometryCache = {};
function mergeGeometryParts(parts){
  var positions=[],normals=[];
  parts.forEach(function(m){
    m.updateMatrix();
    var g=m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, p=g.attributes.position, n=g.attributes.normal;
    var v=new THREE.Vector3(), normal=new THREE.Vector3(), nm=new THREE.Matrix3().getNormalMatrix(m.matrix);
    for(var i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(m.matrix); positions.push(v.x,v.y,v.z);
      normal.fromBufferAttribute(n,i).applyMatrix3(nm).normalize(); normals.push(normal.x,normal.y,normal.z);
    }
  });
  var merged=new THREE.BufferGeometry();
  merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  return merged;
}
function stockRingGeometry(w,d,inset,radius,height,seg){
  var hw=w/2, hd=d/2, sh=new THREE.Shape(), hole=new THREE.Path();
  sh.moveTo(-hw+radius,-hd); sh.lineTo(hw-radius,-hd); sh.quadraticCurveTo(hw,-hd,hw,-hd+radius);
  sh.lineTo(hw,hd-radius); sh.quadraticCurveTo(hw,hd,hw-radius,hd);
  sh.lineTo(-hw+radius,hd); sh.quadraticCurveTo(-hw,hd,-hw,hd-radius);
  sh.lineTo(-hw,-hd+radius); sh.quadraticCurveTo(-hw,-hd,-hw+radius,-hd);
  hw-=inset;hd-=inset;var r=Math.max(0.006,radius-inset*0.5);
  hole.moveTo(-hw,-hd+r); hole.lineTo(-hw,hd-r); hole.quadraticCurveTo(-hw,hd,-hw+r,hd);
  hole.lineTo(hw-r,hd); hole.quadraticCurveTo(hw,hd,hw,hd-r);
  hole.lineTo(hw,-hd+r); hole.quadraticCurveTo(hw,-hd,hw-r,-hd);
  hole.lineTo(-hw+r,-hd); hole.quadraticCurveTo(-hw,-hd,-hw,-hd+r); sh.holes.push(hole);
  var g=new THREE.ExtrudeGeometry(sh,{depth:height,steps:1,bevelEnabled:false,curveSegments:seg});
  g.rotateX(-Math.PI/2);return g;
}
function storageBox(p,w,h,d,x,y,z,bins){
  var seg=SMALL?2:3, key=(bins?'bin_':'carton_')+seg, geo=stockGeometryCache[key];
  if(!geo){
    var temp=new THREE.Group(), parts=[];
    if(bins){
      parts.push(roundedBox(temp,1,0.026,1,0,0,0,{radius:0.005,segments:2,edges:false}));
      var walls=new THREE.Mesh(stockRingGeometry(1,0.992,0.039,0.045,0.974,seg)); walls.position.y=0.026;parts.push(walls);
      var rim=new THREE.Mesh(stockRingGeometry(1,1,0.052,0.045,0.01,seg));rim.position.y=0.99;parts.push(rim);
    }else{
      parts.push(box(temp,0.16,0.008,0.97,0,0.992,0,{edges:false}));
      parts.push(box(temp,0.3,0.19,0.004,-0.16,0.58,0.498,{edges:false}));
    }
    geo=mergeGeometryParts(parts);stockGeometryCache[key]=geo;
  }
  if(bins){
    var m=new THREE.Mesh(geo,M.dark);m.position.set(x,y,z);m.scale.set(w,h,d);finish(p,m,geo,{detail:1,thr:SMALL?46:32});
    box(p,w*0.22,h*0.12,d*0.004,x,y+h*0.65,z+d*0.498,{mat:M.felt,edges:false,shadow:false,paint:false,detail:1});
  }else{
    var body=roundedBox(p,1,1,1,0,0,0,{radius:0.012,segments:2,detail:1});
    body.position.set(x,y+(h-0.002)/2,z-0.001);body.scale.set(w,h-0.002,d-0.002);
    var detail=new THREE.Mesh(geo,M.felt);detail.position.set(x,y,z);detail.scale.set(w,h,d);finish(p,detail,geo,{detail:1,paint:false,edges:false,shadow:false});
  }
}
function basin(p,w,h,d,x,y,z){
  roundedBox(p,w,0.018,d,x,y,z,{mat:M.metal,radius:0.003});
  [-1,1].forEach(function(side){
    roundedBox(p,w,h-0.018,0.022,x,y+0.018,z+side*(d/2-0.011),{mat:M.metal,radius:0.004});
    roundedBox(p,0.022,h-0.018,d-0.044,x+side*(w/2-0.011),y+0.018,z,{mat:M.metal,radius:0.004});
    roundedBox(p,w,0.008,0.034,x,y+h-0.008,z+side*(d/2-0.017),{mat:M.body,radius:0.0015});
  });
  cyl(p,0.025,0.025,0.002,x,y+0.018,z,{mat:M.dark,seg:24,edges:false,shadow:false,paint:false});
}
function printerModel(p,x,y,z,paper){
  roundedBox(p,0.2,0.14,0.248,x,y,z+0.001,{radius:0.018,segments:4});
  roundedBox(p,0.18,0.03,0.18,x,y+0.14,z+0.02,{mat:M.dark,radius:0.006});
  roundedBox(p,0.132,0.011,0.002,x,y+0.045,z-0.124,{mat:M.screen,radius:0.0004,paint:false,edges:false,shadow:false});
  roundedBox(p,0.032,0.002,0.031,x+0.056,y+0.17-0.002,z+0.035,{mat:M.green,radius:0.0004,paint:false,edges:false,shadow:false});
  for(var i=0;i<3;i++) box(p,0.001,0.018,0.025,x+0.1-0.0005,y+0.066+i*0.022,z+0.065,{mat:M.dark,paint:false,edges:false,shadow:false});
  if(paper) box(p,0.05,0.002,0.07,x,y+0.03,z-0.155,{paint:false,edges:false,shadow:false});
}
function sewingModel(p,x,y,z){
  roundedBox(p,0.38,0.07,0.17,x,y,z,{radius:0.014,segments:4});
  roundedBox(p,0.1,0.2,0.14,x+0.14,y+0.07,z,{radius:0.018,segments:4});
  roundedBox(p,0.38,0.08,0.12,x,y+0.25,z,{radius:0.017,segments:4});
  roundedBox(p,0.08,0.1,0.11,x-0.15,y+0.15,z,{radius:0.013,segments:4});
  cyl(p,0.055,0.055,0.03,x+0.205,y+0.25,z,{rz:Math.PI/2,center:true,seg:28});
  cyl(p,0.006,0.006,0.066,x-0.15,y+0.083,z,{mat:M.metal,seg:12,edges:false,paint:false});
  roundedBox(p,0.07,0.004,0.06,x-0.15,y+0.074,z,{mat:M.metal,radius:0.0007,paint:false,edges:false});
  roundedBox(p,0.03,0.04,0.002,x+0.14,y+0.14,z+0.069,{mat:M.dark,radius:0.0004,paint:false,edges:false});
}
function pressModel(p,x,y,z){
  roundedBox(p,0.22,0.03,0.4,x,y,z,{mat:M.dark,radius:0.006});
  roundedBox(p,0.2,0.03,0.26,x,y+0.03,z-0.05,{radius:0.006});
  roundedBox(p,0.09,0.3,0.09,x,y+0.03,z+0.14,{radius:0.016,segments:4});
  roundedBox(p,0.2,0.045,0.27,x,y+0.09,z-0.05,{radius:0.009});
  roundedBox(p,0.012,0.08,0.3,x-0.09,y+0.13,z-0.03,{mat:M.dark,radius:0.002});
  roundedBox(p,0.012,0.08,0.3,x+0.09,y+0.13,z-0.03,{mat:M.dark,radius:0.002});
  cyl(p,0.022,0.022,0.26,x,y+0.16,z-0.2,{rz:Math.PI/2,center:true,mat:M.dark,seg:24});
  roundedBox(p,0.05,0.082,0.004,x,y+0.185,z+0.093,{mat:M.screen,radius:0.0008,paint:false,shadow:false});
}

function cyl(parent,rt,rb,h,x,y,z,o){
  o = o||{}; o.thr = o.thr||40;
  var g = new THREE.CylinderGeometry(rt,rb,h,o.seg||16,1,!!o.open);
  var m = new THREE.Mesh(g, o.mat||M.body);
  if (o.center) m.position.set(x,y,z); else m.position.set(x, y+h/2, z);
  if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  return finish(parent,m,g,o);
}
function torus(parent,rad,tube,x,y,z,o){
  o = o||{}; o.edges = false;
  var g = new THREE.TorusGeometry(rad,tube,6,28);
  var m = new THREE.Mesh(g, o.mat||M.dark);
  m.position.set(x,y,z); m.rotation.x = Math.PI/2;
  return finish(parent,m,g,o);
}

var zones, items, allInst, flows, LINE, STEPS, ZC, ZONESTEP, ZONELABELS, VIEW = null, VIEWS = {};
M.lineOn = new THREE.MeshLambertMaterial({color:GREEN});
M.lineOff = new THREE.MeshLambertMaterial({color:0xd8eac8});
/* one continuous green ribbon floating above the floor: smooth curve, round tube, soft curls */
function buildLine(spec, radius, yBase, yAmp){
  var pts2 = [], marks = {};
  spec.forEach(function(it){
    if (Array.isArray(it)) pts2.push(it);
    else if (it.mark) marks[it.mark] = pts2.length-1;
    else if (it.curl){
      var c = it.curl, th = c[2]*Math.PI/180, r = c[3], side = c[4];
      var cx = c[0] + side*r*Math.sin(th), cz = c[1] - side*r*Math.cos(th);
      var a0 = Math.atan2(c[1]-cz, c[0]-cx);
      for (var k=0;k<=6;k++){ var an = a0 - side*k*Math.PI/3; pts2.push([cx+r*Math.cos(an), cz+r*Math.sin(an)]); }
    }
  });
  var n = pts2.length, ctrl = pts2.map(function(q,i){
    var y = yBase + yAmp*Math.sin(i*0.55);
    if (i===0) y = yBase-0.3; if (i===n-1) y = yBase-0.25;
    return new THREE.Vector3(X(q[0]), y, Z(q[1]));
  });
  var curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  var segs = Math.max(240, (n-1)*28), rad = 12;
  var base = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, rad, false), M.lineOn);
  var hi = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius*1.18, rad, false), M.lineOn);
  base.castShadow = true; hi.visible = false;
  scene.add(base); scene.add(hi);
  var sphG = new THREE.SphereGeometry(radius, 16, 12), sphH = new THREE.SphereGeometry(radius*1.18, 16, 12);
  function cap(g){ var m = new THREE.Mesh(g, M.lineOn); m.castShadow = true; scene.add(m); return m; }
  var div = 2000, lens = curve.getLengths(div), total = lens[div];
  var L = {base:base, hi:hi, curve:curve, N:segs, rad:rad, marks:{start:0, end:segs}, anim:null,
           c0:cap(sphG), c1:cap(sphG), h0:cap(sphH), h1:cap(sphH)};
  Object.keys(marks).forEach(function(k){ var j = Math.round(marks[k]/(n-1)*div); L.marks[k] = Math.round(lens[j]/total*segs); });
  return L;
}
var capV = new THREE.Vector3();
function placeCap(m, L, k){ L.curve.getPointAt(k/L.N, capV); m.position.copy(capV); }
function setRange(mesh, L, a, b){ mesh.geometry.setDrawRange(a*L.rad*6, (b-a)*L.rad*6); }
function setLine(i){
  var L = LINE; L.anim = null;
  [L.base,L.hi,L.c0,L.c1,L.h0,L.h1].forEach(function(m){ m.visible = false; });
  return;
  var now = performance.now(), r = VIEW.lineSteps[i];
  if (i===0){
    L.base.material = L.c0.material = L.c1.material = M.lineOn;
    L.hi.visible = L.h0.visible = L.h1.visible = false;
    L.anim = {mesh:L.base, a:0, b:L.N, t0:now, dur:2000, c0:L.c0, c1:L.c1};
  } else {
    L.base.material = L.c0.material = L.c1.material = M.lineOff;
    setRange(L.base, L, 0, L.N); placeCap(L.c0,L,0); placeCap(L.c1,L,L.N); L.c0.visible = L.c1.visible = true;
    if (r){
      L.hi.visible = L.h0.visible = L.h1.visible = true;
      L.anim = {mesh:L.hi, a:L.marks[r[0]], b:L.marks[r[1]], t0:now, dur:1100, c0:L.h0, c1:L.h1};
    } else { L.hi.visible = L.h0.visible = L.h1.visible = false; L.anim = null; }
  }
  lineTick(now);
}
function lineTick(now, finish){
  return;
  var L = LINE, an = L && L.anim; if (!an) return;
  var k = (reduce || finish) ? 1 : clamp((now-an.t0)/an.dur, 0, 1), e = easeIO(k);
  var cur = Math.max(an.a+1, Math.round(an.a+(an.b-an.a)*e));
  setRange(an.mesh, L, an.a, cur);
  placeCap(an.c0, L, an.a); placeCap(an.c1, L, cur); an.c0.visible = an.c1.visible = true;
  if (k>=1) L.anim = null;
}
function css(n){ return '#'+n.toString(16).padStart(6,'0'); }
var HIDDEN_IN_COLOR = ['mobileRec','mobileTri'];
function stepItems(s){ return colorMode ? s.items.filter(function(id){ return HIDDEN_IN_COLOR.indexOf(id)<0; }) : s.items; }
function mixHex(a,b,t){
  var r = Math.round(((a>>16)&255)*(1-t)+((b>>16)&255)*t), g = Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t), bl = Math.round((a&255)*(1-t)+(b&255)*t);
  return (r<<16)|(g<<8)|bl;
}
var colorMode = false, zmCache = {};
function zoneMat(hex, base){
  var kind = base===M.body ? 'body' : base===M.dark ? 'dark' : base===M.darkDS ? 'darkDS' : base===M.felt ? 'felt' : base===M.metal ? 'metal' : null;
  if (!kind || hex==null) return null;
  var key = hex+'_'+kind;
  if (!zmCache[key]){
    var c = (kind==='dark' || kind==='darkDS') ? mixHex(hex,0x000000,0.1) : hex;
    zmCache[key] = new THREE.MeshLambertMaterial({color:c, side: kind==='darkDS' ? THREE.DoubleSide : THREE.FrontSide});
  }
  return zmCache[key];
}
function zoneAt(x,z){
  var best = null, ba = 1e9, near = null, bd = 1e9;
  Object.keys(zones).forEach(function(k){
    var r = zones[k].r, a = r.w*r.d, d = Math.hypot(x-r.x, z-r.z);
    if (Math.abs(x-r.x)<=r.w/2 && Math.abs(z-r.z)<=r.d/2 && a<ba){ best = k; ba = a; }
    if (d<bd){ bd = d; near = k; }
  });
  return best || near;
}
function assignZones(){
  var bb = new THREE.Box3(), c = new THREE.Vector3();
  Object.keys(items).forEach(function(id){ items[id].inst.forEach(function(rc){
    var zk = zoneAt(rc.top.x, rc.top.z);
    rc.obj.traverse(function(o){ if (o.isMesh && o.userData.base0) o.userData.zone = zk; });
  }); });
  scene.traverse(function(o){
    if (!o.isMesh || !o.userData.base0 || o.userData.noZone) return;
    o.userData.cs = o.castShadow;
    if (!o.userData.zone){ bb.setFromObject(o).getCenter(c); o.userData.zone = zoneAt(c.x, c.z); o.userData.scenery = true; return; }
    o.userData.zmat = zoneMat(ZC[o.userData.zone], o.userData.base0);
  });
  Object.keys(zones).forEach(function(k){ zones[k].mesh.userData.plateKey = k; });
}
M.ghost = new THREE.MeshLambertMaterial({color:0xffffff, transparent:true, opacity:0.18, depthWrite:false});
M.ghostDS = new THREE.MeshLambertMaterial({color:0xffffff, transparent:true, opacity:0.18, depthWrite:false, side:THREE.DoubleSide});
var focusMode = false;
/* explanatory zone view: everything outside the selected zone fades to a ghost */
function applyFocus(i){
  var s = STEPS[i], on = (focusMode && i>0) ? s.zones : null;
  scene.traverse(function(o){
    if (!o.isMesh || !o.userData.base0 || o.userData.noZone) return;
    var g = !!(on && on.indexOf(o.userData.zone)<0);
    if (g) o.material = o.userData.base0.side===THREE.DoubleSide ? M.ghostDS : M.ghost;
    else if (o.material===M.ghost || o.material===M.ghostDS) o.material = o.userData.base;
    o.castShadow = g ? false : o.userData.cs;
    o.children.forEach(function(ch){ if (ch.isLineSegments) ch.visible = !g; });
  });
}
/* flows */
function pathPts(pts){ return pts.map(function(p){return new THREE.Vector2(X(p[0]),Z(p[1]));}); }
function bez(a,c,b,n){ var o=[]; for (var i=0;i<=n;i++){ var t=i/n, u=1-t; o.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0], u*u*a[1]+2*u*t*c[1]+t*t*b[1]]); } return o; }
function flowMesh(pxPts, dashed){
  var P = pathPts(pxPts), segL = [], cum = [0], total = 0;
  for (var i=1;i<P.length;i++){ var l = P[i].distanceTo(P[i-1]); segL.push(l); total += l; cum.push(total); }
  function at(s){
    s = clamp(s,0,total);
    for (var i=0;i<segL.length;i++){
      if (s<=cum[i+1] || i===segL.length-1){
        var t = segL[i]>0 ? (s-cum[i])/segL[i] : 0;
        return {p:P[i].clone().lerp(P[i+1],t), d:P[i+1].clone().sub(P[i]).normalize()};
      }
    }
  }
  var w = 0.085, hl = 0.34, hw = 0.3, y = 0.03, pos = [];
  function quad(a,b,d){
    var n = new THREE.Vector2(-d.y,d.x).multiplyScalar(w/2);
    var p1=a.clone().add(n), p2=a.clone().sub(n), p3=b.clone().add(n), p4=b.clone().sub(n);
    pos.push(p1.x,y,p1.y, p2.x,y,p2.y, p3.x,y,p3.y, p2.x,y,p2.y, p4.x,y,p4.y, p3.x,y,p3.y);
  }
  var body = total-hl, intervals = [];
  if (dashed){ for (var s=0;s<body;s+=0.42) intervals.push([s,Math.min(s+0.24,body)]); }
  else intervals.push([0,body]);
  intervals.forEach(function(iv){
    var marks = [iv[0]];
    for (var k=1;k<cum.length-1;k++) if (cum[k]>iv[0] && cum[k]<iv[1]) marks.push(cum[k]);
    marks.push(iv[1]);
    for (var m=0;m<marks.length-1;m++) quad(at(marks[m]).p, at(marks[m+1]).p, at((marks[m]+marks[m+1])/2).d);
  });
  var E = at(total), base = at(body);
  var n = new THREE.Vector2(-E.d.y,E.d.x).multiplyScalar(hw/2);
  var b1 = base.p.clone().add(n), b2 = base.p.clone().sub(n);
  pos.push(b1.x,y,b1.y, b2.x,y,b2.y, E.p.x,y,E.p.y);
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  var mat = new THREE.MeshBasicMaterial({color:T.ink, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false});
  var mesh = new THREE.Mesh(g,mat); mesh.renderOrder = 2; scene.add(mesh);
  return {mesh:mesh, mat:mat, dashed:dashed, target:0};
}

/* ================= atelier ================= */
S = 1; OX = 10; OZ = 6;
newScene(16, SMALL ? 2048 : 3072);
(function(){
/* slab + zone plates (coordinates in metres, x west to east, z north to south) */
var slab = R(0,0,20,12);
box(scene, slab.w+0.12, 0.05, slab.d+0.12, slab.x, -0.05, slab.z, {mat:M.floor, paint:false, shadow:false, obj:false});

zones = {};
function plate(id, x0,y0,x1,y1, hatch, lift){
  var r = R(x0,y0,x1,y1);
  var mat = hatch ? new THREE.MeshLambertMaterial({color:0xffffff, map:hatchTex(r.w,r.d)}) : new THREE.MeshLambertMaterial({color:T.floor});
  var m = box(scene, r.w, 0.012, r.d, r.x, lift||0, r.z, {mat:mat, paint:false, shadow:false, line:M.soft, obj:false});
  zones[id] = {mesh:m, mat:mat, hatch:!!hatch, r:r, rect:[x0,y0,x1,y1]};
}
plate('vest',0,0,4,3.5,true);
plate('z1b',4,0,8,3.5);
plate('z1',0,3.5,8,12);
plate('rebut',0,10.2,2,12,true,0.004);
plate('z2',8,0,11.5,12);
plate('office',11.5,0,20,3.5,true);
plate('z3',11.5,3.5,17,12);
plate('z4',17,3.5,20,12);

/* walls: cut walls get a solid ink top (poché) */
var wallMats = [M.body,M.body,M.poche,M.body,M.body,M.body];
function seg(x0,y0,x1,y1,yb,yt,cut){
  var t = 0.12, horiz = (y0===y1);
  var w = horiz ? L(x1-x0)+t : t, d = horiz ? t : L(y1-y0)+t, h = yt-yb;
  var g = new THREE.BoxGeometry(w,h,d);
  var m = new THREE.Mesh(g, cut ? wallMats : M.body);
  m.position.set(X((x0+x1)/2), yb+h/2, Z((y0+y1)/2));
  m.castShadow = true; m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), M.line));
  scene.add(m);
}
function glazing(x0,x1,yPx,yb,yt,div){
  var len = L(x1-x0), cx = X((x0+x1)/2), z = Z(yPx), h = yt-yb;
  var gm = new THREE.Mesh(new THREE.BoxGeometry(len,h,0.012), M.glass);
  gm.position.set(cx,yb+h/2,z); gm.renderOrder = 1; scene.add(gm);
  box(scene,len,0.045,0.06,cx,yb,z,{mat:M.dark,paint:false,obj:false});
  box(scene,len,0.045,0.06,cx,yt-0.045,z,{mat:M.dark,paint:false,obj:false});
  for (var i=0;i<=div;i++) box(scene,0.035,h,0.06,cx-len/2+i*len/div,yb,z,{mat:M.dark,paint:false,obj:false});
}


// exterior: north (staff door + office window), west (loading dock), south (shipping door), east
seg(0,0,1.5,0,0,2.5,true); seg(1.5,0,2.5,0,2.15,2.5,true); seg(2.5,0,15,0,0,2.5,true);
seg(15,0,18.5,0,0,0.95,false); seg(15,0,18.5,0,2.15,2.5,true); glazing(15,18.5,0,0.95,2.15,3);
seg(18.5,0,20,0,0,2.5,true);
seg(0,0,0,7,0,2.5,true); seg(0,7,0,9.5,2.4,2.5,true); seg(0,9.5,0,12,0,2.5,true);
seg(0,12,17.6,12,0,0.9,true); seg(19.6,12,20,12,0,0.9,true);
seg(20,0,20,12,0,0.9,true);
// changing room
seg(4,0,4,3.5,0,1.1,true); seg(0,3.5,2.6,3.5,0,1.1,true);
// dirty / clean partition, with pass-through drying cabinets and a staff door
seg(11.5,0,11.5,4,0,1.1,true); seg(11.5,9.2,11.5,9.6,0,1.1,true); seg(11.5,11.1,11.5,12,0,1.1,true);
// office front with glass partition
seg(11.5,3.5,13.5,3.5,0,1.1,true); seg(13.5,3.5,18,3.5,0,1.0,false); glazing(13.5,18,3.5,1.0,2.15,6);
seg(18,3.5,18.6,3.5,0,1.1,true); seg(19.5,3.5,20,3.5,0,1.1,true);
(function(){
  var x = X(11.5), z0 = 9.6, z1 = 11.1, h = 2.1;
  var pm = new THREE.Mesh(new THREE.PlaneGeometry(z1-z0,h), M.pvc); pm.rotation.y = Math.PI/2; pm.position.set(x,h/2,Z((z0+z1)/2)); pm.renderOrder = 1; scene.add(pm);
  var pts = []; for (var z=z0; z<=z1+1e-6; z+=0.15){ pts.push(new THREE.Vector3(x,0,Z(z)), new THREE.Vector3(x,h,Z(z))); }
  pts.push(new THREE.Vector3(x,h,Z(z0)), new THREE.Vector3(x,h,Z(z1)));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), M.soft));
  box(scene,0.08,0.06,z1-z0,x,h,Z((z0+z1)/2),{mat:M.metal,paint:false});
})();
// loading apron outside the dock door
box(scene,1.6,0.02,3.0,X(-0.8),-0.05,Z(8.25),{mat:M.dark,paint:false,edges:false,shadow:false,obj:false});

/* items */
items = {}; allInst = [];
function inst(id,label,stem){
  if (!items[id]){ var g = new THREE.Group(); scene.add(g); items[id] = {group:g, inst:[]}; }
  var o = new THREE.Group(); items[id].group.add(o);
  var rec = {id:id, obj:o, label:label, stem:stem||30, top:new THREE.Vector3(), box:new THREE.Box3(), dropAt:-1, pulseAt:-1};
  items[id].inst.push(rec); allInst.push(rec); return rec;
}
var rand = rng(11);
var DESK = 0.75;

function chair(x,z,rot){
  var g = new THREE.Group(), o = {mat:M.dark, paint:false};
  roundedBox(g,0.46,0.06,0.46,0,0.42,0,{mat:M.dark,paint:false,radius:0.012,segments:4});
  roundedBox(g,0.44,0.46,0.05,0,0.52,0.22,{mat:M.dark,paint:false,radius:0.01,segments:4});
  box(g,0.04,0.36,0.04,0,0.06,0,o);
  box(g,0.56,0.03,0.05,0,0.02,0,o); box(g,0.05,0.03,0.56,0,0.02,0,o);
  g.position.set(x,0,z); g.rotation.y = rot; scene.add(g);
}
// desk: black top, grey T-legs, felt screens on the given sides
function desk(p,r,panels,topMat){
  roundedBox(p,r.w,0.03,r.d,r.x,DESK-0.03,r.z,{mat:topMat||M.dark,radius:0.005,segments:3});
  var alongX = r.w>=r.d;
  [-1,1].forEach(function(s){
    if (alongX){
      var x = r.x+s*(r.w/2-0.08);
      box(p,0.05,DESK-0.03,0.05,x,0,r.z,{mat:M.metal});
      box(p,0.06,0.03,r.d-0.06,x,0,r.z,{mat:M.metal});
      [-1,1].forEach(function(end){roundedBox(p,0.068,0.034,0.064,x,0,r.z+end*(r.d/2-0.062),{mat:M.rubber,radius:0.006,segments:3,paint:false});});
      box(p,0.05,0.04,r.d-0.1,x,DESK-0.07,r.z,{mat:M.metal});
    } else {
      var z = r.z+s*(r.d/2-0.08);
      box(p,0.05,DESK-0.03,0.05,r.x,0,z,{mat:M.metal});
      box(p,r.w-0.06,0.03,0.06,r.x,0,z,{mat:M.metal});
      [-1,1].forEach(function(end){roundedBox(p,0.064,0.034,0.068,r.x+end*(r.w/2-0.062),0,z,{mat:M.rubber,radius:0.006,segments:3,paint:false});});
      box(p,r.w-0.1,0.04,0.05,r.x,DESK-0.07,z,{mat:M.metal});
    }
  });
  (panels||'').split('').forEach(function(sd){
    var t = 0.025, h = 0.42;
    if (sd==='n') roundedBox(p,r.w-0.04,h,t,r.x,DESK,r.z-r.d/2+t,{mat:M.felt,radius:0.005,segments:3});
    if (sd==='s') roundedBox(p,r.w-0.04,h,t,r.x,DESK,r.z+r.d/2-t,{mat:M.felt,radius:0.005,segments:3});
    if (sd==='w') roundedBox(p,t,h,r.d-0.04,r.x-r.w/2+t,DESK,r.z,{mat:M.felt,radius:0.005,segments:3});
    if (sd==='e') roundedBox(p,t,h,r.d-0.04,r.x+r.w/2-t,DESK,r.z,{mat:M.felt,radius:0.005,segments:3});
  });
}
// boltless rack with black uprights, filled with big garden bags
function rackBags(p,r){
  var alongX = r.w>r.d, len = alongX?r.w:r.d, dep = alongX?r.d:r.w;
  var levels = [0.08,0.72,1.36,2.0], ps = 0.035, n = Math.max(2,Math.round(len/1.1)+1);
  for (var i=0;i<n;i++){
    var a = -len/2+ps/2+i*(len-ps)/(n-1);
    [-1,1].forEach(function(s){ var b = s*(dep/2-ps/2);
      if (alongX) roundedBox(p,ps,2.02,ps,r.x+a,0,r.z+b,{mat:M.dark,radius:0.004,segments:2}); else roundedBox(p,ps,2.02,ps,r.x+b,0,r.z+a,{mat:M.dark,radius:0.004,segments:2}); });
  }
  levels.forEach(function(y,k){
    if (alongX) roundedBox(p,len,0.02,dep,r.x,y,r.z,{mat:M.dark,radius:0.003,segments:2}); else roundedBox(p,dep,0.02,len,r.x,y,r.z,{mat:M.dark,radius:0.003,segments:2});
    var nb = Math.floor(len/0.46);
    for (var j=0;j<nb;j++){
      if (rand()<(k===3?0.55:0.12)) continue;
      var c = -len/2+(j+0.5)*len/nb, s = 0.9+rand()*0.2, h = (k===3?0.36:0.5)*(0.85+rand()*0.2);
      var jx = (rand()-.5)*0.05;
      if (alongX) cyl(p,0.19*s,0.21*s,h,r.x+c+jx,y+0.02,r.z,{seg:14,detail:1});
      else cyl(p,0.19*s,0.21*s,h,r.x,y+0.02,r.z+c+jx,{seg:14,detail:1});
    }
  });
}
// galvanized rack with cardboard boxes (or black bins)
function rackBoxes(p,r,bins){
  var len = r.w, dep = r.d, levels = [0.1,0.62,1.14,1.66], ps = 0.035, n = 3;
  for (var i=0;i<n;i++){
    var a = -len/2+ps/2+i*(len-ps)/(n-1);
    [-1,1].forEach(function(s){ roundedBox(p,ps,1.68,ps,r.x+a,0,r.z+s*(dep/2-ps/2),{mat:M.metal,radius:0.004,segments:2}); });
  }
  levels.forEach(function(y,k){
    roundedBox(p,len,0.02,dep,r.x,y,r.z,{mat:M.metal,radius:0.003,segments:2});
    var x = r.x-len/2+0.03;
    while (x < r.x+len/2-0.32){
      var w = bins ? 0.52 : 0.3+rand()*0.2, h = bins ? 0.28 : 0.24+rand()*0.18, stack = (k===3 && !bins) ? 1+Math.floor(rand()*2) : 1;
      if (rand()>0.1){
        var yy = y+0.02;
        for (var s=0;s<stack;s++){ var hh = h*(0.85+rand()*0.3), dd=dep-0.06-rand()*0.06; storageBox(p,w-0.03,hh,dd,x+w/2,yy,r.z,bins); yy += hh; }
      }
      x += w;
    }
  });
}
// stainless sink on legs with an under-shelf
function sink(p,r,tap){
  var h0 = 0.62;
  basin(p,r.w,0.28,r.d,r.x,h0,r.z);
  [-1,1].forEach(function(side){
    roundedBox(p,r.w-0.1,0.004,0.025,r.x,0.9,r.z+side*(r.d/2-0.0625),{mat:M.metal,radius:0.0008,edges:false,shadow:false});
    roundedBox(p,0.025,0.004,r.d-0.15,r.x+side*(r.w/2-0.0625),0.9,r.z,{mat:M.metal,radius:0.0008,edges:false,shadow:false});
  });
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){ var lx=r.x+sx*(r.w/2-0.04), lz=r.z+sz*(r.d/2-0.04); box(p,0.035,h0,0.035,lx,0,lz,{mat:M.metal}); roundedBox(p,0.047,0.032,0.047,lx,0,lz,{mat:M.rubber,radius:0.005,segments:2,paint:false}); });});
  box(p,r.w-0.06,0.02,r.d-0.06,r.x,0.14,r.z,{mat:M.body});
  var tx = r.x, tz = r.z, dx = 0, dz = 0;
  if (tap==='w'){ tx = r.x-r.w/2+0.05; dx = 1; }
  if (tap==='s'){ tz = r.z+r.d/2-0.05; dz = -1; }
  if (tap==='n'){ tz = r.z-r.d/2+0.05; dz = 1; }
  cyl(p,0.015,0.015,0.315,tx,0.9,tz,{mat:M.metal,seg:24});
  cyl(p,0.015,0.015,dx||dz?0.16:0.03,tx+dx*0.07,1.215,tz+dz*0.07,{mat:M.metal,seg:24,center:true,rz:dx?Math.PI/2:0,rx:dz?Math.PI/2:0});
  cyl(p,0.014,0.014,0.045,tx+dx*0.13,1.17,tz+dz*0.13,{mat:M.metal,seg:24});
}
function hamper(p0,x,z){
  var p = new THREE.Group(); p0.add(p); p.userData.clutter = true;
  cyl(p,0.24,0.24,0.6,x,0.14,z,{open:true,mat:M.darkDS,seg:20});
  torus(p,0.25,0.012,x,0.76,z,{mat:M.metal});
  torus(p,0.25,0.012,x,0.12,z,{mat:M.metal});
  [0,1,2,3].forEach(function(k){ var a = k*Math.PI/2+Math.PI/4; box(p,0.02,0.72,0.02,x+Math.cos(a)*0.25,0.05,z+Math.sin(a)*0.25,{mat:M.metal}); cyl(p,0.025,0.025,0.03,x+Math.cos(a)*0.25,0.0,z+Math.sin(a)*0.25,{mat:M.dark,rz:Math.PI/2,center:true}); });
}
function wagon(p0,r){
  var p = new THREE.Group(); p0.add(p); p.userData.clutter = true;
  roundedBox(p,r.w,0.38,r.d,r.x,0.2,r.z,{mat:M.dark,radius:0.025,segments:4});
  [-1,1].forEach(function(side){ roundedBox(p,r.w,0.018,0.025,r.x,0.562,r.z+side*(r.d/2-0.0125),{mat:M.metal,radius:0.003}); });
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){ cyl(p,0.09,0.09,0.05,r.x+sx*(r.w/2-0.1),0.09,r.z+sz*(r.d/2+0.02),{mat:M.dark,rx:Math.PI/2,center:true,seg:24}); });});
  box(p,0.03,0.03,0.5,r.x-r.w/2-0.01,0.3,r.z,{mat:M.metal,ry:0.6});
  for (var i=0;i<3;i++) cyl(p,0.16,0.2,0.3,r.x-r.w/3+i*r.w/3,0.55,r.z,{mat:M.dark,seg:10});
}
function wireRack(p,r,h,levels){
  var ps = 0.02;
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){ box(p,ps,h,ps,r.x+sx*(r.w/2-ps),0,r.z+sz*(r.d/2-ps),{mat:M.metal}); });});
  for (var k=0;k<levels;k++){
    var y = 0.08+k*(h-0.1)/(levels-1);
    box(p,r.w,0.012,0.012,r.x,y,r.z-r.d/2+0.01,{mat:M.metal}); box(p,r.w,0.012,0.012,r.x,y,r.z+r.d/2-0.01,{mat:M.metal});
    for (var c=0;c<=6;c++) box(p,0.008,0.008,r.d,r.x-r.w/2+c*r.w/6,y,r.z,{mat:M.metal,edges:false});
    if (k<levels-1 && rand()>0.3) roundedBox(p,0.34,0.07,r.d-0.1,r.x+(rand()-.5)*(r.w-0.4),y+0.012,r.z,{mat:M.dark,detail:2,radius:0.012,segments:3});
  }
}



function chest(p,cx,cz){
  var w = 1.34, d = 0.78, h = 0.78;
  roundedBox(p,w,h,d,cx,0,cz,{mat:M.dark,radius:0.016,segments:3});
  roundedBox(p,w+0.04,0.035,d+0.04,cx,h,cz,{mat:M.dark,radius:0.006});
  [-1,1].forEach(function(side){roundedBox(p,0.17,0.027,0.021,cx+side*w*0.28,0.64,cz-d/2-0.008,{mat:M.metal,radius:0.004,paint:false});});
  for (var i=0;i<11;i++) box(p,0.025,0.012,d+0.02,cx-w/2+0.08+i*(w-0.16)/10,h+0.035,cz,{mat:M.dark});
}
function washer(p,r){
  roundedBox(p,r.w,0.85,r.d,r.x,0,r.z,{radius:0.021,segments:4});
  cyl(p,0.2,0.2,0.03,r.x,0.42,r.z-r.d/2-0.012,{rx:Math.PI/2,center:true,mat:M.metal,seg:32});
  cyl(p,0.159,0.159,0.003,r.x,0.42,r.z-r.d/2-0.025,{rx:Math.PI/2,center:true,mat:M.screen,seg:32,edges:false,paint:false});
  roundedBox(p,r.w-0.06,0.07,0.02,r.x,0.74,r.z-r.d/2-0.01,{mat:M.dark,paint:false,radius:0.004});
  cyl(p,0.024,0.024,0.006,r.x+r.w*0.24,0.775,r.z-r.d/2-0.024,{mat:M.metal,paint:false,seg:24,rx:Math.PI/2,center:true});
  roundedBox(p,0.13,0.026,0.003,r.x-r.w*0.2,0.761,r.z-r.d/2-0.022,{mat:M.screen,paint:false,radius:0.0006,edges:false});
}
function steelTable(p,r){
  roundedBox(p,r.w,0.04,r.d,r.x,0.86,r.z,{radius:0.007,segments:3});
  [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){ var lx=r.x+sx*(r.w/2-0.05), lz=r.z+sz*(r.d/2-0.05); box(p,0.035,0.86,0.035,lx,0,lz,{mat:M.metal}); roundedBox(p,0.047,0.032,0.047,lx,0,lz,{mat:M.rubber,radius:0.005,segments:2,paint:false}); });});
  roundedBox(p,r.w-0.08,0.02,r.d-0.08,r.x,0.16,r.z,{radius:0.003,segments:2});
}
function throughCabinet(p,z0,z1){
  var zc = Z((z0+z1)/2), len = z1-z0-0.03, x = X(11.5);
  roundedBox(p,0.72,1.95,len,x,0,zc,{radius:0.018,segments:3});
  [-1,1].forEach(function(s){
    roundedBox(p,0.015,1.78,len/2-0.04,x+s*0.368,0.1,zc-len/4,{mat:M.dark,radius:0.003,segments:3});
    roundedBox(p,0.015,0.16,0.022,x+s*0.368,0.92,zc-0.055,{mat:M.metal,radius:0.003,paint:false});
    roundedBox(p,0.015,1.78,len/2-0.04,x+s*0.368,0.1,zc+len/4,{mat:M.dark,radius:0.003,segments:3});
    roundedBox(p,0.015,0.16,0.022,x+s*0.368,0.92,zc+0.055,{mat:M.metal,radius:0.003,paint:false});
  });
}
function ironing(p,x,z){
  var board=roundedBox(p,0.34,0.95,0.03,0,0,0,{radius:0.004,cornerRadius:0.13,segments:4,mat:M.body});
  board.position.set(x,0.855,z); board.rotation.x=-Math.PI/2;
  box(p,0.03,0.84,0.03,x,0,z-0.22,{mat:M.metal}); box(p,0.03,0.84,0.03,x,0,z+0.22,{mat:M.metal});
  box(p,0.3,0.02,0.03,x,0,z-0.3,{mat:M.metal}); box(p,0.3,0.02,0.03,x,0,z+0.3,{mat:M.metal});
  roundedBox(p,0.12,0.1,0.24,x,0.87,z-0.26,{mat:M.dark,radius:0.018,segments:4});
  roundedBox(p,0.072,0.016,0.13,x,0.951,z-0.26,{mat:M.felt,radius:0.003,paint:false});
}
function lamp(p,x,z){
  cyl(p,0.07,0.07,0.03,x,DESK,z,{seg:28,mat:M.dark});
  roundedBox(p,0.02,0.45,0.02,x,DESK+0.03,z,{mat:M.metal,radius:0.004});
  roundedBox(p,0.3,0.02,0.02,x+0.14,DESK+0.46,z,{mat:M.metal,radius:0.004});
  cyl(p,0.023,0.023,0.018,x,DESK+0.45,z,{mat:M.dark,seg:24,rx:Math.PI/2,center:true});
  cyl(p,0.09,0.09,0.035,x+0.29,DESK+0.42,z,{seg:32});
  cyl(p,0.069,0.069,0.005,x+0.29,DESK+0.422,z,{seg:32,mat:M.glass,edges:false,paint:false});
  torus(p,0.078,0.011,x+0.29,DESK+0.438,z,{mat:M.metal,paint:false});
}
function rackBoxesZ(p,x0,z0,x1,z1,bins){
  var g = new THREE.Group(); g.position.set(X((x0+x1)/2),0,Z((z0+z1)/2)); g.rotation.y = Math.PI/2; p.add(g);
  rackBoxes(g,{x:0,z:0,w:z1-z0,d:x1-x0},bins);
}
function lockers(p,x0,z0,x1,z1){
  var alongX = (x1-x0)>(z1-z0), len = alongX?x1-x0:z1-z0, n = Math.round(len/0.4), m = len/n;
  for (var i=0;i<n;i++){
    if (alongX) box(p,m-0.01,1.8,z1-z0,X(x0+m*(i+0.5)),0,Z((z0+z1)/2),{paint:false});
    else box(p,x1-x0,1.8,m-0.01,X((x0+x1)/2),0,Z(z0+m*(i+0.5)),{paint:false});
  }
}
function presse(p,x,z){ pressModel(p,x,DESK,z); }
function imprimante(p,x,z){ printerModel(p,x,DESK,z,false); }
function couture(p,x,z){ sewingModel(p,x,DESK,z); }
function aspirateur(p,x,z){
  cyl(p,0.09,0.09,0.3,x,DESK+0.09,z,{rx:Math.PI/2,center:true,seg:20});
  var sph = new THREE.Mesh(new THREE.SphereGeometry(0.095,16,10,0,Math.PI*2,0,Math.PI/2), M.body);
  sph.rotation.x = -Math.PI/2; sph.position.set(x,DESK+0.09,z-0.15); finish(p,sph,sph.geometry,{edges:false});
  torus(p,0.2,0.016,x,DESK+0.02,z+0.02,{mat:M.metal});
}
function soudeuse(p,x,z){
  roundedBox(p,0.14,0.07,0.38,x,DESK,z,{radius:0.015,segments:4});
  box(p,0.07,0.004,0.24,x+0.02,DESK+0.07,z,{mat:M.dark,paint:false,shadow:false});
}

var rec, r;
/* Zone 1: reception */
rec = inst('door','Entrée des collectes',60);
box(rec.obj,0.1,0.5,2.5,X(0.16),1.9,Z(8.25),{mat:M.body});
box(rec.obj,0.06,2.4,0.06,X(0.12),0,Z(7.04),{mat:M.metal}); box(rec.obj,0.06,2.4,0.06,X(0.12),0,Z(9.46),{mat:M.metal});
rec = inst('receptionTable','Table de réception'); desk(rec.obj,R(1.0,3.8,3.4,4.5),'',M.body);
box(rec.obj,0.35,0.06,0.35,X(1.5),DESK,Z(4.15),{mat:M.dark});
[[0.92,5.39],[0.92,6.34],[3.07,11.0]].forEach(function(c){ rec = inst('coffres','Stockage sale'); chest(rec.obj,X(c[0]),Z(c[1])); });
rec = inst('mobileRec','Bac roulant'); hamper(rec.obj,X(2.9),Z(5.6));
rec = inst('mobileRec','Bac roulant'); hamper(rec.obj,X(3.2),Z(9.5));

/* Zone 1: sorting */
[[4.6,5.0,6.0,5.7,'n'],[6.3,5.0,7.7,5.7,'n'],[4.6,8.3,6.0,9.0,'s'],[6.3,8.3,7.7,9.0,'s']].forEach(function(a,i){
  rec = inst('tablesTri','Poste de tri'); desk(rec.obj,R(a[0],a[1],a[2],a[3]),a[4]);
});
chair(X(5.3),Z(6.15),0); chair(X(7.0),Z(6.15),0); chair(X(5.3),Z(7.85),Math.PI); chair(X(7.0),Z(7.85),Math.PI);
rec = inst('stockTrie','Stock en attente'); rackBags(rec.obj,R(4.3,0.2,7.7,0.65));
rec = inst('stockTrie','Stock en attente',60); rackBags(rec.obj,R(4.3,2.6,7.7,3.05));
rec = inst('mobileTri','Bac roulant'); hamper(rec.obj,X(4.2),Z(9.7));
rec = inst('mobileTri','Chariot pliant'); wagon(rec.obj,R(6.4,9.8,7.3,10.3));
rec = inst('rebut','Rebut');
[[0.7,10.75],[0.7,11.4],[1.5,11.4]].forEach(function(c){ roundedBox(rec.obj,0.55,0.9,0.5,X(c[0]),0,Z(c[1]),{radius:0.024,segments:4}); roundedBox(rec.obj,0.59,0.05,0.54,X(c[0]),0.9,Z(c[1]),{mat:M.dark,radius:0.009}); });

/* Zone 2: compact washing area, fully equipped */
[[8.1,8.92],[8.94,9.76],[9.78,10.6],[10.62,11.38]].forEach(function(a,i){ rec = inst('eviers','Poste de lavage',i%2?60:30); sink(rec.obj,R(a[0],0.15,a[1],0.8),'n'); });
rec = inst('ballon','Équipement de lavage'); cyl(rec.obj,0.26,0.26,1.5,X(8.4),0.25,Z(1.3),{seg:24});
rec = inst('trempage','Équipement de lavage'); steelTable(rec.obj,R(8.9,1.5,10.5,2.2));
[9.18,9.7,10.22].forEach(function(x){ basin(rec.obj,0.46,0.22,0.56,X(x),0.9,Z(1.85)); });
rec = inst('egouttoirs','Équipement de lavage'); wireRack(rec.obj,R(10.85,1.1,11.35,2.4),1.6,5);
rec = inst('egouttoirs','Équipement de lavage',60); wireRack(rec.obj,R(10.85,2.5,11.35,3.8),1.6,5);
rec = inst('prep','Table de préparation'); steelTable(rec.obj,R(8.7,8.3,10.7,9.1));
[[8.2,8.9],[9.0,9.7]].forEach(function(a,i){
  rec = inst('laveLinge','Équipement de lavage',i?60:30); var q = R(a[0],11.2,a[1],11.9);
  washer(rec.obj,q);
  roundedBox(rec.obj,q.w,0.8,q.d,q.x,0.86,q.z,{radius:0.021,segments:4});
  roundedBox(rec.obj,q.w-0.06,0.055,0.02,q.x,1.56,q.z-q.d/2-0.01,{mat:M.dark,radius:0.004,paint:false});
  cyl(rec.obj,0.19,0.19,0.03,q.x,1.26,q.z-q.d/2-0.012,{rx:Math.PI/2,center:true,mat:M.metal,seg:32});
  cyl(rec.obj,0.15,0.15,0.003,q.x,1.26,q.z-q.d/2-0.025,{rx:Math.PI/2,center:true,mat:M.screen,seg:32,edges:false,paint:false});
});
rec = inst('produits','Rangement'); rackBoxes(rec.obj,R(9.9,11.35,11.35,11.9),true);
hamper(scene,X(8.6),Z(4.6)); hamper(scene,X(9.25),Z(4.6));
wagon(scene,R(9.8,6.6,10.7,7.1));

/* Drying: pass-through cabinets in the partition */
[[4.0,5.3],[5.3,6.6],[6.6,7.9],[7.9,9.2]].forEach(function(a){ rec = inst('sechante','Séchage'); throughCabinet(rec.obj,a[0],a[1]); });

/* Zone 3: reconditioning island */
[[4.3,5.7],[5.8,7.2],[7.3,8.7]].forEach(function(a,i){
  rec = inst('tablesRecond','Poste de reconditionnement',30); desk(rec.obj,R(13.0,a[0],13.7,a[1]),'e');
  rec = inst('tablesRecond','Poste de reconditionnement',80); desk(rec.obj,R(13.7,a[0],14.4,a[1]),'');
  var cz = (a[0]+a[1])/2; chair(X(12.65),Z(cz),-Math.PI/2); chair(X(14.75),Z(cz),Math.PI/2);
});
rec = inst('equipRecond','Rangement et outillage'); rackBoxesZ(rec.obj,16.35,4.0,16.95,6.2,true);
rec = inst('equipRecond','Rangement et outillage'); wireRack(rec.obj,R(16.4,6.4,16.9,7.8),1.8,5);
rec = inst('equipRecond','Rangement et outillage'); ironing(rec.obj,X(16.65),Z(8.65));

/* Zone 3: control, labelling, packing line */
rec = inst('controle','Contrôle'); desk(rec.obj,R(11.9,11.15,13.4,11.85),'s'); lamp(rec.obj,X(12.3),Z(11.5));
rec = inst('etiquetage','Étiquetage',60); desk(rec.obj,R(13.5,11.15,15.0,11.85),'s');
rec = inst('emballage','Emballage'); desk(rec.obj,R(15.1,11.15,16.9,11.85),'s');
chair(X(12.65),Z(10.6),Math.PI); chair(X(14.25),Z(10.6),Math.PI); chair(X(16.0),Z(10.6),Math.PI);

/* Machines (generic) */
rec = inst('couture','Petit équipement',40); couture(rec.obj,X(13.35),Z(5.0));
rec = inst('aspirateur','Petit équipement',40); aspirateur(rec.obj,X(14.05),Z(6.5));
rec = inst('presse','Petit équipement',40); presse(rec.obj,X(13.95),Z(11.4));
rec = inst('imprimante','Petit équipement',95); imprimante(rec.obj,X(14.5),Z(11.45));
rec = inst('soudeuse','Petit équipement',40); soudeuse(rec.obj,X(16.0),Z(11.45));

/* Zone 4: clean storage and shipping */
rec = inst('rayonnages','Stock propre'); rackBoxesZ(rec.obj,17.25,4.0,17.85,8.6,false);
rec = inst('rayonnages','Stock propre',60); rackBoxesZ(rec.obj,19.35,4.0,19.95,8.6,true);
rec = inst('expedition','Préparation des envois'); desk(rec.obj,R(17.3,10.9,18.3,11.8),'',M.body);
rec = inst('expedition','Préparation des envois',60); (function(p){
  var x = X(19.3), z = Z(10.9);
  box(p,1.0,0.14,1.2,x,0,z,{mat:M.metal});
  for (var i=0;i<2;i++) for (var j=0;j<3;j++) for (var k=0;k<2;k++) storageBox(p,0.48,0.3,0.38,x-0.25+i*0.5,0.14+k*0.3,z-0.4+j*0.4,false);
})(rec.obj);
rec = inst('porteExp','Sortie des envois');
box(rec.obj,0.08,2.2,0.12,X(17.6),0,Z(12)); box(rec.obj,0.08,2.2,0.12,X(19.6),0,Z(12)); box(rec.obj,2.08,0.12,0.12,X(18.6),2.2,Z(12));

/* office and changing room (scenery) */
(function(){
  var o = {mat:M.dark, paint:false};
  desk(scene,R(14.2,1.0,15.6,1.7),'s'); desk(scene,R(15.6,1.0,17.0,1.7),'s');
  desk(scene,R(14.2,1.7,15.6,2.4),''); desk(scene,R(15.6,1.7,17.0,2.4),'');
  chair(X(14.9),Z(0.55),Math.PI); chair(X(16.3),Z(0.55),Math.PI); chair(X(14.9),Z(2.85),0); chair(X(16.3),Z(2.85),0);
  box(scene,1.2,0.03,1.3,X(18.4),0.72,Z(1.75),{paint:false});
  cyl(scene,0.05,0.05,0.72,X(18.4),0,Z(1.75),{paint:false,mat:M.metal});
  chair(X(17.55),Z(1.75),-Math.PI/2); chair(X(19.25),Z(1.75),Math.PI/2);
  box(scene,0.45,1.9,0.9,X(19.7),0,Z(0.6)+0.1,o); box(scene,0.45,1.9,0.9,X(19.7),0,Z(2.5),o);
  box(scene,0.02,0.9,1.6,X(11.58),1.0,Z(1.75),{paint:false});
  lockers(scene,0.12,0.12,0.6,3.2); lockers(scene,2.6,0.12,3.9,0.6);
  box(scene,1.6,0.42,0.38,X(2.3),0,Z(2.1),{paint:false});
})();
})();
scene.updateMatrixWorld(true);
allInst.forEach(function(rc){
  rc.box.setFromObject(rc.obj);
  rc.top.set((rc.box.min.x+rc.box.max.x)/2, rc.box.max.y, (rc.box.min.z+rc.box.max.z)/2);
});
LINE = buildLine([
  [0.3,8.25], {mark:'m0'}, [1.5,8.2], {curl:[2.4,8.1,0,0.75,1]}, [3.5,7.4], [4.3,7.0], {mark:'m1'},
  {curl:[5.6,7.0,0,0.7,-1]}, [7.2,7.0], [8.3,6.9], {mark:'m2'},
  [9.2,6.55], {curl:[9.9,6.2,-25,0.75,1]}, [10.7,5.95], [11.5,5.95], {mark:'m3'}, [12.3,5.95], {mark:'m4'},
  [12.95,5.1], {curl:[13.7,4.9,0,0.6,-1]}, [14.9,5.2], [15.4,6.6], [15.0,8.3], [13.9,9.2], {mark:'m5'},
  [13.3,9.42], [12.9,9.45], [12.58,9.58], [12.45,9.9], [12.58,10.22], [12.9,10.35], [13.5,10.32], [14.3,10.18], [16.6,10.05], {mark:'m6'},
  [17.8,9.55], [18.55,8.6], [18.6,6.5], [18.6,5.0]
], 0.09, 1.5, 0.12);
/* steps */
ZC = {z1:0xDDEBD2, z1b:0xDDEBD2, z2:0xC8DFB6, z3:0xB0D196, z4:0x96C277, rebut:0xE4E1DA, office:0xECEFEC, vest:0xECEFEC};
ZONESTEP = {z1:1, z1b:2, rebut:2, z2:3, z3:5, z4:7};
STEPS = [
  {num:'0', title:'Notre atelier',
   lead:"Un atelier organisé en marche en avant : les attelles entrent côté sale et ressortent côté propre, sans jamais revenir en arrière.",
   bullets:["Quatre zones qui suivent le parcours d’une attelle, de la réception à l’expédition.","Zone sale et zone propre séparées physiquement.","Entrée des collectes et sortie des envois distinctes."],
   partsLabel:'Choisir une zone pour la voir en détail',
   zoneChips:[['1','Réception et tri',1,'z1'],['2','Lavage et séchage',3,'z2'],['3','Reconditionnement',5,'z3'],['4','Stockage et expédition',7,'z4']],
   items:[], zones:[], flows:['A','B','C','D','E','F','G','H','R1','R2']},
  {num:'1', title:'Réception, zone 1',
   lead:"Les collectes arrivent côté sale, sans croiser les produits propres.",
   bullets:["Chaque lot est pointé dès son arrivée.","Les attelles attendent le tri dans des contenants dédiés."],
   chips:[['door','Entrée des collectes'],['receptionTable','Réception'],['coffres','Stockage sale']],
   items:['door','receptionTable','coffres','mobileRec'], zones:['z1'], flows:['A','B']},
  {num:'2', title:'Tri, zone 1',
   lead:"Chaque attelle est examinée une à une : seules celles qui répondent à nos critères poursuivent le parcours.",
   bullets:["Des postes de tri dédiés.","Les attelles écartées sortent sans traverser l’atelier."],
   chips:[['tablesTri','Postes de tri'],['stockTrie','Stock en attente'],['rebut','Rebut']],
   items:['tablesTri','stockTrie','mobileTri','rebut'], zones:['z1','z1b','rebut'], flows:['B','C','R1','R2']},
  {num:'3', title:'Lavage, zone 2',
   lead:"Nettoyage et désinfection selon un protocole adapté aux matériaux de chaque attelle.",
   bullets:["Les postes de lavage sont regroupés côté sale.","Produits et préparation à portée de main."],
   chips:[['eviers','Postes de lavage'],['prep','Préparation']],
   items:['eviers','trempage','egouttoirs','laveLinge','produits','prep','ballon'], zones:['z2'], flows:['C','D']},
  {num:'4', title:'Séchage',
   lead:"Le séchage fait le lien entre les deux zones : les attelles sont chargées côté sale et récupérées côté propre.",
   bullets:["Une cloison sépare physiquement zone sale et zone propre."],
   chips:[['sechante','Séchage']], items:['sechante'], zones:['z2','z3'], flows:['D','E']},
  {num:'5', title:'Reconditionnement, zone 3',
   lead:"Des postes de travail dédiés, où chaque attelle est inspectée et remise en état à la main.",
   bullets:["Pièces de rechange et outillage à portée de main.","Sortie directe vers le contrôle."],
   chips:[['tablesRecond','Postes de travail'],['equipRecond','Rangement et outillage']], items:['tablesRecond','equipRecond'], zones:['z3'], flows:['E','F']},
  {num:'6', title:'Contrôle et conditionnement, zone 3',
   lead:"En fin de parcours, chaque attelle est contrôlée, étiquetée puis emballée individuellement.",
   bullets:["Un contrôle final avant toute remise en circulation.","Un numéro unique pour suivre chaque attelle."],
   chips:[['controle','Contrôle'],['etiquetage','Étiquetage'],['emballage','Emballage']], items:['controle','etiquetage','emballage'], zones:['z3'], flows:['F','G']},
  {num:'7', title:'Stockage et expédition, zone 4',
   lead:"Le stock propre est rangé près de la sortie, puis préparé pour l’expédition.",
   bullets:["Le stock propre reste à l’écart de la zone sale.","Les envois sont préparés à part."],
   chips:[['rayonnages','Stock propre'],['expedition','Préparation des envois'],['porteExp','Sortie des envois']], items:['rayonnages','expedition','porteExp'], zones:['z4'], flows:['G','H']}
];
ZONELABELS = [
  {n:'1', t:'Réception et tri', p:[3.9,4.3], z:'z1'},
  {n:'2', t:'Lavage et séchage', p:[9.9,7.7], z:'z2'},
  {n:'3', t:'Reconditionnement', p:[15.6,9.9], z:'z3'},
  {n:'4', t:'Stockage et expédition', p:[18.6,6.4], z:'z4'},
  {n:'', t:'Bureau', p:[18.4,3.0], z:'office'},
  {n:'', t:'Rebut', p:[1.3,10.5], z:'rebut'}
];

assignZones();
VIEWS.atelier = {key:'atelier', scene:scene, grid:grid, zones:zones, items:items, allInst:allInst, line:LINE, lineSteps:{1:['m0','m1'],2:['m1','m2'],3:['m2','m3'],4:['m3','m4'],5:['m4','m5'],6:['m5','m6'],7:['m6','end']}, STEPS:STEPS, ZC:ZC, ZONESTEP:ZONESTEP, ZONELABELS:ZONELABELS, S:S, OX:OX, OZ:OZ, W:20, D:12, mk:10, mbox:'-3 -3 206 126', mcls:'wB', zsw:1.5, fsw:.8, place:'Notre atelier en Île-de-France', sub:'Reconditionnement des attelles'};

/* ================= caméra ================= */
var cam = new THREE.OrthographicCamera(-1,1,1,-1,0.1,300);
var view = {az:Math.PI/4, el:0.64, target:new THREE.Vector3(0,0.4,0), size:14};
var sw = 1, sh = 1, tw = null;
function basis(){
  var f = new THREE.Vector3(-Math.sin(view.az)*Math.cos(view.el), -Math.sin(view.el), -Math.cos(view.az)*Math.cos(view.el));
  var right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0,1,0)).normalize();
  var up = new THREE.Vector3().crossVectors(right, f).normalize();
  return {right:right, up:up};
}
function applyCam(){
  var a = sw/sh, h = view.size;
  cam.left = -h*a/2; cam.right = h*a/2; cam.top = h/2; cam.bottom = -h/2;
  var d = 80, t = view.target;
  cam.position.set(t.x + d*Math.sin(view.az)*Math.cos(view.el), t.y + d*Math.sin(view.el), t.z + d*Math.cos(view.az)*Math.cos(view.el));
  cam.lookAt(t); cam.updateProjectionMatrix();
}
function fit(b3, pad, minSize){
  var c = b3.getCenter(new THREE.Vector3()), B = basis(), ex = 0, ey = 0;
  for (var i=0;i<8;i++){
    var p = new THREE.Vector3(i&1?b3.max.x:b3.min.x, i&2?b3.max.y:b3.min.y, i&4?b3.max.z:b3.min.z).sub(c);
    ex = Math.max(ex, Math.abs(p.dot(B.right))); ey = Math.max(ey, Math.abs(p.dot(B.up)));
  }
  var size = Math.max(2*ey, 2*ex/(sw/sh)) * (pad||1.2);
  return {target:c, size:clamp(size,minSize||3.2,30)};
}
var labelRef = 14;
function labelScale(){ return tw ? 1 : clamp(labelRef/view.size, 0.55, 1); }
function flyTo(f){
  labelRef = f.size;
  if (reduce){ view.target.copy(f.target); view.size = f.size; return; }
  tw = {t0:performance.now(), dur:950, fT:view.target.clone(), tT:f.target, fS:view.size, tS:f.size};
}

/* ================= interaction ================= */
// touch-action: pan-y sur le canvas : un glissé vertical fait défiler la page, un glissé horizontal fait pivoter la maquette.
var ptrs = new Map(), clickStart = null, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', function(e){
  if (e.pointerType==='mouse' && e.button!==0) return;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  clickStart = ptrs.size===1 ? {x:e.clientX, y:e.clientY} : null;
  if (e.pointerType!=='touch'){ try { canvas.setPointerCapture(e.pointerId); } catch(err){} }
  canvas.classList.add('is-drag'); wake();
});
canvas.addEventListener('pointermove', function(e){
  if (!ptrs.has(e.pointerId)) return;
  var prev = ptrs.get(e.pointerId), cur = {x:e.clientX, y:e.clientY};
  if (ptrs.size===1){
    view.az -= (cur.x-prev.x)*0.007;
    if (e.pointerType!=='touch') view.el = clamp(view.el + (cur.y-prev.y)*0.004, 0.3, 1.3);
  }
  ptrs.set(e.pointerId, cur); wake();
});
function pickZone(e){
  var rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX-rect.left)/rect.width*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  ray.setFromCamera(ndc, cam);
  var hits = ray.intersectObjects(scene.children, true);
  for (var i=0;i<hits.length;i++){
    var o = hits[i].object;
    if (!o.isMesh || !o.visible) continue;
    if (o.userData.plateKey) return o.userData.plateKey;
    if (o.userData.base0 && !o.userData.noZone && o.userData.zone) return o.userData.zone;
  }
  return null;
}
function focusZone(zk){
  var st = ZONESTEP[zk];
  if (st==null) return;
  focusMode = true; go(st);
}
function up(e){
  var wasClick = clickStart && ptrs.size===1 && Math.hypot(e.clientX-clickStart.x, e.clientY-clickStart.y) < 5;
  ptrs.delete(e.pointerId); if (!ptrs.size) canvas.classList.remove('is-drag');
  if (e.type!=='pointerup' || !wasClick) return;
  clickStart = null;
  var zk = pickZone(e);
  if (zk && ZONESTEP[zk]!=null) focusZone(zk);
  else if (!zk && focusMode) go(0);
}
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
// La molette fait défiler la page ; le zoom passe par les boutons, Ctrl + molette ou le pincement du pavé tactile.
canvas.addEventListener('wheel', function(e){
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault(); tw = null; view.size = clamp(view.size*Math.exp(e.deltaY*0.0025), 1.5, 60); wake();
}, {passive:false});

/* ================= étiquettes ================= */
var labelsEl = root.querySelector('.ga-labels'), labelList = [], pv = new THREE.Vector3();
function buildLabels(i){
  labelsEl.innerHTML = ''; labelList = [];
  var s = STEPS[i];
  if (!s.items.length){
    ZONELABELS.forEach(function(z){
      var el = document.createElement('div'); el.className = 'ga-co ga-co--zone';
      el.innerHTML = '<div class="ga-tag" style="--zc:'+css(ZC[z.z])+'">'+(z.n?'<span class="ga-tag__n">'+z.n+'</span>':'')+'<span class="ga-tag__t">'+z.t+'</span></div><div class="ga-stem"></div><div class="ga-pin"></div>';
      if (ZONESTEP[z.z]!=null){ el.classList.add('is-link'); el.querySelector('.ga-tag').addEventListener('click', function(){ focusZone(z.z); }); }
      labelsEl.appendChild(el);
      var p = new THREE.Vector3(X(z.p[0]),0.02,Z(z.p[1]));
      labelList.push({el:el, get:function(){ return p; }});
    });
  } else {
    var seen = {};
    s.items.forEach(function(id){
      items[id].inst.forEach(function(rc){
        if (seen[rc.label]) return; seen[rc.label] = true;
        var el = document.createElement('div'); el.className = 'ga-co';
        el.innerHTML = '<div class="ga-tag">'+rc.label+'</div><div class="ga-stem" style="height:'+rc.stem+'px"></div><div class="ga-pin"></div>';
        labelsEl.appendChild(el);
        var p = new THREE.Vector3();
        labelList.push({el:el, get:function(){ p.copy(rc.top); p.y += rc.obj.position.y; return p; }});
      });
    });
  }
}
function placeLabels(){
  var ls = labelScale().toFixed(3);
  labelList.forEach(function(l){
    pv.copy(l.get()).project(cam);
    var ax = (pv.x+1)/2*sw, ay = (1-pv.y)/2*sh;
    l.el.style.transform = 'translate('+ax.toFixed(1)+'px,'+ay.toFixed(1)+'px) translate(-50%,-100%) scale('+ls+')';
  });
}

/* ================= panneau ================= */
var cur = 0, started = false;
var $ = function(sel){ return root.querySelector(sel); };
var P = {num:$('.ga-num'), title:$('.ga-title'), lead:$('.ga-lead'), bullets:$('.ga-bullets'), parts:$('.ga-parts'), chips:$('.ga-chips'),
  count:$('.ga-count'), fill:$('.ga-progress span'), back:$('.ga-back'), next:$('.ga-next'), place:$('.ga-place strong'), sub:$('.ga-place span')};
function paint(i){
  var s = STEPS[i], on = {};
  s.items.forEach(function(id){ on[id] = true; });
  Object.keys(items).forEach(function(id){
    items[id].group.traverse(function(o){
      if (!o.isMesh || !o.userData.paint) return;
      var base = o.userData.base;
      o.material = on[id] ? (base.side===THREE.DoubleSide ? M.greenDS : M.green) : base;
    });
  });
  Object.keys(zones).forEach(function(k){
    var z = zones[k], active = s.zones.indexOf(k)>=0;
    if (i===0) z.mat.color.set(ZC[k]);
    else z.mat.color.set(active ? T.tint : (z.hatch ? 0xffffff : T.floor));
  });
  setLine(i);
  applyFocus(i);
}
function drop(list, spread){
  if (reduce) return;
  var now = performance.now();
  list.forEach(function(rc,k){ rc.dropAt = now + k*spread; });
}
function stepFit(i){
  var s = STEPS[i];
  if (!s.items.length) return fit(new THREE.Box3(new THREE.Vector3(X(0),-0.05,Z(0)), new THREE.Vector3(X(VIEW.W),2.5,Z(VIEW.D))), 1.1);
  var b = new THREE.Box3();
  s.items.forEach(function(id){ items[id].inst.forEach(function(rc){ b.union(rc.box); }); });
  if (s.tight){ b.expandByScalar(0.3); return fit(b, 1.3, 1.9); }
  s.zones.forEach(function(k){ b.union(new THREE.Box3().setFromObject(zones[k].mesh)); });
  b.expandByScalar(0.5);
  return fit(b, 1.3);
}
function currentInst(i){
  var list = [];
  STEPS[i].items.forEach(function(id){ list = list.concat(items[id].inst); });
  return list;
}
function allOrder(){ return allInst.slice().sort(function(a,b){ return (a.top.x+a.top.z)-(b.top.x+b.top.z); }); }
var PIN = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="4.25"/><circle cx="6" cy="6" r="1.25" fill="currentColor" stroke="none"/></svg>';
function chip(html, onClick){
  var b = document.createElement('button'); b.type = 'button'; b.className = 'ga-chip'; b.innerHTML = html;
  b.addEventListener('click', onClick); P.chips.appendChild(b);
}
function go(i, quiet){
  cur = clamp(i,0,STEPS.length-1);
  if (cur===0) focusMode = false;
  var s = STEPS[cur];
  P.num.textContent = s.num;
  P.title.textContent = s.title;
  P.lead.textContent = s.lead;
  P.bullets.innerHTML = '';
  s.bullets.forEach(function(t){ var li = document.createElement('li'); li.textContent = t; P.bullets.appendChild(li); });
  P.bullets.hidden = !s.bullets.length;
  P.chips.innerHTML = '';
  if (s.zoneChips){
    P.parts.textContent = 'Choisir une zone pour la voir en détail';
    s.zoneChips.forEach(function(z){ chip('<b style="background:'+css(ZC[z[3]])+'">'+z[0]+'</b>'+z[1], function(){ focusZone(z[3]); }); });
  } else {
    P.parts.textContent = 'Éléments de l’étape, touchez pour les repérer';
    s.chips.forEach(function(c){
      chip('<b aria-hidden="true">'+PIN+'</b>'+c[1], function(){ var now = performance.now(); items[c[0]].inst.forEach(function(rc,k){ rc.pulseAt = now + k*90; }); wake(); });
    });
  }
  P.count.textContent = cur===0 ? 'Vue d’ensemble' : 'Étape '+cur+' sur '+(STEPS.length-1);
  P.fill.style.transform = 'scaleX('+(cur/(STEPS.length-1)).toFixed(3)+')';
  P.back.disabled = cur===0;
  P.next.textContent = cur===0 ? 'Commencer la visite' : (cur===STEPS.length-1 ? 'Revenir au plan' : 'Étape suivante');
  paint(cur);
  buildLabels(cur);
  if (quiet){ var f = stepFit(cur); tw = null; view.target.copy(f.target); view.size = f.size; labelRef = f.size; }
  else { flyTo(stepFit(cur)); drop(currentInst(cur), 110); }
  wake();
}
P.next.addEventListener('click', function(){ go(cur===STEPS.length-1 ? 0 : cur+1); });
P.back.addEventListener('click', function(){ go(cur-1); });
root.querySelector('[data-ga-replay]').addEventListener('click', function(){
  view.az = Math.PI/4; view.el = 0.64;
  drop(cur===0 ? allOrder() : currentInst(cur), cur===0 ? 45 : 110);
  flyTo(stepFit(cur)); wake();
});
root.querySelectorAll('[data-ga-zoom]').forEach(function(b){
  b.addEventListener('click', function(){ tw = null; view.size = clamp(view.size*(b.getAttribute('data-ga-zoom')==='in' ? 1/1.25 : 1.25), 1.5, 60); wake(); });
});
root.addEventListener('keydown', function(e){
  if (e.key==='Escape' && focusMode){ go(0); return; }
  if (e.key==='ArrowRight' && cur<STEPS.length-1){ e.preventDefault(); go(cur+1); }
  else if (e.key==='ArrowLeft' && cur>0){ e.preventDefault(); go(cur-1); }
});

/* ================= taille et boucle de rendu ================= */
// Rendu à la demande : la boucle s'arrête hors de l'écran et après une seconde sans mouvement.
function resize(){
  sw = Math.max(1, stage.clientWidth); sh = Math.max(1, stage.clientHeight);
  renderer.setSize(sw, sh, false); applyCam();
}
new ResizeObserver(function(){ resize(); if (!tw){ var f = stepFit(cur); view.target.copy(f.target); view.size = f.size; labelRef = f.size; } wake(); }).observe(stage);
var visible = false, running = false, lastActive = 0;
function wake(){ lastActive = performance.now(); if (visible && !running){ running = true; requestAnimationFrame(frame); } }
function frame(now){
  var busy = !!tw || ptrs.size>0;
  if (tw){
    var k = clamp((now-tw.t0)/tw.dur, 0, 1), e = easeIO(k);
    view.target.lerpVectors(tw.fT, tw.tT, e); view.size = tw.fS + (tw.tS-tw.fS)*e;
    if (k>=1) tw = null;
  }
  allInst.forEach(function(rc){
    var y = 0;
    if (rc.dropAt>=0){
      busy = true;
      var t = (now-rc.dropAt)/650;
      if (t<0) y = 1.8; else if (t<1) y = 1.8*(1-easeOut(t)); else rc.dropAt = -1;
    }
    if (rc.pulseAt>=0){
      busy = true;
      var p = (now-rc.pulseAt)/560;
      if (p>=0 && p<1) y += Math.sin(p*Math.PI)*0.35; else if (p>=1) rc.pulseAt = -1;
    }
    rc.obj.position.y = y;
  });
  applyCam();
  renderer.render(scene, cam);
  placeLabels();
  if (busy) lastActive = now;
  if (visible && now-lastActive < 1200) requestAnimationFrame(frame); else running = false;
}

/* ================= atelier ================= */
function useView(key, quiet){
  var v = VIEWS[key]; VIEW = v;
  S = v.S; OX = v.OX; OZ = v.OZ;
  scene = v.scene; grid = v.grid; zones = v.zones; items = v.items; allInst = v.allInst;
  LINE = v.line; STEPS = v.STEPS; ZC = v.ZC; ZONESTEP = v.ZONESTEP; ZONELABELS = v.ZONELABELS;
  P.place.textContent = v.place; P.sub.textContent = v.sub;
  tw = null; cur = 0;
  go(0, true);
  if (!quiet) drop(allOrder(), 30);
}
resize();
useView('atelier', true);
root.classList.add('is-ready');
new IntersectionObserver(function(entries){
  visible = entries[0].isIntersecting;
  if (visible && !started){ started = true; drop(allOrder(), 45); }
  if (visible) wake();
}, {threshold:0.25}).observe(stage);

};
