# web-ide/terminal

基于 WebContainer 实现的一个能在 web 上运行的终端。

WebContainers 最初在 Google I/O 上宣布，由 StackBlitz 开发，每月都有数百万开发人员在 StackBlitz 经典编辑器和新的 Codeflow IDE 中进行实际测试。

[webcontainer 文档](https://webcontainers.io/)，[WebContainer 的社区项目](https://webcontainers.io/community-projects/all-projects)

## 开发

安装依赖：

```bash
pnpm add @webcontainer/api
```

![](https://assets.fedtop.com/picbed/202310300008677.png)

WebContainer 需要 SharedArrayBuffer 才能运行。使用 SharedArrayBuffer 时，要求您的网站进行跨域隔离。  
https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  // ...
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  // ...
});
```

部署的页面必须通过 HTTPS 提供服务。在本地开发时，这不是必需的，因为 localhost 不受某些浏览器限制的约束，但一旦部署到生产环境，就无法绕过它。

讲到这里，我也想对 SharedArrayBuffer 展开说一下。

SharedArrayBuffer 是一个类似于 ArrayBuffer 的 JavaScript 对象，它允许在多个 Agent 之间共享 ArrayBuffer 的内容。

我们可以看一个常见的主线程和 worker 之间通信的例子：

```javascript
// 主线程
const worker = new Worker('worker.js');
worker.postMessage('hi 123');
worker.onmessage = e => {
  console.log(e.data);
};

// worker.js
onmessage = e => {
  console.log(e.data);
  postMessage('hi 456');
};
```

主线程新建了一个 Worker 线程。该线程与主线程之间会有一个通信渠道，主线程和 Worker 线程都是通过 postMessage 向对方发消息，同时通过 message 事件监听对方的回应。线程之间的数据交换可以是各种格式，不仅仅是字符串，也可以是二进制数据。这种交换采用的是复制机制，即一个线程将需要分享的数据复制一份，通过 postMessage 方法交给另一个线程。消息是拷贝之后，经过序列化之后进行传输的。在解析的时候又会进行反序列化，这也降低了消息传输的效率。如果数据量比较大，这种通信的效率显然比较低。

为了解决这个问题，引入了 Shared Memory 的概念。我们可以通过 SharedArrayBuffer 来创建 Shared Memory，允许 Worker 线程与主线程共享同一块内存。SharedArrayBuffer 的 API 与 ArrayBuffer 一模一样，例如本身是无法读写的，必须在上面建立视图，然后通过视图读写，唯一的区别是后者无法共享数据。可以看一个示例：

```javascript
// 主线程
// 新建 1KB 共享内存
const sharedBuffer = new SharedArrayBuffer(1024);
// 主线程将共享内存的地址发送出去
w.postMessage(sharedBuffer);
// 在共享内存上建立视图，供写入数据
const sharedArray = new Int32Array(sharedBuffer);
sharedArray[0] = 123;

// Worker 线程
onmessage = e => {
  // 主线程共享的数据，就是 1KB 的共享内存
  const sharedBuffer = e.data;
  // 在共享内存上建立视图，方便读写
  const sharedArray = new Int32Array(sharedBuffer);
  console.log(sharedArray[0]); // 123
};
```

复制机制接收 SharedArrayBuffer 对象，或被映射到一个新的 SharedArrayBuffer 对象上的 TypedArrays 对象。在这两种情况下，这个新的 SharedArrayBuffer 对象会被传递到目标 Worker 的接收函数上，从而在目标 Worker 产生一个新的私有 SharedArrayBuffer 对象。但是，这两个 SharedArrayBuffer 对象指向的共享数据块其实是同一个。

SharedArrayBuffer 是用来和线程之间进行数据交换访问的高效方法，被大量应用，例如 WebAssembly 使用 Worker 模拟了多线程，使用了 SharedArrayBuffer 做数据共享访问。

好了，回到我们的主题：WebContainer。

写一个最简单的示例。相关 api 可以查阅： [webcontainer api](https://webcontainers.io/api)

```typescript
import { WebContainer } from '@webcontainer/api';

console.log(process.env.NODE_ENV);
const output = document.getElementById('output')!;

print('Booting...');
// boot 方法只能调用一次，并且只能创建一个 WebContainer 实例。
const wc = await WebContainer.boot();
print('Booted!');

function print(text: string) {
  output.innerHTML += `<p>${text}</p>`;
}
```
