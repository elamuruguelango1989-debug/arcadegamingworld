(()=>{
 'use strict';
 const tools=document.querySelector('#modal .share-tools');
 if(!tools)return;
 const link=document.createElement('a');
 link.className='facebook-share';
 link.textContent='Share on Facebook ↗';
 link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label','Share game on Facebook (opens a new tab)');
 const help=document.createElement('p');help.className='facebook-share-help';
 help.textContent='Facebook shares the game link. Add your own message there, or use Copy link / score to copy your result first. You choose whether to post.';
 tools.insertBefore(link,tools.querySelector('.share-feedback'));tools.append(help);
 window.addEventListener('agw:open',event=>{
  const id=event.detail?.id;
  if(!/^[a-z0-9-]+$/.test(id||'')){link.hidden=true;return;}
  link.hidden=false;
  const gameURL='https://arcadegamingworld.com/game-'+id+'.html';
  link.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(gameURL);
 });
})();
