import { cloneDeep, random } from 'lodash';
import { v4 as uuid } from 'uuid';
import { type MaybeObject, isObjectMaybe, isObjectOf } from './types';
import { ElMessage } from 'element-plus';
import animeFrame from './anime-frame';
// import { fs } from '@tauri-apps/api';
interface Coordinate {
  x: number;
  y: number;
}
export const isCoordinate = <T extends Coordinate>(
  u: unknown,
): u is Coordinate & MaybeObject<T> => {
  return isObjectMaybe<Coordinate>(u) && typeof u.x === 'number' && typeof u.y === 'number';
};
export interface Clock {
  offset: number;
  duration: number;
}
export const isClock = (u: unknown): u is Clock => {
  return isObjectMaybe<Clock>(u) && typeof u.offset === 'number' && typeof u.duration === 'number';
};
export interface Node extends Coordinate {
  powered: boolean | Clock;
}
export const isNode = (u: unknown): u is Node => {
  return isCoordinate<Node>(u) && (typeof u.powered === 'boolean' || isClock(u.powered));
};
export interface Wire {
  start: string;
  end: string;
  not: boolean;
}
export const isWire = (u: unknown): u is Wire => {
  return (
    isObjectMaybe<Wire>(u) &&
    typeof u.start === 'string' &&
    typeof u.end === 'string' &&
    typeof u.not === 'boolean'
  );
};
export interface Text extends Coordinate {
  text: string;
  scale: number;
}
export const isText = (u: unknown): u is Text => {
  return isCoordinate<Text>(u) && typeof u.text === 'string' && typeof u.scale === 'number';
};
export interface Viewport extends Coordinate {
  scale: number;
}
export const isViewport = (u: unknown): u is Viewport => {
  return isCoordinate<Viewport>(u) && typeof u.scale === 'number' && u.scale > 0;
};
export interface DiagramStorage {
  nodes: Record<string, Node>;
  wires: Record<string, Wire>;
  texts: Record<string, Text>;
  viewport: Viewport;
}
export const isDiagramStorage = (u: any): u is DiagramStorage => {
  return (
    isObjectMaybe<DiagramStorage>(u) &&
    isObjectOf(u.nodes, isNode) &&
    isObjectOf(u.wires, isWire) &&
    isObjectOf(u.texts, isText) &&
    isViewport(u.viewport)
  );
};
export interface Status {
  powered: boolean;
  active: boolean;
  nextTick?: number;
}
interface BaseModification<T> {
  deleted?: T;
  inserted?: T;
}
type Operation<T> = Map<string, BaseModification<T>>;

/**
 * History of a map.
 * Remember to call `commit()` after every independent operation.
 */
