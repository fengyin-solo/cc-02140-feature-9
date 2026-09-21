<template>
  <div class="borrow-list">
    <h2 class="page-title">借阅管理</h2>

    <!-- 统计卡片 - 丰富内容 -->
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
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <div class="search-input-wrapper">
            <a-input
              v-model:value="overviewStore.keyword"
              placeholder="搜索读者、图书、卡号"
              allow-clear
              @input="onSearchInput"
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
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-select
            v-model:value="overviewStore.categoryId"
            placeholder="选择分类"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option
              v-for="cat in categoryOptions"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}{{ cat.__missing ? '（已删除）' : '' }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-select
            v-model:value="overviewStore.status"
            placeholder="选择状态"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="24" :md="24" :lg="9" style="text-align: right;">
          <a-button type="primary" @click="showBorrowModal" class="add-btn">
            <PlusOutlined /> 新增借阅
          </a-button>
        </a-col>
      </a-row>
      <a-row :gutter="16" align="middle" style="margin-top: 16px;">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-range-picker
            v-model:value="rangeModel"
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
        <a-col :xs="24" :sm="12" :md="16" :lg="18">
          <span class="filter-hint">
            <CalendarOutlined /> 按借阅日期筛选，与首页概览同一口径
          </span>
        </a-col>
      </a-row>

      <!-- 异常口径提示：日期反向 / 分类删除 -->
      <a-alert
        v-if="isRangeReversed"
        class="filter-alert"
        type="warning"
        show-icon
        banner
        message="开始日期晚于结束日期，日期条件未生效，请调整统计区间"
      />
      <a-alert
        v-else-if="isCategoryMissing"
        class="filter-alert"
        type="warning"
        show-icon
        banner
        message="筛选的分类已被删除，当前分类口径下无数据，可清除分类条件"
      />

      <!-- 钻取附加条件（逾期分桶 / 指定图书） -->
      <div v-if="activeBucket || bookIdFilter != null" class="drill-chips">
        <a-tag
          v-if="activeBucket"
          color="orange"
          closable
          @close="clearDrillFilters"
        >
          <ClockCircleOutlined /> {{ activeBucket.label }}
        </a-tag>
        <a-tag
          v-if="bookIdFilter != null"
          color="geekblue"
          closable
          @close="clearDrillFilters"
        >
          <BookOutlined /> {{ drillBookTitle }}
        </a-tag>
      </div>

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
    <div ref="tableWrapperRef" :class="['table-container', 'animate-fade-in', { 'table-loading': tableAnimating }]">
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
        :data-source="filteredRecords"
        :loading="loading"
        row-key="id"
        :pagination="paginationConfig"
        :row-class-name="getRowClassName"
        :locale="tableLocale"
        :custom-row="customRow"
        @change="handleTableChange"
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
              <a-tag v-if="getBookCategoryName(record.bookId)" color="blue" class="book-category-tag">
                {{ getBookCategoryName(record.bookId) }}
              </a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)" :class="['status-tag', record.status]">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="2">
              <a-button
                type="link"
                size="small"
                class="table-action-btn detail-btn"
                @click.stop="showDetailDrawer(record)"
              >
                <ProfileOutlined /> 明细
              </a-button>
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

    <!-- 借阅明细抽屉 -->
    <a-drawer
      v-model:open="detailVisible"
      title="借阅明细"
      width="460"
      :destroy-on-close="true"
    >
      <template v-if="detailRecord">
        <a-descriptions :column="1" bordered size="small" class="detail-desc">
          <a-descriptions-item label="读者姓名">{{ detailRecord.readerName }}</a-descriptions-item>
          <a-descriptions-item label="借书证号">{{ detailRecord.cardNo }}</a-descriptions-item>
          <a-descriptions-item label="读者类型">{{ detailReader?.type || '—' }}</a-descriptions-item>
          <a-descriptions-item label="所属部门">{{ detailReader?.department || '—' }}</a-descriptions-item>
          <a-descriptions-item label="图书名称">{{ detailRecord.bookTitle }}</a-descriptions-item>
          <a-descriptions-item label="ISBN">{{ detailRecord.isbn }}</a-descriptions-item>
          <a-descriptions-item label="图书分类">{{ getBookCategoryName(detailRecord.bookId) || '—' }}</a-descriptions-item>
          <a-descriptions-item label="馆藏位置">{{ detailBook?.location || '—' }}</a-descriptions-item>
          <a-descriptions-item label="借阅日期">{{ detailRecord.borrowDate }}</a-descriptions-item>
          <a-descriptions-item label="应还日期">{{ detailRecord.dueDate }}</a-descriptions-item>
          <a-descriptions-item label="归还日期">{{ detailRecord.returnDate || '—' }}</a-descriptions-item>
          <a-descriptions-item label="续借次数">{{ detailRecord.renewCount }} / 2</a-descriptions-item>
          <a-descriptions-item label="当前状态">
            <a-tag :color="getStatusColor(detailRecord.status)">
              {{ getStatusText(detailRecord.status) }}
            </a-tag>
            <span v-if="detailRecord.status === 'overdue'" class="overdue-days">
              已逾期 {{ getOverdueDays(detailRecord) }} 天
            </span>
          </a-descriptions-item>
        </a-descriptions>
        <div class="detail-actions">
          <a-button
            v-if="detailRecord.status === 'borrowed' || detailRecord.status === 'overdue'"
            type="primary"
            @click="handleReturn(detailRecord)"
          >
            <CheckOutlined /> 归还
          </a-button>
          <a-button
            v-if="detailRecord.status === 'borrowed' && detailRecord.renewCount < 2"
            @click="handleRenew(detailRecord)"
          >
            <ReloadOutlined /> 续借
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
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
  ProfileOutlined
} from '@ant-design/icons-vue'
import { useBorrowStore } from '@/stores/borrow'
import { useReaderStore } from '@/stores/reader'
import { useBookStore } from '@/stores/book'
import { useCategoryStore } from '@/stores/category'
import {
  useOverview,
  STATUS_TEXT,
  OVERDUE_BUCKETS,
  getBucketKey,
  getOverdueDays
} from '@/composables/useOverview'

