import { ref } from 'vue';
export function useAnimeFrame() {
  const animeFrame = ref(0);
  const timestamp = ref(Date.now());
  const nextFrame = () => {
    animeFrame.value++;
    timestamp.value = Date.now();
    requestAnimationFrame(nextFrame);
  };
  requestAnimationFrame(nextFrame);
  return {
    animeFrame,
    timestamp,
  };
}
export const animeFrame = useAnimeFrame();
