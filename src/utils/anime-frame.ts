import { ref } from 'vue';
export function useAnimeFrame() {
  const animeFrame = ref(0);
  const start = ref(Date.now());
  const timestamp = ref(Date.now());
  const nextFrame = () => {
    animeFrame.value++;
    timestamp.value = Date.now() - start.value;
    requestAnimationFrame(nextFrame);
  };
  requestAnimationFrame(nextFrame);
  const resetStart = (newStart?: number) => {
    start.value = newStart ?? Date.now();
  };
  return {
    start,
    animeFrame,
    timestamp,
    resetStart,
  };
}
const animeFrame = useAnimeFrame();
export default animeFrame;
