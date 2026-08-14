# 读势 · A股技术分析终端

一个 Next.js 全栈项目，功能对标 trendiq.net 的核心体验，但面向 A 股场景做了原创重构：

- **指标分析模式**：输入A股代码或中文名称（支持拼音/简称联想搜索）→ 自动拉取K线（日线 + 1/5/15/30/60/90/120分钟）→ 本地计算 MA / MACD / RSI / BOLL / KDJ / 支撑压力位 / 自动趋势线 → 鼠标悬停K线可实时查看该时点的 OHLC 与均线数值 → 规则引擎生成技术判断 → 可选一键调用 AI 生成自然语言综合解读（会结合大盘核心指数环境）
- **图表识别模式**：上传/拖拽任意行情软件的K线截图 → 调用 Claude 视觉模型识别形态、趋势线、关键位，并直接叠加标注画在原图上

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入你的 ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

## 自动化测试

纯逻辑层（技术指标计算、代码解析、判断规则、AI响应解析、分钟K线聚合、API异常兜底、请求体体积、代理客户端配置）都有单元测试覆盖，共 70 项，可自主运行验证：

```bash
npm test
```

图表渲染、缩放交互、真实数据抓取这几块因为需要浏览器/真实外网环境，测试覆盖不到，建议 `npm run dev` 后手动过一遍。

生产部署（推荐 Vercel，一键支持 Next.js API Routes）：

```bash
npm run build
npm run start
```

部署到 Vercel/其他平台时，记得在环境变量中配置 `ANTHROPIC_API_KEY`（不要写进代码或提交到仓库）。

## 项目结构

```
lib/
  stockCode.js      # A股代码规范化（600519 / sh600519 / 600519.SH 互转）
  indicators.js      # 技术指标纯函数计算（MA/EMA/MACD/RSI/BOLL/KDJ/支撑压力/趋势线）
  judgment.js         # 规则化技术判断生成器（不依赖AI，确定性输出）
  aggregateMinuteKline.js  # 分钟K线聚合（90/120分钟由30/60分钟本地合成，session-aware分组）
  parseStructuredAnalysis.js  # AI图表识别返回的JSON解析与坐标校验
  marketContext.js     # 获取大盘核心指数（上证/深证/创业板）实时涨跌，供AI解读引用
  safeFetchJson.js      # 前端健壮请求工具（非JSON响应时给出可读错误，而非原生解析报错）
  withJsonSafety.js     # API路由异常兜底包装器（确保任何情况都返回JSON，不生成HTML错误页）
pages/
  index.js             # 主页面（含中文名联想搜索、周期切换）
  api/kline.js          # 拉取K线+实时行情（基于 stock-sdk，支持日线与1/5/15/30/60/90/120分钟）
  api/search.js          # 股票代码/中文名/拼音搜索（基于 stock-sdk 的 search 接口）
  api/analyze-data.js   # 基于指标快照+大盘环境，调用AI生成自然语言解读
  api/analyze-image.js  # 图表截图AI识别 + 结构化坐标标注（Claude视觉模型）
components/
  KlineChart.js       # 蜡烛图（lightweight-charts），含自动趋势线/支撑压力线绘制、十字线联动均线图例
  IndicatorPulse.js    # "指标脉冲条"——把5个指标的多空状态压缩成一条读数带
  JudgmentPanel.js     # 技术判断展示 + AI解读按钮
  ImageAnalyzer.js     # 图表上传 + AI分析 + SVG标注叠加层（趋势线/关键位/形态框）
tests/
  *.test.mjs            # 纯逻辑单元测试，`npm test` 一键运行，共64项
```

## ⚠️ 关于数据源，商用前必读

