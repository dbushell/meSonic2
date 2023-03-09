import * as log from 'log';

export {SECOND, MINUTE, HOUR, DAY, WEEK} from 'datetime';

const emoji = '⏱️ ';

export interface Timer {
  name: string;
  ms: number;
  callback: CallableFunction;
  repeat: boolean;
  id: number;
}

const timerMap = new Map<string, Timer>();

export const setTimer = (
  name: string,
  ms: number,
  callback: CallableFunction,
  immediate = false,
  repeat = false
) => {
  clearTimer(name);
  const id = setTimeout(
    async () => {
      try {
        const start = performance.now();
        log.getLogger('debug').debug(`${emoji} start "${name}"`);
        await callback();
        const end = Math.round(performance.now() - start);
        log.info(`${emoji} "${name}" ${end}ms`);
        if (repeat) {
          setTimer(name, ms, callback, false, repeat);
        } else {
          clearTimer(name);
        }
      } catch (err) {
        log.error(`${emoji} error "${name}": ${err}`);
        clearTimer(name);
      }
    },
    immediate ? 100 : ms
  );
  timerMap.set(name, {
    name,
    ms,
    callback,
    repeat,
    id
  });
};

export const clearTimer = (name: string): boolean => {
  let cleared = false;
  if (timerMap.has(name)) {
    clearTimeout(timerMap.get(name)!.id);
    timerMap.delete(name);
    cleared = true;
    log.getLogger('debug').debug(`${emoji} clear "${name}"`);
  }
  return cleared;
};

export const clearAllTimers = () => {
  for (const name of timerMap.keys()) {
    clearTimer(name);
  }
};
