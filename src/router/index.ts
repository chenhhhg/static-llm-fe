import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/submit',
      name: 'submit',
      component: () => import('../views/TaskSubmit.vue')
    },
    {
      path: '/task/:id',
      name: 'task-detail',
      component: () => import('../views/TaskDetail.vue')
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: () => import('../views/Knowledge.vue')
    },
    {
      path: '/cache',
      name: 'cache',
      component: () => import('../views/CacheList.vue')
    }
  ]
})

export default router
