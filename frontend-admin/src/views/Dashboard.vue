<template>
  <div class="dashboard">
    <h2 class="page-title animate-fade-in">首页概览</h2>

    <!-- 统计卡片（全局口径，保持兼容；点击进入对应明细） -->
    <a-row :gutter="[16, 16]" class="stat-row">
      <a-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card animate-slide-up" style="animation-delay: 0.1s" @click="goBooks">
          <div class="stat-icon pulse-animation">
            <BookOutlined />
          </div>
          <div class="stat-info">
            <div class="stat-value count-up">{{ bookStore.totalBooks }}</div>
            <div class="stat-label">图书总数</div>
          </div>
          <div class="stat-card-bg"></div>
        </div>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card success animate-slide-up" style="animation-delay: 0.2s" @click="goReaders">
          <div class="stat-icon pulse-animation">
            <UserOutlined />
          </div>
          <div class="stat-info">
            <div class="stat-value count-up">{{ readerStore.totalReaders }}</div>
            <div class="stat-label">读者总数</div>
          </div>
          <div class="stat-card-bg"></div>
        </div>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card warning animate-slide-up" style="animation-delay: 0.3s" @click="drillGlobalStatus('borrowed')">
          <div class="stat-icon pulse-animation">
            <SwapOutlined />
          </div>
          <div class="stat-info">
            <div class="stat-value count-up">{{ borrowStore.totalBorrowed }}</div>
            <div class="stat-label">借出中</div>
          </div>
          <div class="stat-card-bg"></div>
        </div>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card error animate-slide-up" style="animation-delay: 0.4s" @click="drillGlobalStatus('overdue')">
          <div class="stat-icon pulse-animation">
            <WarningOutlined />
          </div>
          <div class="stat-info">
            <div class="stat-value count-up">{{ borrowStore.totalOverdue }}</div>
            <div class="stat-label">逾期未还</div>
          </div>
          <div class="stat-card-bg"></div>
        </div>
      </a-col>
    </a-row>

    <!-- 运营分析筛选条：分类 / 借阅状态 / 统计区间 / 关键字 共用同一口径 -->
    <div class="filter-bar animate-fade-in" style="animation-delay: 0.45s">
      <div class="filter-bar-title">
        <FundOutlined /> 运营分析口径
      </div>
      <a-row :gutter="[12, 12]" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <a-select
            v-model:value="filters.categoryId"
            placeholder="按分类筛选"
            allow-clear
            style="width: 100%"
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
        <a-col :xs="24" :sm="12" :md="6">
          <a-select
            v-model:value="filters.status"
            placeholder="按借阅状态筛选"
            allow-clear
            style="width: 100%"
          >
            <a-select-option value="borrowed">借阅中</a-select-option>
            <a-select-option value="returned">已归还</a-select-option>
            <a-select-option value="overdue">已逾期</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="14" :md="7">
          <a-range-picker
            v-model:value="dateRangeModel"
            :placeholder="['统计开始', '统计结束']"
            allow-clear
            style="width: 100%"
          />
        </a-col>
        <a-col :xs="24" :sm="10" :md="5">
          <a-input
            v-model:value="filters.keyword"
            placeholder="检索读者 / 书名 / 卡号 / ISBN"
            allow-clear
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </a-col>
      </a-row>
      <div class="filter-bar-footer">
        <div class="scope-chips">
          <a-space :size="8" wrap>
            <a-tag
              v-for="chip in scopeChips"
              :key="chip.key"
              :closable="chip.key !== 'dateRange'"
              :color="chip.danger ? 'error' : 'processing'"
              @close="removeChip(chip.key)"
            >
              {{ chip.label }}
            </a-tag>
            <a-tag v-if="scopedTotal > 0" color="default" class="scope-total-tag">
              当前口径 {{ scopedTotal }} 条借阅
            </a-tag>
            <a-button v-for="preset in rangePresets" :key="preset.label" type="link" size="small" @click="applyPreset(preset.days)">
              {{ preset.label }}
            </a-button>
          </a-space>
        </div>
        <a-button size="small" :disabled="!hasScopeFilter" @click="resetScope">
          <ReloadOutlined /> 重置口径
        </a-button>
      </div>
    </div>

    <!-- 借阅记录、分类统计与逾期分布 -->
    <a-row :gutter="[16, 16]">
      <!-- 最近借阅（当前口径） -->
      <a-col :xs="24" :lg="16">
        <div class="card-container animate-fade-in" style="animation-delay: 0.5s">
          <div class="card-header">
            <h3 class="card-title">
              <HistoryOutlined class="icon-spin" /> 最近借阅记录
              <a-tag color="blue">{{ recentBorrows.length }}/{{ scopedTotal }}</a-tag>
            </h3>
            <a-button type="link" class="view-all-btn" @click="drillBorrowList()">
              查看全部 <RightOutlined />
            </a-button>
          </div>
          <div class="card-body">
            <div v-if="borrowEmptyVariant" class="inline-empty">
              <ScopeEmpty
                :variant="borrowEmptyVariant"
                entity="借阅记录"
                compact
                @clear="resetScope"
              />
            </div>
            <div v-else class="borrow-list">
              <div
                v-for="(record, index) in recentBorrows"
                :key="record.id"
                :class="['borrow-item', 'hover-lift', { selected: filters.selectedRecordId === record.id }]"
                :style="{ animationDelay: `${0.55 + index * 0.06}s` }"
                @click="dashboardStore.selectRecord(record.id)"
              >
                <div class="borrow-info">
                  <a-avatar
                    :style="{ backgroundColor: getAvatarColor(record.readerId) }"
                    size="small"
                    class="avatar-bounce"
                  >
                    {{ record.readerName.charAt(0) }}
                  </a-avatar>
                  <div class="borrow-detail">
                    <span class="reader-name">{{ record.readerName }}</span>
                    <span class="book-title">{{ record.bookTitle }}</span>
                  </div>
                </div>
                <div class="borrow-meta">
                  <span class="borrow-date">{{ record.borrowDate }}</span>
                  <a-tag :color="getStatusColor(record.status)" class="status-tag">
                    {{ getStatusText(record.status) }}
                  </a-tag>
                  <a-tooltip title="定位到该明细">
                    <a-button
                      type="text"
                      size="small"
                      class="locate-btn"
                      @click.stop="locateRecord(record)"
                    >
                      <AimOutlined />
                    </a-button>
                  </a-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-col>

      <!-- 右列：分类统计 + 逾期分布 -->
      <a-col :xs="24" :lg="8">
        <!-- 分类统计（库存维度；点击作为分类筛选入口） -->
        <div class="card-container animate-fade-in" style="margin-bottom: 16px; animation-delay: 0.55s">
          <div class="card-header compact-header">
            <h3 class="card-title">
              <PieChartOutlined class="icon-pulse" /> 图书分类统计
            </h3>
            <span class="header-hint">点击筛选</span>
          </div>
          <div class="card-body category-body">
            <div v-if="topCategories.length === 0" class="inline-empty">
              <ScopeEmpty variant="no-data-at-all" entity="分类" compact @clear="goCategoryManage" />
            </div>
            <div v-else class="category-list">
              <div
                v-for="(cat, index) in topCategories"
                :key="cat.id"
                :class="['category-item', 'hover-highlight', { selected: filters.categoryId === cat.id }]"
                :style="{ animationDelay: `${0.6 + index * 0.06}s` }"
                @click="toggleCategory(cat.id)"
              >
                <div class="category-left">
                  <span class="category-dot pulse-dot" :style="{ backgroundColor: getProgressColor(cat.id) }"></span>
                  <span class="category-name">{{ cat.name }}</span>
                </div>
                <div class="category-right">
                  <span class="category-count animate-number">{{ cat.bookCount }}</span>
                  <span class="category-unit">本</span>
                </div>
                <div class="category-progress">
                  <div
                    class="category-progress-bar"
                    :style="{
                      width: `${(cat.bookCount / maxBookCount) * 100}%`,
                      backgroundColor: getProgressColor(cat.id)
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 逾期分布（强制逾期口径） -->
        <div class="card-container overdue-card animate-fade-in" style="animation-delay: 0.6s">
          <div class="card-header compact-header">
            <h3 class="card-title">
              <WarningOutlined class="icon-fire" /> 逾期分布
              <a-tag v-if="overdueTotal > 0" color="error">{{ overdueTotal }}</a-tag>
            </h3>
            <a-tag color="orange" class="caliber-tag">逾期口径</a-tag>
          </div>
          <div class="card-body overdue-body">
            <div v-if="overdueEmptyVariant" class="inline-empty">
              <ScopeEmpty
                :variant="overdueEmptyVariant"
                entity="逾期记录"
                compact
                @clear="resetScope"
                @show-overdue="showOverdueScope"
              />
            </div>
            <div v-else class="overdue-list">
              <div
                v-for="row in overdueRows"
                :key="row.categoryId ?? 'none'"
                :class="['overdue-group', { selected: filters.selectedOverdueCategoryId === (row.categoryId ?? 'none') }]"
              >
                <div class="overdue-group-head" @click="toggleOverdueGroup(row)">
                  <span class="overdue-name">
                    <FolderOutlined />
                    {{ row.name }}
                    <a-tag v-if="row.missing" color="error" class="mini-tag">分类已删除</a-tag>
                  </span>
                  <span class="overdue-count">
                    <strong>{{ row.count }}</strong> 本
                    <span class="overdue-days">最长 {{ row.maxDays }} 天</span>
                    <DownOutlined :class="['expand-arrow', { open: filters.selectedOverdueCategoryId === (row.categoryId ?? 'none') }]" />
                  </span>
                </div>
                <div v-if="filters.selectedOverdueCategoryId === (row.categoryId ?? 'none')" class="overdue-records">
                  <div
                    v-for="record in overdueGroupRecords(row)"
                    :key="record.id"
                    class="overdue-record"
                    :class="{ selected: filters.selectedRecordId === record.id }"
                    @click="dashboardStore.selectRecord(record.id)"
                  >
                    <span class="overdue-record-title">{{ record.bookTitle }}</span>
                    <span class="overdue-record-meta">
                      {{ record.readerName }} · 应还 {{ record.dueDate }} · {{ getOverdueDays(record) }} 天
                      <a-button type="link" size="small" @click.stop="locateOverdueRecord(row, record)">
                        <AimOutlined /> 定位
                      </a-button>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 热门图书（当前口径：按借阅次数聚合） -->
    <div class="card-container animate-fade-in" style="margin-top: 16px; animation-delay: 0.65s">
      <div class="card-header">
        <h3 class="card-title">
          <FireOutlined class="icon-fire" /> 热门图书推荐
          <a-tag color="red">{{ hotBooks.length }}</a-tag>
        </h3>
        <span class="header-hint">按当前口径借阅次数排序，点击卡片选中，定位可直达明细</span>
      </div>
      <div class="card-body hot-body">
        <div v-if="hotEmptyVariant" class="inline-empty">
          <ScopeEmpty
            :variant="hotEmptyVariant"
            entity="热门图书"
            compact
            @clear="resetScope"
          />
        </div>
        <a-row v-else :gutter="[16, 16]">
          <a-col
            v-for="(item, index) in hotBooks"
            :key="item.book.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <div
              :class="['book-card', 'clickable', { selected: filters.selectedBookId === item.book.id }]"
              :style="{ animationDelay: `${0.7 + index * 0.06}s` }"
              @click="dashboardStore.selectBook(item.book.id)"
            >
              <div class="book-rank">
                <span class="rank-badge">No.{{ index + 1 }}</span>
                <a-tag color="red" class="borrow-count-tag">借 {{ item.count }} 次</a-tag>
              </div>
              <div class="book-cover">
                <img :src="item.book.cover" :alt="item.book.title" />
              </div>
              <div class="book-info">
                <h4 class="book-title">{{ item.book.title }}</h4>
                <p class="book-author">{{ item.book.author }}</p>
                <div class="book-meta">
                  <a-tag color="blue" class="category-tag">{{ item.book.categoryName }}</a-tag>
                  <span class="book-available">
                    <span class="stock-icon">📚</span>
                    {{ item.book.available }}/{{ item.book.total }}
                  </span>
                </div>
                <a-button
                  type="link"
                  size="small"
                  class="locate-book-btn"
                  @click.stop="locateHotBook(item)"
                >
                  <AimOutlined /> 定位对应明细（{{ item.records.length }}）
                </a-button>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  BookOutlined,
  UserOutlined,
  SwapOutlined,
  WarningOutlined,
  HistoryOutlined,
  RightOutlined,
  PieChartOutlined,
  FireOutlined,
  SearchOutlined,
  ReloadOutlined,
  AimOutlined,
  FolderOutlined,
  DownOutlined,
  FundOutlined
} from '@ant-design/icons-vue'
import { useBookStore } from '@/stores/book'
import { useReaderStore } from '@/stores/reader'
import { useBorrowStore } from '@/stores/borrow'
import { useCategoryStore } from '@/stores/category'
import { useDashboardStore } from '@/stores/dashboard'
import ScopeEmpty from '@/components/ScopeEmpty.vue'
import {
  analyzeRecords,
  buildHotBooks,
  buildOverdueDistribution,
  buildScopeChips,
  getOverdueDays,
  getStatusColor,
  getStatusText,
  normalizeDateRange
} from '@/utils/analytics'

