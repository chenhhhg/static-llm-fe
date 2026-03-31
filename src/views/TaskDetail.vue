<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTaskDetail, cancelTask, startLlm, stopLlm, type AnalysisTask } from '../api/task'
import { getIssuesByTaskId, type Issue, type IssueFilter } from '../api/issue'
import StatusBadge from '../components/StatusBadge.vue'
import MdViewer from '../components/MdViewer.vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Search, DataAnalysis, QuestionFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { evaluate, type EvaluationReport, getAiMisjudgments, type AiMisjudgmentReport, type Misjudgment } from '../api/evaluation'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id as string
const task = ref<AnalysisTask | null>(null)
const issues = ref<Issue[]>([])
const selectedIssue = ref<Issue | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const totalIssues = ref(0)

// Filter state
const filterSeverity = ref<string>('')
const filterKeyword = ref<string>('')
const filterFalsePositive = ref<string>('')

const severityOptions = [
  { label: '全部', value: '' },
  { label: 'HIGH', value: 'HIGH' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'LOW', value: 'LOW' },
]

const falsePositiveOptions = [
  { label: '全部', value: '' },
  { label: '真实缺陷', value: 'false' },
  { label: '误报', value: 'true' },
]

const buildFilter = (): IssueFilter => {
  const filter: IssueFilter = {}
  if (filterSeverity.value) {
    filter.severity = filterSeverity.value
  }
  if (filterKeyword.value.trim()) {
    filter.keyword = filterKeyword.value.trim()
  }
  if (filterFalsePositive.value !== '') {
    filter.isFalsePositive = filterFalsePositive.value === 'true'
  }
  return filter
}

