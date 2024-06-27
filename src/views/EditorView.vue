<script setup lang="ts">
import {
  ElMain,
  ElContainer,
  ElFooter,
  ElMessage,
  ElDropdown,
  ElDropdownItem,
  ElLink,
  ElDivider,
  ElDialog,
  ElSpace,
  ElButton,
} from 'element-plus';
import { HeaderText, LRMenu, PageLayout } from '@yyhhenry/element-extra';
import { Diagram, isDiagramStorage } from '@/utils/seq-logic';
import { computed, ref, watchEffect } from 'vue';
import { getPopularUnits, getUnit } from '@/utils/seq-logic-units';
import {
  useDebounceFn,
  useEventListener,
  useIntervalFn,
  useMouseInElement,
} from '@vueuse/core';
import animeFrame from '@/utils/anime-frame';
import EditNode from './editor-dialogs/EditNode.vue';
import EditWire from './editor-dialogs/EditWire.vue';
import EditText from './editor-dialogs/EditText.vue';
import HelpDialog from './editor-dialogs/HelpDialog.vue';
import UnitsDialog from './editor-dialogs/UnitsDialog.vue';
import { tryAsyncFn } from '@/utils/try-fn';
import WireView from '@/components/WireView.vue';
import NodeView from '@/components/NodeView.vue';
import TextView from '@/components/TextView.vue';
animeFrame.resetStart();
const props = defineProps<{
  save: () => Promise<void>;
  diagram: Diagram;
}>();

// Default action:
// - wheel to zoom
// - ctrl drag to move
// Show a error message if the operation is invalid
// (idle or add) {
// press A or click "Add node(A)" to clear selected items and to status: add-node
// press W or click "Add wire(W)" when selected items contains any node to clear non-node selected items and to status: add-wire
// press T or click "Add text(T)" to clear selected items to status: add-text
// (idle or add) }
// press Esc or click "Stop" to status: idle
// double click a node to status: edit-node
// double click a wire to status: edit-wire
// double click a text to status: edit-text

// status: idle
// drag to select with a box
// press Delete or click "Delete(Del)" when selected items contains any node, wire or text to delete them
// shift click to select multiple (XOR)
// click to select one node, wire or text
// click blank to clear selected items
// drag on selected to move selected nodes, wires and texts

// status: add-node
// preview a node at the mouse position
// click to add node
// click existing node to cancel and to status: idle

// status: add-wire
// click node to add wire from all selected nodes to the clicked node
// click blank to add one node and add wire from all selected nodes to the added node

// status: add-text
// preview a text like "New Text" at the mouse position
// click to add text to the clicked position

// status: edit-node
// show dialog to edit node and set the power

// status: edit-wire
// show dialog to edit wire and set the not gate

// status: edit-text
// show dialog to edit text and set the scale
type EditorStatus =
  | 'idle'
  | 'add-node'
  | 'add-wire'
  | 'add-text'
  | 'edit-node'
  | 'edit-wire'
  | 'edit-text'
  | 'docs-help'
  | 'docs-about'
  | 'docs-units';
const editorStatus = ref<EditorStatus>('idle');
type ItemType = 'node' | 'wire' | 'text';
const itemsTypeMap = {
  node: 'nodes',
  wire: 'wires',
  text: 'texts',
} satisfies Record<ItemType, ItemsType>;
const editStatusMap = {
  node: 'edit-node',
  wire: 'edit-wire',
  text: 'edit-text',
} satisfies Record<ItemType, EditorStatus>;
type ItemsType = `${ItemType}s`;
type SelectedItems = Record<ItemsType, Set<string>>;
const selectedItems = ref<SelectedItems>({
  nodes: new Set(),
  wires: new Set(),
  texts: new Set(),
});
const clearSelectedItems = () => {
  selectedItems.value = {
    nodes: new Set(),
    wires: new Set(),
    texts: new Set(),
  };
};
const selectedItemCount = computed(() => {
  return (
    selectedItems.value.nodes.size +
    selectedItems.value.wires.size +
    selectedItems.value.texts.size
  );
});
const hasSelectedItems = computed(() => {
  return selectedItemCount.value > 0;
});