const router = useRouter()
const bookStore = useBookStore()
const readerStore = useReaderStore()
const borrowStore = useBorrowStore()
const categoryStore = useCategoryStore()
const dashboardStore = useDashboardStore()

// 概览定位状态（筛选 + 选中项），持久化并在钻取返回后恢复
const filters = dashboardStore.overview

const dateRangeModel = computed({
  get() {
    const range = filters.dateRange
    return range ? [dayjs(range[0]), dayjs(range[1])] : null
  },
  set(value) {
    // normalizeDateRange 保留用户选择顺序，反向区间不自动交换
    dashboardStore.setOverviewFilter({ dateRange: normalizeDateRange(value) })
  }
})

const rangePresets = [
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '近90天', days: 90 }
]

function applyPreset(days) {
  const end = dayjs().format('YYYY-MM-DD')
  const start = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD')
  dashboardStore.setOverviewFilter({ dateRange: [start, end] })
}

// ---------------- 统一口径数据 ----------------
const analysis = computed(() =>
  analyzeRecords(
    borrowStore.records,
    {
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
      dateRange: filters.dateRange
    },
    {
      getBook: id => bookStore.getBookById(id),
      checkCategory: id => !!categoryStore.getCategoryById(id)
    }
  )
)

const scopedRecords = computed(() => analysis.value.items)
const scopedTotal = computed(() => scopedRecords.value.length)

