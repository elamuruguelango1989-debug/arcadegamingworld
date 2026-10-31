(() => {
'use strict';
 
function showDice(value) {
  const dice = document.getElementById('dice');
  if (!dice) return;

  const patterns = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  const grid = document.createElement('span');
  grid.className = 'agw-dice-grid';

  const active = patterns[value] || [];

  for (let i = 0; i < 9; i++) {
    const dot = document.createElement('span');
    dot.className = 'agw-dice-dot';

    if (active.includes(i)) {
      dot.classList.add('visible');
    }

    grid.appendChild(dot);
  }

  dice.replaceChildren(grid);
  dice.setAttribute(
    'aria-label',
    value == null ? 'Dice not rolled' : `Dice rolled ${value}`
  );
}
const API='https://agw-ludo-multiplayer.sathyavathielamurugu.workers.dev';
const $=s=>document.querySelector(s);
const names=['Red','Green','Yellow','Blue'],letters=['R','G','Y','B'];
const colors=['#d54863','#197d58','#ba8617','#3567b4'];
const offsets=[0,13,26,39],safe=new Set([0,8,13,21,26,34,39,47]);
const path=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const yards=[[[2,2],[2,4],[4,2],[4,4]],[[2,10],[2,12],[4,10],[4,12]],[[10,10],[10,12],[12,10],[12,12]],[[10,2],[10,4],[12,2],[12,4]]];
const lane=(c,p)=>c===0?[7,p-50]:c===1?[p-50,7]:c===2?[7,64-p]:[64-p,7];
let ws=null,game=null,playerId=null,room='',reconnectTimer=null,connectionId=0,lastDice=null;
const say=message=>{$('#status').textContent=message;};

function art(){
 let out='<rect width="600" height="600" fill="#f0eef5"/>';
 [[0,0],[0,9],[9,9],[9,0]].forEach(([r,c],i)=>{
   out+=`<rect x="${c*40}" y="${r*40}" width="240" height="240" fill="${colors[i]}"/><rect x="${c*40+35}" y="${r*40+35}" width="170" height="170" rx="24" fill="#fff" opacity=".93"/>`;
   yards[i].forEach(([rr,cc])=>out+=`<circle cx="${cc*40+20}" cy="${rr*40+20}" r="20" fill="${colors[i]}" opacity=".22"/>`);
 });
 path.forEach(([r,c],i)=>{
   const start=offsets.indexOf(i);
   out+=`<rect x="${c*40}" y="${r*40}" width="40" height="40" fill="${start>=0?colors[start]:'#faf9fc'}" stroke="#b6b3c5" stroke-width="1.5"/>`;
   if(safe.has(i))out+=`<text x="${c*40+20}" y="${r*40+29}" text-anchor="middle" font-size="28" fill="${start>=0?'white':'#777184'}">☆</text>`;
 });
 colors.forEach((color,c)=>{for(let p=51;p<=55;p++){const [r,col]=lane(c,p);out+=`<rect x="${col*40}" y="${r*40}" width="40" height="40" fill="${color}" stroke="#fff" stroke-width="1.5" opacity=".78"/>`;}});
 [[240,240,300,300,240,360],[240,240,360,240,300,300],[360,240,360,360,300,300],[240,360,300,300,360,360]].forEach((pts,i)=>out+=`<polygon points="${pts.join(' ')}" fill="${colors[i]}"/>`);
 out+='<circle cx="300" cy="300" r="21" fill="#fff"/><text x="300" y="308" text-anchor="middle" font-size="23" fill="#242335">⌂</text>';
 [[6,2,'→'],[2,8,'↓'],[8,12,'←'],[12,6,'↑']].forEach(([r,c,t])=>out+=`<text x="${c*40+20}" y="${r*40+28}" text-anchor="middle" font-size="24" fill="#777184">${t}</text>`);
 $('#board-art').innerHTML=out;
}
function send(type,extra={}){
 if(!ws||ws.readyState!==WebSocket.OPEN){say('Not connected. Reconnecting…');return;}
 ws.send(JSON.stringify({type,...extra}));
}
function legal(i){
 if(!game||game.phase!=='playing'||game.players[game.turn]?.id!==playerId||game.dice==null)return false;
 const p=game.players[game.turn].pieces[i],d=game.dice;
 return p===-1?d===6:p>=0&&p<56&&p+d<=56;
}
function positionFor(player,p,ti){
 return p===-1?yards[player.color][ti]:
        p<=50?path[(offsets[player.color]+p)%52]:
        p<=55?lane(player.color,p):
        [[7,6],[6,7],[7,8],[8,7]][player.color];
}
function render(){
 if(!game)return;
 const current=game.players[game.turn],myTurn=game.phase==='playing'&&current?.id===playerId;
 const connected=ws?.readyState===WebSocket.OPEN;
 $('#turn-label').textContent=game.phase==='finished'?'GAME COMPLETE':game.phase==='lobby'?'WAITING FOR PLAYERS':names[current?.color||0].toUpperCase()+'’S TURN';
 $('#turn-label').style.color=game.phase==='playing'?colors[current.color]:'#c5ff76';
 $('#turn-title').textContent=game.phase==='finished'?(game.players.find(p=>p.id===game.winner)?.name||'Player')+' wins!':
   game.phase==='lobby'?'Waiting for friends…':myTurn?(game.dice==null?'Your move starts with a roll.':'Pick your token.'):`${current?.name||'Player'} is playing…`;
 $('#start-online').disabled=!(connected&&game.phase==='lobby'&&game.players.length>=2&&game.players[0]?.id===playerId);
 $('#roll').disabled=!(connected&&myTurn&&game.dice==null);
 const die=game.dice;
showDice(die);
 if(die!=null&&die!==lastDice){$('#dice').classList.remove('rolling');void $('#dice').offsetWidth;$('#dice').classList.add('rolling');setTimeout(()=>$('#dice').classList.remove('rolling'),350);}
 lastDice=die;
 const host=$('#tokens');host.replaceChildren();const occupied=new Map();
 game.players.forEach((player,pi)=>player.pieces.forEach((p,ti)=>{
   const position=positionFor(player,p,ti),key=position.join(',');
   if(!occupied.has(key))occupied.set(key,[]);
   occupied.get(key).push({player,pi,p,ti,position});
 }));
 for(const group of occupied.values())group.forEach((t,k)=>{
   const {player,pi,p,ti,position:[r,c]}=t,b=document.createElement('button');
   const dx=group.length>1?((k%2)-.5)*.32:0,dy=group.length>1?(Math.floor(k/2)-(Math.ceil(group.length/2)-1)/2)*.25:0;
   b.type='button';b.className='token'+(pi===game.turn&&legal(ti)?' can-move':'')+(p===56?' finished':'');
   b.style.left=(c+.5+dx)/15*100+'%';b.style.top=(r+.5+dy)/15*100+'%';
   b.style.background=colors[player.color];b.textContent=letters[player.color]+(ti+1);
   b.setAttribute('aria-label',names[player.color]+' token '+(ti+1)+(p===-1?', in yard':p===56?', home':', step '+p));
   b.disabled=pi!==game.turn||!legal(ti);b.onclick=()=>send('move',{piece:ti});host.append(b);
 });
 const moves=$('#moves');moves.replaceChildren();
 for(let i=0;i<4;i++)if(legal(i)){
   const b=document.createElement('button');b.textContent='Move '+letters[current.color]+(i+1)+(current.pieces[i]===-1?' out':' +'+die);
   b.onclick=()=>send('move',{piece:i});moves.append(b);
 }
 $('#players').replaceChildren();
 game.players.forEach((p,i)=>{
   const div=document.createElement('div');div.className='player'+(i===game.turn?' active':'');
   div.style.setProperty('--color',colors[p.color]);
   const strong=document.createElement('strong'),small=document.createElement('small');
   strong.textContent=letters[p.color]+' · '+p.name+(p.id===playerId?' · You':'')+' · '+(p.connected?'Online':'Offline');
   small.textContent=p.pieces.filter(x=>x===56).length+'/4 home · '+p.pieces.filter(x=>x===-1).length+' in yard';
   div.append(strong,small);$('#players').append(div);
 });
 if(game.phase==='finished')say((game.players.find(p=>p.id===game.winner)?.name||'Player')+' wins!');
 else if(game.phase==='lobby')say(`Room ${room} · ${game.players.length}/4 players. Invite a friend, then start.`);
 else say(`${current.name}'s turn${myTurn?' (you)':''}. ${die==null?'Roll the dice.':'Choose a glowing token.'}`);
}
function connect(code){
 if(!/^[A-Z2-9]{6}$/.test(code)){say('Enter a valid six-character room code.');return;}
 clearTimeout(reconnectTimer);
 const id=++connectionId;
 if(ws){const old=ws;ws=null;old.close();}
 room=code;playerId=null;game=null;lastDice=null;
 $('#room-label').textContent=room;$('#invite').disabled=false;
 $('#roll').disabled=true;$('#start-online').disabled=true;$('#tokens').replaceChildren();$('#players').replaceChildren();$('#moves').replaceChildren();
 $('#dice').textContent='✦';$('#turn-title').textContent='Connecting…';
 history.replaceState(null,'',`?room=${room}`);
 const endpoint=new URL(`/api/ludo/room/${room}/ws`,API);endpoint.protocol='wss:';
 const socket=new WebSocket(endpoint);ws=socket;say('Connecting…');
 socket.onopen=()=>{if(id!==connectionId)return;const token=localStorage.getItem('agw-ludo-token-'+room)||'';socket.send(JSON.stringify({type:'join',name:$('#nickname').value,token}));};
 socket.onmessage=e=>{
   if(id!==connectionId)return;let msg;try{msg=JSON.parse(e.data);}catch{return;}
   if(msg.type==='joined'){playerId=msg.playerId;localStorage.setItem('agw-ludo-token-'+room,msg.token);if(game)render();}
   else if(msg.type==='hello'||msg.type==='state'){game=msg.game;render();}
   else if(msg.type==='error')say('Error: '+msg.message);
   else if(msg.type==='notice')say(msg.text);
 };
 socket.onclose=()=>{if(id!==connectionId)return;$('#roll').disabled=true;$('#start-online').disabled=true;say('Connection lost. Reconnecting…');reconnectTimer=setTimeout(()=>{if(id===connectionId)connect(room);},2000);};
 socket.onerror=()=>{if(id===connectionId)say('Connection error. Check Worker deployment.');};
}
$('#create').onclick=async()=>{
 try{say('Creating room…');const response=await fetch(API+'/api/ludo/create',{method:'POST'});if(!response.ok)throw Error('Server returned '+response.status);const result=await response.json();connect(result.room);}
 catch(e){say('Cannot create room: '+e.message);}
};
$('#join').onclick=()=>connect($('#room-code').value.trim().toUpperCase());
$('#start-online').onclick=()=>send('start');
$('#roll').onclick=()=>send('roll');
$('#invite').onclick=async()=>{
 const link=location.origin+'/online-ludo.html?room='+room;
 try{await navigator.clipboard.writeText(link);say('Invitation link copied!');}
 catch{window.prompt('Copy invitation link:',link);}
};
art();
const incoming=new URLSearchParams(location.search).get('room')?.toUpperCase();
if(incoming){$('#room-code').value=incoming;connect(incoming);}
})();