const route = useRoute()
const router = useRouter()
const borrowStore = useBorrowStore()
const readerStore = useReaderStore()
const bookStore = useBookStore()
const categoryStore = useCategoryStore()

const {
  overviewStore,
  STATUS_OPTIONS,
  isRangeReversed,
  isCategoryMissing,
  hasFilters,
  scopedRecords,
  resetFilters,
  rangeModel
} = useOverview()

const loading = ref(false)
const borrowModalVisible = ref(false)
const submitLoading = ref(false)
const borrowFormRef = ref(null)
const isSearching = ref(false)
const tableAnimating = ref(false)
const tableWrapperRef = ref(null)
let searchTimeout = null

// 钻取附加条件（不属于概览口径，仅明细页临时生效）
const activeBucket = ref(null)
const bookIdFilter = ref(null)
const locateRecordId = ref(null)
const flashRecordId = ref(null)
let flashTimer = null

// 受控分页，定位时需要翻到目标记录所在页
const currentPage = ref(1)
const pageSize = 10

const columns = [
  { title: '读者信息', key: 'reader', width: 160 },
  { title: '图书信息', key: 'book', width: 220 },
  { title: '借阅日期', dataIndex: 'borrowDate', key: 'borrowDate', width: 110 },
  { title: '应还日期', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '归还日期', dataIndex: 'returnDate', key: 'returnDate', width: 110 },
  { title: '续借次数', dataIndex: 'renewCount', key: 'renewCount', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' }
]

const borrowForm = reactive({
  readerId: null,
  bookId: null
})

const borrowRules = {
  readerId: [{ required: true, message: '请选择读者' }],
  bookId: [{ required: true, message: '请选择图书' }]
}

// 分类删除后保留下拉占位，避免选中值无回显
const categoryOptions = computed(() => {
  const list = categoryStore.categories.map(c => ({ ...c }))
  if (isCategoryMissing.value) {
    list.unshift({ id: overviewStore.categoryId, name: '已删除分类', __missing: true })
  }
  return list
})

// 在概览同一口径之上，叠加钻取附加条件（逾期分桶 / 指定图书）
const filteredRecords = computed(() => {
  let result = scopedRecords.value

  if (bookIdFilter.value != null) {
    result = result.filter(r => r.bookId === bookIdFilter.value)
  }

  if (activeBucket.value) {
    result = result.filter(r => r.status === 'overdue' && getBucketKey(r) === activeBucket.value.key)
  }

  return result
})

const hasDrillFilter = computed(() => activeBucket.value != null || bookIdFilter.value != null)

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

const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize,
  total: filteredRecords.value.length,
  showTotal: total => `共 ${total} 条`,
  showSizeChanger: false
}))

