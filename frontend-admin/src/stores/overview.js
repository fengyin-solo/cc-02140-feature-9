import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'library_overview_filters'

// 概览的筛选与上次定位状态，独立于各业务 store，
// 切换页面（返回概览）或刷新后仍可恢复上次口径。
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch (e) {
    return {}
  }
}

export const useOverviewStore = defineStore('overview', () => {
  const saved = loadState()

  const keyword = ref(saved.keyword ?? '')
  const categoryId = ref(saved.categoryId ?? null)
  const status = ref(saved.status ?? null)
  // 统一存成 ['YYYY-MM-DD', 'YYYY-MM-DD']，便于序列化与跨页面对齐
  const dateRange = ref(Array.isArray(saved.dateRange) ? saved.dateRange : null)
  // 最近一次钻取定位：{ section, key }，返回概览时用于滚动与高亮
  const lastDrill = ref(saved.lastDrill ?? null)

  watch(
    [keyword, categoryId, status, dateRange, lastDrill],
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          keyword: keyword.value,
          categoryId: categoryId.value,
          status: status.value,
          dateRange: dateRange.value,
          lastDrill: lastDrill.value
        })
      )
    },
    { deep: true }
  )

  return {
    keyword,
    categoryId,
    status,
    dateRange,
    lastDrill
  }
})
