import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export interface AnalysisCache {
  id: number
  cacheKey: string
  toolName: string
  createdTime: string
}

export interface ResultVoid {
  code: number
  message: string
  data?: any
}

export interface ResultListAnalysisCache {
  code: number
  message: string
  data: AnalysisCache[]
}

export const getCacheList = () => {
  return api.get<ResultListAnalysisCache>('/cache/list')
}

export const deleteCache = (id: number) => {
  return api.delete<ResultVoid>(`/cache/${id}`)
}
