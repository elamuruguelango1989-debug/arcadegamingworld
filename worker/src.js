// ArcadeGamingWorld multiplayer Ludo — server-authoritative game rules.
// Each room has a unique Durable Object and WebSocket broadcasts.
const MAX = 4;
const STARTS = [0, 13, 26, 39];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const validRoom = s => /^[A-Z2-9]{6}$/.test(s);
const cleanName = s => String(s || 'Player').replace(/[<>\\\u0000-\u001f]/g,'').trim().slice(0,20) || 'Player';
function fresh() { return {players:[],phase:'lobby',turn:0,dice:null,rolls:0,winner:null,updated:Date.now()}; }
function view(s) {return {players:s.players.map(p=>({id:p.id,name:p.name,color:p.color,pieces:p.pieces,connected:p.connected})),phase:s.phase,turn:s.turn,dice:s.dice,winner:s.winner};}
function legal(s, i) { const p=s.players[s.turn], pos=p.pieces[i], d=s.dice; return Number.isInteger(i)&&i>=0&&i<4&&d!==null&&(pos===-1?d===6:pos+d<=57); }
function available(s) {return [0,1,2,3].filter(i=>legal(s,i));}
function next(s) {s.turn=(s.turn+1)%s.players.length;s.dice=null;s.rolls=0;}
export default {
  async fetch(request, env) {
    const url=new URL(request.url), path=url.pathname;
    if(path==='/api/ludo/health') return json({ok:true,service:'ludo-multiplayer'});
    if(path==='/api/ludo/create' && request.method==='POST') {
      const room=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
      return json({room});
    }
    const m=path.match(/^\/api\/ludo\/room\/([A-Z2-9]{6})\/ws$/);
    if(!m || !validRoom(m[1])) return json({error:'Not found'},404);
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket') return json({error:'WebSocket required'},426);
    const id=env.ROOMS.idFromName(m[1]);
    return env.ROOMS.get(id).fetch(request);
  }
};
export class LudoRoom {
  constructor(ctx) {
    this.ctx=ctx;
    this.state=null;
    this.ready=ctx.blockConcurrencyWhile(async()=>{this.state=await ctx.storage.get('game') || fresh();});
  }
  async save(){this.state.updated=Date.now();await this.ctx.storage.put('game',this.state);}
  send(ws,msg){try{ws.send(JSON.stringify(msg));}catch{}}
  broadcast(msg){for(const ws of this.ctx.getWebSockets())this.send(ws,msg);}
  update(){this.broadcast({type:'state',game:view(this.state)});}
  async fetch(request){
    await this.ready;
    const pair=new WebSocketPair();const client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);
    this.send(server,{type:'hello',game:view(this.state)});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,data){
    try {
      const msg=JSON.parse(String(data));let s=this.state;
      const id=ws.deserializeAttachment()?.id;
      if(msg.type==='join') {
        const requested=String(msg.token||'');
        let p=s.players.find(p=>p.token===requested && requested.length>=24);
        if(!p){
          if(s.phase!=='lobby')throw Error('Match already started; only existing players can reconnect.');
          if(s.players.length>=MAX)throw Error('Room is full.');
          const token=crypto.randomUUID()+crypto.randomUUID();
          p={id:crypto.randomUUID(),token,name:cleanName(msg.name),color:s.players.length,pieces:[-1,-1,-1,-1],connected:true};
          s.players.push(p);
        }
        ws.serializeAttachment({id:p.id});
        // Close older connections for the same player to avoid duplicate commands.
        for(const other of this.ctx.getWebSockets())if(other!==ws && other.deserializeAttachment()?.id===p.id)try{other.close(4000,'Reconnected');}catch{}
        p.connected=true;
        this.send(ws,{type:'joined',token:p.token,playerId:p.id});
      } else {
        const p=s.players.find(p=>p.id===id);
        if(!p)throw Error('Join the room first.');
        if(msg.type==='start'){
          if(s.phase!=='lobby'||s.players.length<2)throw Error('Need 2–4 players to start.');
          if(s.players[0].id!==id)throw Error('Only the room creator can start.');
          s.phase='playing';s.turn=0;s.dice=null;s.rolls=0;
        } else if(msg.type==='roll'){
          if(s.phase!=='playing'||s.players[s.turn].id!==id||s.dice!==null)throw Error('Not your turn to roll.');
          s.dice=crypto.getRandomValues(new Uint32Array(1))[0]%6+1;
          if(available(s).length===0){
            this.broadcast({type:'notice',text:`${p.name} rolled ${s.dice} but has no legal move.`});
            if(s.dice===6 && s.rolls<2){s.dice=null;s.rolls++;}
            else next(s);
          }
        } else if(msg.type==='move'){
          if(s.phase!=='playing'||s.players[s.turn].id!==id)throw Error('Not your turn.');
          const i=Number(msg.piece);
          if(!legal(s,i))throw Error('Illegal move.');
          const dice=s.dice;
          p.pieces[i]=p.pieces[i]===-1?0:p.pieces[i]+dice;
          const square=(STARTS[p.color]+p.pieces[i])%52;
          if(p.pieces[i]<=51 && !SAFE.has(square)) {
            for(const opp of s.players)if(opp!==p)for(let j=0;j<4;j++){
              if(opp.pieces[j]>=0&&opp.pieces[j]<=51&&(STARTS[opp.color]+opp.pieces[j])%52===square)opp.pieces[j]=-1;
            }
          }
          if(p.pieces.every(x=>x===57)){s.phase='finished';s.winner=p.id;s.dice=null;}
          else if(dice===6 && s.rolls<2){s.dice=null;s.rolls++;}
          else next(s);
        } else throw Error('Unknown action.');
      }
      await this.save();this.update();
    }catch(err){this.send(ws,{type:'error',message:String(err.message||err)});}
  }
  async webSocketClose(ws){await this.disconnect(ws);}
  async webSocketError(ws){await this.disconnect(ws);}
  async disconnect(ws){
    const id=ws.deserializeAttachment()?.id;if(!id)return;
    if(this.ctx.getWebSockets().some(other=>other!==ws&&other.deserializeAttachment()?.id===id&&other.readyState===1))return;
    const p=this.state.players.find(p=>p.id===id);
    if(p){p.connected=false;await this.save();this.update();}
  }
}
