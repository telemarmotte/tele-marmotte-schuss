// Essais automatiques de Schuss ! (à lancer dans la page du jeu)
(function () {
  const D = TM.debug, out = [];
  const ok = (name, cond, info) => out.push((cond ? 'OK   ' : 'ÉCHEC ') + name + (info !== undefined ? ' : ' + info : ''));
  const down = G => ({ finger: { x: G.p.x, y: G.p.y + 80 } });
  const put = (G, o) => { TM.objectsIn(G.W, o.x, o.y, o.x, o.y); G.W.chunks.get(Math.floor(o.x / 160) + ',' + Math.floor(o.y / 200)).list.push(o); };
  const clearAround = G => { for (const o of TM.objectsIn(G.W, G.p.x - 60, G.p.y - 20, G.p.x + 60, G.p.y + 400)) o.hit = true; G.W.movers.length = 0; };

  // 1. Tout schuss
  D.start('descente'); let G = D.G;
  clearAround(G);
  for (let i = 0; i < 150; i++) D.run(1, down(G));
  ok('prend de la vitesse tout droit', G.p.speed > 3.5, G.p.speed.toFixed(2) + ' px/image, ' + Math.round(G.p.speed * 21.6) + ' km/h');
  ok('compte les mètres', G.meters > 40, G.meters + ' m');

  // 2. Le doigt à gauche fait tourner à gauche, au-dessus fait s'arrêter
  const x0 = G.p.x;
  for (let i = 0; i < 40; i++) D.run(1, { finger: { x: G.p.x - 80, y: G.p.y + 40 } });
  ok('tourne vers le doigt', G.p.angle < -0.6 && G.p.x < x0 - 20, 'angle ' + G.p.angle.toFixed(2));
  for (let i = 0; i < 120; i++) D.run(1, { finger: { x: G.p.x - 80, y: G.p.y - 40 } });
  ok("doigt au-dessus : s'arrête", G.p.speed < 0.6, G.p.speed.toFixed(2));

  // 3. Sapin = chute, puis on repart
  D.start('descente'); G = D.G; clearAround(G);
  for (let i = 0; i < 60; i++) D.run(1, down(G));
  put(G, { type: 'tree', x: G.p.x, y: G.p.y + 12, s: 0.5 });
  for (let i = 0; i < 20; i++) D.run(1, down(G));
  ok('le sapin fait tomber', G.p.state === 'fallen' && G.crashes === 1);
  for (let i = 0; i < 70; i++) D.run(1, down(G));
  ok('se relève', G.p.state === 'ski');

  // 4. Saut, figure, figure ratée
  D.start('descente'); G = D.G; clearAround(G);
  for (let i = 0; i < 60; i++) D.run(1, down(G));
  D.run(1, { finger: down(G).finger, tap: true });
  let top = 0;
  for (let i = 0; i < 40; i++) { D.run(1, down(G)); top = Math.max(top, G.p.z); }
  ok('petit saut', top > 8 && G.p.z === 0 && G.p.state === 'ski', 'hauteur ' + top.toFixed(1));
  put(G, { type: 'ramp', x: G.p.x, y: G.p.y + 10 });
  top = 0; let tricked = false;
  for (let i = 0; i < 90; i++) {
    const tap = G.p.z > 10 && !tricked;
    if (tap) tricked = true;
    D.run(1, { finger: down(G).finger, tap: tap });
    top = Math.max(top, G.p.z);
  }
  ok('le tremplin envoie haut', top > 30, 'hauteur ' + top.toFixed(0));
  ok('figure réussie', G.tricks === 1 && G.score >= 100, G.tricks + ' figure, ' + G.score + ' pts');
  put(G, { type: 'ramp', x: G.p.x, y: G.p.y + 10 });
  let late = false;
  for (let i = 0; i < 90; i++) {
    const tap = G.p.z > 0 && G.p.z < 6 && G.p.vz < 0 && !late;
    if (tap) late = true;
    D.run(1, { finger: down(G).finger, tap: tap });
  }
  ok('figure trop tard = chute', G.crashes >= 1, G.crashes + ' chute');

  // 5. La dameuse
  D.start('descente'); G = D.G;
  G.p.y = 150 + 1000 * TM.PX; G.cam.y = G.p.y - 80; clearAround(G);
  D.run(2, down(G));
  ok('la dameuse arrive à 1000 m', !!G.dam, G.dam ? 'à ' + Math.round((G.p.y - G.dam.y) / TM.PX) + ' m derrière' : '');
  for (let i = 0; i < 600 && G.state === 'play'; i++) D.run(1, { finger: { x: G.p.x - 80, y: G.p.y - 40 } });
  ok("à l'arrêt, elle rattrape", G.state === 'over' && G.p.state === 'caught');
  for (let i = 0; i < 130; i++) D.run(1);
  ok("l'écran « Damée ! » s'affiche", !document.getElementById('scr-over').hidden);

  // 6. Slalom piloté automatiquement vers chaque porte
  D.start('slalom'); G = D.G;
  for (let i = 0; i < 6000 && G.state === 'play'; i++) {
    const gt = G.W.gates[Math.min(G.gateIdx, G.W.gates.length - 1)];
    G.W.movers.length = 0;
    D.run(1, { finger: { x: G.gateIdx < G.W.gates.length ? gt.x : TM.courseX(G.W, G.W.finishY), y: G.p.y + 90 } });
  }
  ok('le slalom se termine', G.finished, (G.time / 60).toFixed(1) + ' s, ' + G.missed + ' portes manquées, ' + G.crashes + ' chutes');
  return out.join('\n');
})();
