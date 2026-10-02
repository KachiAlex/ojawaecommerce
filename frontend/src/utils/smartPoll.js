/**
 * Smart polling utility with visibility check and exponential backoff.
 *
 * @param {Function} fn - async function to execute on each poll
 * @param {Object} options
 * @param {number} options.interval - base interval in ms (default 5000)
 * @param {number} options.maxInterval - max interval after backoff (default 60000)
 * @param {number} options.backoffFactor - multiplier on error (default 2)
 * @param {boolean} options.pauseWhenHidden - skip polls when tab is hidden (default true)
 * @param {boolean} options.runImmediately - execute fn immediately on start (default true)
 * @returns {Function} cleanup function to stop polling
 */
export function smartPoll(fn, {
  interval = 5000,
  maxInterval = 60000,
  backoffFactor = 2,
  pauseWhenHidden = true,
  runImmediately = true,
} = {}) {
  let stopped = false;
  let currentInterval = interval;
  let timerId = null;

  const tick = async () => {
    if (stopped) return;

    if (pauseWhenHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      timerId = setTimeout(tick, Math.min(currentInterval, 2000));
      return;
    }

    try {
      await fn();
      currentInterval = interval;
    } catch (err) {
      currentInterval = Math.min(currentInterval * backoffFactor, maxInterval);
    }

    if (!stopped) {
      timerId = setTimeout(tick, currentInterval);
    }
  };

  if (runImmediately) {
    tick();
  } else {
    timerId = setTimeout(tick, currentInterval);
  }

  return () => {
    stopped = true;
    if (timerId) clearTimeout(timerId);
  };
}
