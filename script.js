const STORAGE_KEY = 'liangmu_world'
const USER_KEY = 'manlin_users'
const SESSION_KEY = 'manlin_session'
const THEME_KEY = 'manlin_theme'

const categoryNames = {
  idea: '科幻点子',
  concept: '科幻概念',
  essay: '科幻随笔'
}

const tagClasses = {
  idea: 'tag-idea',
  concept: 'tag-concept',
  essay: 'tag-essay'
}

const randomNicknames = [
  '星尘旅人', '深空漂流者', '星云观测员', '黑洞探险家', '时间旅者',
  '银河漫游者', '虚空守望者', '量子旅法师', '超空间导航员', '恒星摄影师',
  '脉冲星监听员', '暗物质猎人', '虫洞工程师', '多维漫游者', '星环建筑师',
  '星尘收藏家', '光年邮差', '宇宙测绘员', '星海领航员', '星际拓荒者',
  '星语翻译官', '时空编织者', '星核钻探员', '星图绘制员', '星轨计算员',
  '深潜者', '星塔观测员', '星尘采集员', '星际引航员', '星火守护者'
]

let currentFilter = 'all'
let currentSort = 'time'
let searchQuery = ''
let currentTag = ''
let editingId = null
let deletingId = null
let ideas = []
let currentUser = null
let newsCache = null
let newsFilter = 'all'
let currentPage = 1
const ITEMS_PER_PAGE = 15
const NEWS_CACHE_KEY = 'manlin_news'
const NEWS_CACHE_TIME = 30 * 60 * 1000

function formatNewsDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const diff = now - d
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${d.getMonth() + 1}/${pad(d.getDate())}`
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getIdeas() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data).map(migrateIdea) : []
  } catch {
    return []
  }
}

function saveIdeas(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getUsers() {
  try {
    const data = localStorage.getItem(USER_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveUsers(data) {
  localStorage.setItem(USER_KEY, JSON.stringify(data))
}

function getSession() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function setSession(account) {
  if (account) {
    localStorage.setItem(SESSION_KEY, account)
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

function migrateIdea(idea) {
  if (idea.likes === undefined) idea.likes = 0
  if (!idea.likedBy) idea.likedBy = []
  if (!idea.comments) idea.comments = []
  if (!idea.authorNickname) idea.authorNickname = ''
  if (!idea.tags) idea.tags = []
  if (idea.views === undefined) idea.views = 0
  if (idea.comments) {
    idea.comments.forEach(c => {
      if (c.likes === undefined) c.likes = 0
      if (!c.likedBy) c.likedBy = []
      if (!c.replies) c.replies = []
      c.replies.forEach(r => {
        if (r.likes === undefined) r.likes = 0
        if (!r.likedBy) r.likedBy = []
      })
    })
  }
  return idea
}

function isHtmlContent(str) {
  return /<img[\s/>]/.test(str) || /^<(div|p|h[1-6]|span|a|b|i|u|em|strong)[\s>]/i.test(str)
}

function generateRandomNickname() {
  const used = getUsers().map(u => u.nickname).filter(Boolean)
  const available = randomNicknames.filter(n => !used.includes(n))
  if (available.length === 0) return randomNicknames[Math.floor(Math.random() * randomNicknames.length)]
  return available[Math.floor(Math.random() * available.length)]
}

function getUserNickname(account) {
  const users = getUsers()
  const user = users.find(u => u.account === account)
  return user ? user.nickname : account
}

const avatarColors = [
  '#7ec8e3', '#c9a84c', '#a78bfa', '#f472b6', '#34d399',
  '#fbbf24', '#60a5fa', '#f87171', '#a3e635', '#c084fc',
  '#2dd4bf', '#fb923c', '#818cf8', '#e879f9', '#4ade80'
]

function generateRandomAvatar(nickname) {
  const char = (nickname && nickname.length > 0) ? nickname[0] : '✦'
  const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${color}"/><text x="24" y="24" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans SC',sans-serif" font-size="22" font-weight="600" fill="#fff" letter-spacing="1">${char}</text></svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function getUserAvatar(account) {
  const users = getUsers()
  const user = users.find(u => u.account === account)
  return user && user.avatar ? user.avatar : ''
}

function maskAccount(account) {
  if (!account) return '-'
  if (account.includes('@')) {
    const [name, domain] = account.split('@')
    return name.length > 2 ? name.slice(0, 2) + '***@' + domain : name.slice(0, 1) + '***@' + domain
  }
  return account.length > 6 ? account.slice(0, 3) + '****' + account.slice(-3) : account.slice(0, 2) + '****'
}

function viewUserInfo(account) {
  if (!account) return
  const users = getUsers()
  const userData = users.find(u => u.account === account)
  const userIdeas = ideas.filter(item => item.author === account)
  const totalLikes = userIdeas.reduce((sum, item) => sum + (item.likes || 0), 0)
  const totalComments = userIdeas.reduce((sum, item) => sum + (item.comments ? item.comments.length : 0), 0)

  document.getElementById('userInfoNickname').textContent = userData ? getUserNickname(account) : '已注销'
  document.getElementById('userInfoAccount').textContent = account === currentUser ? account : maskAccount(account)
  document.getElementById('userInfoJoinDate').textContent = userData ? `注册于 ${formatDate(userData.createdAt)}` : '-'
  document.getElementById('userInfoStatPosts').textContent = userIdeas.length
  document.getElementById('userInfoStatLikes').textContent = totalLikes
  document.getElementById('userInfoStatComments').textContent = totalComments

  const avatarEl = document.querySelector('#userInfoModal .profile-avatar-large')
  if (userData && userData.avatar) {
    avatarEl.innerHTML = `<img class="avatar-img" src="${userData.avatar}" alt="">`
  } else {
    avatarEl.innerHTML = '✦'
  }

  openModal('userInfoModal')
}

function formatDate(isoStr) {
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDisplayIdeas() {
  let result = [...ideas]

  if (currentFilter === 'favorites') {
    if (!currentUser) return []
    const users = getUsers()
    const userData = users.find(u => u.account === currentUser)
    if (userData && userData.favorites && userData.favorites.length > 0) {
      result = result.filter(item => userData.favorites.includes(item.id))
    } else {
      return []
    }
    return result
  }

  if (currentFilter !== 'all') {
    result = result.filter(item => item.category === currentFilter)
  }

  if (currentTag) {
    result = result.filter(item => item.tags && item.tags.includes(currentTag))
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    result = result.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
    )
  }

  if (currentSort === 'hotness') {
    result.sort((a, b) => {
      const hotA = (a.likes || 0) + (a.comments ? a.comments.length : 0)
      const hotB = (b.likes || 0) + (b.comments ? b.comments.length : 0)
      return hotB - hotA || new Date(b.createdAt) - new Date(a.createdAt)
    })
  } else {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  return result
}

function updateSectionInfo() {
  const filtered = getDisplayIdeas()
  const titleEl = document.getElementById('sectionTitle')
  const countEl = document.getElementById('sectionCount')

  if (currentTag) {
    titleEl.textContent = `#${currentTag}`
  } else if (currentFilter === 'all') {
    titleEl.textContent = '全部内容'
  } else {
    titleEl.textContent = categoryNames[currentFilter] || '全部内容'
  }

  const suffix = searchQuery.trim() ? ' (搜索结果)' : ''
  countEl.textContent = `${filtered.length} 条记录${suffix}`
}

