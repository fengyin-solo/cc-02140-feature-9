<template>
  <div class="dashboard">
    <h2 class="page-title animate-fade-in">首页概览</h2>

    <!-- 统计卡片（保持原口径：全局统计，与下方筛选区相互独立） -->
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
        <div class="stat-card success animate-slide-up" style="animation-delay: 0.2s" @click="$router.push('/readers')">
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
        <div class="stat-card warning animate-slide-up" style="animation-delay: 0.3s" @click="drillFromStat('borrowed')">
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
        <div class="stat-card error animate-slide-up" style="animation-delay: 0.4s" @click="drillFromStat('overdue')">
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

    <!-- 统一口径筛选栏：作用于最近借阅、逾期分布、热门图书 -->
    <div class="filter-bar card-container animate-fade-in" style="animation-delay: 0.45s">
      <a-row :gutter="[12, 12]" align="middle">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-input
            v-model:value="overviewStore.keyword"
            placeholder="检索读者、图书、卡号"
            allow-clear
            @press-enter="locateByKeyword"
          >
            <template #suffix>
              <SearchOutlined class="filter-search-icon" @click="locateByKeyword" />
            </template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-select
            v-model:value="overviewStore.categoryId"
            placeholder="选择分类"
            allow-clear
            style="width: 100%"
          >
            <a-select-option
              v-for="cat in categoryOptions"
              :key="cat.id"
              :value="cat.id"
              :class="{ 'missing-option': cat.__missing }"
            >
              {{ cat.name }}{{ cat.__missing ? '（已删除）' : '' }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-select
            v-model:value="overviewStore.status"
            placeholder="借阅状态"
            allow-clear
            style="width: 100%"
          >
            <a-select-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-range-picker v-model:value="rangeModel" style="width: 100%" />
        </a-col>
        <a-col :xs="24" :sm="24" :md="24" :lg="3" class="filter-actions">
          <a-button type="primary" @click="locateByKeyword">
            <template #icon><AimOutlined /></template>
            定位明细
          </a-button>
        </a-col>
      </a-row>

      <!-- 异常口径提示：日期反向 / 分类删除 -->
      <a-alert
        v-if="isRangeReversed"
        class="filter-alert"
        type="warning"
        show-icon
        banner
        message="统计区间开始日期晚于结束日期，日期条件未生效，请调整区间"
      />
      <a-alert
        v-else-if="isCategoryMissing"
        class="filter-alert"
        type="warning"
        show-icon
        banner
        message="当前选择的分类已被删除，该分类口径下无数据，可清除分类条件"
      />

      <!-- 当前口径摘要 -->
      <div class="scope-bar">
        <div class="scope-tags">
          <span class="scope-label">
            <FilterOutlined /> 当前口径
          </span>
          <a-tag v-if="overviewStore.categoryId != null" color="blue" closable @close="overviewStore.categoryId = null">
            分类：{{ isCategoryMissing ? '已删除分类' : selectedCategory?.name }}
          </a-tag>
          <a-tag v-if="overviewStore.status" color="purple" closable @close="overviewStore.status = null">
            状态：{{ statusText(overviewStore.status) }}
          </a-tag>
          <a-tag v-if="effectiveRangeText" color="cyan" closable @close="overviewStore.dateRange = null">
            区间：{{ effectiveRangeText }}
          </a-tag>
          <a-tag v-if="isRangeReversed" color="orange">
            区间无效（已忽略日期）
          </a-tag>
          <a-tag v-if="overviewStore.keyword" closable @close="overviewStore.keyword = ''">
            关键词：{{ overviewStore.keyword }}
          </a-tag>
          <span v-if="!hasFilters" class="scope-empty-hint">全部分类 · 全部状态 · 全部时间</span>
        </div>
        <div class="scope-counts">
          <a-tooltip title="跳转到该口径下的借阅明细">
            <span class="scope-count scope-count-link" @click="drill('recent')">
              借阅 <strong>{{ scopeSummary.records }}</strong>
            </span>
          </a-tooltip>
          <a-tooltip title="跳转到该口径下的热门图书明细">
            <span class="scope-count scope-count-link" @click="drill('hot')">
              图书 <strong>{{ scopeSummary.books }}</strong>
            </span>
          </a-tooltip>
          <a-tooltip title="跳转到该口径下的逾期明细">
            <span class="scope-count scope-count-link" @click="drill('overdue')">
              逾期 <strong>{{ scopeSummary.overdue }}</strong>
            </span>
          </a-tooltip>
          <a-button v-if="hasFilters" type="link" size="small" danger @click="resetFilters">
            重置
          </a-button>
        </div>
      </div>
    </div>

    <!-- 借阅记录和逾期分布 -->
    <a-row :gutter="[16, 16]">
      <!-- 最近借阅 -->
      <a-col :xs="24" :lg="14">
        <div
          id="section-recent"
          :class="['card-container', 'equal-height', 'animate-fade-in', 'dashboard-section', { 'section-flash': flashSection === 'recent' }]"
          style="animation-delay: 0.5s"
        >
          <div class="card-header">
            <h3 class="card-title">
              <HistoryOutlined class="icon-spin" /> 最近借阅记录
              <span class="title-count">{{ recentBorrows.length }}</span>
            </h3>
            <a-button type="link" class="view-all-btn" @click="drill('recent')">
              查看全部 <RightOutlined />
            </a-button>
          </div>
          <div class="card-body">
            <template v-if="recentBorrows.length">
              <div class="borrow-list">
                <div
                  v-for="(record, index) in recentBorrows"
                  :key="record.id"
                  class="borrow-item hover-lift clickable"
                  :class="{ 'item-selected': overviewStore.lastDrill?.key === String(record.id) }"
                  :style="{ animationDelay: `${0.6 + index * 0.1}s` }"
                  @click="locateRecord(record)"
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
                    <a-tag v-if="getBookCategoryName(record.bookId)" color="blue" class="mini-tag">
                      {{ getBookCategoryName(record.bookId) }}
                    </a-tag>
                    <span class="borrow-date">{{ record.borrowDate }}</span>
                    <a-tag :color="getStatusColor(record.status)" class="status-tag">
                      {{ statusText(record.status) }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </template>
            <OverviewEmpty
              :type="recordEmptyType"
              entity="record"
              @reset="resetFilters"
              @add="$router.push('/borrow')"
            />
          </div>
        </div>
      </a-col>

      <!-- 逾期分布 -->
      <a-col :xs="24" :lg="10">
        <div
          id="section-overdue"
          :class="['card-container', 'equal-height', 'animate-fade-in', 'dashboard-section', { 'section-flash': flashSection === 'overdue' }]"
          style="animation-delay: 0.6s"
        >
          <div class="card-header">
            <h3 class="card-title">
              <WarningOutlined class="icon-pulse" /> 逾期分布
              <span class="title-count">{{ totalOverdueInScope }}</span>
            </h3>
            <a-button v-if="totalOverdueInScope > 0" type="link" class="view-all-btn" @click="drill('overdue')">
              逾期明细 <RightOutlined />
            </a-button>
          </div>
          <div class="card-body overdue-body">
            <template v-if="overdueVisible">
              <div v-if="totalOverdueInScope > 0" class="overdue-list">
                <div
                  v-for="(bucket, index) in overdueBuckets"
                  :key="bucket.key"
                  class="overdue-item clickable"
                  :class="{
                    'is-empty': bucket.count === 0,
                    'item-selected': overviewStore.lastDrill?.key === bucket.key
                  }"
                  :style="{ animationDelay: `${0.65 + index * 0.08}s` }"
                  @click="drillBucket(bucket)"
                >
                  <div class="overdue-head">
                    <span class="overdue-dot" :style="{ backgroundColor: bucket.color }"></span>
                    <span class="overdue-label">{{ bucket.label }}</span>
                    <span class="overdue-count">{{ bucket.count }} 条</span>
                  </div>
                  <div class="overdue-progress">
                    <div
                      class="overdue-progress-bar"
                      :style="{ width: `${(bucket.count / maxBucketCount) * 100}%`, backgroundColor: bucket.color }"
                    ></div>
                  </div>
                </div>
              </div>
              <OverviewEmpty v-else type="noOverdue" entity="record" @reset="resetFilters" />
            </template>
            <OverviewEmpty
              v-else
              :type="overdueEmptyType"
              entity="record"
              @reset="resetFilters"
            />
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 热门图书 -->
    <div
      id="section-hot"
      :class="['card-container', 'animate-fade-in', 'dashboard-section', 'hot-section', { 'section-flash': flashSection === 'hot' }]"
      style="margin-top: 16px; animation-delay: 0.7s"
    >
      <div class="card-header">
        <h3 class="card-title">
          <FireOutlined class="icon-fire" /> 热门图书推荐
          <span class="title-count">{{ hotBooks.length }}</span>
        </h3>
        <a-button type="link" class="view-all-btn" @click="drill('hot')">
          借阅明细 <RightOutlined />
        </a-button>
      </div>
      <div class="card-body">
        <template v-if="hotBooks.length">
          <a-row :gutter="[16, 16]">
            <a-col
              v-for="(book, index) in hotBooks.slice(0, 4)"
              :key="book.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <div
                class="book-card clickable"
                :class="{ 'item-selected': overviewStore.lastDrill?.key === `book-${book.id}` }"
                :style="{ animationDelay: `${0.7 + index * 0.08}s` }"
                @click="locateBook(book)"
              >
                <div class="hot-rank" :class="`rank-${index + 1}`">TOP{{ index + 1 }}</div>
                <div class="borrow-badge">
                  <FireOutlined /> {{ book.borrowCount }} 次借阅
                </div>
                <div class="book-cover">
                  <img :src="book.cover" :alt="book.title" />
                </div>
                <div class="book-info">
                  <h4 class="book-title">{{ book.title }}</h4>
                  <p class="book-author">{{ book.author }}</p>
                  <div class="book-meta">
                    <a-tag color="blue" class="category-tag">{{ book.categoryName }}</a-tag>
                    <span class="book-available">
                      <span class="stock-icon">📚</span>
                      {{ book.available }}/{{ book.total }}
                    </span>
                  </div>
                </div>
              </div>
            </a-col>
          </a-row>
        </template>
        <OverviewEmpty
          :type="bookEmptyType"
          entity="book"
          @reset="resetFilters"
          @add="$router.push('/books')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookOutlined,
  UserOutlined,
  SwapOutlined,
  WarningOutlined,
  HistoryOutlined,
  RightOutlined,
  FireOutlined,
  SearchOutlined,
  FilterOutlined,
  AimOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useBookStore } from '@/stores/book'
