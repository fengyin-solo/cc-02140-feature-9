<template>
  <div class="borrow-list">
    <h2 class="page-title">借阅管理</h2>

    <!-- 钻取口径横幅：来自概览时展示同口径条件，可返回概览（保留上次定位） -->
    <transition name="fade-slide">
      <div v-if="hasDrillQuery" class="drill-banner">
        <div class="drill-banner-left">
          <AimOutlined class="drill-icon" />
          <span class="drill-text">从运营概览定位到借阅明细，当前口径：</span>
          <a-space :size="6" wrap>
            <a-tag v-for="chip in drillChips" :key="chip.key" :color="chip.danger ? 'error' : 'processing'">
              {{ chip.label }}
            </a-tag>
            <a-tag v-if="lockedBook" color="red" closable @close="clearBookLock">
              图书：{{ lockedBook.title }}
            </a-tag>
          </a-space>
        </div>
        <a-space>
          <a-button size="small" @click="clearDrillScope">
            <ReloadOutlined /> 清除钻取条件
          </a-button>
          <a-button type="primary" size="small" @click="backToDashboard">
            <RollbackOutlined /> 返回概览
          </a-button>
        </a-space>
      </div>
    </transition>

    <!-- 统计卡片 - 与明细表格同一口径 -->
    <a-row :gutter="[16, 16]" class="stat-row">
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich total">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <DatabaseOutlined />
            </div>
            <div class="stat-card-trend up">
              <RiseOutlined />
              <span>{{ todayBorrowCount }}</span>
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ filteredRecords.length }}</div>
            <div class="stat-card-label">总记录</div>
          </div>
          <div class="stat-card-footer">
            <span>今日新增 {{ todayBorrowCount }} 条</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich borrowed">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <BookOutlined />
            </div>
            <div class="stat-card-badge">
              <ClockCircleOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ filteredTotalBorrowed }}</div>
            <div class="stat-card-label">借阅中</div>
          </div>
          <div class="stat-card-footer">
            <a-progress
              :percent="borrowedPercent"
              :show-info="false"
              stroke-color="#1890ff"
              size="small"
            />
            <span>占比 {{ borrowedPercent }}%</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich returned">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <CheckCircleOutlined />
            </div>
            <div class="stat-card-badge success">
              <SmileOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ returnedCount }}</div>
            <div class="stat-card-label">已归还</div>
          </div>
          <div class="stat-card-footer">
            <a-progress
              :percent="returnedPercent"
              :show-info="false"
              stroke-color="#52c41a"
              size="small"
            />
            <span>归还率 {{ returnedPercent }}%</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich overdue">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <ExclamationCircleOutlined />
            </div>
            <div class="stat-card-badge warning" v-if="filteredTotalOverdue > 0">
              <WarningOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ filteredTotalOverdue }}</div>
            <div class="stat-card-label">已逾期</div>
          </div>
          <div class="stat-card-footer">
            <span v-if="filteredTotalOverdue > 0" class="warning-text">
              <AlertOutlined /> 请及时处理
            </span>
            <span v-else class="success-text">
              <CheckOutlined /> 暂无逾期
            </span>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 搜索区域 -->
    <div class="search-area animate-slide-down">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <div class="search-input-wrapper">
            <a-input
              v-model:value="filters.keyword"
              placeholder="搜索读者、图书、卡号、ISBN"
              allow-clear
              @input="onFilterInput"
              class="search-input"
            >
              <template #suffix>
                <SearchOutlined
                  :class="['search-icon', { 'searching': isSearching }]"
                />
              </template>
            </a-input>
          </div>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="filters.status"
            placeholder="借阅状态"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option value="borrowed">借阅中</a-select-option>
            <a-select-option value="returned">已归还</a-select-option>
            <a-select-option value="overdue">已逾期</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="6" :md="4">
          <a-select
            v-model:value="filters.categoryId"
            placeholder="图书分类"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option
              v-for="cat in categoryStore.categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="24" :md="10" style="text-align: right;">
          <a-button type="primary" @click="showBorrowModal" class="add-btn">
            <PlusOutlined /> 新增借阅
          </a-button>
        </a-col>
      </a-row>
      <a-row :gutter="16" align="middle" style="margin-top: 16px;">
        <a-col :xs="24" :sm="12" :md="10">
          <a-range-picker
            v-model:value="dateRangeModel"
            :placeholder="['开始日期', '结束日期']"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <CalendarOutlined />
            </template>
          </a-range-picker>
        </a-col>
        <a-col :xs="24" :sm="12" :md="14">
          <span class="filter-hint">
            <CalendarOutlined /> 按借阅日期筛选
            <a-tag v-if="dateReversed" color="error" class="range-warn-tag">
              日期反向：开始晚于结束，已保留区间，当前无匹配
            </a-tag>
            <a-tag v-if="categoryMissing" color="error" class="range-warn-tag">
              所选分类已删除，已保留该筛选
            </a-tag>
          </span>
        </a-col>
      </a-row>

      <!-- 搜索结果提示 -->
      <transition name="fade-slide">
        <div v-if="hasFilters" class="search-result-tip">
          <span class="result-count">
            找到 <strong>{{ filteredRecords.length }}</strong> 条结果
          </span>
          <a-button type="link" size="small" @click="clearFilters" class="clear-btn">
            清除筛选
          </a-button>
        </div>
      </transition>
    </div>

    <!-- 借阅表格 -->
    <div :class="['table-container', 'animate-fade-in', { 'table-loading': tableAnimating }]">
      <!-- 加载动画遮罩 -->
      <transition name="fade">
        <div v-if="tableAnimating" class="table-loading-overlay">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <span>搜索中...</span>
          </div>
        </div>
      </transition>

      <a-table
        :columns="columns"
        :data-source="pagedRecords"
        :loading="loading"
        row-key="id"
        :pagination="paginationConfig"
        :row-class-name="getRowClassName"
        :locale="{ emptyText: tableEmpty }"
        :custom-row="record => ({ onClick: () => openRecordDetail(record) })"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'reader'">
            <div class="reader-cell" :style="{ animationDelay: `${index * 0.05}s` }">
              <div class="text-primary">{{ record.readerName }}</div>
              <div class="text-secondary">{{ record.cardNo }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'book'">
            <div class="book-cell">
              <div class="text-primary">{{ record.bookTitle }}</div>
              <div class="text-secondary">{{ record.isbn }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)" :class="['status-tag', record.status]">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                v-if="record.status === 'borrowed' || record.status === 'overdue'"
                type="link"
                size="small"
                class="table-action-btn return-btn"
                @click.stop="handleReturn(record)"
              >
                <CheckOutlined /> 归还
              </a-button>
              <a-button
                v-if="record.status === 'borrowed' && record.renewCount < 2"
                type="link"
                size="small"
                class="table-action-btn renew-btn"
                @click.stop="handleRenew(record)"
              >
                <ReloadOutlined /> 续借
              </a-button>
              <span v-if="record.status === 'returned'" class="completed-text">
                <CheckCircleOutlined /> 已完成
              </span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 借阅明细抽屉 -->
    <a-drawer
      v-model:open="detailVisible"
      title="借阅明细"
      width="420"
      :destroy-on-close="true"
    >
      <template v-if="detailRecord">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="读者">{{ detailRecord.readerName }}</a-descriptions-item>
          <a-descriptions-item label="借书证号">{{ detailRecord.cardNo }}</a-descriptions-item>
          <a-descriptions-item label="图书">{{ detailRecord.bookTitle }}</a-descriptions-item>
          <a-descriptions-item label="ISBN">{{ detailRecord.isbn }}</a-descriptions-item>
          <a-descriptions-item label="借阅日期">{{ detailRecord.borrowDate }}</a-descriptions-item>
          <a-descriptions-item label="应还日期">{{ detailRecord.dueDate }}</a-descriptions-item>
          <a-descriptions-item label="归还日期">
            <span v-if="detailRecord.returnDate">{{ detailRecord.returnDate }}</span>
            <span v-else class="text-secondary">未归还</span>
          </a-descriptions-item>
          <a-descriptions-item label="续借次数">{{ detailRecord.renewCount }}</a-descriptions-item>
          <a-descriptions-item label="逾期天数">
            <a-tag v-if="detailRecord.status === 'overdue'" color="error">
              已逾期 {{ getOverdueDays(detailRecord) }} 天
            </a-tag>
            <span v-else class="text-secondary">未逾期</span>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(detailRecord.status)">
              {{ getStatusText(detailRecord.status) }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
        <div class="detail-actions">
          <a-button
            v-if="detailRecord.status === 'borrowed' || detailRecord.status === 'overdue'"
            type="primary"
            @click="handleReturn(detailRecord)"
          >
            <CheckOutlined /> 办理归还
          </a-button>
          <a-button
            v-if="detailRecord.status === 'borrowed' && detailRecord.renewCount < 2"
            @click="handleRenew(detailRecord)"
          >
            <ReloadOutlined /> 续借 15 天
          </a-button>
        </div>
      </template>
      <ScopeEmpty v-else variant="no-result" entity="明细" compact />
    </a-drawer>

    <!-- 新增借阅弹窗 -->
    <a-modal
      v-model:open="borrowModalVisible"
      title="新增借阅"
      :confirm-loading="submitLoading"
      @ok="handleBorrowSubmit"
      @cancel="handleModalClose"
      width="500px"
    >
      <a-form
        ref="borrowFormRef"
        :model="borrowForm"
        :rules="borrowRules"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="读者" name="readerId">
          <a-select
            v-model:value="borrowForm.readerId"
            placeholder="请选择读者"
            show-search
            :filter-option="filterReader"
          >
            <a-select-option
              v-for="reader in availableReaders"
              :key="reader.id"
              :value="reader.id"
              :label="reader.name"
            >
              {{ reader.name }} ({{ reader.cardNo }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="图书" name="bookId">
          <a-select
            v-model:value="borrowForm.bookId"
            placeholder="请选择图书"
            show-search
            :filter-option="filterBook"
          >
            <a-select-option
              v-for="book in availableBooks"
              :key="book.id"
              :value="book.id"
              :label="book.title"
            >
              {{ book.title }} (库存: {{ book.available }})
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, h, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  CheckOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  SmileOutlined,
  WarningOutlined,
  AlertOutlined,
  SearchOutlined,
  CalendarOutlined,
  AimOutlined,
  RollbackOutlined
} from '@ant-design/icons-vue'
import { useBorrowStore } from '@/stores/borrow'
import { useReaderStore } from '@/stores/reader'
import { useBookStore } from '@/stores/book'
import { useCategoryStore } from '@/stores/category'
import { useDashboardStore } from '@/stores/dashboard'
import ScopeEmpty from '@/components/ScopeEmpty.vue'
import {
  analyzeRecords,
  buildScopeChips,
  getOverdueDays,
  getStatusColor,
  getStatusText,
  normalizeDateRange,
  isRangeReversed
} from '@/utils/analytics'

const route = useRoute()
const router = useRouter()
const borrowStore = useBorrowStore()
const readerStore = useReaderStore()
const bookStore = useBookStore()
const categoryStore = useCategoryStore()
const dashboardStore = useDashboardStore()

const PAGE_SIZE = 10
const loading = ref(false)
const borrowModalVisible = ref(false)
const submitLoading = ref(false)
const borrowFormRef = ref(null)
const isSearching = ref(false)
const tableAnimating = ref(false)
// 当前高亮定位的记录（钻取目标），手动调整筛选后清除高亮
const locatedId = ref(null)
const detailVisible = ref(false)
let searchTimeout = null

// 筛选状态持久化在 dashboard store 中：离开页面再回来仍恢复上次口径
const filters = dashboardStore.borrow

const dateRangeModel = computed({
  get() {
    return filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null
  },
  set(value) {
    dashboardStore.setBorrowFilter({ dateRange: normalizeDateRange(value) })
  }
})

const columns = [
  { title: '读者信息', key: 'reader', width: 160 },
  { title: '图书信息', key: 'book', width: 200 },
  { title: '借阅日期', dataIndex: 'borrowDate', key: 'borrowDate', width: 110 },
  { title: '应还日期', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '归还日期', dataIndex: 'returnDate', key: 'returnDate', width: 110 },
  { title: '续借次数', dataIndex: 'renewCount', key: 'renewCount', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' }
]

const borrowForm = reactive({
  readerId: null,
  bookId: null
})

const borrowRules = {
  readerId: [{ required: true, message: '请选择读者' }],
  bookId: [{ required: true, message: '请选择图书' }]
}

// ---------------- 统一口径过滤 ----------------
const analysis = computed(() =>
  analyzeRecords(
    borrowStore.records,
    {
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
      dateRange: filters.dateRange,
      bookId: filters.bookId
    },
    {
      getBook: id => bookStore.getBookById(id),
      checkCategory: id => !!categoryStore.getCategoryById(id)
    }
  )
)

const filteredRecords = computed(() => analysis.value.items)
const dateReversed = computed(() => isRangeReversed(filters.dateRange))
const categoryMissing = computed(() => analysis.value.categoryMissing)

const lockedBook = computed(() =>
  filters.bookId != null ? bookStore.getBookById(filters.bookId) : null
)

const hasFilters = computed(() => {
  return !!(
    filters.keyword ||
    filters.status ||
    filters.dateRange ||
    filters.categoryId != null ||
    filters.bookId != null
  )
})

const filteredTotalBorrowed = computed(() =>
  filteredRecords.value.filter(r => r.status === 'borrowed').length
)

const filteredTotalOverdue = computed(() =>
  filteredRecords.value.filter(r => r.status === 'overdue').length
)

const returnedCount = computed(() =>
  filteredRecords.value.filter(r => r.status === 'returned').length
)

const todayBorrowCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filteredRecords.value.filter(r => r.borrowDate === today).length
})

const borrowedPercent = computed(() => {
  const total = filteredRecords.value.length
  if (total === 0) return 0
  return Math.round((filteredTotalBorrowed.value / total) * 100)
})

const returnedPercent = computed(() => {
  const total = filteredRecords.value.length
  if (total === 0) return 0
  return Math.round((returnedCount.value / total) * 100)
})

const availableReaders = computed(() =>
  readerStore.readers.filter(r => r.status === 'active' && r.borrowCount < r.maxBorrow)
)

const availableBooks = computed(() => bookStore.books.filter(b => b.available > 0))

// ---------------- 分页与定位 ----------------
const pagedRecords = computed(() => {
  const start = (filters.currentPage - 1) * PAGE_SIZE
  return filteredRecords.value.slice(start, start + PAGE_SIZE)
})

const paginationConfig = computed(() => ({
  current: filters.currentPage,
  pageSize: PAGE_SIZE,
  total: filteredRecords.value.length,
  showTotal: total => `共 ${total} 条`,
  onChange: page => {
    dashboardStore.setBorrowFilter({ currentPage: page })
  }
}))

watch(
  () => [filters.keyword, filters.status, filters.categoryId, filters.dateRange, filters.bookId],
  () => {
    // 筛选口径变化后回到第一页（定位高亮只在用户主动改筛选时清除，见 onFilterInput/handleFilterChange）
    dashboardStore.setBorrowFilter({ currentPage: 1 })
  }
)

function getRowClassName(record) {
  return locatedId.value === record.id ? 'located-row' : ''
}

function locateRecord(id, openDetail = true) {
  const target = borrowStore.getRecordById(id)
  if (!target) return
  const index = filteredRecords.value.findIndex(r => r.id === id)
  if (index === -1) {
    message.warning('该记录不在当前口径下，已保留筛选条件')
    return
  }
  const page = Math.floor(index / PAGE_SIZE) + 1
  dashboardStore.setBorrowFilter({ currentPage: page })
  locatedId.value = id
  nextTick(() => {
    setTimeout(() => {
      const el = document.querySelector('.located-row')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  })
  if (openDetail) {
    detailVisible.value = true
  }
}

// ---------------- 钻取横幅 ----------------
const drillQueryKeys = ['scope', 'keyword', 'categoryId', 'status', 'dateRange', 'bookId', 'locateRecordId']
const hasDrillQuery = computed(() => drillQueryKeys.some(key => route.query[key] !== undefined))

const drillIsGlobal = computed(() => route.query.scope === 'global')

const drillChips = computed(() =>
  buildScopeChips(
    {
      keyword: drillIsGlobal.value ? '' : filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
      dateRange: filters.dateRange
    },
    { getCategory: id => categoryStore.getCategoryById(id) }
  )
)

function clearBookLock() {
  dashboardStore.setBorrowFilter({ bookId: null, currentPage: 1 })
}

function clearDrillScope() {
  dashboardStore.resetBorrow()
  locatedId.value = null
  router.replace({ name: 'Borrow' })
  triggerSearchAnimation()
}

function clearFilters() {
  dashboardStore.resetBorrow()
  locatedId.value = null
  triggerSearchAnimation()
}

function backToDashboard() {
  router.push('/dashboard')
}

// ---------------- 空态区分 ----------------
const emptyVariant = computed(() => {
  if (analysis.value.reversed) return 'reversed'
  if (analysis.value.categoryMissing) return 'missing-category'
  if (borrowStore.records.length === 0) return 'no-data-at-all'
  return 'no-result'
})

const tableEmpty = computed(() =>
  h(ScopeEmpty, {
    variant: emptyVariant.value,
    entity: '借阅记录',
    onClear: () => clearFilters()
  })
)

// ---------------- 筛选交互 ----------------
function onFilterInput() {
  isSearching.value = true
  locatedId.value = null
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    isSearching.value = false
    triggerSearchAnimation()
  }, 300)
}

function handleFilterChange() {
  locatedId.value = null
  triggerSearchAnimation()
}

function triggerSearchAnimation() {
  loading.value = true
  tableAnimating.value = true
  setTimeout(() => {
    tableAnimating.value = false
    loading.value = false
  }, 400)
}

// ---------------- 初始化：钻取 query 覆盖持久化口径 ----------------
onMounted(() => {
  const query = route.query
  const hasQuery = drillQueryKeys.some(key => query[key] !== undefined)

  if (hasQuery) {
    dashboardStore.applyBorrowDrillQuery(query, dashboardStore.overview)
    triggerSearchAnimation()
    const targetId = query.locateRecordId !== undefined ? Number(query.locateRecordId) : null
    if (targetId) {
      // 等待表格按新口径渲染后再翻页定位
      nextTick(() => locateRecord(targetId))
    }
  } else {
    // 菜单进入：恢复上次筛选口径，但不保留一次性的图书锁定与定位目标
    dashboardStore.setBorrowFilter({ bookId: null, locateRecordId: null })
    locatedId.value = null
  }
})

// 行点击：选中并打开借阅明细抽屉（操作按钮已阻止冒泡）
function openRecordDetail(record) {
  locatedId.value = record.id
  detailVisible.value = true
}

// 抽屉明细：直接读取 store 中的最新数据，归还/续借后实时更新
const detailRecord = computed(() =>
  locatedId.value != null ? borrowStore.getRecordById(locatedId.value) : null
)

function filterReader(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function filterBook(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function handleModalClose() {
  nextTick(() => {
    borrowFormRef.value?.resetFields()
  })
}

function showBorrowModal() {
  borrowForm.readerId = null
  borrowForm.bookId = null
  borrowModalVisible.value = true
  nextTick(() => {
    borrowFormRef.value?.clearValidate()
  })
}

async function handleBorrowSubmit() {
  try {
    await borrowFormRef.value.validate()
    submitLoading.value = true

    const reader = readerStore.getReaderById(borrowForm.readerId)
    const book = bookStore.getBookById(borrowForm.bookId)

    if (!reader || !book) {
      message.error('读者或图书信息不存在')
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    borrowStore.addRecord({
      readerId: reader.id,
      readerName: reader.name,
      cardNo: reader.cardNo,
      bookId: book.id,
      bookTitle: book.title,
      isbn: book.isbn
    })

    bookStore.updateBook(book.id, { available: book.available - 1 })
    readerStore.updateReader(reader.id, { borrowCount: reader.borrowCount + 1 })

    message.success('借阅成功')
    borrowModalVisible.value = false
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitLoading.value = false
  }
}

function handleReturn(record) {
  if (!record) return
  borrowStore.returnBook(record.id)

  const book = bookStore.getBookById(record.bookId)
  const reader = readerStore.getReaderById(record.readerId)

  if (book) {
    bookStore.updateBook(book.id, { available: book.available + 1 })
  }
  if (reader) {
    readerStore.updateReader(reader.id, { borrowCount: Math.max(0, reader.borrowCount - 1) })
  }

  message.success('归还成功')
}

function handleRenew(record) {
  if (!record) return
  const success = borrowStore.renewBook(record.id)
  if (success) {
    message.success('续借成功，借阅期限延长15天')
  } else {
    message.error('续借失败，已达到最大续借次数')
  }
}
</script>

<style lang="less" scoped>
.borrow-list {
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 24px;
  }
}

.stat-row {
  margin-bottom: 16px;
}

// 钻取横幅
.drill-banner {
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  border: 1px solid #91caff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  .drill-banner-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .drill-icon {
      color: #1890ff;
      font-size: 16px;
    }

    .drill-text {
      font-size: 13px;
      color: #1a1a1a;
    }
  }
}

.stat-card-rich {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  height: 100%;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    background: #f0f7ff;
  }

  &.total {
    border-left-color: #667eea;
    .stat-card-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .stat-card-value { color: #667eea; }
  }

  &.borrowed {
    border-left-color: #1890ff;
    .stat-card-icon { background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%); }
    .stat-card-value { color: #1890ff; }
  }

  &.returned {
    border-left-color: #52c41a;
    .stat-card-icon { background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%); }
    .stat-card-value { color: #52c41a; }
  }

  &.overdue {
    border-left-color: #ff4d4f;
    .stat-card-icon { background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%); }
    .stat-card-value { color: #ff4d4f; }
  }

  .stat-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .stat-card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #fff;
    }

    .stat-card-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;

      &.up {
        background: #f6ffed;
        color: #52c41a;
      }
    }

    .stat-card-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      background: #e6f7ff;
      color: #1890ff;

      &.success {
        background: #f6ffed;
        color: #52c41a;
      }

      &.warning {
        background: #fff2e8;
        color: #fa541c;
        animation: pulse 1.5s infinite;
      }
    }
  }

  .stat-card-body {
    margin-bottom: 12px;

    .stat-card-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-card-label {
      font-size: 14px;
      color: #999;
      margin-top: 4px;
    }
  }

  .stat-card-footer {
    font-size: 12px;
    color: #999;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    :deep(.ant-progress) {
      margin-bottom: 4px;
    }

    .warning-text {
      color: #fa541c;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .success-text {
      color: #52c41a;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out both;
}

