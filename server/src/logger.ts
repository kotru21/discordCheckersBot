type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

function writeLog(level: LogLevel, message: string, meta?: LogMeta): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.warn(line);
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    writeLog("info", message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    writeLog("warn", message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    writeLog("error", message, meta);
  },
};
