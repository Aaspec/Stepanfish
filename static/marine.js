// Открытое море: горизонт не качается, лодка и снасть движутся вместе.
function paintSea(c) {
  let sky=c.createLinearGradient(0,0,0,190);sky.addColorStop(0,'#6f9fb9');sky.addColorStop(1,'#e5e9db');
  c.fillStyle=sky;c.fillRect(0,0,800,190);
  const sun=c.createRadialGradient(590,65,5,590,65,100);sun.addColorStop(0,'#fff4cb');sun.addColorStop(1,'#fff4cb00');c.fillStyle=sun;c.fillRect(480,0,220,180);
  c.fillStyle='#fff3cc';c.beginPath();c.arc(590,65,12,0,7);c.fill();
  for(let i=0;i<8;i++){c.fillStyle='rgba(247,246,229,.3)';c.beginPath();c.ellipse(i*125,36+noise(i)*60,70,5,0,0,7);c.fill();}
  shape(c,[[0,181],[25,168],[43,174],[65,163],[98,183]],'#8aabb6');
  let water=c.createLinearGradient(0,183,0,420);water.addColorStop(0,'#779fae');water.addColorStop(.15,'#3e7d96');water.addColorStop(1,'#153e59');c.fillStyle=water;c.fillRect(0,183,800,237);
  c.strokeStyle='#d2ddd5';c.lineWidth=.6;c.beginPath();c.moveTo(0,183);c.lineTo(800,183);c.stroke();
  for(let i=0;i<90;i++){let y=190+noise(i+33)*230; c.fillStyle=`rgba(247,234,187,${noise(i)*.16})`;c.fillRect(590+(noise(i+42)-.5)*(y-180)*1.1,y,4+noise(i+2)*24,1);}
}
function drawSea(time) {
  if(landscapeKey!=='sea'){scenery.setTransform(2,0,0,2,0,0);paintSea(scenery);landscapeKey='sea';}
  g.drawImage(landscape,0,0,800,420);
  for(let i=0;i<52;i++){
    const depth=noise(i+20), y=188+depth*240, x=(noise(i+400)*920+time*(2+depth*7))%920-60;
    g.strokeStyle=`rgba(201,227,230,${.1+depth*.2})`;g.lineWidth=.5+depth;
    g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+10,y-2-Math.sin(time*1.5+i)*depth*3,x+25,y+2,x+40+depth*50,y);g.stroke();
  }
  g.strokeStyle='#354f5a';g.lineWidth=1;
  for(let i=0;i<4;i++){const x=(120+i*137+time*3)%850,y=65+Math.sin(time+i)*3;g.beginPath();g.moveTo(x-5,y);g.quadraticCurveTo(x-2,y-4,x,y);g.quadraticCurveTo(x+3,y-4,x+6,y);g.stroke();}
}
function drawBoat(time) {
  const tilt=Math.sin(time*.85)*.012, bob=Math.sin(time*1.3)*2.5;
  g.translate(400,390+bob);g.rotate(tilt);g.translate(-400,-390);
  shape(g,[[400,310],[625,369],[765,420],[35,420],[175,369]],'#cad1c0');
  shape(g,[[400,326],[598,378],[690,420],[110,420],[202,378]],'#647d7c');
  shape(g,[[400,326],[202,378],[110,420],[151,420],[232,382],[400,342],[568,382],[650,420],[690,420],[598,378]],'#344e52');
  shape(g,[[194,383],[606,383],[638,400],[162,400]],'#b49c72');
  g.strokeStyle='#79674c';g.lineWidth=2;g.beginPath();g.moveTo(180,391);g.lineTo(621,391);g.stroke();
  g.strokeStyle='#e6e5cc';g.lineWidth=5;g.beginPath();g.moveTo(400,311);g.lineTo(175,370);g.lineTo(35,420);g.moveTo(400,311);g.lineTo(625,370);g.lineTo(765,420);g.stroke();
  g.strokeStyle='#b4bba4';g.lineWidth=2;g.beginPath();g.ellipse(400,333,8,3,0,0,7);g.stroke();
  for(let i=0;i<5;i++){g.strokeStyle='#a69870';g.beginPath();g.arc(350,365,10+i*2,.2,5.8);g.stroke();}
}
