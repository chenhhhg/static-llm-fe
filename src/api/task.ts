import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export interface FileAnalysisRequest {
  targetJar: string
  sourcePath: string
  packageFilter?: string
}

export interface TaskParams {
  targetJar?: string
  sourcePath?: string
  packageFilter?: string
  [key: string]: any
}

export interface AnalysisTask {
  id: number
  taskParams: TaskParams
  toolName: string
  llmModel: string
  status: 'SUBMITTED' | 'DOWNLOADING' | 'WAITING_ANALYSIS' | 'ANALYZING' | 'WAITING_LLM' | 'JUDGING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  resultSummary: string
  createdTime: string
  updatedTime: string
  // Keeping issues as optional, though not explicitly in schema, it's needed for detail view
  issues?: Issue[]
}

export interface Issue {
  type: string
  priority: string
  category: string
  message: string
  startLine: number
  endLine: number
  sourceFile: string
  aiReasoning?: string
  aiSuggestion?: string
}

export interface ResultVoid {
  code: number
  message: string
  data?: any
}

export interface ResultLong {
  code: number
  message: string
  data: number
}

export interface ResultAnalysisTask {
  code: number
  message: string
  data: AnalysisTask
}

export interface ResultListAnalysisTask {
  code: number
  message: string
  data: AnalysisTask[]
}

export const submitTask = (data: FileAnalysisRequest) => {
  return api.post<ResultLong>('/task/submit', data)
}

export const getTaskList = () => {
  return api.get<ResultListAnalysisTask>('/task/list')
}

export const getTaskDetail = (id: number) => {
  return api.get<ResultAnalysisTask>(`/task/${id}`)
}

export const cancelTask = (id: number) => {
  return api.post<ResultVoid>(`/task/cancel/${id}`)
}

export const deleteTask = (id: number) => {
  return api.delete<ResultVoid>(`/task/${id}`)
}
