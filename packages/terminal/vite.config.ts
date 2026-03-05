import { defineConfig } from 'vite';

/**
 * WebContainer 需要 SharedArrayBuffer，要求跨域隔离。
 * 使用 middleware 而非 server.headers，确保 304 缓存响应也携带正确头部。
 * https://webcontainers.io/guides/configuring-headers
 * https://webcontainers.io/guides/troubleshooting#webcontainers-not-loading-and-postmessage-error
 */
export default defineConfig({
  plugins: [
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          next();
        });
      },
    },
  ],
});