import { useReaderStore } from '@/stores/reader'
import { useBorrowStore } from '@/stores/borrow'
import { useCategoryStore } from '@/stores/category'
import { useOverview, STATUS_TEXT } from '@/composables/useOverview'
import OverviewEmpty from '@/components/OverviewEmpty.vue'

const router = useRouter()
const bookStore = useBookStore()
const readerStore = useReaderStore()
const borrowStore = useBorrowStore()
const categoryStore = useCategoryStore()

const {
  overviewStore,
  STATUS_OPTIONS,
  isRangeReversed,
  selectedCategory,
  isCategoryMissing,
  hasFilters,
  scopedRecords,
  recentBorrows,
  hotBooks,
  overdueBuckets,
  totalOverdueInScope,
  scopeSummary,
  resetFilters,
  buildBorrowQuery,
  rangeModel
} = useOverview()

const effectiveRangeText = computed(() => {
  const range = overviewStore.dateRange
  if (!range || range.length !== 2 || isRangeReversed.value) return ''
  return `${range[0]} ~ ${range[1]}`
})

// 分类删除后仍在下拉中保留一个「已删除」占位，避免选中值无回显
const categoryOptions = computed(() => {
  const list = categoryStore.categories.map(c => ({ ...c }))
  if (isCategoryMissing.value) {
    list.unshift({ id: overviewStore.categoryId, name: '已删除分类', __missing: true })
  }
  return list
})

