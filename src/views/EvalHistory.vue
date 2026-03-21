<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEvalRecords, type EvalRecord, type EvalMode } from '../api/evaluation'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const records = ref<EvalRecord[]>([])
const loading = ref(false)
const filterTaskId = ref<string>((route.query.taskId as string) || '')

const formatPercent = (val: number | null) => {
  if (val == null) return '-'
  return (val * 100).toFixed(2) + '%'
}

const evalModeTag = (mode: EvalMode) => {
  switch (mode) {
    case 'FULL': return { label: '全量评估', type: 'primary' as const }
    case 'AI_ONLY': return { label: '仅AI评估', type: 'success' as const }
    case 'AI_MISJUDGMENT': return { label: 'AI误判分析', type: 'warning' as const }
    default: return { label: mode, type: 'info' as const }
  }
}

const fetchRecords = async () => {
  loading.value = true
  try {
    const taskId = filterTaskId.value.trim() ? parseInt(filterTaskId.value.trim()) : undefined
    const res = await getEvalRecords(taskId)
    if (res.data.code === 200) {
      records.value = res.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch eval records', error)
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  fetchRecords()
}

const handleReset = () => {
  filterTaskId.value = ''
  fetchRecords()
}

const goToDetail = (record: EvalRecord) => {
  router.push({ name: 'eval-record-detail', params: { recordId: record.id } })
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchRecords()
})
</script>

<template>
  <div class="eval-history">
    <div class="page-header">
      <el-button @click="goBack" text>← 返回</el-button>
      <h2>评估历史记录</h2>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <el-input
        v-model="filterTaskId"
        placeholder="按任务ID筛选"
        style="width: 200px;"
        clearable
        @keyup.enter="handleFilter"
        @clear="handleReset"
      />
      <el-button type="primary" @click="handleFilter">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <!-- Records Table -->
    <el-table
      :data="records"
      v-loading="loading"
      stripe
      border
      style="width: 100%"
      @row-click="goToDetail"
      class="clickable-table"
    >
      <el-table-column prop="id" label="ID" width="60" align="center" />
      <el-table-column prop="taskId" label="任务ID" width="80" align="center" />
      <el-table-column label="评估模式" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="evalModeTag(row.evalMode).type" size="small">
            {{ evalModeTag(row.evalMode).label }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- FULL/AI_ONLY metrics -->
      <el-table-column label="TP" width="60" align="center">
        <template #default="{ row }">{{ row.tpCount ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="FP" width="60" align="center">
        <template #default="{ row }">{{ row.fpCount ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="FN" width="60" align="center">
        <template #default="{ row }">{{ row.fnCount ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="TN" width="60" align="center">
        <template #default="{ row }">{{ row.tnCount ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="精确率" width="80" align="center">
        <template #default="{ row }">{{ formatPercent(row.precisionRate) }}</template>
      </el-table-column>
      <el-table-column label="F1" width="80" align="center">
        <template #default="{ row }">{{ formatPercent(row.f1Score) }}</template>
      </el-table-column>
      <el-table-column label="Benchmark" width="90" align="center">
        <template #default="{ row }">{{ formatPercent(row.benchmarkScore) }}</template>
      </el-table-column>
      <el-table-column label="不可映射" width="80" align="center">
        <template #default="{ row }">{{ row.unmappedIssueCount ?? '-' }}</template>
      </el-table-column>

      <!-- AI_MISJUDGMENT metrics -->
      <el-table-column label="已分析" width="70" align="center">
        <template #default="{ row }">{{ row.totalAnalyzed ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="正确/错误" width="90" align="center">
        <template #default="{ row }">
          <span v-if="row.correctCount != null">{{ row.correctCount }}/{{ row.wrongCount }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="准确率" width="80" align="center">
        <template #default="{ row }">{{ formatPercent(row.accuracy) }}</template>
      </el-table-column>

      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          {{ dayjs(row.createdTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
      </el-table-column>
    </el-table>

    <div v-if="records.length === 0 && !loading" class="empty-state">
      <el-empty description="暂无评估记录" />
    </div>
  </div>
</template>

<style scoped>
.eval-history {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.clickable-table :deep(tbody tr) {
  cursor: pointer;
}

.clickable-table :deep(tbody tr:hover) {
  background-color: #ecf5ff !important;
}

.empty-state {
  margin-top: 40px;
}
</style>
