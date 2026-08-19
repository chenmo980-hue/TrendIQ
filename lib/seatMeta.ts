/**
 * Shared Hot-Money / Institutional Seat Meta Knowledge Base
 * Used by both stock dragon-tiger detail service and the real-time limit-up board engine.
 */

export const FAMOUS_HOT_MONEY_MAP: Record<string, { tag: string; label: string; desc: string; winRate: number }> = {
  '中信证券股份有限公司上海分公司': {
    tag: '葛卫东 / 顶流混沌投资',
    label: '中信证券上海分公司 (葛卫东/混沌投资)',
    desc: '偏好高成长硬科技、算力半导体、容量主线龙头，资金体量极大，通常以大格局波段锁仓为主。',
    winRate: 72.5,
  },
  '国泰海通证券股份有限公司上海江苏路证券营业部': {
    tag: '章盟主 / 顶级老牌游资',
    label: '国泰海通上海江苏路 (章盟主)',
    desc: '江浙游资领军人物，擅长中大市值主线龙头的首板或2板大单锁仓，引导力与号召力极强。',
    winRate: 70.8,
  },
  '中信证券股份有限公司北京呼家楼证券营业部': {
    tag: '呼家楼 / 狂暴空间龙',
    label: '中信证券北京呼家楼 (顶级游资)',
    desc: '主升浪空间龙狂暴顶板与弱转强接力，短线爆发力极其凶悍，主导市场最高标高度。',
    winRate: 74.2,
  },
  '开源证券股份有限公司西安太华路证券营业部': {
    tag: '方新侠 / 大格局龙头',
    label: '开源证券西安太华路 (方新侠)',
    desc: '大格局主线趋势龙头造势者，通常以数亿元大单封死主线空间核心，擅长主线大级别波段。',
    winRate: 71.6,
  },
  '国泰海通证券股份有限公司绍兴劳动路证券营业部': {
    tag: '赵老哥 / 八年一万倍',
    label: '国泰海通绍兴劳动路 (赵老哥)',
    desc: '短线超短打板顶级代表人物，以二板定龙头、主升加速与分歧点火见长。',
    winRate: 69.8,
  },
  '中国银河证券股份有限公司北京金融街证券营业部': {
    tag: '金融街 / 超级大户',
    label: '银河证券北京金融街 (顶级游资/超级大户)',
    desc: '专注于高辨识度市场总龙、高标接力与强趋势主升加速，溢价率极高。',
    winRate: 69.4,
  },
  '国泰海通证券股份有限公司上海静安区南京西路证券营业部': {
    tag: '小鳄鱼 / 新生代顶流',
    label: '国泰海通上海南京西路 (小鳄鱼)',
    desc: '新生代顶级游资，手法全面，擅长大盘股首板、弱转强、龙头接力与容量核心。',
    winRate: 73.0,
  },
  '东海证券股份有限公司溧阳分公司': {
    tag: '孙哥 / 溧阳路',
    label: '东海证券溧阳分公司 (孙哥)',
    desc: '老牌顶级游资，擅长大资金合力顶板、主线反包与高辨识度龙头打造。',
    winRate: 68.5,
  },
  '华泰证券股份有限公司天津广东路证券营业部': {
    tag: '天津帮 / 连板接力',
    label: '华泰证券天津广东路 (天津帮)',
    desc: '主板连板接力与分歧转一致点火，手法果断凌厉，善于引导连板情绪。',
    winRate: 66.8,
  },
  '浙商证券股份有限公司杭州五星路证券营业部': {
    tag: '杭州帮 / 知名游资',
    label: '浙商证券杭州五星路 (杭州帮)',
    desc: '浙江活跃游资主力，主打日内热点题材首板抢筹与次日高溢价冲高兑现。',
    winRate: 67.4,
  },
  '甬兴证券有限公司安徽分公司': {
    tag: '安徽帮 / 20cm爆发',
    label: '甬兴证券安徽分公司 (安徽帮)',
    desc: '创业板20cm及低位新题材发酵第一梯队，短线操作极度活跃，封板坚决。',
    winRate: 68.0,
  },
  '国泰海通证券股份有限公司武汉紫阳东路证券营业部': {
    tag: '紫阳东路 / 题材先锋',
    label: '国泰海通武汉紫阳东路 (知名游资)',
    desc: '热点题材爆发初期抢筹点火，日内封板坚决。',
    winRate: 65.5,
  },
  '东兴证券股份有限公司重庆万州证券营业部': {
    tag: '成泉系 / 川渝主力',
    label: '东兴证券重庆万州 (川渝游资/成泉系)',
    desc: '擅长潜伏题材与反弹行情主攻，波段资金介入深度极高。',
    winRate: 64.2,
  },
  '华鑫证券有限责任公司上海分公司': {
    tag: '华鑫量化 / 极速打板',
    label: '华鑫证券上海分公司 (量化打板先锋)',
    desc: '极速交易VIP通道席位，以算法毫秒级秒板封单著称。',
    winRate: 66.2,
  },
  '中国国际金融股份有限公司上海分公司': {
    tag: '中金量化 / 外资通道',
    label: '中金上海分公司 (量化/外资活跃席位)',
    desc: '多空高频交易与日内T+0对冲，常见于放量异动核心股。',
    winRate: 63.8,
  },
  '华泰证券股份有限公司南京天元东路证券营业部': {
    tag: '作手新一 / 顶级游资',
    label: '华泰证券南京天元东路 (作手新一)',
    desc: '专注于主线核心与主升浪大波段，擅长大成交容量龙头的趋势加仓。',
    winRate: 71.2,
  },
  '华鑫证券有限责任公司上海宛平南路证券营业部': {
    tag: '炒股养家 / 核心心法',
    label: '华鑫证券上海宛平南路 (炒股养家)',
    desc: '情绪周期大师，擅长市场转折期的情绪拐点首板与弱转强确认。',
    winRate: 72.0,
  },
  '国盛证券有限责任公司宁波桑田路证券营业部': {
    tag: '宁波桑田路 / 短线超短',
    label: '国盛证券宁波桑田路 (桑田路)',
    desc: '以换手连板、高位接力与弱转强为主，风格极其彪悍。',
    winRate: 67.8,
  },
  '东方财富证券股份有限公司拉萨团结路第二证券营业部': {
    tag: '散户天团 / 拉萨大本营',
    label: '东方财富拉萨团结路第二营业部 (散户大本营)',
    desc: '市场活跃散户与游资协同成交集中地，换手率极高，体现散户跟风热度。',
    winRate: 52.4,
  },
  '东方财富证券股份有限公司拉萨东环路第一证券营业部': {
    tag: '散户天团 / 拉萨帮',
    label: '东方财富拉萨东环路第一营业部 (散户大本营)',
    desc: '市场高换手异动股常客，反映市场个人投资者情绪风向标。',
    winRate: 51.8,
  },
  '东方财富证券股份有限公司拉萨团结路第一证券营业部': {
    tag: '散户天团 / 拉萨帮',
    label: '东方财富拉萨团结路第一营业部 (散户大本营)',
    desc: '活跃高换手标的集中地，常伴随盘中高频对倒与散户接盘。',
    winRate: 52.0,
  },
  '东方财富证券股份有限公司拉萨金融城南环路证券营业部': {
    tag: '散户天团 / 拉萨帮',
    label: '东方财富拉萨金融城南环路 (散户大本营)',
    desc: '东财互联网散户席位，反映散户日内做T与跟风追涨动向。',
    winRate: 51.5,
  },
};