const maxBucketCount = computed(() => {
  const counts = overdueBuckets.value.map(b => b.count)
  return Math.max(...counts, 1)
})

// 逾期分布卡片仅在状态口径允许出现逾期时展示内容
const overdueVisible = computed(() => !overviewStore.status || overviewStore.status === 'overdue')
const overdueEmptyType = computed(() => {
  if (borrowStore.records.length === 0) return 'noData'
  if (isRangeReversed.value) return 'reversed'
  if (isCategoryMissing.value) return 'missingCategory'
  if (scopedRecords.value.length === 0) return 'noMatch'
  return 'overdueStatus'
})

function emptyType(hasData) {
  if (borrowStore.records.length === 0) return 'noData'
  if (isRangeReversed.value) return 'reversed'
  if (isCategoryMissing.value) return 'missingCategory'
  if (!hasData && hasFilters.value) return 'noMatch'
  return 'noMatch'
}
const recordEmptyType = computed(() => emptyType(recentBorrows.value.length > 0))
const bookEmptyType = computed(() => {
  if (bookStore.books.length === 0) return 'noData'
  if (isRangeReversed.value) return 'reversed'
  if (isCategoryMissing.value) return 'missingCategory'
  return 'noMatch'
})

// 用户在概览上调整口径后，上次钻取定位不再适用
watch(
  () => [overviewStore.keyword, overviewStore.categoryId, overviewStore.status, overviewStore.dateRange],
  () => {
    if (overviewStore.lastDrill) overviewStore.lastDrill = null
  }
)