const scopeChips = computed(() =>
  buildScopeChips(
    {
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
      dateRange: filters.dateRange
    },
    { getCategory: id => categoryStore.getCategoryById(id) }
  )
)

const hasScopeFilter = computed(() =>
  !!(filters.keyword || filters.categoryId != null || filters.status || filters.dateRange)
)

function removeChip(key) {
  if (key === 'keyword') dashboardStore.setOverviewFilter({ keyword: '' })
  if (key === 'category') dashboardStore.setOverviewFilter({ categoryId: null })
  if (key === 'status') dashboardStore.setOverviewFilter({ status: null })
}

function resetScope() {
  dashboardStore.resetOverview()
}

// ---------------- 最近借阅 ----------------
const recentBorrows = computed(() =>
  [...scopedRecords.value]
    .sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate))
    .slice(0, 8)
)

// ---------------- 分类统计（库存维度，保持既有口径） ----------------
const topCategories = computed(() => categoryStore.categories.slice(0, 6))

const maxBookCount = computed(() => {
  const counts = topCategories.value.map(c => c.bookCount)
  return Math.max(...counts, 1)
})

function toggleCategory(id) {
  dashboardStore.setOverviewFilter({
    categoryId: filters.categoryId === id ? null : id
  })
}

// ---------------- 热门图书 ----------------
const hotBooks = computed(() =>
  buildHotBooks(scopedRecords.value, bookStore.books).slice(0, 8)
)

