<template>
  <div class="home-container">
    <div class="card rooms-card">
      <div class="card-header">
        <span class="icon">🏠</span>
        <h2>主题房间</h2>
        <p class="subtitle">选择与你共鸣的场景，找到归属感</p>
      </div>
      <div v-if="roomsLoading" class="loading-mini">
        <div class="spinner-small"></div>
        <span>加载房间中...</span>
      </div>
      <div v-else class="rooms-grid">
        <router-link
          v-for="r in rooms"
          :key="r.id"
          :to="`/room/${r.id}`"
          class="room-card"
          :style="{ '--room-color': r.color }"
        >
          <span class="room-card-icon">{{ r.icon }}</span>
          <div class="room-card-info">
            <h3>{{ r.name }}</h3>
            <p class="room-card-desc">{{ r.description }}</p>
          </div>
          <div class="room-card-stats">
            <span class="stat-num">{{ r.stats.total }}</span>
            <span class="stat-text">条秘密</span>
          </div>
        </router-link>
      </div>
    </div>

    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
        <p class="subtitle">来自所有房间的温暖分享</p>
      </div>

      <div v-if="randomLoading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <div class="footer-left">
              <span
                v-if="getRoomInfo(secret.roomId)"
                class="room-tag"
                :style="{ background: getRoomInfo(secret.roomId).color + '30', color: getRoomInfo(secret.roomId).color }"
              >
                {{ getRoomInfo(secret.roomId).icon }} {{ getRoomInfo(secret.roomId).name }}
              </span>
              <span class="status-badge">{{ secret.status }}</span>
            </div>
            <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
              🔄 换一个
            </button>
          </div>
        </div>
      </transition>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>

    <div class="card list-card">
      <div class="card-header">
        <span class="icon">📜</span>
        <h2>全部公开秘密</h2>
        <p class="subtitle">所有房间的秘密都汇聚在这里</p>
      </div>
      <div v-if="listLoading" class="loading-mini">
        <div class="spinner-small"></div>
        <span>加载中...</span>
      </div>
      <div v-else-if="allSecrets.length === 0" class="empty-mini">
        <p>还没有秘密，来分享第一个吧 ✨</p>
      </div>
      <div v-else class="secret-list">
        <transition-group name="list" tag="div">
          <div v-for="item in allSecrets" :key="item.id" class="secret-item">
            <div
              class="secret-room-bar"
              :style="{ background: getRoomInfo(item.roomId)?.color || '#ccc' }"
            ></div>
            <div class="secret-item-content">
              <div class="secret-item-header">
                <span
                  v-if="getRoomInfo(item.roomId)"
                  class="room-tag small"
                  :style="{ background: getRoomInfo(item.roomId).color + '30', color: getRoomInfo(item.roomId).color }"
                >
                  {{ getRoomInfo(item.roomId).icon }} {{ getRoomInfo(item.roomId).name }}
                </span>
                <span class="secret-date">{{ formatDate(item.createdAt) }}</span>
              </div>
              <p class="secret-item-text">"{{ item.content }}"</p>
              <div class="secret-item-footer">
                <span class="status-badge-mini">{{ item.status }}</span>
              </div>
            </div>
          </div>
        </transition-group>
        <div v-if="allSecrets.length < totalAllSecrets" class="load-more">
          <button class="btn btn-secondary" @click="loadMoreSecrets" :disabled="loadingMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const roomsLoading = ref(true)
const rooms = ref([])

const randomLoading = ref(true)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')

const listLoading = ref(true)
const allSecrets = ref([])
const totalAllSecrets = ref(0)
const loadingMore = ref(false)
const listOffset = ref(0)
const LIST_LIMIT = 15

function getRoomInfo(roomId) {
  return rooms.value.find(r => r.id === roomId)
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

async function fetchRooms() {
  roomsLoading.value = true
  try {
    const res = await fetch('/api/rooms')
    rooms.value = await res.json()
  } catch (e) {
    console.error('加载房间失败:', e)
  } finally {
    roomsLoading.value = false
  }
}

async function fetchRandomSecret() {
  randomLoading.value = true
  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
  } finally {
    randomLoading.value = false
  }
}

async function fetchAllSecrets(reset = false) {
  if (reset) {
    listOffset.value = 0
    allSecrets.value = []
  }
  if (reset) listLoading.value = true
  else loadingMore.value = true
  try {
    const res = await fetch(`/api/secrets?limit=${LIST_LIMIT}&offset=${listOffset.value}`)
    const data = await res.json()
    allSecrets.value = reset ? data.secrets : [...allSecrets.value, ...data.secrets]
    totalAllSecrets.value = data.total
    listOffset.value += data.secrets.length
  } catch (e) {
    console.error('加载全部秘密失败:', e)
  } finally {
    listLoading.value = false
    loadingMore.value = false
  }
}

function loadMoreSecrets() {
  fetchAllSecrets(false)
}

function goToConfess() {
  router.push('/confess')
}

onMounted(async () => {
  await fetchRooms()
  fetchRandomSecret()
  fetchAllSecrets(true)
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  text-align: center;
  margin-bottom: 25px;
}

.icon {
  font-size: 44px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
}

.subtitle {
  color: #999;
  font-size: 14px;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 15px;
}

.room-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 18px;
  background: #fafafa;
  border-radius: 15px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.room-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--room-color);
}

.room-card:hover {
  transform: translateY(-3px);
  border-color: var(--room-color);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  background: white;
}

.room-card-icon {
  font-size: 36px;
  width: 56px; height: 56px;
  display: flex; align-items: center; justify-content: center;
  background: var(--room-color);
  opacity: 0.9;
  border-radius: 14px;
  flex-shrink: 0;
}

.room-card-info { flex: 1; min-width: 0; }

.room-card-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.room-card-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-card-stats { text-align: right; flex-shrink: 0; }

.stat-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--room-color);
}

.stat-text {
  font-size: 11px;
  color: #999;
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

@keyframes spin { to { transform: rotate(360deg); } }

.loading {
  text-align: center;
  padding: 50px 20px;
  color: #666;
}

.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 25px;
}

.secret-content { padding: 10px 0; }

.secret-text {
  font-size: 18px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 25px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.room-tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.room-tag.small {
  padding: 4px 10px;
  font-size: 12px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
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

.card-actions {
  margin-top: 30px;
  text-align: center;
  padding-top: 25px;
  border-top: 1px solid #eee;
}

.secret-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secret-item {
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  background: #fafafa;
  transition: all 0.3s ease;
}

.secret-item:hover {
  background: #f5f5f5;
  transform: translateX(3px);
}

.secret-room-bar {
  width: 5px;
  flex-shrink: 0;
}

.secret-item-content {
  flex: 1;
  padding: 15px 18px;
}

.secret-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.secret-date { color: #aaa; font-size: 12px; }

.secret-item-text {
  font-size: 14px;
  line-height: 1.7;
  color: #555;
  margin: 0 0 10px 0;
  font-style: italic;
}

.secret-item-footer { display: flex; align-items: center; }

.status-badge-mini {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

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
