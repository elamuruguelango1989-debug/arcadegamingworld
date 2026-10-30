/* ArcadeGamingWorld v24: local-only daily challenge streaks. No backend writes. */
(()=>{'use strict';
const STORAGE='agw-v24-completed-days';
const day=()=>new Date().toISOString().slice(0,10);
const yesterday=d=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()-1);return t.toISOString().slice(0,10)};
const read=()=>{try{const v=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)):[]}catch{return []}};
const mission=()=>Array.from(document.querySelectorAll('h1,h2,h3')).find(x=>/today.s .*mission|daily challenge/i.test(x.textContent||''));
function render(){const heading=mission();if(!heading)return;const section=heading.closest('section,article')||heading.parentElement;if(!section)return;
let panel=document.getElementById('agw-streak-panel');if(!panel){panel=document.createElement('aside');panel.id='agw-streak-panel';panel.setAttribute('aria-label','Daily challenge achievements');section.append(panel)}
const text=section.textContent||'';const score=text.match(/Today.s best:\s*(\d+)\s*\/\s*(\d+)/i);
let days=read();const today=day();const achieved=!!score&&Number(score[2])>0&&Number(score[1])>=Number(score[2]);
if(achieved&&!days.includes(today)){days.push(today);days=[...new Set(days)].sort();try{localStorage.setItem(STORAGE,JSON.stringify(days))}catch{}}
const set=new Set(days);let cursor=set.has(today)?today:yesterday(today),streak=0;
while(set.has(cursor)&&streak<3660){streak++;cursor=yesterday(cursor)}
const count=days.length;const milestones=[1,3,7,14,30];
panel.replaceChildren();const title=document.createElement('h3');title.textContent='🏅 Daily achievements';panel.append(title);
const stats=document.createElement('div');stats.className='agw-streak-stats';
for(const [value,label] of [[streak,'🔥 Day streak'],[count,'⭐ Days completed']]){const el=document.createElement('div');el.className='agw-streak-stat';const strong=document.createElement('strong');strong.textContent=value;const small=document.createElement('span');small.textContent=label;el.append(strong,small);stats.append(el)}panel.append(stats);
const badges=document.createElement('div');badges.className='agw-streak-badges';for(const n of milestones){const el=document.createElement('span');const earned=count>=n;el.className='agw-streak-badge'+(earned?' earned':'');el.textContent=(earned?'🏆 ':'🔒 ')+n+' day'+(n===1?'':'s');el.title=earned?'Unlocked':'Complete '+n+' daily challenges to unlock';badges.append(el)}panel.append(badges);
const message=document.createElement('p');message.className='agw-streak-note';message.textContent=achieved?'🎉 Challenge complete! Your badge progress is saved in this browser.':'Reach today’s target to earn a completion badge and build your streak.';panel.append(message);
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;render()},250)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
function start(){render();const observer=new MutationObserver(changes=>{if(changes.some(c=>!c.target.closest?.('#agw-streak-panel')))schedule()});observer.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});window.addEventListener('storage',schedule)}
})();
