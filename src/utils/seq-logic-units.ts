import { isString } from 'lodash';
import { isDiagramStorage } from './seq-logic';
import { isRecordOf } from './type-guards';
export const unitsIndexUrl = new URL('units/index.json', window.location.href);
export async function getUnitsMap() {
  const data = await (await fetch(unitsIndexUrl)).json();
  if (isRecordOf(data, isString)) {
    return new Map(Object.entries(data));
  } else {
    throw new Error('Invalid units index');
  }
}
export function getPopularUnits() {
  return ['and', 'or', 'xor', 'd-latch'];
}
export async function getUnit(name: string) {
  const unitsMap = await getUnitsMap();
  const url = unitsMap.get(name);
  if (url !== undefined) {
    const data = await (await fetch(new URL(url, unitsIndexUrl))).json();
    if (isDiagramStorage(data)) {
      return data;
    }
    throw new Error('Invalid unit data');
  } else {
    throw new Error('Unknown unit');
  }
}
