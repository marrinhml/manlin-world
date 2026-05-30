const Parser = require('rss-parser')

const sources = [
  { url: 'https://www.gcores.com/rss', name: '机核网' },
  { url: 'http://www.yystv.cn/rss/feed', name: '游研社' },
  { url: 'https://www.guokr.com/handpick/rss/', name: '果壳网' },
  { url: 'https://www.solidot.org/index.rss', name: 'Solidot' },
  { url: 'https://sspai.com/feed', name: '少数派' },
  { url: 'https://www.huxiu.com/rss/0.xml', name: '虎嗅网' },
  { url: 'https://www.ifanr.com/feed', name: '爱范儿' },
  { url: 'https://www.geekpark.net/rss', name: '极客公园' },
]

const sciFiKeywords = [
  '科幻', '宇宙', '太空', '外星', 'NASA', 'SpaceX', '火星',
  'AI', '人工智能', '机器人', '未来', '科技', '虚拟现实', 'VR',
  'AR', '元宇宙', '量子', '银河', '星际', '卫星', '火箭',
  '探测器', '空间站', '月球', '太阳系', '天体', '天文',
  '神经', '基因', '克隆', '赛博', '机械', '义体',
  '时间旅行', '平行宇宙', '黑洞', '星云', '超导',
  '自动驾驶', '脑机', '数字生命', '仿生',
  '游戏', '影视', '电影', '动画', '漫画',
]

function isSciFiRelated(item) {
  const text = `${item.title || ''} ${item.categories ? item.categories.join(' ') : ''} ${item.contentSnippet ? item.contentSnippet.slice(0, 100) : ''}`.toLowerCase()
  return sciFiKeywords.some(kw => text.includes(kw.toLowerCase()))
}

exports.handler = async (event, context) => {
  const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ManlinWorld/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    timeout: 10000,
  })

  const allItems = []

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url)
      const items = feed.items.filter(isSciFiRelated).slice(0, 25).map(item => ({
        title: item.title || '(无标题)',
        link: item.link || '',
        description: item.contentSnippet ? item.contentSnippet.replace(/\s+/g, ' ').trim().slice(0, 200) : '',
        pubDate: item.pubDate || item.isoDate || '',
        source: source.name,
      }))
      allItems.push(...items)
    } catch (e) {
      console.error(`[news] fetch ${source.name} failed:`, e.message)
    }
  }

  allItems.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=1800, stale-while-revalidate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articles: allItems.slice(0, 50),
      updatedAt: new Date().toISOString(),
      total: allItems.length,
    }),
  }
}