function renderIdeas() {
  const grid = document.getElementById('cardsGrid')
  const filtered = getDisplayIdeas()
  updateSectionInfo()

  if (ideas.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⟡</div>
        <p class="empty-text">世界尚无一物</p>
        <p class="empty-hint">点击「发布新内容」写下你的第一个科幻灵感</p>
      </div>`
    return
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⟡</div>
        <p class="empty-text">没有匹配的内容</p>
        <p class="empty-hint">试试其他关键词或分类</p>
      </div>`
    return
  }

  const isLoggedIn = !!currentUser
  const user = currentUser || ''

  updateTagFilterBar()

  grid.innerHTML = filtered.map((item, index) => {
    const catName = categoryNames[item.category] || '未分类'
    const tagClass = tagClasses[item.category] || ''
    const escapedTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const renderedContent = typeof marked !== 'undefined' && !isHtmlContent(item.content)
      ? marked.parse(item.content)
      : item.content
    const likeCount = item.likes || 0
    const commentCount = item.comments ? item.comments.length : 0
    const hotness = likeCount + commentCount
    const isLiked = isLoggedIn && item.likedBy && item.likedBy.includes(user)
    const usersList = getUsers()
    const curUserData = isLoggedIn ? usersList.find(u => u.account === user) : null
    const isFavorited = isLoggedIn && curUserData && curUserData.favorites && curUserData.favorites.includes(item.id)
    const style = `animation-delay: ${index * 0.06}s`
    const authorAvatar = getUserAvatar(item.author)

    const tagsHtml = item.tags && item.tags.length > 0
      ? `<div class="card-tags">${item.tags.map(t =>
          `<span class="card-tag-item" data-tag="${t.replace(/"/g, '&quot;')}">#${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
        ).join('')}</div>`
      : ''

    const commentsHtml = item.comments && item.comments.length > 0
      ? item.comments.map(c => {
          const cText = c.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          const cNickname = getUserNickname(c.author) || '匿名'
          const cAvatar = getUserAvatar(c.author)
          const cAvatarHtml = cAvatar ? `<img class="comment-avatar-img" src="${cAvatar}" alt="">` : '<div class="comment-avatar">✦</div>'
          const cIsLiked = isLoggedIn && c.likedBy && c.likedBy.includes(user)
          const repliesHtml = c.replies && c.replies.length > 0
            ? c.replies.map(r => {
                const rText = r.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                const rNickname = getUserNickname(r.author) || '匿名'
                const rAvatar = getUserAvatar(r.author)
                const rAvatarHtml = rAvatar ? `<img class="comment-avatar-img" src="${rAvatar}" alt="">` : '<div class="comment-avatar">✦</div>'
                const rIsLiked = isLoggedIn && r.likedBy && r.likedBy.includes(user)
                return `
                <div class="reply-item">
                  ${rAvatarHtml}
                  <div class="comment-body">
                    <div class="comment-author">${rNickname}</div>
                    <div class="comment-text">${rText}</div>
                    <div class="comment-sub-actions">
                      <button class="comment-sub-btn ${rIsLiked ? 'liked' : ''}" data-action="replyLike" data-idea-id="${item.id}" data-comment-id="${c.id}" data-reply-id="${r.id}">
                        <span class="sub-icon">${rIsLiked ? '♥' : '♡'}</span>
                        <span class="sub-count">${r.likes || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>`
              }).join('')
            : ''
          return `
            <div class="comment-item" data-comment-id="${c.id}">
              ${cAvatarHtml}
              <div class="comment-body">
                <div class="comment-author">${cNickname}</div>
                <div class="comment-text">${cText}</div>
                <div class="comment-sub-actions">
                  <button class="comment-sub-btn ${cIsLiked ? 'liked' : ''}" data-action="commentLike" data-idea-id="${item.id}" data-comment-id="${c.id}">
                    <span class="sub-icon">${cIsLiked ? '♥' : '♡'}</span>
                    <span class="sub-count">${c.likes || 0}</span>
                  </button>
                  ${isLoggedIn ? `<button class="comment-sub-btn" data-action="toggleReply" data-idea-id="${item.id}" data-comment-id="${c.id}">↩ 回复</button>` : ''}
                </div>
                ${repliesHtml}
                <div class="reply-form" id="replyForm-${item.id}-${c.id}" style="display:none">
                  <input type="text" class="reply-input" id="replyInput-${item.id}-${c.id}" placeholder="写下回复…" maxlength="200">
                  <button class="reply-submit" data-action="submitReply" data-idea-id="${item.id}" data-comment-id="${c.id}">发送</button>
                </div>
              </div>
            </div>`
        }).join('')
      : '<div class="comment-item" style="border:none;padding:4px 0"><div class="comment-text" style="color:var(--text-dim);font-size:12px">暂无评论</div></div>'

    return `
      <article class="idea-card" data-id="${item.id}" style="${style}">
        <span class="card-tag ${tagClass}">${catName}</span>
        <h3 class="card-title">${escapedTitle}</h3>
        ${tagsHtml}
        <div class="markdown-content">${renderedContent}</div>
        <div class="card-expand" data-action="view" data-id="${item.id}">展开全文 ▸</div>
        <div class="card-meta">
          <span class="card-author" data-author="${item.author || ''}">${authorAvatar ? `<img class="card-author-avatar" src="${authorAvatar}" alt="">` : ''}${item.authorNickname || '匿名探测员'}</span>
          <span class="card-time">${formatDate(item.createdAt)}</span>
          ${currentSort === 'hotness' ? `<span class="card-time" style="margin-left:auto">热度 ${hotness}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="card-action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-id="${item.id}">
            <span class="action-icon">${isLiked ? '♥' : '♡'}</span>
            <span class="action-count">${likeCount}</span>
          </button>
          <button class="card-action-btn" data-action="comment" data-id="${item.id}">
            <span class="action-icon">◷</span>
            <span class="action-count">${commentCount}</span>
          </button>
          <span class="card-action-stat">
            <span class="action-icon">◎</span>
            <span class="card-view-count">${item.views || 0}</span>
          </span>
          ${isLoggedIn ? `
          <button class="card-action-btn ${isFavorited ? 'favorited' : ''}" data-action="favorite" data-id="${item.id}">
            <span class="action-icon">${isFavorited ? '★' : '☆'}</span>
          </button>` : ''}
          <button class="card-action-btn" data-action="share" data-id="${item.id}">
            <span class="action-icon">↗</span>
          </button>
          <span class="card-actions-divider"></span>
          <button class="card-action-btn action-edit" data-action="edit" data-id="${item.id}">
            <span class="action-icon">✎</span>
          </button>
          <button class="card-action-btn action-delete" data-action="delete" data-id="${item.id}">
            <span class="action-icon">✕</span>
          </button>
        </div>
        <div class="card-comments" id="comments-${item.id}">
          <div class="comment-list">${commentsHtml}</div>
          ${isLoggedIn ? `
          <div class="comment-form">
            <input type="text" class="comment-input" id="commentInput-${item.id}" placeholder="写下你的评论…" maxlength="200">
            <button class="comment-submit" data-action="submitComment" data-id="${item.id}">发送</button>
          </div>` : ''}
        </div>
      </article>`
  }).join('')

  attachCardEvents()
  observeCards()
}

