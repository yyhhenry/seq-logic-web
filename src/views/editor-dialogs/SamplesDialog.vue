<script setup lang="ts">
import { getSamplesMap } from '@/utils/seq-logic-samples';
import { asyncComputed } from '@vueuse/core';
import { ElInput, ElSpace, ElButton, ElDivider } from 'element-plus';
import { computed, ref } from 'vue';
import { CenterLayout, HeaderText } from 'luoluo-vue-components';
import { Search } from '@element-plus/icons-vue';
defineEmits<{
  (event: 'open', url: string): void;
}>();
const text = ref('');
const allSamples = asyncComputed(async () => [...(await getSamplesMap()).entries()], []);
const samples = computed(() =>
  text.value == ''
    ? allSamples.value
    : allSamples.value.filter(([name]) => name.toLowerCase().includes(text.value.toLowerCase())),
);
</script>
<template>
  <ElInput v-model="text" :prefix-icon="Search"></ElInput>
  <ElDivider />
  <ElSpace wrap>
    <ElButton
      v-for="[name, url] of samples"
      @click="$emit('open', url)"
      :key="url"
      :style="{ width: '200px' }"
    >
      <CenterLayout>
        <HeaderText> {{ name }} </HeaderText>
      </CenterLayout>
    </ElButton>
  </ElSpace>
</template>
