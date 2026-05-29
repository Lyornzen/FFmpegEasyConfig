import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

let logPath: string = '';

function ensureLogPath(): string {
  if (!logPath) {
    const dir = app.isPackaged
      ? path.dirname(app.getPath('exe'))
      : process.cwd();
    logPath = path.join(dir, 'log.txt');
  }
  return logPath;
}

function timestamp(): string {
  // Use local time (not UTC) so logs match the user's clock
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function write(level: string, message: string) {
  const line = `[${timestamp()}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(ensureLogPath(), line, 'utf-8');
  } catch {
    // Silently fail — don't crash the app because of logging
  }
  // Also echo to console
  const prefix = `[Logger:${level}]`;
  if (level === 'ERROR') console.error(prefix, message);
  else if (level === 'WARN') console.warn(prefix, message);
  else console.log(prefix, message);
}

export const logger = {
  info(msg: string) {
    write('INFO', msg);
  },
  warn(msg: string) {
    write('WARN', msg);
  },
  error(msg: string) {
    write('ERROR', msg);
  },
  debug(msg: string) {
    write('DEBUG', msg);
  },
  /** Return the full log file content */
  readAll(): string {
    try {
      return fs.readFileSync(ensureLogPath(), 'utf-8');
    } catch {
      return '';
    }
  },
  /** Return the log file path */
  getPath(): string {
    return ensureLogPath();
  },
};
