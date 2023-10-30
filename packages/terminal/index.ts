import { WebContainer } from '@webcontainer/api';

console.log(process.env.NODE_ENV);
const output = document.getElementById('output')!;
const command = document.getElementById('command')!;
print('Booting...');
// boot 方法只能调用一次，并且只能创建一个 WebContainer 实例。
const wc = await WebContainer.boot();
print('Booted!');

function print(text: string) {
  output.innerHTML += `<p class='output-line'>${text}</p>`;
}

function error(text: string) {
  output.innerHTML += `<p class='output-line error'>${text}</p>`;
}

command.onkeydown = async e => {
  // 如果是回车键
  if (e.keyCode !== 13) return;
  e.preventDefault();
  const cmd = command.innerText;
  command.innerText = '';
  console.log('🚀🚀🚀 / cmd:', cmd);
  const [commandName, ...args] = cmd.split(' ');
  // 执行命令
  print(`> ${cmd} `);
  const wcProcess = await wc.spawn(commandName, args);
  // 打印输出
  wcProcess.output.pipeTo(
    new WritableStream({
      write: chunk => print(` ${chunk} `),
    })
  );
  if (await wcProcess.exit) {
    error(`Process failed and exited with code ${await wcProcess.exit}`);
  }
};