// ---------------- 逾期分布（强制逾期口径） ----------------
const overdueRows = computed(() =>
  buildOverdueDistribution(
    borrowStore.records,
    {
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      dateRange: filters.dateRange
    },
    {
      getBook: id => bookStore.getBookById(id),
      getCategory: id => categoryStore.getCategoryById(id)
    }
  )
)

const overdueTotal = computed(() =>
  overdueRows.value.reduce((sum, row) => sum + row.count, 0)
)

const allOverdueCount = computed(() =>
  borrowStore.records.filter(r => r.status === 'overdue').length
)

function overdueGroupRecords(row) {
  return [...row.records]
    .sort((a, b) => getOverdueDays(b) - getOverdueDays(a))
    .slice(0, 5)
}

function toggleOverdueGroup(row) {
  dashboardStore.selectOverdueCategory(row.categoryId ?? 'none')
}

function showOverdueScope() {
  dashboardStore.setOverviewFilter({ status: 'overdue' })
}

// ---------------- 空态区分 ----------------
function scopedEmptyVariant(noOverdue = false) {
  if (analysis.value.reversed) return 'reversed'
  if (analysis.value.categoryMissing) return 'missing-category'
  const totalBase = noOverdue ? allOverdueCount.value : borrowStore.records.length
  if (totalBase === 0) return 'no-data-at-all'
  return 'no-result'
}

