/**
 * OPTIONAL SELF-HOSTED RSVP SERVER — Node 18+, no packages to install.
 * Run: npm start. Set ADMIN_TOKEN to a private long string to access /admin.html.
 * For a public production launch, use HTTPS, secure hosting, a privacy policy,
 * a managed database, backups, monitoring and stronger abuse protection.
 */
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,join,sep} from 'node:path';

const ROOT=resolve(fileURLToPath(new URL('.',import.meta.url)));
const DATA=resolve(ROOT,'data');
const RSVP_FILE=join(DATA,'rsvps.json');
const PORT=Number(process.env.PORT || 3000);
const TOKEN=process.env.ADMIN_TOKEN || '';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
Object.assign(MIME, { '.woff2': 'font/woff2', '.ttf': 'font/ttf' });
const limits=new Map();
let writeLock=Promise.resolve();

async function readRecords() {
  try{const list=JSON.parse(await readFile(RSVP_FILE,'utf8'));return Array.isArray(list)?list:[];}
  catch(error){if(error.code==='ENOENT')return [];throw error;}
}
async function persist(record){
  const job=writeLock.catch(()=>{}).then(async()=>{
    const items=await readRecords();
    const index=items.findIndex(x=>x.phone===record.phone);
    if(index>=0)items[index]=record;else items.push(record);
    await mkdir(DATA,{recursive:true});
    const temporary=join(DATA,`rsvps-${process.pid}.tmp`);
    await writeFile(temporary,JSON.stringify(items,null,2),{mode:0o600});
    await rename(temporary,RSVP_FILE);
  });
  writeLock=job;return job;
}
function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
function rateLimit(ip){
  const now=Date.now(),windowMs=15*60*1000;
  const current=(limits.get(ip)||[]).filter(t=>now-t<windowMs);
  if(current.length>=30){limits.set(ip,current);return false;}
  current.push(now);limits.set(ip,current);return true;
}
function parseInput(raw){
  if(!raw || typeof raw!=='object')throw Error('Invalid data');
  const name=String(raw.name||'').trim().slice(0,100),phone=String(raw.phone||'').trim().slice(0,16),message=String(raw.message||'').trim().slice(0,500);
  const guestCount=Number(raw.guestCount);
  if(name.length<2 || !/^[+0-9()\s-]{8,16}$/.test(phone) || !Number.isInteger(guestCount) || guestCount<1 || guestCount>20)throw Error('Invalid name, contact or guest count');
  if(!Array.isArray(raw.responses) || raw.responses.length>15 || raw.responses.some(r=>!r || typeof r.event!=='string' || r.event.length>80 || !['Yes','Maybe','No'].includes(r.response)))throw Error('Invalid event responses');
  return {name,phone,guestCount,responses:raw.responses.map(r=>({event:r.event.slice(0,80),date:String(r.date||'').slice(0,10),response:r.response})),message,submittedAt:new Date().toISOString()};
}
async function handleApi(req,res,path){
  const origin=req.headers.origin;
  if(origin){
    try { const parsed=new URL(origin); if(parsed.host!==req.headers.host){json(res,403,{error:'Cross-site submissions disallowed'});return;}}
    catch {json(res,403,{error:'Invalid origin'});return;}
  }
  if(path==='/api/rsvp' && req.method==='POST'){
    if(!rateLimit(req.socket.remoteAddress||'unknown')){json(res,429,{error:'Too many requests'});return;}
    let size=0,buffer='';
    for await(const chunk of req){size+=chunk.length;if(size>12000){json(res,413,{error:'Request too large'});return;}buffer+=chunk;}
    try {const item=parseInput(JSON.parse(buffer));await persist(item);json(res,200,{ok:true});}
    catch(error){json(res,400,{error:error.message||'Unable to save RSVP'});}
    return;
  }
  if(path==='/api/rsvps' && req.method==='GET'){
    if(!TOKEN || TOKEN.length<16){json(res,503,{error:'Set ADMIN_TOKEN to 16+ characters to enable admin access'});return;}
    const provided=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    // Timing-safe comparison for token auth.
    const {timingSafeEqual}=await import('node:crypto');
    const a=Buffer.from(provided),b=Buffer.from(TOKEN);
    if(a.length!==b.length || !timingSafeEqual(a,b)){json(res,401,{error:'Invalid admin token'});return;}
    json(res,200,{rsvps:await readRecords()});return;
  }
  json(res,404,{error:'Unknown API endpoint'});
}
async function serveStatic(req,res,path){
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let clean;
  try{clean=decodeURIComponent(path);}catch{res.writeHead(400);res.end();return;}
  if(clean==='/')clean='/index.html';
  const file=resolve(ROOT,'.'+clean);
  if(!(file===ROOT || file.startsWith(ROOT+sep)) || file.startsWith(DATA+sep) || file.includes(`${sep}.git${sep}`) || file.endsWith('.tmp') || clean.includes('..')){res.writeHead(403);res.end('Forbidden');return;}
  if(['server.mjs','package.json','package-lock.json'].some(x=>file===join(ROOT,x))){res.writeHead(403);res.end();return;}
  try{
    const stats=await stat(file);if(!stats.isFile())throw Error('not file');
    const type=MIME[extname(file).toLowerCase()]||'application/octet-stream';
    const headers={'content-type':type,'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','cross-origin-opener-policy':'same-origin','cache-control':'no-cache','content-length':stats.size};
    res.writeHead(200,headers);
    if(req.method==='HEAD')res.end();else res.end(await readFile(file));
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),path=url.pathname;
    if(path.startsWith('/api/'))await handleApi(req,res,path);
    else await serveStatic(req,res,path);
  } catch(error){console.error(error);if(!res.headersSent)json(res,500,{error:'Server error'});else res.end();}
});
server.listen(PORT,()=>{
  console.log(`\nShahi Patra invitation: http://localhost:${PORT}`);
  console.log(`RSVP admin: http://localhost:${PORT}/admin.html (${TOKEN.length>=16?'token configured':'set ADMIN_TOKEN to enable'})\n`);
});