const svgRef = ref<SVGSVGElement>();
const mouse = useMouseInElement(svgRef);
const mouseInView = computed(() => {
  const [x, y] = [mouse.elementX.value, mouse.elementY.value];
  const scale = props.diagram.viewport.scale ?? 1;
  return {
    x: x / scale - (props.diagram.viewport.x ?? 0),
    y: y / scale - (props.diagram.viewport.y ?? 0),
  };
});
const onUndo = () => {
  props.diagram.undo();
};
const onRedo = () => {
  props.diagram.redo();
};
const onCopy = async () => {
  const storage = props.diagram.extract(
    selectedItems.value.nodes,
    selectedItems.value.texts,
  );
  await navigator.clipboard.writeText(JSON.stringify(storage));
};
const onAddUnit = async (name: string) => {
  const unit = await getUnit(name);
  selectedItems.value = props.diagram.merge(unit) ?? selectedItems.value;
};
const onPaste = async () => {
  const result = await tryAsyncFn(async () => {
    const text = await navigator.clipboard.readText();
    const storage = JSON.parse(text);
    if (isDiagramStorage(storage)) {
      selectedItems.value = props.diagram.merge(storage) ?? selectedItems.value;
    } else {
      throw new Error('Invalid diagram storage');
    }
  });
  if (!result.ok) {
    ElMessage.error(
      result.e instanceof Error ? result.e.message : 'Unknown error',
    );
  }
};
const onResetTime = () => {
  animeFrame.resetStart();
  props.diagram.resetStatus();
};
const onResetViewport = () => {
  props.diagram.resetViewport();
};
const onSave = useDebounceFn(
  async () => {
    await props.save();
  },
  1000,
  { maxWait: 5000 },
);

const addingNode = ref<string>();
const wireEnd = ref<string>();