const borrowEmptyVariant = computed(() =>
  scopedTotal.value === 0 ? scopedEmptyVariant(false) : null
)

const hotEmptyVariant = computed(() => {
  if (hotBooks.value.length > 0) return null
  if (analysis.value.reversed) return 'reversed'
  if (analysis.value.categoryMissing) return 'missing-category'
  if (bookStore.books.length === 0) return 'no-data-at-all'
  return 'no-result'
})

const overdueEmptyVariant = computed(() => {
  if (overdueRows.value.length > 0) return null
  if (analysis.value.reversed) return 'reversed'
  if (analysis.value.categoryMissing) return 'missing-category'
  // 当前状态口径不包含逾期（选中了借阅中/已归还）
  if (filters.status && filters.status !== 'overdue') return 'status-excluded'
  return scopedEmptyVariant(true)
})

// ---------------- 钻取到借阅明细 ----------------
function buildDrillQuery(extra = {}) {
  const query = {}
  if (filters.keyword) query.keyword = filters.keyword
  if (filters.categoryId != null) query.categoryId = filters.categoryId
  if (filters.status) query.status = filters.status
  if (filters.dateRange) query.dateRange = filters.dateRange.join(',')
  return { ...query, ...extra }
}

function drillBorrowList(extra = {}) {
  router.push({ name: 'Borrow', query: buildDrillQuery(extra) })
}

function locateRecord(record) {
  dashboardStore.selectRecord(record.id)
  drillBorrowList({ locateRecordId: record.id })
}

function locateHotBook(item) {
  dashboardStore.selectBook(item.book.id)
  const first = item.records[0]
  drillBorrowList({
    bookId: item.book.id,
    locateRecordId: first ? first.id : undefined
  })
}

