import { defineConfig } from 'vite';

export default defineConfig({
  // // 项目根目录
  // root: process.cwd(),
  // // 项目输出目录
  // build: {
  //   outDir: 'dist',
  // },
  // 服务器配置
  server: {
    /**
     * 需要这些标头是因为 WebContainer 需要 SharedArrayBuffer(ES8引入了SharedArrayBuffer，通过共享内存来提升workers之间或者worker和主线程之间的消息传递速度。)
     * 而 SharedArrayBuffer 又要求您的网站进行跨域隔离。
     * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
     * https://webcontainers.io/guides/configuring-headers
     */
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp', // require-corp | unsafe-none
      'Cross-Origin-Opener-Policy': 'same-origin', // same-origin | same-origin-allow-popups | unsafe-none
    },
  },
});
