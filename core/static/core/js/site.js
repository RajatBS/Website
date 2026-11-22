(function(){
/* Shared helpers: the name is drawn inside the hero canvas, so each hero needs to know
   exactly where the (transparent) heading sits. */
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){ return document.getElementById(id); }
function cssVar(el,name){ return getComputedStyle(el).getPropertyValue(name).trim(); }
function measureName(hero,nameEl){
  var r=hero.getBoundingClientRect(), cs=getComputedStyle(nameEl), upper=cs.textTransform==='uppercase';
  var l=1e9,rt=-1e9,t=1e9,b=-1e9;
  var lines=[].map.call(nameEl.querySelectorAll('.ln'),function(el){
    var m=el.querySelector('.bl').getBoundingClientRect(), e=el.getBoundingClientRect();
    l=Math.min(l,e.left); rt=Math.max(rt,e.right); t=Math.min(t,e.top); b=Math.max(b,e.bottom);
    return {text:upper?el.textContent.toUpperCase():el.textContent, x:m.left-r.left, y:m.top-r.top};
  });
  return {
    W:Math.max(1,Math.round(r.width)), H:Math.max(1,Math.round(r.height)),
    lines:lines, stacked:lines.length>1 && Math.abs(lines[0].y-lines[1].y)>4,
    font:cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily,
    spacing:cs.letterSpacing==='normal'?'0px':cs.letterSpacing,
    cx:(l+rt)/2-r.left, cy:(t+b)/2-r.top, left:l-r.left, right:rt-r.left, top:t-r.top, bottom:b-r.top
  };
}
function drawName(ctx,m){
  ctx.font=m.font; ctx.textBaseline='alphabetic';
  if('letterSpacing' in ctx) ctx.letterSpacing=m.spacing;
  for(var i=0;i<m.lines.length;i++) ctx.fillText(m.lines[i].text,m.lines[i].x,m.lines[i].y);
  if('letterSpacing' in ctx) ctx.letterSpacing='0px';
}
function whenFontsReady(nameEl,fn){
  if(!document.fonts) return;
  var cs=getComputedStyle(nameEl);
  if(document.fonts.load) document.fonts.load(cs.fontStyle+' '+cs.fontWeight+' 100px '+cs.fontFamily.split(',')[0]).then(fn,fn);
  if(document.fonts.ready) document.fonts.ready.then(fn);
}
function watch(hero,onResize,onShow,onHide){
  if(window.ResizeObserver) new ResizeObserver(onResize).observe(hero); else window.addEventListener('resize',onResize);
  if(window.IntersectionObserver) new IntersectionObserver(function(en){ if(en[0].isIntersecting) onShow(); else onHide(); }).observe(hero);
  document.addEventListener('visibilitychange',function(){ if(document.hidden) onHide(); else onShow(); });
}

/* Contact form: opens the visitor's own mail app with the message filled in. */
(function contact(){
  var form=$('contact-form'); if(!form) return;
  var status=$('cf-status'), TO=form.getAttribute('data-to');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(form.reportValidity && !form.reportValidity()) return;
    var f=form.elements, name=f.name.value.trim(), email=f.email.value.trim(), msg=f.message.value.trim();
    var href='mailto:'+TO+'?subject='+encodeURIComponent('Message from '+name+' via rajatshetty.com')+
      '&body='+encodeURIComponent(msg+'\n\n'+name+'\n'+email);
    status.textContent='Your mail app should open with this message ready to send. If it does not, write to '+TO+'.';
    try{ window.location.href=href; }catch(_){}
  });
})();

/* =====================================================================
   One scene behind the whole page (three.js): a spacetime sheet with a
   coordinate grid, stars floating over it, and three equal masses
   (G = 1) integrated live with fourth-order Runge-Kutta.
   - First slide: seen from straight above, it is a flat star atlas and
     each mass bends the grid like a weak gravitational lens.
   - Scrolling tilts the camera, and the same sheet turns out to be a
     surface with a gravity well under every mass.
   - Each slide re-inks the scene in its own palette, cut exactly at the
     slide edge.
   GSAP runs the loading screen hand-off and a few quiet reveals. Without
   three.js or WebGL the slides fall back to their flat colours.
   ===================================================================== */
var loader=(function(){
  var root=document.documentElement, fill=$('loader-fill'), pct=$('loader-pct');
  var target=0.12, shown=0, t0=performance.now(), finished=false, cbs=[];
  function finish(){
    if(finished) return; finished=true;
    root.classList.add('loaded');
    setTimeout(function(){ root.classList.remove('loading'); },reduce?0:520);
    cbs.forEach(function(f){ f(); });
  }
  var last=t0;
  function tick(now){
    if(finished) return;
    var dt=Math.min(0.1,(now-last)/1000); last=now;
    shown+=(target-shown)*(1-Math.exp(-dt*9)); if(target-shown<0.01) shown=target;
    if(fill) fill.style.transform='scaleX('+shown.toFixed(3)+')';
    if(pct) pct.textContent=Math.round(shown*100)+'%';
    if(shown>=1 && (reduce || now-t0>650)) return finish();
    requestAnimationFrame(tick);
  }
  if(!root.classList.contains('loading') || !$('loader')) finished=true; else requestAnimationFrame(tick);
  setTimeout(function(){ target=1; },3000);                       // never wait on a slow font or a missing library
  setTimeout(finish,4500);
  var api={ add:function(x){ target=Math.min(1,target+x); }, ready:function(f){ if(finished) f(); else cbs.push(f); } };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ api.add(0.44); },function(){ api.add(0.44); }); else api.add(0.44);
  if(!window.THREE) api.add(0.44);
  return api;
})();