function attachCardEvents() {
  document.querySelectorAll('[data-action="like"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleLike(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="comment"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleComments(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleEdit(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleDelete(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="submitComment"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleSubmitComment(btn.dataset.id)
    })
  })

  document.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const id = input.id.replace('commentInput-', '')
        handleSubmitComment(id)
      }
    })
  })

  document.querySelectorAll('.card-tag-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const tag = el.dataset.tag
      setTag(currentTag === tag ? '' : tag)
    })
  })

  document.querySelectorAll('.card-author').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const author = el.dataset.author
      if (author) viewUserInfo(author)
    })
  })

  document.querySelectorAll('[data-action="favorite"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleFavorite(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="share"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleShare(btn.dataset.id)
    })
  })

  document.querySelectorAll('[data-action="view"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      openDetailModal(el.dataset.id)
    })
  })
})

  document.querySelectorAll('[data-action="commentLike"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleCommentLike(btn.dataset.ideaId, btn.dataset.commentId)
    })
  })

  document.querySelectorAll('[data-action="replyLike"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleReplyLike(btn.dataset.ideaId, btn.dataset.commentId, btn.dataset.replyId)
    })
  })

  document.querySelectorAll('[data-action="toggleReply"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleToggleReply(btn.dataset.ideaId, btn.dataset.commentId)
    })
  })

  document.querySelectorAll('[data-action="submitReply"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleSubmitReply(btn.dataset.ideaId, btn.dataset.commentId)
    })
  })

  document.querySelectorAll('.reply-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const parts = input.id.replace('replyInput-', '').split('-')
        if (parts.length === 2) {
          handleSubmitReply(parts[0], parts[1])
        }
      }
    })
  })
}

function handleLike(id) {
  if (!currentUser) {
    showToast('请先登录后点赞', 'failure')
    return
  }

  const idea = ideas.find(item => item.id === id)
  if (!idea) return

  if (!idea.likedBy) idea.likedBy = []
  if (idea.likes === undefined) idea.likes = 0

  const idx = idea.likedBy.indexOf(currentUser)
  const wasNotLiked = idx === -1

  if (idx > -1) {
    idea.likedBy.splice(idx, 1)
    idea.likes = Math.max(0, idea.likes - 1)
  } else {
    idea.likedBy.push(currentUser)
    idea.likes = (idea.likes || 0) + 1
  }

  saveIdeas(ideas)
  renderIdeas()

  if (wasNotLiked) {
    const btn = document.querySelector(`[data-action="like"][data-id="${id}"]`)
    if (btn) {
      btn.classList.add('like-anim')
      setTimeout(() => btn.classList.remove('like-anim'), 500)
    }
  }
}

function toggleComments(id) {
  const el = document.getElementById(`comments-${id}`)
  if (!el) return
  const wasClosed = !el.classList.contains('open')
  el.classList.toggle('open')
  if (wasClosed) {
    const idea = ideas.find(item => item.id === id)
    if (idea) {
      idea.views = (idea.views || 0) + 1
      const viewEl = document.querySelector(`[data-id="${id}"] .card-view-count`)
      if (viewEl) viewEl.textContent = idea.views
      saveIdeas(ideas)
    }
  }
}

function handleEdit(id) {
  const idea = ideas.find(item => item.id === id)
  if (!idea) return

  editingId = id
  document.getElementById('editTitle').value = idea.title
  document.getElementById('editContent').innerHTML = idea.content
  document.getElementById('editTags').value = (idea.tags || []).join(', ')

  document.querySelectorAll('#editCategorySelector .cat-option').forEach(el => {
    el.classList.toggle('active', el.dataset.value === idea.category)
  })

  openModal('editModal')
}