const fetchDetail = async () => {
  try {
    const [taskRes, issuesRes] = await Promise.all([
      getTaskDetail(parseInt(taskId)),
      getIssuesByTaskId(parseInt(taskId), currentPage.value, pageSize.value, buildFilter())
    ])

    if (taskRes.data.code === 200) {
      task.value = taskRes.data.data
    }

    if (issuesRes.data.code === 200) {
      issues.value = issuesRes.data.data.records
      totalIssues.value = issuesRes.data.data.total
    }
  } catch (error) {
    console.error(error)
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchDetail()
}

const handleFilterChange = () => {
  currentPage.value = 1
  selectedIssue.value = null
  fetchDetail()
}

const handleSearch = () => {
  handleFilterChange()
}

const handleResetFilter = () => {
  filterSeverity.value = ''
  filterKeyword.value = ''
  filterFalsePositive.value = ''
  handleFilterChange()
}

const handleCancel = async () => {
  try {
    const res = await cancelTask(parseInt(taskId))
    if (res.data.code === 200) {
      ElMessage.success('任务已取消')
      fetchDetail()
    }
  } catch (error) {
    ElMessage.error('取消失败')
  }
}

// LLM control
const llmLoading = ref(false)

const handleStartLlm = async () => {
  llmLoading.value = true
  try {
    const res = await startLlm(parseInt(taskId))
    if (res.data.code === 200) {
      ElMessage.success('LLM 分析已启动')
      fetchDetail()
    } else {
      ElMessage.error(res.data.message || '启动失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.msg || '启动 LLM 分析失败')
  } finally {
    llmLoading.value = false
  }
}

const handleStopLlm = async () => {
  llmLoading.value = true
  try {
    const res = await stopLlm(parseInt(taskId))
    if (res.data.code === 200) {
      ElMessage.success('LLM 分析已停止')
      fetchDetail()
    } else {
      ElMessage.error(res.data.message || '停止失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.msg || '停止 LLM 分析失败')
  } finally {
    llmLoading.value = false
  }
}

const selectIssue = (issue: Issue) => {
  selectedIssue.value = issue
}

// Evaluation
const evalDialogVisible = ref(false)
const evalLoading = ref(false)
const evalForm = ref({
  benchmarkPath: '',
  benchmarkType: 'OWASP-1.2',
  aiOnly: true
})
const evalReport = ref<EvaluationReport | null>(null)

const openEvalDialog = () => {
  evalReport.value = null
  evalDialogVisible.value = true
}

const handleEvaluate = async () => {
  if (!evalForm.value.benchmarkPath.trim()) {
    ElMessage.warning('请输入基准测试文件路径')
    return
  }
  evalLoading.value = true
  try {
    const res = await evaluate({
      taskId: parseInt(taskId),
      benchmarkPath: evalForm.value.benchmarkPath.trim(),
      benchmarkType: evalForm.value.benchmarkType || 'OWASP-1.2',
      aiOnly: evalForm.value.aiOnly
    })
    if (res.data.code === 200) {
      evalReport.value = res.data.data
    } else {
      ElMessage.error(res.data.message || '评估失败')
    }
  } catch (error) {
    ElMessage.error('评估请求失败')
  } finally {
    evalLoading.value = false
  }
}

const formatPercent = (val: number) => {
  if (val == null) return '-'
  return (val * 100).toFixed(2) + '%'
}

/** Convert categoryStats map to table rows */
const categoryStatsRows = computed(() => {
  if (!evalReport.value?.categoryStats) return []
  return Object.entries(evalReport.value.categoryStats).map(([category, stat]) => ({
    category,
    ...stat
  }))
})

/** Navigate to evaluation record detail page */
const goToEvalRecordDetail = (recordId: number) => {
  if (!recordId) return
  router.push({ name: 'eval-record-detail', params: { recordId } })
}

// AI Misjudgment Analysis
const misjudgDialogVisible = ref(false)
const misjudgLoading = ref(false)
const misjudgForm = ref({
  benchmarkPath: '',
  benchmarkType: 'OWASP-1.2'
})
const misjudgReport = ref<AiMisjudgmentReport | null>(null)
const misjudgSelectedRow = ref<Misjudgment | null>(null)
const misjudgOnlyWrong = ref(true)

const openMisjudgDialog = () => {
  misjudgReport.value = null
  misjudgSelectedRow.value = null
  misjudgOnlyWrong.value = true
  // Sync benchmarkPath from eval form if available
  if (evalForm.value.benchmarkPath) {
    misjudgForm.value.benchmarkPath = evalForm.value.benchmarkPath
    misjudgForm.value.benchmarkType = evalForm.value.benchmarkType
  }
  misjudgDialogVisible.value = true
}

const handleMisjudgAnalysis = async () => {
  if (!misjudgForm.value.benchmarkPath.trim()) {
    ElMessage.warning('请输入基准测试文件路径')
    return
  }
  misjudgLoading.value = true
  misjudgSelectedRow.value = null
  try {
    const res = await getAiMisjudgments({
      taskId: parseInt(taskId),
      benchmarkPath: misjudgForm.value.benchmarkPath.trim(),
      benchmarkType: misjudgForm.value.benchmarkType || 'OWASP-1.2'
    })
    if (res.data.code === 200) {
      misjudgReport.value = res.data.data
    } else {
      ElMessage.error(res.data.message || '分析失败')
    }
  } catch (error) {
    ElMessage.error('误判分析请求失败')
  } finally {
    misjudgLoading.value = false
  }
}

const handleMisjudgRowClick = (row: Misjudgment) => {
  misjudgSelectedRow.value = row
}

/** Filtered list based on onlyWrong toggle */
const filteredMisjudgDetails = computed(() => {
  if (!misjudgReport.value) return []
  if (misjudgOnlyWrong.value) {
    return misjudgReport.value.misjudgments
  }
  return misjudgReport.value.allDetails ?? misjudgReport.value.misjudgments
})

/** Navigate to evaluation history page */
const goToEvalHistory = () => {
  router.push({ name: 'eval-history', query: { taskId } })
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="task-detail" v-loading="!task">
    <div class="header" v-if="task">
      <div class="title">
        <h2>任务 #{{ task.id }}</h2>
        <StatusBadge :status="task.status" class="ml-2" />
      </div>
      <div class="actions">
        <el-button
          type="primary"
          :icon="DataAnalysis"
          @click="openEvalDialog"
        >
          执行评估
        </el-button>
        <el-button
          type="warning"
          :icon="DataAnalysis"
          @click="openMisjudgDialog"
        >
          AI误判分析
        </el-button>
        <el-button
          @click="goToEvalHistory"
        >
          评估历史
        </el-button>
        <el-button
          v-if="task.status === 'WAITING_LLM'"
          type="success"
          :loading="llmLoading"
          @click="handleStartLlm"
        >
          启动 LLM 分析
        </el-button>
        <el-button
          v-if="task.status === 'JUDGING'"
          type="warning"
          :loading="llmLoading"
          @click="handleStopLlm"
        >
          停止 LLM 分析
        </el-button>
        <el-button 
          v-if="['SUBMITTED', 'WAITING_ANALYSIS', 'ANALYZING', 'WAITING_LLM', 'JUDGING'].includes(task.status)"
          type="danger" 
          @click="handleCancel"
        >
          取消任务
        </el-button>
        <span class="time">创建于: {{ dayjs(task.createdTime).format('YYYY-MM-DD HH:mm:ss') }}</span>
      </div>
    </div>

    <el-row :gutter="20" class="content" v-if="task">
      <el-col :span="8">
        <el-card class="issue-list-card">
          <template #header>
            <div class="card-header">
              <span>缺陷列表 ({{ totalIssues || 0 }})</span>
            </div>
          </template>
          <!-- Filter Bar -->
          <div class="filter-bar">
            <el-input
              v-model="filterKeyword"
              placeholder="搜索规则/文件名..."
              :prefix-icon="Search"
              clearable
              size="small"
              @keyup.enter="handleSearch"
              @clear="handleFilterChange"
              class="filter-input"
            />
            <div class="filter-row">
              <el-select
                v-model="filterSeverity"
                placeholder="严重程度"
                size="small"
                @change="handleFilterChange"
                class="filter-select"
              >
                <el-option
                  v-for="opt in severityOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-select
                v-model="filterFalsePositive"
                placeholder="误报筛选"
                size="small"
                @change="handleFilterChange"
                class="filter-select"
              >
                <el-option
                  v-for="opt in falsePositiveOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button size="small" @click="handleResetFilter" text>重置</el-button>
            </div>
          </div>
          <!-- Issue List -->
          <div class="issue-list">
            <div 
              v-for="(issue, index) in issues" 
              :key="index"
              class="issue-item"
              :class="{ active: selectedIssue === issue }"
              @click="selectIssue(issue)"
            >
              <div class="issue-title">{{ issue.ruleId }}</div>
              <div class="issue-meta">
                <el-tag size="small" :type="issue.severity === 'HIGH' ? 'danger' : 'warning'">{{ issue.severity }}</el-tag>
                <span class="file-path" :title="issue.filePath">{{ issue.filePath.split('/').pop() }}:{{ issue.startLine }}</span>
              </div>
            </div>
            <div v-if="!issues || issues.length === 0" class="empty-text">
              暂无缺陷或正在分析中...
            </div>
          </div>
          <div class="pagination-container" v-if="totalIssues > 0">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="totalIssues"
              layout="prev, pager, next"
              @current-change="handlePageChange"
              small
            />
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="16">
        <el-card class="detail-card">
          <div v-if="selectedIssue">
            <div class="issue-header">
              <h3>{{ selectedIssue.ruleId }}</h3>
              <el-tag :type="selectedIssue.severity === 'HIGH' ? 'danger' : 'warning'">{{ selectedIssue.severity }}</el-tag>
            </div>
            
            <div class="info-item">
              <span class="label">文件路径:</span>
              <span class="value">{{ selectedIssue.filePath }}:{{ selectedIssue.startLine }}</span>
            </div>

            <div class="info-item">
              <span class="label">问题描述:</span>
              <p class="desc">{{ selectedIssue.message }}</p>
            </div>

            <div class="code-snippet" v-if="selectedIssue.codeSnippet">
              <h4>相关代码片段</h4>
              <MdViewer :content="'```java\n' + selectedIssue.codeSnippet + '\n```'" />
            </div>
            
            <el-divider content-position="left">AI 分析与建议</el-divider>
            
            <div v-if="selectedIssue.aiReasoning">
              <h4>分析依据</h4>
              <MdViewer :content="selectedIssue.aiReasoning" />
            </div>
            
            <div v-if="selectedIssue.aiSuggestion" class="mt-4">
              <h4>修复建议</h4>
              <MdViewer :content="selectedIssue.aiSuggestion" />
            </div>
            
            <div v-if="!selectedIssue.aiReasoning && !selectedIssue.aiSuggestion">
              <el-empty description="等待 LLM 分析..." />
            </div>
          </div>
          <div v-else class="empty-selection">
            <el-empty description="请选择左侧缺陷查看详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <!-- Evaluation Dialog -->
  <el-dialog
    v-model="evalDialogVisible"
    title="执行评估"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form label-width="120px" :model="evalForm">
      <el-form-item label="基准测试类型">
        <el-input v-model="evalForm.benchmarkType" placeholder="例如：OWASP-1.2" />
      </el-form-item>
      <el-form-item label="基准文件路径" required>
        <el-input
          v-model="evalForm.benchmarkPath"
          placeholder="请输入服务器上的基准测试文件路径"
          clearable
        />
      </el-form-item>
      <el-form-item label="仅AI结果">
        <el-switch
          v-model="evalForm.aiOnly"
          active-text="是"
          inactive-text="否"
        />
        <span style="margin-left: 8px; color: #909399; font-size: 12px;">开启后仅评估AI判定的结果</span>
      </el-form-item>
    </el-form>

    <!-- Report Result -->
    <div v-if="evalReport" class="eval-report">
      <el-divider content-position="left">
        评估结果
        <el-tag v-if="evalReport.recordId" size="small" type="info" style="margin-left: 8px;">记录 #{{ evalReport.recordId }}</el-tag>
      </el-divider>
      <el-row :gutter="16" class="eval-metrics">
        <el-col :span="6">
          <el-statistic title="TP（真阳性）" :value="evalReport.tpCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="FP（假阳性）" :value="evalReport.fpCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="FN（假阴性）" :value="evalReport.fnCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="TN（真阴性）" :value="evalReport.tnCount" />
        </el-col>
      </el-row>
      <el-row :gutter="16" class="eval-metrics">
        <el-col :span="6">
          <el-statistic title="精确率" :value="formatPercent(evalReport.precision)" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="召回率" :value="formatPercent(evalReport.recall)" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="F1 Score" :value="formatPercent(evalReport.f1Score)" />
        </el-col>
        <el-col :span="6">
          <el-statistic
            title="Benchmark Score"
            :value="formatPercent(evalReport.benchmarkScore)"
            class="score-highlight"
          />
        </el-col>
      </el-row>
      <el-row :gutter="16" class="eval-metrics" v-if="evalReport.unmappedIssueCount != null">
        <el-col :span="6">
          <el-statistic title="不可映射Issue" :value="evalReport.unmappedIssueCount">
            <template #suffix>
              <el-tooltip content="SpotBugs检出但ruleId无法映射到Benchmark安全漏洞类别的Issue数量，不参与混淆矩阵计算" placement="top">
                <el-icon style="margin-left: 4px; cursor: help; color: #909399;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-statistic>
        </el-col>
      </el-row>

      <!-- Category Stats -->
      <div v-if="evalReport.categoryStats && Object.keys(evalReport.categoryStats).length > 0">
        <el-divider content-position="left">分类统计</el-divider>
        <el-table :data="categoryStatsRows" size="small" border style="width: 100%">
          <el-table-column prop="category" label="漏洞类别" width="140" />
          <el-table-column prop="tp" label="TP" width="70" align="center" />
          <el-table-column prop="fp" label="FP" width="70" align="center" />
          <el-table-column prop="fn" label="FN" width="70" align="center" />
          <el-table-column prop="tn" label="TN" width="70" align="center" />
          <el-table-column label="召回率" width="100" align="center">
            <template #default="{ row }">
              {{ formatPercent(row.recall) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin-top: 12px; text-align: right;">
        <el-button size="small" @click="goToEvalRecordDetail(evalReport.recordId)">
          查看完整详情
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="evalDialogVisible = false">关闭</el-button>
      <el-button
        type="primary"
        :loading="evalLoading"
        @click="handleEvaluate"
      >
        {{ evalLoading ? '评估中...' : '开始评估' }}
      </el-button>
    </template>
  </el-dialog>
  <!-- AI Misjudgment Dialog -->
  <el-dialog
    v-model="misjudgDialogVisible"
    title="AI 误判分析"
    width="900px"
    :close-on-click-modal="false"
  >
    <el-form label-width="120px" :model="misjudgForm">
      <el-form-item label="基准测试类型">
        <el-input v-model="misjudgForm.benchmarkType" placeholder="例如：OWASP-1.2" />
      </el-form-item>
      <el-form-item label="基准文件路径" required>
        <el-input
          v-model="misjudgForm.benchmarkPath"
          placeholder="请输入服务器上的基准测试文件路径"
          clearable
        />
      </el-form-item>
    </el-form>

    <!-- Summary -->
    <div v-if="misjudgReport" class="misjudg-report">
      <el-divider content-position="left">分析概要</el-divider>
      <el-row :gutter="16" class="eval-metrics">
        <el-col :span="5">
          <el-statistic title="分析总数" :value="misjudgReport.totalAnalyzed" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="匹配数" :value="misjudgReport.matchedCount" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="正确数" :value="misjudgReport.correctCount" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="错误数" :value="misjudgReport.wrongCount" />
        </el-col>
        <el-col :span="4">
          <el-statistic
            title="准确率"
            :value="formatPercent(misjudgReport.accuracy)"
            class="score-highlight"
          />
        </el-col>
      </el-row>

      <el-divider content-position="left">
        对比详情 ({{ filteredMisjudgDetails.length }})
        <el-switch
          v-model="misjudgOnlyWrong"
          active-text="仅看错误"
          inactive-text="全部"
          style="margin-left: 12px;"
        />
      </el-divider>
      <el-table
        :data="filteredMisjudgDetails"
        max-height="300"
        size="small"
        highlight-current-row
        @row-click="handleMisjudgRowClick"
        style="width: 100%"
      >
        <el-table-column prop="benchmarkTestName" label="测试用例" width="180" show-overflow-tooltip />
        <el-table-column prop="ruleId" label="规则ID" width="140" show-overflow-tooltip />
        <el-table-column label="Benchmark" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.benchmarkIsReal ? 'danger' : 'success'" size="small">
              {{ row.benchmarkIsReal ? '真实' : '假阳' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="AI判定" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.aiIsFalsePositive ? 'info' : 'warning'" size="small">
              {{ row.aiIsFalsePositive ? '误报' : '真实' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="AI正确" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.aiCorrect ? 'success' : 'danger'" size="small">
              {{ row.aiCorrect ? '✓' : '✗' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="errorType" label="错误类型" show-overflow-tooltip />
      </el-table>

      <!-- Selected Misjudgment Detail -->
      <div v-if="misjudgSelectedRow" class="misjudg-detail">
        <el-divider content-position="left">详细信息</el-divider>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="Issue ID">{{ misjudgSelectedRow.issueId }}</el-descriptions-item>
          <el-descriptions-item label="测试用例">{{ misjudgSelectedRow.benchmarkTestName }}</el-descriptions-item>
          <el-descriptions-item label="文件路径" :span="2">{{ misjudgSelectedRow.filePath }}</el-descriptions-item>
          <el-descriptions-item label="规则ID">{{ misjudgSelectedRow.ruleId }}</el-descriptions-item>
          <el-descriptions-item label="漏洞分类">{{ misjudgSelectedRow.normalizedCategory }}</el-descriptions-item>
          <el-descriptions-item label="Benchmark 标注">
            <el-tag :type="misjudgSelectedRow.benchmarkIsReal ? 'danger' : 'success'" size="small">
              {{ misjudgSelectedRow.benchmarkIsReal ? '真实漏洞' : '假阳性' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="AI 判定">
            <el-tag :type="misjudgSelectedRow.aiIsFalsePositive ? 'info' : 'warning'" size="small">
              {{ misjudgSelectedRow.aiIsFalsePositive ? '判为误报' : '判为真实' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误类型" :span="2">
            <span style="color: #f56c6c; font-weight: bold;">{{ misjudgSelectedRow.errorType }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="AI 推理" :span="2">
            <div class="ai-reasoning-text">{{ misjudgSelectedRow.aiReasoning }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-if="misjudgReport?.recordId" style="margin-top: 12px; text-align: right;">
        <el-button size="small" @click="goToEvalRecordDetail(misjudgReport.recordId)">
          查看完整详情
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="misjudgDialogVisible = false">关闭</el-button>
      <el-button
        type="warning"
        :loading="misjudgLoading"
        @click="handleMisjudgAnalysis"
      >
        {{ misjudgLoading ? '分析中...' : '开始分析' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  display: flex;
  align-items: center;
}

.ml-2 {
  margin-left: 10px;
}

.time {
  margin-left: 20px;
  color: #909399;
  font-size: 14px;
}

.issue-list-card {
  height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.issue-list {
  overflow-y: auto;
  flex: 1;
}

.pagination-container {
  padding: 10px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}

.issue-item {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background-color 0.3s;
}

.issue-item:hover {
  background-color: #f5f7fa;
}

.issue-item.active {
  background-color: #ecf5ff;
  border-left: 3px solid #409EFF;
}

.issue-title {
  font-weight: bold;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.issue-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.file-path {
  margin-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.detail-card {
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.issue-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.issue-header h3 {
  margin: 0;
}

.info-item {
  margin-bottom: 15px;
}

.info-item .label {
  font-weight: bold;
  margin-right: 10px;
  color: #606266;
}

.desc {
  margin: 5px 0 0 0;
  line-height: 1.5;
  color: #303133;
}

.code-snippet {
  margin: 20px 0;
}

.code-snippet h4 {
  margin-bottom: 10px;
  color: #606266;
}

.mt-4 {
  margin-top: 20px;
}

.empty-text {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.empty-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.filter-bar {
  padding: 0 0 10px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}

.filter-input {
  margin-bottom: 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-select {
  flex: 1;
}

.eval-report {
  margin-top: 10px;
}

.eval-metrics {
  margin-bottom: 20px;
}

.score-highlight :deep(.el-statistic__number) {
  color: #409eff;
  font-weight: bold;
}

.misjudg-report {
  margin-top: 10px;
}

.misjudg-detail {
  margin-top: 10px;
}

.ai-reasoning-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}
</style>
