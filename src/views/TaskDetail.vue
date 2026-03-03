<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getTaskDetail, cancelTask, type AnalysisTask } from '../api/task'
import { getIssuesByTaskId, type Issue, type PageResult, type IssueFilter } from '../api/issue'
import StatusBadge from '../components/StatusBadge.vue'
import MdViewer from '../components/MdViewer.vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Search, DataAnalysis } from '@element-plus/icons-vue'
import { evaluate, type EvaluationReport } from '../api/evaluation'

const route = useRoute()
const taskId = route.params.id as string
const task = ref<AnalysisTask | null>(null)
const issues = ref<Issue[]>([])
const loading = ref(false)
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

const selectIssue = (issue: Issue) => {
  selectedIssue.value = issue
}

// Evaluation
const evalDialogVisible = ref(false)
const evalLoading = ref(false)
const evalForm = ref({
  benchmarkPath: '',
  benchmarkType: 'OWASP-1.2'
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
      benchmarkType: evalForm.value.benchmarkType || 'OWASP-1.2'
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
    </el-form>

    <!-- Report Result -->
    <div v-if="evalReport" class="eval-report">
      <el-divider content-position="left">评估结果</el-divider>
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
</style>
