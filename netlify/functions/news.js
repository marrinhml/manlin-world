const Parser = require('rss-parser')

const sources = [
  // 文章类
  { url: 'https://www.gcores.com/rss', name: '机核网', type: 'article' },
  { url: 'http://www.yystv.cn/rss/feed', name: '游研社', type: 'article' },
  { url: 'https://www.guokr.com/handpick/rss/', name: '果壳网', type: 'article' },
  { url: 'https://www.solidot.org/index.rss', name: 'Solidot', type: 'article' },
  { url: 'https://sspai.com/feed', name: '少数派', type: 'article' },
  { url: 'https://www.huxiu.com/rss/0.xml', name: '虎嗅网', type: 'article' },
  { url: 'https://www.ifanr.com/feed', name: '爱范儿', type: 'article' },
  { url: 'https://www.geekpark.net/rss', name: '极客公园', type: 'article' },
  // 视频类
  { url: 'https://rsshub.app/bilibili/popular/weekly', name: 'B站每周必看', type: 'video' },
  { url: 'https://rsshub.app/bilibili/vsearch/%E7%A7%91%E5%B9%BB', name: 'B站科幻视频', type: 'video' },
  { url: 'https://rsshub.app/bilibili/partion/ranking/201/7', name: 'B站科学科普', type: 'video' },
  // 论坛类
  { url: 'https://rsshub.app/zhihu/hot', name: '知乎热榜', type: 'forum' },
  { url: 'https://www.v2ex.com/feed/tab/hot.xml', name: 'V2EX热门', type: 'forum' },
  // 赛事奖项类
  { url: 'https://news.google.com/rss/search?q=雨果奖+银河奖+星云奖+科幻+奖项&hl=zh-CN&gl=CN&ceid=CN:zh-Hans', name: '科幻奖项新闻', type: 'article' },
  { url: 'https://news.google.com/rss/search?q=Hugo+Award+Nebula+Award+Locus+science+fiction&hl=en-US&gl=US&ceid=US:en', name: 'Sci-Fi Awards', type: 'article' },
  { url: 'https://news.google.com/rss/search?q=科幻+获奖作品+推荐+年度+最佳&hl=zh-CN&gl=CN&ceid=CN:zh-Hans', name: '科幻作品资讯', type: 'article' },
  { url: 'https://news.google.com/rss/search?q=sci-fi+best+novel+award+winner+recommended&hl=en-US&gl=US&ceid=US:en', name: 'Sci-Fi Works', type: 'article' },
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

const eventKeywords = [
  '大赛', '赛事', '颁奖', '获奖', '银河奖', '星云奖',
  '科幻大会', '征文', '竞赛', '论坛', '峰会',
  '展览', '嘉年华', '开幕', '闭幕', '启动',
  '雨果奖', 'Hugo', 'Nebula', '轨迹奖', 'Locus',
  '斯特金奖', '克拉克奖', '世界科幻大会',
  'Worldcon', 'World Fantasy', 'Sturgeon',
  '提名', '入围', '揭晓', '评选', '候选',
  '终审', '复审', '初审', '参评',
  '最佳长篇', '最佳短篇', '最佳系列',
  '获奖作品', '年度最佳', '年度科幻',
  '往届', '通告', '入选', '榜单',
]

function isSciFiRelated(item) {
  const text = `${item.title || ''} ${item.categories ? item.categories.join(' ') : ''} ${item.contentSnippet ? item.contentSnippet.slice(0, 100) : ''}`.toLowerCase()
  return sciFiKeywords.some(kw => text.includes(kw.toLowerCase()))
}

function isEventRelated(item) {
  const text = `${item.title || ''} ${item.contentSnippet ? item.contentSnippet.slice(0, 150) : ''}`.toLowerCase()
  return eventKeywords.some(kw => text.includes(kw.toLowerCase()))
}

exports.handler = async (event, context) => {
  const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ManlinWorld/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    timeout: 8000,
  })

  const results = await Promise.allSettled(sources.map(source =>
    parser.parseURL(source.url).then(feed => {
      const items = feed.items.filter(isSciFiRelated).slice(0, 25).map(item => {
        let type = source.type
        if (isEventRelated(item)) {
          type = 'event'
        }
        return {
          title: item.title || '(无标题)',
          link: item.link || '',
          description: item.contentSnippet ? item.contentSnippet.replace(/\s+/g, ' ').trim().slice(0, 200) : '',
          pubDate: item.pubDate || item.isoDate || '',
          source: source.name,
          type: type,
        }
      })
      return items
    }).catch(e => {
      console.error(`[news] fetch ${source.name} failed:`, e.message)
      return []
    })
  ))

  const allItems = results.flatMap(r => r.value || [])

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
      articles: allItems.slice(0, 200),
      updatedAt: new Date().toISOString(),
      total: allItems.length,
    }),
  }
}