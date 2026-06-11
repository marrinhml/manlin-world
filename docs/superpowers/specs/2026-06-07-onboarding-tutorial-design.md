# 新手指导（Onboarding Tutorial）设计文档

## 1. 概述

首次注册并登录的用户进入主界面后，自动触发交互式新手指导。通过高亮 + 文字说明的方式，引导用户了解网站核心功能。用户每点击一次屏幕前进到下一步，全部完成后恢复正常使用。

**触发条件**：用户注册后首次登录（localStorage 存 `tutorial_done_{userId}` 标记）。
**非触发**：已有标记的用户登录时不触发。

## 2. 教程步骤（共12步）

| 步 | 目标元素 | 提示文本（≤15字） | 特殊操作 |
|----|---------|------------------|---------|
| 0 | 屏幕中央 | 欢迎来到蛮林世界，探测员！ | 无 |
| 1 | `#btnProfile`（个人档案） | 查看和编辑个人信息 | 无 |
| 2 | `#btnFriends`（好友） | 管理好友关系与聊天 | 进入下一步时自动打开好友弹窗 |
| 3 | `.friend-tab[data-tab="list"]`（好友列表 tab） | 查看已添加的好友 | 无 |
| 4 | `#friendSearchInput`（搜索好友输入框） | 搜索添加新朋友 | 无 |
| 5 | `.friend-tab[data-tab="requests"]`（好友请求 tab） | 处理好友申请 | 进入下一步时自动关闭弹窗 |
| 6 | 帖子卡片的操作栏 `.card-actions` | 点赞、评论、收藏帖子 | 高亮第一张卡片的操作栏 |
| 7 | `.filter-news-btn`（星际资讯按钮） | 阅览各星系资讯动态 | 无 |
| 8 | `#btnNewIdea`（发布按钮） | 发布科幻灵感和想法 | 无 |
| 9 | `#btnAbout`（关于按钮） | 了解本网站的故事 | 无 |
| 10 | `#btnLogout`（退出按钮） | 安全退出当前账号 | 无 |
| 11 | 屏幕中央 | 教程完成，开始探索！ | 清理所有遮罩 |

## 3. 技术实现

### 3.1 触发检测

注册成功时，在 `localStorage` 存标记：`tutorial_done_{userId} = '1'`。
登录后（`init()` 中获取到 session 后），检查 `localStorage.getItem('tutorial_done_' + userId)`。
不存在 → 启动教程；存在 → 跳过。

### 3.2 HTML 结构

在 `index.html` 末尾（`</body>` 前）添加：

```html
<!-- 新手指导遮罩 -->
<div id="tutorialOverlay" style="display:none">
  <div class="tutorial-window" id="tutorialWindow"></div>
  <div class="tutorial-tooltip" id="tutorialTooltip">
    <span class="tutorial-arrow" id="tutorialArrow"></span>
    <p class="tutorial-text" id="tutorialText"></p>
    <span class="tutorial-step" id="tutorialStep"></span>
  </div>
</div>
```

- `#tutorialOverlay`：全屏遮罩，z-index 10001
- `#tutorialWindow`：目标元素处的"窗口"（透明区域，露出现有元素）
- `#tutorialTooltip`：提示气泡，带箭头指向窗口
- `#tutorialText`：提示文字
- `#tutorialStep`：进度显示 "1/12"

### 3.3 CSS 方案

- **遮罩**：`position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 10001`
- **窗口**：`position: absolute; border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.65); pointer-events: none`
  - 窗口位置 = 目标元素的 `getBoundingClientRect()`
  - 窗口大小 = 目标元素尺寸 + 8px padding
- **提示气泡**：`position: fixed; background: var(--bg-card); border: 1px solid var(--blue-nebula); border-radius: 8px; padding: 10px 16px; max-width: 200px`
  - 箭头用伪类 `::before` 实现三角形
  - 气泡位置根据目标元素自动判定（优先下方；下方放不下则上方）
- 点击遮罩（非窗口区域）时触发 `nextStep()`
- 手机端：提示气泡字体缩小，窗口 padding 缩小

### 3.4 JS 逻辑

**状态机**：`let tutorialStep = -1`

**核心函数**：

