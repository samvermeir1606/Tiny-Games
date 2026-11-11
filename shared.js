/* Tiny Arcade shared helpers: synthesized sound, header, start screen, particles */
const Arcade = (() => {
  const TAU = Math.PI * 2;
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const ROOT = document.currentScript ? new URL('.', document.currentScript.src).href : './';
  let ctx, master, noiseBuf, muted = ls.get('ar-mute') === '1';

  /* ---------------- audio engine ---------------- */
  function silentWav() { // silent clip: makes iPhones play Web Audio even with the silent switch on
    const n = 800, sr = 8000, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function wake() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 8;
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      try { navigator.audioSession.type = 'playback'; } catch (e) {}
      try { const a = new Audio(silentWav()); a.loop = true; a.play().catch(() => {}); } catch (e) {}
    }
    if (ctx.state !== 'running') ctx.resume();
    return true;
  }
  const now = () => { wake(); return ctx.currentTime; };
  const hz = (semis, base = 261.63) => base * Math.pow(2, semis / 12);
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f0, f1, t, dur, peak) {
    if (muted || !wake()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, peak, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.06);
  }
  function noise(t, dur, peak, type, freq, q) {
    if (muted || !wake()) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.002, peak, dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.06);
  }
  // configurable voice: pitch curve -> optional filters -> envelope (used for animal sounds)
  function voc(o) {
    if (muted || !wake()) return;
    const t = ctx.currentTime + (o.delay || 0), end = t + o.dur;
    const os = ctx.createOscillator(); os.type = o.type || 'sawtooth';
    os.frequency.setValueAtTime(o.pts[0][1], t);
    o.pts.slice(1).forEach(([dt, f]) => os.frequency.linearRampToValueAtTime(f, t + dt));
    let node = os;
    if (o.pk) { const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = o.pk[0]; f.Q.value = o.pk[1]; f.gain.value = o.pk[2]; node.connect(f); node = f; }
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    if (o.am) {
      const a = ctx.createGain(); a.gain.value = 1 - o.am[1] / 2;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.am[0]; lg.gain.value = o.am[1] / 2;
      l.connect(lg); lg.connect(a.gain); l.start(t); l.stop(end + 0.05); node.connect(a); node = a;
    }
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(end + 0.05);
    }
    const g = ctx.createGain(), att = Math.min(0.03, o.dur / 4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.peak, t + att);
    g.gain.setValueAtTime(o.peak, t + o.dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, end);
    node.connect(g); g.connect(master); os.start(t); os.stop(end + 0.05);
  }

  const sfx = {
    tap() { const t = now(); osc('sine', 660, 880, t, 0.08, 0.4); },
    pop(r = 40) { const t = now(); osc('sine', 900 - r * 6 + Math.random() * 200, 200, t, 0.12, 0.6); noise(t, 0.05, 0.35, 'highpass', 2500); },
    flip() { const t = now(); noise(t, 0.04, 0.4, 'bandpass', 1800, 2); osc('triangle', 500, 350, t, 0.06, 0.3); },
    match() { const t = now(); [0, 4, 7].forEach((s, i) => osc('triangle', hz(s, 523.25), 0, t + i * 0.08, 0.35, 0.4)); },
    wrong() { const t = now(); osc('sine', 280, 180, t, 0.3, 0.4); },
    ding() { const t = now(); osc('sine', 880, 0, t, 0.25, 0.5); osc('sine', 1320, 0, t + 0.1, 0.5, 0.5); },
    win() { const t = now(); [0, 4, 7, 12, 16, 19].forEach((s, i) => osc('triangle', hz(s, 523.25), 0, t + i * 0.1, 0.5, 0.4)); },
    whack() { const t = now(); osc('sine', 220, 45, t, 0.22, 1); noise(t, 0.08, 0.5, 'lowpass', 900); },
    miss() { const t = now(); noise(t, 0.07, 0.3, 'lowpass', 500); },
    drop() { const t = now(); osc('sine', 700, 250, t, 0.12, 0.4); },
    place() { const t = now(); osc('triangle', 600, 1000, t, 0.12, 0.4); },
    step(i = 0) { const t = now(); osc('sine', hz([0, 2, 4, 7, 9][i % 5], 392), 0, t, 0.12, 0.25); },
    boing() { const t = now(); osc('sine', 200, 600, t, 0.25, 0.5); },
  };
  function play(name, ...args) { if (muted || !wake()) return; const f = sfx[name]; if (f) f(...args); }

  function setMuted(m) {
    muted = m; ls.set('ar-mute', m ? '1' : '0');
    if (master) master.gain.value = m ? 0 : 0.85;
    if (m && window.speechSynthesis) speechSynthesis.cancel();
  }
  function bindMute(b) {
    const paint = () => { b.textContent = muted ? '🔇' : '🔊'; };
    paint();
    b.addEventListener('click', () => { setMuted(!muted); paint(); if (!muted) play('tap'); });
  }
  function say(text) {
    if (muted || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); const vs = speechSynthesis.getVoices(), v = vs.find((x) => x.lang === 'nl-BE') || vs.find((x) => x.lang.toLowerCase().startsWith('nl')); if (v) u.voice = v; u.lang = v ? v.lang : 'nl-NL'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------------- ui helpers ---------------- */
  function header(title, opts = {}) {
    const bar = document.createElement('div'); bar.className = 'topbar';
    bar.innerHTML = `<button class="ib" data-ar="home" aria-label="Naar het menu">🏠</button><h1>${title}</h1>${opts.extra || ''}<button class="ib" data-ar="mute" aria-label="Geluid"></button>`;
    bar.querySelector('[data-ar=home]').addEventListener('click', () => { location.href = ROOT + 'index.html'; });
    bindMute(bar.querySelector('[data-ar=mute]'));
    const app = document.getElementById('app'); app.insertBefore(bar, app.firstChild);
    return bar;
  }
  function start(o, cb) {
    const el = document.createElement('div'); el.className = 'overlay';
    el.innerHTML = `<button class="ib homebtn" aria-label="Naar het menu">🏠</button><div><div class="big">${o.emoji}</div><h1>${o.title}</h1><p>${o.hint || ''}</p><button class="btn" id="arGo">${o.button || 'Laten we spelen!'}</button></div>`;
    document.body.appendChild(el);
    el.querySelector('.homebtn').addEventListener('click', () => { location.href = ROOT + 'index.html'; });
    el.querySelector('#arGo').addEventListener('click', () => { wake(); el.remove(); if (cb) cb(); });
  }
  function burst(x, y, list = ['⭐', '✨', '🎵', '💖', '🌈'], n = 6) {
    if (document.querySelectorAll('.fxp').length > 50) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'fxp'; s.textContent = list[(Math.random() * list.length) | 0];
      const a = Math.random() * TAU, d = 40 + Math.random() * 70;
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px`;
      s.addEventListener('animationend', () => s.remove()); document.body.appendChild(s);
    }
  }
  function confetti(n = 36) {
    const list = ['🎉', '⭐', '✨', '💖', '🌈', '🎈', '🎊'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'conf'; s.textContent = list[(Math.random() * list.length) | 0];
      s.style.cssText = `left:${Math.random() * 100}vw;--d:${1.6 + Math.random() * 1.6}s;--dx:${(Math.random() - 0.5) * 120}px;animation-delay:${Math.random() * 0.5}s`;
      s.addEventListener('animationend', () => s.remove()); document.body.appendChild(s);
    }
  }
  const rand = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  ['gesturestart', 'contextmenu', 'dblclick'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume(); });
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));

  return { ls, ROOT, wake, now, hz, osc, noise, voc, play, header, bindMute, start, burst, confetti, say, rand, shuffle, get muted() { return muted; } };
})();
