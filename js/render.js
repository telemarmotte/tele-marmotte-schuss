// Schuss ! : dessin de la pente (écran interne de 160 pixels de large)
window.TM = window.TM || {};
(function (TM) {
  const C = {
    snow: '#f3f7fc', speck: '#dfe8f3', shade: '#d3dfee', trail: '#c9d7ea',
    fir: '#2e6b4f', firDk: '#1f4d39', firLt: '#ffffff', trunk: '#6b4423',
    ski: '#2b1a10', pole: '#5c636e', ice: '#bfe6f7', iceLt: '#ffffff'
  };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Motif de neige, répété
  const snowTile = (function () {
    const c = canvas(64, 64), g = c.getContext('2d'), r = TM.rng(3);
    g.fillStyle = C.snow; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 26; i++) { g.fillStyle = C.speck; g.fillRect(r() * 64 | 0, r() * 64 | 0, 2, 1); }
    for (let i = 0; i < 4; i++) { g.fillStyle = '#ffffff'; g.fillRect(r() * 64 | 0, r() * 64 | 0, 1, 1); }
    return c;
  })();

  // Sapins enneigés en trois tailles, plus un arbre mort
  function makeFir(h) {
    const w = Math.round(h * 0.7) | 1, c = canvas(w, h + 4), g = c.getContext('2d');
    const mid = (w - 1) / 2;
    g.fillStyle = C.trunk; g.fillRect(Math.round(mid) - 1, h - 3, 3, 5);
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const top = Math.round(t * (h - 4) / (tiers + 0.6)), bot = Math.round(top + (h - 4) * 0.55);
      for (let y = top; y <= bot; y++) {
        const k = (y - top) / (bot - top);
        const half = Math.round(1 + k * (mid - 1) * (0.55 + t * 0.22));
        g.fillStyle = (y === bot) ? C.firDk : C.fir;
        g.fillRect(Math.round(mid - half), y, half * 2 + 1, 1);
        if (k < 0.45) { g.fillStyle = C.firLt; g.fillRect(Math.round(mid - half), y, Math.max(1, half), 1); }
        g.fillStyle = C.firDk; g.fillRect(Math.round(mid + half), y, 1, 1);
      }
    }
    return c;
  }
  function makeDead() {
    const c = canvas(14, 20), g = c.getContext('2d');
    g.fillStyle = '#5a3a22';
    g.fillRect(6, 3, 2, 17);
    [[2, 6, 4], [8, 8, 4], [3, 11, 3], [8, 4, 3], [4, 15, 2]].forEach(([x, y, l]) => g.fillRect(x, y, l, 1));
    g.fillStyle = '#ffffff'; g.fillRect(6, 3, 2, 1); g.fillRect(2, 5, 3, 1); g.fillRect(8, 7, 3, 1);
    return c;
  }
  const FIRS = [makeFir(18), makeFir(23), makeFir(27)], BIG = makeFir(36), DEAD = makeDead();

  function shadow(g, x, y, w) {
    g.fillStyle = C.shade;
    g.fillRect(Math.round(x - w / 2), Math.round(y), w, 1);
    g.fillRect(Math.round(x - w / 2 + 1), Math.round(y + 1), w - 2, 1);
  }
  function line(g, x0, y0, x1, y1, col, thick) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    g.fillStyle = col;
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      g.fillRect(x, y, thick || 1, thick || 1);
    }
  }
  function blit(g, img, x, y) { g.drawImage(img, Math.round(x), Math.round(y)); }

  function drawObject(g, o, sx, sy, f) {
    switch (o.type) {
      case 'tree': case 'big': {
        if (o.flat) { g.fillStyle = C.firDk; g.fillRect(sx - 7, sy - 1, 14, 3); g.fillStyle = C.fir; g.fillRect(sx - 6, sy - 2, 12, 1); break; }
        const img = o.type === 'big' ? BIG : FIRS[Math.floor((o.s || 0) * 3)];
        shadow(g, sx + 2, sy, img.width - 2);
        blit(g, img, sx - (img.width - 1) / 2, sy - img.height + 2);
        break;
      }
      case 'dead':
        if (o.flat) { g.fillStyle = '#5a3a22'; g.fillRect(sx - 6, sy - 1, 12, 2); break; }
        shadow(g, sx + 1, sy, 8); blit(g, DEAD, sx - 7, sy - 19); break;
      case 'rock': case 'stump': {
        const s = TM.SPR[o.type];
        if (o.flat && o.type === 'stump') break;
        shadow(g, sx + 1, sy, s.w); blit(g, s.r, sx - s.w / 2, sy - s.h + 2); break;
      }
      case 'mogul':
        g.fillStyle = C.shade; g.fillRect(sx - 6, sy - 1, 14, 3); g.fillRect(sx - 4, sy + 2, 10, 1);
        g.fillStyle = '#ffffff'; g.fillRect(sx - 7, sy - 3, 13, 3); g.fillRect(sx - 5, sy - 4, 9, 1);
        break;
      case 'ramp':
        g.fillStyle = C.shade; g.fillRect(sx - 9, sy + 2, 18, 2);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 7; i++) g.fillRect(sx - 6 - (i >> 1), sy - 6 + i, 12 + (i >> 1) * 2, 1);
        g.fillStyle = '#d8332b'; g.fillRect(sx - 9, sy + 1, 18, 1);
        g.fillStyle = '#f5c842'; g.fillRect(sx - 9, sy + 1, 2, 1); g.fillRect(sx - 3, sy + 1, 2, 1); g.fillRect(sx + 3, sy + 1, 2, 1);
        g.fillStyle = C.pole; g.fillRect(sx - 10, sy - 6, 1, 8); g.fillRect(sx + 9, sy - 6, 1, 8);
        g.fillStyle = '#d8332b'; g.fillRect(sx - 9, sy - 6, 3, 2); g.fillRect(sx + 10, sy - 6, 3, 2);
        break;
      case 'ice':
        g.fillStyle = C.ice; g.fillRect(sx - 11, sy - 3, 22, 7); g.fillRect(sx - 8, sy - 5, 16, 11);
        g.fillStyle = C.iceLt; g.fillRect(sx - 6, sy - 3, 4, 1); g.fillRect(sx + 2, sy, 5, 1); g.fillRect(sx - 2, sy + 2, 2, 1);
        break;
      case 'reel': case 'gold': {
        if (o.hit) break;
        const s = TM.SPR[o.type === 'reel' ? 'reel' : 'cassette'];
        const bob = Math.sin(f * 0.1 + o.x) * 1.5;
        shadow(g, sx, sy + 1, 8);
        if (o.type === 'reel') {
          const w = Math.max(2, Math.round(12 * Math.abs(Math.cos(f * 0.07 + o.y * 0.05))));
          g.drawImage(s.r, Math.round(sx - w / 2), Math.round(sy - 16 + bob), w, 12);
        } else blit(g, s.r, sx - 7, sy - 14 + bob);
        break;
      }
    }
  }

  function drawSkis(g, x, y, a, z) {
    const hx = Math.sin(a) * 7, hy = Math.cos(a) * 3;
    const px = Math.cos(a) * 3, py = -Math.sin(a) * 1.2;
    for (const s of [-1, 1]) {
      const cx = x + px * s, cy = y + py * s - z;
      line(g, cx - hx * 0.5, cy - hy * 0.5 - 1, cx + hx, cy + hy, C.ski, 1);
    }
  }

  // Une marmotte à skis (le joueur ou les autres), pieds en (x, y)
  function drawSkier(g, sx, sy, a, z, opts) {
    const S = TM.SPR, v = opts.variant === undefined ? '' : String(opts.variant);
    if (z > 0) shadow(g, sx, sy, 12);
    if (opts.fallen) {
      const img = S[(v ? 'side' + v : 'side')].r;
      g.save(); g.translate(Math.round(sx), Math.round(sy - 4)); g.rotate(Math.PI / 2);
      g.drawImage(img, -8, -8); g.restore();
      line(g, sx - 9, sy - 4, sx + 8, sy + 2, C.ski, 1); line(g, sx - 8, sy + 2, sx + 9, sy - 4, C.ski, 1);
      if (opts.stars) for (let i = 0; i < 3; i++) {
        const t = opts.f * 0.15 + i * 2.1;
        g.fillStyle = '#f5c842'; g.fillRect(Math.round(sx + Math.cos(t) * 8), Math.round(sy - 14 + Math.sin(t) * 3), 2, 2);
      }
      return;
    }
    if (opts.flat) {
      g.drawImage(S.front.r, Math.round(sx - 9), Math.round(sy - 4), 18, 4);
      line(g, sx - 9, sy + 1, sx + 9, sy + 1, C.ski, 1);
      return;
    }
    let img;
    if (opts.spin !== undefined) {
      const k = opts.spin % 4;
      img = k === 0 ? S.front.r : k === 1 ? S.side.l : k === 2 ? S.back.r : S.side.r;
    } else if (Math.abs(a) < 0.55) img = S[v ? 'front' + v : 'front'].r;
    else img = a < 0 ? S[v ? 'side' + v : 'side'].r : S[v ? 'side' + v : 'side'].l;
    drawSkis(g, sx, sy, a, z);
    const top = sy - 17 - z;
    if (Math.abs(a) < 0.55 && opts.spin === undefined) {
      line(g, sx - 6, top + 12, sx - 7, sy - z, C.pole, 1);
      line(g, sx + 6, top + 12, sx + 7, sy - z, C.pole, 1);
    }
    blit(g, img, sx - 8, top);
  }

  function drawDameuse(g, d, sx, sy, f) {
    shadow(g, sx, sy + 1, 34);
    const x = Math.round(sx - 16), y = Math.round(sy - 26);
    // chenilles
    for (const tx of [x, x + 25]) {
      g.fillStyle = '#2c2c32'; g.fillRect(tx, y + 6, 7, 18);
      g.fillStyle = '#55555e';
      for (let k = 0; k < 6; k++) g.fillRect(tx, y + 6 + ((k * 3 + (f >> 1)) % 18), 7, 1);
    }
    // caisse et cabine
    g.fillStyle = '#b02a20'; g.fillRect(x + 7, y + 8, 18, 15);
    g.fillStyle = '#d8392c'; g.fillRect(x + 7, y + 8, 18, 4);
    g.fillStyle = '#e9edf2'; g.fillRect(x + 9, y, 14, 9);
    g.fillStyle = '#7fc3ea'; g.fillRect(x + 10, y + 2, 12, 5);
    g.fillStyle = '#2b1a10'; g.fillRect(x + 15, y + 3, 2, 4);
    g.fillStyle = (f >> 3) % 2 ? '#ffb020' : '#a05a00'; g.fillRect(x + 15, y - 2, 3, 2);
    g.fillStyle = '#fff2a0'; g.fillRect(x + 9, y + 18, 3, 2); g.fillRect(x + 20, y + 18, 3, 2);
    // lame devant
    g.fillStyle = '#9aa3ad'; g.fillRect(x - 2, y + 24, 36, 3);
    g.fillStyle = '#c9d0d8'; g.fillRect(x, y + 23, 32, 1);
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) g.fillRect(x + ((k * 9 + f * 2) % 34) - 1, y + 28 + (k % 2), 2, 1);
  }

  function drawFlag(g, sx, sy, color, state) {
    g.fillStyle = C.pole; g.fillRect(Math.round(sx), Math.round(sy - 13), 1, 14);
    g.fillStyle = state === 1 ? (color === 'red' ? '#f0a39e' : '#a9c1ee') : (color === 'red' ? '#d8332b' : '#2f62d4');
    g.fillRect(Math.round(sx + 1), Math.round(sy - 13), 6, 4);
    g.fillRect(Math.round(sx + 1), Math.round(sy - 9), 3, 1);
  }
  function drawBanner(g, sx, sy, w, f) {
    g.fillStyle = C.pole;
    g.fillRect(Math.round(sx - w / 2), Math.round(sy - 22), 2, 23);
    g.fillRect(Math.round(sx + w / 2 - 2), Math.round(sy - 22), 2, 23);
    for (let i = 0; i < w - 4; i += 4) {
      g.fillStyle = ((i >> 2) % 2) ? '#141018' : '#ffffff'; g.fillRect(Math.round(sx - w / 2 + 2 + i), Math.round(sy - 22), 4, 3);
      g.fillStyle = ((i >> 2) % 2) ? '#ffffff' : '#141018'; g.fillRect(Math.round(sx - w / 2 + 2 + i), Math.round(sy - 19), 4, 3);
    }
    g.fillStyle = '#d8332b'; g.fillRect(Math.round(sx - w / 2 + 2), Math.round(sy - 16), w - 4, 3);
  }

  TM.render = function (g, G) {
    const VW = TM.VW, VH = TM.VH, f = G.frame, W = G.W, p = G.p;
    const cx = Math.round(G.cam.x), cy = Math.round(G.cam.y);
    // neige
    const ox = -(((cx % 64) + 64) % 64), oy = -(((cy % 64) + 64) % 64);
    for (let y = oy; y < VH; y += 64) for (let x = ox; x < VW; x += 64) g.drawImage(snowTile, x, y);
    // traces de skis
    g.strokeStyle = C.trail; g.lineWidth = 1;
    for (const s of [-1, 1]) {
      g.beginPath();
      let pen = false;
      for (const t of G.trail) {
        if (!t) { pen = false; continue; }
        const x = t.x + Math.cos(t.a) * 3 * s - cx + 0.5, y = t.y - Math.sin(t.a) * 1.2 * s - cy + 0.5;
        if (pen) g.lineTo(x, y); else g.moveTo(x, y);
        pen = true;
      }
      g.stroke();
    }
    // objets, triés de haut en bas pour que les plus proches passent devant
    const list = [];
    for (const o of TM.objectsIn(W, cx - 20, cy - 10, cx + VW + 20, cy + VH + 40)) list.push({ y: o.y, o: o });
    for (const m of W.movers) if (m.y > cy - 20 && m.y < cy + VH + 30) list.push({ y: m.y, m: m });
    if (W.mode === 'slalom') {
      for (const gt of W.gates) if (gt.y > cy - 10 && gt.y < cy + VH + 20) {
        list.push({ y: gt.y, flag: gt, x: gt.x - 20 }); list.push({ y: gt.y, flag: gt, x: gt.x + 20 });
      }
      if (W.finishY > cy - 10 && W.finishY < cy + VH + 30) list.push({ y: W.finishY, banner: 90, x: TM.courseX(W, W.finishY) });
      list.push({ y: 200, banner: 70, x: 0 });
    } else list.push({ y: 120, banner: 70, x: 0 });
    list.push({ y: p.y, player: true });
    if (G.dam) list.push({ y: G.dam.y, dam: true });
    list.sort((a, b) => a.y - b.y);

    for (const it of list) {
      if (it.o) drawObject(g, it.o, it.o.x - cx, it.o.y - cy, f);
      else if (it.m) {
        const m = it.m;
        if (m.type === 'ibex') {
          const s = TM.SPR[(m.t >> 3) % 2 ? 'ibex2' : 'ibex1'];
          shadow(g, m.x - cx, m.y - cy, 16);
          blit(g, m.dir > 0 ? s.r : s.l, m.x - cx - 10, m.y - cy - 14);
        } else {
          drawSkier(g, m.x - cx, m.y - cy, Math.atan2(m.vx || 0, m.speed), 0, { variant: m.v, fallen: m.fallT > 0, f: f });
        }
      } else if (it.flag) drawFlag(g, it.x - cx, it.y - cy, it.flag.color, it.flag.state);
      else if (it.banner) drawBanner(g, it.x - cx, it.y - cy, it.banner, f);
      else if (it.dam) drawDameuse(g, G.dam, G.dam.x - cx, G.dam.y - cy, f);
      else if (it.player) {
        if (p.inv > 0 && (p.inv >> 2) % 2) continue;
        drawSkier(g, p.x - cx, p.y - cy, p.angle, p.z, {
          fallen: p.state === 'fallen', stars: true, flat: p.state === 'caught', f: f,
          spin: p.trickT > 0 ? Math.floor((26 - p.trickT) / 6.5) : undefined
        });
      }
    }
    // poudreuse
    for (const q of G.parts) {
      const x = Math.round(q.x - cx), y = Math.round(q.y - cy - q.z);
      g.fillStyle = q.life > 12 ? '#ffffff' : C.speck;
      g.fillRect(x, y, 2, 2);
      g.fillStyle = C.shade; g.fillRect(x, y + 2, 2, 1);
    }
  };
})(window.TM);
