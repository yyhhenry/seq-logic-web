<script setup lang="ts">
import {
  CenterLayout,
  FlexCard,
  HeaderText,
  MiddleLayout,
  PageLayout,
  SwitchDark,
} from 'luoluo-vue-components';
import { CloseBold } from '@element-plus/icons-vue';
import { useFileSystemAccess, useTitle } from '@vueuse/core';
import websiteName from '@/utils/website-name';
import { ElButton, ElImage, ElSpace } from 'element-plus';
import { getBlankDiagramStorage } from '@/utils/seq-logic';
import { isString } from 'lodash';
useTitle(websiteName);
const fileAccess = useFileSystemAccess({
  dataType: 'Text',
  types: [{ description: 'SeqLogic Diagram', accept: { 'text/json': ['.seq.json'] } }],
  excludeAcceptAllOption: true,
});
const content = fileAccess.data;
const onSave = async () => {
  if (fileAccess.file.value) {
    await fileAccess.save();
  }
};
const onOpen = async () => {
  if (fileAccess.file.value) {
    await fileAccess.save();
  }
  await fileAccess.open();
  await onSave();
};
const onNew = async () => {
  if (fileAccess.file.value) {
    await fileAccess.save();
  }
  await fileAccess.create();
  content.value = JSON.stringify(getBlankDiagramStorage());
  await fileAccess.save();
};
</script>

<template>
  <PageLayout>
    <template #header>
      <ElSpace>
        <ElImage src="./favicon.png" fit="scale-down" :style="{ height: '3em' }" />
        <HeaderText>{{ websiteName }}</HeaderText>
        <span v-if="fileAccess.file.value">{{ fileAccess.file.value.name }}</span>
        <ElButton :type="'danger'" :icon="CloseBold" circle v-if="fileAccess.file.value"></ElButton>
      </ElSpace>
    </template>
    <template #header-extra>
      <ElSpace>
        <ElButton :type="'danger'" @click="onNew()">新建</ElButton>
        <ElButton :type="'primary'" @click="onOpen()">打开</ElButton>
        <SwitchDark />
      </ElSpace>
    </template>
    <FlexCard v-if="isString(content)">
      <p>{{ content }}</p>
    </FlexCard>
    <MiddleLayout v-else>
      <CenterLayout>
        <HeaderText>打开文件以开始</HeaderText>
      </CenterLayout>
    </MiddleLayout>
  </PageLayout>
</template>
