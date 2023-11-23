<script setup lang="ts">
import { getUnitsMap } from '@/utils/seq-logic-units';
import { asyncComputed } from '@vueuse/core';
import { ElInput, ElSpace, ElButton, ElDivider } from 'element-plus';
import { computed, ref } from 'vue';
import { CenterLayout, HeaderText } from 'luoluo-vue-components';
import { Search } from '@element-plus/icons-vue';
defineEmits<{
  (event: 'add', name: string): void;
}>();
const text = ref('');
const allUnits = asyncComputed(
  async () => [...(await getUnitsMap()).keys()],
  [],
);
const units = computed(() =>
  text.value === ''
    ? allUnits.value
    : allUnits.value.filter((unit) =>
        unit.toLowerCase().includes(text.value.toLowerCase()),
      ),
);
</script>
<template>
  <ElInput v-model="text" :prefix-icon="Search"></ElInput>
  <ElDivider />
  <ElSpace wrap>
    <ElButton
      v-for="name of units"
      @click="$emit('add', name)"
      :key="name"
      :style="{ width: '200px' }"
    >
      <CenterLayout>
        <HeaderText> {{ name }}</HeaderText>
      </CenterLayout>
    </ElButton>
  </ElSpace>
</template>