(function spacetime(){
  var THREE=window.THREE, G=window.gsap, ST=window.ScrollTrigger;
  var deck=$('deck'), hero=$('top'), canvas=$('scene'), nameEl=$('name'), footEl=$('hero-foot');
  if(!THREE || !canvas) return;
  var renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }catch(_){ loader.add(0.44); return; }
  if(!renderer || !renderer.getContext()){ loader.add(0.44); return; }
  renderer.autoClear=false;
  document.documentElement.classList.add('gl');
  if(G && ST){ G.registerPlugin(ST); ST.defaults({scroller:deck}); }
  var animate=!!G && !reduce;

  /* ---------------- physics ---------------- */
  var HMAX=1e-3, REC=0.01, SPEED=0.55, EPS2=1e-4, NH=9000, TRACER=420, NP=NH/3;
  var P=new Float64Array(9), V=new Float64Array(9);
  var tp=new Float64Array(9), v2=new Float64Array(9), v3=new Float64Array(9), v4=new Float64Array(9);
  var a1=new Float64Array(9), a2=new Float64Array(9), a3=new Float64Array(9), a4=new Float64Array(9);
  var rec=[new Float32Array(NH*2),new Float32Array(NH*2),new Float32Array(NH*2)];
  var head=0, count=0, recAcc=0, t=0, vis=1, phase='in', awayT=0, oneAwayT=0, pace=1, nPath=0;

  function acc(p,a){
    a.fill(0);
    for(var i=0;i<3;i++){
      for(var j=i+1;j<3;j++){
        var dx=p[j*3]-p[i*3], dy=p[j*3+1]-p[i*3+1];
        var r2=dx*dx+dy*dy+EPS2, inv=1/(r2*Math.sqrt(r2));
        a[i*3]+=dx*inv; a[i*3+1]+=dy*inv; a[j*3]-=dx*inv; a[j*3+1]-=dy*inv;
      }
    }
  }
  function step(h){
    var n;
    acc(P,a1);
    for(n=0;n<9;n++){ tp[n]=P[n]+V[n]*h/2; v2[n]=V[n]+a1[n]*h/2; }
    acc(tp,a2);
    for(n=0;n<9;n++){ tp[n]=P[n]+v2[n]*h/2; v3[n]=V[n]+a2[n]*h/2; }
    acc(tp,a3);
    for(n=0;n<9;n++){ tp[n]=P[n]+v3[n]*h; v4[n]=V[n]+a3[n]*h; }
    acc(tp,a4);
    for(n=0;n<9;n++){
      P[n]+=h/6*(V[n]+2*v2[n]+2*v3[n]+v4[n]);
      V[n]+=h/6*(a1[n]+2*a2[n]+2*a3[n]+a4[n]);
    }
  }
  function minDist(){
    var m=1e9;
    for(var i=0;i<3;i++) for(var j=i+1;j<3;j++){
      var d=Math.hypot(P[j*3]-P[i*3],P[j*3+1]-P[i*3+1]); if(d<m) m=d;
    }
    return m;
  }
  function energy(){
    var ke=0, pe=0, n;
    for(n=0;n<9;n++) ke+=0.5*V[n]*V[n];
    for(var i=0;i<3;i++) for(var j=i+1;j<3;j++){
      var dx=P[j*3]-P[i*3], dy=P[j*3+1]-P[i*3+1]; pe-=1/Math.sqrt(dx*dx+dy*dy+EPS2);
    }
    return ke+pe;
  }
  function potential(x,y){
    var s=0; for(var b=0;b<3;b++){ var dx=x-P[b*3], dy=y-P[b*3+1]; s-=1/Math.sqrt(dx*dx+dy*dy+0.01); } return s;
  }
  function record(){
    for(var b=0;b<3;b++){ rec[b][head*2]=P[b*3]; rec[b][head*2+1]=P[b*3+1]; }
    if(count%3===0 && nPath<NP){
      for(b=0;b<3;b++){ var a=pathAttr[b].array; a[nPath*3]=P[b*3]; a[nPath*3+1]=P[b*3+1]; a[nPath*3+2]=0; pathAttr[b].needsUpdate=true; }
      nPath++;
    }
    head=(head+1)%NH; count++;
  }
  function advance(dts,budget){
    var left=dts, guard=0;
    while(left>1e-10 && guard++<budget){
      var d=minDist(), h=Math.min(HMAX,Math.max(2e-6,0.004*Math.pow(d,1.5)));   // smaller steps in close encounters
      if(h>left) h=left;
      step(h); t+=h; left-=h; recAcc+=h;
      if(recAcc>=REC){ recAcc-=REC; record(); }
    }
  }
  function seed(){
    // three random places anywhere on the first slide, well apart, centre of mass near the middle
    var W=VW, top=70, bot=Math.max(top+120,fadeTop-30), minSep=Math.min(1.1,0.3*Math.min(W,bot-top)/S);
    var p, i, j, ok=false, mx, my, tries=0;
    while(!ok){
      p=[]; ok=true;
      for(i=0;i<3;i++) p.push([((0.07+0.86*Math.random())*W-cx)/S, -((top+(bot-top)*Math.random())-cy)/S]);
      for(i=0;i<3;i++) for(j=i+1;j<3;j++) if(Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1])<minSep) ok=false;
      mx=(p[0][0]+p[1][0]+p[2][0])/3; my=(p[0][1]+p[1][1]+p[2][1])/3;
      if(Math.hypot(mx,my)>0.45 && tries++<400) ok=false;
    }
    // each one circles the middle at a fraction of orbital speed, so they sweep wide arcs
    var dir=Math.random()<0.5?-1:1, v=[], vx=0, vy=0;
    for(i=0;i<3;i++){
      p[i][0]-=mx; p[i][1]-=my;
      var r=Math.max(0.5,Math.hypot(p[i][0],p[i][1])), sp=dir*(0.35+0.25*Math.random())*Math.sqrt(1.2/r);
      v.push([-sp*p[i][1]/r+(Math.random()*2-1)*0.08, sp*p[i][0]/r+(Math.random()*2-1)*0.08]);
      vx+=v[i][0]/3; vy+=v[i][1]/3;
    }
    P.fill(0); V.fill(0);
    for(i=0;i<3;i++){ P[i*3]=p[i][0]; P[i*3+1]=p[i][1]; V[i*3]=v[i][0]-vx; V[i*3+1]=v[i][1]-vy; }
    for(i=0;i<25 && energy()>-0.3;i++) for(j=0;j<9;j++) V[j]*=0.85;      // bound to begin with
    t=0; head=0; count=0; recAcc=0; awayT=0; oneAwayT=0; pace=1; nPath=0;
    record(); advance(0.8,1e9);
  }
  function kick(){
    var d=new Float64Array(9), n, k;
    for(n=0;n<9;n++) d[n]=(n%3===2)?0:(Math.random()*2-1)*0.25;
    for(k=0;k<2;k++){ var mean=(d[k]+d[3+k]+d[6+k])/3; d[k]-=mean; d[3+k]-=mean; d[6+k]-=mean; }
    for(n=0;n<9;n++) V[n]+=d[n];
  }
  function next(){ if(phase!=='out') phase='out'; }

  /* ---------------- scene ---------------- */
  var scene=new THREE.Scene(), FOV=28, camera=new THREE.PerspectiveCamera(FOV,1,0.05,400);
  var RE=0.2, DEPTH=0.4, SOFT=0.13;
  var U={
    uB:{value:[new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2(),new THREE.Vector2()]},
    uM:{value:[1,1,1,0]}, uTilt:{value:0}, uRe:{value:RE}, uDepth:{value:DEPTH}, uSoft:{value:SOFT},
    uReveal:{value:animate?0:1}, uFogNear:{value:10}, uFogFar:{value:30}, uClipY:{value:-1e5}, uPx:{value:1}, uScale:{value:1}
  };
  var WARP=[
    'uniform vec2 uB[4]; uniform float uM[4]; uniform float uTilt; uniform float uRe; uniform float uDepth; uniform float uSoft;',
    'vec3 warp(vec3 p,float sheet){',
    '  vec2 push=vec2(0.); float z=0.;',
    '  for(int i=0;i<4;i++){ vec2 d=p.xy-uB[i]; float r2=dot(d,d);',
    '    push+=uM[i]*d*(uRe*uRe)/(r2+uRe*uRe*.6);',          // seen from above: a weak lens
    '    z-=uM[i]*uDepth/sqrt(r2+uSoft); }',                    // seen from the side: a gravity well
    '  return vec3(p.xy+push*(1.-uTilt), p.z+z*uTilt*sheet); }'
  ].join('\n');
  var CLIP='uniform float uClipY; uniform float uPx; float clipFade(){ return smoothstep(uClipY-20.*uPx,uClipY+30.*uPx,gl_FragCoord.y); }';
  function mat(o){
    o.uniforms=Object.assign({},o.uniforms||{},U);       // every material sees the same masses and view
    o.transparent=true; o.depthTest=false; o.depthWrite=false;
    return new THREE.ShaderMaterial(o);
  }

  // coordinate grid: long lines cut into short pieces so they can bend
  var gridMat=(function(){
    var g=0.52, ext=26, n=Math.round(ext/g), seg=0.1, m=Math.round(2*ext/seg), pos=[], i, k;
    for(i=-n;i<=n;i++) for(k=0;k<m;k++){
      var a=-ext+k*seg, b=a+seg, c=i*g;
      pos.push(a,c,0, b,c,0,  c,a,0, c,b,0);
    }
    var geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    var m2=mat({
      uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:0.4}},
      vertexShader:WARP+'\nuniform float uFogNear; uniform float uFogFar; uniform float uReveal; varying float vFade;\nvoid main(){ vec3 p=warp(position,1.); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;\n float fog=1.-smoothstep(uFogNear,uFogFar,-mv.z); float rv=1.-smoothstep(uReveal*42.-3.,uReveal*42.,length(position.xy)); vFade=fog*rv; }',
      fragmentShader:'uniform vec3 uColor; uniform float uAlpha; varying float vFade; void main(){ gl_FragColor=vec4(uColor,uAlpha*vFade); }'
    });
    var obj=new THREE.LineSegments(geo,m2); obj.frustumCulled=false; obj.renderOrder=0; scene.add(obj);
    return m2;
  })();

  // stars: denser near the middle, floating at different heights so they slide past each other when the view tilts
  var starMat=(function(){
    function rand(sd){ return function(){ sd|=0; sd=sd+0x6D2B79F5|0; var q=Math.imul(sd^sd>>>15,1|sd); q=q+Math.imul(q^q>>>7,61|q)^q; return ((q^q>>>14)>>>0)/4294967296; }; }
    var rnd=rand(1905), N=2200, pos=[], size=[], i;
    for(i=0;i<N;i++){
      var r=i<950?5.2*Math.sqrt(rnd()):5.2+21*Math.pow(rnd(),1.5), a=rnd()*6.2832;   // an even field over the first slide, thinning out beyond it
      pos.push(r*Math.cos(a),r*Math.sin(a),0.08+0.85*rnd()*rnd());
      size.push((0.55+3.4*Math.pow(rnd(),7))/233);                    // radius in world units (px at the reference scale)
    }
    var geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('aSize',new THREE.Float32BufferAttribute(size,1));
    var m=mat({
      uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:1}},
      vertexShader:WARP+'\nattribute float aSize; uniform float uScale; uniform float uFogNear; uniform float uFogFar; uniform float uReveal; varying float vSpike; varying float vFade;\nvoid main(){ vec3 p=warp(position,0.); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;\n float px=aSize*uScale/max(.001,-mv.z); vSpike=step(2.6/233.,aSize);\n gl_PointSize=clamp(2.*px*mix(1.25,3.3,vSpike),1.5,72.);\n vFade=(1.-smoothstep(uFogNear*1.2,uFogFar,-mv.z))*(1.-smoothstep(uReveal*42.-3.,uReveal*42.,length(position.xy)*1.6)); }',
      fragmentShader:CLIP+'\nuniform vec3 uColor; uniform float uAlpha; varying float vSpike; varying float vFade;\nvoid main(){ vec2 c=(gl_PointCoord-.5)*2.; float rr=mix(.8,.303,vSpike); float a=1.-smoothstep(rr-.12,rr+.04,length(c));\n if(vSpike>.5){ float w=.045; a=max(a,(1.-smoothstep(w*.5,w,abs(c.y)))*(1.-smoothstep(.8,1.,abs(c.x)))); a=max(a,(1.-smoothstep(w*.5,w,abs(c.x)))*(1.-smoothstep(.8,1.,abs(c.y)))); }\n gl_FragColor=vec4(uColor,a*uAlpha*vFade*clipFade()); }'
    });
    var obj=new THREE.Points(geo,m); obj.frustumCulled=false; obj.renderOrder=1; scene.add(obj);
    return m;
  })();

  // per body: the whole path so far (a hairline), the recent tracer (a tapered ribbon), the body and its halo
  var SHEET_VS=WARP+'\nvoid main(){ vec3 p=warp(position,1.); p.z+=.004; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }';
  var FLAT_FS=CLIP+'\nuniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor=vec4(uColor,uAlpha*clipFade()); }';
  var pathAttr=[], pathLine=[], pathMat=[], trGeo=[], trAttr=[], trMat=[], ballMat=[], haloMat=[], ball=[], halo=[];
  var sphere=new THREE.SphereGeometry(1,28,18);
  for(var b=0;b<3;b++){
    var pg=new THREE.BufferGeometry(); pathAttr[b]=new THREE.BufferAttribute(new Float32Array(NP*3),3);
    pathAttr[b].setUsage(THREE.DynamicDrawUsage); pg.setAttribute('position',pathAttr[b]);
    pathMat[b]=mat({uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:0.3}},vertexShader:SHEET_VS,fragmentShader:FLAT_FS});
    pathLine[b]=new THREE.Line(pg,pathMat[b]); pathLine[b].frustumCulled=false; pathLine[b].renderOrder=2; scene.add(pathLine[b]);

    var tg=new THREE.BufferGeometry(), idx=[], k;
    trAttr[b]=new THREE.BufferAttribute(new Float32Array((TRACER+2)*6),3); trAttr[b].setUsage(THREE.DynamicDrawUsage);
    tg.setAttribute('position',trAttr[b]);
    for(k=0;k<=TRACER;k++) idx.push(k*2,k*2+1,k*2+2, k*2+1,k*2+3,k*2+2);
    tg.setIndex(idx); trGeo[b]=tg;
    trMat[b]=mat({uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:1}},vertexShader:SHEET_VS,fragmentShader:FLAT_FS,side:THREE.DoubleSide});
    var tm=new THREE.Mesh(tg,trMat[b]); tm.frustumCulled=false; tm.renderOrder=3; scene.add(tm);

    var BODY_VS='void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
    haloMat[b]=mat({uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:1}},vertexShader:BODY_VS,fragmentShader:FLAT_FS});
    ballMat[b]=mat({uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:1}},vertexShader:BODY_VS,fragmentShader:FLAT_FS});
    halo[b]=new THREE.Mesh(sphere,haloMat[b]); halo[b].renderOrder=4; halo[b].frustumCulled=false; scene.add(halo[b]);
    ball[b]=new THREE.Mesh(sphere,ballMat[b]); ball[b].renderOrder=5; ball[b].frustumCulled=false; scene.add(ball[b]);
  }

  /* ---------------- palettes: one per slide ---------------- */
  function C(h){ return new THREE.Color(h); }
  function inks(el){ return [C(cssVar(el,'--f-p')),C(cssVar(el,'--f-m')),C(cssVar(el,'--f-c'))]; }
  var secs=[].slice.call(deck.children).map(function(el){
    var kind=el.classList.contains('on-c')?'c':el.classList.contains('on-b')?'b':'a', cs=getComputedStyle(el);
    var p={el:el, kind:kind, ground:C(cssVar(el,'--bg')), ink:C(cssVar(el,'--fg')), cols:inks(el)};
    if(kind==='a'){ p.grid=p.cols[2].clone(); p.gridA=0.42; p.starA=1; p.show=1; p.pathA=0.34; }
    if(kind==='b'){ p.grid=p.ink.clone(); p.gridA=0.07; p.starA=0; p.show=0; p.pathA=0; }      // text slides: only a faint grid, nothing moving behind the words
    if(kind==='c'){ p.grid=p.ink.clone(); p.gridA=0.3; p.starA=0.75; p.show=1; p.pathA=0.3; }
    return p;
  });
  var look={pop:animate?0:1};               // 0 to 1 as the masses appear after loading
  var tmpC=new THREE.Color();

  /* ---------------- view ---------------- */
  var VW=1, VH=1, dpr=1, S=200, cx=0, cy=0, fadeTop=1e9, narrow=false, D0=8;
  var scrollP=0, scrollS=0, pMax=3;
  var cam={th:0,ph:0,d:1,tx:0,ty:0,tz:0}, KEYS=[];
  function measure(){
    VW=deck.clientWidth; VH=deck.clientHeight;
    dpr=Math.min(window.devicePixelRatio||1,2);
    renderer.setPixelRatio(dpr); renderer.setSize(VW,VH,false);
    camera.aspect=VW/VH; camera.updateProjectionMatrix();
    fadeTop=footEl.getBoundingClientRect().top-hero.getBoundingClientRect().top;
    narrow=VW<860;
    cy=fadeTop*0.5;
    if(narrow){ cx=VW/2; S=Math.min(VW/3.2,fadeTop/4.4); }
    else { cx=VW*0.58; S=Math.min(VW/5.4,fadeTop/3.0); }
    var tanH=Math.tan(FOV*Math.PI/360);
    D0=(VH/S)/(2*tanH);                                  // from this height, one length unit is S pixels
    U.uScale.value=VH*dpr/(2*tanH); U.uPx.value=dpr;
    U.uFogNear.value=D0*1.25; U.uFogFar.value=D0*4.2;
    pMax=Math.max(2.05,(deck.scrollHeight-VH)/VH);
    // camera stations: straight above the atlas, then down beside the wells, then low over the sheet, then pulling away
    KEYS=[
      {p:0,    th:0,    ph:0,     d:1,    tx:(VW/2-cx)/S, ty:(cy-VH/2)/S, tz:0},
      {p:1,    th:1.02, ph:-0.42, d:0.9,  tx:0.2, ty:0.5, tz:-0.25},
      {p:2,    th:1.27, ph:0.55,  d:0.62, tx:0,   ty:0.3, tz:-0.3},
      {p:pMax, th:0.72, ph:0.16,  d:1.45, tx:0,   ty:0,   tz:-0.2}
    ];
  }
  function pose(p){
    var i=0; while(i<KEYS.length-2 && p>KEYS[i+1].p) i++;
    var a=KEYS[i], b=KEYS[i+1], f=Math.max(0,Math.min(1,(p-a.p)/(b.p-a.p))), e=f*f*f*(f*(6*f-15)+10), k;
    for(k in cam) cam[k]=a[k]+(b[k]-a[k])*e;
    var D=cam.d*D0, st=Math.sin(cam.th), ct=Math.cos(cam.th), sp=Math.sin(cam.ph), cp=Math.cos(cam.ph);
    camera.position.set(cam.tx+D*st*sp, cam.ty-D*st*cp, cam.tz+D*ct);
    camera.up.set(-sp,cp,0);
    camera.lookAt(cam.tx,cam.ty,cam.tz);
    camera.updateMatrixWorld();
    U.uTilt.value=Math.max(0,Math.min(1,(cam.th-0.04)/0.7)); U.uTilt.value*=U.uTilt.value*(3-2*U.uTilt.value);
  }
  // the same bending as the shader, for things placed from JavaScript
  var wp=new THREE.Vector3();
  function warp(x,y,self){
    var px=0, py=0, z=0, tilt=U.uTilt.value;
    for(var i=0;i<4;i++){
      var m=U.uM.value[i], dx=x-U.uB.value[i].x, dy=y-U.uB.value[i].y, r2=dx*dx+dy*dy;
      if(i!==self){ var k=m*RE*RE/(r2+RE*RE*0.6); px+=dx*k; py+=dy*k; }
      z-=m*DEPTH/Math.sqrt(r2+SOFT);
    }
    return wp.set(x+px*(1-tilt), y+py*(1-tilt), z*tilt);
  }
  var bw=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()], sv=new THREE.Vector3();
  var labels=[].slice.call(document.querySelectorAll('.blabel'));

  function buildTracer(b){
    var n=Math.min(count,TRACER), arr=trAttr[b].array, rb=rec[b], k, idx, px, py, qx, qy, wide=(narrow?4.5:6)/S, thin=0.8/S;
    var lx=0, ly=0, m=0;
    for(k=0;k<=n;k++){
      if(k<n){ idx=((head-n+k)%NH+NH)%NH; px=rb[idx*2]; py=rb[idx*2+1]; } else { px=P[b*3]; py=P[b*3+1]; }
      if(k<n-1){ idx=((head-n+k+1)%NH+NH)%NH; qx=rb[idx*2]; qy=rb[idx*2+1]; } else if(k===n-1){ qx=P[b*3]; qy=P[b*3+1]; } else { qx=px+lx; qy=py+ly; }
      var tx=qx-px, ty=qy-py, tl=Math.hypot(tx,ty);
      if(tl>1e-7){ lx=tx/tl; ly=ty/tl; }
      var a=n?k/n:1, hw=(thin+wide*a*a)*0.5*vis*look.pop;
      arr[m++]=px-ly*hw; arr[m++]=py+lx*hw; arr[m++]=0;
      arr[m++]=px+ly*hw; arr[m++]=py-lx*hw; arr[m++]=0;
    }
    trAttr[b].needsUpdate=true; trGeo[b].setDrawRange(0,Math.max(0,n)*6);
  }
  function setScene(){
    var b;
    for(b=0;b<3;b++){ U.uB.value[b].set(P[b*3],P[b*3+1]); U.uM.value[b]=vis*look.pop; }
    var r=(narrow?8:10)/S;
    for(b=0;b<3;b++){
      buildTracer(b);
      pathLine[b].geometry.setDrawRange(0,nPath);
      warp(P[b*3],P[b*3+1],b); bw[b].copy(wp);
      var s=r*look.pop*(0.25+0.75*vis);
      ball[b].position.copy(wp); ball[b].scale.setScalar(s);
      halo[b].position.copy(wp); halo[b].scale.setScalar(s+3.5/S*look.pop);
    }
  }
  function paint(p,isHero,heroTop){
    var b, a;
    gridMat.uniforms.uColor.value.copy(p.grid); gridMat.uniforms.uAlpha.value=p.gridA;
    starMat.uniforms.uColor.value.copy(p.ink); starMat.uniforms.uAlpha.value=p.starA;
    for(b=0;b<3;b++){
      a=vis*p.show;
      trMat[b].uniforms.uColor.value.copy(p.cols[b]); trMat[b].uniforms.uAlpha.value=a;
      ballMat[b].uniforms.uColor.value.copy(p.cols[b]); ballMat[b].uniforms.uAlpha.value=a;
      haloMat[b].uniforms.uColor.value.copy(p.ground); haloMat[b].uniforms.uAlpha.value=a;
      pathMat[b].uniforms.uColor.value.copy(p.cols[b]); pathMat[b].uniforms.uAlpha.value=p.pathA*vis;
    }
    U.uClipY.value=isHero?(VH-(heroTop+fadeTop))*dpr:-1e5;       // keep the paragraph on the first slide clear
  }
  function render(){
    var top0=-deck.scrollTop, i;
    renderer.setScissorTest(false); renderer.setClearColor(secs[1].ground,1); renderer.clear();
    renderer.setScissorTest(true);
    for(i=0;i<secs.length;i++){
      var el=secs[i].el, top=el.offsetTop+top0, bot=top+el.offsetHeight;
      if(i===secs.length-1) bot=Math.max(bot,VH);
      var y0=Math.max(0,top), y1=Math.min(VH,bot);
      if(y1-y0<1) continue;
      renderer.setScissor(0,VH-y1,VW,y1-y0);
      renderer.setClearColor(secs[i].ground,1); renderer.clear();
      paint(secs[i],i===0,top);
      renderer.render(scene,camera);
    }
    // labels ride with the bodies on the first slide only
    var show=Math.max(0,1-scrollS*2.2)*vis*look.pop;
    for(i=0;i<3;i++){
      sv.copy(bw[i]).project(camera);
      var x=(sv.x*0.5+0.5)*VW, y=(-sv.y*0.5+0.5)*VH, o=show*(y<top0+fadeTop-24?1:0);
      labels[i].style.transform='translate('+(x+17).toFixed(1)+'px,'+(y-27-top0).toFixed(1)+'px)';
      labels[i].style.opacity=o.toFixed(2);
    }
  }

  /* ---------------- loop ---------------- */
  var lastT=0, running=false;
  function away(){
    var n=0, far=false, pad=40;
    for(var b=0;b<3;b++){
      var x=cx+P[b*3]*S, y=cy-P[b*3+1]*S;
      if(!(x>-pad && x<VW+pad && y>-pad && y<VH+pad)) n++;
      if(!isFinite(x) || Math.abs(x-cx)>VW*2.5 || Math.abs(y-cy)>VH*2.5) far=true;
    }
    return far?3:n;
  }
  function frame(now){
    if(!running) return;
    var dt=Math.min(0.05,(now-lastT)/1000||0); lastT=now;
    scrollP=deck.scrollTop/VH; scrollS+=(scrollP-scrollS)*Math.min(1,dt*7);
    var want=Math.max(1,Math.min(6,Math.pow(minDist()/0.9,1.3)));     // far apart, gravity is slow: run the clock faster
    pace+=(want-pace)*Math.min(1,dt*3);
    advance(dt*SPEED*pace,900);
    var n=away();
    awayT=n>=2?awayT+dt:0; oneAwayT=n>=1?oneAwayT+dt:0;
    if(n===3 || awayT>2.5 || oneAwayT>10 || t>NH*REC-1) next();      // flown apart: start again
    if(phase==='out'){ vis-=dt/0.6; if(vis<=0){ vis=0; seed(); phase='in'; } }
    else if(vis<1) vis=Math.min(1,vis+dt/0.8);
    pose(scrollS); setScene(); render();
    requestAnimationFrame(frame);
  }
  function once(){ scrollS=scrollP=deck.scrollTop/VH; pose(scrollS); setScene(); render(); }
  function start(){ if(running||reduce||document.hidden) return; running=true; lastT=performance.now(); requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange',function(){ if(document.hidden) running=false; else start(); });

  measure(); seed(); if(reduce) advance(4,1e6);
  once();
  function refit(){ measure(); if(!running) once(); if(ST) ST.refresh(); }
  if(window.ResizeObserver) new ResizeObserver(refit).observe(deck); else window.addEventListener('resize',refit);
  whenFontsReady(nameEl,refit);
  if(reduce) deck.addEventListener('scroll',once,{passive:true});
  start();
  loader.add(0.44);                          // the scene is built and has drawn its first frame

  /* ---------------- motion (GSAP), kept to a few quiet moves ---------------- */
  if(!animate) return;
  // once the loading screen lifts: the grid draws outward and the three masses appear
  loader.ready(function(){
    G.to(U.uReveal,{value:1,duration:2.2,ease:'power2.out'});
    G.to(look,{pop:1,duration:0.9,delay:0.4,ease:'power2.out'});
  });
  if(ST){
    // each later slide fades up once, as a single block
    [['.cv','.cv .cv-grid','top 65%'],['.contact','.contact-grid','top 85%']].forEach(function(r){
      G.from(r[1],{y:22,opacity:0,duration:0.7,ease:'power2.out',immediateRender:false,scrollTrigger:{trigger:r[0],start:r[2],once:true}});
    });
    var h=document.querySelector('.projects h2'), word=h.textContent;
    h.setAttribute('aria-label',word); h.textContent='';
    word.split('').forEach(function(ch){
      var m=document.createElement('span'), sp=document.createElement('span');
      m.className='split'; m.setAttribute('aria-hidden','true'); sp.textContent=ch; m.appendChild(sp); h.appendChild(m);
    });
    G.from('.projects .split span',{yPercent:112,duration:0.9,ease:'power3.out',stagger:0.04,immediateRender:false,
      scrollTrigger:{trigger:'.projects',start:'top 62%',once:true}});
    G.from('.projects .blurb, .projects .wire',{y:20,opacity:0,duration:0.7,ease:'power2.out',stagger:0.1,delay:0.3,immediateRender:false,
      scrollTrigger:{trigger:'.projects',start:'top 62%',once:true}});
  }
})();

