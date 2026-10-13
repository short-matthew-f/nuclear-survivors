// A small procedural score: no network audio, and no sound before a user gesture.
export function createAudio(settings) {
  let context,
    timer,
    step = 0,
    nextShot = 0,
    active = false;
  function getContext() {
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    } catch {
      return null;
    }
  }
  function note(
    frequency,
    duration,
    volume,
    type = 'triangle',
    end = frequency * 0.5,
  ) {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      ctx.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  function tone(frequency, duration = 0.1, volume = 0.035) {
    if (settings().sound) note(frequency, duration, volume);
  }
  function shot(weapon) {
    if (!settings().sound || performance.now() < nextShot) return;
    nextShot = performance.now() + 85;
    if (weapon === 'scatter') note(100, 0.14, 0.035, 'sawtooth', 25);
    else if (weapon === 'drone') note(680, 0.06, 0.012, 'sine', 280);
    else note(180, 0.055, 0.018, 'square', 55);
  }
  function unlock() {
    getContext();
    if (timer) return;
    const bass = [55, 55, 65.41, 49, 55, 73.42, 65.41, 49];
    timer = setInterval(() => {
      if (!settings().music || document.hidden || !active) return;
      const root = bass[Math.floor(step / 4) % bass.length];
      if (step % 4 === 0) note(root, 1.7, 0.022, 'sine', root);
      if (step % 2 === 0)
        note(root * [4, 6, 8, 6][step % 4], 0.3, 0.009, 'triangle', root * 4);
      if (step % 4 === 2) note(75, 0.08, 0.015, 'triangle', 25);
      step++;
    }, 280);
  }
  return {
    tone,
    shot,
    unlock,
    setActive(value) {
      active = value;
    },
  };
}