.animate-slide-down {
  animation: slideDown 0.5s ease-out both;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.search-area {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .search-input-wrapper {
    position: relative;

    .search-input {
      transition: all 0.3s ease;

      &:focus-within {
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
      }
    }

    .search-icon {
      color: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        color: #1890ff;
        transform: scale(1.1);
      }

      &.searching {
        animation: pulse 0.5s ease-in-out infinite;
        color: #1890ff;
      }
    }
  }

  .add-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
    }
  }

  .filter-hint {
    font-size: 13px;
    color: #999;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;

    .range-warn-tag {
      margin-inline-end: 0;
    }
  }

  .search-result-tip {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .result-count {
      color: #666;
      font-size: 13px;

      strong {
        color: #1890ff;
        font-size: 16px;
        margin: 0 4px;
      }
    }

    .clear-btn {
      font-size: 13px;

      &:hover {
        color: #ff4d4f;
      }
    }
  }
}

.table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &.table-loading {
    .ant-table {
      filter: blur(2px);
      pointer-events: none;
    }
  }

  .table-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: 12px;

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .spinner-ring {
        width: 40px;
        height: 40px;
        border: 3px solid #f0f0f0;
        border-top-color: #1890ff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      span {
        color: #1890ff;
        font-size: 14px;
      }
    }
  }

  :deep(.ant-table-tbody) {
    .ant-table-row {
      cursor: pointer;

      &:hover td {
        background: #fafafa !important;
      }

      &.located-row td {
        background: #fff7e6 !important;
        animation: locatedFlash 1.6s ease-in-out;
      }
    }
  }

  .table-action-btn {
    padding: 2px 4px;
    height: auto;
    border-radius: 4px;
    transition: all 0.2s ease;

    &.return-btn:hover,
    &.renew-btn:hover {
      color: #1890ff;
      background: #e6f7ff;
    }
  }

  .completed-text {
    color: #52c41a;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

@keyframes locatedFlash {
  0% { background-color: #ffd591; }
  60% { background-color: #ffe7ba; }
  100% { background-color: #fff7e6; }
}

.text-primary {
  font-weight: 500;
  color: #1a1a1a;
}

.text-secondary {
  font-size: 12px;
  color: #999;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}
</style>
