
const https = require('https');

const base = 'https://api.hcnsec.cn';
const key = 'sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf';

function req(path, body, extraHeaders, label) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const opts = {
      method: 'POST', hostname: 'api.hcnsec.cn', port: 443,
      path,
      headers: Object.assign({
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'opencode/0.3.17'
      }, extraHeaders || {}),
      timeout: 60000, rejectUnauthorized: false
    };
    const t0 = Date.now();
    const chunks = [];
    const r = https.request(opts, (res) => {
      res.on('data', (c) => {
        chunks.push(c);
        if (chunks.length === 1) {
          console.log('[' + label + '] 首包 headers:');
          console.log(JSON.stringify(res.headers, null, 0).slice(0, 400));
        }
      });
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        console.log('[' + label + '] HTTP=' + res.statusCode + ' 耗时=' + ((Date.now()-t0)/1000).toFixed(2) + 's 长度=' + txt.length);
        console.log(txt.length > 900 ? txt.slice(0, 900) + ' ...[截断]' : txt);
        console.log('');
        resolve();
      });
    });
    r.on('error', (e) => { console.log('[' + label + '] ERR ' + e.message); console.log(''); resolve(); });
    r.on('timeout', () => { r.destroy(); console.log('[' + label + '] TIMEOUT'); console.log(''); resolve(); });
    r.write(payload);
    r.end();
  });
}

(async () => {
  // 1) OpenCode 典型形态：stream:true（OpenCode 默认流式）
  await req('/v1/chat/completions', {
    model: 'Qwen3.8-27B',
    messages: [{ role: 'user', content: '你好' }],
    stream: true,
    max_tokens: 32
  }, {}, 'stream=true (OpenCode 默认)');

  // 2) stream + stream_options.include_usage（OpenCode 某些版本带）
  await req('/v1/chat/completions', {
    model: 'Qwen3.8-27B',
    messages: [{ role: 'user', content: '你好' }],
    stream: true,
    stream_options: { include_usage: true }
  }, {}, 'stream+usage');

  // 3) 非流式但带 OpenCode 风格 UA
  await req('/v1/chat/completions', {
    model: 'Qwen3.8-27B',
    messages: [{ role: 'user', content: '你好' }],
    max_tokens: 32
  }, {}, '非流式 UA=opencode');

  // 4) Anthropic 格式（OpenCode 若把 provider 配成 anthropic 协议会打 /v1/messages）
  await req('/v1/messages', {
    model: 'Qwen3.8-27B',
    max_tokens: 32,
    messages: [{ role: 'user', content: '你好' }]
  }, { 'anthropic-version': '2023-06-01' }, 'anthropic /v1/messages');

  // 5) Anthropic 格式打到 chat/completions（provider 混淆的另一种形态）
  await req('/v1/chat/completions', {
    model: 'Qwen3.8-27B',
    max_tokens: 32,
    system: '',
    messages: [{ role: 'user', content: { type: 'text', text: '你好' } }]
  }, { 'anthropic-version': '2023-06-01' }, 'anthropic 体 + openai 路径');
})();
