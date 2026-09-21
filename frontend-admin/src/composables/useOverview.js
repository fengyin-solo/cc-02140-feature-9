import { computed } from 'vue'
import dayjs from 'dayjs'
import { useOverviewStore } from '@/stores/overview'
import { useBookStore } from '@/stores/book'
import { useBorrowStore } from '@/stores/borrow'
import { useCategoryStore } from '@/stores/category'

// 借阅状态选项 —— 概览与借阅记录共用，保证口径一致
export const STATUS_OPTIONS = [
  { value: 'borrowed', label: '借阅中' },
  { value: 'returned', label: '已归还' },
  { value: 'overdue', label: '已逾期' }
]

export const STATUS_TEXT = {
  borrowed: '借阅中',
  returned: '已归还',
  overdue: '已逾期'
}

// 逾期天数分桶 —— 概览分布与借阅页钻取共用同一套定义
export const OVERDUE_BUCKETS = [
  { key: '1-7', label: '逾期 1-7 天', min: 1, max: 7, color: '#faad14' },
  { key: '8-30', label: '逾期 8-30 天', min: 8, max: 30, color: '#fa8c16' },
  { key: '31-90', label: '逾期 31-90 天', min: 31, max: 90, color: '#fa541c' },
  { key: '90+', label: '逾期 90 天以上', min: 91, max: Infinity, color: '#ff4d4f' }
]

export function getOverdueDays(record) {
  if (!record.dueDate) return 0
  // 已归还按归还日截止，未归还按今天
  const end = record.returnDate ? dayjs(record.returnDate) : dayjs()
  const days = end.startOf('day').diff(dayjs(record.dueDate).startOf('day'), 'day')
  return days > 0 ? days : 0
}

export function getBucketKey(record) {
  const days = getOverdueDays(record)
  const bucket = OVERDUE_BUCKETS.find(b => days >= b.min && days <= b.max)
  return bucket ? bucket.key : null
}

/**
 * 概览/借阅页统一口径：
 * 分类、借阅状态、统计区间（按借阅日期）、关键词同时作用于
 * 最近借阅、热门图书、逾期分布与借阅明细，保证卡片与明细一一对应。
 */
