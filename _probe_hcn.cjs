
const https=require('https');
const BASE='https://api.hcnsec.cn/v1', KEY='sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf';
function call(path,method,body){
  return new Promise(r=>{
    const u=new URL(BASE+path);
    const q=https.request({hostname:u.hostname,port:443,path:u.pathname+u.search,method,timeout:30000,
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json',Accept:'application/json'}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(res.statusCode+' '+(res.statusMessage||'')+' :: '+d.replace(/\s+/g,' ').slice(0,260)))});
    q.on('error',e=>r('ERR '+e.code+' '+e.message));q.on('timeout',()=>{q.destroy();r('TIMEOUT after 30s')});
    if(body)q.write(body); q.end();
  });
}
(async()=>{
  console.log('GET  /models                 :', await call('/models','GET'));
  console.log('POST /chat DeepSeek-V4-Flash :', await call('/chat/completions','POST',JSON.stringify({model:'DeepSeek-V4-Flash',messages:[{role:'user',content:'hi'}],max_tokens:5})));
  console.log('POST /chat ds-v4-flash-0731  :', await call('/chat/completions','POST',JSON.stringify({model:'deepseek-v4-flash-0731',messages:[{role:'user',content:'hi'}],max_tokens:5})));
  console.log('POST /chat BADMODEL          :', await call('/chat/completions','POST',JSON.stringify({model:'no-such-model-xyz',messages:[{role:'user',content:'hi'}],max_tokens:5})));
  console.log('POST /chat no model field    :', await call('/chat/completions','POST',JSON.stringify({messages:[{role:'user',content:'hi'}],max_tokens:5})));
  console.log('GET  /chat/completions       :', await call('/chat/completions','GET'));
  console.log('GET  /models?page=1          :', await call('/models?page=1','GET'));
})();
