/* Original synthesized effects. No audio downloads, microphones, or recordings. */
const ArcadeSound=(()=>{
let enabled=false,volume=.35,context,master,unlocked=false,engine=null,game='',previous=null,lastSounds={},supported=!!(window.AudioContext||window.webkitAudioContext);
try{let settings=JSON.parse(localStorage.getItem('agw-audio-v1')||'null');if(settings){enabled=settings.enabled===true;if(typeof settings.volume==='number'&&Number.isFinite(settings.volume))volume=Math.max(0,Math.min(1,settings.volume));}}catch{}
function save(){try{localStorage.setItem('agw-audio-v1',JSON.stringify({enabled,volume}))}catch{}}
function ready(){return enabled&&unlocked&&supported&&context?.state==='running'&&!document.hidden}
async function unlock(){if(!enabled||!supported||document.hidden)return;try{if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=volume;master.connect(context.destination)}await context.resume();unlocked=context.state==='running';}catch{unlocked=false}}
function tone(freq,duration=.1,type='sine',delay=0,end){if(!ready())return;const now=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);if(end)osc.frequency.exponentialRampToValueAtTime(end,now+duration);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.15,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};}
function noise(duration=.16){if(!ready())return;const buffer=context.createBuffer(1,Math.floor(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1200;gain.gain.value=.3;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()}}
function emit(kind){if(!ready())return;const time=performance.now();if(time-(lastSounds[kind]||-1000)<65)return;lastSounds[kind]=time;
if(kind==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',i*.1));}
else if(kind==='lose'){tone(260,.18,'triangle',0,180);tone(180,.35,'triangle',.18,90)}
else if(kind==='coin'){tone(1047,.08,'sine');tone(1568,.15,'sine',.075)}
else if(kind==='crash'){noise(.24);tone(110,.22,'sawtooth',0,45)}
else if(kind==='jump')tone(330,.12,'sine',0,620);
else if(kind==='bounce')tone(410,.065,'triangle',0,550);
else if(kind==='match'){tone(660,.1);tone(880,.14,'sine',.08)}
else if(kind==='merge')tone(280,.13,'triangle',0,620);
else if(kind==='hit'){noise(.055);tone(190,.055,'triangle')}
else if(kind==='card'){noise(.035);tone(760,.035,'sine')}
else if(kind==='check'){tone(600,.1,'triangle');tone(450,.13,'triangle',.12)}
else if(kind==='ready'){tone(450,.12);tone(850,.17,'sine',.1)}
else tone(440,.045,'sine');}
function stopEngine(){if(engine){try{engine.osc.stop();engine.osc.disconnect();engine.gain.disconnect()}catch{}engine=null}}
function engineState(running,speed=90){if(!running||!ready()){stopEngine();return}if(!engine){const osc=context.createOscillator(),gain=context.createGain();osc.type='triangle';gain.gain.value=.065;osc.connect(gain);gain.connect(master);osc.start();engine={osc,gain}}engine.osc.frequency.setTargetAtTime(48+speed*.45,context.currentTime,.2)}
function begin(id){stopEngine();game=id;previous=null;lastSounds={};emit('ready')}
function inspect(){const modal=document.querySelector('#modal');if(!modal?.open){stopEngine();return}const area=document.querySelector('#game');const status=area.querySelector('.status')?.textContent||'';let state={status,history:area.querySelector('.chess-history')?.textContent||'',score:0,coins:Number(area.querySelector('.race-coins')?.textContent||0),lives:(area.querySelector('.race-lives')?.textContent.match(/♥/g)||[]).length};
const number=status.match(/(?:Score:\s*|^)(\d+)/i);if(number)state.score=Number(number[1]);
if(game==='racing')engineState(/Keep your eyes/.test(status),parseInt(area.querySelector('.race-speed')?.textContent)||90);
if(!previous){previous=state;return}const prior=previous;previous=state;
if(game==='racing'){if(state.coins>prior.coins)emit('coin');if(state.lives<prior.lives)emit('crash')}
if(game==='chess'&&state.history!==prior.history&&/\d+\./.test(state.history)){const move=state.history.trim().split(/\s+/).at(-1);emit(move.includes('x')?'hit':'card')}
if(status===prior.status)return;
if(/You won|You win|You cleared|Four in a row|All matched|Field cleared|Checkmate!/i.test(status)){emit(game==='chess'&&area.querySelector('#chess-mode')?.value==='cpu'&&/Black wins/.test(status)?'lose':'win');stopEngine();return}
if(/Game over|Computer wins|Boom!|Race over|No moves left/i.test(status)){emit('lose');stopEngine();return}
if(game==='whack'&&/^Time!/.test(status))emit('match');
if(game==='reaction'&&/ms/.test(status)&&!prior.status.includes('ms'))emit('match');
if(game==='chess'&&/CHECK!/.test(status)&&!prior.status.includes('CHECK!'))emit('check');
if(game==='reaction'&&area.querySelector('.reaction')?.textContent.includes('GO!'))emit('ready');
if(['snake','flap','2048','bricks','whack'].includes(game)&&state.score>prior.score)emit(game==='2048'?'merge':game==='whack'?'hit':game==='bricks'?'bounce':'coin');
if(game==='memory'){let a=status.match(/(\d+) \/ 6 pairs/),b=prior.status.match(/(\d+) \/ 6 pairs/);if(a&&b&&+a[1]>+b[1])emit('match')}
}
function updateControls(){document.querySelectorAll('[data-sound-toggle]').forEach(b=>{b.textContent=enabled?'♫ Sound on':'♪ Sound off';b.setAttribute('aria-pressed',String(enabled));b.disabled=!supported;if(!supported)b.textContent='Sound unavailable'});document.querySelectorAll('[data-sound-volume]').forEach(b=>b.value=Math.round(volume*100));}
function init(){updateControls();document.querySelectorAll('[data-sound-toggle]').forEach(b=>b.onclick=async()=>{enabled=!enabled;save();updateControls();if(enabled){await unlock();emit('ready');inspect()}else{stopEngine();if(master)master.gain.setValueAtTime(0,context.currentTime);if(context)context.suspend().catch(()=>{})}if(enabled&&master)master.gain.setValueAtTime(volume,context.currentTime)});
document.querySelectorAll('[data-sound-volume]').forEach(b=>b.oninput=()=>{volume=Number(b.value)/100;if(master)master.gain.setTargetAtTime(volume,context.currentTime,.02);save();updateControls()});
document.addEventListener('pointerdown',e=>{if(e.isTrusted)unlock()},true);document.addEventListener('keydown',e=>{if(e.isTrusted){unlock();if(e.repeat)return;if(document.querySelector('#modal')?.open&&game==='flap'&&e.key===' ')emit('jump')}},true);
document.addEventListener('click',e=>{const modal=document.querySelector('#modal');if(!modal?.open||!e.isTrusted)return;const b=e.target.closest('button');if(!b||b.matches('[data-sound-toggle],.close,#expand-game,.restart'))return;
if(game==='flap'&&(b.matches('.flap')||e.target.closest('canvas')))emit('jump');else if(['solitaire','memory'].includes(game)&&b.closest('#game'))emit('card');else if(game==='connect'&&b.dataset.col!==undefined)emit('card');else if(['rps','mines','ttt','reaction'].includes(game)&&b.closest('#game'))emit('tap');},true);
const modal=document.querySelector('#modal'),area=document.querySelector('#game');if(area)new MutationObserver(inspect).observe(area,{childList:true,subtree:true,characterData:true});if(modal)modal.addEventListener('close',()=>{stopEngine();previous=null});
function quiet(){unlocked=false;stopEngine();if(context)context.suspend().catch(()=>{})}window.addEventListener('blur',quiet);document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
return {emit,begin,stopEngine};})();
