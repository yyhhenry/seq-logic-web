<script setup lang="ts">
import { Diagram, required } from '@/utils/seq-logic';
import { ElButton, ElRow, ElSwitch } from 'element-plus';
import { ref } from 'vue';
const props = defineProps<{
  diagram: Diagram;
  id: string;
}>();
const wire = ref(required(props.diagram.wires.get(props.id)));
const commit = () => {
  props.diagram.wires.set(props.id, wire.value);
  props.diagram.commit();
};
const onReverse = () => {
  [wire.value.start, wire.value.end] = [wire.value.end, wire.value.start];
  commit();
};
</script>
<template>
  <div v-if="wire">
    <ElRow :justify="'space-between'" :align="'middle'">
      <ElSwitch
        v-model="wire.not"
        :active-text="'Not Gate'"
        :inactive-text="'None'"
        @change="commit()"
      ></ElSwitch>
      <ElButton v-if="wire.not" @click="onReverse()" class="header-text"
        >Reverse</ElButton
      >
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.header-text {
  user-select: none;
  font-size: larger;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande',
    'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
}
</style>