```javascript
function startTutorial()
  - 显示教程遮罩
  - 禁用 body 滚动
  - 设置 tutorialStep = 0
  - 执行 renderStep(0)

function renderStep(index)
  - 清理当前高亮（关闭弹窗等）
  - 从 steps 数组获取当前步骤配置
  - 定位目标元素并更新窗口位置
  - 更新提示气泡文字和位置
  - 更新进度

function nextStep()
  - 执行当前步骤的 onLeave（如果有）
  - tutorialStep++
  - 如果 tutorialStep >= steps.length → endTutorial()
  - 否则执行当前步骤的 onEnter → renderStep()
  - 窗口位置可能有变化，重新定位

function endTutorial()
  - 隐藏遮罩
  - 恢复 body 滚动
  - localStorage 写入 `tutorial_done_{userId}`
```

**步骤定义**（伪代码）：

```javascript
const tutorialSteps = [
  { type: 'center', text: '欢迎来到蛮林世界，探测员！' },
  { target: '#btnProfile', text: '查看和编辑个人信息', placement: 'bottom' },
  { target: '#btnFriends', text: '管理好友关系与聊天', placement: 'bottom',
    onEnter: () => {},  // 不特别操作
    onLeave: () => { openFriends(); setTimeout(waitForModal, 300) }  // 打开好友弹窗
  },
  { target: '.friend-tab[data-tab="list"]', text: '查看已添加的好友', placement: 'top' },
  { target: '#friendSearchInput', text: '搜索添加新朋友', placement: 'bottom' },
  { target: '.friend-tab[data-tab="requests"]', text: '处理好友申请', placement: 'top',
    onLeave: () => { closeModal('friendModal') }
  },
  { target: '.card-actions', text: '点赞、评论、收藏帖子', placement: 'top',
    onEnter: () => { scrollFirstCardIntoView() }
  },
  { target: '.filter-news-btn', text: '阅览各星系资讯动态', placement: 'bottom' },
  { target: '#btnNewIdea', text: '发布科幻灵感和想法', placement: 'bottom' },
  { target: '#btnAbout', text: '了解本网站的故事', placement: 'bottom' },
  { target: '#btnLogout', text: '安全退出当前账号', placement: 'bottom' },
  { type: 'center', text: '教程完成，开始探索吧！探测员。' },
]
```

### 3.5 窗口定位函数

```javascript
function positionWindow(targetSelector)
  - 获取目标元素 rect
  - 设置 tutorialWindow 的 left/top/width/height
  - 计算 tooltip 位置（优先下方、上方、左、右）
  - 箭头方向相应调整

function centerWindow()
  - tutorialWindow 居中显示（用于欢迎和完成页面）
  - tooltip 在窗口下方
```

### 3.6 好友弹窗特殊处理

步骤 2→3 时（好友按钮→好友列表），需要：
1. 进入好友弹窗（`openFriends()` 需要等弹窗动画完成）
2. 确保弹窗已打开再渲染第三步
3. 步骤 5→6 时自动关闭弹窗

使用 `setTimeout(() => renderStep(step), 350)` 等待过渡。

### 3.7 移动端适配

- 提示文字字体缩小（13px）
- 窗口 padding 缩小（4px）
- 气泡 max-width 缩小（160px）
- 遮罩背景透明度降低（0.5）

## 4. 文件变更清单

| 文件 | 变更 | 预估行数 |
|------|------|---------|
| `index.html` | 末尾添加教程遮罩 HTML 结构 | ~10 行 |
| `style.css` | 教程遮罩/窗口/气泡样式 + 移动端适配 | ~60 行 |
| `script.js` | 注册成功处写 localStorage 标记 | ~3 行 |
| `script.js` | `init()` 中登录后检测并启动 | ~10 行 |
| `script.js` | 教程状态机 + 步骤定义 + 定位逻辑 | ~150 行 |

## 5. 边界情况

- 用户注册后需要邮箱验证才能登录？Supabase 默认开启邮箱验证，但实际测试中很多用户跳过验证——检测登录就行
- 用户在教程中途刷新页面 → 已记住的`tutorialStep`丢失，下次登录不再触发（`tutorial_done` 未写入）
- 目标元素在当前滚动位置之外 → `scrollIntoView({ block: 'center' })`
- 目标元素不存在（如未登录时某些元素不显示）→ 检查 `display:none` 状态，跳过该步骤
