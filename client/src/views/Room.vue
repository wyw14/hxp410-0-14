<template>
  <div class="room-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载房间...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">😢</span>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="goHome">回到首页</button>
    </div>

    <template v-else>
      <div class="card room-header-card" :style="{ borderColor: room.color }">
        <div class="room-header">
          <span class="room-icon">{{ room.icon }}</span>
          <div class="room-info">
            <h2>{{ room.name }}</h2>
            <p class="room-desc">{{ room.description }}</p>
          </div>
        </div>
        <div class="room-stats">
          <div class="stat-item">
            <span class="stat-value">{{ room.stats.total }}</span>
            <span class="stat-label">总秘密数</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ room.stats.lastWeek }}</span>
            <span class="stat-label">近7天新增</span>
          </div>
        </div>
      </div>

      <div class="card submit-card">
        <ForgivenessAnimation
          :visible="showAnimation"
          @complete="handleAnimationComplete"
        />
        <template v-if="!showAnimation && !showComplete">
          <div class="card-sub-header">
            <span class="sub-icon">🕊️</span>
            <h3>在「{{ room.name }}」倾诉</h3>
          </div>
          <div class="form-group">
            <textarea
              v-model="secretContent"
              class="secret-input"
              :placeholder="getPlaceholder()"
              rows="6"
              :disabled="submitting"
            ></textarea>
            <div class="char-count">
              {{ secretContent.length }} / 500
            </div>
          </div>
          <div v-if="submitError" class="error-message">{{ submitError }}</div>
          <div class="form-actions">
            <button
              class="btn btn-primary submit-btn"
              @click="submitSecret"
              :disabled="submitting || !secretContent.trim() || secretContent.length > 500"
              :style="{ background: `linear-gradient(135deg, ${room.color} 0%, ${adjustColor(room.color, -20)} 100%)` }"
            >
              <span v-if="submitting">
                <span class="btn-spinner"></span>
                提交中...
              </span>
              <span v-else>🌸 获得宽恕</span>
            </button>
          </div>
        </template>

        <div class="complete-content" v-else-if="showComplete">
          <span class="complete-icon">💜</span>
          <h3>宽恕已完成</h3>
          <p>你的秘密已经被温柔地保存在「{{ room.name }}」</p>
          <p>愿你获得内心的平静</p>
          <div class="complete-actions">
            <button class="btn btn-secondary" @click="resetForm">再分享一个</button>
          </div>
        </div>
      </div>

      <div class="card random-card">
        <div class="card-sub-header">
          <span class="sub-icon">🎲</span>
          <h3>房间随机秘密</h3>
        </div>
        <div v-if="randomLoading" class="loading-mini">
          <div class="spinner-small"></div>
          <span>寻找中...</span>
        </div>
        <div v-else-if="!hasRandomSecret" class="empty-mini">
          <p>{{ randomMessage }}</p>
        </div>
        <transition name="fade" v-else>
          <div class="random-content" :key="randomSecret?.id">
            <p class="random-text">"{{ randomSecret.content }}"</p>
            <div class="random-footer">
              <span class="status-badge" :style="{ background: `linear-gradient(135deg, ${adjustColor(room.color, 40)} 0%, ${adjustColor(room.color, 20)} 100%)` }">
                {{ randomSecret.status }}
              </span>
              <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
                🔄 换一个
              </button>
            </div>
          </div>
        </transition>
      </div>

      <div class="card list-card">
        <div class="card-sub-header">
          <span class="sub-icon">📜</span>
          <h3>房间秘密列表</h3>
          <span class="list-count">共 {{ totalSecrets }} 条</span>
        </div>
        <div v-if="listLoading" class="loading-mini">
          <div class="spinner-small"></div>
          <span>加载中...</span>
        </div>
        <div v-else-if="secretList.length === 0" class="empty-mini">
          <p>这个房间还没有秘密，来分享第一个吧 ✨</p>
        </div>
        <div v-else class="secret-list">
          <transition-group name="list" tag="div">
            <div
              v-for="item in secretList"
              :key="item.id"
              class="secret-item"
              :style="{ borderLeftColor: room.color }"
            >
              <p class="secret-item-text">"{{ item.content }}"</p>
              <div class="secret-item-meta">
                <span class="status-badge-mini" :style="{ background: adjustColor(room.color, 40) }">
                  {{ item.status }}
                </span>
                <span class="secret-date">{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
          </transition-group>
          <div v-if="secretList.length < totalSecrets" class="load-more">
            <button class="btn btn-secondary" @click="loadMore" :disabled="loadingMore">
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ForgivenessAnimation from '../components/ForgivenessAnimation.vue'

const route = useRoute()
const router = useRouter()

const roomId = computed(() => route.params.roomId)

const loading = ref(true)
const error = ref('')
const room = ref(null)

const secretContent = ref('')
const submitting = ref(false)
const submitError = ref('')
const showAnimation = ref(false)
const showComplete = ref(false)

const randomLoading = ref(true)
const hasRandomSecret = ref(false)
const randomSecret = ref(null)
const randomMessage = ref('')

const listLoading = ref(true)
const secretList = ref([])
const totalSecrets = ref(0)
const loadingMore = ref(false)
const listOffset = ref(0)
const LIST_LIMIT = 10
const requestToken = ref(0)

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt))
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

