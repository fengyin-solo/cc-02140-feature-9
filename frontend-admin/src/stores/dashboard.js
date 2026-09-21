import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import dayjs from 'dayjs'

// ========================================
// 运营概览定位 / 钻取状态
// - 概览筛选与选中项持久化：钻取到明细页再「返回概览」时保留上次定位
// - 借阅明细页筛选与定位目标持久化：从菜单进入时恢复上次查看口径
// - 从概览钻取时以 query 参数显式覆盖明细页口径
// ========================================

const OVERVIEW_KEY = 'library_dashboard_overview'
const BORROW_KEY = 'library_borrow_filters'

function loadState(key, fallback) {
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      return { ...fallback, ...JSON.parse(stored) }
    } catch (e) {
      console.error(`Failed to parse ${key}:`, e)
    }
  }
  return { ...fallback }
}

// 概览默认口径：全部数据
const defaultOverview = () => ({
  keyword: '',
  categoryId: null,
  status: null,
  dateRange: null, // 始终以 ['YYYY-MM-DD', 'YYYY-MM-DD'] 字符串存储（含反向区间）
  selectedBookId: null,
  selectedRecordId: null,
  selectedOverdueCategoryId: null
})

// 借阅明细页默认口径
const defaultBorrow = () => ({
  keyword: '',
  categoryId: null,
  status: null,
  dateRange: null,
  bookId: null,
  locateRecordId: null,
  currentPage: 1
})

export const useDashboardStore = defineStore('dashboard', () => {
  const overview = ref(loadState(OVERVIEW_KEY, defaultOverview()))
  const borrow = ref(loadState(BORROW_KEY, defaultBorrow()))

  watch(overview, value => {
    localStorage.setItem(OVERVIEW_KEY, JSON.stringify(value))
  }, { deep: true })

  watch(borrow, value => {
    localStorage.setItem(BORROW_KEY, JSON.stringify(value))
  }, { deep: true })

  // ---------------- 概览 ----------------
  function setOverviewFilter(patch) {
    Object.assign(overview.value, patch)
  }

  function resetOverview() {
    const selected = {
      selectedBookId: overview.value.selectedBookId,
      selectedRecordId: overview.value.selectedRecordId,
      selectedOverdueCategoryId: overview.value.selectedOverdueCategoryId
    }
    overview.value = { ...defaultOverview(), ...selected }
  }

  function selectBook(bookId) {
    overview.value.selectedBookId = overview.value.selectedBookId === bookId ? null : bookId
  }

  function selectRecord(recordId) {
    overview.value.selectedRecordId = overview.value.selectedRecordId === recordId ? null : recordId
  }

  function selectOverdueCategory(categoryId) {
    overview.value.selectedOverdueCategoryId =
      overview.value.selectedOverdueCategoryId === categoryId ? null : categoryId
  }

  // ---------------- 借阅明细页 ----------------
  function setBorrowFilter(patch) {
    Object.assign(borrow.value, patch)
  }

  function resetBorrow() {
    borrow.value = defaultBorrow()
  }

  /**
   * 应用钻取参数（来自路由 query）
   * - scope=global（全局统计卡）：只使用 query 中显式给出的条件，不继承概览口径
   * - 其余（概览卡/明细钻取）：query 未覆盖的字段继承概览当前口径，保证卡片与明细同一口径
   */
  function applyBorrowDrillQuery(query, overviewFilters = {}) {
    const isGlobal = query.scope === 'global'
    const base = isGlobal ? {} : overviewFilters
    const next = {
      keyword: query.keyword ?? base.keyword ?? '',
      categoryId: parseId(query.categoryId, base.categoryId ?? null),
      status: query.status ?? base.status ?? null,
      dateRange: parseRange(query.dateRange, base.dateRange ?? null),
      bookId: parseId(query.bookId, null),
      locateRecordId: parseId(query.locateRecordId, null),
      currentPage: 1
    }
    borrow.value = next
    return next
  }

  return {
    overview,
    borrow,
    setOverviewFilter,
    resetOverview,
    selectBook,
    selectRecord,
    selectOverdueCategory,
    setBorrowFilter,
    resetBorrow,
    applyBorrowDrillQuery
  }
})

function parseId(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function parseRange(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  // 路由数组可能来自同一个 dateRange 参数
  const parts = Array.isArray(value) ? value : String(value).split(',')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return fallback
  const valid = parts.every(part => dayjs(part).format('YYYY-MM-DD') !== 'Invalid Date')
  return valid ? [parts[0], parts[1]] : fallback
}