const onEscape = () => {
  if (editorStatus.value !== 'idle') {
    if (editorStatus.value.startsWith('add-')) {
      props.diagram.clearUncommitted();
      props.diagram.parse();
      if (editorStatus.value === 'add-node') {
        addingNode.value = undefined;
      } else if (editorStatus.value === 'add-wire') {
        addingNode.value = undefined;
        wireEnd.value = undefined;
      }
    }
    editorStatus.value = 'idle';
  }
};
const addNodeProc = (commit = false) => {
  if (!props.diagram) {
    throw new Error('diagram is undefined');
  }
  const node = {
    x: mouseInView.value.x,
    y: mouseInView.value.y,
    powered: false,
  };
  if (addingNode.value === undefined) {
    const id = props.diagram.addNode(node);
    props.diagram.parse();
    addingNode.value = id;
  } else {
    props.diagram.nodes.set(addingNode.value, node);
  }
  if (commit) {
    const id = addingNode.value;
    addingNode.value = undefined;
    props.diagram.commit();
    return id;
  }
  return addingNode.value;
};
const getNodeAtMouse = () => {
  if (!props.diagram) {
    throw new Error('diagram is undefined');
  }
  // return the last node that is close to the mouse
  // should not be the node being added
  let result = undefined as string | undefined;
  for (const [id, node] of props.diagram.nodes.entries()) {
    const [dx, dy] = [
      node.x - mouseInView.value.x,
      node.y - mouseInView.value.y,
    ];
    if (id === addingNode.value) {
      continue;
    }
    if (dx * dx + dy * dy < 100) {
      result = id;
    }
  }
  return result;
};
const addWireProc = (commit = false) => {
  if (!props.diagram) {
    throw new Error('diagram is undefined');
  }
  const nodeAtMouse = getNodeAtMouse();
  const end = nodeAtMouse ?? addingNode.value;
  const node = {
    x: mouseInView.value.x,
    y: mouseInView.value.y,
    powered: false,
  };
  if (
    wireEnd.value === undefined ||
    end === undefined ||
    end !== wireEnd.value
  ) {
    props.diagram.clearUncommitted();
    addingNode.value = undefined;
    wireEnd.value = undefined;
    if (nodeAtMouse === undefined) {
      addingNode.value = props.diagram.addNode(node);
      wireEnd.value = addingNode.value;
    } else {
      wireEnd.value = nodeAtMouse;
    }
    for (const id of selectedItems.value.nodes) {
      props.diagram.addWire({
        start: id,
        end: wireEnd.value,
        not: false,
      });
    }
    props.diagram.parse();
  } else if (addingNode.value !== undefined) {
    props.diagram.nodes.set(addingNode.value, node);
  }
  const result = wireEnd.value;
  if (commit) {
    props.diagram.commit();
    addingNode.value = undefined;
    wireEnd.value = undefined;
  }
  return result;
};
const addTextProc = (commit = false) => {
  if (!props.diagram) {
    throw new Error('diagram is undefined');
  }
  props.diagram.clearUncommitted();
  const id = props.diagram.addText({
    x: mouseInView.value.x,
    y: mouseInView.value.y,
    text: 'New Text',
    scale: 1,
  });
  if (commit) {
    props.diagram.commit();
  }
  return id;
};
const onAddNode = () => {
  onEscape();
  editorStatus.value = 'add-node';
  clearSelectedItems();
  addNodeProc();
};
const onAddWire = () => {
  onEscape();
  if (selectedItems.value.nodes.size === 0) {
    ElMessage.error('No node selected');
    return;
  }
  editorStatus.value = 'add-wire';
  selectedItems.value.wires = new Set();
  selectedItems.value.texts = new Set();
  addWireProc();
};
const onAddText = () => {
  onEscape();
  editorStatus.value = 'add-text';
  clearSelectedItems();
  addTextProc();
};
const onDelete = () => {
  if (editorStatus.value !== 'idle') {
    ElMessage.error('Cannot delete while editing');
    return;
  }
  selectedItems.value.wires.forEach((id) => {
    props.diagram.removeWire(id);
  });
  selectedItems.value.nodes.forEach((id) => {
    props.diagram.removeNode(id);
  });
  selectedItems.value.texts.forEach((id) => {
    props.diagram.removeText(id);
  });
  props.diagram.removeInvalidWires();
  props.diagram.commit();
  clearSelectedItems();
};
const onSelectAll = () => {
  if (editorStatus.value !== 'idle') {
    ElMessage.error('Cannot select all while editing');
    return;
  }
  selectedItems.value.nodes = new Set(props.diagram.nodes.keys() ?? []);
  selectedItems.value.wires = new Set(props.diagram.wires.keys() ?? []);
  selectedItems.value.texts = new Set(props.diagram.texts.keys() ?? []);
};
const onKeyUp = (e: KeyboardEvent) => {
  if (mousePath.value !== undefined) {
    return;
  }
  e.preventDefault();
  if (e.ctrlKey) {
    if (editorStatus.value !== 'idle') {
      return;
    }
    if (e.key === 'c') {
      onCopy();
    } else if (e.key === 'v') {
      onPaste();
    } else if (e.key === 'z') {
      onUndo();
    } else if (e.key === 'y') {
      onRedo();
    } else if (e.key === 's') {
      onSave();
    } else if (e.key === 'a') {
      onSelectAll();
    }
  } else if (!e.shiftKey) {
    if (
      editorStatus.value === 'idle' ||
      editorStatus.value.startsWith('add-')
    ) {
      if (e.key === 'a') {
        onAddNode();
      } else if (e.key === 'w') {
        onAddWire();
      } else if (e.key === 't') {
        onAddText();
      } else if (e.key === 'Escape') {
        onEscape();
      } else if (e.key === 'Delete' && editorStatus.value === 'idle') {
        onDelete();
      }
    }
  }
};
useEventListener('keyup', onKeyUp);
useIntervalFn(() => {
  props.diagram.fetchClock();
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    props.diagram.nextTick();
    if (Date.now() - now > 10) {
      break;
    }
  }
}, 1000 / 60);
watchEffect(() => {
  if (props.diagram.modified) {
    onSave();
  }
});
const onWheel = (e: WheelEvent) => {
  const viewport = props.diagram.viewport;
  const [x, y] = [mouse.elementX.value, mouse.elementY.value];
  viewport.x -= x / viewport.scale;
  viewport.y -= y / viewport.scale;
  if (e.deltaY > 0) {
    viewport.scale *= 1 - e.deltaY / 1000;
  } else {
    viewport.scale /= 1 + e.deltaY / 1000;
  }
  viewport.x += x / viewport.scale;
  viewport.y += y / viewport.scale;
  e.stopPropagation();
};
/**
 * x, y in view
 */