/* =====================================================================
   One-qubit wires. Each is simulated (two complex amplitudes) and
   sampled every time it fires, so the measured bit changes.
   ===================================================================== */
(function wires(){
  var SQ=Math.SQRT1_2;
  function prob1(gates){
    var ar=1, ai=0, br=0, bi=0, t;
    gates.forEach(function(g){
      if(g==='H'){ var nr=(ar+br)*SQ, ni=(ai+bi)*SQ, mr=(ar-br)*SQ, mi=(ai-bi)*SQ; ar=nr; ai=ni; br=mr; bi=mi; }
      else if(g==='X'){ t=ar; ar=br; br=t; t=ai; ai=bi; bi=t; }
      else if(g==='Z'){ br=-br; bi=-bi; }
      else if(g==='S'){ t=br; br=-bi; bi=t; }
      else if(g==='T'){ t=(br-bi)*SQ; bi=(br+bi)*SQ; br=t; }
    });
    return br*br+bi*bi;
  }
  function mk(cls,html){ var s=document.createElement('span'); s.className=cls; if(html) s.innerHTML=html; return s; }
  var items=[];
  [].forEach.call(document.querySelectorAll('.wire'),function(el){
    var gates=(el.getAttribute('data-gates')||'').split(/\s+/).filter(Boolean);
    var it={el:el, cta:el.querySelector('.cta'), p1:prob1(gates), state:'idle', t0:0, visible:false, out:0};
    it.ket=mk('w-ket','|0<span class="r">⟩</span>'); it.line=mk('w-line'); it.lit=mk('w-lit'); it.pulse=mk('w-pulse');
    it.boxes=gates.map(function(g){ return mk('w-box',g); });
    it.meter=mk('w-box w-meter','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16A7 7 0 0 1 19 16"/><line class="w-needle" x1="12" y1="16" x2="12" y2="7.5"/></svg>');
    it.needle=it.meter.querySelector('.w-needle'); it.bit=mk('w-bit');
    [it.ket,it.line,it.lit,it.pulse].concat(it.boxes,[it.meter,it.bit]).forEach(function(n){ el.insertBefore(n,it.cta||null); });
    it.out=Math.random()<it.p1?1:0;
    layout(it); items.push(it);
  });
  function layout(it){
    var r=it.el.getBoundingClientRect(), W=r.width;
    var x0=it.ket.offsetWidth+10, xm=W-50;
    it.x0=x0; it.xm=xm; it.W=W;
    it.line.style.left=it.lit.style.left=x0+'px'; it.line.style.width=(xm-x0)+'px';
    it.meter.style.left=xm+'px';
    var a=x0+26, b=xm-44, fire=[];
    if(it.cta){ var c=it.cta.getBoundingClientRect(); b=c.left-r.left-26; fire.push({el:it.cta,x:(c.left+c.right)/2-r.left}); }
    it.boxes.forEach(function(box,i){
      var x=a+(i+0.5)/it.boxes.length*(b-a), ok=b-a>30*it.boxes.length;
      box.style.display=ok?'':'none'; box.style.left=x+'px';
      if(ok) fire.push({el:box,x:x});
    });
    fire.push({el:it.meter,x:xm,meter:true});
    it.fire=fire; rest(it);
  }
  function showBit(it){
    it.bit.textContent=it.out; it.bit.classList.remove('stale');
    it.needle.style.transform='rotate('+(it.out?40:-40)+'deg)';
  }
  function rest(it){ it.lit.style.width=(it.xm-it.x0)+'px'; it.pulse.style.opacity=0; showBit(it); }
  function begin(it,now){
    it.out=Math.random()<it.p1?1:0; it.t0=now; it.state='run';
    it.fire.forEach(function(f){ f.done=false; });
    it.lit.style.width='0px'; it.pulse.style.opacity=1; it.bit.classList.add('stale'); it.needle.style.transform='rotate(0deg)';
  }
  var RUN=2200, HOLD=3200;
  function tick(it,now){
    if(it.state==='idle'){ if(now>=it.t0) begin(it,now); return; }
    if(it.state==='hold'){ if(now-it.t0>HOLD) begin(it,now); return; }
    var e=Math.min(1,(now-it.t0)/RUN), x=it.x0+(it.xm-it.x0)*e;
    it.lit.style.width=(x-it.x0)+'px'; it.pulse.style.left=x+'px';
    it.fire.forEach(function(f){
      if(f.done||f.x>x+0.5) return;
      f.done=true; f.el.classList.add('fire');
      setTimeout(function(){ f.el.classList.remove('fire'); },280);
      if(f.meter) showBit(it);
    });
    if(e>=1){ it.pulse.style.opacity=0; it.state='hold'; it.t0=now; }
  }
  var looping=false;
  function loop(now){
    var any=false;
    items.forEach(function(it){ if(it.visible){ any=true; tick(it,now); } });
    if(any) requestAnimationFrame(loop); else looping=false;
  }
  function wake(){ if(!looping && !reduce && !document.hidden){ looping=true; requestAnimationFrame(loop); } }
  var rz;
  window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){
    items.forEach(function(it){ layout(it); it.state='idle'; it.t0=performance.now()+300; }); },150); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ items.forEach(layout); });
  if(window.IntersectionObserver && !reduce){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ items.forEach(function(it){
        if(it.el!==en.target) return;
        var was=it.visible; it.visible=en.isIntersecting;
        if(it.visible && !was){ it.state='idle'; it.t0=performance.now()+500; }
        if(!it.visible && was) rest(it);
      }); });
      wake();
    },{threshold:0.6});
    items.forEach(function(it){ io.observe(it.el); });
    document.addEventListener('visibilitychange',wake);
  }
})();

})();