function locateOverdueRecord(row, record) {
  dashboardStore.selectRecord(record.id)
  const query = {
    status: 'overdue',
    locateRecordId: record.id
  }
  if (row.categoryId != null) query.categoryId = row.categoryId
  drillBorrowList(query)
}

// 顶部全局统计卡：卡片数字为全局口径，钻取时只带状态，保证明细数量与卡片一致
function drillGlobalStatus(status) {
  router.push({ name: 'Borrow', query: { scope: 'global', status } })
}

function goBooks() {
  router.push('/books')
}

function goReaders() {
  router.push('/readers')
}

function goCategoryManage() {
  router.push('/categories')
}

// ---------------- 展示辅助 ----------------
const avatarColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2']

function getAvatarColor(id) {
  return avatarColors[(id - 1) % avatarColors.length]
}

const progressColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#fa541c', '#2f54eb']

function getProgressColor(id) {
  return progressColors[(id - 1) % progressColors.length]
}
</script>

<style lang="less" scoped>
// ========================================
// 动画定义
// ========================================
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes progressGrow {
  from { width: 0; }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out both;
}

.animate-slide-up {
  animation: slideUp 0.5s ease-out both;
}

.hover-lift {
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: #fafafa;
  }

  &.selected {
    background-color: #e6f4ff;
    box-shadow: inset 3px 0 0 #1890ff;
  }
}

.hover-highlight {
  transition: background-color 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: #fafafa;
  }

  &.selected {
    background-color: #e6f4ff;
  }
}

.dashboard {
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 24px;
    position: relative;
    display: inline-block;

    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 3px;
      background: linear-gradient(90deg, #1890ff, #40a9ff);
      border-radius: 2px;
      animation: expandWidth 0.8s ease-out 0.3s forwards;
    }
  }
}

@keyframes expandWidth {
  to { width: 100%; }
}

.stat-row {
  margin-bottom: 16px;
}

// 运营分析筛选条
.filter-bar {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  padding: 16px 20px 12px;
  margin-bottom: 16px;

  .filter-bar-title {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-bar-footer {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;

    .scope-chips {
      flex: 1;
      min-width: 200px;
    }

    .scope-total-tag {
      margin-inline-end: 0;
    }
  }
}

.stat-card {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  color: #fff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 32px rgba(24, 144, 255, 0.4);
  }

  &.success {
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
    box-shadow: 0 2px 8px rgba(82, 196, 26, 0.15);

    &:hover {
      box-shadow: 0 12px 32px rgba(82, 196, 26, 0.4);
    }
  }

  &.warning {
    background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
    box-shadow: 0 2px 8px rgba(250, 173, 20, 0.15);

    &:hover {
      box-shadow: 0 12px 32px rgba(250, 173, 20, 0.4);
    }
  }

  &.error {
    background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
    box-shadow: 0 2px 8px rgba(255, 77, 79, 0.15);

    &:hover {
      box-shadow: 0 12px 32px rgba(255, 77, 79, 0.4);
    }
  }

  .stat-card-bg {
    position: absolute;
    right: -20px;
    bottom: -20px;
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  &:hover .stat-card-bg {
    transform: scale(1.1);
  }

  .stat-icon {
    font-size: 40px;
    opacity: 0.9;
    margin-right: 20px;
    z-index: 1;
    transition: transform 0.3s ease;
  }

  &:hover .stat-icon {
    transform: scale(1.1);
  }

  .stat-info {
    z-index: 1;

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }
  }
}

.card-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: #e0e0e0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    &.compact-header {
      margin-bottom: 8px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-hint {
      font-size: 12px;
      color: #999;
    }

    .view-all-btn {
      transition: all 0.3s ease;

      &:hover {
        transform: translateX(2px);
      }
    }

    .caliber-tag {
      margin: 0;
    }
  }

  .card-body {
    padding: 16px 20px;
  }
}

