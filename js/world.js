// Schuss ! : la montagne, fabriquée au fur et à mesure par carrés de 160 x 200 pixels
window.TM = window.TM || {};
(function (TM) {
  const CW = 160, CH = 200;
  const PX = 10; // pixels par mètre
  TM.PX = PX;

  // Boîte de choc autour du pied de chaque objet ; "clear" = hauteur de saut qui passe au-dessus
  TM.OBJ = {
    tree: { hw: 3, hh: 3, clear: 16, crash: true },
    big: { hw: 4, hh: 3, clear: 22, crash: true },
    dead: { hw: 3, hh: 3, clear: 13, crash: true },
    rock: { hw: 6, hh: 3, clear: 5, crash: true },
    stump: { hw: 5, hh: 3, clear: 5, crash: true },
    mogul: { hw: 7, hh: 3, clear: 3, effect: 'mogul' },
    ramp: { hw: 8, hh: 4, clear: 2, effect: 'ramp' },
    ice: { hw: 12, hh: 5, clear: 2, effect: 'ice' },
    reel: { hw: 6, hh: 6, item: true },
    gold: { hw: 8, hh: 6, item: true }
  };

  function hash(a, b, c) {
    let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function rng(seed) { // mulberry32
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  TM.rng = rng;

  TM.newWorld = function (mode, seed) {
    const W = { mode: mode, seed: seed, chunks: new Map(), movers: [], gates: [], finishY: 0 };
    if (mode === 'slalom') {
      for (let i = 0; i < 30; i++) {
        W.gates.push({
          x: Math.round(46 * Math.sin(i * 0.85) + (i % 2 ? 26 : -26)),
          y: 360 + i * 230, color: i % 2 ? 'blue' : 'red', state: 0
        });
      }
      W.finishY = W.gates[W.gates.length - 1].y + 320;
    }
    return W;
  };

  // Le milieu du parcours de slalom à la hauteur y
  function courseX(W, y) {
    const G = W.gates;
    if (y <= G[0].y) return G[0].x * Math.max(0, y) / G[0].y;
    for (let i = 1; i < G.length; i++) {
      if (y <= G[i].y) {
        const t = (y - G[i - 1].y) / (G[i].y - G[i - 1].y);
        return G[i - 1].x + (G[i].x - G[i - 1].x) * t;
      }
    }
    return G[G.length - 1].x;
  }
  TM.courseX = courseX;

  function tooClose(list, x, y, d) {
    for (const o of list) if (Math.abs(o.x - x) < d && Math.abs(o.y - y) < d) return true;
    return false;
  }

  function genDescente(W, r, list, x0, y0) {
    const m = y0 / PX;
    const dens = Math.min(1, 0.3 + m / 2500);
    const n = Math.round(2 + dens * 7 + r() * 2);
    for (let k = 0; k < n; k++) {
      const x = x0 + r() * CW, y = y0 + r() * CH;
      if (y < 520 && Math.abs(x) < 80) continue; // la piste de départ reste libre
      if (tooClose(list, x, y, 16)) continue;
      const t = r();
      if (t < 0.38) list.push({ type: 'tree', x: x, y: y, s: r() });
      else if (t < 0.44) list.push({ type: 'big', x: x, y: y, s: r() });
      else if (t < 0.50) list.push({ type: 'dead', x: x, y: y, s: r() });
      else if (t < 0.60) list.push({ type: 'rock', x: x, y: y });
      else if (t < 0.67) list.push({ type: 'stump', x: x, y: y });
      else if (t < 0.74) {
        const c = 3 + (r() * 3 | 0);
        for (let q = 0; q < c; q++) list.push({ type: 'mogul', x: x + (r() - 0.5) * 50, y: y + (r() - 0.5) * 40 });
      } else if (t < 0.81) list.push({ type: 'ramp', x: x, y: y });
      else if (t < 0.85) list.push({ type: 'ice', x: x, y: y });
      else {
        const c = 3 + (r() * 3 | 0), dx = (r() - 0.5) * 16;
        for (let q = 0; q < c; q++) list.push({ type: 'reel', x: x + dx * q, y: y + q * 18 });
      }
    }
    if (m > 100 && r() < 0.025) list.push({ type: 'gold', x: x0 + r() * CW, y: y0 + r() * CH });
    if (m > 150 && r() < 0.2) {
      const v = r() * 3 | 0, dir = r() < 0.5 ? -1 : 1;
      W.movers.push({ type: 'skier', v: v, x: x0 + r() * CW, y: y0 + r() * CH, dir: dir, t: r() * 100, speed: 1.6 + r() * 1.2 });
    }
    if (m > 350 && r() < 0.09) {
      const dir = r() < 0.5 ? -1 : 1;
      W.movers.push({ type: 'ibex', x: x0 + r() * CW, y: y0 + r() * CH, dir: dir, t: 0 });
    }
  }

  function genSlalom(W, r, list, x0, y0) {
    const n = 12;
    for (let k = 0; k < n; k++) {
      const x = x0 + r() * CW, y = y0 + r() * CH;
      if (y < 240 || y > W.finishY - 60) { if (Math.abs(x - courseX(W, y)) < 130) continue; }
      const off = Math.abs(x - courseX(W, Math.min(y, W.finishY)));
      if (tooClose(list, x, y, 14)) continue;
      let nearGate = false;
      for (const gt of W.gates) if (Math.abs(gt.y - y) < 26 && Math.abs(gt.x - x) < 46) nearGate = true;
      if (nearGate) continue;
      if (off > 100) list.push({ type: r() < 0.85 ? 'tree' : 'big', x: x, y: y, s: r() });
      else if (off < 80 && y > 2200 && y < W.finishY - 100 && r() < 0.12) {
        list.push({ type: r() < 0.5 ? 'mogul' : 'rock', x: x, y: y });
      }
    }
    if (y0 > 300 && y0 < W.finishY && r() < 0.5) {
      const y = y0 + r() * CH, x = courseX(W, y) + (r() - 0.5) * 60;
      if (!tooClose(list, x, y, 20)) list.push({ type: 'reel', x: x, y: y });
    }
  }

  function chunk(W, i, j) {
    const key = i + ',' + j;
    let c = W.chunks.get(key);
    if (!c) {
      const r = rng(hash(i, j, W.seed));
      c = { i: i, j: j, list: [] };
      if (j >= 0) {
        if (W.mode === 'slalom') genSlalom(W, r, c.list, i * CW, j * CH);
        else genDescente(W, r, c.list, i * CW, j * CH);
      }
      W.chunks.set(key, c);
    }
    return c;
  }

  // Tous les objets fixes dans un rectangle de la montagne
  TM.objectsIn = function (W, x0, y0, x1, y1) {
    const out = [];
    for (let j = Math.floor(y0 / CH); j <= Math.floor(y1 / CH); j++)
      for (let i = Math.floor(x0 / CW); i <= Math.floor(x1 / CW); i++)
        for (const o of chunk(W, i, j).list)
          if (o.x >= x0 - 30 && o.x <= x1 + 30 && o.y >= y0 - 40 && o.y <= y1 + 40) out.push(o);
    return out;
  };

  // On oublie ce qui est loin derrière
  TM.prune = function (W, cx, cy) {
    for (const [key, c] of W.chunks) {
      if ((c.j + 1) * CH < cy - 300 || Math.abs((c.i + 0.5) * CW - cx) > 1600) W.chunks.delete(key);
    }
    W.movers = W.movers.filter(m => m.y > cy - 300 && Math.abs(m.x - cx) < 700);
  };
})(window.TM);