function openDetailModal(id) {
  const idea = ideas.find(item => item.id === id)
  if (!idea) return

  const users = getUsers()
  const authorData = users.find(u => u.account === idea.author)
  const authorNickname = authorData ? authorData.nickname : (idea.authorNickname || '匿名探测员')
  const authorAvatar = authorData ? authorData.avatar : ''
  const date = formatDate(idea.createdAt)
  const catNames = { idea: '科幻点子', concept: '科幻概念', story: '科幻故事', tech: '科技资讯' }
  const catName = catNames[idea.category] || '科幻点子'

  let renderedContent = idea.content
  if (typeof marked !== 'undefined' && !isHtmlContent(idea.content)) {
    renderedContent = marked.parse(idea.content)
  }

  const tagsHtml = idea.tags && idea.tags.length > 0
    ? '<div class="detail-tags">' + idea.tags.map(t => `<span class="detail-tag">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('') + '</div>'
    : ''

  const body = document.getElementById('detailBody')
  body.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-idea-title">${idea.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
      <div class="detail-meta">
        ${authorAvatar ? `<img class="detail-avatar" src="${authorAvatar}" alt="">` : ''}
        <span class="detail-author">${authorNickname}</span>
        <span class="detail-sep">·</span>
        <span class="detail-cat">${catName}</span>
        <span class="detail-sep">·</span>
        <span class="detail-date">${date}</span>
      </div>
      ${tagsHtml}
    </div>
    <div class="detail-divider"></div>
    <div class="detail-idea-content markdown-content-full">${renderedContent}</div>
  `

  openModal('detailModal')
}

function handleDelete(id) {
  deletingId = id
  openModal('confirmModal')
}

function handleSubmitComment(id) {
  if (!currentUser) {
    showToast('请先登录后评论', 'failure')
    return
  }

  const input = document.getElementById(`commentInput-${id}`)
  if (!input) return

  const text = input.value.trim()
  if (!text) return

  const idea = ideas.find(item => item.id === id)
  if (!idea) return

  if (!idea.comments) idea.comments = []

  idea.comments.push({
    id: generateId(),
    text,
    author: currentUser,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    replies: []
  })

  saveIdeas(ideas)
  input.value = ''

  const el = document.getElementById(`comments-${id}`)
  if (el && !el.classList.contains('open')) {
    el.classList.add('open')
  }

  renderIdeas()
}

function handleCommentLike(ideaId, commentId) {
  if (!currentUser) {
    showToast('请先登录后点赞', 'failure')
    return
  }
  const idea = ideas.find(item => item.id === ideaId)
  if (!idea || !idea.comments) return
  const comment = idea.comments.find(c => c.id === commentId)
  if (!comment) return
  if (!comment.likedBy) comment.likedBy = []
  if (comment.likes === undefined) comment.likes = 0
  const wasNotLiked = !comment.likedBy.includes(currentUser)
  const idx = comment.likedBy.indexOf(currentUser)
  if (idx > -1) {
    comment.likedBy.splice(idx, 1)
    comment.likes = Math.max(0, comment.likes - 1)
  } else {
    comment.likedBy.push(currentUser)
    comment.likes = (comment.likes || 0) + 1
  }
  saveIdeas(ideas)
  renderIdeas()
  if (wasNotLiked) {
    const btn = document.querySelector(`[data-action="commentLike"][data-idea-id="${ideaId}"][data-comment-id="${commentId}"]`)
    if (btn) {
      btn.classList.add('like-anim')
      setTimeout(() => btn.classList.remove('like-anim'), 500)
    }
  }
}

function handleReplyLike(ideaId, commentId, replyId) {
  if (!currentUser) {
    showToast('请先登录后点赞', 'failure')
    return
  }
  const idea = ideas.find(item => item.id === ideaId)
  if (!idea || !idea.comments) return
  const comment = idea.comments.find(c => c.id === commentId)
  if (!comment || !comment.replies) return
  const reply = comment.replies.find(r => r.id === replyId)
  if (!reply) return
  if (!reply.likedBy) reply.likedBy = []
  if (reply.likes === undefined) reply.likes = 0
  const wasNotLiked = !reply.likedBy.includes(currentUser)
  const idx = reply.likedBy.indexOf(currentUser)
  if (idx > -1) {
    reply.likedBy.splice(idx, 1)
    reply.likes = Math.max(0, reply.likes - 1)
  } else {
    reply.likedBy.push(currentUser)
    reply.likes = (reply.likes || 0) + 1
  }
  saveIdeas(ideas)
  renderIdeas()
  if (wasNotLiked) {
    const btn = document.querySelector(`[data-action="replyLike"][data-idea-id="${ideaId}"][data-comment-id="${commentId}"][data-reply-id="${replyId}"]`)
    if (btn) {
      btn.classList.add('like-anim')
      setTimeout(() => btn.classList.remove('like-anim'), 500)
    }
  }
}

function handleToggleReply(ideaId, commentId) {
  if (!currentUser) {
    showToast('请先登录后回复', 'failure')
    return
  }
  const form = document.getElementById(`replyForm-${ideaId}-${commentId}`)
  if (!form) return
  form.style.display = form.style.display === 'none' ? 'flex' : 'none'
  if (form.style.display === 'flex') {
    const input = document.getElementById(`replyInput-${ideaId}-${commentId}`)
    if (input) input.focus()
  }
}

function handleSubmitReply(ideaId, commentId) {
  if (!currentUser) {
    showToast('请先登录后回复', 'failure')
    return
  }
  const input = document.getElementById(`replyInput-${ideaId}-${commentId}`)
  if (!input) return
  const text = input.value.trim()
  if (!text) return
  const idea = ideas.find(item => item.id === ideaId)
  if (!idea) return
  if (!idea.comments) idea.comments = []
  const comment = idea.comments.find(c => c.id === commentId)
  if (!comment) return
  if (!comment.replies) comment.replies = []
  comment.replies.push({
    id: generateId(),
    text,
    author: currentUser,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: []
  })
  saveIdeas(ideas)
  input.value = ''
  const form = document.getElementById(`replyForm-${ideaId}-${commentId}`)
  if (form) form.style.display = 'none'
  const el = document.getElementById(`comments-${ideaId}`)
  if (el && !el.classList.contains('open')) {
    el.classList.add('open')
  }
  renderIdeas()
}

function handleFavorite(id) {
  if (!currentUser) {
    showToast('请先登录后收藏', 'failure')
    return
  }
  const users = getUsers()
  const userData = users.find(u => u.account === currentUser)
  if (!userData) return
  if (!userData.favorites) userData.favorites = []
  const idx = userData.favorites.indexOf(id)
  if (idx > -1) {
    userData.favorites.splice(idx, 1)
    showToast('已取消收藏', 'failure')
  } else {
    userData.favorites.push(id)
    showToast('已收藏', 'success')
  }
  saveUsers(users)
  renderIdeas()
}

function handleShare(id) {
  const url = `${window.location.origin}${window.location.pathname}?idea=${id}`
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('链接已复制，可以分享给其他探测员', 'success')
    }).catch(() => {
      fallbackCopy(url)
    })
  } else {
    fallbackCopy(url)
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    showToast('链接已复制，可以分享给其他探测员', 'success')
  } catch (e) {
    showToast('复制失败，请手动复制链接', 'failure')
  }
  document.body.removeChild(ta)
}

function setFilter(filter) {
  currentFilter = filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter)
  })

  if (filter === 'news') {
    document.getElementById('contentSection').style.display = 'none'
    document.getElementById('searchSortRow').style.display = 'none'
    document.getElementById('publishSection').style.display = 'none'
    document.getElementById('tagFilterBar').style.display = 'none'
    const newsSection = document.getElementById('newsSection')
    newsSection.style.display = 'block'
    if (!newsCache) {
      fetchNews()
    } else {
      renderNews(newsCache)
    }
  } else {
    document.getElementById('contentSection').style.display = 'block'
    document.getElementById('searchSortRow').style.display = 'flex'
    document.getElementById('newsSection').style.display = 'none'
    document.getElementById('publishSection').style.display = ''
    updateTagFilterBar()
    renderIdeas()
  }
}

function setSort(sort) {
  currentSort = sort
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === sort)
  })
  renderIdeas()
}

async function fetchNews() {
  const grid = document.getElementById('newsGrid')
  const countEl = document.getElementById('newsCount')
  countEl.textContent = '接收中…'
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⟡</div>
      <p class="empty-text">正在接收星际信号…</p>
      <p class="empty-hint">请稍候，正在从各星系节点获取最新资讯</p>
    </div>`

  try {
    const res = await fetch('/.netlify/functions/news')
    if (!res.ok) throw new Error('信号中断')
    const data = await res.json()

    newsCache = data.articles || []
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ articles: newsCache, time: Date.now() }))
    } catch (e) { /* ignore */ }

    currentPage = 1
    renderNews(newsCache)
    document.getElementById('newsUpdateTime').textContent = '更新于 ' + formatDate(data.updatedAt)
  } catch (e) {
    console.error('fetchNews error:', e)
    let fallback = null
    try {
      const cached = localStorage.getItem(NEWS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.articles && parsed.articles.length > 0) {
          fallback = parsed.articles
        }
      }
    } catch (e) { /* ignore */ }

    if (fallback) {
      newsCache = fallback
      renderNews(fallback)
      document.getElementById('newsUpdateTime').textContent = '离线缓存 · 可能不是最新'
      showToast('星际信号不稳定，已展示缓存内容', 'failure')
    } else {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⟡</div>
          <p class="empty-text">星际信号中断</p>
          <p class="empty-hint">无法连接到资讯节点，请稍后重试</p>
        </div>`
      countEl.textContent = '连接失败'
      showToast('无法获取星际资讯，请检查网络', 'failure')
    }
  }
}

