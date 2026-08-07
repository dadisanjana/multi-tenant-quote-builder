import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'start:dev', '-w', '@quote-builder/api']],
  ['npm', ['run', 'dev', '-w', '@quote-builder/web']],
];

const children = commands.map(([command, args]) =>
  spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' }),
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exitCode = code;
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!shuttingDown && (code !== 0 || signal)) {
      shutdown(code ?? 1);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
