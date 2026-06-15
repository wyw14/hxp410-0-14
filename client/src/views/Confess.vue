<template>
  <div class="confess-container">
    <ForgivenessAnimation
      :visible="showAnimation"
      @complete="handleAnimationComplete"
    />

    <div class="card confess-card" v-if="!showAnimation">
      <div class="card-header">
        <span class="icon">🕊️</span>
        <h2>倾诉你的秘密</h2>
        <p class="subtitle">这里是一个安全的空间，你的秘密将被匿名保存并宽恕</p>
      </div>

      <div class="form-group">
        <label class="form-label">选择一个主题房间</label>
        <div v-if="roomsLoading" class="loading-mini">
          <div class="spinner-small"></div>
          <span>加载房间中...</span>
        </div>
        <div v-else class="room-select-grid">
          <div
            v-for="r in rooms"
            :key="r.id"
            class="room-option"
            :class="{ active: selectedRoom === r.id }"
            :style="{ '--room-color': r.color }"
            @click="selectedRoom = r.id"
          >
            <span class="room-option-icon">{{ r.icon }}</span>
            <span class="room-option-name">{{ r.name }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <textarea
          v-model="secretContent"
          class="secret-input"
          placeholder="在这里写下你想说的话...&#10;&#10;也许是一件愧疚的事，&#10;也许是一个深藏的秘密，&#10;也许只是想找个地方倾诉..."
          rows="8"
          :disabled="submitting"
        ></textarea>
        <div class="char-count">
          {{ secretContent.length }} / 500
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="form-actions">
        <button
          class="btn btn-primary submit-btn"
          @click="submitSecret"
          :disabled="submitting || !secretContent.trim() || secretContent.length > 500 || !selectedRoom"
          :style="selectedRoomInfo ? { background: `linear-gradient(135deg, ${selectedRoomInfo.color} 0%, ${adjustColor(selectedRoomInfo.color, -20)} 100%)` } : {}"
        >
          <span v-if="submitting">
            <span class="btn-spinner"></span>
            提交中...
          </span>
          <span v-else>
            🌸 获得宽恕
          </span>
        </button>
      </div>

      <div class="tips">
        <p>💡 提示：你的秘密会被匿名保存，没有人会知道是谁分享的</p>
        <p>🌈 提交后，它将被自动标记为「已宽恕」</p>
        <p>🏠 选择合适的房间，能让更多同频的人看到你的故事</p>
      </div>
    </div>

    <div class="card complete-card" v-else-if="showComplete">
      <div class="complete-content">
        <span class="complete-icon">💜</span>
        <h2>宽恕已完成</h2>
        <p>你的秘密已经被温柔地保存</p>
        <p v-if="selectedRoomInfo" class="room-info">
          已放入「{{ selectedRoomInfo.icon }} {{ selectedRoomInfo.name }}」
        </p>
        <p>愿你获得内心的平静</p>
        <div class="complete-actions">
          <button class="btn btn-secondary" @click="resetForm">
            再分享一个
          </button>
          <button class="btn btn-secondary" @click="goToRoom" v-if="selectedRoom">
            看看这个房间
          </button>
          <button class="btn btn-primary" @click="goHome">
            回到首页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ForgivenessAnimation from '../components/ForgivenessAnimation.vue'

const router = useRouter()
const route = useRoute()

const secretContent = ref('')
const submitting = ref(false)
const error = ref('')
const showAnimation = ref(false)
const showComplete = ref(false)

const roomsLoading = ref(true)
const rooms = ref([])
const selectedRoom = ref('')

const selectedRoomInfo = computed(() => {
  return rooms.value.find(r => r.id === selectedRoom.value)
})

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt))
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

async function fetchRooms() {
  roomsLoading.value = true
  try {
    const res = await fetch('/api/rooms')
    rooms.value = await res.json()
    const preselect = route.query.room
    if (preselect && rooms.value.some(r => r.id === preselect)) {
      selectedRoom.value = preselect
    } else if (rooms.value.length > 0) {
      selectedRoom.value = rooms.value[0].id
    }
  } catch (e) {
    console.error('加载房间失败:', e)
  } finally {
    roomsLoading.value = false
  }
}

async function submitSecret() {
  if (!selectedRoom.value) {
    error.value = '请选择一个主题房间'
    return
  }
  if (!secretContent.value.trim()) {
    error.value = '请输入你想倾诉的内容'
    return
  }
  if (secretContent.value.length > 500) {
    error.value = '内容不能超过500字'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/rooms/${selectedRoom.value}/secrets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: secretContent.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      showAnimation.value = true
    } else {
      error.value = data.error || '提交失败，请稍后重试'
      submitting.value = false
    }
  } catch (err) {
    console.error('提交失败:', err)
    error.value = '无法连接到服务器，请稍后重试'
    submitting.value = false
  }
}

function handleAnimationComplete() {
  showAnimation.value = false
  showComplete.value = true
}

function resetForm() {
  secretContent.value = ''
  showComplete.value = false
  error.value = ''
  submitting.value = false
}

function goHome() {
  router.push('/')
}

function goToRoom() {
  if (selectedRoom.value) {
    router.push(`/room/${selectedRoom.value}`)
  }
}

onMounted(() => {
  fetchRooms()
})
</script>

<style scoped>
.confess-container {
  width: 100%;
  max-width: 600px;
}

.confess-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.card-header h2 {
  color: #333;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 25px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 12px;
}

.loading-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
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

.room-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.room-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  background: #fafafa;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.room-option:hover {
  background: white;
  border-color: var(--room-color);
  transform: translateY(-2px);
}

.room-option.active {
  background: var(--room-color);
  border-color: var(--room-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.room-option.active .room-option-name {
  color: white;
}

.room-option-icon {
  font-size: 26px;
}

.room-option-name {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  transition: color 0.2s ease;
}

.secret-input {
  width: 100%;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  font-size: 16px;
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

.secret-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secret-input::placeholder {
  color: #aaa;
  line-height: 1.8;
}

.char-count {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 13px;
  color: #999;
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

.form-actions {
  text-align: center;
  margin-bottom: 30px;
}

.submit-btn {
  min-width: 200px;
  font-size: 18px;
  padding: 15px 40px;
}

.btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

.tips {
  background: linear-gradient(135deg, #fef9e7 0%, #fdf2e9 100%);
  padding: 20px;
  border-radius: 15px;
  border-left: 4px solid #f59e0b;
}

.tips p {
  color: #78350f;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.6;
}

.tips p:last-child {
  margin-bottom: 0;
}

.complete-card {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.complete-content {
  text-align: center;
  padding: 30px 20px;
}

.complete-icon {
  font-size: 72px;
  display: block;
  margin-bottom: 20px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.complete-content h2 {
  color: #333;
  font-size: 28px;
  margin-bottom: 15px;
}

.complete-content p {
  color: #666;
  font-size: 16px;
  margin-bottom: 10px;
}

.room-info {
  color: #667eea !important;
  font-weight: 500;
  margin: 15px 0 !important;
}

.complete-actions {
  margin-top: 30px;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