interface MousePath {
  x: number;
  y: number;
  mode: 'move-viewport' | 'drag-selected' | 'box-select' | 'box-toggle-select';
  activated: boolean;
}
const mousePath = ref<MousePath>();
const blockContentMenu = ref(false);
const onMouseDown = (
  e: MouseEvent,
  itemType: ItemType | 'blank',
  id: string,
) => {
  e.stopPropagation();
  if (editorStatus.value === 'idle') {
    mousePath.value = {
      x: mouseInView.value.x,
      y: mouseInView.value.y,
      mode:
        e.ctrlKey || e.button === 2
          ? 'move-viewport'
          : e.shiftKey
            ? 'box-toggle-select'
            : itemType === 'blank'
              ? 'box-select'
              : 'drag-selected',
      activated: false,
    };
    blockContentMenu.value = false;
    if (e.button === 0) {
      if (e.shiftKey) {
        if (itemType !== 'blank') {
          const itemsType = itemsTypeMap[itemType];
          if (selectedItems.value[itemsType].has(id)) {
            selectedItems.value[itemsType].delete(id);
          } else {
            selectedItems.value[itemsType].add(id);
          }
        }
      } else if (!e.ctrlKey) {
        if (itemType === 'blank') {
          clearSelectedItems();
        } else {
          const itemsType = itemsTypeMap[itemType];
          if (!selectedItems.value[itemsType].has(id)) {
            clearSelectedItems();
            selectedItems.value[itemsType].add(id);
          }
        }
      }
    }
  }
};
const onMouseUp = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (mousePath.value !== undefined) {
    if (
      mousePath.value.mode === 'box-select' ||
      mousePath.value.mode === 'box-toggle-select'
    ) {
      const [left, top] = [
        Math.min(mousePath.value.x, mouseInView.value.x),
        Math.min(mousePath.value.y, mouseInView.value.y),
      ];
      const [width, height] = [
        Math.abs(mousePath.value.x - mouseInView.value.x),
        Math.abs(mousePath.value.y - mouseInView.value.y),
      ];
      const inRange = (x: number, y: number) =>
        x >= left && x < left + width && y >= top && y < top + height;
      if (mousePath.value.mode === 'box-select') {
        clearSelectedItems();
      }
      for (const [id, node] of props.diagram.nodes.entries()) {
        if (inRange(node.x, node.y)) {
          if (
            mousePath.value.mode === 'box-toggle-select' &&
            selectedItems.value.nodes.has(id)
          ) {
            selectedItems.value.nodes.delete(id);
          } else {
            selectedItems.value.nodes.add(id);
          }
        }
      }
      for (const [id, text] of props.diagram.texts.entries()) {
        if (inRange(text.x, text.y)) {
          if (
            mousePath.value.mode === 'box-toggle-select' &&
            selectedItems.value.texts.has(id)
          ) {
            selectedItems.value.texts.delete(id);
          } else {
            selectedItems.value.texts.add(id);
          }
        }
      }
    } else if (mousePath.value.mode === 'drag-selected') {
      if (mousePath.value.activated) {
        props.diagram.commit();
      }
    }
    mousePath.value = undefined;
  } else if (editorStatus.value === 'add-node') {
    addNodeProc(true);
  } else if (editorStatus.value === 'add-text') {
    addTextProc(true);
  } else if (editorStatus.value === 'add-wire') {
    const newFocus = addWireProc(true);
    clearSelectedItems();
    selectedItems.value.nodes.add(newFocus);
  }
};
const onMove = (e: MouseEvent) => {
  if (mousePath.value !== undefined) {
    if (mousePath.value.mode === 'move-viewport') {
      const [dx, dy] = [
        mouseInView.value.x - mousePath.value.x,
        mouseInView.value.y - mousePath.value.y,
      ];
      if (
        !mousePath.value.activated &&
        Math.sqrt(dx * dx + dy * dy) * props.diagram.viewport.scale > 5
      ) {
        mousePath.value.activated = true;
      }
      if (mousePath.value.activated) {
        blockContentMenu.value = true;
        const viewport = props.diagram.viewport;
        viewport.x += e.movementX / viewport.scale;
        viewport.y += e.movementY / viewport.scale;
      }
    } else if (mousePath.value.mode === 'drag-selected') {
      const [dx, dy] = [
        mouseInView.value.x - mousePath.value.x,
        mouseInView.value.y - mousePath.value.y,
      ];
      if (
        !mousePath.value.activated &&
        Math.sqrt(dx * dx + dy * dy) * props.diagram.viewport.scale > 5
      ) {
        mousePath.value.activated = true;
      }
      if (mousePath.value.activated) {
        props.diagram.clearUncommitted();
        for (const id of selectedItems.value.wires) {
          const wire = props.diagram.wires.get(id);
          if (wire) {
            selectedItems.value.nodes.add(wire.start);
            selectedItems.value.nodes.add(wire.end);
          }
        }
        for (const id of selectedItems.value.nodes) {
          const node = props.diagram.nodes.get(id);
          if (node) {
            node.x += mouseInView.value.x - mousePath.value.x;
            node.y += mouseInView.value.y - mousePath.value.y;
            props.diagram.nodes.set(id, node);
          }
        }
        for (const id of selectedItems.value.texts) {
          const text = props.diagram.texts.get(id);
          if (text) {
            text.x += mouseInView.value.x - mousePath.value.x;
            text.y += mouseInView.value.y - mousePath.value.y;
            props.diagram.texts.set(id, text);
          }
        }
      }
    }
  } else if (editorStatus.value === 'add-node') {
    addNodeProc();
  } else if (editorStatus.value === 'add-text') {
    addTextProc();
  } else if (editorStatus.value === 'add-wire') {
    addWireProc();
  }
};
const onContextMenu = (e: MouseEvent, itemType: ItemType, id: string) => {
  if (editorStatus.value !== 'idle') return;
  if (blockContentMenu.value) return;
  e.preventDefault();
  onEscape();
  clearSelectedItems();
  const itemsType = itemsTypeMap[itemType];
  selectedItems.value[itemsType].add(id);
  editorStatus.value = editStatusMap[itemType];
};
const editNodeDialog = computed({
  get: () => editorStatus.value === 'edit-node',
  set: (v) => {
    if (!v) onEscape();
  },
});
const editWireDialog = computed({
  get: () => editorStatus.value === 'edit-wire',
  set: (v) => {
    if (!v) onEscape();
  },
});
const editTextDialog = computed({
  get: () => editorStatus.value === 'edit-text',
  set: (v) => {
    if (!v) onEscape();
  },
});
const onHelp = () => {
  onEscape();
  editorStatus.value = 'docs-help';
};
const onAbout = () => {
  onEscape();
  editorStatus.value = 'docs-about';
};
const helpDialog = computed({
  get: () => editorStatus.value === 'docs-help',
  set: (v) => {
    if (!v) onEscape();
  },
});
const aboutDialog = computed({
  get: () => editorStatus.value === 'docs-about',
  set: (v) => {
    if (!v) onEscape();
  },
});
const unitsDialog = computed({
  get: () => editorStatus.value === 'docs-units',
  set: (v) => {
    if (!v) onEscape();
  },
});
const onShowUnits = () => {
  onEscape();
  editorStatus.value = 'docs-units';
};
</script>
<template>
  <PageLayout :style="{ height: '100%' }">
    <template #header>
      <ElSpace>
        <ElButton :type="'danger'" @click="onSave()">Force Save</ElButton>
        <HeaderText>{{
          diagram.modified ? '⛷️Modifying' : '😊Saved'
        }}</HeaderText>
      </ElSpace>
    </template>
    <template #header-extra>
      <ElSpace>
        <ElDropdown>
          <ElLink>
            <span style="margin: 15px" class="header-text"> Unit </span>
          </ElLink>
          <template #dropdown>
            <div class="header-text">
              <ElDropdownItem :key="name" v-for="name of getPopularUnits()" @click="onAddUnit(name)">
                {{ name }}
              </ElDropdownItem>
              <ElDivider></ElDivider>
              <ElDropdownItem @click="onShowUnits()">
                Show More
              </ElDropdownItem>
            </div>
          </template>
        </ElDropdown>

        <ElDropdown>
          <ElLink>
            <span style="margin: 15px" class="header-text"> Elem </span>
          </ElLink>
          <template #dropdown>
            <div class="header-text">
              <ElDropdownItem @click="onAddNode()">
                Add Node (A)
              </ElDropdownItem>
              <ElDropdownItem :style="selectedItems.nodes.size
                  ? {}
                  : { color: 'var(--el-color-info)' }
                " @click="onAddWire()">
                Add Wire (W)
              </ElDropdownItem>
              <ElDropdownItem @click="onAddText()">
                Add Text (T)
              </ElDropdownItem>
              <ElDivider></ElDivider>
              <ElDropdownItem :style="editorStatus !== 'idle'
                  ? {}
                  : { color: 'var(--el-color-info)' }
                " @click="onEscape()">
                Stop (Esc)
              </ElDropdownItem>
              <ElDropdownItem :style="editorStatus == 'idle' && hasSelectedItems
                  ? {}
                  : { color: 'var(--el-color-info)' }
                " @click="onDelete()">
                Delete (Del)
              </ElDropdownItem>
            </div>
          </template>
        </ElDropdown>

        <ElDropdown>
          <ElLink>
            <span style="margin: 15px" class="header-text"> Edit </span>
          </ElLink>
          <template #dropdown>
            <div class="header-text">
              <ElDropdownItem @click="onUndo()"> Undo (Ctrl+Z) </ElDropdownItem>
              <ElDropdownItem @click="onRedo()"> Redo (Ctrl+Y) </ElDropdownItem>
              <ElDropdownItem :style="hasSelectedItems ? {} : { color: 'var(--el-color-info)' }
                " @click="onCopy()">
                Copy (Ctrl+C)
              </ElDropdownItem>
              <ElDropdownItem @click="onPaste()">
                Paste (Ctrl+V)
              </ElDropdownItem>
              <ElDivider></ElDivider>
              <ElDropdownItem @click="onResetViewport()">
                Reset Viewport
              </ElDropdownItem>
              <ElDropdownItem @click="onResetTime()">
                Reset Time
              </ElDropdownItem>
              <ElDropdownItem @click="onSave()">
                Force Save (Ctrl+S)
              </ElDropdownItem>
            </div>
          </template>
        </ElDropdown>

        <ElDropdown>
          <ElLink>
            <span style="margin: 15px" class="header-text"> Docs </span>
          </ElLink>
          <template #dropdown>
            <div class="header-text">
              <ElDropdownItem @click="onHelp()"> Help </ElDropdownItem>
              <ElDropdownItem @click="onAbout()"> About </ElDropdownItem>
            </div>
          </template>
        </ElDropdown>
      </ElSpace>
    </template>
    <ElContainer class="full-height full-width">
      <ElMain class="no-padding no-scroll">
        <svg class="full-height full-width" ref="svgRef" v-if="diagram !== undefined" @mousemove="(e) => onMove(e)"
          @wheel="(e) => onWheel(e)" @mousedown="(e) => onMouseDown(e, 'blank', '')" @mouseup="(e) => onMouseUp(e)"
          @contextmenu="(e) => e.preventDefault()">
          <g
            :transform="`scale(${diagram?.viewport.scale}), translate(${diagram?.viewport.x}, ${diagram?.viewport.y})`">
            <g>
              <path :stroke="'var(--el-text-color-primary)'" :stroke-width="2" :fill="'none'"
                d="M -40 0 L 1920 0 M 0 -40 L 0 1080"></path>
            </g>
            <g v-for="[id, wire] of diagram.wires.entries()" @mousedown="(e) => onMouseDown(e, 'wire', id)"
              @contextmenu="(e) => onContextMenu(e, 'wire', id)" :key="id">
              <WireView :wire="wire" :selected="selectedItems.wires.has(id)" :start="diagram.nodes.get(wire.start) ?? {
                  x: 0,
                  y: 0,
                  powered: false,
                }
                " :end="diagram.nodes.get(wire.end) ?? {
                    x: 0,
                    y: 0,
                    powered: false,
                  }
                  " :start-status="diagram.getNodeStatus(wire.start)"></WireView>
            </g>
            <g v-for="[id, node] of diagram.nodes.entries()" @mousedown="(e) => onMouseDown(e, 'node', id)"
              @contextmenu="(e) => onContextMenu(e, 'node', id)" :key="id">
              <NodeView :node="node" :selected="selectedItems.nodes.has(id)" :status="diagram.getNodeStatus(id)" />
            </g>
            <g v-for="[id, text] of diagram.texts.entries()" @mousedown="(e) => onMouseDown(e, 'text', id)"
              @contextmenu="(e) => onContextMenu(e, 'text', id)" :key="id">
              <TextView :text="text" :selected="selectedItems.texts.has(id)" />
            </g>
            <g v-if="
              mousePath?.mode == 'box-select' ||
              mousePath?.mode == 'box-toggle-select'
            ">
              <rect :x="Math.min(mousePath.x, mouseInView.x)" :y="Math.min(mousePath.y, mouseInView.y)"
                :width="Math.abs(mousePath.x - mouseInView.x)" :height="Math.abs(mousePath.y - mouseInView.y)"
                :stroke="'var(--el-color-primary)'" :stroke-width="1" :stroke-dasharray="'3 2'" :fill="'none'" />
            </g>
          </g>
        </svg>
      </ElMain>
      <ElFooter class="editor-footer" height="2rem">
        <LRMenu class="full-height">
          <div class="margin-in-line" :title="'Status'">
            {{ editorStatus }}
          </div>
          <div class="margin-in-line" :title="'Viewport'" v-if="diagram !== undefined">
            {{
              `${diagram.viewport.x.toFixed(2)}:${diagram.viewport.y.toFixed(
                2,
              )} #${diagram.viewport.scale.toFixed(2)}x`
            }}
          </div>
          <div class="margin-in-line" :title="'Mouse'">
            {{ `${mouseInView.x.toFixed(0)}:${mouseInView.y.toFixed(0)}` }}
          </div>
          <template #end>
            <div class="margin-in-line" :title="'Selected'">
              {{ `${selectedItemCount} selected` }}
            </div>
            <div class="margin-in-line" :title="'Time'">
              {{ `${(animeFrame.timestamp.value / 1000).toFixed(1)}s` }}
            </div>
          </template>
        </LRMenu>
      </ElFooter>
    </ElContainer>
  </PageLayout>
  <ElDialog v-model="editNodeDialog" :title="'Edit Node'" :width="400">
    <EditNode :key="editNodeDialog ? 1 : 0" v-if="diagram" :diagram="diagram" :id="[...selectedItems.nodes][0]">
    </EditNode>
  </ElDialog>
  <ElDialog v-model="editWireDialog" :title="'Edit Wire'" :width="400">
    <EditWire :key="editWireDialog ? 1 : 0" v-if="diagram" :diagram="diagram" :id="[...selectedItems.wires][0]">
    </EditWire>
  </ElDialog>
  <ElDialog v-model="editTextDialog" :title="'Edit Text'" :width="400">
    <EditText :key="editTextDialog ? 1 : 0" v-if="diagram" :diagram="diagram" :id="[...selectedItems.texts][0]">
    </EditText>
  </ElDialog>
  <ElDialog v-model="helpDialog" :title="'Help'">
    <HelpDialog v-if="helpDialog"></HelpDialog>
  </ElDialog>
  <ElDialog v-model="aboutDialog" :title="'About'">
    <p>Seq Logic Web</p>
    <p>Author: yyhhenry</p>
  </ElDialog>
  <ElDialog v-model="unitsDialog" :title="'Units'">
    <UnitsDialog v-if="unitsDialog" @add="(name) => {
        unitsDialog = false;
        onAddUnit(name);
      }
      "></UnitsDialog>
  </ElDialog>
</template>
<style lang="scss" scoped>
.no-padding {
  padding: 0;
}

.no-scroll {
  overflow: hidden;
}

.full-width {
  width: 100%;
}

.full-height {
  height: 100%;
}

.header-text {
  user-select: none;
  font-size: larger;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande',
    'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
}

.editor-footer {
  border-top: solid 2px var(--el-border-color);
  user-select: none;
}

.margin-in-line {
  margin-right: 10px;
}
</style>
