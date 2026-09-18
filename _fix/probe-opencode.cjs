
const https = require('https');
const cfg = {
  base: 'https://api.hcnsec.cn/v1',
  key: 'sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf'
};

function req(method, p, body) {
  return new Promise((resolve) => {
    const u = new URL(cfg.base + p);
    const payload = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const opts = {
      method,
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      headers: {
        'Authorization': 'Bearer ' + cfg.key,
        'Accept': 'application/json',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {})
      },
      timeout: 60000,
      rejectUnauthorized: false
    };
    const t0 = Date.now();
    const r = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, ms: Date.now() - t0, body: txt });
      });
    });
    r.on('error', (e) => resolve({ status: 0, ms: Date.now() - t0, body: 'ERR ' + e.code + ' :: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, ms: Date.now() - t0, body: 'TIMEOUT' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  // 1) /chat/completions with Qwen3.8-27B
  const r1 = await req('POST', '/chat/completions', {
    model: 'Qwen3.8-27B',
    messages: [{ role: 'user', content: '你好' }],
    max_tokens: 16
  });
  console.log('=== 1) Qwen3.8-27B POST /chat/completions ===');
  console.log('HTTP=' + r1.status + ' 耗时=' + (r1.ms/1000).toFixed(2) + 's');
  console.log(r1.body.length > 600 ? r1.body.slice(0, 600) + ' ...[截断]' : r1.body);
  console.log('');

  // 2) 不带 /v1
  const r2 = await new Promise((resolve) => {
    const opts = {
      method: 'POST', hostname: 'api.hcnsec.cn', port: 443,
      path: '/chat/completions',
      headers: { 'Authorization': 'Bearer ' + cfg.key, 'Content-Type': 'application/json' },
      timeout: 15000, rejectUnauthorized: false
    };
    const t0 = Date.now();
    const r = require('https').request(opts, (res) => {
      const c = [];
      res.on('data', (x) => c.push(x));
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now()-t0, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', (e) => resolve({ status: 0, ms: Date.now()-t0, body: 'ERR ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, ms: Date.now()-t0, body: 'TIMEOUT' }); });
    r.write(JSON.stringify({ model: 'Qwen3.8-27B', messages: [{ role: 'user', content: '你好' }] }));
    r.end();
  });
  console.log('=== 2) 不带 /v1（误配置） ===');
  console.log('HTTP=' + r2.status + ' 耗时=' + (r2.ms/1000).toFixed(2) + 's');
  console.log(r2.body.length > 400 ? r2.body.slice(0, 400) + ' ...[截断]' : r2.body);
  console.log('');

  // 3) 带尾斜杠
  const r3 = await new Promise((resolve) => {
    const opts = {
      method: 'POST', hostname: 'api.hcnsec.cn', port: 443,
      path: '/v1/chat/completions',
      headers: { 'Authorization': 'Bearer ' + cfg.key, 'Content-Type': 'application/json' },
      timeout: 15000, rejectUnauthorized: false
    };
    const t0 = Date.now();
    const r = require('https').request(opts, (res) => {
      const c = [];
      res.on('data', (x) => c.push(x));
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now()-t0, body: Buffer.concat(c).toString('utf8') }));
    });
    r.on('error', (e) => resolve({ status: 0, ms: Date.now()-t0, body: 'ERR ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, ms: Date.now()-t0, body: 'TIMEOUT' }); });
    r.write(JSON.stringify({ model: 'Qwen3.8-27B', messages: [{ role: 'user', content: '你好' }] }));
    r.end();
  });
  console.log('=== 3) 带尾斜杠 /v1/（OpenCode 默认） ===');
  console.log('HTTP=' + r3.status + ' 耗时=' + (r3.ms/1000).toFixed(2) + 's');
  console.log(r3.body.length > 400 ? r3.body.slice(0, 400) + ' ...[截断]' : r3.body);
  console.log('');

  // 4) model 拼错（加 . 后缀常见手滑）
  const r4 = await req('POST', '/chat/completions', {
    model: 'Qwen3.8-27B ',  // 末尾空格
    messages: [{ role: 'user', content: '你好' }],
    max_tokens: 16
  });
  console.log('=== 4) model 末尾带空格 ===');
  console.log('HTTP=' + r4.status + ' 耗时=' + (r4.ms/1000).toFixed(2) + 's');
  console.log(r4.body.length > 400 ? r4.body.slice(0, 400) + ' ...[截断]' : r4.body);
})();