// ---- 钻取与定位 ----
function drill(section) {
  overviewStore.lastDrill = { section, key: null }
  router.push({ path: '/borrow', query: buildBorrowQuery({ section }) })
}

function locateByKeyword() {
  if (!hasFilters.value) {
    message.info('请先输入关键词或选择分类、状态、统计区间')
    return
  }
  overviewStore.lastDrill = { section: 'recent', key: null }
  router.push({ path: '/borrow', query: buildBorrowQuery({ section: 'recent' }) })
}

function locateRecord(record) {
  overviewStore.lastDrill = { section: 'recent', key: String(record.id) }
  router.push({
    path: '/borrow',
    query: buildBorrowQuery({ section: 'recent', recordId: record.id })
  })
}

function locateBook(book) {
  overviewStore.lastDrill = { section: 'hot', key: `book-${book.id}` }
  router.push({
    path: '/borrow',
    query: { ...buildBorrowQuery({ section: 'hot' }), bookId: String(book.id) }
  })
}

function drillBucket(bucket) {
  if (bucket.count === 0) {
    message.info(`${bucket.label}暂无记录`)
    return
  }
  overviewStore.lastDrill = { section: 'overdue', key: bucket.key }
  router.push({
    path: '/borrow',
    query: buildBorrowQuery({ section: 'overdue', bucket: bucket.key })
  })
}

// 顶部全局统计卡：只带状态，不带当前筛选口径（卡片是全局数字）
function drillFromStat(statStatus) {
  overviewStore.lastDrill = { section: statStatus, key: null }
  router.push({
    path: '/borrow',
    query: { from: 'overview', section: statStatus, status: statStatus }
  })
}

function goBooks() {
  router.push('/books')
}

// ---- 从明细返回概览：滚动并高亮上次定位的板块/条目 ----
const flashSection = ref(null)
let flashTimer = null

