
const https=require('https');
const KEY='sk-placeholder-key';
function call(path,method,body,extra={}){
  return new Promise(r=>{
    const q=https.request({hostname:'kktoken.cc',port:443,path,method,timeout:25000,
      headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json',Accept:'application/json',...extra}},
      res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(res.statusCode+' '+res.statusMessage+' :: '+d.replace(/\s+/g,' ').slice(0,180)))});
    q.on('error',e=>r('ERR '+e.code));q.on('timeout',()=>{q.destroy();r('TIMEOUT')});
    if(body)q.write(body);q.end();
  });
}
(async()=>{
  const models=['deepseek-v4-flash-0731','deepseek-ai/deepseek-v4-pro-0813','gpt-5-6','deepseek-chat','gpt-4o','claude-3-5-sonnet'];
  for(const m of models){
    console.log(m.padEnd(34), await call('/v1/chat/completions','POST',JSON.stringify({model:m,messages:[{role:'user',content:'hi'}],max_tokens:5})));
  }
  console.log('--- path variants ---');
  console.log('/v1/models'.padEnd(34), await call('/v1/models','GET'));
  console.log('/models'.padEnd(34), await call('/models','GET'));
  console.log('/v1/chat/completions GET'.padEnd(34), await call('/v1/chat/completions','GET'));
  console.log('/chat/completions'.padEnd(34), await call('/chat/completions','POST',JSON.stringify({model:'deepseek-v4-flash-0731',messages:[{role:'user',content:'hi'}],max_tokens:5})));
})();
