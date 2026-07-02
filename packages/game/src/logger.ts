export const logger = {
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  info: (..._args: unknown[]) => {},
  debug: (..._args: unknown[]) => {},
};
