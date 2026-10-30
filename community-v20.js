/* Community favorites: local selection plus shared Cloudflare D1 counts. */
(()=>{'use strict';
const totals={};
async function refresh(){
 try{const r=await fetch('/api/favorites',{cache:'no-store'});if(!r.ok)return;
 const d=await r.json();Object.assign(totals,d.likes||{});paint();
 }catch{}
}
function paint(){
 document.querySelectorAll('[data-fav]').forEach(b=>{
  const id=b.dataset.fav, count=Number(totals[id]||0);
  let span=b.querySelector('.community-count');
  if(!span){span=document.createElement('span');span.className='community-count';b.appendChild(span)}
  span.textContent=' '+count.toLocaleString();
  b.title=count+' community likes';
 });
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-fav]');if(!b)return;
 const game=b.dataset.fav;
 // Existing click handler updates the local selection synchronously.
 setTimeout(paint,0);
 setTimeout(async()=>{
  const liked=(()=>{try{return JSON.parse(localStorage.getItem('agw-favorites-v1')||'[]').includes(game)}catch{return b.getAttribute('aria-pressed')==='true'}})();
  try{const r=await fetch('/api/favorites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,liked})});
   if(r.ok){const data=await r.json();totals[game]=data.likes;paint()}
  }catch{}
 },0);
},true);
const observer=new MutationObserver(()=>{if(document.querySelector('[data-fav]:not(:has(.community-count))'))paint()});
observer.observe(document.body,{childList:true,subtree:true});
refresh();
})();
