(()=>{
 'use strict';
 const id=window.AGW_ANALYTICS?.measurementId?.trim();
 if(!/^G-[A-Z0-9]{6,}$/.test(id||''))return;
 const key='agw-analytics-choice-v1';let choice=null,loaded=false;
 try{choice=localStorage.getItem(key);}catch{}
 const panel=document.createElement('section');panel.className='analytics-choice';panel.setAttribute('aria-label','Optional analytics preferences');panel.innerHTML='<div><strong>Help us improve the arcade?</strong><p>Allow optional Google Analytics to measure visits and game activity. You can play all games without it. <a href="privacy.html">Privacy Policy</a></p></div><div class="analytics-buttons"><button type="button" data-choice="granted">Allow analytics</button><button type="button" data-choice="denied">No thanks</button></div>';
 const footer=document.querySelector('footer');const settings=document.createElement('button');settings.className='analytics-settings';settings.textContent='Analytics preferences';settings.onclick=()=>{panel.hidden=false;};(footer||document.body).append(settings);document.body.append(panel);
 window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
 function load(){if(loaded)return;loaded=true;window['ga-disable-'+id]=false;
  window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('consent','update',{analytics_storage:'granted'});window.gtag('js',new Date());
  // Strip query strings and fragments to avoid passing user-entered URL values.
  window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:''});
  window.gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.append(script);
 }
 function apply(value){choice=value;try{localStorage.setItem(key,value);}catch{}panel.hidden=true;if(value==='granted')load();else{window['ga-disable-'+id]=true;if(loaded){window.gtag('consent','update',{analytics_storage:'denied'});for(const part of document.cookie.split(';')){const name=part.split('=')[0].trim();if(!/^_ga(?:_|$)/.test(name))continue;document.cookie=name+'=; Max-Age=0; path=/';const host=location.hostname.split('.');for(let i=0;i<host.length-1;i++)document.cookie=name+'=; Max-Age=0; path=/; domain=.'+host.slice(i).join('.');}location.reload();}}}
 panel.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>apply(b.dataset.choice));
 panel.hidden=choice==='granted'||choice==='denied';if(choice==='granted')load();
 function track(name,data={}){if(choice!=='granted'||!loaded)return;const safe={};if(/^[a-z0-9-]+$/.test(data.game_id||''))safe.game_id=data.game_id;if(/^[a-z0-9-]+$/.test(data.from_game||''))safe.from_game=data.from_game;if(Number.isFinite(data.score))safe.score=Math.max(0,Math.floor(data.score));window.gtag('event',name,safe);}
 window.addEventListener('agw:open',e=>track('game_open',{game_id:e.detail?.id}));
 window.addEventListener('agw:play',e=>track('game_start',e.detail));
 window.addEventListener('agw:finish',e=>track('game_end',e.detail));
 window.addEventListener('agw:result',e=>track('game_end',{game_id:e.detail?.id,score:e.detail?.score}));
 document.addEventListener('click',e=>{const a=e.target.closest?.('[data-next-game]');if(a)track('next_game_click',{game_id:a.dataset.nextGame,from_game:a.dataset.fromGame});});
})();