async function refreshNews() {
  const grid = document.getElementById('newsGrid')
  const countEl = document.getElementById('newsCount')
  const paginationEl = document.getElementById('newsPagination')
  paginationEl.innerHTML = ''
  countEl.textContent = '刷新中…'
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⟡</div>
      <p class="empty-text">正在刷新星际波段…</p>
      <p class="empty-hint">请稍候，正在调谐各星系节点频率</p>
    </div>`

  try {
    const res = await fetch('/.netlify/functions/news?_=' + Date.now())
    if (!res.ok) throw new Error('信号中断')
    const data = await res.json()

    const existingLinks = new Set((newsCache || []).map(a => a.link).filter(Boolean))
    const newItems = (data.articles || []).filter(a => a.link && !existingLinks.has(a.link))

    if (newItems.length === 0) {
      showToast('抱歉探测员，没有更新波段', 'failure')
      if (newsCache) renderNews(newsCache)
      document.getElementById('newsUpdateTime').textContent = '更新于 ' + formatDate(data.updatedAt)
      return
    }

    newsCache = [...newItems, ...(newsCache || [])]
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ articles: newsCache, time: Date.now() }))
    } catch (e) { /* ignore */ }

    currentPage = 1
    renderNews(newsCache)
    document.getElementById('newsUpdateTime').textContent = '更新于 ' + formatDate(data.updatedAt)
    showToast(`探测到 ${newItems.length} 条新波段信号 ✦`, 'success')
  } catch (e) {
    console.error('refreshNews error:', e)
    showToast('星际信号不稳定，刷新失败', 'failure')
    if (newsCache) renderNews(newsCache)
  }
}

function renderNews(articles) {
  const grid = document.getElementById('newsGrid')
  const countEl = document.getElementById('newsCount')
  const paginationEl = document.getElementById('newsPagination')

  if (!articles || articles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⟡</div>
        <p class="empty-text">暂无星际信号</p>
        <p class="empty-hint">资讯节点尚未返回数据</p>
      </div>`
    countEl.textContent = '0 条信号'
    paginationEl.innerHTML = ''
    return
  }

  const filtered = newsFilter === 'all'
    ? articles
    : articles.filter(item => (item.type || 'article') === newsFilter)

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⟡</div>
        <p class="empty-text">该分类下暂无信号</p>
        <p class="empty-hint">试试切换其他分类标签</p>
      </div>`
    countEl.textContent = `${articles.length} 条信号`
    paginationEl.innerHTML = ''
    return
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages
  if (currentPage < 1) currentPage = 1

  const start = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE)

  countEl.textContent = `${filtered.length} 条信号 · 第 ${currentPage}/${totalPages} 页`
  grid.innerHTML = pageItems.map(item => {
    const title = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const desc = item.description ? item.description.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
    const date = item.pubDate ? formatNewsDate(item.pubDate) : ''
    const source = item.source ? item.source.replace(/</g, '&lt;') : ''
    const type = item.type || 'article'

    const typeBadge = {
      article: '<span class="news-type-badge type-article">📄 文章</span>',
      video: '<span class="news-type-badge type-video">🎬 视频</span>',
      forum: '<span class="news-type-badge type-forum">💬 论坛</span>',
      event: '<span class="news-type-badge type-event">🏆 赛事</span>',
    }[type] || ''

    const cardClass = `news-card news-card-${type}`

    return `
      <a class="${cardClass}" href="${item.link}" target="_blank" rel="noopener noreferrer">
        <div class="news-card-top">
          <span class="news-source">${source}</span>
          ${date ? `<span class="news-date">${date}</span>` : ''}
        </div>
        ${type === 'video' ? '<div class="news-card-video-overlay"><span class="news-play-icon">▶</span></div>' : ''}
        <div class="news-card-title">${title}</div>
        ${desc ? `<div class="news-card-desc">${desc}</div>` : ''}
        <div class="news-card-footer">${typeBadge}</div>
      </a>`
  }).join('')

  renderPagination(totalPages, paginationEl)
}

function renderPagination(totalPages, container) {
  if (totalPages <= 1) {
    container.innerHTML = ''
    return
  }

  let html = '<div class="pagination-inner">'

  if (currentPage > 1) {
    html += `<button class="page-btn page-prev" data-page="${currentPage - 1}">‹</button>`
  }

  const maxVisible = 7
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let endPage = startPage + maxVisible - 1
  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  if (startPage > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`
    if (startPage > 2) {
      html += `<span class="page-ellipsis">…</span>`
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-ellipsis">…</span>`
    }
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`
  }

  if (currentPage < totalPages) {
    html += `<button class="page-btn page-next" data-page="${currentPage + 1}">›</button>`
  }

  html += '</div>'
  container.innerHTML = html

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page)
      if (page && page !== currentPage) {
        currentPage = page
        renderNews(newsCache)
        document.querySelector('.news-section').scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}

function updateTagFilterBar() {
  const bar = document.getElementById('tagFilterBar')
  const list = document.getElementById('tagFilterList')
  const allTags = new Set()

  ideas.forEach(item => {
    if (item.tags && item.tags.length > 0) {
      item.tags.forEach(t => allTags.add(t))
    }
  })

  if (allTags.size === 0) {
    bar.style.display = 'none'
    return
  }

  bar.style.display = 'flex'

  const sorted = Array.from(allTags).sort()
  list.innerHTML = sorted.map(t => {
    const active = t === currentTag ? ' active' : ''
    const escaped = t.replace(/</g, '&lt;').replace(/>/g, '&quot;')
    return `<button class="tag-filter-tag${active}" data-tag="${escaped}">#${t.replace(/</g, '&lt;')}</button>`
  }).join('')

  list.querySelectorAll('.tag-filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag
      setTag(currentTag === tag ? '' : tag)
    })
  })
}

function setTag(tag) {
  currentTag = tag
  renderIdeas()
}

function handlePublish(e) {
  e.preventDefault()

  if (!currentUser) {
    showToast('请先登录再发布内容', 'failure')
    return
  }

  const title = document.getElementById('ideaTitle').value.trim()
  const editor = document.getElementById('ideaContent')
  const content = editor.innerHTML.trim()
  if (!title || !content || content === '<br>' || content === '<div><br></div>') return

  const activeCat = document.querySelector('.cat-option.active')
  const category = activeCat ? activeCat.dataset.value : 'idea'

  const nickname = getUserNickname(currentUser)
  const tagsRaw = document.getElementById('ideaTags').value.trim()
  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : []

  const newIdea = migrateIdea({
    id: generateId(),
    title,
    content,
    category,
    tags,
    author: currentUser,
    authorNickname: nickname,
    createdAt: new Date().toISOString()
  })

  ideas.push(newIdea)
  saveIdeas(ideas)
  renderIdeas()

  document.getElementById('publishForm').reset()
  document.getElementById('ideaContent').innerHTML = ''
  document.querySelectorAll('.cat-option').forEach(el => el.classList.remove('active'))
  document.querySelector('.cat-option[data-value="idea"]').classList.add('active')

  if (currentFilter !== 'all' && currentFilter !== category) {
    setFilter('all')
  }

  closePublishForm()
}

function handleEditSubmit(e) {
  e.preventDefault()

  const title = document.getElementById('editTitle').value.trim()
  const content = document.getElementById('editContent').innerHTML.trim()
  if (!title || !content || !editingId) return

  const activeCat = document.querySelector('#editCategorySelector .cat-option.active')
  const category = activeCat ? activeCat.dataset.value : 'idea'

  const tagsRaw = document.getElementById('editTags').value.trim()
  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : []

  const idea = ideas.find(item => item.id === editingId)
  if (!idea) return

  idea.title = title
  idea.content = content
  idea.category = category
  idea.tags = tags

  saveIdeas(ideas)
  renderIdeas()

  editingId = null
  closeModal('editModal')
  showToast('修改已保存', 'success')
}

