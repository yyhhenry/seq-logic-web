<script setup lang="ts">
import { FlexCard, HeaderText, PageLayout, SwitchDark } from 'luoluo-vue-components';
import { useTitle } from '@vueuse/core';
import websiteName from '@/utils/website-name';
import { ElImage } from 'element-plus';
useTitle(websiteName);
</script>

<template>
  <PageLayout>
    <template #header>
      <ElImage src="./favicon.png" fit="scale-down" :style="{ height: '3em' }" />
      <HeaderText>{{ websiteName }}</HeaderText>
    </template>
    <template #header-extra>
      <SwitchDark />
    </template>
    <FlexCard> Not implemented yet. </FlexCard>
  </PageLayout>
</template>
