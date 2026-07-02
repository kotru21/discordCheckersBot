import {
  isMyTurn,
  pieceUtils,
  boardUtils,
  validationUtils,
} from "@discord-checkers/game";

export { isMyTurn, pieceUtils, boardUtils, validationUtils };

export const performanceUtils = {
  memoize: <Args extends unknown[], R>(
    fn: (...args: Args) => R,
    keyGenerator: (...args: Args) => string = (...args: Args) =>
      JSON.stringify(args)
  ) => {
    const cache = new Map<string, R>();

    return (...args: Args) => {
      const key = keyGenerator(...args);

      if (cache.has(key)) {
        return cache.get(key) as R;
      }

      const result = fn(...args) as R;
      cache.set(key, result);

      if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      return result;
    };
  },

  debounce: <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        func(...args);
      };

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  },

  throttle: <T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
  ) => {
    let inThrottle = false;
    return function throttled(this: unknown, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};
