import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export interface Issue {
  id: number
  taskId: number
  toolName: string
  ruleId: string
  severity: string
  filePath: string
  startLine: number
  endLine: number
  message: string
  codeSnippet: string
  isFalsePositive: boolean
  aiReasoning?: string
  aiSuggestion?: string
  createdTime: string
  updatedTime: string
}

export interface IssueFilter {
  severity?: string
  keyword?: string
  isFalsePositive?: boolean | null
}

export interface ResultAnalysisIssue {
  code: number
  message: string
  data: Issue
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface ResultPageAnalysisIssue {
  code: number
  message: string
  data: PageResult<Issue>
}

export interface ResultListAnalysisIssue {
  code: number
  message: string
  data: Issue[]
}

export const getIssue = (id: number) => {
  return api.get<ResultAnalysisIssue>(`/issue/${id}`)
}

export const getIssuesByTaskId = (taskId: number, page: number = 1, size: number = 10, filter?: IssueFilter) => {
  return api.get<ResultPageAnalysisIssue>(`/issue/list/${taskId}`, {
    params: {
      page,
      size,
      ...filter
    }
  })
}
