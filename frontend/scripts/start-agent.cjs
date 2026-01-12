#!/usr/bin/env node
/**
 * Cross-platform script to start the Python agent service
 * Uses uv for package management (fast, reliable)
 * Falls back to venv/system Python if uv not available
 */

const { spawn, execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';
const backendDir = path.resolve(__dirname, '..', '..', 'backend');

// Set environment variables
const env = {
  ...process.env,
  AGENT_PORT: '5001'
};

// Check if uv is available
function hasUv() {
  try {
    execSync('uv --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Determine Python command based on available tools
let command, args, useShell;

if (hasUv()) {
  // Use uv run (preferred - handles venv automatically)
  command = 'uv';
  args = ['run', 'python', 'chat_server.py'];
  useShell = false;
  console.log('Using uv run');
} else if (isWindows) {
  // Windows fallback: Check for .venv (uv style), then venv, then system python
  const uvVenvPython = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const venvPython = path.join(backendDir, 'venv', 'Scripts', 'python.exe');

  if (existsSync(uvVenvPython)) {
    command = uvVenvPython;
    args = ['chat_server.py'];
    useShell = false;
    console.log('Using .venv Python');
  } else if (existsSync(venvPython)) {
    command = venvPython;
    args = ['chat_server.py'];
    useShell = false;
    console.log('Using venv Python');
  } else {
    command = 'python';
    args = ['chat_server.py'];
    useShell = false;
    console.log('Using system Python (venv not found)');
  }
} else {
  // Mac/Linux fallback
  const uvVenvActivate = path.join(backendDir, '.venv', 'bin', 'activate');
  const venvActivate = path.join(backendDir, 'venv', 'bin', 'activate');

  if (existsSync(uvVenvActivate)) {
    command = 'bash';
    args = ['-c', 'source .venv/bin/activate && python chat_server.py'];
    useShell = false;
    console.log('Using .venv Python');
  } else if (existsSync(venvActivate)) {
    command = 'bash';
    args = ['-c', 'source venv/bin/activate && python chat_server.py'];
    useShell = false;
    console.log('Using venv Python');
  } else {
    command = 'python3';
    args = ['chat_server.py'];
    useShell = false;
    console.log('Using system Python (venv not found)');
  }
}

console.log(`Starting agent on port ${env.AGENT_PORT}...`);
console.log(`Platform: ${process.platform}`);
console.log(`Backend dir: ${backendDir}`);

// Spawn the process
const agent = spawn(command, args, {
  cwd: backendDir,
  env: env,
  stdio: 'inherit',
  shell: useShell
});

agent.on('error', (err) => {
  console.error('Failed to start agent:', err);
  process.exit(1);
});

agent.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Agent exited with code ${code}`);
    process.exit(code);
  }
});

// Handle termination signals
process.on('SIGINT', () => {
  agent.kill('SIGINT');
});

process.on('SIGTERM', () => {
  agent.kill('SIGTERM');
});
