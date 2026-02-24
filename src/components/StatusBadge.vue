<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusType = computed(() => {
  switch (props.status) {
    case 'SUBMITTED':
    case 'WAITING_ANALYSIS':
    case 'WAITING_LLM':
      return 'info'
    case 'ANALYZING':
    case 'JUDGING':
      return 'warning' // or primary
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
    case 'CANCELLED':
      return 'danger'
    default:
      return 'info'
  }
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    'SUBMITTED': '已提交',
    'WAITING_ANALYSIS': '等待分析',
    'ANALYZING': '正在分析',
    'WAITING_LLM': '等待审计',
    'JUDGING': '正在审计',
    'COMPLETED': '已完成',
    'FAILED': '失败',
    'CANCELLED': '已取消'
  }
  return map[props.status] || props.status
})
</script>

<template>
  <el-tag :type="statusType">{{ statusText }}</el-tag>
</template>
