<script setup lang="ts">
import {
  Diagram,
  required,
  getPoweredType,
  isValidPoweredType,
  maxClockDuration,
  powerOnDuration,
} from '@/utils/seq-logic';
import {
  ElInputNumber,
  ElRow,
  ElSwitch,
  ElTabPane,
  ElTabs,
} from 'element-plus';
import { computed, ref } from 'vue';
const props = defineProps<{
  diagram: Diagram;
  id: string;
}>();
const node = ref(required(props.diagram.nodes.get(props.id)));
const commit = () => {
  props.diagram.nodes.set(props.id, node.value);
  props.diagram.commit();
};
const tab = computed({
  get: () => getPoweredType(node.value.powered),
  set: (newTab) => {
    console.log(newTab, node.value.powered);
    if (isValidPoweredType(newTab)) {
      if (newTab === 'general') {
        node.value.powered = false;
        commit();
      } else if (newTab === 'clock') {
        node.value.powered = {
          duration: 1000,
          offset: 0,
        };
        commit();
      } else if (newTab === 'power-on') {
        node.value.powered = {
          duration: -powerOnDuration,
          offset: 1000,
        };
        commit();
      }
    }
  },
});
</script>
<template>
  <div v-if="node">
    <ElTabs v-model="tab">
      <ElTabPane label="General" :name="'general'">
        <ElRow :justify="'center'" :align="'middle'">
          <ElSwitch v-if="typeof node.powered === 'boolean'" v-model="node.powered" :active-text="'Powered'"
            :inactive-text="'Off'" @change="commit()"></ElSwitch>
        </ElRow>
      </ElTabPane>
      <ElTabPane label="Clock" :name="'clock'">
        <div v-if="typeof node.powered === 'object' && tab === 'clock'">
          <ElRow :justify="'space-between'" :align="'middle'">
            <span class="header-text margin-right">Duration (ms)</span>
            <ElInputNumber v-model="node.powered.duration" :controls-position="'right'" :min="200"
              :max="maxClockDuration" :step="100" @change="commit()">
            </ElInputNumber>
          </ElRow>
          <ElRow :justify="'space-between'" :align="'middle'">
            <span class="header-text margin-right">Offset (ms)</span>
            <ElInputNumber v-model="node.powered.offset" :controls-position="'right'" :min="0"
              :max="2 * node.powered.duration" :step="100" @change="commit()">
            </ElInputNumber>
          </ElRow>
        </div>
      </ElTabPane>
      <ElTabPane label="Power-on Reset" :name="'power-on'">
        <ElRow :justify="'space-between'" :align="'middle'"
          v-if="typeof node.powered === 'object' && tab === 'power-on'">
          <span class="header-text margin-right">Duration (ms)</span>
          <ElInputNumber v-model="node.powered.offset" :controls-position="'right'" :min="200" :max="maxClockDuration"
            :step="100" @change="commit()">
          </ElInputNumber>
        </ElRow>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<style lang="scss" scoped>
.header-text {
  user-select: none;
  font-size: larger;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande',
    'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
}

.margin-right {
  margin-right: 10px;
}
</style>