function getPlaceholder() {
  const placeholders = {
    family: '写下关于家人的愧疚与忏悔...\n\n也许是一句没说出口的对不起，\n也许是一次任性的顶嘴...',
    friendship: '写下关于朋友的愧疚与忏悔...\n\n也许是一次背叛，\n也许是一句伤人的话...',
    work: '写下关于职场的愧疚与忏悔...\n\n也许是一次推卸责任，\n也许是抢了同事的功劳...',
    love: '写下关于爱人的愧疚与忏悔...\n\n也许是一次不该有的欺骗，\n也许是一句伤透心的话...',
    school: '写下关于校园的愧疚与忏悔...\n\n也许是一次恶作剧，\n也许是对老师的不尊重...',
    other: '写下你深藏已久的秘密...\n\n任何想说的话，\n在这里都能被温柔接纳...'
  }
  return placeholders[roomId.value] || placeholders.other
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

async function submitSecret() {
  if (!secretContent.value.trim()) {
    submitError.value = '请输入你想倾诉的内容'
    return
  }
  if (secretContent.value.length > 500) {
    submitError.value = '内容不能超过500字'
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    const res = await fetch(`/api/rooms/${roomId.value}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: secretContent.value })
    })
    const data = await res.json()
    if (res.ok) {
      showAnimation.value = true
    } else {
      submitError.value = data.error || '提交失败，请稍后重试'
      submitting.value = false
    }
  } catch (e) {
    submitError.value = '无法连接到服务器，请稍后重试'
    submitting.value = false
  }
}

function handleAnimationComplete() {
  showAnimation.value = false
  showComplete.value = true
  if (room.value) {
    room.value.stats.total += 1
    room.value.stats.lastWeek += 1
  }
  fetchSecretList(true)
  fetchRandomSecret()
}

function resetForm() {
  secretContent.value = ''
  showComplete.value = false
  submitError.value = ''
  submitting.value = false
}

async function fetchRandomSecret() {
  const token = requestToken.value
  randomLoading.value = true
  try {
    const res = await fetch(`/api/rooms/${roomId.value}/secrets/random`)
    const data = await res.json()
    if (token !== requestToken.value) return
    hasRandomSecret.value = data.hasSecret
    randomSecret.value = data.secret
    randomMessage.value = data.message
  } catch (e) {
    if (token !== requestToken.value) return
    hasRandomSecret.value = false
    randomMessage.value = '暂时无法获取秘密'
  } finally {
    if (token === requestToken.value) randomLoading.value = false
  }
}

async function fetchSecretList(reset = false) {
  const token = requestToken.value
  if (reset) {
    listOffset.value = 0
    secretList.value = []
  }
  if (reset) listLoading.value = true
  else loadingMore.value = true
  try {
    const res = await fetch(
      `/api/rooms/${roomId.value}/secrets?limit=${LIST_LIMIT}&offset=${listOffset.value}`
    )
    const data = await res.json()
    if (token !== requestToken.value) return
    secretList.value = reset ? data.secrets : [...secretList.value, ...data.secrets]
    totalSecrets.value = data.total
    listOffset.value += data.secrets.length
  } catch (e) {
    if (token !== requestToken.value) return
    console.error('加载秘密列表失败:', e)
  } finally {
    if (token === requestToken.value) {
      listLoading.value = false
      loadingMore.value = false
    }
  }
}

function loadMore() {
  fetchSecretList(false)
}

function goHome() {
  router.push('/')
}

function resetAllState() {
  loading.value = true
  error.value = ''
  room.value = null

  secretContent.value = ''
  submitting.value = false
  submitError.value = ''
  showAnimation.value = false
  showComplete.value = false

  randomLoading.value = true
  hasRandomSecret.value = false
  randomSecret.value = null
  randomMessage.value = ''

  listLoading.value = true
  secretList.value = []
  totalSecrets.value = 0
  loadingMore.value = false
  listOffset.value = 0

  requestToken.value += 1
}

async function loadRoomData(token) {
  try {
    const [roomRes, randomRes, listRes] = await Promise.all([
      fetch(`/api/rooms/${roomId.value}`),
      fetch(`/api/rooms/${roomId.value}/secrets/random`),
      fetch(`/api/rooms/${roomId.value}/secrets?limit=${LIST_LIMIT}&offset=0`)
    ])

    if (token !== requestToken.value) return

    if (!roomRes.ok) throw new Error('房间不存在')
    const roomData = await roomRes.json()
    const randomData = await randomRes.json()
    const listData = await listRes.json()

    if (token !== requestToken.value) return

    room.value = roomData

    hasRandomSecret.value = randomData.hasSecret
    randomSecret.value = randomData.secret
    randomMessage.value = randomData.message
    randomLoading.value = false

    secretList.value = listData.secrets
    totalSecrets.value = listData.total
    listOffset.value = listData.secrets.length
    listLoading.value = false

    loading.value = false
  } catch (e) {
    if (token !== requestToken.value) return
    error.value = e.message || '加载房间失败'
    loading.value = false
    randomLoading.value = false
    listLoading.value = false
  }
}

watch(roomId, () => {
  const token = requestToken.value + 1
  resetAllState()
  loadRoomData(token)
})

onMounted(() => {
  const token = requestToken.value
  loadRoomData(token)
})
</script>

<style scoped>
.room-container {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.error-state .error-icon { font-size: 64px; display: block; margin-bottom: 20px; }

.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.room-header-card {
  border-left: 5px solid;
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.room-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.room-icon {
  font-size: 56px;
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  flex-shrink: 0;
}

.room-info { flex: 1; }

.room-info h2 {
  font-size: 26px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.room-desc {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
}

.room-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.stat-item { text-align: center; }

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 13px;
  color: #999;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #eee;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  animation: slideUp 0.5s ease;
}

.card-sub-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.sub-icon { font-size: 24px; }

.card-sub-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.list-count {
  font-size: 13px;
  color: #999;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.secret-input {
  width: 100%;
  padding: 18px;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.8;
  background: #fafafa;
  box-sizing: border-box;
}

.secret-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.secret-input:disabled { opacity: 0.6; cursor: not-allowed; }

.secret-input::placeholder { color: #aaa; line-height: 1.8; }

.char-count {
  position: absolute;
  bottom: 10px; right: 15px;
  font-size: 13px; color: #999;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #dc2626;
}

.form-actions { text-align: center; }

.submit-btn { min-width: 180px; font-size: 16px; padding: 14px 30px; }

.btn-spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

.complete-content {
  text-align: center;
  padding: 20px;
}

.complete-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 15px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.complete-content h3 {
  color: #333;
  font-size: 22px;
  margin-bottom: 12px;
}

.complete-content p {
  color: #666;
  font-size: 15px;
  margin-bottom: 8px;
}

.complete-actions {
  margin-top: 25px;
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.loading-mini, .empty-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px 20px;
  color: #999;
  font-size: 14px;
}

.spinner-small {
  width: 20px; height: 20px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.empty-mini p { margin: 0; }

.random-content {
  padding: 10px 0;
}

.random-text {
  font-size: 18px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 25px;
  padding: 0 10px;
}

.random-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.status-badge {
  color: #2d5a4a;
  padding: 7px 18px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.refresh-btn {
  padding: 7px 18px;
  font-size: 13px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover { background: #e0e0e0; transform: translateY(-1px); }

.secret-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.secret-item {
  background: #fafafa;
  border-radius: 12px;
  padding: 18px 20px;
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.secret-item:hover {
  background: #f5f5f5;
  transform: translateX(3px);
}

.secret-item-text {
  font-size: 15px;
  line-height: 1.7;
  color: #444;
  margin: 0 0 12px 0;
  font-style: italic;
}

.secret-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.status-badge-mini {
  color: #2d5a4a;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.secret-date { color: #aaa; }

.load-more {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from { opacity: 0; transform: translateX(-20px); }
.list-leave-to { opacity: 0; transform: translateX(20px); }
</style>
