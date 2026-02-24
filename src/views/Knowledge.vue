<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getKnowledgeList, addKnowledge, updateKnowledge, deleteKnowledge, type Knowledge } from '../api/knowledge'
import { ElMessage, ElMessageBox } from 'element-plus'

const knowledgeList = ref<Knowledge[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const form = reactive({
  id: undefined as number | undefined,
  title: '',
  content: ''
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const fetchKnowledge = async () => {
  loading.value = true
  try {
    const res = await getKnowledgeList()
    if (res.data.code === 200) {
      knowledgeList.value = res.data.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  form.id = undefined
  form.title = ''
  form.content = ''
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.title = row.title
  form.content = row.content
  dialogVisible.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定删除该条知识吗?', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteKnowledge(row.id)
      if (res.data.code === 200) {
        ElMessage.success('删除成功')
        fetchKnowledge()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        if (isEdit.value && form.id) {
          // Pass only title and content as per KnowledgeRequest
          await updateKnowledge(form.id, { title: form.title, content: form.content })
          ElMessage.success('更新成功')
        } else {
          await addKnowledge({ title: form.title, content: form.content })
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        fetchKnowledge()
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }
  })
}

onMounted(() => {
  fetchKnowledge()
})
</script>

<template>
  <div class="knowledge">
    <div class="header-actions">
      <h2>知识库管理</h2>
      <el-button type="primary" @click="handleAdd">添加知识</el-button>
    </div>

    <el-table :data="knowledgeList" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" width="200" />
      <el-table-column prop="content" label="内容" show-overflow-tooltip />
      <el-table-column label="操作" width="150">
        <template #default="scope">
          <el-button link type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑知识' : '添加知识'"
      width="50%"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input 
            v-model="form.content" 
            type="textarea" 
            :rows="6" 
            placeholder="支持 Markdown 格式"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
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
