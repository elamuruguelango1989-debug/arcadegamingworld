(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LudoRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const offsets=[0,13,26,39],safe=new Set([0,8,13,21,26,34,39,47]);
 function create(players){return {players:players.map(p=>({...p,tokens:[-1,-1,-1,-1]})),turn:0,die:0,sixes:0,winner:null,moves:0};}
 function square(player,progress){return progress>=0&&progress<=50?(offsets[player.color]+progress)%52:null;}
 function legal(s,die=s.die){if(s.winner!==null||!Number.isInteger(die)||die<1||die>6)return [];return s.players[s.turn].tokens.flatMap((p,i)=>(p===-1?die===6:p<56&&p+die<=56)?[i]:[]);}
 function next(s){s.turn=(s.turn+1)%s.players.length;s.sixes=0;s.die=0;}
 function roll(s,die){if(s.winner!==null||s.die||!Number.isInteger(die)||die<1||die>6)return {ok:false};s.die=die;if(die===6)s.sixes++;else s.sixes=0;if(s.sixes===3){next(s);return {ok:true,forfeit:true};}const choices=legal(s);if(!choices.length){if(die!==6)next(s);else s.die=0;return {ok:true,noMove:true};}return {ok:true,choices};}
 function move(s,index){if(!legal(s).includes(index))return {ok:false};const player=s.players[s.turn],die=s.die;player.tokens[index]=player.tokens[index]===-1?0:player.tokens[index]+die;const p=player.tokens[index],target=square(player,p);let captures=0;
 if(target!==null&&!safe.has(target))s.players.forEach((other,i)=>{if(i===s.turn)return;other.tokens.forEach((v,j)=>{if(square(other,v)===target){other.tokens[j]=-1;captures++;}});});
 s.moves++;if(player.tokens.every(x=>x===56)){s.winner=s.turn;s.die=0;return {ok:true,win:true,captures,home:true};}
 const home=p===56,extra=die===6||captures>0||home;s.die=0;if(!extra)next(s);return {ok:true,captures,home,extra};}
 function choose(s){const choices=legal(s),player=s.players[s.turn];return choices.reduce((best,i)=>{const progress=player.tokens[i]===-1?0:player.tokens[i]+s.die,target=square(player,progress);let value=progress+ (player.tokens[i]===-1?25:0)+(progress===56?1000:0);if(target!==null&&!safe.has(target))for(let j=0;j<s.players.length;j++)if(j!==s.turn)for(const v of s.players[j].tokens)if(square(s.players[j],v)===target)value+=150;return !best||value>best.value?{i,value}:best;},null)?.i;}
 return {create,square,legal,next,roll,move,choose,offsets,safe};
});
