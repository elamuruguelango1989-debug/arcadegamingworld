(() => {
'use strict';
const $=id=>document.getElementById(id);
const colors=['#ff6b6b','#64b5f6','#ffe082','#79dc97'];
let socket,room='',token='',me='',game=null,manualClose=false;
const q=new URLSearchParams(location.search);
const setStatus=t=>{$('status').textContent=t;};
const safeText=t=>String(t||'').slice(0,50);
function saveIdentity(){try{localStorage.setItem('agw-ludo-'+room,JSON.stringify({token,name:$('nickname').value}));}catch{}}
function loadIdentity(code){try{return JSON.parse(localStorage.getItem('agw-ludo-'+code)||'{}');}catch{return {};}}
function send(type,extra={}){if(socket?.readyState===1)socket.send(JSON.stringify({type,...extra}));else setStatus('Not connected. Reconnecting…');}
function connect(code){
 if(!/^[A-Z2-9]{6}$/.test(code)){setStatus('Enter a valid 6-character room code.');return;}
 room=code;manualClose=true;if(socket)socket.close();manualClose=false;
 const saved=loadIdentity(room);token=saved.token||'';
 if(!$('nickname').value)$('nickname').value=saved.name||'Player';
 history.replaceState(null,'','?room='+encodeURIComponent(room));
 const proto=location.protocol==='https:'?'wss:':'ws:';
 socket=new WebSocket(proto+'//'+location.host+'/api/ludo/room/'+room+'/ws');
 socket.onopen=()=>{setStatus('Connected. Waiting for players…');send('join',{name:$('nickname').value,token});};
 socket.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
  if(m.type==='error'){setStatus(m.message);return;}
  if(m.type==='notice'){setStatus(m.text);return;}
  if(m.type==='joined'){token=m.token;me=m.playerId;saveIdentity();$('entry').classList.add('hidden');$('roompanel').classList.remove('hidden');$('gamepanel').classList.remove('hidden');$('roomCode').textContent=room;setStatus('Joined room '+room);}
  if(m.game){game=m.game;render();}
 };
 socket.onerror=()=>setStatus('Connection error. Check Cloudflare Worker deployment and room route.');
 socket.onclose=()=>{if(manualClose)return;setStatus('Disconnected. Reconnecting in 3 seconds…');setTimeout(()=>{if(room)connect(room);},3000);};
}
function render(){if(!game)return;
 const players=$('players');players.replaceChildren();
 game.players.forEach((p,i)=>{const li=document.createElement('li');const dot=document.createElement('span');dot.className='dot';dot.style.background=colors[i];li.append(dot,document.createTextNode(p.name+(p.id===me?' (you)':'')+(p.connected?'':' · offline')));players.append(li);});
 $('start').classList.toggle('hidden',!(game.phase==='lobby'&&game.players.length>=2&&game.players[0]?.id===me));
 const mine=game.players.find(p=>p.id===me),turn=game.players[game.turn],isTurn=game.phase==='playing'&&turn?.id===me;
 $('turnInfo').textContent=game.phase==='lobby'?`Waiting for players (${game.players.length}/4). Room creator starts the match.`:game.phase==='finished'?`🏆 ${game.players.find(p=>p.id===game.winner)?.name||'Player'} wins!`:`${turn?.name||'Player'}'s turn${isTurn?' — your move!':''}`;
 $('diceResult').textContent=game.dice==null?'':' Dice: '+game.dice;
 $('roll').disabled=!isTurn||game.dice!==null;
 const pieces=$('pieces');pieces.replaceChildren();
 if(mine)mine.pieces.forEach((pos,i)=>{const b=document.createElement('button');b.textContent=`Token ${i+1}: ${pos===-1?'Base':pos===57?'Home':pos+'/57'}`;b.disabled=!(isTurn&&game.dice!==null&&(pos===-1?game.dice===6:pos+game.dice<=57));b.addEventListener('click',()=>send('move',{piece:i}));pieces.append(b);});
 drawBoard();
}
function drawBoard(){const svg=$('board');svg.replaceChildren();if(!game)return;const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs,parent=svg)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));parent.append(el);return el;};
 add('rect',{x:10,y:10,width:580,height:580,rx:24,fill:'#151b2e'});
 // 52 evenly spaced squares on a loop; 6-square finishing lane per player.
 const xy=n=>{const a=-Math.PI/2+2*Math.PI*n/52;return [300+218*Math.cos(a),300+218*Math.sin(a)];};
 for(let i=0;i<52;i++){const [x,y]=xy(i);add('circle',{cx:x,cy:y,r:17,fill:[0,13,26,39].includes(i)?colors[[0,13,26,39].indexOf(i)]:'#333d59',stroke:'#8d97b1','stroke-width':1});}
 add('circle',{cx:300,cy:300,r:72,fill:'#29324c',stroke:'#c5ff76','stroke-width':3});
 const title=add('text',{x:300,y:297,'text-anchor':'middle','font-size':25,'font-weight':'bold',fill:'#c5ff76'});title.textContent='LUDO';
 const subtitle=add('text',{x:300,y:324,'text-anchor':'middle','font-size':13,fill:'#fff'});subtitle.textContent='LIVE MULTIPLAYER';
 game.players.forEach((p,c)=>{
  const a=-Math.PI/2+2*Math.PI*c/4, bx=300+126*Math.cos(a),by=300+126*Math.sin(a);
  const label=add('text',{x:bx,y:by-23,'text-anchor':'middle','font-size':15,fill:colors[c],'font-weight':'bold'});label.textContent=p.name.slice(0,11);
  p.pieces.forEach((pos,i)=>{
   let x,y;
   if(pos===-1){x=bx+(i%2?12:-12);y=by+(i>1?12:-12);}
   else if(pos>=52){const dist=195-(pos-52)*23;x=300+dist*Math.cos(a);y=300+dist*Math.sin(a);}
   else{[x,y]=xy((c*13+pos)%52);x+=(i%2?5:-5);y+=(i>1?5:-5);}
   add('circle',{cx:x,cy:y,r:10,fill:colors[c],stroke:'#fff','stroke-width':2});
   const n=add('text',{x,y:y+4,'text-anchor':'middle','font-size':10,'font-weight':'bold',fill:'#111'});n.textContent=i+1;
  });
 });
}
$('create').onclick=async()=>{try{setStatus('Creating room…');const r=await fetch('/api/ludo/create',{method:'POST'});const data=await r.json();if(!r.ok)throw Error(data.error||'Failed to create room');connect(data.room);}catch(e){setStatus(e.message);}};
$('join').onclick=()=>connect($('roomInput').value.toUpperCase().trim());
$('start').onclick=()=>send('start');$('roll').onclick=()=>send('roll');
const invite=()=>location.origin+'/multiplayer-ludo.html?room='+encodeURIComponent(room);
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(invite());setStatus('Invite link copied!');}catch{setStatus('Invite link: '+invite());}};
$('share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Play Ludo with me',text:'Join my ArcadeGamingWorld Ludo room!',url:invite()});}catch{}}else $('copy').click();};
if(q.get('room'))connect(q.get('room').toUpperCase());
})();