export class History<T> {
  private items: Map<string, T>;
  private operations: Operation<T>[];
  /**
   * Pointer to the first record to redo.
   */
  private head: number;
  private cache: Operation<T>;
  constructor(items: Map<string, T>) {
    this.items = items;
    this.operations = [];
    this.head = 0;
    this.cache = new Map();
  }
  has(id: string) {
    return this.items.has(id);
  }
  /**
   * After modifying, you should set it back.
   */
  get(id: string) {
    const origin = this.items.get(id);
    return cloneDeep(origin);
  }
  /**
   * Should not modify the returned value.
   */
  entries() {
    return this.items.entries();
  }
  /**
   * Should not modify the returned value.
   */
  values() {
    return this.items.values();
  }
  keys() {
    return this.items.keys();
  }
  delete(id: string) {
    const origin = this.items.get(id);
    if (origin == undefined) {
      return;
    }
    const item = this.cache.get(id);
    if (item) {
      item.inserted = undefined;
    } else {
      this.cache.set(id, { deleted: origin });
    }
    this.items.delete(id);
  }
  set(id: string, value: T) {
    const origin = this.items.get(id);
    const item = this.cache.get(id);
    const inserted = cloneDeep(value);
    if (item) {
      item.inserted = inserted;
    } else {
      this.cache.set(id, { inserted, deleted: origin });
    }
    this.items.set(id, inserted);
  }
  /**
   * End modifying.
   */
  commit() {
    while (this.operations.length > this.head) {
      this.operations.pop();
    }
    this.operations.push(this.cache);
    this.cache = new Map();
    this.head++;
  }
  /**
   * Clear all uncommitted operations.
   */
  clearUncommitted() {
    for (const [id, value] of this.cache.entries()) {
      if (value.deleted) {
        this.items.set(id, value.deleted);
      } else {
        this.items.delete(id);
      }
    }
    this.cache = new Map();
  }
  hasUncommitted() {
    return this.cache.size != 0;
  }
  undo() {
    if (this.cache.size != 0) {
      throw new Error('Cannot undo while modifying.');
    }
    if (this.head <= 0) {
      return false;
    }
    this.head--;
    const cur = this.operations[this.head];
    for (const [id, value] of cur.entries()) {
      if (value.deleted) {
        this.items.set(id, value.deleted);
      } else {
        this.items.delete(id);
      }
    }
    return true;
  }
  redo() {
    if (this.cache.size != 0) {
      throw new Error('Cannot redo while modifying.');
    }
    if (this.head >= this.operations.length) {
      return false;
    }
    const cur = this.operations[this.head];
    for (const [id, value] of cur.entries()) {
      if (value.inserted) {
        this.items.set(id, value.inserted);
      } else {
        this.items.delete(id);
      }
    }
    this.head++;
    return true;
  }
}
export const notNullAssertion = <T>(value: T | undefined | null): T => {
  if (value == null) {
    throw new Error('value is null');
  }
  return value;
};
export const required = notNullAssertion;
export const remarkId = (storage: DiagramStorage) => {
  const nodeIdMapping = new Map(
    [...Object.keys(storage.nodes)].map((id) => [id, uuid()] satisfies [string, string]),
  );
  const nodes = Object.fromEntries(
    Object.entries(storage.nodes).map(
      ([id, node]) => [required(nodeIdMapping.get(id)), node] satisfies [string, Node],
    ),
  );
  const wires = Object.fromEntries(
    Object.values(storage.wires).map(
      (wire) =>
        [
          uuid(),
          {
            start: required(nodeIdMapping.get(wire.start)),
            end: required(nodeIdMapping.get(wire.end)),
            not: wire.not,
          },
        ] satisfies [string, Wire],
    ),
  );
  const texts = Object.fromEntries(
    Object.values(storage.texts).map((text) => [uuid(), text] satisfies [string, Text]),
  );
  return cloneDeep({
    nodes,
    wires,
    texts,
    viewport: storage.viewport,
  } satisfies DiagramStorage);
};
export const maxClockDuration = 10000;
export const powerOnDuration = 1e12;
export const validPoweredType = ['general', 'clock', 'power-on'] as const;
export type ValidPoweredType = (typeof validPoweredType)[number];
export const isValidPoweredType = (tab: string | number): tab is ValidPoweredType =>
  typeof tab == 'string' && (validPoweredType as readonly unknown[]).includes(tab);
export const getPoweredType = (powered: boolean | Clock): ValidPoweredType => {
  if (typeof powered === 'boolean') {
    return 'general';
  } else if (powered.duration < 0) {
    return 'power-on';
  } else {
    return 'clock';
  }
};
export function getPowered(powered: boolean | Clock): boolean {
  if (typeof powered === 'boolean') {
    return powered;
  } else {
    const cur = animeFrame.timestamp.value - powered.offset;
    const idx = Math.floor(cur / powered.duration);
    return idx % 2 === 0;
  }
}
export function isWiresValid(storage: DiagramStorage) {
  // check if all wires are valid
  // (start, end) should be unique, start != end, start and end should be valid node id
  const wires = Object.values(storage.wires);
  const nodeIds = Object.keys(storage.nodes);
  if (wires.some((wire) => wire.start === wire.end)) {
    return false;
  }
  if (wires.some((wire) => !nodeIds.includes(wire.start))) {
    return false;
  }
  if (wires.some((wire) => !nodeIds.includes(wire.end))) {
    return false;
  }
  const wireSet = new Set(wires.map((wire) => JSON.stringify([wire.start, wire.end])));
  if (wireSet.size !== wires.length) {
    return false;
  }
  return true;
}
/**
 * A diagram.
 *
 * 更新后调用commit()，如果不需要re-parse，就传入false。
 * You should not update the existence of the nodes, wires and texts. You should call add and remove instead.
 * When updating the viewport, no need to call anything and there is no history.
 *
 */
