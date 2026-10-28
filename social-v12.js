(()=>{
 'use strict';
 const modal=document.querySelector('#modal');if(!modal)return;
 const utcDay=()=>new Date().toISOString().slice(0,10);
 const targetFor=day=>15+[...day].reduce((n,c)=>n+c.charCodeAt(0),0)%10;
 let day=utcDay(),target=targetFor(day),activeDay=null,current=null,persistent=true,record={best:0,played:false};
 function load(){record={best:0,played:false};try{const r=JSON.parse(localStorage.getItem('agw-daily-v12')||'null');if(r?.day===day&&Number.isFinite(r.best)&&r.best>=0)record={best:r.best,played:!!r.played};}catch{persistent=false}}
 load();
 const panel=document.createElement('section');panel.className='daily-challenge';panel.setAttribute('aria-labelledby','daily-title');
 panel.innerHTML='<div><p class="daily-kicker">ONE LITTLE CHALLENGE, EVERY DAY</p><h2 id="daily-title">Today’s mole mission</h2><p class="daily-description"></p><p class="daily-progress" aria-live="polite"></p></div><button class="primary daily-play">Play daily challenge ↗</button>';
 const main=document.querySelector('main')||document.querySelector('#main-content');
 if(main){const gamesSection=document.querySelector('#games');if(gamesSection)gamesSection.before(panel);else main.append(panel);}
 const note=document.createElement('p');note.className='daily-game-note';note.hidden=true;document.querySelector('#game').before(note);
 const shareBox=document.createElement('div');shareBox.className='share-tools';shareBox.innerHTML='<button type="button" class="share-score">Share game</button><button type="button" class="copy-score">Copy link / score</button><p class="share-feedback" role="status"></p><textarea class="share-manual" aria-label="Share text to copy" readonly hidden></textarea>';modal.append(shareBox);
 const feedback=shareBox.querySelector('.share-feedback'),manual=shareBox.querySelector('textarea');
 function refresh(){const now=utcDay();if(now!==day){day=now;target=targetFor(day);load();}panel.querySelector('.daily-description').textContent=`Whack ${target} moles in one 30-second round. ${day} · Resets at midnight UTC. Random mole positions each round.`;panel.querySelector('.daily-progress').textContent=(record.played?(record.best>=target?'✓ Challenge completed! ':'Keep trying! ')+`Today’s best: ${record.best} / ${target}.`:'No round completed today yet.')+' Progress stays on this browser.'+(persistent?'':' Storage unavailable; progress lasts for this visit.');}
 refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 panel.querySelector('button').onclick=()=>{refresh();activeDay=day;openGame('whack');note.hidden=false;note.textContent=`Daily challenge · Reach ${target} moles in 30 seconds. Hit Start game below. Finish the round to record your score.`;};
 window.addEventListener('agw:open',e=>{current=e.detail.id;if(current!=='whack')activeDay=null;note.hidden=true;feedback.textContent='';manual.hidden=true;shareBox.querySelector('.share-score').textContent='Share game';});
 window.addEventListener('agw:result',e=>{if(e.detail.id!=='whack'||current!=='whack'||!Number.isFinite(e.detail.score))return;refresh();if(activeDay!==day)return;record={played:true,best:Math.max(record.best,e.detail.score)};try{localStorage.setItem('agw-daily-v12',JSON.stringify({day,...record}));}catch{persistent=false}refresh();note.textContent=e.detail.score>=target?`✓ Daily challenge complete! ${e.detail.score} moles · Target ${target}.`:`${e.detail.score} / ${target} moles. Try another round!`;note.hidden=false;});
 modal.addEventListener('close',()=>{activeDay=null});
 function shareData(){const name=document.querySelector('#gameTitle').textContent||'ArcadeGamingWorld';const status=document.querySelector('#game .status')?.textContent||'';const reaction=current==='reaction'?document.querySelector('#game .reaction')?.textContent:'';let result=(reaction&&/^\d+ ms/.test(reaction)?reaction:status).split(/ · Best:|Best:|Personal best:/)[0].trim();const hasResult=/\d|win|draw|matched|cleared|checkmate/i.test(result)&&!/^Your turn|^Computer is thinking/i.test(result);const daily=current==='whack'&&activeDay===day?` Daily challenge ${day}: target ${target} moles.`:'';return {title:name+' | ArcadeGamingWorld',text:(hasResult?`${name}: ${result}.`:`Play ${name} free at ArcadeGamingWorld.`)+daily,url:'https://arcadegamingworld.com/game-'+current+'.html'};}
 async function copy(){const d=shareData(),text=d.text+'\n'+d.url;try{await navigator.clipboard.writeText(text);feedback.textContent='Copied! Paste it into a message or social post.';}catch{manual.hidden=false;manual.value=text;manual.focus();manual.select();feedback.textContent='Select and copy the text below.';}}
 shareBox.querySelector('.copy-score').onclick=copy;
 shareBox.querySelector('.share-score').onclick=async()=>{if(!current)return;if(navigator.share){try{await navigator.share(shareData());feedback.textContent='Share menu opened.';}catch(e){if(e.name!=='AbortError')await copy();}}else await copy();};
 new MutationObserver(()=>{const d=shareData();shareBox.querySelector('.share-score').textContent=d.text.startsWith('Play ')?'Share game':'Share score / result';}).observe(document.querySelector('#game'),{subtree:true,childList:true,characterData:true});
})();
