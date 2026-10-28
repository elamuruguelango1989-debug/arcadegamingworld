
// Preserve Solitaire state while changing only its table presentation.
(()=>{const game=document.querySelector('#game');if(!game)return;
function enhance(){const table=game.querySelector('.sol-table');if(!table||table.dataset.mobileReady)return;table.dataset.mobileReady='yes';table.setAttribute('tabindex','0');table.setAttribute('aria-label','Solitaire table. In large-card mode, scroll sideways to reach all seven columns.');let narrow=window.innerWidth<=550;table.classList.toggle('sol-large',narrow);
const toolbar=game.querySelector('.sol-toolbar'),button=document.createElement('button');button.className='sol-card-size';button.type='button';const tip=document.createElement('p');tip.className='sol-mobile-tip';tip.setAttribute('role','status');table.before(tip);
function labels(){let large=table.classList.contains('sol-large');button.textContent=large?'Fit board':'Larger cards';button.setAttribute('aria-label',large?'Fit all seven columns on screen':'Use larger Solitaire cards');button.setAttribute('aria-pressed',String(large));tip.hidden=window.innerWidth>550;tip.textContent=large?'Large cards are on. Swipe the green table sideways to reach all seven columns, or choose Fit board.':'All seven columns fit on screen. Choose Larger cards for easier tapping.';}
button.onclick=()=>{const position=table.scrollLeft;table.classList.toggle('sol-large');labels();if(!table.classList.contains('sol-large'))table.scrollLeft=0;else table.scrollLeft=position;};toolbar.append(button);labels();}
new MutationObserver(enhance).observe(game,{childList:true,subtree:true});enhance();})();
