<script setup lang="ts">
import { getUnitsMap } from '@/utils/seq-logic-units';
import { asyncComputed } from '@vueuse/core';
import { ElTabs, ElTabPane, ElInput, ElCard, ElRow, ElScrollbar } from 'element-plus';
import { computed, ref } from 'vue';
defineEmits<{
  (event: 'add', name: string): void;
}>();
const text = ref('');
const allUnits = asyncComputed(async () => [...(await getUnitsMap()).keys()], []);
const units = computed(() =>
  text.value == ''
    ? allUnits.value
    : allUnits.value.filter((unit) => unit.toLowerCase().includes(text.value.toLowerCase())),
);
</script>
<template>
  <ElInput v-model="text"></ElInput>
  <ElCard v-for="name of units" @click="$emit('add', name)" class="unit-card" :key="name">
    <ElRow :justify="'center'" :align="'middle'">
      {{ name }}
    </ElRow>
  </ElCard>
</template>

<style lang="scss" scoped>
.unit-card {
  margin: 5px;
  :hover {
    cursor: pointer;
    background-color: var(--color-background-mute);
  }
}
</style>
