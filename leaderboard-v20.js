(()=>{
const section=document.getElementById('community-leaderboard');if(!section)return;
const tbody=section.querySelector('tbody'),status=section.querySelector('[data-status]'),period=section.querySelector('select');
async function load(){
 status.textContent='Loading verified Endless Runner scores…';
 try{const r=await fetch('/api/leaderboard?period='+encodeURIComponent(period.value),{cache:'no-store'}),d=await r.json();
 if(!r.ok)throw Error(d.error||'Unable to load');
 tbody.replaceChildren();
 (d.scores||[]).forEach((p,i)=>{const tr=document.createElement('tr');[String(i+1),p.nickname,String(p.score)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});tbody.append(tr)});
 status.textContent=d.scores.length?'Showing Endless Runner rankings. Other games will join once verified score submission is available.':'No scores for this period.';
 }catch(e){status.textContent=e.message}
}
period.addEventListener('change',load);load();
})();
