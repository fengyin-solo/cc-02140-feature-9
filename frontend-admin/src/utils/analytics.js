import dayjs from 'dayjs'

// ========================================
// 运营概览 / 借阅明细 共享口径
// 所有统计卡片、明细列表、选中项与钻取参数都必须经过这里的同一套过滤逻辑，
// 避免“卡片一个数、明细另一组数”。
// ========================================

export const BORROW_STATUS_OPTIONS = [
  { value: 'borrowed', label: '借阅中' },
  { value: 'returned', label: '已归还' },
  { value: 'overdue', label: '已逾期' }
]

export function getStatusText(status) {
  const found = BORROW_STATUS_OPTIONS.find(item => item.value === status)
  return found ? found.label : status
}

export function getStatusColor(status) {
  const colors = {
    borrowed: 'processing',
    returned: 'success',
    overdue: 'error'
  }
  return colors[status] || 'default'
}

// 将 dayjs / 字符串 / null 统一成 ['YYYY-MM-DD', 'YYYY-MM-DD']，保持用户选择顺序
export function normalizeDateRange(range) {
  if (!range || range.length !== 2 || !range[0] || !range[1]) return null
  const start = dayjs(range[0]).format('YYYY-MM-DD')
  const end = dayjs(range[1]).format('YYYY-MM-DD')
  if (!start || !end || start === 'Invalid Date' || end === 'Invalid Date') return null
  return [start, end]
}

export function isRangeReversed(range) {
  const normalized = normalizeDateRange(range)
  return !!normalized && normalized[0] > normalized[1]
}

function recordMatches(record, keyword) {
  return (
    (record.readerName || '').toLowerCase().includes(keyword) ||
    (record.bookTitle || '').toLowerCase().includes(keyword) ||
    (record.cardNo || '').toLowerCase().includes(keyword) ||
    (record.isbn || '').toLowerCase().includes(keyword)
  )
}

/**
 * 按统一口径过滤借阅记录
 * @param {Array} records 借阅记录
 * @param {Object} filters { keyword, categoryId, status, dateRange, bookId }
 * @param {Object} options { getBook(id), checkCategory(id) }
 * @returns {{ items: Array, reversed: boolean, categoryMissing: boolean, range: Array|null }}
 */
export function analyzeRecords(records, filters = {}, options = {}) {
  const { getBook = null, checkCategory = null } = options
  const keyword = (filters.keyword || '').trim().toLowerCase()
  const categoryId = filters.categoryId == null ? null : Number(filters.categoryId)
  const status = filters.status || null
  const bookId = filters.bookId == null ? null : Number(filters.bookId)
  const range = normalizeDateRange(filters.dateRange)

  // 日期反向：保留区间值，由调用方展示专门空态（不自动交换、不清空）
  const reversed = !!range && range[0] > range[1]
  if (reversed) {
    return { items: [], reversed: true, categoryMissing: false, range }
  }

  // 分类被删除：保留已选分类 id，由调用方展示专门空态
  const categoryMissing = categoryId != null && checkCategory ? !checkCategory(categoryId) : false
  if (categoryMissing) {
    return { items: [], reversed: false, categoryMissing: true, range }
  }

  let items = records

  if (keyword) {
    items = items.filter(record => recordMatches(record, keyword))
  }
  if (status) {
    items = items.filter(record => record.status === status)
  }
  if (range) {
    const [start, end] = range
    items = items.filter(record => record.borrowDate >= start && record.borrowDate <= end)
  }
  if (categoryId != null && getBook) {
    items = items.filter(record => {
      const book = getBook(record.bookId)
      return book ? book.categoryId === categoryId : false
    })
  }
  // 钻取到某本图书的明细时，明细表必须与卡片计数完全一致
  if (bookId != null) {
    items = items.filter(record => record.bookId === bookId)
  }

  return { items, reversed: false, categoryMissing: false, range }
}

/**
 * 热门图书：以同一口径下的借阅记录聚合，按借阅次数倒序
 * @returns Array<{ book, count, records }>
 */
export function buildHotBooks(scopedRecords, books) {
  const grouped = new Map()
  scopedRecords.forEach(record => {
    if (!grouped.has(record.bookId)) {
      grouped.set(record.bookId, { count: 0, records: [] })
    }
    const group = grouped.get(record.bookId)
    group.count += 1
    group.records.push(record)
  })

  const result = []
  grouped.forEach((group, id) => {
    const book = books.find(item => item.id === id)
    // 图书已被删除时无法展示卡片；该组不属于任何现存卡片，不影响其他卡片口径
    if (book) {
      result.push({ book, count: group.count, records: group.records })
    }
  })

  return result.sort((a, b) => b.count - a.count || a.book.id - b.book.id)
}

export function getOverdueDays(record, now = dayjs()) {
  if (!record.dueDate) return 0
  return Math.max(0, now.startOf('day').diff(dayjs(record.dueDate).startOf('day'), 'day'))
}

/**
 * 逾期分布：强制「已逾期」口径，其余筛选（分类/区间/关键字）与概览一致
 * @returns Array<{ categoryId, name, missing, count, maxDays, records }>
 */
export function buildOverdueDistribution(records, filters = {}, options = {}) {
  const { getBook = null, getCategory = null } = options
  const { items } = analyzeRecords(
    records,
    { ...filters, status: 'overdue' },
    { getBook, checkCategory: getCategory ? id => !!getCategory(id) : null }
  )

  const groups = new Map()
  items.forEach(record => {
    const book = getBook ? getBook(record.bookId) : null
    const key = book && book.categoryId != null ? book.categoryId : 'none'
    if (!groups.has(key)) {
      groups.set(key, { records: [], maxDays: 0 })
    }
    const group = groups.get(key)
    group.records.push(record)
    group.maxDays = Math.max(group.maxDays, getOverdueDays(record))
  })

  const rows = []
  groups.forEach((group, key) => {
    if (key === 'none') {
      rows.push({
        categoryId: null,
        name: '未分类',
        missing: false,
        count: group.records.length,
        maxDays: group.maxDays,
        records: group.records
      })
    } else {
      const category = getCategory ? getCategory(key) : null
      rows.push({
        categoryId: key,
        name: category ? category.name : '已删除分类',
        missing: !category,
        count: group.records.length,
        maxDays: group.maxDays,
        records: group.records
      })
    }
  })

  return rows.sort((a, b) => b.count - a.count || (a.categoryId || 0) - (b.categoryId || 0))
}

// 概览 / 明细页头部的口径说明 chips
export function buildScopeChips(filters = {}, options = {}) {
  const { getCategory = null } = options
  const chips = []
  const range = normalizeDateRange(filters.dateRange)

  if (filters.keyword) {
    chips.push({ key: 'keyword', label: `关键字：${filters.keyword}` })
  }
  if (filters.categoryId != null) {
    const category = getCategory ? getCategory(filters.categoryId) : null
    chips.push({
      key: 'category',
      label: category ? `分类：${category.name}` : `分类已删除（ID: ${filters.categoryId}）`,
      danger: !category
    })
  }
  if (filters.status) {
    chips.push({ key: 'status', label: `状态：${getStatusText(filters.status)}` })
  }
  if (range) {
    const reversed = range[0] > range[1]
    chips.push({
      key: 'dateRange',
      label: `区间：${range[0]} ~ ${range[1]}${reversed ? '（反向）' : ''}`,
      danger: reversed
    })
  }
  return chips
}
