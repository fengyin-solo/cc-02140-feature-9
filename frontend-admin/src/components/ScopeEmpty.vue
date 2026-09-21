<template>
  <div :class="['scope-empty', { compact }]">
    <div class="scope-empty-icon">
      <WarningOutlined v-if="variant === 'reversed' || variant === 'missing-category'" class="warn" />
      <FilterOutlined v-else-if="variant === 'status-excluded'" class="muted" />
      <InboxOutlined v-else class="muted" />
    </div>
    <div class="scope-empty-title">{{ meta.title }}</div>
    <div class="scope-empty-desc">{{ meta.description }}</div>
    <div class="scope-empty-actions">
      <slot>
        <a-button v-if="variant !== 'no-data-at-all'" type="link" size="small" @click="$emit('clear')">
          <ReloadOutlined /> {{ clearText }}
        </a-button>
        <a-button v-if="variant === 'status-excluded'" type="link" size="small" @click="$emit('show-overdue')">
          查看逾期口径
        </a-button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  InboxOutlined,
  WarningOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  // no-data-at-all 系统无数据 | no-result 筛选无结果 | reversed 日期反向
  // missing-category 分类已删除 | status-excluded 当前状态口径不包含本卡片数据
  variant: { type: String, default: 'no-result' },
  entity: { type: String, default: '记录' },
  compact: { type: Boolean, default: false }
})

defineEmits(['clear', 'show-overdue'])

const clearText = computed(() => {
  if (props.variant === 'reversed') return '保留区间，我手动调整'
  if (props.variant === 'missing-category') return '清除已删除分类'
  return '清除筛选条件'
})

const meta = computed(() => {
  switch (props.variant) {
    case 'no-data-at-all':
      return { title: `暂无${props.entity}数据`, description: '系统当前没有任何相关数据，可先前往对应页面新增。' }
    case 'reversed':
      return { title: '日期区间反向', description: '开始日期晚于结束日期，已保留你的选择且不自动交换，请调整后再试。' }
    case 'missing-category':
      return { title: '所选分类已被删除', description: '上次定位的分类已不存在，已保留该定位条件，可清除后重新选择。' }
    case 'status-excluded':
      return { title: `当前口径下无${props.entity}`, description: '该卡片仅统计「已逾期」记录，当前借阅状态筛选不包含逾期。' }
    default:
      return { title: `未找到匹配的${props.entity}`, description: '当前分类、状态、统计区间或关键字组合下没有数据，可调整筛选条件。' }
  }
})
</script>

<style lang="less" scoped>
.scope-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  text-align: center;

  &.compact {
    padding: 20px 12px;
  }

  .scope-empty-icon {
    font-size: 36px;
    margin-bottom: 12px;

    .warn {
      color: #faad14;
    }

    .muted {
      color: #bfbfbf;
    }
  }

  .scope-empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #595959;
    margin-bottom: 4px;
  }

  .scope-empty-desc {
    font-size: 12px;
    color: #999;
    line-height: 1.6;
    max-width: 280px;
  }

  .scope-empty-actions {
    margin-top: 8px;
    display: flex;
    gap: 4px;
  }
}
</style>