// 空态文案：区分无数据 / 日期反向 / 分类删除 / 筛选无结果
const emptyText = computed(() => {
  if (borrowStore.records.length === 0) return '暂无借阅记录'
  if (isRangeReversed.value) return '统计区间开始日期晚于结束日期，请调整日期'
  if (isCategoryMissing.value) return '所选分类已删除，该分类下无数据'
  if (filteredRecords.value.length === 0) return '当前筛选条件下暂无记录'
  return ''
})
const tableLocale = computed(() => ({ emptyText: emptyText.value || '暂无数据' }))

const drillBookTitle = computed(() =>
  bookIdFilter.value != null ? bookStore.getBookById(bookIdFilter.value)?.title || '指定图书' : ''
)

// 明细抽屉
const detailVisible = ref(false)
const detailRecord = ref(null)
const detailReader = computed(() =>
  detailRecord.value ? readerStore.getReaderById(detailRecord.value.readerId) : null
)
const detailBook = computed(() =>
  detailRecord.value ? bookStore.getBookById(detailRecord.value.bookId) : null
)

function showDetailDrawer(record) {
  detailRecord.value = record
  detailVisible.value = true
}

function getStatusColor(status) {
  const colors = {
    borrowed: 'processing',
    returned: 'success',
    overdue: 'error'
  }
  return colors[status] || 'default'
}

function getStatusText(status) {
  return STATUS_TEXT[status] || status
}

function getBookCategoryName(bookId) {
  return bookStore.getBookById(bookId)?.categoryName || ''
}

function filterReader(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function filterBook(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 概览口径变化（用户手动调整）时：重置分页与钻取附加条件
let applyingRoute = false
watch(
  () => [overviewStore.keyword, overviewStore.categoryId, overviewStore.status, overviewStore.dateRange],
  () => {
    if (applyingRoute) return
    currentPage.value = 1
    activeBucket.value = null
    bookIdFilter.value = null
  }
)

function handleFilterChange() {
  triggerSearchAnimation()
}

// 搜索输入时的动画效果
function onSearchInput() {
  isSearching.value = true
  currentPage.value = 1

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    isSearching.value = false
    triggerSearchAnimation()
  }, 300)
}

// 触发表格搜索动画和loading
function triggerSearchAnimation() {
  loading.value = true
  tableAnimating.value = true
  setTimeout(() => {
    tableAnimating.value = false
    loading.value = false
  }, 600)
}

// 清除全部筛选（保留上次定位，返回概览时仍可高亮）
function clearFilters() {
  resetFilters()
  activeBucket.value = null
  bookIdFilter.value = null
  currentPage.value = 1
  triggerSearchAnimation()
}

function clearDrillFilters() {
  activeBucket.value = null
  bookIdFilter.value = null
  currentPage.value = 1
  triggerSearchAnimation()
}

function handleTableChange(pagination) {
  currentPage.value = pagination.current
}

// 行点击打开明细，操作按钮上已 @click.stop 避免冒泡
function customRow(record) {
  return {
    onClick: () => showDetailDrawer(record)
  }
}

// 高亮从概览定位过来的记录
function getRowClassName(record, index) {
  const classes = [`table-row-animate row-${index}`]
  if (String(record.id) === String(flashRecordId.value)) {
    classes.push('row-located')
  }
  return classes
}

