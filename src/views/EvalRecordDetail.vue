<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEvalRecord, getEvalRecordDetails, type EvalRecord, type EvalDetailItem, type EvalMode } from '../api/evaluation'
import dayjs from 'dayjs'
import { QuestionFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const recordId = parseInt(route.params.recordId as string)
const record = ref<EvalRecord | null>(null)
const details = ref<EvalDetailItem[]>([])
const loading = ref(false)
const detailsLoading = ref(false)
const onlyWrong = ref(false)
const selectedDetail = ref<EvalDetailItem | null>(null)

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

const isEvalMode = computed(() => record.value?.evalMode === 'FULL' || record.value?.evalMode === 'AI_ONLY')
const isMisjudgMode = computed(() => record.value?.evalMode === 'AI_MISJUDGMENT')

const fetchRecord = async () => {
  loading.value = true
  try {
    const res = await getEvalRecord(recordId)
    if (res.data.code === 200) {
      record.value = res.data.data
    }
  } catch (error) {
    console.error('Failed to fetch record', error)
  } finally {
    loading.value = false
  }
}

const fetchDetails = async () => {
  detailsLoading.value = true
  try {
    const res = await getEvalRecordDetails(recordId, onlyWrong.value || undefined)
    if (res.data.code === 200) {
      details.value = res.data.data || []
    }
  } catch (error) {
    console.error('Failed to fetch details', error)
  } finally {
    detailsLoading.value = false
  }
}

const handleOnlyWrongChange = () => {
  selectedDetail.value = null
  fetchDetails()
}

const handleRowClick = (row: EvalDetailItem) => {
  selectedDetail.value = row
}

const goBack = () => {
  router.back()
}

/** Row class: highlight wrong rows */
const tableRowClassName = ({ row }: { row: EvalDetailItem }) => {
  if (row.aiCorrect === false) return 'wrong-row'
  return ''
}

onMounted(() => {
  fetchRecord()
  fetchDetails()
})
</script>

<template>
  <div class="eval-record-detail" v-loading="loading">
    <div class="page-header">
      <el-button @click="goBack" text>← 返回</el-button>
      <h2>
        评估记录 #{{ recordId }}
        <el-tag v-if="record" :type="evalModeTag(record.evalMode).type" style="margin-left: 8px;">
          {{ evalModeTag(record.evalMode).label }}
        </el-tag>
      </h2>
    </div>

    <!-- Summary Metrics -->
    <el-card v-if="record" class="summary-card">
      <template #header>
        <div class="card-header-row">
          <span>汇总指标</span>
          <span class="time-text">
            任务 #{{ record.taskId }} · {{ dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss') }}
          </span>
        </div>
      </template>

      <!-- FULL / AI_ONLY metrics -->
      <div v-if="isEvalMode">
        <el-row :gutter="16" class="metrics-row">
          <el-col :span="3"><el-statistic title="TP" :value="record.tpCount ?? 0" /></el-col>
          <el-col :span="3"><el-statistic title="FP" :value="record.fpCount ?? 0" /></el-col>
          <el-col :span="3"><el-statistic title="FN" :value="record.fnCount ?? 0" /></el-col>
          <el-col :span="3"><el-statistic title="TN" :value="record.tnCount ?? 0" /></el-col>
          <el-col :span="3"><el-statistic title="精确率" :value="formatPercent(record.precisionRate)" /></el-col>
          <el-col :span="3"><el-statistic title="召回率" :value="formatPercent(record.recallRate)" /></el-col>
          <el-col :span="3"><el-statistic title="F1 Score" :value="formatPercent(record.f1Score)" /></el-col>
          <el-col :span="3">
            <el-statistic title="Benchmark" :value="formatPercent(record.benchmarkScore)" class="score-highlight" />
          </el-col>
        </el-row>
        <el-row :gutter="16" class="metrics-row" v-if="record.unmappedIssueCount != null">
          <el-col :span="6">
            <el-statistic title="不可映射Issue" :value="record.unmappedIssueCount">
              <template #suffix>
                <el-tooltip content="SpotBugs检出但ruleId无法映射到Benchmark安全漏洞类别的Issue数量，不参与混淆矩阵计算" placement="top">
                  <el-icon style="margin-left: 4px; cursor: help; color: #909399;"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>

      <!-- AI_MISJUDGMENT metrics -->
      <div v-if="isMisjudgMode">
        <el-row :gutter="16" class="metrics-row">
          <el-col :span="5"><el-statistic title="分析总数" :value="record.totalAnalyzed ?? 0" /></el-col>
          <el-col :span="5"><el-statistic title="匹配数" :value="record.matchedCount ?? 0" /></el-col>
          <el-col :span="5"><el-statistic title="正确数" :value="record.correctCount ?? 0" /></el-col>
          <el-col :span="5"><el-statistic title="错误数" :value="record.wrongCount ?? 0" /></el-col>
          <el-col :span="4">
            <el-statistic title="准确率" :value="formatPercent(record.accuracy)" class="score-highlight" />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- Detail Table -->
    <el-card class="detail-table-card">
      <template #header>
        <div class="card-header-row">
          <span>评估详情 ({{ details.length }})</span>
          <div v-if="isMisjudgMode" class="header-controls">
            <el-switch
              v-model="onlyWrong"
              active-text="仅看错误"
              inactive-text="全部"
              @change="handleOnlyWrongChange"
            />
          </div>
        </div>
      </template>

      <el-table
        :data="details"
        v-loading="detailsLoading"
        max-height="450"
        size="small"
        border
        highlight-current-row
        :row-class-name="tableRowClassName"
        @row-click="handleRowClick"
        style="width: 100%"
      >
        <el-table-column prop="benchmarkTestName" label="测试用例" width="180" show-overflow-tooltip />
        <el-table-column prop="filePath" label="文件路径" show-overflow-tooltip />

        <!-- FULL/AI_ONLY columns -->
        <template v-if="isEvalMode">
          <el-table-column prop="benchmarkCategory" label="Benchmark类别" width="120" />
          <el-table-column label="Benchmark标注" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.benchmarkIsReal ? 'danger' : 'success'" size="small">
                {{ row.benchmarkIsReal ? '真实' : '假阳' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="匹配状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.matchStatus === 'TP' ? 'success' : row.matchStatus === 'FP' ? 'danger' : row.matchStatus === 'FN' ? 'warning' : 'info'"
                size="small"
              >
                {{ row.matchStatus ?? '-' }}
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <!-- AI_MISJUDGMENT columns -->
        <template v-if="isMisjudgMode">
          <el-table-column prop="ruleId" label="规则ID" width="140" show-overflow-tooltip />
          <el-table-column prop="normalizedCategory" label="漏洞分类" width="100" />
          <el-table-column label="Benchmark" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.benchmarkIsReal ? 'danger' : 'success'" size="small">
                {{ row.benchmarkIsReal ? '真实' : '假阳' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="AI判定" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.aiIsFalsePositive ? 'info' : 'warning'" size="small">
                {{ row.aiIsFalsePositive ? '误报' : '真实' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="AI正确" width="70" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.aiCorrect != null" :type="row.aiCorrect ? 'success' : 'danger'" size="small">
                {{ row.aiCorrect ? '✓' : '✗' }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="errorType" label="错误类型" width="160" show-overflow-tooltip />
        </template>
      </el-table>
    </el-card>

    <!-- Selected Detail Drawer -->
    <el-card v-if="selectedDetail" class="selected-detail-card">
      <template #header>
        <span>详细信息 — {{ selectedDetail.benchmarkTestName }}</span>
      </template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="记录ID">{{ selectedDetail.id }}</el-descriptions-item>
        <el-descriptions-item label="Issue ID">{{ selectedDetail.issueId ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="文件路径" :span="2">{{ selectedDetail.filePath }}</el-descriptions-item>
        <el-descriptions-item label="测试用例">{{ selectedDetail.benchmarkTestName }}</el-descriptions-item>
        <el-descriptions-item label="Benchmark标注">
          <el-tag :type="selectedDetail.benchmarkIsReal ? 'danger' : 'success'" size="small">
            {{ selectedDetail.benchmarkIsReal ? '真实漏洞' : '假阳性' }}
          </el-tag>
        </el-descriptions-item>

        <template v-if="isEvalMode">
          <el-descriptions-item label="Benchmark类别">{{ selectedDetail.benchmarkCategory ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="匹配状态">
            <el-tag
              v-if="selectedDetail.matchStatus"
              :type="selectedDetail.matchStatus === 'TP' ? 'success' : selectedDetail.matchStatus === 'FP' ? 'danger' : selectedDetail.matchStatus === 'FN' ? 'warning' : 'info'"
              size="small"
            >
              {{ selectedDetail.matchStatus }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDetail.detailInfo" label="详情" :span="2">
            <div class="detail-text">{{ selectedDetail.detailInfo }}</div>
          </el-descriptions-item>
        </template>

        <template v-if="isMisjudgMode">
          <el-descriptions-item label="规则ID">{{ selectedDetail.ruleId ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="漏洞分类">{{ selectedDetail.normalizedCategory ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="AI判定">
            <el-tag v-if="selectedDetail.aiIsFalsePositive != null" :type="selectedDetail.aiIsFalsePositive ? 'info' : 'warning'" size="small">
              {{ selectedDetail.aiIsFalsePositive ? '判为误报' : '判为真实' }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="AI正确">
            <el-tag v-if="selectedDetail.aiCorrect != null" :type="selectedDetail.aiCorrect ? 'success' : 'danger'" size="small">
              {{ selectedDetail.aiCorrect ? '✓ 正确' : '✗ 错误' }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDetail.errorType" label="错误类型" :span="2">
            <span style="color: #f56c6c; font-weight: bold;">{{ selectedDetail.errorType }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedDetail.aiReasoning" label="AI推理" :span="2">
            <div class="detail-text">{{ selectedDetail.aiReasoning }}</div>
          </el-descriptions-item>
        </template>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.eval-record-detail {
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
  display: flex;
  align-items: center;
}

.summary-card {
  margin-bottom: 16px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-text {
  color: #909399;
  font-size: 13px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metrics-row {
  margin-bottom: 10px;
}

.score-highlight :deep(.el-statistic__number) {
  color: #409eff;
  font-weight: bold;
}

.detail-table-card {
  margin-bottom: 16px;
}

.selected-detail-card {
  margin-bottom: 16px;
}

.detail-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}

:deep(.wrong-row) {
  background-color: #fef0f0 !important;
}

:deep(.wrong-row:hover td) {
  background-color: #fde2e2 !important;
}
</style>
