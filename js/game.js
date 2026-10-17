// Schuss ! : règles du jeu (une image = 1/60 s)
window.TM = window.TM || {};
(function (TM) {
  const MAXA = Math.PI / 2;
  const DAM_AT = 1000; // mètres avant l'arrivée de la dameuse
  TM.VW = 160; TM.VH = 260;

  function sfx(n) { if (TM.sfx) TM.sfx(n); }
  function emit(G, type, data) { G.events.push({ type: type, data: data }); }

  TM.newGame = function (mode) {
    const seed = mode === 'slalom' ? 7 : (Math.random() * 1e9) | 0;
    const G = {
      mode: mode, W: TM.newWorld(mode, seed),
      p: {
        x: 0, y: 150, z: 0, vz: 0, angle: 0, target: 0, speed: 0, vx: 0, vy: 0,
        state: 'ski', fallT: 0, trickT: 0, combo: 0, airT: 0, inv: 0, iceT: 0, flat: 0
      },
      cam: { x: -TM.VW / 2, y: 0 }, frame: 0, time: 0, state: 'play', overT: 0,
      score: 0, reels: 0, gold: 0, tricks: 0, crashes: 0, meters: 0, nextMark: 500,
      trail: [], parts: [], events: [], dam: null,
      started: mode !== 'slalom', gateIdx: 0, missed: 0, finished: false
    };
    G.cam.y = G.p.y - TM.VH * 0.32;
    return G;
  };

  function puff(G, x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      G.parts.push({ x: x, y: y, z: 2, vx: (Math.random() - 0.5) * spread, vy: (Math.random() - 0.3) * spread,
        vz: Math.random() * 1.5, life: 20 + (Math.random() * 15 | 0) });
    }
  }

  function crash(G, o, label) {
    const p = G.p;
    if (p.inv > 0 || p.state !== 'ski') return;
    p.state = 'fallen'; p.fallT = 55; p.speed = 0; p.z = 0; p.vz = 0;
    p.trickT = 0; p.combo = 0;
    if (o) o.hit = true;
    G.crashes++;
    sfx('crash');
    puff(G, p.x, p.y, 14, 2.4);
    emit(G, 'pop', label || ['Gamelle !', 'Aïe !', 'Patatras !'][G.crashes % 3]);
  }

  function land(G) {
    const p = G.p;
    p.z = 0; p.vz = 0;
    if (p.trickT > 0) { crash(G, null, 'Figure ratée !'); return; }
    if (p.airT > 34) { G.score += 50; emit(G, 'pop', 'Réception +50'); }
    sfx('land');
    puff(G, p.x, p.y, 5, 1.2);
  }

  function steer(G, inp) {
    const p = G.p;
    if (inp.finger) {
      const dx = inp.finger.x - p.x, dy = inp.finger.y - (p.y - 8);
      if (Math.abs(dx) > 3 || Math.abs(dy) > 10) {
        p.target = dy < 6 ? (dx < 0 ? -MAXA : MAXA) : Math.atan2(dx, dy);
      }
    }
    if (inp.left) p.target -= 0.06;
    if (inp.right) p.target += 0.06;
    if (inp.down) p.target = 0;
    if (inp.up) p.target = p.angle < 0 ? -MAXA : MAXA;
    p.target = Math.max(-MAXA, Math.min(MAXA, p.target));
    const rate = p.z > 0 ? 0.03 : p.iceT > 0 ? 0.025 : 0.09;
    const d = p.target - p.angle;
    p.angle += Math.max(-rate, Math.min(rate, d));
    if (p.z <= 0 && p.speed > 3 && Math.abs(d) > 0.5 && G.frame % 2 === 0) {
      puff(G, p.x - Math.sin(p.angle) * 4, p.y, 1, 1.6);
      if (G.frame % 10 === 0) sfx('carve');
    }
  }

  function updatePlayer(G, inp) {
    const p = G.p;
    if (p.inv > 0) p.inv--;
    if (p.iceT > 0) p.iceT--;
    if (p.state === 'fallen') {
      if (--p.fallT <= 0) { p.state = 'ski'; p.inv = 40; p.speed = 0.6; }
      return;
    }
    if (p.state !== 'ski') return;
    steer(G, inp);

    const maxSp = G.mode === 'slalom' ? 4.4 : 4.2 + Math.min(1.3, G.meters / 2500);
    const c = Math.cos(p.angle);
    let target = maxSp * Math.pow(Math.max(0, c), 0.7);
    if (p.iceT > 0) target += 1.2;
    if (p.z <= 0) p.speed += (target - p.speed) * (target > p.speed ? 0.025 : 0.07);
    const side = Math.abs(p.angle) > 1.35 ? Math.sign(p.angle) * 0.7 : 0;
    p.vx = Math.sin(p.angle) * p.speed + side;
    p.vy = Math.cos(p.angle) * p.speed;
    p.x += p.vx; p.y += p.vy;

    if (inp.tap) {
      if (p.z <= 0) { p.vz = 2.0; p.z = 0.01; p.airT = 0; sfx('hop'); }
      else if (p.trickT === 0) { p.trickT = 26; sfx('trick'); }
    }
    if (p.z > 0) {
      p.airT++;
      p.vz -= 0.18; p.z += p.vz;
      if (p.trickT > 0 && --p.trickT === 0) {
        const pts = 100 * (1 + p.combo);
        p.combo++; G.tricks++; G.score += pts;
        sfx('trickok');
        emit(G, 'pop', 'Figure +' + pts);
      }
      if (p.z <= 0) land(G);
    }
    if (p.z <= 0 && G.frame % 1 === 0) {
      G.trail.push({ x: p.x, y: p.y, a: p.angle });
      if (G.trail.length > 280) G.trail.shift();
    } else if (G.trail.length && G.trail[G.trail.length - 1] !== null) G.trail.push(null);

    // Les objets autour des skis
    for (const o of TM.objectsIn(G.W, p.x - 24, p.y - 24, p.x + 24, p.y + 24)) {
      const def = TM.OBJ[o.type];
      if (!def || o.hit) continue;
      if (Math.abs(p.x - o.x) >= def.hw + 4 || Math.abs(p.y - o.y) >= def.hh + 2) continue;
      if (def.item) {
        if (p.z > 22) continue;
        o.hit = true;
        if (o.type === 'reel') { G.reels++; G.score += 10; sfx('reel'); }
        else { G.gold++; G.score += 500; sfx('gold'); emit(G, 'flash', 'Cassette dorée +500'); }
        continue;
      }
      if (p.z > def.clear) continue;
      if (def.crash) { if (!o.flat) crash(G, o); continue; }
      const fresh = o.last !== G.frame - 1;
      o.last = G.frame;
      if (!fresh) continue;
      if (def.effect === 'mogul' && p.z <= 1) {
        p.speed *= 0.82;
        sfx('bump');
        if (p.speed > 2.5) { p.vz = 1.1; p.z = 0.01; p.airT = 0; }
      } else if (def.effect === 'ramp' && p.z <= 1 && p.speed > 1) {
        p.vz = 1.6 + p.speed * 0.85; p.z = 0.01; p.airT = 0;
        sfx('ramp');
      } else if (def.effect === 'ice' && p.z <= 1) {
        p.iceT = 40;
        sfx('ice');
      }
    }
  }

  function updateMovers(G) {
    const p = G.p;
    for (const m of G.W.movers) {
      if (m.fallT > 0) { m.fallT--; continue; }
      m.t++;
      if (m.type === 'skier') {
        m.vx = Math.sin(m.t * 0.03) * m.speed * 0.7 * m.dir;
        m.y += m.speed * 0.8; m.x += m.vx;
      } else {
        m.x += m.dir * 1.1;
      }
      const near = Math.abs(p.x - m.x) < (m.type === 'ibex' ? 10 : 7) && Math.abs(p.y - m.y) < 5;
      if (near && p.state === 'ski' && p.inv === 0 && p.z < (m.type === 'ibex' ? 9 : 6)) {
        crash(G, null, m.type === 'ibex' ? 'Bouquetin !' : 'Pardon !');
        m.fallT = 70;
      }
    }
  }

  function updateDameuse(G) {
    const p = G.p;
    if (!G.dam && G.mode === 'descente' && G.meters >= DAM_AT) {
      G.dam = { x: p.x, y: p.y - 240, speed: 3.6, t: 0 };
      sfx('horn');
      emit(G, 'flash', 'La dameuse ! File !');
    }
    const d = G.dam;
    if (!d) return;
    d.t++;
    d.speed = Math.min(6.4, 3.6 + d.t / 60 * 0.035);
    if (d.away > 0) { // esquivée : elle file en bas, puis revient par derrière
      d.y += d.speed;
      if (--d.away === 0) { d.y = p.y - 320; d.x = p.x; emit(G, 'pop', 'Elle revient !'); sfx('horn'); }
      return;
    }
    if (p.y - d.y > 420) d.y = p.y - 420;
    d.y += d.speed;
    d.x += Math.max(-2, Math.min(2, (p.x - d.x) * 0.06));
    if (d.y - p.y > 90 && G.state === 'play') { d.away = 180; G.score += 200; emit(G, 'pop', 'Esquivée ! +200'); }
    for (const o of TM.objectsIn(G.W, d.x - 16, d.y - 6, d.x + 16, d.y + 2)) {
      if (TM.OBJ[o.type] && TM.OBJ[o.type].crash) { o.flat = true; o.hit = true; }
    }
    if (G.state === 'play' && p.state !== 'caught' && Math.abs(p.x - d.x) < 15 && p.y - d.y < 4 && p.y - d.y > -18 && p.z < 10) {
      p.state = 'caught'; p.speed = 0; p.flat = 1;
      G.state = 'over'; G.overT = 0;
      sfx('caught');
      emit(G, 'over');
    }
  }

  function updateSlalom(G) {
    const p = G.p, gates = G.W.gates;
    if (!G.started && p.y >= 200) { G.started = true; sfx('start'); emit(G, 'pop', 'Top départ !'); }
    if (G.started && !G.finished) G.time++;
    while (G.gateIdx < gates.length && p.y >= gates[G.gateIdx].y) {
      const g = gates[G.gateIdx];
      if (Math.abs(p.x - g.x) < 20) { g.state = 1; sfx('gate'); }
      else { g.state = 2; G.missed++; sfx('miss'); emit(G, 'pop', 'Porte manquée +5 s'); }
      G.gateIdx++;
    }
    if (!G.finished && p.y >= G.W.finishY) {
      G.finished = true; G.state = 'over'; G.overT = 0;
      sfx('finish');
      emit(G, 'over');
    }
  }

  function updateCamera(G) {
    const p = G.p, c = G.cam;
    const tx = p.x - TM.VW / 2 + Math.sin(p.angle) * 24;
    c.x += (tx - c.x) * 0.08;
    const ty = p.y - TM.VH * 0.32;
    c.y += (ty - c.y) * 0.25;
  }

  TM.step = function (G, inp) {
    G.frame++;
    if (G.state === 'play') {
      if (G.mode === 'descente') G.time++;
      updatePlayer(G, inp);
      G.meters = Math.max(0, Math.floor((G.p.y - 150) / TM.PX));
      if (G.mode === 'descente' && G.meters >= G.nextMark) { emit(G, 'pop', G.nextMark + ' m'); G.nextMark += 500; }
      if (G.mode === 'slalom') updateSlalom(G);
    } else {
      G.overT++;
      if (G.p.state === 'ski' && G.mode === 'slalom') { // on freine après l'arrivée
        G.p.speed *= 0.96; G.p.y += G.p.speed; G.p.angle *= 0.95;
      }
    }
    updateMovers(G);
    updateDameuse(G);
    updateCamera(G);
    for (const q of G.parts) { q.x += q.vx; q.y += q.vy; q.vz -= 0.08; q.z = Math.max(0, q.z + q.vz); q.life--; }
    G.parts = G.parts.filter(q => q.life > 0);
    if (G.frame % 30 === 0) TM.prune(G.W, G.cam.x + TM.VW / 2, G.cam.y);
  };

  // Temps du slalom avec les pénalités, en secondes
  TM.slalomTotal = function (G) { return G.time / 60 + G.missed * 5; };
})(window.TM);
