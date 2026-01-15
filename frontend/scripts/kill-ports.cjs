#!/usr/bin/env node
/**
 * Kill processes on specified ports (Windows/Mac/Linux)
 * Usage: node kill-ports.js [port1] [port2] ...
 * Default: kills 3000 (Next.js), 3001 (API), 5001 (Chat Agent)
 */

const { execSync } = require('child_process');
const os = require('os');

const ports = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map(Number)
  : [3000, 3001, 5001];

const isWindows = os.platform() === 'win32';

function killPort(port) {
  try {
    if (isWindows) {
      // Windows: find PID and kill
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const lines = result.trim().split('\n');

      const pids = new Set();
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          pids.add(match[1]);
        }
      }

      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
          console.log(`  Killed PID ${pid} on port ${port}`);
        } catch {
          // Process might have already exited
        }
      }
    } else {
      // Mac/Linux: use lsof and kill
      const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const pids = result.trim().split('\n').filter(Boolean);

      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
          console.log(`  Killed PID ${pid} on port ${port}`);
        } catch {
          // Process might have already exited
        }
      }
    }
  } catch {
    // No process on this port - that's fine
  }
}

console.log(`Clearing ports: ${ports.join(', ')}`);

for (const port of ports) {
  killPort(port);
}

console.log('Done\n');
