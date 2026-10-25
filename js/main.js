// Schuss ! : boucle, commandes au doigt, écrans et records
window.TM = window.TM || {};
(function (TM) {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');

  // ---------- Records (facultatifs : le jeu marche sans) ----------
  const SAVE_KEY = 'tele-marmotte-schuss-v1';
  const save = { bestM: 0, bestPts: 0, bestSlalom: 0, sfx: true, music: true };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { /* stockage indisponible */ }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* tant pis */ } }
  TM.audio.setSfx(save.sfx);
  TM.audio.setMusic(save.music);

  const coarse = matchMedia('(any-pointer: coarse)').matches;

  // ---------- Commandes ----------
  const keys = { left: false, right: false, up: false, down: false };
  let tapEdge = false, finger = null, fingerId = null, fingerStart = null, fingerLive = false;
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down', ArrowUp: 'up', KeyW: 'up', KeyZ: 'up'
  };
  addEventListener('keydown', e => {
    TM.audio.unlock();
    if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); return; }
    if (e.code === 'Enter' && screen === 'title') { start('descente'); return; }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) tapEdge = true; return; }
    const k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; finger = null; fingerId = null; });

  const stage = $('screen');
  function toGame(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * TM.VW, y: (e.clientY - r.top) / r.height * TM.VH };
  }
  stage.addEventListener('pointerdown', e => {
    TM.audio.unlock();
    if (screen !== 'play' || paused || (e.target.closest && e.target.closest('button'))) return;
    e.preventDefault();
    if (fingerId !== null) { tapEdge = true; return; } // un deuxième doigt = saut
    fingerId = e.pointerId;
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* pas grave */ }
    fingerStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    finger = toGame(e); fingerLive = false;
  });
  stage.addEventListener('pointermove', e => {
    if (e.pointerId !== fingerId) return;
    finger = toGame(e);
    if (Math.hypot(e.clientX - fingerStart.x, e.clientY - fingerStart.y) > 8) fingerLive = true;
  });
  function release(e) {
    if (e.pointerId !== fingerId) return;
    const dt = performance.now() - fingerStart.t;
    const moved = Math.hypot(e.clientX - fingerStart.x, e.clientY - fingerStart.y);
    if (dt < 220 && moved < 12) tapEdge = true;
    fingerId = null; finger = null; fingerLive = false;
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  // iPhone : Safari passe outre « user-scalable=no ». Deux touches rapprochées à côté d'un bouton zoomaient la page,
  // et le pincement étant bloqué, on ne pouvait plus en revenir. La deuxième touche ne zoome plus (ce qu'on touche
  // reçoit quand même son clic) ; si la page est zoomée malgré tout, pincement et double touche sont rendus pour la remettre.
  const zoomed = () => !!window.visualViewport && visualViewport.scale > 1.02;
  if (window.visualViewport) visualViewport.addEventListener('resize', () => document.documentElement.classList.toggle('zoomed', zoomed()));
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = performance.now(), quick = now - lastTouchEnd < 400;
    lastTouchEnd = now;
    if (!quick || !e.cancelable || zoomed()) return;
    e.preventDefault();
    const t = e.changedTouches[0], el = t && document.elementFromPoint(t.clientX, t.clientY), b = el && el.closest('button');
    if (el && !(b && b.disabled) && (e.target.contains(el) || (b && b.contains(e.target))))
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }));
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (!zoomed()) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => { if (!zoomed()) e.preventDefault(); });

  // ---------- Écrans ----------
  let screen = 'title', G = null, demo = null, paused = false;
  let popTimer = 0, flashTimer = 0, helpTimer = 0, overDelay = 0;
  function show(name) { ['title', 'pause', 'over'].forEach(s => { $('scr-' + s).hidden = s !== name; }); }

  function fmtClock(frames) {
    const s = Math.floor(frames / 60);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtRace(sec) {
    const m = Math.floor(sec / 60), s = sec - m * 60;
    return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0');
  }
  const nf = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  function syncMenu() {
    $('best-descente').textContent = save.bestM ? 'Record : ' + nf(save.bestM) + ' m · ' + nf(save.bestPts) + ' pts' : 'Pas encore de record';
    $('best-slalom').textContent = save.bestSlalom ? 'Record : ' + fmtRace(save.bestSlalom) : 'Pas encore de record';
    document.querySelectorAll('[data-toggle]').forEach(b => {
      const k = b.dataset.toggle;
      b.textContent = (k === 'sfx' ? 'Bruitages : ' : 'Musique : ') + (save[k] ? 'oui' : 'non');
      b.setAttribute('aria-pressed', save[k] ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    TM.audio.unlock();
    const k = b.dataset.toggle;
    save[k] = !save[k];
    if (k === 'sfx') TM.audio.setSfx(save.sfx); else TM.audio.setMusic(save.music);
    store(); syncMenu();
  }));

  function newDemo() { demo = TM.newGame('descente'); demo.demo = true; }
  function toTitle() {
    screen = 'title'; paused = false; G = null;
    newDemo();
    $('hud').hidden = true; $('pop').hidden = true; $('flash').hidden = true; $('help').hidden = true;
    syncMenu(); show('title');
    TM.audio.engine(0);
    TM.audio.music(0);
  }
  function start(mode) {
    TM.audio.unlock();
    G = TM.newGame(mode);
    screen = 'play'; paused = false; overDelay = 0;
    finger = null; fingerId = null; tapEdge = false;
    show(null);
    $('hud').hidden = false;
    $('hud').className = 'mode-' + mode;
    $('help').hidden = false; helpTimer = 260;
    TM.audio.music(mode === 'slalom' ? 1 : 0);
    TM.sfx('go');
    lastHud = {};
  }
  $('go-descente').addEventListener('click', () => start('descente'));
  $('go-slalom').addEventListener('click', () => start('slalom'));

  function togglePause() {
    if (screen !== 'play' || !G || G.state !== 'play') return;
    paused = !paused;
    if (paused) { show('pause'); syncMenu(); TM.audio.engine(0); } else show(null);
  }
  $('btn-pause').addEventListener('click', () => { TM.audio.unlock(); togglePause(); });
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-restart').addEventListener('click', () => start(G.mode));
  $('btn-menu').addEventListener('click', toTitle);
  $('btn-again').addEventListener('click', () => start(G.mode));
  $('btn-menu2').addEventListener('click', toTitle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { TM.audio.pause(); if (screen === 'play' && !paused) togglePause(); }
    else TM.audio.resume();
  });

  function pop(text) {
    const el = $('pop');
    el.textContent = text; el.hidden = false;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    popTimer = 70;
  }
  function flash(text) {
    const el = $('flash');
    el.textContent = text; el.hidden = false;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    flashTimer = 120;
  }

  function onOver() {
    const rows = [];
    let record = false;
    if (G.mode === 'descente') {
      const pts = G.score + G.meters;
      if (G.meters > save.bestM) { save.bestM = G.meters; record = true; }
      if (pts > save.bestPts) { save.bestPts = pts; record = true; }
      $('over-title').textContent = 'Damée !';
      $('over-sub').textContent = 'La dameuse t’a rattrapée à ' + nf(G.meters) + ' m.';
      rows.push(['Distance', nf(G.meters) + ' m'], ['Points', nf(pts)], ['Bobines', String(G.reels)],
        ['Figures', String(G.tricks)], ['Chutes', String(G.crashes)], ['Record', nf(save.bestM) + ' m']);
    } else {
      const total = TM.slalomTotal(G);
      if (!save.bestSlalom || total < save.bestSlalom) { save.bestSlalom = total; record = true; }
      $('over-title').textContent = 'Arrivée !';
      $('over-sub').textContent = G.missed ? G.missed + (G.missed > 1 ? ' portes manquées.' : ' porte manquée.') : 'Toutes les portes, bravo !';
      rows.push(['Temps', fmtRace(G.time / 60)], ['Pénalités', '+' + (G.missed * 5) + ' s'], ['Total', fmtRace(total)],
        ['Bobines', String(G.reels)], ['Chutes', String(G.crashes)], ['Record', fmtRace(save.bestSlalom)]);
    }
    store();
    $('over-record').hidden = !record;
    const dl = $('over-stats');
    dl.textContent = '';
    rows.forEach(r => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    $('hud').hidden = true; $('help').hidden = true; $('dam').hidden = true;
    show('over');
    TM.audio.music(-1);
  }

  let lastHud = {};
  function hud() {
    const p = G.p, kmh = Math.round(p.speed * 21.6);
    const v = {
      clock: fmtClock(G.time),
      big: G.mode === 'descente' ? nf(G.meters) + ' m' : fmtRace(G.time / 60),
      small: G.mode === 'descente' ? kmh + ' km/h · ' + nf(G.score + G.meters) + ' pts'
        : 'Porte ' + Math.min(G.gateIdx + 1, G.W.gates.length) + '/' + G.W.gates.length + (G.missed ? ' · +' + G.missed * 5 + ' s' : '')
    };
    for (const k in v) if (v[k] !== lastHud[k]) $('h-' + k).textContent = v[k];
    lastHud = v;
    const d = G.dam;
    const above = d && d.y < G.cam.y + 4 && G.state === 'play';
    $('dam').hidden = !above;
    if (above) $('dam-m').textContent = Math.max(0, Math.round((p.y - d.y) / TM.PX)) + ' m';
    TM.audio.engine(d && G.state === 'play' ? Math.max(0.15, 1 - Math.abs(p.y - d.y) / 420) : 0);
  }

  function demoInput(D) {
    const p = D.p, t = D.frame;
    let tx = p.x + Math.sin(t * 0.013) * 70;
    for (const o of TM.objectsIn(D.W, p.x - 30, p.y, p.x + 30, p.y + 70)) {
      if (TM.OBJ[o.type] && TM.OBJ[o.type].crash && !o.flat) tx += (o.x > p.x ? -1 : 1) * 40;
    }
    return { finger: { x: tx, y: p.y + 70 }, tap: false };
  }

  function tick(forced) {
    if (screen === 'title') {
      TM.quiet = true;
      TM.step(demo, demoInput(demo));
      TM.quiet = false;
      if (demo.meters > 700 || demo.state === 'over') newDemo();
      return;
    }
    if (paused || !G) return;
    const inp = forced || {
      finger: finger && (fingerLive || performance.now() - fingerStart.t > 110)
        ? { x: finger.x + G.cam.x, y: finger.y + G.cam.y } : null,
      left: keys.left, right: keys.right, up: keys.up, down: keys.down, tap: tapEdge
    };
    tapEdge = false;
    TM.step(G, inp);
    for (const ev of G.events) {
      if (ev.type === 'pop') pop(ev.data);
      else if (ev.type === 'flash') flash(ev.data);
      else if (ev.type === 'over') { overDelay = G.mode === 'descente' ? 110 : 70; TM.audio.engine(0); }
    }
    G.events.length = 0;
    if (popTimer > 0 && --popTimer === 0) $('pop').hidden = true;
    if (flashTimer > 0 && --flashTimer === 0) $('flash').hidden = true;
    if (helpTimer > 0 && --helpTimer === 0) $('help').hidden = true;
    if (overDelay > 0 && --overDelay === 0) onOver();
    if (screen === 'play' && G.state === 'play') hud();
  }

  // ---------- Mise en page : l'écran du jeu suit la forme du téléphone ----------
  function layout() {
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const app = $('app'), sc = $('screen');
    let VH, cssW, cssH;
    if (coarse) {
      app.className = 'mode-phone';
      VH = Math.max(200, Math.min(360, Math.round(TM.VW * vh / vw)));
      cssH = vh; cssW = Math.min(vw, Math.round(vh * TM.VW / VH));
      if (vw / vh < TM.VW / VH) { cssW = vw; cssH = Math.round(vw * VH / TM.VW); }
    } else {
      app.className = 'mode-desk';
      VH = 260;
      const room = vh - 96;
      let s = room / VH;
      if (s >= 2) s = Math.floor(s);
      cssH = Math.round(VH * s); cssW = Math.round(TM.VW * s);
    }
    TM.VH = VH;
    if (cv.height !== VH) cv.height = VH;
    cv.width = TM.VW;
    g.imageSmoothingEnabled = false;
    sc.style.width = cssW + 'px'; sc.style.height = cssH + 'px';
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 120));
  $('help').textContent = coarse
    ? 'Pose le doigt là où tu veux aller. Touche brève : saut. En l’air : figure.'
    : '← → pour tourner · ↓ tout schuss · ↑ s’arrêter · Espace : saut, puis figure en l’air';

  // ---------- Boucle ----------
  let acc = 0, last = performance.now();
  const STEP = 1000 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 4) { tick(); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    const world = G || demo;
    if (world) TM.render(g, world);
  }

  TM.debug = {
    get G() { return G; }, start: start, keys: keys, save: save,
    run: function (n, inp) {
      for (let i = 0; i < n; i++) tick(inp);
      TM.render(g, G || demo);
    }
  };
  layout();
  toTitle();
  requestAnimationFrame(frame);
})(window.TM);
