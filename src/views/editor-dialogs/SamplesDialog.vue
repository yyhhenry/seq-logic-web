<script setup lang="ts">
import { getSamplesMap } from '@/utils/seq-logic-samples';
import { asyncComputed } from '@vueuse/core';
import { ElInput } from 'element-plus';
import { computed, ref } from 'vue';
import { HeaderText } from '@yyhhenry/element-extra';
import { Search } from '@element-plus/icons-vue';
defineEmits<{
  (event: 'open', url: string): void;
}>();
const text = ref('');
const allSamples = asyncComputed(
  async () => [...(await getSamplesMap()).entries()],
  [],
);
const samples = computed(() =>
  text.value === ''
    ? allSamples.value
    : allSamples.value.filter(([name]) =>
      name.toLowerCase().includes(text.value.toLowerCase()),
    ),
);
</script>
<template>
  <HeaderText> New From Samples </HeaderText>
  <div :style="{ marginTop: '15px', marginBottom: '15px' }">
    <ElInput v-model="text" :prefix-icon="Search"></ElInput>
  </div>
  <div v-for="[name, url] of samples" @click="$emit('open', url)" :key="url" :class="[$style.option]">
    <HeaderText> {{ name }} </HeaderText>
  </div>
</template>

<style module>
.option {
  margin-top: 5px;
  padding: 20px;
  background-color: var(--el-bg);
  border-bottom: 1px solid var(--ex-border-color);
}

.option:hover {
  cursor: pointer;
  background-color: var(--ex-active-bg);
}
</style>
