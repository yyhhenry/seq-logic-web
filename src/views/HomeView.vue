<script setup lang="ts">
import {
  CenterLayout,
  HeaderText,
  MiddleLayout,
  PageLayout,
  SwitchDark,
} from 'luoluo-vue-components';
import { useFileSystemAccess, useTitle } from '@vueuse/core';
import websiteName from '@/utils/website-name';
import { ElButton, ElDialog, ElImage, ElSpace } from 'element-plus';
import {
  Diagram,
  getBlankDiagramStorage,
  isDiagramStorage,
  type DiagramStorage,
} from '@/utils/seq-logic';
import { computed, ref } from 'vue';
import EditorView from './EditorView.vue';
import SamplesDialog from './editor-dialogs/SamplesDialog.vue';
import { getSample } from '@/utils/seq-logic-samples';
const fileAccess = useFileSystemAccess({
  dataType: 'Text',
  types: [
    { description: 'SeqLogic Diagram', accept: { 'text/json': ['.seq.json'] } },
  ],
  excludeAcceptAllOption: true,
});
const pageTitle = computed(() =>
  fileAccess.file.value
    ? `${fileAccess.file.value.name} - ${websiteName}`
    : websiteName,
);
useTitle(pageTitle);
const content = fileAccess.data;
const diagram = ref<Diagram>();
const onReload = () => {
  const storage = JSON.parse(content.value ?? '{}');
  if (isDiagramStorage(storage)) {
    diagram.value = new Diagram(storage);
  } else {
    throw new Error('Invalid diagram storage');
  }
};
const onSave = async (newContent?: string) => {
  if (newContent) {
    content.value = newContent;
  }
  if (fileAccess.file.value) {
    await fileAccess.save();
  }
};
const onOpen = async () => {
  await fileAccess.open();
  await onSave();
  onReload();
};
const onNew = async (storage?: DiagramStorage) => {
  await fileAccess.create();
  content.value = JSON.stringify(storage ?? getBlankDiagramStorage());
  await fileAccess.save();
  onReload();
};
const saveDiagram = async () => {
  if (diagram.value?.modified) {
    diagram.value.modified = false;
    await onSave(JSON.stringify(diagram.value.toStorage()));
  }
};
const samplesDialog = ref(false);
const onOpenSample = async (url: string) => {
  samplesDialog.value = false;
  const sample = await getSample(url);
  await onNew(sample);
};
const onShowSamples = () => {
  samplesDialog.value = true;
};
</script>

<template>
  <PageLayout>
    <template #header>
      <ElSpace>
        <ElImage
          src="./favicon.png"
          fit="scale-down"
          :style="{ height: '3em' }"
        />
        <HeaderText>{{ websiteName }}</HeaderText>
        <span v-if="fileAccess.file.value">{{
          fileAccess.file.value.name
        }}</span>
      </ElSpace>
    </template>
    <template #header-extra>
      <ElSpace>
        <ElButton :type="'danger'" @click="onShowSamples">Samples</ElButton>
        <ElButton :type="'danger'" @click="onNew()">New</ElButton>
        <ElButton :type="'primary'" @click="onOpen">Open</ElButton>
        <SwitchDark />
      </ElSpace>
    </template>
    <EditorView v-if="diagram" :save="saveDiagram" :diagram="diagram" />
    <MiddleLayout v-else>
      <CenterLayout>
        <HeaderText> Open a file or create a new one to start </HeaderText>
      </CenterLayout>
    </MiddleLayout>
  </PageLayout>
  <ElDialog v-model="samplesDialog">
    <SamplesDialog @open="onOpenSample" />
  </ElDialog>
</template>