function restoreLastDrill() {
  const drillState = overviewStore.lastDrill
  if (!drillState || !drillState.section) return
  flashSection.value = drillState.section
  nextTick(() => {
    document.getElementById(`section-${drillState.section}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  })
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashSection.value = null
  }, 2400)
}

onMounted(restoreLastDrill)
onBeforeUnmount(() => clearTimeout(flashTimer))

const avatarColors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2']

function getAvatarColor(id) {
  return avatarColors[(Number(id) - 1) % avatarColors.length]
}

function getStatusColor(status) {
  const colors = {
    borrowed: 'processing',
    returned: 'success',
    overdue: 'error'
  }
  return colors[status] || 'default'
}

function statusText(status) {
  return STATUS_TEXT[status] || status
}

function getBookCategoryName(bookId) {
  return bookStore.getBookById(bookId)?.categoryName || ''
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

@keyframes sectionFlash {
  0% { box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.7); border-color: #1890ff; }
  100% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); border-color: #f0f0f0; }
}

@keyframes itemFlash {
  0% { background-color: #e6f7ff; }
  100% { background-color: transparent; }
}

// ========================================
// 动画类
// ========================================
.animate-fade-in {
  animation: fadeIn 0.5s ease-out both;
}

.animate-slide-up {
  animation: slideUp 0.5s ease-out both;
}

.hover-lift {
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #fafafa;
  }
}

.clickable {
  cursor: pointer;
}

// 返回概览时板块高亮
.dashboard-section.section-flash {
  animation: sectionFlash 2.4s ease-out;
  scroll-margin-top: 88px;
}

// 上次钻取选中项高亮（卡片、明细同口径对应）
.item-selected {
  background-color: #e6f7ff;
  animation: itemFlash 2.4s ease-out;
  border-radius: 8px;
}

// ========================================
// 主样式
// ========================================
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

// 统一口径筛选栏
.filter-bar {
  padding: 16px 20px;
  margin-bottom: 16px;

  .filter-search-icon {
    color: rgba(0, 0, 0, 0.45);
    cursor: pointer;

    &:hover {
      color: #1890ff;
    }
  }

  .filter-actions {
    text-align: right;
  }

  .filter-alert {
    margin-top: 12px;
    border-radius: 8px;
  }

  .scope-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    .scope-tags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;

      .scope-label {
        font-size: 13px;
        color: #666;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-right: 4px;
      }

      .scope-empty-hint {
        font-size: 12px;
        color: #bbb;
      }
    }

    .scope-counts {
      display: flex;
      align-items: center;
      gap: 14px;

      .scope-count {
        font-size: 13px;
        color: #666;

        strong {
          font-size: 16px;
          color: #1a1a1a;
          margin: 0 2px;
        }

        &.scope-count-link {
          cursor: pointer;

          &:hover {
            color: #1890ff;

            strong {
              color: #1890ff;
            }
          }
        }
      }
    }
  }
}

.card-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  border: 1px solid #f0f0f0;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: #e0e0e0;
  }

  &.equal-height {
    height: 100%;
    min-height: 340px;
    display: flex;
    flex-direction: column;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      .title-count {
        font-size: 12px;
        font-weight: 400;
        color: #999;
        background: #f5f5f5;
        border-radius: 10px;
        padding: 0 8px;
        line-height: 18px;
      }
    }

    .view-all-btn {
      transition: all 0.3s ease;

      &:hover {
        transform: translateX(2px);
      }
    }
  }

  .card-body {
    padding: 16px 20px;
    flex: 1;
    overflow: auto;
  }
}

// 借阅列表样式
.borrow-list {
  .borrow-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 8px;
    margin: 0 -8px;
    border-bottom: 1px solid #f5f5f5;
    border-radius: 8px;

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

      .mini-tag {
        margin-inline-end: 0;
        font-size: 11px;
        line-height: 16px;
      }
    }
  }
}

// 逾期分布样式
.overdue-body {
  padding-top: 8px;
}

.overdue-list {
  .overdue-item {
    padding: 12px 8px;
    margin: 0 -8px;
    border-bottom: 1px solid #f5f5f5;
    border-radius: 8px;
    transition: background-color 0.3s ease;

    &:last-child {
      border-bottom: none;
    }

    &:not(.is-empty):hover {
      background-color: #fafafa;
    }

    &.is-empty {
      cursor: default;
      opacity: 0.65;
    }

    .overdue-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      .overdue-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .overdue-label {
        font-size: 14px;
        color: #1a1a1a;
      }

      .overdue-count {
        margin-left: auto;
        font-size: 13px;
        color: #666;
      }
    }

    .overdue-progress {
      height: 6px;
      background: #f0f0f0;
      border-radius: 3px;
      overflow: hidden;

      .overdue-progress-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation: progressGrow 0.8s ease-out both;
      }
    }
  }
}

.book-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  position: relative;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: #1890ff;
  }

  .hot-rank {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.45);

    &.rank-1 { background: linear-gradient(135deg, #ff4d4f, #ff7a45); }
    &.rank-2 { background: linear-gradient(135deg, #fa8c16, #ffa940); }
    &.rank-3 { background: linear-gradient(135deg, #faad14, #ffc53d); }
  }

  .borrow-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    font-size: 11px;
    color: #ff4d4f;
    background: rgba(255, 255, 255, 0.92);
    padding: 2px 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 2px;
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
    padding: 16px;

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
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
</style>