function insertHtmlAtCursor(editor, html) {
  editor.focus()
  const sel = window.getSelection()
  if (sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    try {
      document.execCommand('insertHTML', false, html)
      return
    } catch (e) {
      // execCommand fallback — manual insertion
    }
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const temp = document.createElement('div')
    temp.innerHTML = html
    const frag = document.createDocumentFragment()
    while (temp.firstChild) {
      frag.appendChild(temp.firstChild)
    }
    range.insertNode(frag)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    editor.insertAdjacentHTML('beforeend', html)
    editor.scrollTop = editor.scrollHeight
  }
}

function getActiveEditor() {
  const editModal = document.getElementById('editModal')
  if (editModal && editModal.classList.contains('active')) {
    return document.getElementById('editContent')
  }
  return document.getElementById('ideaContent')
}

function handleImageUpload() {
  const input = document.getElementById('imageUpload')
  const file = input.files[0]
  if (!file) return

  if (file.size > 500 * 1024) {
    showToast('图片大小不能超过 500KB', 'failure')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const editor = getActiveEditor()
    const imgHtml = `<div><img src="${e.target.result}" alt="${file.name}"></div><div><br></div>`
    insertHtmlAtCursor(editor, imgHtml)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function confirmDelete() {
  if (!deletingId) return

  if (deletingId === 'ACCOUNT_DELETE') {
    let users = getUsers()
    users = users.filter(u => u.account !== currentUser)
    saveUsers(users)
    handleLogout()
    deletingId = null
    closeModal('confirmModal')
    showToast('账号已注销', 'success')
    return
  }

  ideas = ideas.filter(item => item.id !== deletingId)
  saveIdeas(ideas)
  renderIdeas()
  deletingId = null
  closeModal('confirmModal')
  showToast('内容已删除', 'success')
}

function openPublishForm() {
  const section = document.getElementById('publishSection')
  section.classList.add('visible')
  document.getElementById('ideaTitle').focus()
}

function closePublishForm() {
  document.getElementById('publishSection').classList.remove('visible')
}

function updateUserUI() {
  const guest = document.getElementById('userGuest')
  const logged = document.getElementById('userLogged')
  const nameEl = document.getElementById('userNameDisplay')
  const avatarEl = document.getElementById('userAvatar')
  const favBtn = document.getElementById('filterFavBtn')

  if (currentUser) {
    guest.style.display = 'none'
    logged.style.display = 'flex'
    nameEl.textContent = getUserNickname(currentUser)
    const avatar = getUserAvatar(currentUser)
    avatarEl.innerHTML = avatar ? `<img class="avatar-img" src="${avatar}" alt="">` : '✦'
    if (favBtn) favBtn.style.display = ''
  } else {
    guest.style.display = 'flex'
    logged.style.display = 'none'
    if (favBtn) favBtn.style.display = 'none'
  }
}

function showToast(message, type) {
  const container = document.getElementById('toastContainer')
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '◉' : '◎'}</span>
    <span>${message}</span>`
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-out')
    setTimeout(() => toast.remove(), 400)
  }, 2500)
}

function openModal(id) {
  document.getElementById(id).classList.add('active')
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active')
}

function handleRegister(e) {
  e.preventDefault()
  const account = document.getElementById('regAccount').value.trim()
  const nickname = document.getElementById('regNickname').value.trim()
  const password = document.getElementById('regPassword').value
  const confirm = document.getElementById('regConfirm').value

  if (!account || !nickname || !password || !confirm) return

  if (nickname.length > 15) {
    showToast('注册失败：昵称不得超过 15 个字符', 'failure')
    return
  }

  if (password !== confirm) {
    showToast('注册失败：两次密码不一致', 'failure')
    return
  }

  if (password.length < 6) {
    showToast('注册失败：密码至少 6 位', 'failure')
    return
  }

  const users = getUsers()
  const exists = users.some(u => u.account === account)
  if (exists) {
    showToast('注册失败：该账号已被注册', 'failure')
    return
  }

  const nickExists = users.some(u => u.nickname === nickname)
  if (nickExists) {
    showToast('抱歉探测员，昵称已有人编写', 'failure')
    return
  }

  users.push({ id: generateId(), account, nickname, password, avatar: generateRandomAvatar(nickname), createdAt: new Date().toISOString(), favorites: [] })
  saveUsers(users)
  showToast('注册成功', 'success')
  closeModal('registerModal')
  document.getElementById('registerForm').reset()
}

function handleLogin(e) {
  e.preventDefault()
  const account = document.getElementById('loginAccount').value.trim()
  const password = document.getElementById('loginPassword').value
  if (!account || !password) return

  const users = getUsers()
  const user = users.find(u => u.account === account && u.password === password)
  if (!user) {
    showToast('登录失败：账号或密码错误', 'failure')
    return
  }

  currentUser = user.account
  setSession(currentUser)
  updateUserUI()
  showToast('登录成功', 'success')
  closeModal('loginModal')
  document.getElementById('loginForm').reset()
  renderIdeas()
}

function handleLogout() {
  currentUser = null
  setSession(null)
  updateUserUI()
  renderIdeas()
}

function openAbout() {
  openModal('aboutModal')
}

function openProfile() {
  if (!currentUser) return

  const userIdeas = ideas.filter(item => item.author === currentUser)
  const totalLikes = userIdeas.reduce((sum, item) => sum + (item.likes || 0), 0)
  const totalViews = userIdeas.reduce((sum, item) => sum + (item.views || 0), 0)
  const totalComments = userIdeas.reduce((sum, item) => sum + (item.comments ? item.comments.length : 0), 0)
  const users = getUsers()
  const userData = users.find(u => u.account === currentUser)
  const favCount = userData && userData.favorites ? userData.favorites.length : 0

  document.getElementById('profileAccount').textContent = getUserNickname(currentUser)
  document.getElementById('profileJoinDate').textContent = userData
    ? `注册于 ${formatDate(userData.createdAt)}`
    : '-'

  const avatarEl = document.querySelector('#profileModal .profile-avatar-large')
  if (userData && userData.avatar) {
    avatarEl.innerHTML = `<img class="avatar-img" src="${userData.avatar}" alt="">`
  } else {
    avatarEl.innerHTML = '✦'
  }

  document.getElementById('profileStatPosts').textContent = userIdeas.length
  document.getElementById('profileStatLikes').textContent = totalLikes
  document.getElementById('profileStatViews').textContent = totalViews
  document.getElementById('profileStatComments').textContent = totalComments
  document.getElementById('profileStatFav').textContent = favCount

  const listEl = document.getElementById('profilePostsList')
  const countEl = document.getElementById('profilePostsCount')
  countEl.textContent = `${userIdeas.length} 条`

  if (userIdeas.length === 0) {
    listEl.innerHTML = '<div class="profile-posts-empty">暂无发布</div>'
  } else {
    const sorted = [...userIdeas].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    listEl.innerHTML = sorted.map(item => {
      const tagClass = tagClasses[item.category] || ''
      const catName = categoryNames[item.category] || ''
      const title = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `
        <div class="profile-post-item">
          <span class="profile-post-tag ${tagClass}">${catName}</span>
          <span class="profile-post-title">${title}</span>
          <span class="profile-post-meta">${formatDate(item.createdAt)}</span>
        </div>`
    }).join('')
  }

  openModal('profileModal')
}

function openSettings() {
  if (!currentUser) return
  const users = getUsers()
  const userData = users.find(u => u.account === currentUser)
  if (!userData) return
  document.getElementById('settingsNickname').value = userData.nickname || ''
  document.getElementById('settingsCurrPwd').value = ''
  document.getElementById('settingsNewPwd').value = ''
  document.getElementById('settingsConfirmPwd').value = ''
  const avatarPreview = document.getElementById('settingsAvatarPreview')
  avatarPreview.src = userData.avatar || ''
  openModal('settingsModal')
}

function handleUpdateSettings(e) {
  e.preventDefault()
  if (!currentUser) return
  const users = getUsers()
  const userIdx = users.findIndex(u => u.account === currentUser)
  if (userIdx === -1) return

  const newNickname = document.getElementById('settingsNickname').value.trim()
  if (newNickname) {
    if (newNickname.length > 15) {
      showToast('昵称不得超过 15 个字符', 'failure')
      return
    }
    const nickExists = users.some((u, i) => i !== userIdx && u.nickname === newNickname)
    if (nickExists) { showToast('抱歉探测员，昵称已有人编写', 'failure'); return }
    users[userIdx].nickname = newNickname
  }

  const currPwd = document.getElementById('settingsCurrPwd').value
  const newPwd = document.getElementById('settingsNewPwd').value
  const confirmPwd = document.getElementById('settingsConfirmPwd').value

  if (currPwd || newPwd || confirmPwd) {
    if (users[userIdx].password !== currPwd) { showToast('当前密码错误', 'failure'); return }
    if (newPwd && newPwd.length < 6) { showToast('新密码至少 6 位', 'failure'); return }
    if (newPwd !== confirmPwd) { showToast('两次新密码不一致', 'failure'); return }
    if (newPwd) users[userIdx].password = newPwd
  }

  const avatarPreview = document.getElementById('settingsAvatarPreview')
  const avatarSrc = avatarPreview.getAttribute('src')
  const oldAvatar = users[userIdx].avatar
  if (avatarSrc) {
    users[userIdx].avatar = avatarSrc
  }

  saveUsers(users)
  const avatarChanged = avatarSrc && avatarSrc !== oldAvatar
  if (newNickname || avatarChanged) { updateUserUI(); renderIdeas() }
  closeModal('settingsModal')
  document.getElementById('settingsForm').reset()
  showToast('设置已保存', 'success')
}

function handleAvatarUpload() {
  const input = document.getElementById('avatarUpload')
  const file = input.files[0]
  if (!file) return

  if (file.size > 500 * 1024) {
    showToast('头像图片大小不能超过 500KB', 'failure')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = document.getElementById('cropImage')
    img.onload = () => {
      centerCropImage()
      openModal('cropModal')
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
  input.value = ''
}

let cropTranslateX = 0
let cropTranslateY = 0
let cropScale = 100
let cropIsDragging = false
let cropDragStartX = 0
let cropDragStartY = 0

function centerCropImage() {
  cropTranslateX = 0
  cropTranslateY = 0
  cropScale = 100
  document.getElementById('cropZoom').value = 100
  document.getElementById('cropZoomValue').textContent = '100%'
  applyCropTransform()
}

function applyCropTransform() {
  const wrap = document.getElementById('cropImageWrap')
  const s = cropScale / 100
  wrap.style.transform = `translate(${cropTranslateX}px, ${cropTranslateY}px) scale(${s})`
}

function startCropDrag(e) {
  cropIsDragging = true
  const pos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  cropDragStartX = pos.x - cropTranslateX
  cropDragStartY = pos.y - cropTranslateY
}

function doCropDrag(e) {
  if (!cropIsDragging) return
  e.preventDefault()
  const pos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
  cropTranslateX = pos.x - cropDragStartX
  cropTranslateY = pos.y - cropDragStartY
  applyCropTransform()
}

function stopCropDrag() {
  cropIsDragging = false
}

function handleCropZoom() {
  const slider = document.getElementById('cropZoom')
  cropScale = parseInt(slider.value)
  document.getElementById('cropZoomValue').textContent = cropScale + '%'
  applyCropTransform()
}

function handleCropConfirm() {
  const img = document.getElementById('cropImage')
  const viewport = document.getElementById('cropViewport')
  if (!img.complete || !img.naturalWidth) {
    showToast('图片尚未加载完成', 'failure')
    return
  }

  const imgRect = img.getBoundingClientRect()
  const vpRect = viewport.getBoundingClientRect()

  const srcX = ((vpRect.left - imgRect.left) / imgRect.width) * img.naturalWidth
  const srcY = ((vpRect.top - imgRect.top) / imgRect.height) * img.naturalHeight
  const srcW = (vpRect.width / imgRect.width) * img.naturalWidth
  const srcH = (vpRect.height / imgRect.height) * img.naturalHeight

  const outSize = Math.round(vpRect.width)
  const canvas = document.createElement('canvas')
  canvas.width = outSize
  canvas.height = outSize
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize)

  const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
  document.getElementById('settingsAvatarPreview').src = croppedDataUrl
  closeModal('cropModal')
}

function handleDeleteAccount() {
  if (!currentUser) return
  deletingId = 'ACCOUNT_DELETE'
  document.getElementById('confirmText').textContent = '确定注销账号？此操作不可撤销，所有数据将被清除。'
  openModal('confirmModal')
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
    document.getElementById('btnTheme').textContent = '◑'
  }
}

function setTheme(mode) {
  if (mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
    document.getElementById('btnTheme').textContent = '◑'
    localStorage.setItem(THEME_KEY, 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
    document.getElementById('btnTheme').textContent = '◐'
    localStorage.setItem(THEME_KEY, 'dark')
  }
}

function observeCards() {
  const cards = document.querySelectorAll('.idea-card:not(.in-view)')
  if (cards.length === 0) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

  cards.forEach(card => observer.observe(card))
}

function handleSplashEnter() {
  const splash = document.getElementById('splashScreen')
  const content = splash.querySelector('.splash-content')
  const loading = document.getElementById('splashLoading')
  const ringFill = document.getElementById('ringFill')
  const percentEl = document.getElementById('loadingPercent')

  const circumference = 326.7
  const duration = 3800
  const startTime = performance.now()

  content.style.transition = 'opacity 0.3s ease'
  content.style.opacity = '0'

  setTimeout(() => {
    content.style.display = 'none'
    loading.classList.add('active')
  }, 350)

  function animateProgress(currentTime) {
    const elapsed = currentTime - startTime - 350
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const percent = Math.round(eased * 100)
    const offset = circumference - (eased * circumference)

    ringFill.style.strokeDashoffset = offset
    percentEl.textContent = `${percent}%`

    if (percent >= 100) {
      percentEl.textContent = '100%'
      ringFill.style.strokeDashoffset = '0'

      setTimeout(() => {
        loading.classList.remove('active')
        splash.classList.add('hidden')
        setTimeout(() => {
          splash.style.display = 'none'
          document.body.classList.add('reveal')
        }, 1100)
      }, 400)
      return
    }
    requestAnimationFrame(animateProgress)
  }
  requestAnimationFrame(animateProgress)
}

function init() {
  ideas = getIdeas()
  loadTheme()
  initNetStatus()
  const savedSession = getSession()
  if (savedSession) {
    const users = getUsers()
    if (users.find(u => u.account === savedSession)) {
      currentUser = savedSession
    } else {
      setSession(null)
    }
  }
  updateUserUI()
  renderIdeas()

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter))
  })

  document.getElementById('newsFilterBar').addEventListener('click', (e) => {
    const btn = e.target.closest('.news-filter-btn')
    if (!btn) return
    document.querySelectorAll('.news-filter-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    newsFilter = btn.dataset.type
    currentPage = 1
    if (newsCache) renderNews(newsCache)
  })

  document.getElementById('btnRefreshNews').addEventListener('click', () => {
    refreshNews()
  })

  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.articles && parsed.articles.length > 0) {
        newsCache = parsed.articles
      }
    }
  } catch (e) { /* ignore */ }

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => setSort(btn.dataset.sort))
  })

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value
    renderIdeas()
  })

  document.querySelectorAll('.cat-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-option').forEach(el => el.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  document.getElementById('publishForm').addEventListener('submit', handlePublish)
  document.getElementById('btnNewIdea').addEventListener('click', openPublishForm)
  document.getElementById('btnCloseForm').addEventListener('click', closePublishForm)

  document.getElementById('btnEnter').addEventListener('click', handleSplashEnter)

  document.getElementById('btnRegister').addEventListener('click', () => openModal('registerModal'))
  document.getElementById('btnCloseRegister').addEventListener('click', () => closeModal('registerModal'))
  document.getElementById('registerForm').addEventListener('submit', handleRegister)
  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault()
    closeModal('registerModal')
    openModal('loginModal')
  })

  document.getElementById('btnLogin').addEventListener('click', () => openModal('loginModal'))
  document.getElementById('btnCloseLogin').addEventListener('click', () => closeModal('loginModal'))
  document.getElementById('loginForm').addEventListener('submit', handleLogin)
  document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault()
    closeModal('loginModal')
    openModal('registerModal')
  })

  document.getElementById('btnLogout').addEventListener('click', handleLogout)

  document.getElementById('btnAbout').addEventListener('click', openAbout)
  document.getElementById('btnCloseAbout').addEventListener('click', () => closeModal('aboutModal'))
  document.getElementById('btnProfile').addEventListener('click', openProfile)
  document.getElementById('btnCloseProfile').addEventListener('click', () => closeModal('profileModal'))

  document.getElementById('btnTheme').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light'
    setTheme(isLight ? 'dark' : 'light')
  })

  document.getElementById('btnRandomNickname').addEventListener('click', () => {
    const input = document.getElementById('regNickname')
    input.value = generateRandomNickname()
  })

  document.getElementById('btnUploadImage').addEventListener('click', () => {
    document.getElementById('imageUpload').click()
  })

  document.getElementById('btnUploadImageEdit').addEventListener('click', () => {
    document.getElementById('imageUpload').click()
  })

  document.getElementById('imageUpload').addEventListener('change', handleImageUpload)

  document.getElementById('tagFilterClear').addEventListener('click', () => {
    if (currentTag) {
      currentTag = ''
      renderIdeas()
    }
  })

  document.getElementById('editForm').addEventListener('submit', handleEditSubmit)
  document.getElementById('btnCloseEdit').addEventListener('click', () => {
    editingId = null
    document.getElementById('editContent').innerHTML = ''
    closeModal('editModal')
  })

  document.getElementById('confirmDelete').addEventListener('click', confirmDelete)
  document.getElementById('confirmCancel').addEventListener('click', () => {
    deletingId = null
    closeModal('confirmModal')
  })

  document.getElementById('btnOpenSettings').addEventListener('click', openSettings)
  document.getElementById('btnDeleteAccount').addEventListener('click', handleDeleteAccount)
  document.getElementById('btnCloseSettings').addEventListener('click', () => closeModal('settingsModal'))
  document.getElementById('btnRandomNicknameSettings').addEventListener('click', () => {
    const input = document.getElementById('settingsNickname')
    input.value = generateRandomNickname()
  })
  document.getElementById('settingsForm').addEventListener('submit', handleUpdateSettings)
  document.getElementById('btnCloseUserInfo').addEventListener('click', () => closeModal('userInfoModal'))
  document.getElementById('btnCloseDetail').addEventListener('click', () => closeModal('detailModal'))
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('detailModal')
  })
  document.getElementById('btnUploadAvatar').addEventListener('click', () => {
    document.getElementById('avatarUpload').click()
  })
  document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload)
  document.getElementById('btnRandomAvatar').addEventListener('click', () => {
    const users = getUsers()
    const userData = users.find(u => u.account === currentUser)
    if (!userData) return
    const avatar = generateRandomAvatar(userData.nickname || currentUser)
    document.getElementById('settingsAvatarPreview').src = avatar
  })

  const cropViewport = document.getElementById('cropViewport')
  cropViewport.addEventListener('mousedown', startCropDrag)
  document.addEventListener('mousemove', doCropDrag)
  document.addEventListener('mouseup', stopCropDrag)
  cropViewport.addEventListener('touchstart', startCropDrag, { passive: true })
  cropViewport.addEventListener('touchmove', doCropDrag, { passive: false })
  cropViewport.addEventListener('touchend', stopCropDrag)
  document.getElementById('cropZoom').addEventListener('input', handleCropZoom)
  document.getElementById('btnConfirmCrop').addEventListener('click', handleCropConfirm)
  document.getElementById('btnCancelCrop').addEventListener('click', () => closeModal('cropModal'))
  document.getElementById('btnCloseCrop').addEventListener('click', () => closeModal('cropModal'))

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active')
        if (overlay.id === 'editModal') editingId = null
        if (overlay.id === 'confirmModal') deletingId = null
        if (overlay.id === 'userInfoModal') { /* no state to reset */ }
        if (overlay.id === 'settingsModal') { /* no state to reset */ }
        if (overlay.id === 'cropModal') { /* no state to reset */ }
      }
    })
  })
}

function initNetStatus() {
  const el = document.getElementById('netStatus')
  if (!el) return

  function update(status) {
    el.className = 'net-status ' + status
    el.textContent = status === 'online' ? '●' : '○'
    el.title = status === 'online' ? '网络连接正常' : '网络已断开'
  }

  update(navigator.onLine ? 'online' : 'offline')

  window.addEventListener('online', () => {
    update('online')
    showToast('网络已恢复连接', 'success')
  })

  window.addEventListener('offline', () => {
    update('offline')
    showToast('网络连接已断开，部分功能可能不可用', 'failure')
  })
}

document.addEventListener('DOMContentLoaded', init)