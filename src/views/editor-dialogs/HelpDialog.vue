<script setup lang="ts">
import { ElTabs, ElTabPane } from 'element-plus';
import { ref } from 'vue';
const tab = ref('file');
window.getSelection()?.empty();
</script>
<template>
  <ElTabs v-model="tab">
    <ElTabPane label="File" :name="'file'" class="help-dialog">
      <p>
        Import: To import file from built-in samples folder or any other location on your local
        machine, click on the import button and select the file you want to import.
      </p>
      <p>New: Choose a location on your local machine to save the file.</p>
    </ElTabPane>
    <ElTabPane label="Unit" :name="'unit'" class="help-dialog">
      <p>To import and paste at the same time with those popular components.</p>
    </ElTabPane>
    <ElTabPane label="Elem" :name="'elem'" class="help-dialog">
      <p>press A or click "Add node(A)" to clear selected items and to status: add-node</p>
      <p>
        press W or click "Add wire(W)" when selected items contains any node to clear non-node
        selected items and to status: add-wire
      </p>
      <p>press T or click "Add text(T)" to clear selected items to status: add-text</p>
      <p>press Esc or click "Stop" to status: idle</p>
      <p>press Del or click "Delete" to delete selected items</p>
      <p>
        Right Click on any element to open context menu and perform actions. Left drag on selected
        elements to move them.
      </p>
    </ElTabPane>
    <ElTabPane label="Edit" :name="'edit'" class="help-dialog">
      <p>
        Undo & Redo: Undo or redo the last action, you can also use Ctrl+Z or Ctrl+Y to undo or
        redo.
      </p>
      <p>
        Copy & Paste: Copy or paste the selected items, you can also use Ctrl+C or Ctrl+V to copy or
        paste.
      </p>
      <p>
        Viewport: Reset the viewport to the default position and default zoom level. Use Wheel to
        zoom in or out, use right drag or ctrl and left drag to move the viewport.
      </p>
      <p>
        Reset Time: Reset the time of all the clock and power-on reset node. Usually used after
        paste some elements with power-on reset node.
      </p>
      <p>
        Force Save: Force save the current file to the location you choose. In most cases we do not
        need to save manually, the file will be saved automatically when you close the editor. But
        after just change the viewport the auto save will not be triggered, so you can use this
        button to force save.
      </p>
    </ElTabPane>
  </ElTabs>
</template>

<style lang="scss" scoped>
.header-text {
  user-select: none;
  font-size: larger;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva,
    Verdana, sans-serif;
}
.margin-right {
  margin-right: 10px;
}
.help-dialog {
  user-select: text;
  p {
    margin: 10px 0;
  }
}
</style>
