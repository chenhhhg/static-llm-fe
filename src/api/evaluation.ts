import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

export interface EvaluateRequest {
  taskId: number
  benchmarkType?: string
  benchmarkPath: string
}

export interface EvaluationReport {
  tpCount: number
  fpCount: number
  fnCount: number
  tnCount: number
  precision: number
  recall: number
  f1Score: number
  benchmarkScore: number
}

export interface ResultEvaluationReport {
  code: number
  message: string
  data: EvaluationReport
}

export const evaluate = (request: EvaluateRequest) => {
  return api.post<ResultEvaluationReport>('/evaluation/evaluate', request)
}