export class Diagram {
  nodes: History<Node>;
  wires: History<Wire>;
  texts: History<Text>;
  viewport: Viewport;

  private status: Map<string, Status>;
  private toggle: Map<number, Set<string>>;
  private current: number;
  private wirePairSet: Set<string>;
  private groupRoot: Map<string, string>;
  private updatePrecursors: Map<string, Set<string>>;
  private updateSuccessors: Map<string, Set<string>>;

  modified: boolean;

  /**
   * 在Vue的响应式语法影响下，禁止在构造函数中添加未来可能会被监听的this属性，所有this属性必须由当前方法立即得到
   */
  constructor(storage: DiagramStorage) {
    storage = cloneDeep(storage);
    if (!isWiresValid(storage)) {
      ElMessage.error('Invalid wires');
      storage = getBlankDiagramStorage();
    }
    function recordToMap<T>(record: Record<string, T>) {
      return new History(new Map(Object.entries(record)));
    }
    this.nodes = recordToMap(storage.nodes);
    this.wires = recordToMap(storage.wires);
    this.texts = recordToMap(storage.texts);
    this.status = new Map(
      [...this.nodes.entries()].map(([id, { powered }]) => [
        id,
        getPowered(powered) ? { active: true, powered: true } : { active: false, powered: false },
      ]),
    );
    this.toggle = new Map();
    this.current = 0;
    this.viewport = storage.viewport;
    this.groupRoot = new Map();
    this.updatePrecursors = new Map();
    this.updateSuccessors = new Map();
    this.modified = false;
    this.wirePairSet = new Set();
    this.parse();
  }
  private activateAll() {
    for (const [id, value] of this.groupRoot.entries()) {
      if (id == value) {
        this.activate(id);
      }
    }
  }
  private getGroupRoot(nodeId: string): string {
    const fa = required(this.groupRoot.get(nodeId));
    if (fa == nodeId) {
      return nodeId;
    }
    const result = this.getGroupRoot(fa);
    this.groupRoot.set(nodeId, result);
    return result;
  }
  resetStatus() {
    this.status = new Map(
      [...this.nodes.entries()].map(([id, { powered }]) => [
        id,
        getPowered(powered) ? { active: true, powered: true } : { active: false, powered: false },
      ]),
    );
    this.activateAll();
  }
  /**
   * Parse the diagram and build the data structure.
   */
  parse() {
    this.wirePairSet = new Set();
    for (const wire of this.wires.values()) {
      this.wirePairSet.add(JSON.stringify([wire.start, wire.end]));
      this.wirePairSet.add(JSON.stringify([wire.end, wire.start]));
    }
    for (const id of this.nodes.keys()) {
      if (this.status.get(id) == null) {
        this.status.set(id, { active: false, powered: false });
      }
    }
    const needToRemove = new Set<string>();
    for (const [id, status] of this.status.entries()) {
      const node = this.nodes.get(id);
      if (node == null) {
        needToRemove.add(id);
      } else {
        status.powered = getPowered(node.powered);
      }
    }
    for (const id of needToRemove) {
      const nextTick = this.status.get(id)?.nextTick;
      if (nextTick != null) {
        this.toggle.get(nextTick)?.delete(id);
      }
      this.status.delete(id);
    }
    this.groupRoot = new Map([...this.nodes.entries()].map(([id]) => [id, id]));
    for (const wire of this.wires.values()) {
      if (wire.not) {
        continue;
      }
      const start = this.getGroupRoot(wire.start);
      const end = this.getGroupRoot(wire.end);
      if (start == end) {
        continue;
      }
      this.groupRoot.set(start, end);
      required(this.status.get(end)).powered ||= required(this.status.get(start)).powered;
    }
    for (const id of this.nodes.keys()) {
      this.getGroupRoot(id);
    }
    this.updatePrecursors = new Map([...this.nodes.entries()].map(([id]) => [id, new Set()]));
    this.updateSuccessors = new Map([...this.nodes.entries()].map(([id]) => [id, new Set()]));
    for (const wire of this.wires.values()) {
      if (!wire.not) {
        continue;
      }
      const start = this.getGroupRoot(wire.start);
      const end = this.getGroupRoot(wire.end);
      required(this.updatePrecursors.get(end)).add(start);
      required(this.updateSuccessors.get(start)).add(end);
    }
    this.activateAll();
  }
  /**
   * Get into the next tick.
   */
  nextTick() {
    const toggle = this.toggle.get(this.current);
    if (toggle !== undefined) {
      const successors = new Set<string>();
      for (const id of toggle) {
        const status = required(this.status.get(id));
        status.active = !status.active;
        status.nextTick = undefined;
        for (const successor of required(this.updateSuccessors.get(id))) {
          successors.add(successor);
        }
      }
      for (const successor of successors) {
        this.activate(successor);
      }
    }
    this.toggle.delete(this.current++);
  }
  private activate(nodeId: string) {
    const status = required(this.status.get(nodeId));
    let result = status.powered;
    for (const precursor of required(this.updatePrecursors.get(nodeId))) {
      result ||= !required(this.status.get(precursor)).active;
    }
    if (result == status.active) {
      if (status.nextTick !== undefined) {
        (this.toggle.get(status.nextTick) ?? new Map()).delete(nodeId);
        status.nextTick = undefined;
      }
    } else {
      if (status.nextTick === undefined) {
        status.nextTick = (this.current | 1) + random() + 1;
        if (!this.toggle.has(status.nextTick)) {
          this.toggle.set(status.nextTick, new Set());
        }
        required(this.toggle.get(status.nextTick)).add(nodeId);
      }
    }
  }
  extract(nodeIds: Set<string>, textIds: Set<string>) {
    const wireIds = new Set(
      [...this.wires.entries()]
        .filter(([, wire]) => {
          return nodeIds.has(wire.start) && nodeIds.has(wire.end);
        })
        .map(([id]) => id),
    );
    const nodes = Object.fromEntries([...this.nodes.entries()].filter(([id]) => nodeIds.has(id)));
    const wires = Object.fromEntries([...this.wires.entries()].filter(([id]) => wireIds.has(id)));
    const texts = Object.fromEntries([...this.texts.entries()].filter(([id]) => textIds.has(id)));
    return cloneDeep({
      nodes,
      wires,
      texts,
      viewport: this.viewport,
    }) satisfies DiagramStorage as DiagramStorage;
  }
  merge(storage: DiagramStorage) {
    storage = remarkId(storage);
    if (!isWiresValid(storage)) {
      ElMessage.error('Invalid wires');
      return;
    }
    const [dx, dy] = [
      this.viewport.x - storage.viewport.x - (Math.random() * 10 + 10),
      this.viewport.y - storage.viewport.y - (Math.random() * 10 + 10),
    ];
    [...Object.values(storage.nodes)].forEach((node) => {
      node.x -= dx;
      node.y -= dy;
    });
    [...Object.values(storage.texts)].forEach((text) => {
      text.x -= dx;
      text.y -= dy;
    });
    for (const [id, node] of Object.entries(storage.nodes)) {
      this.nodes.set(id, node);
    }
    for (const [id, wire] of Object.entries(storage.wires)) {
      this.wires.set(id, wire);
    }
    for (const [id, text] of Object.entries(storage.texts)) {
      this.texts.set(id, text);
    }
    this.commit();
    return {
      nodes: new Set(Object.keys(storage.nodes)),
      wires: new Set(Object.keys(storage.wires)),
      texts: new Set(Object.keys(storage.texts)),
    };
  }
  getNodeStatus(nodeId: string) {
    return required(this.status.get(required(this.getGroupRoot(nodeId))));
  }
  hasUncommitted() {
    return (
      this.nodes.hasUncommitted() || this.wires.hasUncommitted() || this.texts.hasUncommitted()
    );
  }
  /**
   * Save the history to handle undo and redo.
   */
  commit() {
    if (!this.hasUncommitted()) {
      ElMessage.error('No changes to commit');
      return;
    }
    this.modified = true;
    this.nodes.commit();
    this.wires.commit();
    this.texts.commit();
    this.parse();
  }
  /**
   * Clear all uncommitted changes, you should call `parse()` by your self.
   */
  clearUncommitted() {
    this.nodes.clearUncommitted();
    this.wires.clearUncommitted();
    this.texts.clearUncommitted();
  }
  undo() {
    const valid = this.nodes.undo() && this.wires.undo() && this.texts.undo();
    if (valid) {
      this.modified = true;
      this.parse();
    } else {
      ElMessage.error('Cannot undo anymore');
    }
  }
  redo() {
    const valid = this.nodes.redo() && this.wires.redo() && this.texts.redo();
    if (valid) {
      this.modified = true;
      this.parse();
    } else {
      ElMessage.error('Cannot redo anymore');
    }
  }
  addNode(node: Node) {
    node = cloneDeep(node);
    const id = uuid();
    this.nodes.set(id, node);
    return id;
  }
  addWire(wire: Wire) {
    wire = cloneDeep(wire);
    const id = uuid();
    if (wire.start === wire.end) {
      return;
    }
    if (this.wirePairSet.has(JSON.stringify([wire.start, wire.end]))) {
      return;
    }
    this.wires.set(id, wire);
    this.wirePairSet.add(JSON.stringify([wire.start, wire.end]));
    this.wirePairSet.add(JSON.stringify([wire.end, wire.start]));
    return id;
  }
  addText(text: Text) {
    text = cloneDeep(text);
    const id = uuid();
    this.texts.set(id, text);
    return id;
  }
  /**
   * Remember to call clearInvalidWires() after this.
   */
  removeNode(id: string) {
    if (this.nodes.has(id)) {
      this.nodes.delete(id);
    } else {
      throw new Error('node not found');
    }
  }
  removeInvalidWires() {
    for (const [id, wire] of this.wires.entries()) {
      if (!this.nodes.has(wire.start) || !this.nodes.has(wire.end)) {
        this.removeWire(id);
      }
    }
  }
  removeWire(id: string) {
    if (this.wires.has(id)) {
      const wire = required(this.wires.get(id));
      this.wirePairSet.delete(JSON.stringify([wire.start, wire.end]));
      this.wirePairSet.delete(JSON.stringify([wire.end, wire.start]));
      this.wires.delete(id);
    } else {
      throw new Error('wire not found');
    }
  }
  removeText(id: string) {
    if (this.texts.has(id)) {
      this.texts.delete(id);
    } else {
      throw new Error('text not found');
    }
  }
  toStorage(): DiagramStorage {
    return cloneDeep({
      nodes: Object.fromEntries(this.nodes.entries()),
      wires: Object.fromEntries(this.wires.entries()),
      texts: Object.fromEntries(this.texts.entries()),
      viewport: this.viewport,
    });
  }
  fetchClock() {
    this.parse();
  }
  resetViewport() {
    this.viewport = { x: 0, y: 0, scale: 1 };
  }
}
export const getBlankDiagramStorage = (): DiagramStorage => {
  return {
    nodes: {},
    wires: {},
    texts: {},
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
    },
  };
};
