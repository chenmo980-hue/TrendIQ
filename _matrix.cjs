
const https=require('https');
const KEY='sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf';
function req(path,method,body,timeoutMs){
  return new Promise(r=>{
    const t0=Date.now();const u=new URL('https://api.hcnsec.cn'+path);
    const buf=body?Buffer.from(body):null;
    const q=https.request({hostname:u.hostname,port:443,path:u.pathname+u.search,method,timeout:timeoutMs,
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json',Accept:'application/json',...(buf?{'Content-Length':buf.length}:{})}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r({ms:Date.now()-t0,code:res.statusCode,body:d}))});
    q.on('error',e=>r({ms:Date.now()-t0,code:0,body:'ERR '+e.code}));
    q.on('timeout',()=>{q.destroy();r({ms:Date.now()-t0,code:-1,body:'HANG'})});
    if(buf)q.write(buf);q.end();});
}
(async()=>{
  const m=await req('/v1/models','GET',null,20000);
  const ids=(JSON.parse(m.body).data||[]).map(x=>x.id);
  console.log('CATALOGUE count='+ids.length);
  console.log('ids: '+ids.join(', '));

  const test=async(id)=>{
    const r=await req('/v1/chat/completions','POST',JSON.stringify({model:id,messages:[{role:'user',content:'hi'}],max_tokens:3}),12000);
    const tag=r.code===200?'OK ':(r.code===-1?'HANG':String(r.code));
    let detail='';
    try{const j=JSON.parse(r.body);detail=j.error?j.error.message:('-> '+(j.model||'?'))}catch{detail=r.body.slice(0,60)}
    return (id+'').padEnd(30)+String(r.ms).padStart(6)+'ms  '+tag.padEnd(5)+'  '+detail.slice(0,90);
  };
  const picks=ids.filter(x=>x!=='auto');
  const results=[];
  for(let i=0;i<picks.length;i+=5){
    results.push(...await Promise.all(picks.slice(i,i+5).map(test)));
  }
  console.log('\n--- per-model liveness (12s cap) ---');
  console.log(results.join('\n'));
  console.log('\n--- auto, repeated x3 (latency spread) ---');
  for(let i=0;i<3;i++){
    const r=await req('/v1/chat/completions','POST',JSON.stringify({model:'auto',messages:[{role:'user',content:'hi'}],max_tokens:3}),60000);
    let mdl='?';try{mdl=JSON.parse(r.body).model}catch{}
    console.log('auto#'+(i+1)+'  '+r.ms+'ms  '+r.code+'  routed->'+mdl);
  }
})();
