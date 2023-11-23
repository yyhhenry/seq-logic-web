import { isString } from 'lodash';
import { isDiagramStorage } from './seq-logic';
import { isRecordOf } from './type-guards';
export const samplesIndexUrl = new URL(
  'samples/index.json',
  window.location.href,
);
export async function getSamplesMap() {
  const data = await (await fetch(samplesIndexUrl)).json();
  if (isRecordOf(data, isString)) {
    return new Map(
      Object.entries(data).map(
        ([k, v]) =>
          [k, new URL(v, samplesIndexUrl).href] satisfies [string, string],
      ),
    );
  } else {
    throw new Error('Invalid samples index');
  }
}
export async function getSample(url: string) {
  const data = await (await fetch(url)).json();
  if (isDiagramStorage(data)) {
    return data;
  }
  throw new Error('Invalid unit data');
}