.inline-empty {
  padding: 8px 0;
}

// 借阅列表样式
.borrow-list {
  .borrow-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 8px;
    border-bottom: 1px solid #f5f5f5;
    border-radius: 6px;

    &:last-child {
      border-bottom: none;
    }

    .borrow-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .borrow-detail {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .reader-name {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 14px;
        }

        .book-title {
          font-size: 12px;
          color: #999;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .borrow-meta {
      display: flex;
      align-items: center;
      gap: 8px;

      .borrow-date {
        font-size: 12px;
        color: #999;
      }

      .locate-btn {
        color: #1890ff;
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      &:hover .locate-btn {
        opacity: 1;
      }
    }
  }
}

// 分类列表样式
.category-body {
  padding: 8px 20px !important;
}

.category-list {
  .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 8px;
    border-bottom: 1px solid #f5f5f5;
    border-radius: 6px;
    flex-wrap: wrap;

    &:last-child {
      border-bottom: none;
    }

    .category-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .category-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .category-name {
        font-size: 14px;
        color: #1a1a1a;
      }
    }

    .category-right {
      display: flex;
      align-items: baseline;
      gap: 2px;

      .category-count {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .category-unit {
        font-size: 12px;
        color: #999;
      }
    }

    .category-progress {
      width: 100%;
      height: 2px;
      background: #f0f0f0;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;

      .category-progress-bar {
        height: 100%;
        border-radius: 2px;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation: progressGrow 1s ease-out both;
      }
    }
  }
}

// 逾期分布
.overdue-card {
  .overdue-body {
    padding-top: 8px;
  }
}

.overdue-list {
  .overdue-group {
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    &.selected > .overdue-group-head {
      background-color: #fff2f0;
    }

    .overdue-group-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #fafafa;
      }

      .overdue-name {
        font-size: 14px;
        color: #1a1a1a;
        display: flex;
        align-items: center;
        gap: 6px;

        .mini-tag {
          margin: 0;
          font-size: 11px;
          line-height: 16px;
        }
      }

      .overdue-count {
        font-size: 13px;
        color: #ff4d4f;
        display: flex;
        align-items: center;
        gap: 6px;

        strong {
          font-size: 16px;
        }

        .overdue-days {
          color: #999;
          font-size: 12px;
        }

        .expand-arrow {
          font-size: 10px;
          transition: transform 0.2s;

          &.open {
            transform: rotate(180deg);
          }
        }
      }
    }

    .overdue-records {
      padding: 4px 8px 8px 24px;

      .overdue-record {
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;

        &.selected {
          background-color: #fff1f0;
        }

        .overdue-record-title {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .overdue-record-meta {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }
}

// 热门图书
.hot-body {
  padding-top: 8px;
}

.book-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  height: 100%;
  transition: all 0.3s ease;
  margin-bottom: 16px;

  &.clickable {
    cursor: pointer;
  }

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: #1890ff;
  }

  &.selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.35);
  }

  .book-rank {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px 0;

    .rank-badge {
      font-size: 12px;
      font-weight: 600;
      color: #fa541c;
    }

    .borrow-count-tag {
      margin: 0;
    }
  }

  .book-cover {
    height: 180px;
    overflow: hidden;
    background: #f5f5f5;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .book-info {
    padding: 12px 16px 16px;

    .book-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 8px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
      min-height: 42px;
      word-break: break-all;
    }

    .book-author {
      font-size: 13px;
      color: #666;
      margin: 0 0 12px 0;
    }

    .book-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .category-tag {
        transition: all 0.3s ease;
      }

      .book-available {
        font-size: 12px;
        color: #999;
        display: flex;
        align-items: center;
        gap: 4px;

        .stock-icon {
          font-size: 14px;
          animation: float 2s ease-in-out infinite;
        }
      }
    }

    .locate-book-btn {
      padding: 4px 0 0;
      height: auto;
      font-size: 12px;
    }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
</style>
