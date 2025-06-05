<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ThemeToggle from './ThemeToggle.vue'

const currentTime = ref('')
const date = ref('')

const updateDateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  date.value = now.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(() => {
  updateDateTime()
  const timer = setInterval(updateDateTime, 1)
  onUnmounted(() => clearInterval(timer))
})

defineEmits(['toggle-theme'])
</script>

<template>
  <header class="header">
    <div class="logo-container">
      <div class="logo">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <div class="title">
        <h1>出发吧</h1>
        <!-- <p>123</p> -->
      </div>
    </div>

    <div class="time-container">
      <div class="time-display">
        <span class="time">{{ currentTime }}</span>
        <span class="date">{{ date }}</span>
      </div>
      <ThemeToggle @toggle-theme="$emit('toggle-theme')" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--bg-secondary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .dark-theme & {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent-color);
  border-radius: 50%;

  svg {
    width: 24px;
    height: 24px;
    stroke: white;
  }
}

.title {
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
  p {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
  }
}

.time-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.time-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .time {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-color);
  }

  .date {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .logo-container {
    width: 100%;
    justify-content: center;
  }

  .time-container {
    width: 100%;
    justify-content: space-between;
  }

  .time-display {
    align-items: flex-start;
  }
}
</style>
