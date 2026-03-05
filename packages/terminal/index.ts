import { WebContainer } from '@webcontainer/api'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

console.log(process.env.NODE_ENV)

// ---------- xterm 终端 ----------
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
  theme: {
    background: '#13131a',
    foreground: '#cdd6f4',
    cursor: '#a6e3a1',
    selectionBackground: '#45475a',
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#cba6f7',
    cyan: '#89dceb',
    white: '#bac2de',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#cba6f7',
    brightCyan: '#89dceb',
    brightWhite: '#a6adc8',
  },
  allowProposedApi: true,
})
const fitAddon = new FitAddon()
term.loadAddon(fitAddon)
term.open(document.getElementById('xterm-container')!)
fitAddon.fit()

// 窗口 resize 时自适应
const resizeObserver = new ResizeObserver(() => fitAddon.fit())
resizeObserver.observe(document.getElementById('terminal')!)

// ---------- WebContainer 单例（防止 HMR 多次 boot）----------
declare global {
  interface Window {
    __wc?: WebContainer
  }
}

if (window.__wc) {
  window.__wc.teardown()
  window.__wc = undefined
}

term.writeln('\x1b[33mBooting WebContainer...\x1b[0m')

let wc: WebContainer
try {
  wc = await WebContainer.boot({ coep: 'require-corp', workdirName: 'workspace' })
  window.__wc = wc
} catch (e) {
  term.writeln(`\x1b[31mBoot failed: ${e}\x1b[0m`)
  throw e
}

wc.on('error', ({ message }) => term.writeln(`\x1b[31m[WebContainer Error] ${message}\x1b[0m`))

term.writeln('\x1b[32mBooted! Starting shell...\x1b[0m')

// ---------- 启动持久 shell（jsh） ----------
// jsh 是 WebContainer 内置 shell，支持 cd / Tab 补全 / 命令历史等
const shell = await wc.spawn('jsh', {
  terminal: { cols: term.cols, rows: term.rows },
  env: {
    PS1: '\x1b[32m❯\x1b[0m ',
    // 将 npm 全局安装目录重定向到可写路径，避免 /usr/local/lib EACCES
    npm_config_prefix: '/home/.npm-global',
    PATH: '/home/.npm-global/bin:/usr/local/bin:/usr/bin:/bin',
  },
})

// shell 输出 → xterm 显示
shell.output.pipeTo(
  new WritableStream({
    write(data) {
      term.write(data)
    },
  }),
)

// xterm 输入（含 Tab / 上下键 / Ctrl+C 等）→ shell stdin
const shellInput = shell.input.getWriter()
term.onData(data => shellInput.write(data))

// xterm resize → 同步通知 shell（让 Tab 补全列宽正确）
term.onResize(({ cols, rows }) => {
  shell.resize?.({ cols, rows })
})

term.focus()
