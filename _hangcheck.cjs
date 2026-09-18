
const https=require('https');
const KEY='sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf';
function call(model,capMs){
  return new Promise(r=>{
    const t0=Date.now();
    const body=JSON.stringify({model,messages:[{role:'user',content:'hi'}],max_tokens:3});
    const buf=Buffer.from(body);
    const q=https.request({hostname:'api.hcnsec.cn',port:443,path:'/v1/chat/completions',method:'POST',timeout:capMs,
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json',Accept:'application/json','Content-Length':buf.length}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(((Date.now()-t0)/1000).toFixed(1)+'s  '+res.statusCode+'  '+d.replace(/\s+/g,' ').slice(0,110)))});
    q.on('error',e=>r(((Date.now()-t0)/1000).toFixed(1)+'s  ERR '+e.code));
    q.on('timeout',()=>{q.destroy();r('>'+((Date.now()-t0)/1000).toFixed(0)+'s  STILL NO RESPONSE (client cap hit)')});
    q.write(buf);q.end();});
}
(async()=>{
  console.log('glm-5.3 (your current)  cap 75s :', await call('glm-5.3',75000));
  console.log('glm-5.3  repeat         cap 75s :', await call('glm-5.3',75000));
  console.log('step-3.7-flash (control) cap 30s:', await call('step-3.7-flash',30000));
  console.log('glm-5.3-flash (control)  cap 30s:', await call('glm-5.3-flash',30000));
})();
