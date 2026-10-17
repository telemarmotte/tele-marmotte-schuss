// Schuss ! : bruitages et musiques synthétisés (aucun fichier son)
window.TM = window.TM || {};
(function (TM) {
  let ac = null, master = null, sfxGain = null, musicGain = null;
  let sfxOn = true, musicOn = true, seq = null, wanted = -1;
  let engine = null, noiseBuf = null;

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.connect(ac.destination);
      sfxGain = ac.createGain(); sfxGain.gain.value = sfxOn ? 0.32 : 0; sfxGain.connect(master);
      musicGain = ac.createGain(); musicGain.gain.value = musicOn ? 0.12 : 0; musicGain.connect(master);
      if (wanted >= 0) startSong(wanted);
    }
    if (ac.state === 'suspended') ac.resume();
  }
  function noiseBuffer() {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay, type) {
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuffer();
    f.type = type || 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t); s.stop(t + dur);
  }
  function arp(type, notes, step, dur, vol) { notes.forEach((f, i) => { if (f) tone(type, f, 0, dur, vol, i * step); }); }

  const SFX = {
    hop: () => tone('square', 300, 560, 0.1, 0.18),
    ramp: () => { tone('square', 220, 880, 0.3, 0.2); noise(0.25, 0.25, 3000, 0, 'highpass'); },
    trick: () => noise(0.22, 0.35, 1800),
    trickok: () => arp('square', [880, 1175, 1568], 0.06, 0.1, 0.16),
    land: () => noise(0.12, 0.5, 400, 0, 'lowpass'),
    crash: () => { noise(0.35, 0.7, 500, 0, 'lowpass'); tone('sawtooth', 300, 70, 0.35, 0.22); },
    carve: () => noise(0.14, 0.18, 4000, 0, 'highpass'),
    bump: () => tone('triangle', 160, 90, 0.12, 0.4),
    ice: () => arp('triangle', [1568, 2093, 2637], 0.04, 0.12, 0.12),
    reel: () => { tone('square', 988, 0, 0.06, 0.16); tone('square', 1319, 0, 0.12, 0.16, 0.06); },
    gold: () => arp('square', [523, 659, 784, 1047, 784, 1047], 0.08, 0.12, 0.15),
    horn: () => { tone('square', 233, 0, 0.35, 0.22); tone('square', 294, 0, 0.35, 0.18); tone('square', 233, 0, 0.5, 0.22, 0.45); tone('square', 294, 0, 0.5, 0.18, 0.45); },
    caught: () => { noise(0.6, 0.8, 200, 0, 'lowpass'); tone('sawtooth', 200, 40, 0.7, 0.3); arp('square', [0, 0, 392, 330, 262], 0.16, 0.18, 0.16); },
    start: () => arp('square', [880, 0, 880, 0, 1760], 0.12, 0.1, 0.18),
    gate: () => tone('square', 1320, 0, 0.05, 0.12),
    miss: () => tone('sawtooth', 160, 120, 0.3, 0.25),
    finish: () => arp('square', [523, 659, 784, 1047, 0, 1047, 1319], 0.1, 0.14, 0.18),
    go: () => { tone('square', 660, 0, 0.08, 0.18); tone('square', 990, 0, 0.12, 0.18, 0.08); }
  };

  // Le moteur de la dameuse : un grondement continu dont on règle le volume
  function setEngine(v) {
    if (!ac || ac.state !== 'running') return;
    if (!engine && v > 0) {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      s.buffer = noiseBuffer(); s.loop = true;
      f.type = 'lowpass'; f.frequency.value = 140;
      lfo.frequency.value = 9; lg.gain.value = 40; lfo.connect(lg); lg.connect(f.frequency);
      g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(sfxGain);
      s.start(); lfo.start();
      engine = { s: s, g: g, lfo: lfo };
    }
    if (engine) {
      engine.g.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 1.4, ac.currentTime, 0.1);
      if (v <= 0) { const e = engine; engine = null; setTimeout(() => { try { e.s.stop(); e.lfo.stop(); } catch (err) { /* déjà arrêté */ } }, 400); }
    }
  }

  // Musiques : croches, 0 = silence
  const SONGS = [
    { tempo: 156, // la descente, la mineur
      lead: [69,0,72,76,81,0,76,72, 71,0,74,79,83,0,79,74, 72,0,76,81,84,0,81,76, 71,72,74,76,80,0,76,0,
             81,0,79,0,77,0,76,0, 74,0,77,0,81,0,79,77, 76,0,72,0,74,0,71,0, 69,0,64,0,69,0,0,0],
      bass: [45,0,57,0,45,0,57,0, 43,0,55,0,43,0,55,0, 41,0,53,0,41,0,53,0, 40,0,52,0,40,0,52,0,
             41,0,53,0,41,0,53,0, 38,0,50,0,38,0,50,0, 40,0,52,0,40,0,52,0, 45,0,52,0,45,0,0,0] },
    { tempo: 144, // le slalom, do majeur
      lead: [72,0,67,0,76,0,72,0, 74,76,77,0,76,0,74,0, 72,0,67,0,76,0,79,0, 77,0,76,0,74,0,0,0,
             76,0,72,0,69,0,72,0, 74,0,71,0,67,0,71,0, 72,76,79,76,74,0,67,0, 72,0,0,0,0,0,0,0],
      bass: [48,0,43,0,48,0,43,0, 41,0,48,0,43,0,50,0, 48,0,43,0,48,0,52,0, 41,0,45,0,43,0,0,0,
             45,0,52,0,45,0,52,0, 43,0,50,0,43,0,50,0, 48,0,52,0,43,0,47,0, 48,0,43,0,48,0,0,0] }
  ];
  function note(type, midi, dur, vol, t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function stopSong() { if (seq) { clearInterval(seq.timer); seq = null; } }
  function startSong(i) {
    stopSong();
    const s = SONGS[i], stepDur = 60 / s.tempo / 2;
    let step = 0, next = ac.currentTime + 0.08;
    seq = { i: i, timer: setInterval(function () {
      if (ac.state !== 'running') { next = ac.currentTime + 0.08; return; }
      while (next < ac.currentTime + 0.15) {
        const l = s.lead[step % s.lead.length], b = s.bass[step % s.bass.length];
        if (l) note('square', l, stepDur * 0.85, 0.2, next);
        if (b) note('triangle', b, stepDur * 1.8, 0.55, next);
        next += stepDur; step++;
      }
    }, 30) };
  }

  TM.sfx = function (n) {
    if (!ac || !sfxOn || TM.quiet || ac.state !== 'running') return;
    const f = SFX[n];
    if (f) try { f(); } catch (e) { /* un son raté ne doit pas arrêter le jeu */ }
  };
  TM.audio = {
    unlock: unlock,
    engine: function (v) { try { setEngine(sfxOn ? v : 0); } catch (e) { /* pas grave */ } },
    music: function (i) {
      wanted = i;
      if (!ac) return;
      if (i < 0) { stopSong(); return; }
      if (!seq || seq.i !== i) startSong(i);
    },
    setSfx: function (on) { sfxOn = on; if (sfxGain) sfxGain.gain.value = on ? 0.32 : 0; },
    setMusic: function (on) { musicOn = on; if (musicGain) musicGain.gain.value = on ? 0.12 : 0; },
    pause: function () { if (ac && ac.state === 'running') ac.suspend(); },
    resume: function () { if (ac && ac.state === 'suspended') ac.resume(); }
  };
})(window.TM);
