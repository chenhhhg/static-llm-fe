<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTaskList, deleteTask, type AnalysisTask } from '../api/task'
import StatusBadge from '../components/StatusBadge.vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const tasks = ref<AnalysisTask[]>([])
const loading = ref(false)

const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await getTaskList()
    if (res.data.code === 200) {
      tasks.value = res.data.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleView = (row: any) => {
  router.push(`/task/${row.id}`)
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    '确定要删除该任务吗?',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const res = await deleteTask(row.id)
      if (res.data.code === 200) {
        ElMessage.success('删除成功')
        fetchTasks()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

onMounted(() => {
  fetchTasks()
})
</script>

<template>
  <div class="dashboard">
    <div class="header-actions">
      <h2>任务列表</h2>
      <el-button type="primary" @click="fetchTasks">刷新</el-button>
    </div>
    
    <el-table :data="tasks" style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="taskParams.targetJar" label="目标 Jar 包" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="scope">
          <StatusBadge :status="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="createdTime" label="创建时间" width="180">
        <template #default="scope">
          {{ dayjs(scope.row.createdTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="scope">
          <el-button link type="primary" size="small" @click="handleView(scope.row)">详情</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
