<template>
  <div class="overview-empty">
    <InboxOutlined v-if="type === 'noData'" class="empty-icon" />
    <FilterOutlined v-else class="empty-icon" />
    <div class="empty-text">{{ display.text }}</div>
    <div v-if="display.desc" class="empty-desc">{{ display.desc }}</div>
    <a-space v-if="display.action === 'reset'" class="empty-actions" :size="8">
      <a-button size="small" @click="$emit('add')">
        <template #icon><PlusOutlined /></template>
        {{ entity === 'book' ? '新增图书' : '新增借阅' }}
      </a-button>
      <a-button type="link" size="small" @click="$emit('reset')">清除筛选</a-button>
    </a-space>
    <a-button v-else-if="display.action === 'resetOnly'" type="link" size="small" class="empty-actions" @click="$emit('reset')">
      清除筛选
    </a-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { InboxOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  // noData：系统中根本没有数据；reversed：日期反向；missingCategory：分类已删除；noMatch：有数据但筛选无结果；overdueStatus：当前状态非逾期
  type: { type: String, default: 'noMatch' },
  // book / record —— 用于新增按钮文案
  entity: { type: String, default: 'record' }
})

defineEmits(['reset', 'add'])

const bookText = {
  noData: { text: '暂无图书数据', desc: '可先新增图书或调整分类', action: 'reset' },
  reversed: { text: '统计区间开始日期晚于结束日期', desc: '请调整日期区间后查看热门图书', action: 'resetOnly' },
  missingCategory: { text: '所选分类已被删除', desc: '请重新选择分类查看热门图书', action: 'resetOnly' },
  noMatch: { text: '当前口径下暂无热门图书', desc: '试试调整分类、状态或统计区间', action: 'resetOnly' }
}

const recordText = {
  noData: { text: '暂无借阅记录', desc: '可先登记一条借阅记录', action: 'reset' },
  noOverdue: { text: '暂无逾期记录', desc: '当前没有逾期未还的借阅', action: 'resetOnly' },
  reversed: { text: '统计区间开始日期晚于结束日期', desc: '请调整日期区间后查看借阅数据', action: 'resetOnly' },
  missingCategory: { text: '所选分类已被删除', desc: '请重新选择分类查看借阅数据', action: 'resetOnly' },
  noMatch: { text: '当前口径下暂无借阅记录', desc: '试试调整分类、状态或统计区间', action: 'resetOnly' },
  overdueStatus: { text: '当前状态筛选下不存在逾期记录', desc: '逾期分布仅统计「已逾期」状态，可清除状态筛选', action: 'resetOnly' }
}

const display = computed(() =>
  (props.entity === 'book' ? bookText : recordText)[props.type] || recordText.noMatch
)
</script>

<style lang="less" scoped>
.overview-empty {
  padding: 32px 16px;
  text-align: center;

  .empty-icon {
    font-size: 36px;
    color: #d9d9d9;
    margin-bottom: 12px;
  }

  .empty-text {
    font-size: 14px;
    color: #666;
  }

  .empty-desc {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  .empty-actions {
    margin-top: 12px;
  }
}
</style>
