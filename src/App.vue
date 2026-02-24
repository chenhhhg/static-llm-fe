<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <el-container class="layout-container">
    <el-aside width="200px">
      <el-menu
        router
        :default-active="$route.path"
        class="el-menu-vertical"
      >
        <div class="logo">Static LLM</div>
        <el-menu-item index="/">
          <el-icon><List /></el-icon>
          <span>任务列表</span>
        </el-menu-item>
        <el-menu-item index="/submit">
          <el-icon><Plus /></el-icon>
          <span>新建任务</span>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Reading /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="/cache">
          <el-icon><Coin /></el-icon>
          <span>缓存管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>Static LLM 审计系统</h2>
        </div>
      </el-header>
      
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
}

.el-aside {
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
  border-bottom: 1px solid #dcdfe6;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
}

.el-main {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>
