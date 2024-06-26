import '@yyhhenry/element-extra/dist/style.css';
import '@/assets/color-set.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useColorMode } from '@vueuse/core';

useColorMode();

const app = createApp(App);

app.use(router);

app.mount('#app');
