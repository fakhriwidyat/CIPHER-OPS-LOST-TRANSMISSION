/* Pixel travellers for Novaris. All directional poses render locally on a 32 × 48 grid. */
(function (root) {
  'use strict';
  const palettes = {
    runner: { outline: '#081321', hair: '#142238', hairLight: '#36485f', skin: '#dda98b', skinLight: '#f2c5a0', skinShade: '#956b65', cloth: '#284559', clothLight: '#52778a', clothShade: '#172d40', accent: '#70e8e4', accentDark: '#2a899a', pants: '#19283e', pantsLight: '#36485d', boots: '#0b1628', sole: '#6d8b98', metal: '#8faab4', warm: '#e7ad6b' },
    aria: { outline: '#101324', hair: '#392c4c', hairLight: '#a37194', skin: '#dda99c', skinLight: '#f3c8b1', skinShade: '#9e6f7b', cloth: '#b69a7c', clothLight: '#ead0a4', clothShade: '#796b69', accent: '#b9e9dd', accentDark: '#6aaeb0', pants: '#34324c', pantsLight: '#62536a', boots: '#171b30', sole: '#a58f99', metal: '#c1b8bd', warm: '#d69fc2' }
  };
  palettes.kai = { ...palettes.runner, hair: '#1b2940', hairLight: '#536279', cloth: '#29445b', clothLight: '#68849a', accent: '#5ee5fa' };
  palettes.nyx = { ...palettes.runner, hair: '#d1d1e1', hairLight: '#f4edff', skin: '#bd9caa', skinLight: '#e7c6c4', cloth: '#493761', clothLight: '#88719d', clothShade: '#292238', accent: '#c0a0ff', accentDark: '#765ca6', pants: '#242039', pantsLight: '#544564' };
  palettes.bolt = { ...palettes.runner, hair: '#522c26', hairLight: '#b16840', skin: '#a76c4e', skinLight: '#d89e6b', skinShade: '#754b3d', cloth: '#9b613d', clothLight: '#e1a263', clothShade: '#543f32', accent: '#ffd587', accentDark: '#98703f', pants: '#343c42', pantsLight: '#667678', metal: '#b5c4bf' };
  palettes.iris = { ...palettes.runner, hair: '#203c37', hairLight: '#648473', skin: '#b57d63', skinLight: '#e4b08a', skinShade: '#7e5c53', cloth: '#346354', clothLight: '#7ba78b', clothShade: '#1f3c39', accent: '#a9f0b6', accentDark: '#54856c', pants: '#263936', pantsLight: '#516963' };
  // Field travellers: chunky silhouettes, warm leather and shaded long coats.
  // Coordinates stay in the existing 32 x 48 footprint, including all poses.
  const fieldPalettes = {
    kai: { coat: '#21616b', light: '#39858a', shade: '#163f4b', hat: '#34434a', hatLight: '#56636a', hair: '#70452f', hairLight: '#a76a40', skin: '#e5ac77', face: '#ffd19a', shadow: '#b97853', glow: '#75e4e0' },
    nyx: { coat: '#554260', light: '#816482', shade: '#352d46', hat: '#51404b', hatLight: '#806052', hair: '#a75d3b', hairLight: '#db965d', skin: '#e8b186', face: '#ffdab0', shadow: '#b97b68', glow: '#d9b4fa' },
    bolt: { coat: '#9a643e', light: '#cd9252', shade: '#5b4034', hat: '#58493b', hatLight: '#907454', hair: '#342d2b', hairLight: '#655042', skin: '#ad7655', face: '#d9a575', shadow: '#80523e', glow: '#ffda8b' },
    iris: { coat: '#3d6e58', light: '#719777', shade: '#274c42', hat: '#3d5041', hatLight: '#71816a', hair: '#382c32', hairLight: '#775348', skin: '#c38c68', face: '#edbc8b', shadow: '#95614f', glow: '#c4efa5' }
  };
  function drawField(ctx, type, pose) {
    const id = type === 'runner' ? 'kai' : type, p = fieldPalettes[id];
    const weight = pose.reduced ? 0 : pose.gaitWeight ?? (pose.moving ? 1 : 0);
    const cycle = (pose.time || 0) * Math.PI * 4;
    const quarter = value => Math.round(value * 4) / 4;
    const stride = quarter(Math.sin(cycle) * 2 * weight);
    const bob = quarter((1-Math.cos(cycle*2))*.5*weight);
    const side = ['left', 'right'].includes(pose.direction), back = pose.direction === 'up';
    const blink = !pose.reduced && (pose.time || 0) % 5.3 > 5.13;
    const ink = '#281f28', leather = '#70472f', leatherLight = '#a66c40';
    const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    // Rasterized polygons keep diagonal edges on the same integer pixel grid.
    const shape = (points, color) => {
      const ys = points.map(p => p[1]);
      for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
        const xs = [];
        points.forEach(([x1,y1], i) => { const [x2,y2] = points[(i+1)%points.length];
          if ((y1 <= y+.5 && y2 > y+.5) || (y2 <= y+.5 && y1 > y+.5)) xs.push(x1+(y+.5-y1)*(x2-x1)/(y2-y1)); });
        xs.sort((a,b)=>a-b);
        for(let i=0;i+1<xs.length;i+=2) r(Math.floor(xs[i]),y,Math.ceil(xs[i+1])-Math.floor(xs[i]),1,color);
      }
    };
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(pose.x || 0), Math.round(pose.y || 0));
    ctx.scale((pose.scale || 1)*(pose.aspect || 1),pose.scale || 1);
    r(-12,-1,24,2,'#040d1855'); r(-9,-2,18,4,'#040d1833');
    ctx.translate(-16,-48);
    if(pose.direction === 'left') {ctx.translate(32,0);ctx.scale(-1,1);}
    if(side) {
      // A complete profile pose. The former profile moved only the face while
      // leaving the hat, collar and equipment in their front-facing positions.
      const leg=(x,step)=>{const swing=quarter(step*.65),lift=Math.max(0,step);r(x,36,6,6,ink);r(x+swing,40-lift,6,6,ink);r(x+1+swing,40-lift,4,5,'#513e38');r(x+swing,44-lift,9,4,ink);r(x+1+swing,44-lift,6,2,'#76513b');};
      leg(12,-stride);leg(18,stride);
      ctx.save();ctx.translate(0,-bob);
      r(5,25,9,14,ink);r(6,26,7,11,leather);r(6,27,6,3,leatherLight);r(8,32,2,2,ink);
      shape([[13,23],[23,23],[26,30],[25,41],[12,41],[11,30]],ink);
      shape([[14,24],[22,24],[24,30],[23,39],[14,39],[13,30]],p.coat);
      r(14,26,2,11,p.light);r(22,29,2,10,p.shade);
      r(13,14,14,12,ink);r(14,15,12,9,p.hair);r(18,17,9,7,p.skin);r(20,18,7,5,p.face);r(27,20,2,2,p.skin);
      r(14,16,5,8,p.hair);r(15,17,2,5,p.hairLight);r(24,19,2,blink?1:3,ink);r(22,23,3,1,p.shadow);
      r(16,24,9,3,p.shade);r(17,24,8,1,p.glow);
      // All headgear shares the profile head's anchor, not the front anchor.
      if(id==='nyx') {
        shape([[10,15],[14,9],[19,7],[23,1],[28,2],[25,9],[26,14],[30,16],[29,18],[11,18]],ink);
        shape([[13,14],[17,10],[21,8],[24,3],[26,3],[23,10],[24,14]],p.hat);
        r(12,15,17,1,p.hatLight);r(14,17,4,10,p.hair);r(15,19,1,7,p.hairLight);
      }else if(id==='iris'){
        shape([[10,15],[14,12],[16,9],[24,9],[26,13],[30,16],[28,18],[11,18]],ink);
        r(16,11,8,3,p.hat);r(13,15,16,1,p.hatLight);r(10,17,4,13,p.hair);r(11,20,1,8,p.hairLight);
      }else{
        shape([[12,15],[14,10],[20,8],[26,10],[27,14],[30,15],[30,17],[12,17]],ink);
        r(15,11,10,3,p.hat);r(16,10,8,1,p.hatLight);r(14,15,15,1,id==='bolt'?leatherLight:p.hatLight);
        if(id==='bolt'){r(22,14,5,4,ink);r(23,15,3,2,'#b6c8b9');}
      }
      const armY=26+stride;
      r(18,armY,7,12,ink);r(19,armY+1,5,8,p.coat);r(19,armY+1,2,7,p.light);r(20,armY+9,4,2,p.face);
      if(id==='bolt'){r(20,armY+3,4,6,'#8b9b98');r(20,armY+5,4,1,p.glow);}
      if(id==='kai'){r(10,25,4,9,p.shade);r(7-stride,31,6,3,p.glow);}
      if(id==='iris'){r(27,28,2,19,ink);r(28,29,1,17,leatherLight);r(26,25,4,5,ink);r(27,26,2,2,p.glow);}
      if(pose.wave&&!pose.reduced){r(23,23,4,10,p.coat);r(24,20,3,5,p.face);}
      ctx.restore();ctx.restore();return;
    }
    // Boots stay planted while the coat and bag lift with each step.
    for(const [x,step] of [[10,stride],[19,-stride]]) {
      r(x,37,6,8+step,ink); r(x+1,38,4,7+step,'#513e38');
      r(x-2,44+step,8,4,ink); r(x-1,44+step,5,2,'#76513b'); r(x-2,47+step,8,1,'#a28464');
    }
    ctx.save();ctx.translate(0,-bob);
    // A real pack silhouette and rolled bed-kit, rather than a tiny chest badge.
    r(side?5:23,25,8,13,ink); r(side?6:24,26,6,10,leather);
    r(side?6:24,26,5,3,leatherLight); r(side?8:26,30,2,2,ink);
    r(side?6:24,36,5,2,'#50372d');r(side?5:24,23,6,3,ink);r(side?6:25,24,4,1,'#b68d62');
    // The lower coat has an asymmetric, stepped hem and a readable lapel.
    shape([[10,23],[22,23],[25,29],[26,40],[22,42],[8,41],[7,31]],ink);
    shape([[11,24],[21,24],[23,29],[24,39],[20,40],[9,39],[9,30]],p.coat);
    shape([[11,25],[14,25],[13,35],[10,38],[10,29]],p.light);
    r(21,28,2,10,p.shade);r(10,39,11,1,p.shade);r(17,27,1,12,p.shade);
    r(11,25,2,7,leather);r(21,25,2,8,leather);r(11,25,1,5,leatherLight);
    if(back) {
      r(11,25,12,12,ink);r(12,26,10,10,leather);r(13,27,8,3,leatherLight);
      r(16,29,2,4,ink);r(16,30,2,1,'#d3b77c');r(13,34,8,1,'#50372d');
    }
    // Arms and uncovered hands, with an optional greeting pose.
    const arm=(x,step)=>{r(x,26+step,5,11,ink);r(x+1,27+step,3,7,p.coat);r(x+1,27+step,1,6,p.light);r(x+1,34+step,3,2,p.face);};
    if(!side)arm(5,-stride);arm(side?19:24,stride);
    if(pose.wave&&!pose.reduced){r(25,24,4,8,p.coat);r(26,20+bob,3,5,p.face);}
    // A compact face beneath a large brim: close to the supplied proportions.
    const fx=side?14:10;
    r(fx-1,13,15,12,ink);r(fx,14,13,9,p.hair);r(fx+2,16,11,8,p.skin);
    r(fx+3,17,9,6,p.face);r(fx+5,23,6,2,p.skin);
    if(!back){
      r(fx+3,15,9,2,p.hair);r(fx+3,17,2,2,p.hairLight);r(fx+10,16,2,4,p.hair);
      r(fx+4,19,2,blink?1:3,ink);if(!side)r(fx+10,19,2,blink?1:3,ink);
      if(side)r(27,20,2,2,p.skin);r(fx+7,23,3,1,p.shadow);
    }else{r(10,15,14,10,p.hair);r(11,16,2,7,p.hairLight);}
    r(12,24,11,3,p.shade);r(13,24,9,1,p.glow);
    if(id==='kai'){
      // Soft field cap, long scarf, and courier radio.
      shape([[8,14],[9,9],[15,7],[23,8],[25,14]],ink);
      shape([[10,13],[11,10],[16,9],[22,10],[23,13]],p.hat);
      r(11,10,10,1,p.hatLight);r(7,13,19,3,ink);r(9,13,18,1,p.hatLight);
      r(8,25,4,10,p.shade);r(6-stride,32,6,3,p.glow);
      if(!back){r(19,29,4,7,ink);r(20,30,2,3,p.light);r(21,26,1,4,'#c5b799');r(20,31,1,1,p.glow);}
    }else if(id==='nyx'){
      // Copper bob and a folded signal hood, inspired by the reference's hat.
      shape([[6,14],[10,9],[15,6],[20,0],[26,1],[24,7],[24,13],[29,15],[28,17],[7,17]],ink);
      shape([[9,13],[13,10],[17,7],[21,2],[24,2],[22,8],[22,13]],p.hat);
      shape([[14,10],[19,6],[21,3],[23,3],[20,9]],p.hatLight);
      r(8,14,19,1,leatherLight);r(10,15,15,1,p.hatLight);r(21,13,3,2,p.glow);
      r(8,17,3,10,p.hair);r(9,19,1,6,p.hairLight);r(23,18,3,9,p.hair);
      if(!back){r(7,31,5,7,ink);r(8,32,3,4,p.light);r(9,33,1,2,p.glow);}
    }else if(id==='bolt'){
      // A broad work jacket, pilot cap and goggles distinguish his build.
      r(7,24,18,4,ink);r(8,25,16,2,p.light);
      shape([[8,15],[9,10],[14,8],[22,9],[25,14],[24,17],[8,17]],ink);
      r(10,11,13,3,p.hat);r(12,10,9,1,p.hatLight);r(8,14,18,2,leather);
      if(!back){r(11,13,5,4,ink);r(18,13,5,4,ink);r(12,14,3,2,'#9fbeb8');r(19,14,3,2,'#d9cf98');r(16,14,2,1,'#ba9470');r(15,23,6,1,p.hair);}
      r(25,29,4,8,ink);r(26,30,2,6,'#8b9b98');r(26,32,2,1,p.glow);
      if(!back){r(8,35,4,6,ink);r(9,36,2,4,'#b9b69d');r(7,35,5,2,'#b9b69d');}
    }else{
      // Wide rain hat and a long braid, plus the navigator's antenna staff.
      r(back?23:25,17,4,12,ink);r(back?24:26,18,2,10,p.hair);r(26,21,2,1,p.hairLight);r(26,25,2,1,p.hairLight);
      shape([[5,15],[10,12],[12,8],[21,8],[24,12],[28,15],[26,17],[6,17]],ink);
      shape([[9,14],[13,10],[20,10],[23,14]],p.hat);r(12,10,9,1,p.hatLight);r(7,15,19,1,p.hatLight);r(13,13,9,1,leatherLight);
      r(3,27,2,20,ink);r(4,28,1,18,leatherLight);r(2,23,4,6,ink);r(3,24,2,3,p.glow);
      if(!back){r(20,31,5,6,ink);r(21,32,3,3,p.shade);r(21,32,2,1,p.glow);}
    }
    ctx.restore();ctx.restore();
  }
  function drawAria(ctx,pose) {
    const ink='#202536',hair='#c0ced1',hairShade='#748c9c',ivory='#d6c9a6',light='#f2e3bf',shade='#8f957f',copper='#b97954',skin='#e7b38f';
    const side=['left','right'].includes(pose.direction),back=pose.direction==='up';
    const time=pose.time||0,bob=pose.reduced?0:Math.floor(time*1.3)%2;
    const blink=!pose.reduced&&time%5.3>5.13;
    const step=pose.moving&&!pose.reduced?[0,1,0,-1][Math.floor(time*9)%4]:0;
    const r=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(pose.x||0),Math.round(pose.y||0));ctx.scale((pose.scale||1)*(pose.aspect||1),pose.scale||1);
    r(-11,-1,22,2,'#040d1844');ctx.translate(-16,-48);
    if(pose.direction==='left'){ctx.translate(32,0);ctx.scale(-1,1);}
    for(const [x,s] of [[10,step],[19,-step]]){r(x,34,6,12+s,ink);r(x+1,35,4,9+s,'#3b4d60');r(x-1,44+s,8,4,ink);r(x,45+s,6,1,'#8faaa8');}
    ctx.save();ctx.translate(0,-bob);
    // Aria is a resident communications engineer: no traveller hat or backpack.
    r(side?12:8,21,side?13:17,16,ink);r(side?13:9,22,side?11:15,14,ivory);
    r(side?14:10,23,3,11,light);r(side?22:22,24,2,12,shade);
    r(16,22,2,13,'#364d60');r(9,34,15,2,shade);r(14,35,4,2,ink);
    const arm=(x)=>{r(x,23,5,12,ink);r(x+1,24,3,8,ivory);r(x+1,24,1,7,light);r(x+1,32,3,2,skin);};
    if(!side)arm(5);arm(side?20:24);
    // High silver bun, swept hair and small copper communications earpiece.
    r(side?10:8,5,side?12:14,6,ink);r(side?11:9,6,side?10:12,4,hairShade);
    r(side?12:10,6,7,2,hair);r(side?12:8,9,side?15:17,14,ink);
    r(side?13:9,10,side?13:15,11,hairShade);
    if(!back){
      const x=side?18:11;
      r(x,13,side?9:12,9,skin);r(x+1,14,side?7:10,6,'#ffcfab');
      r(side?14:9,10,side?12:15,4,hair);r(side?15:10,14,3,6,hairShade);
      r(side?24:13,16,2,blink?1:3,ink);if(!side)r(20,16,2,blink?1:3,ink);
      if(side)r(27,18,2,2,skin);r(side?22:17,21,3,1,'#ae7969');
      r(side?15:8,16,3,6,ink);r(side?16:9,17,2,3,copper);r(side?17:10,20,4,1,'#a9e4d9');
    }else{r(10,11,13,10,hair);r(11,12,3,7,hairShade);r(14,21,7,2,hairShade);}
    r(side?18:12,22,10,2,'#3a676c');r(side?19:13,22,7,1,'#a2ddd0');
    if(!back){
      r(side?16:19,26,4,2,copper);r(side?17:20,26,2,1,'#f4d798');
      // Handheld diagnostic tablet identifies her role at room and portrait size.
      r(side?20:6,29,side?7:10,10,ink);r(side?21:7,30,side?5:8,7,'#345d68');
      r(side?22:8,31,side?3:6,1,'#b4e6cf');r(side?22:8,33,3,1,'#7ba6a5');r(side?21:7,37,4,1,skin);
    }
    if(pose.wave&&!pose.reduced){r(25,22,4,9,ivory);r(26,17,3,6,skin);}
    ctx.restore();ctx.restore();
  }
  function drawRaw(target, type, pose = {}) {
    if (type === 'aria') return drawAria(target, pose);
    if (type === 'runner' || fieldPalettes[type]) return drawField(target, type, pose);
    const p = palettes[type] || palettes.runner;
    const scale = pose.scale || 1;
    const phase = pose.moving ? Math.floor((pose.time || 0) * 9) % 4 : 0;
    const stride = pose.moving ? [0, 2, 0, -2][phase] : 0;
    const bob = pose.moving ? phase % 2 : pose.reduced ? 0 : Math.floor((pose.time || 0) * 1.4) % 2;
    const direction = pose.direction || 'down';
    const side = direction === 'left' || direction === 'right';
    const back = direction === 'up';
    const blink = !pose.reduced && (pose.time || 0) % 5.1 > 4.96;
    target.save();
    target.imageSmoothingEnabled = false;
    target.translate(Math.round(pose.x || 0), Math.round(pose.y || 0));
    // Compensate for the room canvas on narrow displays so sprite pixels stay square.
    target.scale(scale * (pose.aspect || 1), scale);
    // A stepped contact shadow fixes the feet to the room's floor.
    target.fillStyle = '#060f1b55'; target.fillRect(-13, -2, 26, 3); target.fillRect(-9, -3, 18, 5);
    target.translate(-16, -48);
    if (direction === 'left') { target.translate(32, 0); target.scale(-1, 1); }
    const rect = (x, y, w, h, color) => { target.fillStyle = p[color] || color; target.fillRect(x, y, w, h); };
    function limb(x, shift) {
      rect(x, 33, 7, 10 + Math.max(0, shift), 'outline');
      rect(x + 1, 34, 5, 7 + Math.max(0, shift), 'pants');
      rect(x + 1, 35, 2, 5, 'pantsLight');
      rect(x - 1, 42 + shift, 9, 5, 'boots');
      rect(x, 43 + shift, 5, 2, 'pantsLight');
      rect(x - 1, 46 + shift, 9, 1, 'sole');
    }
    limb(side ? 12 : 8, stride);
    limb(side ? 17 : 18, -stride);
    target.save(); target.translate(0, -bob);
    // Shoulder line, split coat tails, reinforced seams, and equipment belt.
    rect(side ? 10 : 6, 20, side ? 15 : 21, 15, 'outline');
    rect(side ? 11 : 7, 20, side ? 13 : 19, 13, 'cloth');
    rect(side ? 12 : 8, 21, side ? 4 : 5, 10, 'clothLight');
    rect(side ? 22 : 22, 23, 3, 10, 'clothShade');
    rect(side ? 12 : 7, 31, side ? 12 : 19, 4, 'clothShade');
    rect(side ? 11 : 7, 34, side ? 13 : 8, 3, 'outline');
    if (!side) rect(18, 34, 8, 3, 'outline');
    rect(8, 32, 17, 2, 'pants'); rect(15, 32, 4, 2, 'metal');
    if (back) {
      rect(10, 21, 12, 11, 'outline'); rect(11, 22, 10, 9, 'clothShade');
      rect(12, 23, 8, 2, 'clothLight'); rect(14, 26, 4, 1, 'accentDark');
      rect(12, 29, 8, 1, 'metal');
    } else {
      rect(side ? 21 : 16, 21, 1, 10, 'metal');
      rect(side ? 15 : 19, 24, 5, 5, 'clothShade');
      rect(side ? 15 : 19, 24, 5, 1, 'clothLight');
      rect(side ? 14 : 10, 23, 3, 3, 'accentDark');
      rect(side ? 15 : 11, 23, 2, 1, 'accent');
      rect(side ? 15 : 10, 28, 3, 1, 'warm');
    }
    // Arms swing opposite the feet. Hands and gloves remain readable at world scale.
    function arm(x, offset, foreground) {
      rect(x, 21 + offset, 5, 11, 'outline'); rect(x + 1, 22 + offset, 3, 8, 'cloth');
      rect(x + 1, 22 + offset, 1, 6, 'clothLight'); rect(x + 1, 30 + offset, 3, 3, 'skinShade');
      rect(x, 32 + offset, 5, 3, 'boots');
      if (foreground) rect(x + 1, 28 + offset, 3, 1, 'accent');
    }
    if (!side) arm(4, -stride, false);
    arm(side ? 14 : 25, stride, true);
    if (pose.wave && !pose.reduced) {
      rect(side ? 16 : 26, 21, 4, 8, 'cloth'); rect(side ? 17 : 27, 16 + bob, 3, 6, 'skinLight');
    }
    // High collar, loose scarf tail, and a small radio clip.
    rect(side ? 12 : 8, 18, side ? 12 : 16, 4, 'outline');
    rect(side ? 13 : 9, 18, side ? 10 : 14, 2, 'accentDark');
    rect(side ? 16 : 10, 19, side ? 8 : 12, 2, 'accent');
    if (type !== 'aria') { rect(back ? 9 : side ? 9 : 8, 21, 3, 7, 'accentDark'); rect(back ? 10 : side ? 7 - stride : 7, 26, side ? 5 : 4, 2, 'accent'); }
    // Sculpted head, hair, brow, headset, and face lighting.
    rect(side ? 12 : 9, 5, side ? 13 : 15, 14, 'outline');
    rect(side ? 17 : 11, 9, side ? 8 : 11, 8, 'skinShade');
    rect(side ? 19 : 12, 10, side ? 7 : 10, 6, 'skin');
    rect(side ? 23 : 13, 11, side ? 4 : 8, 3, 'skinLight');
    rect(side ? 25 : 13, 16, side ? 3 : 7, 2, 'skin');
    if (side) { rect(26, 12, 2, 3, 'skin'); if (!back) rect(24, blink ? 13 : 12, 2, blink ? 1 : 2, 'outline'); }
    else if (!back) {
      rect(12, blink ? 13 : 12, 3, blink ? 1 : 2, 'outline'); rect(19, blink ? 13 : 12, 3, blink ? 1 : 2, 'outline');
      if (!blink) { rect(13, 12, 1, 1, '#e2f4ee'); rect(20, 12, 1, 1, '#e2f4ee'); }
      rect(16, 14, 1, 2, 'skinShade'); rect(15, 17, 4, 1, 'skinShade');
    }
    if (type === 'aria') {
      rect(side ? 9 : 7, 5, side ? 15 : 18, 7, 'hair'); rect(side ? 11 : 9, 3, side ? 12 : 14, 4, 'hair');
      rect(side ? 10 : 7, 10, 4, 11, 'hair'); rect(side ? 11 : 23, 10, 3, side ? 10 : 8, 'hair');
      rect(side ? 12 : 10, 5, 10, 2, 'hairLight'); rect(side ? 10 : 8, 10, 2, 9, 'hairLight');
      rect(side ? 17 : 12, 8, 6, 3, 'hair'); rect(side ? 21 : 18, 9, 3, 2, 'hairLight');
      if (back) { rect(10, 8, 13, 12, 'hair'); rect(11, 9, 2, 10, 'hairLight'); }
    } else {
      rect(side ? 11 : 8, 6, side ? 13 : 16, 5, 'hair'); rect(side ? 13 : 10, 4, side ? 10 : 13, 3, 'hair');
      rect(side ? 14 : 10, 5, side ? 9 : 12, 2, 'hairLight');
      rect(side ? 18 : 9, 9, side ? 7 : 7, 3, 'hair'); rect(side ? 11 : 8, 10, 3, 5, 'hair');
      if (back) { rect(9, 8, 15, 11, 'hair'); rect(10, 10, 2, 6, 'hairLight'); rect(13, 18, 7, 1, 'clothLight'); }
    }
    // Headset has a tiny cyan status light and a boom microphone.
    const ear = side ? 14 : back ? 22 : 9;
    rect(ear, 11, 4, 6, 'outline'); rect(ear + 1, 12, 2, 3, 'metal'); rect(ear + 1, 12, 1, 2, 'accent');
    if (!back) { rect(ear + 2, 16, 4, 1, 'metal'); rect(ear + 5, 15, 2, 2, 'outline'); }
    target.restore(); target.restore();
  }
  // Composite on a 4x integer grid, with quarter-pixel gait in the logical sprite.
  // Whole-sprite fractional placement keeps world movement continuous. Scaling individual rectangles can
  // produce hairline seams at fractional world/CSS scales on Safari and Chrome.
  let spriteBuffer;
  function draw(target, type, pose = {}) {
    if (typeof document === 'undefined' || !target.drawImage) return drawRaw(target,type,pose);
    if (!spriteBuffer) { spriteBuffer=document.createElement('canvas');spriteBuffer.width=192;spriteBuffer.height=224; }
    const context=spriteBuffer.getContext('2d');context.clearRect(0,0,192,224);
    drawRaw(context,type,{...pose,x:96,y:208,scale:4,aspect:1});
    const sx=(pose.scale||1)*(pose.aspect||1),sy=pose.scale||1;
    const x=(pose.x||0)-24*sx,y=(pose.y||0)-52*sy;
    target.save();target.imageSmoothingEnabled=false;
    target.drawImage(spriteBuffer,x,y,Math.round(48*sx),Math.round(56*sy));target.restore();
  }
  function portrait(type = 'aria', createCanvas) {
    const sheet = createCanvas(128, 144), p = sheet.getContext('2d');
    p.fillStyle = palettes[type]?.clothShade || (type === 'aria' ? '#30273e' : '#162d40'); p.fillRect(0, 0, 128, 144);
    p.fillStyle = '#6faeb111'; for (let y = 0; y < 144; y += 8) p.fillRect(0, y, 128, 1);
    p.fillStyle = '#8ecbc72a'; p.fillRect(11, 14, 1, 95); p.fillRect(11, 109, 85, 1);
    if (type === 'null') {
      p.fillStyle = '#111425'; p.fillRect(29, 35, 70, 109); p.fillRect(39, 21, 50, 20);
      p.fillStyle = '#302940'; p.fillRect(35, 40, 58, 66); p.fillStyle = '#090f1d'; p.fillRect(43, 46, 42, 43);
      p.fillStyle = '#b48acb'; p.fillRect(49, 62, 9, 3); p.fillRect(72, 62, 9, 3);
      p.fillStyle = '#75648d'; p.fillRect(44, 104, 39, 3); p.fillRect(59, 113, 3, 31);
    } else draw(p, type, { x: 64, y: 207, scale: 4.2, direction: 'down', reduced: true });
    return sheet.toDataURL();
  }
  const api = { draw, portrait, palettes };
  root.CharacterArt = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
