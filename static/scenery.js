// Детерминированные детали окружения: пейзаж кэшируется, рябь рисуется отдельно.
const landscape = document.createElement('canvas');
landscape.width = 1600; landscape.height = 840;
const scenery = landscape.getContext('2d');
let landscapeKey = '';
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function shape(c, points, color) {
  c.fillStyle = color; c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill();
}
function tree(c, x, y, h, color, pine) {
  c.strokeStyle = color; c.lineWidth = Math.max(1, h / 28); c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-h); c.stroke();
  if (pine) {
    for(let j=0;j<5;j++) { const cy=y-h+j*h*.17, r=h*(.12+j*.035); shape(c,[[x,cy],[x-r,cy+h*.35],[x+r,cy+h*.35]],color); }
  } else {
    c.fillStyle=color;
    for(let j=0;j<9;j++) { c.beginPath(); c.ellipse(x+(noise(x+j)*2-1)*h*.22,y-h*.68-noise(j+x+8)*h*.3,h*(.13+noise(j+40)*.1),h*.23,0,0,7); c.fill(); }
  }
}
function paintLandscape(l) {
  const c=scenery; c.setTransform(2,0,0,2,0,0);
  if(l.code==='sea'){paintSea(c);return;}
  let gr=c.createLinearGradient(0,0,0,260); gr.addColorStop(0,'#789faf'); gr.addColorStop(.65,'#cfdbd3'); gr.addColorStop(1,'#e7e3c9');
  c.fillStyle=gr; c.fillRect(0,0,800,420);
  gr=c.createRadialGradient(577,67,2,577,67,110); gr.addColorStop(0,'rgba(255,246,205,.85)'); gr.addColorStop(1,'rgba(255,246,205,0)'); c.fillStyle=gr; c.fillRect(450,0,260,190);
  c.fillStyle='#f8eed0'; c.beginPath(); c.arc(577,67,15,0,7); c.fill();
  for(let j=0;j<7;j++) {
    c.fillStyle='rgba(245,244,224,.2)'; c.beginPath(); c.ellipse(60+j*119,42+noise(j)*45,65+noise(j+2)*50,4+noise(j+4)*5,-.04,0,7); c.fill();
  }
  for(let layer=0;layer<3;layer++) {
    const base=192+layer*17, pts=[[0,250],[0,base]];
    for(let x=0;x<=820;x+=20) pts.push([x,base-14*Math.sin(x*.009+layer)-10*Math.sin(x*.018+layer*2)]);
    pts.push([800,255]); shape(c,pts,['#91aaa0','#708f7e','#4e7360'][layer]);
    for(let i=0;i<75;i++) { const x=i*11, y=base-14*Math.sin(x*.009+layer)-10*Math.sin(x*.018+layer*2); tree(c,x,y,12+noise(i+layer*99)*37,['#8ba599','#6a8977','#466a55'][layer],l.forest); }
  }
  gr=c.createLinearGradient(0,245,0,420); gr.addColorStop(0,l.forest?'#6e8970':l.current?'#7d9c89':'#73938a'); gr.addColorStop(.25,l.forest?'#496c52':l.current?'#567f6c':'#527d79'); gr.addColorStop(1,l.forest?'#253f35':l.current?'#2c5b51':'#224f54'); c.fillStyle=gr; c.fillRect(0,247,800,173);
  // Отражения деревьев с разной длиной и прозрачностью.
  for(let i=0;i<210;i++) {
    const x=noise(i+93)*800, y=250+noise(i+97)*90;
    c.fillStyle=`rgba(31,65,53,${.025+noise(i)*.07})`; c.fillRect(x,y,1+noise(i+1)*25,1+noise(i+2)*4);
  }
  for(let i=0;i<120;i++) {
    const y=250+noise(i+64)*160, x=577+(noise(i+48)-.5)*(y-230)*1.2;
    c.fillStyle=`rgba(245,222,163,${.04+noise(i)*.16})`; c.fillRect(x,y,3+noise(i+3)*25,.6);
  }
  // Ближний причал рисуется отдельно: его перспектива направлена от камеры к воде.
}
function drawEnvironment(l, time) {
  if(landscapeKey!==sl.value) {paintLandscape(l);landscapeKey=sl.value;}
  g.drawImage(landscape,0,0,800,420);
  for(let i=0;i<85;i++) {
    const y=253+noise(i+300)*165, speed=l.current?12:3;
    const x=(noise(i+800)*840+time*speed*(.4+noise(i)))%850-25;
    g.strokeStyle=`rgba(205,225,213,${.05+noise(i+1)*.13})`;g.lineWidth=.6;
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+7,y-1, x+8+noise(i+2)*22,y);g.stroke();
  }
  // Камыш на ближнем плане, с лёгким движением от ветра.
  for(let i=0;i<39;i++) {
    const x=noise(i+100)*100, y=359+noise(i+45)*66, h=24+noise(i+65)*48, sway=Math.sin(time*1.2+i)*2;
    g.strokeStyle=i%2?'#334b32':'#647446';g.lineWidth=1.3;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-4,y-h*.5,x+sway,y-h);g.stroke();
    g.beginPath();g.moveTo(x,y-5);g.quadraticCurveTo(x+14,y-h*.7,x+18,y-h*.6);g.stroke();
    if(i%3===0){g.strokeStyle='#665239';g.lineWidth=3;g.beginPath();g.moveTo(x+sway,y-h);g.lineTo(x+sway,y-h+10);g.stroke();}
  }
  // Птицы над дальним берегом.
  g.strokeStyle='rgba(48,70,66,.65)';g.lineWidth=1;
  for(let i=0;i<3;i++){const x=325+i*21+Math.sin(time*.08)*15,y=85+i%2*9;g.beginPath();g.moveTo(x-4,y);g.quadraticCurveTo(x-2,y-3,x,y);g.quadraticCurveTo(x+2,y-3,x+5,y-1);g.stroke();}
}
function drawFirstPersonDock() {
  shape(g, [[202,367],[598,367],[800,420],[0,420]], '#69553d');
  for (let j=0;j<5;j++) {
    const a=j/5, b=(j+1)/5, y=367+53*a*a, bottom=367+53*b*b;
    const left=202*(1-a*a), right=800-left;
    shape(g, [[left,y],[right,y],[800-202*(1-b*b),bottom-1],[202*(1-b*b),bottom-1]], j%2?'#9b8563':'#ad9670');
    g.strokeStyle='rgba(65,45,25,.28)'; g.lineWidth=.6;
    for(let k=0;k<5;k++) {g.beginPath();g.moveTo(left+12,y+(bottom-y)*k/5);g.bezierCurveTo(300,y+3,510,bottom-3,right-12,y+(bottom-y)*k/5);g.stroke();}
    for(const x of [left+18,right-18]) {g.fillStyle='#534b3b';g.beginPath();g.ellipse(x,(y+bottom)/2,1.5,.8,0,0,7);g.fill();}
  }
  g.strokeStyle='rgba(60,42,26,.5)';g.lineWidth=1;
  for(const x of [260,400,540]) {g.beginPath();g.moveTo(x,367);g.lineTo(400+(x-400)*2.1,420);g.stroke();}
}

