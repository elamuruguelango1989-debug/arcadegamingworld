/* Additional games share the arcade's dialog and device-local score storage. */
const ArcadeExtras = (() => {
  const games = [...ArcadeMore.games,
    {id:'2048',name:'2048',cat:'Puzzle',desc:'Slide, combine, and chase the magic number.',art:'2048',bg:'#443525',color:'#ffce87',tag:'NEW · NUMBER MAGIC',time:'One more move'},
    {id:'bricks',name:'Brick Breaker',cat:'Arcade',desc:'Keep the ball flying. Clear every brick.',art:'▰ ▰ ▰<br>　●',bg:'#293453',color:'#98ccff',tag:'NEW · BOUNCE BACK',time:'3 lives · 30 bricks'}
  ];
  function slide(board, direction) {
    const next = board.slice(); let gain = 0;
    for (let line = 0; line < 4; line++) {
      const indices = Array.from({length:4}, (_,i) => direction==='left'?line*4+i:direction==='right'?line*4+3-i:direction==='up'?i*4+line:(3-i)*4+line);
      const values = indices.map(i=>board[i]).filter(Boolean), merged=[];
      for(let i=0;i<values.length;i++) {
        if(values[i]===values[i+1]) {const value=values[i]*2;merged.push(value);gain+=value;i++;}
        else merged.push(values[i]);
      }
      indices.forEach((index,i)=>{next[index]=merged[i]||0;});
    }
    return {board:next,gain,changed:next.some((v,i)=>v!==board[i])};
  }
  function canMove(board) {
    return board.some(v=>!v)||board.some((v,i)=>(i%4<3&&v===board[i+1])||(i<12&&v===board[i+4]));
  }
  function mount(id, shared) { return ArcadeMore.games.some(g=>g.id===id)?ArcadeMore.mount(id,shared):id==='2048'?mount2048(shared):mountBricks(shared); }
  function mount2048({area,instructions,shell,status,best}) {
    instructions.textContent='Use arrow keys, WASD, the buttons, or swipe the board. Combine matching tiles to reach 2048. Each tile can merge once per move.';
    shell('<div class="tiles2048" role="group" aria-label="2048 game board" tabindex="0"></div><div class="extra-controls">'+[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([dir,icon])=>`<button data-slide="${dir}" aria-label="Move ${dir}">${icon}</button>`).join('')+'</div>');
    const grid=area.querySelector('.tiles2048');let board=Array(16).fill(0),score=0,won=false,over=false;
    function addTile(){const empty=board.map((v,i)=>v?-1:i).filter(i=>i>=0);if(empty.length)board[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;}
    function draw(){grid.innerHTML=board.map(v=>{const colors={2:'#45405a',4:'#5b4b75',8:'#77609d',16:'#9669ad',32:'#ba729d',64:'#d68183',128:'#dc9d67',256:'#d3b559',512:'#a3bb57',1024:'#77ad60',2048:'#c5ff76'};return `<div class="tile2048" aria-label="${v||'Empty'}" style="background:${colors[v]||(v?'#c5ff76':'#292b40')};${v>=2048?'color:#17210e;':''}${v>=1024?'font-size:clamp(17px,5vw,27px)':''}">${v||''}</div>`}).join('');
      status().textContent=`${over?'No moves left! · ':won?'2048 reached! Keep going · ':''}Score: ${score} · Best: ${best('2048',score)}`;
      area.querySelectorAll('[data-slide]').forEach(b=>b.disabled=over);
    }
    function move(dir){if(over)return;const result=slide(board,dir);if(!result.changed)return;board=result.board;score+=result.gain;addTile();won=won||board.some(v=>v>=2048);over=!canMove(board);draw();}
    const key=e=>{const dir={ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key];if(dir){e.preventDefault();move(dir);}};
    window.addEventListener('keydown',key);
    area.querySelectorAll('[data-slide]').forEach(b=>b.onclick=()=>move(b.dataset.slide));
    let touch=null;
    grid.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};grid.setPointerCapture(e.pointerId);});
    grid.addEventListener('pointerup',e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
    grid.addEventListener('pointercancel',()=>touch=null);
    addTile();addTile();draw();
    return ()=>window.removeEventListener('keydown',key);
  }
  function mountBricks({area,instructions,shell,status,best}) {
    instructions.textContent='Move with ← → or A/D, drag on the board, or hold the buttons. Launch the ball, clear all 30 bricks, and keep it above the paddle. Space launches or pauses.';
    shell('<canvas class="gamecanvas brickcanvas" width="400" height="460" aria-label="Brick Breaker board. Use the movement and launch buttons below."></canvas><div class="extra-controls"><button data-paddle="-1" aria-label="Move paddle left">←</button><button class="launch">Launch ball</button><button data-paddle="1" aria-label="Move paddle right">→</button></div><p class="extra-note">3 lives · 10 points per brick · Pauses when you leave the window</p>');
    const canvas=area.querySelector('canvas'),ctx=canvas.getContext('2d'),launch=area.querySelector('.launch');
    let paddle=158,ball={x:200,y:415,vx:145,vy:-225},lives=3,score=0,running=false,finished=false,frame,last=0;
    const keys=new Set(),held=new Set(),bricks=Array.from({length:30},(_,i)=>({x:15+(i%6)*63,y:42+Math.floor(i/6)*27,on:true}));
    const clamp=x=>Math.max(0,Math.min(316,x));
    function updateStatus(message=''){status().textContent=`${message}${score} points · ${lives} ${lives===1?'life':'lives'} · Best: ${best('bricks',score)}`;}
    function draw(){ctx.fillStyle='#10131e';ctx.fillRect(0,0,400,460);const colors=['#c5ff76','#ffce87','#f4a1be','#bba3ff','#92d8ff'];bricks.forEach((b,i)=>{if(b.on){ctx.fillStyle=colors[Math.floor(i/6)];ctx.fillRect(b.x,b.y,55,18);ctx.fillStyle='#ffffff30';ctx.fillRect(b.x,b.y,55,3);}});ctx.fillStyle='#bba3ff';ctx.fillRect(paddle,425,84,12);ctx.fillStyle='#fff5dc';ctx.beginPath();ctx.arc(ball.x,ball.y,7,0,Math.PI*2);ctx.fill();if(!running&&!finished){ctx.fillStyle='#10131ec9';ctx.fillRect(40,200,320,62);ctx.fillStyle='#c5ff76';ctx.textAlign='center';ctx.font='bold 17px sans-serif';ctx.fillText(launch.textContent==='Resume'?'Paused · tap Resume':'Ready? Launch the ball!',200,236);}}
    function toggle(){if(finished)return;running=!running;launch.textContent=running?'Pause':'Resume';last=0;draw();}
    function stopForLife(){running=false;lives--;if(lives===0){finished=true;launch.textContent='Game over';launch.disabled=true;updateStatus('Game over! · ');}else{ball={x:paddle+42,y:415,vx:145*(Math.random()<.5?-1:1),vy:-225};launch.textContent='Launch ball';updateStatus('Try again · ');}}
    function step(dt){
      const left=keys.has('ArrowLeft')||keys.has('a')||held.has(-1),right=keys.has('ArrowRight')||keys.has('d')||held.has(1);
      paddle=clamp(paddle+(Number(right)-Number(left))*330*dt);
      if(!running){if(!finished&&launch.textContent==='Launch ball'){ball.x=paddle+42;ball.y=415;}return;}
      // Substeps keep collisions stable even after a slow rendering frame.
      const parts=Math.ceil(dt/.006),h=dt/parts;
      for(let n=0;n<parts&&running;n++){
        const oldX=ball.x,oldY=ball.y;ball.x+=ball.vx*h;ball.y+=ball.vy*h;
        if(ball.x<7){ball.x=7;ball.vx=Math.abs(ball.vx);}if(ball.x>393){ball.x=393;ball.vx=-Math.abs(ball.vx);}if(ball.y<7){ball.y=7;ball.vy=Math.abs(ball.vy);}
        if(ball.vy>0&&oldY+7<=425&&ball.y+7>=425&&ball.x+7>=paddle&&ball.x-7<=paddle+84){ball.y=418;const angle=((ball.x-(paddle+42))/49)*1.05;const speed=Math.min(360,Math.hypot(ball.vx,ball.vy)+4);ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;}
        for(const b of bricks){if(!b.on||ball.x+7<=b.x||ball.x-7>=b.x+55||ball.y+7<=b.y||ball.y-7>=b.y+18)continue;b.on=false;score+=10;if(oldX+7<=b.x||oldX-7>=b.x+55)ball.vx=-ball.vx;else ball.vy=-ball.vy;updateStatus();if(score===300){running=false;finished=true;launch.disabled=true;launch.textContent='Board cleared!';updateStatus('You cleared every brick! · ');}break;}
        if(ball.y>467)stopForLife();
      }
    }
    function loop(now){const dt=last?Math.min((now-last)/1000,.035):0;last=now;step(dt);draw();frame=requestAnimationFrame(loop);}
    launch.onclick=toggle;
    const keydown=e=>{if(['ArrowLeft','ArrowRight','a','d',' '].includes(e.key)){e.preventDefault();if(e.key===' '){if(!e.repeat)toggle();}else keys.add(e.key);}},keyup=e=>keys.delete(e.key);
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
    function pause(){keys.clear();held.clear();if(running){running=false;launch.textContent='Resume';draw();}}
    const visibility=()=>{if(document.hidden)pause();};window.addEventListener('blur',pause);document.addEventListener('visibilitychange',visibility);
    area.querySelectorAll('[data-paddle]').forEach(button=>{const dir=Number(button.dataset.paddle);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.add(dir);});['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,()=>held.delete(dir)));button.addEventListener('click',e=>{if(e.detail===0)paddle=clamp(paddle+dir*35);});});
    let dragging=false;function position(e){const rect=canvas.getBoundingClientRect();paddle=clamp((e.clientX-rect.left)*400/rect.width-42);}
    canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);position(e);});canvas.addEventListener('pointermove',e=>{if(dragging)position(e);});['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>dragging=false));
    updateStatus();draw();frame=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);};
  }
  return {games,mount,slide,canMove};
})();
if(typeof module!=='undefined')module.exports=ArcadeExtras;
