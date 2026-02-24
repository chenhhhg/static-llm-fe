<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { submitTask } from '../api/task'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  targetJar: '',
  sourcePath: '',
  packageFilter: ''
})

const rules = {
  targetJar: [
    { required: true, message: '请输入目标 Jar 包路径', trigger: 'blur' }
  ],
  sourcePath: [
    { required: true, message: '请输入源码根目录路径', trigger: 'blur' }
  ]
}

const onSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {
        const res = await submitTask(form)
        if (res.data.code === 200) {
          ElMessage.success('任务提交成功')
          router.push('/')
        } else {
          ElMessage.error(res.data.msg || '提交失败')
        }
      } catch (error) {
        ElMessage.error('提交失败，请检查网络或后端服务')
      } finally {
        loading.value = false
      }
    }
  })
}

const onReset = () => {
  if (!formRef.value) return
  formRef.value.resetFields()
}
</script>

<template>
  <div class="task-submit">
    <h2>提交新任务</h2>
    <el-card class="box-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="目标 Jar 包" prop="targetJar">
          <el-input v-model="form.targetJar" placeholder="例如: D:/projects/myapp/target/myapp.jar" />
        </el-form-item>
        <el-form-item label="源码根目录" prop="sourcePath">
          <el-input v-model="form.sourcePath" placeholder="例如: D:/projects/myapp/src/main/java" />
        </el-form-item>
        <el-form-item label="包名过滤器" prop="packageFilter">
          <el-input v-model="form.packageFilter" placeholder="例如: com.example.- (可选)" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit" :loading="loading">提交任务</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.box-card {
  max-width: 800px;
  margin: 0 auto;
}
</style>