// Только руки и снасть: положение камеры совпадает со взглядом рыбака.
function drawFirstPersonRod(tx, ty, time) {
  const lift = S==='charge' ? pw*30 : S==='fly' ? Math.sin(Math.min(1,cast)*Math.PI)*18 : 0;
  const hx=590, hy=374-lift;
  g.save();g.lineCap='round';
  const sleeve=g.createLinearGradient(580,330,710,430);
  sleeve.addColorStop(0,'#718064');sleeve.addColorStop(.5,'#495d46');sleeve.addColorStop(1,'#283f35');
  shape(g,[[800,420],[673,420],[572,376-lift],[590,344-lift],[695,376]],sleeve);
  g.strokeStyle='#8a9477';g.lineWidth=1.3;g.beginPath();g.moveTo(612,368-lift);g.lineTo(710,410);g.stroke();
  g.save();g.translate(hx,hy);g.rotate(-.55);
  const skin=g.createLinearGradient(-12,-20,15,18);skin.addColorStop(0,'#e1b58a');skin.addColorStop(.6,'#bd8e68');skin.addColorStop(1,'#805940');
  g.fillStyle=skin;g.beginPath();g.roundRect(-17,-23,34,49,12);g.fill();g.restore();
  const rodColor=['#ab8750','#526b62','#384849'][+sr.value] || '#ab8750';
  g.strokeStyle='#252f2b';g.lineWidth=10;g.beginPath();g.moveTo(624,420);g.lineTo(hx,hy);g.stroke();
  g.strokeStyle='#b89b68';g.lineWidth=8;g.beginPath();g.moveTo(615,406);g.lineTo(563,333-lift);g.stroke();
  g.strokeStyle='#312e24';g.lineWidth=1;
  for(let i=0;i<9;i++){g.beginPath();g.moveTo(574+i*3,345-lift+i*4);g.lineTo(581+i*3,342-lift+i*4);g.stroke();}
  const cx=(563+tx)/2-20, cy=(333-lift+ty)/2-(S==='reel'?t*65:12);
  for(const [width,color] of [[5,'#283b33'],[3,rodColor],[.7,'#d0c5a1']]){
    g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(563,333-lift);g.quadraticCurveTo(cx,cy,tx,ty);g.stroke();
  }
  g.strokeStyle='#bfc7ba';g.lineWidth=1;
  for(const u of [.25,.5,.75,1]){const x=(1-u)*(1-u)*563+2*(1-u)*u*cx+u*u*tx, y=(1-u)*(1-u)*(333-lift)+2*(1-u)*u*cy+u*u*ty;g.beginPath();g.ellipse(x+3,y+3,3,4,-.5,0,7);g.stroke();}
  g.fillStyle='#253e38';g.beginPath();g.ellipse(572,385-lift,14,18,-.4,0,7);g.fill();
  g.strokeStyle='#b6b9a2';g.lineWidth=3;g.beginPath();g.ellipse(572,382-lift,10,12,-.4,0,7);g.stroke();
  const crank=S==='reel'&&hold ? time*13 : 1;
  const kx=550+Math.cos(crank)*10, ky=389-lift+Math.sin(crank)*9;
  g.strokeStyle='#a3ab95';g.lineWidth=3;g.beginPath();g.moveTo(571,389-lift);g.lineTo(kx,ky);g.stroke();
  g.fillStyle='#252e29';g.beginPath();g.ellipse(kx,ky,5,3,-.5,0,7);g.fill();
  // Пальцы обхватывают рукоять, не перекрывая вершинку.
  g.strokeStyle='#d5a67d';g.lineWidth=6;
  for(let i=0;i<3;i++){g.beginPath();g.moveTo(578+i*4,360-lift+i*6);g.quadraticCurveTo(594+i*3,360-lift+i*6,592+i*3,367-lift+i*6);g.stroke();}
  if(S==='reel'){
    shape(g,[[331,420],[421,420],[548,394-lift],[544,374-lift],[499,380-lift]],sleeve);
    g.fillStyle='#c69b75';g.beginPath();g.ellipse(kx-7,ky+2,17,10,-.3,0,7);g.fill();
  }
  g.restore();
}