function scrollToRecord(id) {
  nextTick(() => {
    const wrapper = tableWrapperRef.value
    const row = wrapper?.querySelector(`tr[data-row-key="${id}"]`)
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function flashLocated(id) {
  flashRecordId.value = id
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashRecordId.value = null
  }, 3000)
  scrollToRecord(id)
}

// 从首页概览带 query 钻取：应用同一口径并定位到具体明细
function applyRouteQuery() {
  const query = route.query
  if (query.from !== 'overview') return

  applyingRoute = true
  overviewStore.keyword = query.keyword || ''
  overviewStore.categoryId = query.categoryId != null ? Number(query.categoryId) : null
  overviewStore.status = query.status || null
  overviewStore.dateRange =
    query.startDate && query.endDate ? [query.startDate, query.endDate] : null
  applyingRoute = false

  activeBucket.value = query.bucket
    ? OVERDUE_BUCKETS.find(b => b.key === query.bucket)
    : null
  bookIdFilter.value = query.bookId != null ? Number(query.bookId) : null
  locateRecordId.value = query.recordId != null ? Number(query.recordId) : null

  currentPage.value = 1

  triggerSearchAnimation()
  locateTarget()
  // 清理 URL 中的定位参数，避免刷新重复触发
  router.replace({ path: '/borrow' })
}

function locateTarget() {
  // 等表格动画与分页渲染完成后定位
  setTimeout(() => {
    const targetId = locateRecordId.value
    if (targetId != null) {
      const target = filteredRecords.value.find(r => r.id === targetId)
      if (!target) {
        message.warning('该记录不在当前口径内，已展示全部匹配结果')
        return
      }
      const index = filteredRecords.value.findIndex(r => r.id === targetId)
      currentPage.value = Math.floor(index / pageSize) + 1
      nextTick(() => flashLocated(targetId))
      return
    }

    // 无指定记录时：定位到第一条匹配
    if (filteredRecords.value.length === 0) {
      if (bookIdFilter.value != null || activeBucket.value) {
        message.info('当前口径下没有对应的明细记录')
      }
      return
    }
    currentPage.value = 1
    const firstId = filteredRecords.value[0].id
    nextTick(() => {
      const wrapper = tableWrapperRef.value
      wrapper?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      flashLocated(firstId)
    })
  }, 650)
}

onMounted(applyRouteQuery)

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

// ========================================
// 动画定义
// ========================================
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

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// ========================================
// 动画类
// ========================================
.animate-fade-in {
  animation: fadeIn 0.5s ease-out both;
}

.animate-slide-down {
  animation: slideDown 0.5s ease-out both;
}

// ========================================
// 过渡动画
// ========================================
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
        box-shadow: 0 0 0 2px rgba(250, 173, 20, 0.2);
      }
    }
    
    .search-icon {
      color: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        color: #faad14;
        transform: scale(1.1);
      }
      
      &.searching {
        animation: pulse 0.5s ease-in-out infinite;
        color: #faad14;
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
  }

  .filter-alert {
    margin-top: 16px;
    border-radius: 8px;
  }

  .drill-chips {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    :deep(.ant-tag) {
      margin-inline-end: 0;
      cursor: default;
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
        color: #faad14;
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
        border-top-color: #faad14;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      span {
        color: #faad14;
        font-size: 14px;
      }
    }
  }

  // 表格行样式
  :deep(.ant-table-tbody) {
    .ant-table-row {
      cursor: pointer;

      &:hover td {
        background: #fafafa !important;
      }

      // 概览定位到的明细行高亮
      &.row-located td {
        background: #e6f7ff !important;
        animation: locatedFlash 3s ease-out;
      }
    }
  }

  @keyframes locatedFlash {
    0% { background: #bae7ff; }
    100% { background: #e6f7ff; }
  }

  .table-action-btn {
    padding: 2px 4px;
    height: auto;
    border-radius: 4px;
    transition: all 0.2s ease;

    &.return-btn:hover,
    &.renew-btn:hover,
    &.detail-btn:hover {
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

.reader-cell,
.book-cell {
  // 保持默认样式
}

.text-primary {
  font-weight: 500;
  color: #1a1a1a;
}

.text-secondary {
  font-size: 12px;
  color: #999;
}

.status-tag {
  // 保持默认样式
}

.book-category-tag {
  margin-top: 4px;
  margin-inline-end: 0;
}

.detail-desc {
  :deep(.ant-descriptions-item-label) {
    width: 100px;
  }
}

.overdue-days {
  margin-left: 8px;
  font-size: 12px;
  color: #fa541c;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}
</style>