`pages/api/kline.js` 现在改用开源库 [`stock-sdk`](https://github.com/chengzuopeng/stock-sdk)（npm: `stock-sdk`，87 star，TypeScript全类型，有单元/集成测试），
不再手写腾讯接口的请求与GBK解码逻辑。评估过它的代码质量后（有类型、有测试、CLI/MCP集成、活跃维护），认为可以放心用于demo/验证阶段。

**但风险本质没变**：`stock-sdk` 底层依然是封装腾讯财经、东方财富这些同样的**公开免费接口**，官方条款同样不允许直接商业化使用，也没有SLA保证。
它只是帮你把"怎么拿到数据"这层工程活干完了，"能不能商用"这个问题没有变。

**给多人正式使用之前**，建议仍然是：

1. 切换到 **Tushare Pro**（付费，基础版约年费2000元起，接口稳定、有官方授权）
2. 或对接持牌券商的行情数据接口（走正规数据授权）
3. 或至少加一层缓存/限流，降低对免费接口的调用压力

`pages/api/kline.js` 里数据获取逻辑很集中，未来换数据源改动量不大。

## 故障排查：403 {"error":{"type":"forbidden","message":"Request not allowed"}}

这个报错跟API key是否有效、账户有没有余额**完全无关**——它是 Anthropic 官方对**中国大陆IP**的地区封锁，
任何从大陆网络直连 `api.anthropic.com` 的请求都会被拒绝（连 Anthropic 自家的 Claude Code 在国内直连也是同样报错）。

解决办法：在 `.env.local` 里加一行 `ANTHROPIC_PROXY_URL=http://127.0.0.1:7890`（换成你本地代理软件实际的HTTP代理端口），
`lib/anthropicClient.js` 会自动把"调用Claude"这一条请求路径通过代理转发，不影响 `stock-sdk` 对腾讯/东财等接口的直连。

部署到 Vercel 等海外机房后，这个问题通常不会出现（机房本身就在国外网络环境），一般不需要设置这个变量。

## 故障排查：前端报 "JSON.parse: unexpected character..." 之类的错误

这类报错（尤其是Firefox会显示成这个措辞）几乎总是意味着**API路由内部抛了未捕获异常，Next.js返回了HTML错误页而不是JSON**。
现在所有API路由都套了 `lib/withJsonSafety.js` 兜底，理论上不会再出现这种情况；如果仍然出现：

1. 看一眼运行 `npm run dev` 的那个终端窗口，真实的报错堆栈会打印在那里
2. 前端现在用 `lib/safeFetchJson.js` 统一处理请求，报错信息里会直接带一段服务器返回内容的片段，方便定位

## 已知限制（如实说明，没有硬做）

- **个股所属板块/概念板块**：`stock-sdk` 没有"股票代码 → 所属板块"的反查接口，只能反过来查"某个板块包含哪些股票"。要做前者需要遍历全市场上百个板块的成分股列表去匹配，单次请求这样做不现实，所以AI解读目前不包含这个维度。
- **对应期货联动**：该SDK不提供境内股指期货（IF/IH/IC/IM）的实时行情接口（只有期货日K线和"全球期货"行情，不含境内股指期货实时报价），所以没有做期货联动分析，避免编造数据。
- 目前AI解读只接入了**大盘核心指数**（上证指数/深证成指/创业板指）的实时涨跌作为环境参考，这部分数据来源可靠。

## 分钟K线说明

支持日线 + 1/5/15/30/60/90/120分钟。其中 **90分钟由30分钟聚合而成、120分钟由60分钟聚合而成**——
这是官方接口不提供这两个周期时的本地合成方案（`lib/aggregateMinuteKline.js`），聚合时严格按"上午/下午交易时段"分组，
不会把午间休市前后的K线错误拼接，但和专业行情软件里"官方原生90/120分钟颗粒"相比，个别K线的边界可能有细微差异，这点如实告知。

## 关于"技术分析判断"的合规提示

`lib/judgment.js` 生成的所有文案都刻意避免给出具体的买卖点位或仓位建议，只描述技术面的客观统计特征，
并在末尾统一附加免责声明。如果之后要接入更多AI生成内容或人工点评，建议保持同样的克制原则——
即"分析现象"而不是"给出投资建议"，这也是绝大多数正规金融科技产品在合规上的通用做法。

## 后续可以扩展的方向

- 自选股列表 + 本地/云端持久化（当前登录态未实现）
- 分钟级/周线/月线多周期切换
- 涨跌停、龙虎榜、资金流向等更多维度数据接入
- 移动端适配优化（当前布局主要针对桌面宽屏）
- 用户账号系统与使用额度控制（如果要做成付费产品）
