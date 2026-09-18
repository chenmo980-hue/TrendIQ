
const https=require('https');
const BASE='https://api.hcnsec.cn/v1', KEY='sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf';
function call(model,stream,timeoutMs){
  return new Promise(r=>{
    const t0=Date.now();
    const body=JSON.stringify({model,messages:[{role:'user',content:'hi'}],max_tokens:5,stream});
    const u=new URL(BASE+'/chat/completions');
    const q=https.request({hostname:u.hostname,port:443,path:u.pathname,method:'POST',timeout:timeoutMs,
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json',Accept:'application/json','Content-Length':Buffer.byteLength(body)}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(((Date.now()-t0)/1000).toFixed(1)+'s  '+res.statusCode+' '+(res.statusMessage||'')+' :: '+d.replace(/\s+/g,' ').slice(0,240)))});
    q.on('error',e=>r(((Date.now()-t0)/1000).toFixed(1)+'s  ERR '+e.code+' '+e.message));
    q.on('timeout',()=>{q.destroy();r(((Date.now()-t0)/1000).toFixed(1)+'s  HANG (client cap '+timeoutMs+'ms)')});
    q.write(body);q.end();
  });
}
(async()=>{
  console.log('auto               stream=0 t=90s :', await call('auto',false,90000));
  console.log('DeepSeek-V4-Flash  stream=0 t=90s :', await call('DeepSeek-V4-Flash',false,90000));
  console.log('DeepSeek-V4-Flash  stream=1 t=45s :', await call('DeepSeek-V4-Flash',true,45000));
})();
