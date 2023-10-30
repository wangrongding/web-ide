import { WebContainer } from '@webcontainer/api';
import Convert from 'ansi-to-html';

console.log(process.env.NODE_ENV);
const convert = new Convert();
const output = document.getElementById('output')!;
const command = document.getElementById('command')!;
const terminal = document.getElementById('terminal')!;
const history: string[] = []; // 命令行历史记录
let historyIndex = history.length;

print('Booting...');
// boot 方法只能调用一次，并且只能创建一个 WebContainer 实例。
const wc = await WebContainer.boot();
print('Booted!');
print('Hello Web-Container! ( 尝试在命令行中输入命令,可以安装依赖，运行 nodejs 脚本，开启 http 服务等... )');
command.focus();

function print(text: string) {
  // 将 ansi 转换为 html（\x1b[30mblack\x1b[37mwhite)
  const dom = convert.toHtml(text);
  output.innerHTML += `\n${dom}`;
}

function error(text: string) {
  output.innerHTML += `<span class='error'>${text}</span>`;
}

command.onkeydown = async e => {
  // 上下方向键
  if (e.keyCode === 38 || e.keyCode === 40) return chooseHistory(e.keyCode);
  // 如果是回车键
  if (e.keyCode === 13) {
    e.preventDefault();
    return run();
  }
};

// 执行命令
async function run() {
  let cmd = command.innerText;
  cmd = cmd.trim();
  command.innerText = '';
  if (cmd === 'cls' || cmd === 'clear') return (output.innerHTML = '');
  const [commandName, ...args] = cmd.split(' ');
  // 执行命令
  print(`>${cmd} \n`);
  history.push(cmd);
  const wcProcess = await wc.spawn(commandName, args);
  // 打印输出
  wcProcess.output.pipeTo(
    new WritableStream({
      write: chunk => {
        print(`${chunk}`);
        // 将输出滚动到底部
        terminal.scrollTop = terminal.scrollHeight;
      },
    })
  );
  if (await wcProcess.exit) {
    error(`Process failed and exited with code ${await wcProcess.exit}`);
  }
  historyIndex = history.length;
}

// 选择历史命令
function chooseHistory(keyCode: number) {
  historyIndex += keyCode === 38 ? -1 : 1;
  if (historyIndex < 0) historyIndex = 0;
  if (historyIndex > history.length - 1) historyIndex = history.length - 1;
  command.innerText = history[historyIndex];
}
