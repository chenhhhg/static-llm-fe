# 前端开发指南 (Frontend Development Guide)

本文档旨在为前端开发人员提供关于 **Static LLM (静态代码分析与 LLM 审计系统)** 的项目全貌、当前进展、未来规划以及详细的接口说明。

## 1. 项目概述

Static LLM 是一个结合了传统静态代码分析工具 (SpotBugs) 与大语言模型 (DeepSeek) 的智能代码审计平台。它旨在通过自动化流程发现代码中的潜在缺陷，并利用 LLM 提供精准的修复建议，从而提高代码质量和安全性。

### 核心流程
1.  **任务提交**: 用户上传或指定目标 Jar 包及源码路径。
2.  **静态分析**: 系统调用 SpotBugs 进行扫描，生成基础报告。
3.  **智能增强**:
    *   **上下文提取**: 自动提取缺陷相关的源码片段。
    *   **RAG 检索**: 从知识库中检索相关的修复模式和最佳实践。
4.  **LLM 审计**: 将增强后的信息发送给 DeepSeek 模型，进行误报判定和修复建议生成。
5.  **结果展示**: 前端展示最终的审计报告，包含缺陷详情、AI 分析依据和修复代码。

## 2. 项目现状 (Current Status)

截至 2026-02-24，前端已完成以下核心功能：

*   **技术栈**: Vue 3 + TypeScript + Vite + Element Plus + Pinia + Axios。
*   **功能模块**:
    *   **任务管理**: 提交任务、查看任务列表、删除任务、取消任务。
    *   **任务详情**: 
        *   **状态轮询**: 自动轮询任务状态 (3秒间隔)。
        *   **缺陷展示**: 左侧 Issue 列表，右侧详细信息（含代码片段高亮）。
        *   **AI 报告**: Markdown 渲染 AI 分析依据 (`aiReasoning`) 和修复建议 (`aiSuggestion`)。
    *   **知识库管理**: 增删改查 (CRUD) 知识条目。
    *   **缓存管理**: 查看和删除系统缓存 (SpotBugs 分析结果缓存)。

## 3. 未来规划 (Roadmap)

前端开发需注意以下预留接口或未来可能变更的功能：

*   **代码获取方式**: 目前仅支持服务器本地路径 (`sourcePath`)。未来将支持 **Git Clone** 功能，前端需预留 Git 仓库地址输入框。
*   **WebSocket 推送**: 目前任务状态需轮询查询。未来计划引入 WebSocket 实现实时进度推送。
*   **用户体系**: 目前无用户权限控制。未来可能添加登录/注册及多租户隔离。
*   **交互式修复**: 未来可能支持在前端直接应用 AI 建议的修复代码 (需后端配合文件写入能力)。

## 4. 接口文档 (API Documentation)

后端服务默认运行在 `http://localhost:8080`。
Swagger UI 地址: `http://localhost:8080/swagger-ui/index.html`

### 4.1 任务管理 (Task Management)

#### 提交分析任务
*   **URL**: `/api/task/submit`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Request Body**:
    ```json
    {
      "targetJar": "/path/to/application.jar",  // 目标 Jar 包绝对路径
      "sourcePath": "/path/to/source/code",     // 源码根目录绝对路径
      "packageFilter": "com.example.-"          // (可选) 包名过滤器
    }
    ```
*   **Response**: `ResultLong` (data 为任务 ID)

#### 查询任务详情
*   **URL**: `/api/task/{taskId}`
*   **Method**: `GET`
*   **Response**: `ResultAnalysisTask` (包含任务状态、参数等基础信息，**不包含** Issue 列表)

#### 查询任务列表
*   **URL**: `/api/task/list`
*   **Method**: `GET`
*   **Response**: `ResultListAnalysisTask`

#### 取消任务
*   **URL**: `/api/task/cancel/{taskId}`
*   **Method**: `POST`

#### 删除任务
*   **URL**: `/api/task/{taskId}`
*   **Method**: `DELETE`

### 4.2 问题管理 (Issue Management)

#### 查询问题详情
*   **URL**: `/api/issue/{id}`
*   **Method**: `GET`
*   **Response**: `ResultAnalysisIssue` (包含 `codeSnippet`, `aiReasoning`, `aiSuggestion` 等详细字段)

#### 根据任务ID查询问题列表
*   **URL**: `/api/issue/list/{taskId}`
*   **Method**: `GET`
*   **Response**: `ResultListAnalysisIssue`

### 4.3 缓存管理 (Cache Management)

#### 查询所有缓存列表
*   **URL**: `/api/cache/list`
*   **Method**: `GET`
*   **Response**: `ResultListAnalysisCache`

#### 删除缓存
*   **URL**: `/api/cache/{id}`
*   **Method**: `DELETE`

### 4.4 知识库管理 (Knowledge Base)

#### 获取知识列表
*   **URL**: `/api/knowledge/list`
*   **Method**: `GET`
*   **Response**: `ResultListKnowledge`

#### 添加知识
*   **URL**: `/api/knowledge/add`
*   **Method**: `POST`
*   **Request Body**: `{"title": "...", "content": "..."}`

#### 更新知识
*   **URL**: `/api/knowledge/update/{id}`
*   **Method**: `PUT`
*   **Request Body**: `{"title": "...", "content": "..."}`

#### 删除知识
*   **URL**: `/api/knowledge/delete/{id}`
*   **Method**: `DELETE`

## 5. 数据字典 (Data Dictionary)

### 任务状态 (TaskStatus)
| 状态码 | 描述 | 含义 |
| :--- | :--- | :--- |
| 0 | SUBMITTED | 已提交，等待调度 |
| 1 | WAITING_ANALYSIS | 等待静态分析 |
| 2 | ANALYZING | 正在进行静态分析 |
| 3 | WAITING_LLM | 等待 LLM 审计 |
| 4 | JUDGING | LLM 正在审计中 |
| 5 | COMPLETED | 完成 |
| -1 | FAILED | 失败 |
| -2 | CANCELLED | 已取消 |

## 6. 开发建议

1.  **轮询策略**: 在任务详情页，目前采用 `Promise.all` 并行请求任务详情 (`/api/task/{id}`) 和问题列表 (`/api/issue/list/{taskId}`)。建议每 3-5 秒轮询一次，直到状态变为终止状态。
2.  **Markdown 渲染**: Issue 详情中的 `aiReasoning` (分析依据) 和 `aiSuggestion` (修复建议) 字段为 Markdown 格式。`codeSnippet` 为纯文本代码，建议手动包裹在 Markdown 代码块中渲染。
3.  **大文件处理**: 目前文件路径为服务器本地路径，前端仅需传递字符串。
