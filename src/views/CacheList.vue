<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCacheList, deleteCache, type AnalysisCache } from '../api/cache'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'

const cacheList = ref<AnalysisCache[]>([])
const loading = ref(false)

const fetchCache = async () => {
  loading.value = true
  try {
    const res = await getCacheList()
    if (res.data.code === 200) {
      cacheList.value = res.data.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleDelete = (row: AnalysisCache) => {
  ElMessageBox.confirm('确定删除该缓存吗?', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteCache(row.id)
      if (res.data.code === 200) {
        ElMessage.success('删除成功')
        fetchCache()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

onMounted(() => {
  fetchCache()
})
</script>

<template>
  <div class="cache-list">
    <div class="header-actions">
      <h2>缓存管理</h2>
      <el-button type="primary" @click="fetchCache">刷新</el-button>
    </div>

    <el-table :data="cacheList" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="cacheKey" label="缓存 Key (MD5)" min-width="300" show-overflow-tooltip />
      <el-table-column prop="toolName" label="工具名称" width="150" />
      <el-table-column prop="createdTime" label="创建时间" width="180">
        <template #default="scope">
          {{ dayjs(scope.row.createdTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="scope">
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
