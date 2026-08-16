/* The garden — a living border for the whole page.
   Two page-length canvases: an under-layer (behind the writing, above the
   paper) and a sparse over-layer that occasionally crosses a card edge.
   Stems grow while the page is open, put out leaves and tendrils as they
   go, and bloom where they stop. Vines steer around the writing.
   Density per page via <body data-garden="full|sparse|off">.
   Grown from the Compost Collaborative's organism.js, rerooted. */
(() => {
  const MODE = document.body.dataset.garden || 'sparse';
  if (MODE === 'off') return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const under = document.getElementById('garden-under');
  const over  = document.getElementById('garden-over');
  if (!under || !over) return;

  /* stems in greens; flowers from the plant-sale tables */
  const STEMS = [[77,122,38],[55,90,26],[107,154,58],[143,174,82]];
  const STEMS_DARK = [[207,227,184],[176,205,140]];        /* on the evening footer */
  const FLOWERS = [
    {petal:[232,134,43], heart:[122,61,16],  n:8,  kind:'daisy'},   /* calendula   */
    {petal:[215,106,140],heart:[122,45,72],  n:5,  kind:'bell'},    /* foxglove    */
    {petal:[91,127,199], heart:[46,63,110],  n:8,  kind:'daisy'},   /* cornflower  */
    {petal:[233,195,60], heart:[122,90,20],  n:10, kind:'daisy'},   /* achillea    */
    {petal:[250,247,238],heart:[233,195,60], n:9,  kind:'daisy'},   /* daisy       */
    {petal:[123,94,167], heart:[70,48,105],  n:0,  kind:'spike'},   /* lupin       */
  ];

  let canvasTop = 0, jobs = [], running = false, sproutTimer = null, sprouts = 0, bands = [];

  const pageRect = el => {
    const r = el.getBoundingClientRect();
    return {x:r.left+scrollX, y:r.top+scrollY-canvasTop, w:r.width, h:r.height,
            cx:r.left+scrollX+r.width/2, cy:r.top+scrollY-canvasTop+r.height/2};
  };
  const angleDiff = (a,b) => ((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;
  const rgba = (c,a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const lerp3 = (a,b,f) => [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f].map(Math.round);

  const styleAt = y => {
    for (const b of bands) if (y>=b.top && y<b.bot) return b;
    return {dark:false};
  };

  /* a stem: gentler jitter than a tentacle, a slow upward want,
     and tendril curls that wind themselves tight.
     Given a guide (a river's course, as waypoints), it follows it,
     wobbling like water, then grows free once the course is run. */
  function makeStem(x0,y0,ang0,len0,segs,alpha,repulsors,W,H,tendril,guide){
    const pts=[[x0,y0]], angs=[ang0];
    let x=x0,y=y0,ang=ang0,len=len0,curl=0,gi=0;
    const heliotropism = (tendril||guide) ? 0 : .006+Math.random()*.01;
    for(let i=0;i<segs;i++){
      const guiding = guide && gi<guide.length;
      ang += (Math.random()-.5)*(guiding?.09:.13) + curl;
      ang += angleDiff(-Math.PI/2,ang)*heliotropism;      /* stems want the sun */
      if (guiding){
        const tx=guide[gi][0]-x, ty=guide[gi][1]-y;
        ang += angleDiff(Math.atan2(ty,tx),ang)*.3;       /* rivers know their course */
        if (Math.hypot(tx,ty) < len*3.2) gi++;
      }
      if (tendril) curl += .012;                           /* tendrils wind tight */
      else if (!guiding){
        if (Math.random()<.02) curl=(Math.random()<.5?1:-1)*(.03+Math.random()*.08);
        if (Math.random()<.05) curl*=.5;
      }
      for (const r of repulsors){
        const dx=x-r.cx, dy=y-r.cy;
        const reach = Math.max(r.w,r.h)/2 + r.influence;
        const d = Math.hypot(dx,dy);
        if (d < reach){
          const away = Math.atan2(dy,dx);
          ang += angleDiff(away,ang) * r.strength * (1-d/reach);
        }
      }
      if (x<15)   ang += angleDiff(0,ang)*.25;
      if (x>W-15) ang += angleDiff(Math.PI,ang)*.25;
      if (y<15)   ang += angleDiff(Math.PI/2,ang)*.3;
      if (y>H-10) ang += angleDiff(-Math.PI/2,ang)*.3;
      x+=Math.cos(ang)*len; y+=Math.sin(ang)*len;
      pts.push([x,y]); angs.push(ang); len*=.997;
    }
    return {pts,angs,alpha,tendril,drawn:1,delay:Math.floor(Math.random()*90),
            parent:null,spawnI:0,len0,girth:guide?1.7:1,leafSide:Math.random()<.5?1:-1,
            flower:FLOWERS[Math.floor(Math.random()*FLOWERS.length)]};
  }

  /* the rivers of Sheffield, roughly: the Don running north to centre and
     away north-east; the Loxley and the Rivelin from the west; the Porter
     from the south-west; the Sheaf from the south. All meet the Don. */
  const RIVERS = [
    {name:'Don',     labelAt:.22, pts:[[.30,.02],[.36,.13],[.44,.26],[.52,.38],[.55,.44],[.66,.40],[.80,.30],[.98,.14]]},
    {name:'Loxley',  labelAt:.38, pts:[[.02,.18],[.14,.22],[.27,.28],[.40,.35],[.50,.41],[.55,.44]]},
    {name:'Rivelin', labelAt:.30, pts:[[.00,.32],[.12,.33],[.25,.35],[.37,.39],[.48,.42],[.55,.44]]},
    {name:'Porter',  labelAt:.40, pts:[[.04,.78],[.15,.70],[.28,.61],[.41,.52],[.51,.47],[.55,.44]]},
    {name:'Sheaf',   labelAt:.42, pts:[[.47,.97],[.50,.84],[.52,.70],[.54,.57],[.55,.44]]},
  ];
  const CONFLUENCE = [.55,.44];

  /* map annotations: hydronyms in blue italic, written in letter by letter
     once their river has grown, the old-map way */
  const INKBLUE = [91,110,160];
  function labelPos(guide, frac){
    let total=0; const segs=[];
    for(let i=1;i<guide.length;i++){
      const L=Math.hypot(guide[i][0]-guide[i-1][0], guide[i][1]-guide[i-1][1]);
      segs.push(L); total+=L;
    }
    let want=total*frac;
    for(let i=0;i<segs.length;i++){
      if (want<=segs[i]){
        const f=want/segs[i];
        const ax=guide[i][0]+(guide[i+1][0]-guide[i][0])*f;
        const ay=guide[i][1]+(guide[i+1][1]-guide[i][1])*f;
        let ang=Math.atan2(guide[i+1][1]-guide[i][1], guide[i+1][0]-guide[i][0]);
        if (Math.abs(ang)>Math.PI/2) ang+=Math.PI;   /* keep the words upright */
        return {x:ax,y:ay,ang};
      }
      want-=segs[i];
    }
    return {x:guide[0][0],y:guide[0][1],ang:0};
  }
  function drawLabelChar(x,lab){
    const ch=lab.name[lab.shown];
    x.save();
    x.translate(lab.x,lab.y); x.rotate(lab.ang);
    x.font='italic 15px Georgia, "Times New Roman", serif';
    x.fillStyle=rgba(INKBLUE,.8);
    const adv=lab.shown===0?0:x.measureText(lab.name.slice(0,lab.shown)).width;
    x.fillText(ch, adv, -9);
    x.restore();
    lab.shown++;
  }
  function drawConfluence(x,cx,cy){
    x.strokeStyle=rgba(INKBLUE,.85); x.lineWidth=1.4;
    x.beginPath(); x.arc(cx,cy,4.5,0,7); x.stroke();
    x.fillStyle=rgba(INKBLUE,.85);
    x.beginPath(); x.arc(cx,cy,1.8,0,7); x.fill();
    x.font='600 9.5px Jost, sans-serif';
    x.textAlign='center';
    const label='S H E F F I E L D';
    x.fillStyle=rgba(INKBLUE,.75);
    x.fillText(label, cx, cy+18);
    x.textAlign='start';
  }

  function stemHue(y,f){
    const g = styleAt(y);
    const set = g.dark ? STEMS_DARK : STEMS;
    return lerp3(set[0], set[(1+Math.floor(f*2))%set.length], f*.6);
  }

  function leaf(x,px,py,ang,size,hue,a){
    /* one leaf: two quadratic curves out to a point and back, plus a midrib */
    const tx=px+Math.cos(ang)*size, ty=py+Math.sin(ang)*size;
    const bulge = size*.42;
    const nx=Math.cos(ang+Math.PI/2), ny=Math.sin(ang+Math.PI/2);
    const mx=(px+tx)/2, my=(py+ty)/2;
    x.fillStyle=rgba(hue,a*.55);
    x.strokeStyle=rgba(hue,a*.8); x.lineWidth=.7;
    x.beginPath();
    x.moveTo(px,py);
    x.quadraticCurveTo(mx+nx*bulge,my+ny*bulge,tx,ty);
    x.quadraticCurveTo(mx-nx*bulge,my-ny*bulge,px,py);
    x.fill(); x.stroke();
    x.beginPath(); x.moveTo(px,py); x.lineTo(tx,ty);
    x.strokeStyle=rgba(hue,a*.5); x.lineWidth=.5; x.stroke();
  }

  function wonkyVeg(x,px,py,a){
    /* the Wonkiest Veg class, honoured in the border: a bent carrot */
    const ang = Math.PI/2 + (Math.random()-.5)*.9;      /* roots go down-ish */
    const L = 26+Math.random()*22, bend=(Math.random()<.5?1:-1)*(.5+Math.random()*.7);
    const tipx = px+Math.cos(ang)*L+Math.cos(ang+Math.PI/2)*L*bend*.5;
    const tipy = py+Math.sin(ang)*L+Math.sin(ang+Math.PI/2)*L*bend*.5;
    const midx = px+Math.cos(ang)*L*.5+Math.cos(ang+Math.PI/2)*L*bend*.3;
    const midy = py+Math.sin(ang)*L*.5+Math.sin(ang+Math.PI/2)*L*bend*.3;
    const nx=Math.cos(ang+Math.PI/2), ny=Math.sin(ang+Math.PI/2);
    const w = 5+Math.random()*3;
    x.fillStyle=rgba([232,134,43],.85*a);
    x.beginPath();
    x.moveTo(px+nx*w,py+ny*w);
    x.quadraticCurveTo(midx+nx*w*.7,midy+ny*w*.7,tipx,tipy);
    x.quadraticCurveTo(midx-nx*w*.7,midy-ny*w*.7,px-nx*w,py-ny*w);
    x.closePath(); x.fill();
    x.strokeStyle=rgba([190,100,25],.5*a); x.lineWidth=.8;
    for(let k=1;k<4;k++){
      const f=k/4;
      const rx=px+(midx-px)*f*2*(f<.5?1:0)+(f>=.5?midx+(tipx-midx)*(f-.5)*2:0);
      const ry=py+(midy-py)*f*2*(f<.5?1:0)+(f>=.5?midy+(tipy-midy)*(f-.5)*2:0);
      x.beginPath(); x.moveTo(rx-nx*w*.6*(1-f),ry-ny*w*.6*(1-f)); x.lineTo(rx+nx*w*.6*(1-f),ry+ny*w*.6*(1-f)); x.stroke();
    }
    /* fronds at the crown */
    for(let k=-2;k<=2;k++){
      const fa = ang+Math.PI + k*.28 + (Math.random()-.5)*.1;
      const fl2 = 10+Math.random()*8;
      x.strokeStyle=rgba([77,122,38],.8*a); x.lineWidth=1.2;
      x.beginPath(); x.moveTo(px,py);
      x.quadraticCurveTo(px+Math.cos(fa)*fl2*.5+2, py+Math.sin(fa)*fl2*.5, px+Math.cos(fa)*fl2, py+Math.sin(fa)*fl2);
      x.stroke();
    }
  }

  function bloom(x,px,py,ang,fl,scale,a){
    const g = styleAt(py);
    const bright = g.dark ? 1 : .92;
    if (fl.kind==='spike'){
      /* a lupin spike: florets stacked up a short stalk */
      const up = -Math.PI/2 + (Math.random()-.5)*.5;
      for(let k=0;k<7;k++){
        const t = k/7;
        const sx=px+Math.cos(up)*k*3.2*scale, sy=py+Math.sin(up)*k*3.2*scale;
        const r=(3.6-t*2.2)*scale;
        x.fillStyle=rgba(fl.petal,(.75-t*.25)*a*bright);
        x.beginPath(); x.arc(sx-r*.5,sy,r,0,7); x.fill();
        x.beginPath(); x.arc(sx+r*.5,sy,r,0,7); x.fill();
      }
      return;
    }
    const R = (fl.kind==='bell' ? 5.5 : 6.5)*scale;
    const rings = R > 14 ? 2 : 1;         /* the big ones get a double ruff */
    for(let ring=rings; ring>=1; ring--){
      const rr = R*(ring===rings?1:.62);
      const tone = ring===rings ? fl.petal : lerp3(fl.petal,[255,255,255],.25);
      for(let k=0;k<fl.n;k++){
        const pa = ang + (k/fl.n)*Math.PI*2 + (ring-1)*Math.PI/fl.n;
        const plen = fl.kind==='bell' ? rr*1.5 : rr*1.15;
        const cx1=px+Math.cos(pa)*plen, cy1=py+Math.sin(pa)*plen;
        const nx=Math.cos(pa+Math.PI/2), ny=Math.sin(pa+Math.PI/2);
        const w=rr*(fl.kind==='bell'?.75:.5);
        x.fillStyle=rgba(tone,.96*a*bright);
        x.beginPath();
        x.moveTo(px,py);
        x.quadraticCurveTo((px+cx1)/2+nx*w,(py+cy1)/2+ny*w,cx1,cy1);
        x.quadraticCurveTo((px+cx1)/2-nx*w,(py+cy1)/2-ny*w,px,py);
        x.fill();
        if (R > 14){
          x.strokeStyle=rgba(lerp3(tone,[0,0,0],.25),.5*a);
          x.lineWidth=.9; x.stroke();
        }
      }
    }
    x.fillStyle=rgba(fl.heart,.95*a);
    x.beginPath(); x.arc(px,py,R*.34,0,7); x.fill();
    x.fillStyle=rgba(fl.petal,.35*a);
    x.beginPath(); x.arc(px,py,R*.18,0,7); x.fill();
    if (R > 14){                          /* seeds in the big hearts */
      x.fillStyle=rgba([255,255,255],.25*a);
      for(let k=0;k<9;k++){
        const sa=Math.random()*Math.PI*2, sr=Math.random()*R*.26;
        x.beginPath(); x.arc(px+Math.cos(sa)*sr, py+Math.sin(sa)*sr, R*.03+.4, 0, 7); x.fill();
      }
    }
  }

  function seedhead(x,px,py,hue,a){
    /* an allium moment: spokes and seeds */
    for(let k=0;k<11;k++){
      const sa=(k/11)*Math.PI*2, sr=6+Math.random()*3;
      const sx=px+Math.cos(sa)*sr, sy=py+Math.sin(sa)*sr;
      x.strokeStyle=rgba(hue,.5*a); x.lineWidth=.6;
      x.beginPath(); x.moveTo(px,py); x.lineTo(sx,sy); x.stroke();
      x.fillStyle=rgba(hue,.7*a);
      x.beginPath(); x.arc(sx,sy,1.1,0,7); x.fill();
    }
  }

  function drawSeg(x,t,i){
    const {pts,alpha}=t, n=pts.length, f=1-i/n;
    const y=(pts[i-1][1]+pts[i][1])/2;
    const hue = stemHue(y, i/n);
    const g = styleAt(y);
    const aMod = (g.dark ? 1 : .85)*alpha;
    x.strokeStyle=rgba(hue,(f*.55+.15)*aMod);
    x.lineWidth=(t.tendril ? f*1.4+.35 : (f*3.2+.45)*t.girth);
    x.lineCap='round';
    x.beginPath(); x.moveTo(pts[i-1][0],pts[i-1][1]); x.lineTo(pts[i][0],pts[i][1]); x.stroke();
    /* leaves, alternating sides, not on tendrils */
    if (!t.tendril && i%9===0 && i>4 && i<n*.92){
      t.leafSide*=-1;
      const la = t.angs[i] + t.leafSide*(Math.PI/2.6) ;
      leaf(x, pts[i][0], pts[i][1], la, (f*11+4), hue, aMod);
    }
    if (i===n-1){
      if (t.tendril){
        x.fillStyle=rgba(hue,.8*aMod);
        x.beginPath(); x.arc(pts[i][0],pts[i][1],1.2,0,7); x.fill();
      } else {
        const roll = Math.random();
        if (roll<.14)      bloom(x, pts[i][0], pts[i][1], t.angs[i], t.flower, 3.6+Math.random()*2.8, aMod);
        else if (roll<.55) bloom(x, pts[i][0], pts[i][1], t.angs[i], t.flower, 1.2+f*1.6, aMod);
        else if (roll<.63) wonkyVeg(x, pts[i][0], pts[i][1], aMod);
        else if (roll<.78) seedhead(x, pts[i][0], pts[i][1], hue, aMod);
        else {             /* a bud: closed teardrop */
          const ba=t.angs[i];
          x.fillStyle=rgba(t.flower.petal,.8*aMod);
          x.beginPath();
          x.ellipse(pts[i][0]+Math.cos(ba)*3, pts[i][1]+Math.sin(ba)*3, 2.2, 3.6, ba+Math.PI/2, 0, 7);
          x.fill();
        }
      }
    }
  }

  function branch(parent,depth,repulsors,W,H,out){
    if (depth>=2 || parent.pts.length<50) return;
    const kids = parent.girth>1 ? (2+Math.floor(Math.random()*2))
               : Math.random()<.8 ? (Math.random()<.4?2:1) : 0;
    for(let k=0;k<kids;k++){
      const i = Math.floor(parent.pts.length*(.25+Math.random()*.5));
      const tendril = Math.random()<.4;
      const child = makeStem(
        parent.pts[i][0], parent.pts[i][1],
        parent.angs[i] + (Math.random()<.5?1:-1)*(.5+Math.random()*.6),
        parent.len0*.7, Math.floor(Math.min(parent.pts.length,140)*(tendril?.3:.55)),
        parent.alpha*.85, repulsors, W, H, tendril);
      child.parent=parent; child.spawnI=i;
      out.push(child);
      if (!tendril) branch(child,depth+1,repulsors,W,H,out);
    }
  }

  function buildGarden(){
    const anchor = document.querySelector('main');
    if (!anchor) return;
    canvasTop = anchor.offsetTop;        /* the garden starts below the header */
    const totalH = document.body.scrollHeight - canvasTop;
    if (totalH < 300) return;
    const dpr = Math.min(devicePixelRatio||1, 1.5);
    const ctxs = [under,over].map(cv=>{
      cv.style.top = canvasTop+'px';
      cv.style.height = totalH+'px';
      cv.width = cv.offsetWidth*dpr; cv.height = totalH*dpr;
      const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0);
      return x;
    });
    const W = under.offsetWidth, H = totalH;

    bands = [...document.querySelectorAll('.site-footer')].map(el=>{
      const r = pageRect(el);
      return {top:r.y, bot:r.y+r.h, dark:true};
    });

    /* the writing is protected; cards only gently deflect */
    const textR  = [...document.querySelectorAll('.hero h1, .hero-lead, .hero-kicker, .hero-actions, .page-header, .prose, .post-list, .benefits h2')]
                   .map(el=>({...pageRect(el), strength:.6, influence:65}));
    const boxesR = [...document.querySelectorAll('.chip, .card, .photo-grid li')]
                   .map(el=>({...pageRect(el), strength:.16, influence:26}));
    const underRep = [...textR, ...boxesR.map(r=>({...r,strength:.08}))];
    const overRep  = [...textR.map(r=>({...r,strength:.9})), ...boxesR];

    const full = MODE === 'full';

    jobs = [];
    const mkSet = (ctx,rep,alpha) => {
      jobs.push({x:ctx,ts:[],rep,W,H});
      return jobs[jobs.length-1].ts;
    };
    const underTs = mkSet(ctxs[0], underRep, 1);

    /* first growth: the five rivers, each a guided vine.
       On wide screens they take the open ground beside the writing;
       on narrow ones, the whole width. */
    let rx0 = 0, rx1 = W;
    const col = document.querySelector('.hero-lead, .prose, .post-list');
    if (col){
      const cr = pageRect(col);
      if (W - (cr.x + cr.w) > 380){ rx0 = cr.x + cr.w + 30; rx1 = W - 8; }
    }
    const riverStems = [];
    RIVERS.forEach(course=>{
      const guide = course.pts.map(p=>[rx0 + p[0]*(rx1-rx0), p[1]*H]);
      let pathLen = 0;
      for(let i=1;i<guide.length;i++)
        pathLen += Math.hypot(guide[i][0]-guide[i-1][0], guide[i][1]-guide[i-1][1]);
      const len0 = 10+Math.random()*2;
      const segs = Math.floor(pathLen/len0*1.25) + 30;
      const a0 = Math.atan2(guide[1][1]-guide[0][1], guide[1][0]-guide[0][0]);
      const t = makeStem(guide[0][0],guide[0][1],a0,len0,segs,1,underRep,W,H,false,guide.slice(1));
      t.delay = Math.floor(Math.random()*30);
      t.label = {...labelPos(guide, course.labelAt), name:course.name, shown:0};
      riverStems.push(t);
      underTs.push(t); branch(t,0,underRep,W,H,underTs);
    });
    jobs[0].rivers = riverStems;
    jobs[0].confluence = [rx0 + CONFLUENCE[0]*(rx1-rx0), CONFLUENCE[1]*H];
    jobs[0].confluenceDrawn = false;

    /* then the ordinary garden filling in around them */
    const bottomN = full ? 3 : 2;
    for(let i=0;i<bottomN;i++){
      const t=makeStem(W*(.06+Math.random()*.88),H-6,-Math.PI/2+(Math.random()-.5)*.7,
        9+Math.random()*3.5,110+Math.floor(Math.random()*70),1,underRep,W,H,false);
      underTs.push(t); branch(t,0,underRep,W,H,underTs);
    }

    const overTs = mkSet(ctxs[1], overRep, .35);
    const overN = full ? 2 : 1;
    for(let i=0;i<overN;i++){
      const t=makeStem(W*(.08+Math.random()*.84),H*(.15+Math.random()*.6),
        Math.PI/2+(Math.random()-.5)*1.1,9,90+Math.floor(Math.random()*60),.35,overRep,W,H,false);
      overTs.push(t); branch(t,0,overRep,W,H,overTs);
    }

    if (reducedMotion){
      jobs.forEach(({x,ts})=>ts.forEach(t=>{for(let i=1;i<t.pts.length;i++){try{drawSeg(x,t,i)}catch(e){break}}}));
      return;
    }
    kick();
    clearInterval(sproutTimer); sprouts=0;
    sproutTimer = setInterval(()=>{
      if (document.hidden || sprouts>=20) return;
      const set = jobs[0];
      if (!set || !set.ts.length) return;
      const host = set.ts[Math.floor(Math.random()*set.ts.length)];
      if (!host || host.drawn<20) return;
      const i = Math.floor(host.drawn*(0.2+Math.random()*.7));
      const s = makeStem(host.pts[i][0],host.pts[i][1],
        host.angs[i]+(Math.random()<.5?1:-1)*(.6+Math.random()*.7),
        6.5, 14+Math.floor(Math.random()*20),
        .8, set.rep, set.W, set.H, Math.random()<.5);
      set.ts.push(s); sprouts++; kick();
    }, 3400);
  }

  let frames = 0;
  function annotate(job){
    /* once a river is fully grown, write its name in; when all five are
       done, mark the confluence */
    if (!job.rivers) return false;
    let busy=false;
    if (frames%3===0){
      job.rivers.forEach(t=>{
        try{
          if (t.drawn>=t.pts.length && t.label.shown<t.label.name.length){
            drawLabelChar(job.x, t.label); busy=true;
          }
        }catch(e){ t.label.shown=t.label.name.length; }
      });
    } else busy = job.rivers.some(t=>t.drawn>=t.pts.length && t.label.shown<t.label.name.length);
    if (!job.confluenceDrawn &&
        job.rivers.every(t=>t.drawn>=t.pts.length && t.label.shown>=t.label.name.length)){
      try{ drawConfluence(job.x, job.confluence[0], job.confluence[1]); }catch(e){}
      job.confluenceDrawn = true;
    }
    return busy;
  }
  function kick(){
    if (running) return; running=true;
    const step = () => {
      frames++;
      let alive=false;
      jobs.forEach(job=>{
        job.ts.forEach(t=>{
          try{
            if (t.delay>0){ t.delay--; alive=true; return; }
            if (t.parent && t.parent.drawn<t.spawnI){ alive=true; return; }
            for(let k=0;k<2 && t.drawn<t.pts.length;k++,t.drawn++) drawSeg(job.x,t,t.drawn);
            if (t.drawn<t.pts.length) alive=true;
          }catch(e){ t.drawn = t.pts.length; }
        });
        if (annotate(job)) alive=true;
      });
      if (alive) requestAnimationFrame(step); else running=false;
    };
    requestAnimationFrame(step);
  }

  /* if animation frames never come (background tab, prerender, occluded
     window), plant the garden fully grown rather than not at all */
  function finishInstantly(){
    jobs.forEach(job=>{
      job.ts.forEach(t=>{
        try{
          t.delay=0;
          while(t.drawn<t.pts.length){ drawSeg(job.x,t,t.drawn); t.drawn++; }
        }catch(e){ t.drawn=t.pts.length; }
      });
      if (job.rivers){
        job.rivers.forEach(t=>{
          try{ while(t.label.shown<t.label.name.length) drawLabelChar(job.x,t.label); }
          catch(e){ t.label.shown=t.label.name.length; }
        });
        if (!job.confluenceDrawn){
          try{ drawConfluence(job.x, job.confluence[0], job.confluence[1]); }catch(e){}
          job.confluenceDrawn = true;
        }
      }
    });
  }

  const boot = () => {
    buildGarden();
    const f0 = frames;
    setTimeout(()=>{ if (frames===f0) finishInstantly(); }, 2500);
  };
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) kick(); });
  if (document.readyState==='complete') boot();
  else addEventListener('load', boot);
  let rT; addEventListener('resize', ()=>{ clearTimeout(rT); rT=setTimeout(boot,300); });
})();
