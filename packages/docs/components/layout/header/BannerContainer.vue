<template>
  <div v-if="!isHidden" class="banner-container flex items-center gap-4 py-2 px-4 text-white shrink-0">
    <Transition name="banner-fade" mode="out-in">
      <component :is="currentBanner" :key="currentIndex" />
    </Transition>
    <VaButton
      v-if="closeable"
      icon="close"
      preset="secondary"
      round
      :text-color="textColor"
      aria-label="close banner"
      @click="hide"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useElementTextColor } from 'vuestic-ui'

const props = defineProps({
  banners: { type: Array, required: true },
  interval: { type: Number, default: 10000 }, // 10 seconds default
  closeable: { type: Boolean, default: false },
})

const bannerCookie = useCookie('banner')
const textColor = useElementTextColor('primary')

const isHidden = ref(props.closeable && bannerCookie.value === 'banner-closed')

const hide = () => {
  if (props.closeable) {
    bannerCookie.value = 'banner-closed'
    isHidden.value = true
  }
}

const currentIndex = ref(0)
let intervalId: NodeJS.Timeout | null = null

const currentBanner = computed(() => props.banners[currentIndex.value])

const startRotation = () => {
  if (props.banners.length <= 1) return

  intervalId = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % props.banners.length
  }, props.interval)
}

const stopRotation = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

onMounted(() => {
  startRotation()
})

onUnmounted(() => {
  stopRotation()
})
</script>

<style lang="scss" scoped>
.banner-container {
  background-color: color-mix(in srgb, var(--va-primary) 80%, black 50%);
}

.banner-fade-enter-active,
.banner-fade-leave-active {
  @apply transition-all duration-300 ease-in-out;
}

.banner-fade-enter-from {
  @apply opacity-0 -translate-y-[10px];
}

.banner-fade-leave-to {
  @apply opacity-0 translate-y-[10px];
}
</style>
