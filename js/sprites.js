// Schuss ! : sprites en pixel art (une lettre = une couleur, "." = transparent)
window.TM = window.TM || {};
(function (TM) {
  const PAL = {
    k: '#2b1a10', // contour
    d: '#74461f', // brun foncé
    b: '#a8693a', // brun marmotte
    l: '#e8bd86', // ventre
    w: '#fffaf0', // blanc
    n: '#141018', // noir
    r: '#d8332b', // bonnet et écharpe
    g: '#a3aab4', // gris
    G: '#5c636e', // gris foncé
    h: '#c89a62', // bois clair
    H: '#7a5232', // bois foncé
    s: '#ffffff', // neige
    S: '#c9d9ee', // ombre de neige
    y: '#f5c842', // or
    Y: '#b8871d'
  };
  const RAW = {};

  // Marmotte de face (vers le bas de la pente). Les skis et les bâtons sont dessinés à part.
  RAW.front = [
    '.......ww.......',
    '......kwwk......',
    '.....krrrrk.....',
    '....krrrrrrk....',
    '....kwwwwwwk....',
    '...kbbbbbbbbk...',
    '...kbnbbbbnbk...',
    '...kbbbkkbbbk...',
    '....kblwwlbk....',
    '...kkrrrrrrkk...',
    '..kbkllllllkbk..',
    '.kbk.kllllk.kbk.',
    '.kk..kbllbk..kk.',
    '.....kbbbbk.....',
    '.....kbkkbk.....',
    '.....kk..kk.....'
  ];
  RAW.back = RAW.front.slice();
  RAW.back[6] = '...kbbbbbbbbk...';
  RAW.back[7] = '...kbbbbbbbbk...';
  RAW.back[8] = '....kbbbbbbk....';
  RAW.back[10] = '..kbkbbbbbbkbk..';
  RAW.back[11] = '.kbk.kbbbbk.kbk.';
  // De profil, tournée vers la gauche
  RAW.side = [
    '.........ww.....',
    '......kkkkwk....',
    '.....krrrrrrk...',
    '.....kwwwwwwk...',
    '....kbbbbbbbk...',
    '...kbnbbbbbbk...',
    '..kkbbbbbbbbk...',
    '..kwlbbbbbbk....',
    '....krrrrrrrrk..',
    '....kbllbbbbk...',
    '...kbkllbbbbk...',
    '..kbk.kllbbbk...',
    '..kk..kbbbbbk...',
    '......kbbbbk....',
    '......kbkkbk....',
    '......kk..kk....'
  ];
  // Bras levés pour les figures
  RAW.grab = RAW.front.slice();
  RAW.grab[9] = 'kk.kkrrrrrrkk.kk';
  RAW.grab[10] = 'kbkbkllllllkbkbk';
  RAW.grab[11] = '.kk..kllllk..kk.';
  RAW.grab[12] = '.....kbllbk.....';

  RAW.rock = [
    '....kkkkk.....',
    '..kksssssk....',
    '.kgggggggGk...',
    '.kggwggggGGk..',
    'kgggggggggGGk.',
    'kGgggggggGGGGk',
    'kGGGgggGGGGGGk',
    '.kkGGGGGGGGkk.',
    '..kkkkkkkkkk..'
  ];
  RAW.stump = [
    '..kkkkkkkk..',
    '.kssssssssk.',
    '.khhHhhHhhk.',
    '.kHHHHHHHHk.',
    '.kHdHHHdHHk.',
    '.kHHHHdHHHk.',
    'kkHHHHHHHHkk',
    '.kkkkkkkkkk.'
  ];
  RAW.reel = [
    '....kkkk....',
    '..kkggggkk..',
    '.kgggGGgggk.',
    '.kgggGGgggk.',
    'kgGGggggGGgk',
    'kgGGgkkgGGgk',
    'kggggkkggggk',
    'kggGGggGGggk',
    '.kgGGggGGgk.',
    '.kggggggggk.',
    '..kkggggkk..',
    '....kkkk....'
  ];
  RAW.cassette = [
    'kkkkkkkkkkkkkk',
    'kyyyyyyyyyyyyk',
    'kykkkkkkkkkkyk',
    'kykwnkkkknwkyk',
    'kykkkkkkkkkkyk',
    'kyyyyyyyyyyyyk',
    'kYYYYYYYYYYYYk',
    'kkkkkkkkkkkkkk'
  ];
  RAW.ibex1 = [
    '....................',
    '...........kkkk.....',
    '..........kHHHHk....',
    '.........kHk..kHk...',
    '.........kk...kHhk..',
    '.............khhhnk.',
    '..kkkkkkkkkkkkhhhhk.',
    '.khhhhhhhhhhhhhhhhhk',
    '.kHhhhhhhhhhhhhkHk..',
    '.kHHhhhhhhhhhhhk.k..',
    '..kHHhhhhhhhhhk.....',
    '..khk.kHk..khk.kHk..',
    '..khk.kHk..khk.kHk..',
    '..kHk.kHk..kHk.kHk..',
    '..kkk.kkk..kkk.kkk..'
  ];
  RAW.ibex2 = RAW.ibex1.slice(0, 11).concat([
    '..khkkHk...khkkHk...',
    '..khkkHk...khkkHk...',
    '..kHkkHk...kHkkHk...',
    '..kkkkkk...kkkkkk...'
  ]);

  function build(name, rows, swap) {
    const w = Math.max.apply(null, rows.map(r => r.length)), h = rows.length;
    rows.forEach((r, i) => { if (r.length !== w) console.warn('sprite', name, 'ligne', i, r.length, '≠', w); });
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        let ch = rows[y][x];
        if (ch === '.') continue;
        if (swap && swap[ch]) ch = swap[ch];
        g.fillStyle = PAL[ch] || ch;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  function flip(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }
  function add(key, rows, swap) {
    const r = build(key, rows, swap);
    TM.SPR[key] = { r: r, l: flip(r), w: r.width, h: r.height };
  }

  TM.PAL = PAL;
  TM.SPR = {};
  for (const k in RAW) add(k, RAW[k]);
  // Les autres skieurs : des marmottes en bonnet bleu ou vert
  const SKIERS = [{ r: '#3b6fd8' }, { r: '#3f9f4a' }, { r: '#8a45c4' }];
  SKIERS.forEach((swap, i) => {
    add('front' + i, RAW.front, swap);
    add('side' + i, RAW.side, swap);
  });
})(window.TM);
