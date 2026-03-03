import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

// ========== Request Types ==========

export interface EvaluateRequest {
  taskId: number
  benchmarkType?: string
  benchmarkPath: string
  aiOnly?: boolean
}

export interface AiMisjudgmentRequest {
  taskId: number
  benchmarkType?: string
  benchmarkPath: string
}

// ========== Response Data Types ==========

/** Category-level statistics (for evaluate response) */
export interface CategoryStat {
  tp: number
  fp: number
  fn: number
  tn: number
  recall: number
}

/** Evaluation report returned by POST /evaluation/evaluate */
export interface EvaluationReport {
  recordId: number
  tpCount: number
  fpCount: number
  fnCount: number
  tnCount: number
  precision: number
  recall: number
  f1Score: number
  benchmarkScore: number
  details?: EvalDetailItem[]
  categoryStats?: Record<string, CategoryStat>
}

/** Misjudgment detail item (used in both misjudgment response and detail query) */
export interface Misjudgment {
  issueId: number
  filePath: string
  ruleId: string
  normalizedCategory: string
  benchmarkTestName: string
  benchmarkIsReal: boolean
  aiIsFalsePositive: boolean
  aiReasoning: string
  aiCorrect: boolean
  errorType: string | null
}

/** AI misjudgment report returned by POST /evaluation/ai-misjudgments */
export interface AiMisjudgmentReport {
  recordId: number
  totalAnalyzed: number
  matchedCount: number
  correctCount: number
  wrongCount: number
  accuracy: number
  misjudgments: Misjudgment[]
  allDetails: Misjudgment[]
}

/** Evaluation mode enum */
export type EvalMode = 'FULL' | 'AI_ONLY' | 'AI_MISJUDGMENT'

/** Evaluation record (from GET /evaluation/records) */
export interface EvalRecord {
  id: number
  taskId: number
  benchmarkType: string
  benchmarkPath: string
  evalMode: EvalMode
  // FULL / AI_ONLY metrics
  tpCount: number | null
  fpCount: number | null
  fnCount: number | null
  tnCount: number | null
  precisionRate: number | null
  recallRate: number | null
  f1Score: number | null
  benchmarkScore: number | null
  // AI_MISJUDGMENT metrics
  totalAnalyzed: number | null
  matchedCount: number | null
  correctCount: number | null
  wrongCount: number | null
  accuracy: number | null
  createdTime: string
  updatedTime: string
}

/** Evaluation detail item (from GET /evaluation/records/{recordId}/details) */
export interface EvalDetailItem {
  id: number
  recordId: number
  issueId: number | null
  filePath: string
  ruleId: string | null
  normalizedCategory: string | null
  benchmarkTestName: string
  benchmarkCategory: string | null
  benchmarkIsReal: boolean
  matchStatus: string | null  // TP/FP/FN/TN (FULL/AI_ONLY)
  aiIsFalsePositive: boolean | null
  aiReasoning: string | null
  aiCorrect: boolean | null
  errorType: string | null
  detailInfo: string | null
  createdTime: string
}

// ========== Unified Response Wrappers ==========

export interface Result<T> {
  code: number
  message: string
  data: T
}

export type ResultEvaluationReport = Result<EvaluationReport>
export type ResultAiMisjudgmentReport = Result<AiMisjudgmentReport>
export type ResultEvalRecordList = Result<EvalRecord[]>
export type ResultEvalRecord = Result<EvalRecord>
export type ResultEvalDetailList = Result<EvalDetailItem[]>

// ========== API Functions ==========

/** Execute benchmark evaluation */
export const evaluate = (request: EvaluateRequest) => {
  return api.post<ResultEvaluationReport>('/evaluation/evaluate', request)
}

/** Execute AI misjudgment analysis */
export const getAiMisjudgments = (request: AiMisjudgmentRequest) => {
  return api.post<ResultAiMisjudgmentReport>('/evaluation/ai-misjudgments', request)
}

/** Get evaluation history list (optionally filter by taskId) */
export const getEvalRecords = (taskId?: number) => {
  const params = taskId != null ? { taskId } : {}
  return api.get<ResultEvalRecordList>('/evaluation/records', { params })
}

/** Get single evaluation record detail */
export const getEvalRecord = (recordId: number) => {
  return api.get<ResultEvalRecord>(`/evaluation/records/${recordId}`)
}

/** Get evaluation detail items (optionally filter only wrong ones) */
export const getEvalRecordDetails = (recordId: number, onlyWrong?: boolean) => {
  const params: Record<string, any> = {}
  if (onlyWrong != null) params.onlyWrong = onlyWrong
  return api.get<ResultEvalDetailList>(`/evaluation/records/${recordId}/details`, { params })
}
