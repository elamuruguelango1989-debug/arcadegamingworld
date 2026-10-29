const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validScore(score,seconds){return Number.isSafeInteger(score)&&score>=0&&score<=200000&&score<=Math.ceil(seconds*160+100);}
export function validName(name){return typeof name==='string'&&/^[A-Za-z0-9 _-]{2,20}$/.test(name)&&name.trim()===name;}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(url.pathname!=='/api/runner')return json({error:'Not found'},404);
 if(!env.LEADERBOARD_DB||!env.LEADERBOARD_SALT)return json({error:'Leaderboard is not available yet. You can still play.'},503);
 try{
 const db=env.LEADERBOARD_DB,now=Date.now(),day=new Date(now).toISOString().slice(0,10);
 if(request.method==='GET'){
 const {results}=await db.prepare('SELECT nickname,score FROM (SELECT nickname,score,created,ROW_NUMBER() OVER(PARTITION BY player ORDER BY score DESC,created ASC) AS place FROM scores WHERE day=?) WHERE place=1 ORDER BY score DESC,created ASC LIMIT 10').bind(day).all();
 return json({day,scores:results.map(x=>({nickname:x.nickname,score:x.score}))});
 }
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
 const raw=await request.text();if(raw.length>1024)return json({error:'Request too large'},413);
 let data;try{data=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
 const player=await digest(env.LEADERBOARD_SALT+day+(request.headers.get('CF-Connecting-IP')||'unknown'));
 if(data.action==='start'){
 const token=crypto.randomUUID(),hash=await digest(token);
 const inserted=await db.prepare('INSERT INTO runs(token,player,started,used) SELECT ?,?,?,0 WHERE (SELECT COUNT(*) FROM runs WHERE player=? AND started>?)<30').bind(hash,player,now,player,now-3600000).run();
 if(!inserted.meta.changes)return json({error:'Too many attempts. Please try again later.'},429);
 // Keep only a short history. Never store raw IP addresses.
 await db.batch([db.prepare('DELETE FROM runs WHERE started<?').bind(now-86400000),db.prepare('DELETE FROM scores WHERE created<?').bind(now-7*86400000)]);
 return json({token});
 }
 if(data.action!=='submit'||!validName(data.nickname)||typeof data.token!=='string'||data.token.length>64)return json({error:'Use a nickname with 2–20 letters, numbers, spaces, _ or -.'},400);
 const hash=await digest(data.token),run=await db.prepare('SELECT started FROM runs WHERE token=? AND player=? AND used=0').bind(hash,player).first();
 if(!run)return json({error:'This run is no longer eligible. Start another run.'},400);
 const seconds=(now-run.started)/1000;
 if(seconds<1||seconds>3600||!validScore(data.score,seconds))return json({error:'This score could not be accepted. Please try a new run.'},400);
 const result=await db.prepare('INSERT INTO scores(day,player,nickname,score,created,run_token) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM runs WHERE token=? AND player=? AND used=0) ON CONFLICT(run_token) DO NOTHING').bind(day,player,data.nickname,data.score,now,hash,hash,player).run();
 if(!result.meta.changes)return json({error:'This run has already been submitted.'},409);
 await db.prepare('UPDATE runs SET used=1 WHERE token=?').bind(hash).run();
 return json({ok:true});
 }catch{return json({error:'Leaderboard temporarily unavailable. Please try again later.'},503);}
}};
