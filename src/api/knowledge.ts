import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export interface KnowledgeRequest {
  title: string
  content: string
}

export interface Knowledge {
  id: number
  title: string
  content: string
  createdTime: string
  updatedTime: string
}

export interface ResultVoid {
  code: number
  message: string
  data?: any
}

export interface ResultKnowledge {
  code: number
  message: string
  data: Knowledge
}

export interface ResultListKnowledge {
  code: number
  message: string
  data: Knowledge[]
}

export const getKnowledgeList = () => {
  return api.get<ResultListKnowledge>('/knowledge/list')
}

export const getKnowledge = (id: number) => {
  return api.get<ResultKnowledge>(`/knowledge/${id}`)
}

export const addKnowledge = (data: KnowledgeRequest) => {
  return api.post<ResultVoid>('/knowledge/add', data)
}

export const updateKnowledge = (id: number, data: KnowledgeRequest) => {
  return api.put<ResultVoid>(`/knowledge/update/${id}`, data)
}

export const deleteKnowledge = (id: number) => {
  return api.delete<ResultVoid>(`/knowledge/delete/${id}`)
}
