(()=>{
 const modal=document.querySelector('#modal');if(!modal)return;
 const game=modal.querySelector('#game');
 function group(label,nodes,before){const d=document.createElement('details');d.className='mobile-game-options';d.open=true;const s=document.createElement('summary');s.textContent=label;d.append(s);modal.insertBefore(d,before);nodes.filter(Boolean).forEach(n=>d.append(n));return d;}
 const help=group('Instructions & sound',[modal.querySelector('.game-audio'),modal.querySelector('#instructions')],game);
 const sharing=group('Share this game',[modal.querySelector('.share-tools')],null);
 function layout(){const compact=matchMedia('(max-width:900px), (pointer:coarse)').matches&&modal.classList.contains('game-expanded');modal.classList.toggle('mobile-play-mode',compact);if(compact!==modal._compact){help.open=!compact;sharing.open=!compact;modal._compact=compact;game.scrollTop=0;}}
 new MutationObserver(layout).observe(modal,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',layout);modal.addEventListener('close',()=>{modal.classList.remove('mobile-play-mode');layout()});layout();
})();