export function useOverview() {
  const overviewStore = useOverviewStore()
  const bookStore = useBookStore()
  const borrowStore = useBorrowStore()
  const categoryStore = useCategoryStore()

  // 区间是否反向（开始晚于结束）
  const isRangeReversed = computed(() => {
    const range = overviewStore.dateRange
    return !!(range && range.length === 2 && dayjs(range[0]).isAfter(dayjs(range[1])))
  })

  const selectedCategory = computed(() =>
    categoryStore.getCategoryById(overviewStore.categoryId)
  )
  // 筛选中的分类已被删除（localStorage 残留或跨页删除）
  const isCategoryMissing = computed(() => overviewStore.categoryId != null && !selectedCategory.value)

  const hasFilters = computed(() =>
    !!(overviewStore.keyword || overviewStore.categoryId != null || overviewStore.status || overviewStore.dateRange)
  )

  // 有效区间（反向时视为无效，不按日期过滤，仅提示）
  const effectiveRange = computed(() => {
    const range = overviewStore.dateRange
    if (!range || range.length !== 2 || isRangeReversed.value) return null
    return range
  })

  function matchKeyword(text, keyword) {
    return String(text || '').toLowerCase().includes(keyword.toLowerCase())
  }

  // 图书侧口径：分类 + 关键词（书名/作者/ISBN）
  const scopedBooks = computed(() => {
    let result = bookStore.books

    if (overviewStore.categoryId != null) {
      result = result.filter(b => b.categoryId === overviewStore.categoryId)
    }

    if (overviewStore.keyword) {
      const kw = overviewStore.keyword
      result = result.filter(b =>
        matchKeyword(b.title, kw) ||
        matchKeyword(b.author, kw) ||
        matchKeyword(b.isbn, kw)
      )
    }

    return result
  })

  // 借阅记录侧口径：分类（经图书关联）+ 状态 + 借阅日期区间 + 关键词
  const scopedRecords = computed(() => {
    let result = borrowStore.records

    if (overviewStore.categoryId != null) {
      result = result.filter(r => {
        const book = bookStore.getBookById(r.bookId)
        return book ? book.categoryId === overviewStore.categoryId : false
      })
    }

    if (overviewStore.status) {
      result = result.filter(r => r.status === overviewStore.status)
    }

    const range = effectiveRange.value
    if (range) {
      result = result.filter(r => r.borrowDate >= range[0] && r.borrowDate <= range[1])
    }

    if (overviewStore.keyword) {
      const kw = overviewStore.keyword
      result = result.filter(r =>
        matchKeyword(r.readerName, kw) ||
        matchKeyword(r.bookTitle, kw) ||
        matchKeyword(r.cardNo, kw)
      )
    }

    return result
  })

  // 最近借阅：当前口径下按借阅日期倒序前 5
  const recentBorrows = computed(() =>
    [...scopedRecords.value]
      .sort((a, b) => dayjs(b.borrowDate).valueOf() - dayjs(a.borrowDate).valueOf())
      .slice(0, 5)
  )

  // 热门图书：当前口径下按被借阅次数排序（并列按书名稳定），取前 8，卡片展示前 4
  const hotBooks = computed(() => {
    const counts = new Map()
    for (const r of scopedRecords.value) {
      if (r.bookId != null) counts.set(r.bookId, (counts.get(r.bookId) || 0) + 1)
    }
    return scopedBooks.value
      .map(book => ({ ...book, borrowCount: counts.get(book.id) || 0 }))
      .sort((a, b) => b.borrowCount - a.borrowCount || a.id - b.id)
      .slice(0, 8)
  })

  // 逾期分布：在当前口径基础上取逾期记录分桶
  const overdueRecords = computed(() => scopedRecords.value.filter(r => r.status === 'overdue'))

  const overdueBuckets = computed(() =>
    OVERDUE_BUCKETS.map(bucket => ({
      ...bucket,
      records: overdueRecords.value.filter(r => getBucketKey(r) === bucket.key)
    })).map(bucket => ({ ...bucket, count: bucket.records.length }))
  )

  const totalOverdueInScope = computed(() => overdueRecords.value.length)

  const scopeSummary = computed(() => ({
    records: scopedRecords.value.length,
    books: scopedBooks.value.length,
    overdue: overdueRecords.value.length
  }))

  function resetFilters() {
    overviewStore.keyword = ''
    overviewStore.categoryId = null
    overviewStore.status = null
    overviewStore.dateRange = null
    overviewStore.lastDrill = null
  }

  // 区间双向绑定：store 存字符串数组，a-range-picker 用 dayjs 对象
  const rangeModel = computed({
    get() {
      const range = overviewStore.dateRange
      return range && range.length === 2 ? [dayjs(range[0]), dayjs(range[1])] : null
    },
    set(val) {
      overviewStore.dateRange = val && val.length === 2
        ? [val[0].format('YYYY-MM-DD'), val[1].format('YYYY-MM-DD')]
        : null
    }
  })

  // 生成跳转到借阅明细的 query，携带当前口径与定位信息
  function buildBorrowQuery({ section = 'all', recordId = null, bucket = null } = {}) {
    const query = { from: 'overview', section }
    if (overviewStore.keyword) query.keyword = overviewStore.keyword
    if (overviewStore.categoryId != null) query.categoryId = String(overviewStore.categoryId)
    if (overviewStore.status) query.status = overviewStore.status
    const range = effectiveRange.value
    if (range) {
      query.startDate = range[0]
      query.endDate = range[1]
    }
    if (bucket) query.bucket = bucket
    if (recordId != null) query.recordId = String(recordId)
    return query
  }

  return {
    overviewStore,
    STATUS_OPTIONS,
    isRangeReversed,
    selectedCategory,
    isCategoryMissing,
    hasFilters,
    scopedBooks,
    scopedRecords,
    recentBorrows,
    hotBooks,
    overdueRecords,
    overdueBuckets,
    totalOverdueInScope,
    scopeSummary,
    resetFilters,
    buildBorrowQuery,
    rangeModel
  }
}
