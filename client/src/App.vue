<template>
  <div class="app-container">
    <header class="header">
      <div class="logo" @click="goHome">🍃 匿名忏悔室</div>
      <nav class="nav">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
          🏠 首页
        </router-link>
        <div class="nav-dropdown" :class="{ open: dropdownOpen }" @click.stop>
          <div class="nav-link dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
            🏛️ 主题房间
            <span class="arrow">▼</span>
          </div>
          <div class="dropdown-menu" v-if="dropdownOpen">
            <div v-if="roomsLoading" class="dropdown-loading">
              <div class="spinner-tiny"></div>
              <span>加载中...</span>
            </div>
            <router-link
              v-for="r in rooms"
              :key="r.id"
              :to="`/room/${r.id}`"
              class="dropdown-item"
              @click="dropdownOpen = false"
            >
              <span class="dropdown-icon">{{ r.icon }}</span>
              <span class="dropdown-name">{{ r.name }}</span>
              <span class="dropdown-count">{{ r.stats?.total || 0 }}条</span>
            </router-link>
          </div>
        </div>
        <router-link to="/confess" class="nav-link confess-link" :class="{ active: $route.path === '/confess' }">
          🕊️ 倾诉秘密
        </router-link>
      </nav>
    </header>
    <div class="nav-mask" v-if="dropdownOpen" @click="dropdownOpen = false"></div>
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="footer">
      <p>每一个秘密都值得被宽恕 💜</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const dropdownOpen = ref(false)
const roomsLoading = ref(true)
const rooms = ref([])

function goHome() {
  router.push('/')
}

function handleClickOutside(e) {
  if (dropdownOpen.value) {
    dropdownOpen.value = false
  }
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

onMounted(() => {
  fetchRooms()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  padding: 16px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 22px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease;
  user-select: none;
}

.logo:hover {
  transform: scale(1.03);
}

.nav {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nav-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 15px;
  transition: all 0.3s ease;
  padding: 9px 16px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.12);
}

.nav-link.active {
  color: white;
  background: rgba(255, 255, 255, 0.22);
}

.confess-link {
  background: rgba(255, 255, 255, 0.15);
}

.confess-link:hover {
  background: rgba(255, 255, 255, 0.25);
}

.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dropdown-trigger .arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.nav-dropdown.open .arrow {
  transform: rotate(180deg);
}

.nav-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 99;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 240px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 101;
  animation: dropdownIn 0.2s ease;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.spinner-tiny {
  width: 16px; height: 16px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: #f5f7ff;
  transform: translateX(3px);
}

.dropdown-icon {
  font-size: 22px;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: #f5f5f5;
  flex-shrink: 0;
}

.dropdown-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.dropdown-count {
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 10px;
}

.main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 35px 20px;
}

.footer {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

@media (max-width: 700px) {
  .header {
    padding: 14px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .logo {
    font-size: 19px;
  }
  .nav {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
    flex: 1;
  }
  .nav-link {
    font-size: 13px;
    padding: 7px 12px;
  }
  .main {
    padding: 25px 12px;
  }
}
</style>
