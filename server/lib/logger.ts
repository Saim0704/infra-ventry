type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m", // Cyan
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  debug: "\x1b[90m", // Gray
  bold: "\x1b[1m"
};

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

function getLogLevel(): number {
  const level = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG')).toUpperCase() as LogLevel;
  return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : 1;
}

function formatMessage(level: LogLevel, args: any[]) {
  if (LOG_LEVELS[level] < getLogLevel()) return null;

  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  let source = "express";
  if (args.length > 1 && typeof args[args.length - 1] === 'string' && /^[a-zA-Z0-9_]+$/.test(args[args.length - 1])) {
     source = args.pop();
  }

  const msgStr = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    } else if (typeof arg === 'object') {
      try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
    }
    return String(arg);
  }).join(' ');

  const levelColor = colors[level.toLowerCase() as keyof typeof colors] || colors.reset;
  
  return `${colors.bold}${formattedTime}${colors.reset} ${levelColor}[${level}]${colors.reset} ${colors.bold}[${source}]${colors.reset} ${msgStr}`;
}

export function log(...args: any[]) {
  const msg = formatMessage('INFO', args);
  if (msg) console.log(msg);
}

export const info = log;

export function warn(...args: any[]) {
  const msg = formatMessage('WARN', args);
  if (msg) console.warn(msg);
}

export function error(...args: any[]) {
  const msg = formatMessage('ERROR', args);
  if (msg) console.error(msg);
}

export function debug(...args: any[]) {
  const msg = formatMessage('DEBUG', args);
  if (msg) console.debug(msg);
}
