<script setup lang="ts">
import { Diagram, required } from '@/utils/seq-logic';
import { ElInput, ElInputNumber, ElRow } from 'element-plus';
import { ref } from 'vue';
const props = defineProps<{
  diagram: Diagram;
  id: string;
}>();
const text = ref(required(props.diagram.texts.get(props.id)));
const commit = () => {
  text.value.text = text.value.text.trim();
  props.diagram.texts.set(props.id, text.value);
  props.diagram.commit();
};
</script>
<template>
  <div v-if="text">
    <ElInput v-model="text.text" @change="commit()"> </ElInput>
    <ElRow :justify="'space-between'" :align="'middle'" style="margin: 10px">
      <div class="header-text">Scale (x16pt)</div>
      <ElInputNumber v-model="text.scale" :min="0.2" :max="5" :step="0.1" @change="commit()">
      </ElInputNumber>
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.header-text {
  user-select: none;
  font-size: larger;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva,
    Verdana, sans-serif;
}
</style>