export function resolveSeatMeta(rawDeptName: string): {
  seatType: 'institution' | 'hot_money' | 'northbound' | 'retail';
  seatName: string;
  hotMoneyTag: string;
  hotMoneyDesc: string;
  winRate30d: number;
} {
  const name = (rawDeptName || '').trim();
  if (!name) {
    return {
      seatType: 'hot_money',
      seatName: '实力游资席位',
      hotMoneyTag: '主力游资',
      hotMoneyDesc: '短线主力席位，参与日内多空博弈。',
      winRate30d: 60.0,
    };
  }

  // 1. Institution
  if (name.includes('机构专用')) {
    return {
      seatType: 'institution',
      seatName: '机构专用席位 (公募基金 / 社保 / 险资大额买单)',
      hotMoneyTag: '机构重仓席位',
      hotMoneyDesc: '公募基金、社保基金、保险资管等正规机构专用交易通道，主打中长线基本面与趋势加仓。',
      winRate30d: 69.5,
    };
  }

  // 2. Northbound
  if (name.includes('股通专用') || name.includes('香港中央结算')) {
    const isSH = name.includes('沪股通');
    return {
      seatType: 'northbound',
      seatName: isSH
        ? '北向资金 · 沪股通专用席位 (外资/香港中央结算)'
        : '北向资金 · 深股通专用席位 (外资/香港中央结算)',
      hotMoneyTag: '北向外资核心',
      hotMoneyDesc: '香港中央结算有限公司通道，代表海外机构投资者及北上聪明资金的重仓动向。',
      winRate30d: 67.8,
    };
  }

  // 3. Retail / Lhasa
  if (name.includes('拉萨团结路') || name.includes('拉萨东环路') || name.includes('拉萨金融城')) {
    const famous = FAMOUS_HOT_MONEY_MAP[name];
    return {
      seatType: 'retail',
      seatName: famous?.label || name,
      hotMoneyTag: '散户天团 / 拉萨大本营',
      hotMoneyDesc: famous?.desc || '东方财富互联网散户与活跃超短大户集中地，反映市场个人投资者跟风情绪。',
      winRate30d: famous?.winRate || 52.0,
    };
  }

  // 4. Known Famous Hot Money
  const famous = FAMOUS_HOT_MONEY_MAP[name];
  if (famous) {
    return {
      seatType: 'hot_money',
      seatName: famous.label,
      hotMoneyTag: famous.tag,
      hotMoneyDesc: famous.desc,
      winRate30d: famous.winRate,
    };
  }

  // 5. General Department
  let tag = '实力游资席位';
  let desc = '短线主力游资营业部，擅长热点题材点火、连板接力与高位承接。';
  let winRate = 61.5;

  if (name.includes('上海分公司') || name.includes('北京分公司') || name.includes('深圳分公司') || name.includes('总部')) {
    tag = '券商总部 / 大户通道';
    desc = '券商总部及分公司VIP通道，多为量化对冲基金、私募机构及超级大户席位。';
    winRate = 64.5;
  }

  return {
    seatType: 'hot_money',
    seatName: name,
    hotMoneyTag: tag,
    hotMoneyDesc: desc,
    winRate30d: winRate,
  };
}