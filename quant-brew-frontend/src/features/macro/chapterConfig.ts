import { DimensionConfig } from './types';

export const LIQUIDITY_CONFIG: DimensionConfig = {
  factor: 'liquidity',
  coreQuestion: '市场上的钱是多了还是少了？当前流动性环境是宽松、观察期还是偏紧？',
  heroVerdict: 'Loose',
  heroMetrics: [
    { metricKey: 'us_net_liquidity', isPrimary: true },
    { metricKey: 'fed_balance_sheet', isPrimary: false },
    { metricKey: 'tga_balance', isPrimary: false },
    { metricKey: 'dxy', isPrimary: false }
  ],
  aiSummary: '尽管名义政策利率保持高位，但财政部的发债结构调整实质上为市场注入了充裕的流动性。只要 TGA 的泄洪和 RRP 的反向蓄水没有终结，高风险资产的估值扩张逻辑就暂无法被证伪。',
  chapters: [
    {
      id: 'us_liquidity',
      title: '从美联储到财政部：美国内部流动性运转',
      intro: '本章追踪驱动美元体系内生的核心流动性泵。重点辨析名义上的紧缩（QT）与实际上的放宽。',
      verdict: '财政操作对冲了美联储缩表，系统实际净流动性处于绝对高位。',
      thesis: '由于过度依赖短期国库券（T-bills），吸收的大多是RRP（逆回购）中的冗余资金，而非抽走真正的市场流动性。只要净流动性维持上升趋势，纳斯达克等高风险资产的估值扩张系统就难以被证伪。',
      keyMetrics: ['us_net_liquidity', 'fed_balance_sheet', 'rrp_balance'],
      evidenceTable: ['us_net_liquidity', 'fed_balance_sheet', 'tga_balance', 'rrp_balance', 'bank_reserves', 'financial_conditions_index'],
      chartEvidence: ['us_net_liquidity', 'rrp_balance'],
      explainers: [
        {
          metricKey: 'us_net_liquidity',
          definition: '美联储总资产减去财政部TGA账户及隔夜逆回购RRP。代表留在金融体系内实际流通的钱。',
          currentImplication: '虽然美联储在缩表，但TGA和RRP缩小的速度更快，导致净流动性绝对值不降反升。',
          whyItSupportsThesis: '净流动性向上是这波风险资产反弹的底层温床，只要不转向，做空宏观指数是不明智的。'
        },
        {
          metricKey: 'rrp_balance',
          definition: '非银金融机构存在美联储的闲置资金池。',
          currentImplication: '资金正以极快的速度流出逆回购账户进入系统。',
          whyItSupportsThesis: '流出的RRP变成了商业系统中的存款和抵押物，直接抵消了QT的流失。'
        }
      ],
      riskWatch: [
        {
          metricKey: 'rrp_balance',
          riskCondition: 'RRP 完全耗尽（触及零线）',
          potentialImpact: '一旦缓冲垫归零，美联储缩表将直接抽走商业银行准备金，触发真正的紧缩环境抛售。'
        }
      ]
    },
    {
      id: 'global_liquidity',
      title: '无风险利率与离岸美元环境',
      intro: '本章关注全球流动性的代理指标及美元走势。',
      verdict: '强美元周期尚未瓦解，全球其他市场的资金环境仍受压制。',
      thesis: '尽管美国内部放宽使得美股狂欢，但 10 年期美债收益率居高不下与强势美元，依然在无情抽干新兴市场的流动池。',
      keyMetrics: ['us10y_yield', 'dollar_index'],
      chartEvidence: ['dollar_index', 'us10y_yield'],
      explainers: [
        {
          metricKey: 'dollar_index',
          definition: '美元相对于他国货币的综合加权指数。',
          currentImplication: '高位震荡，压制了除美股外的全球资产定价。',
          whyItSupportsThesis: '强美元直接紧缩了离岸美元流动性。'
        }
      ]
    }
  ]
};

export const ECONOMY_CONFIG: DimensionConfig = {
  factor: 'economy',
  coreQuestion: '经济是在变好还是变差？企业盈利和内生需求是否仍有支撑？',
  heroVerdict: 'Slowing',
  heroMetrics: [
    { metricKey: 'gdp_growth', isPrimary: true },
    { metricKey: 'recession_probability', isPrimary: false },
    { metricKey: 'ism_services', isPrimary: false }
  ],
  aiSummary: '这是一种高度分化的"滚动式放缓"：制造业深陷收缩，但作为GDP主体的服务业保持强大韧性。就业市场正在从极度火热走向供需平衡，信用端未见系统性违约，硬着陆发生概率被不断延后。',
  chapters: [
    {
      id: 'growth',
      title: '增长动能：分化的冰与火',
      intro: '本章全面考察整体产出和企业/消费者两侧的需求韧性。',
      verdict: '服务业托底撑住大盘，制造业复苏一再折戟，但尚未触发全面失速。',
      thesis: '只要服务业PMI维持在50的荣枯线之上，且零售销售并未出现断崖式停滞，衰退预期就只能停留在纸面上。',
      keyMetrics: ['ism_services', 'ism_manufacturing'],
      evidenceTable: ['ism_services', 'ism_manufacturing', 'gdp_growth', 'recession_probability', 'industrial_production_yoy', 'retail_sales_yoy', 'consumer_confidence', 'leading_economic_index'],
      chartEvidence: ['ism_services', 'ism_manufacturing', 'retail_sales_yoy'],
      explainers: [
        {
          metricKey: 'ism_services',
          definition: '代表美国经济占比接近80%的服务行业扩张情绪。',
          currentImplication: '持续稳在荣枯线之上，是经济软着陆的核心支柱。',
          whyItSupportsThesis: '服务业不倒，内生消费需求就无法被证伪衰退。'
        },
        {
          metricKey: 'ism_manufacturing',
          definition: '制造业情绪指标，对信贷和经济周期的敏感度远高于服务业。',
          currentImplication: '长期低于50收缩区间，企业不再补库扩产。',
          whyItSupportsThesis: '制造业的疲软解释了为什么经济在"Slowing"而非全面"Expanding"。'
        }
      ]
    },
    {
      id: 'employment',
      title: '就业锚：冷却不代表崩盘',
      intro: '本章跟踪劳动力市场的边际恶化速度，因为这是消费者支出唯一的保障。',
      verdict: '劳动力市场从供需极度失衡逐渐走向正常化降温。',
      thesis: '失业率虽然缓慢攀升并触发萨姆规则预警，但这是因劳动力供给增加（如移民涌入）导致的，而非企业端出现系统性大裁员。只要新增非农不连续暴跌，就业盘依然稳固。',
      keyMetrics: ['unemployment_rate', 'nonfarm_payrolls'],
      evidenceTable: ['unemployment_rate', 'nonfarm_payrolls', 'average_hourly_earnings'],
      chartEvidence: ['unemployment_rate'],
      explainers: [
        {
          metricKey: 'unemployment_rate',
          definition: '总失业人口比例，硬着陆的最核心同步指标。',
          currentImplication: '底层趋势轻微抬头，打破了历史低点的神话。',
          whyItSupportsThesis: '上升速度可控，属于软着陆必需的降温过程。'
        }
      ]
    }
  ]
};

// ... other configs (Inflation, Sentiment) omitted for immediate slice execution, 
// can be fully laid out as we expand 

export const DIMENSION_CONFIGS: Record<string, DimensionConfig> = {
  liquidity: LIQUIDITY_CONFIG,
  economy: ECONOMY_CONFIG,
  // inflationRates: INFLATION_CONFIG,
  // sentiment: SENTIMENT_CONFIG
};
