export const inventoraLogoPlayback = { speed: 0.5 };

const tiles = [
  { x: 60, y: 60, opacity: 100, dx: -14, dy: -10, rotation: -4 },
  { x: 180, y: 60, opacity: 15, dx: 14, dy: -10, rotation: 4 },
  { x: 60, y: 180, opacity: 15, dx: -14, dy: 10, rotation: -4 },
  { x: 180, y: 180, opacity: 100, dx: 14, dy: 10, rotation: 4 },
];

const curve = { i: { x: 0.2, y: 1 }, o: { x: 0.4, y: 0 } };

export const inventoraLogoAnimation = {
  v: '5.7.4', fr: 60, ip: 0, op: 72, w: 240, h: 240,
  nm: 'Inventora', ddd: 0, assets: [],
  layers: tiles.map((tile, index) => {
    const delay = index * 4;
    return {
      ddd: 0, ind: index + 1, ty: 4, nm: `Inventora ${index + 1}`, sr: 1,
      ks: {
        o: { a: 0, k: tile.opacity },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
        p: { a: 1, k: [
          { t: delay, s: [tile.x, tile.y, 0], ...curve },
          { t: delay + 12, s: [tile.x + tile.dx, tile.y + tile.dy, 0], ...curve },
          { t: delay + 44, s: [tile.x, tile.y, 0] },
        ] },
        r: { a: 1, k: [
          { t: delay, s: [0], ...curve },
          { t: delay + 12, s: [tile.rotation], ...curve },
          { t: delay + 44, s: [0] },
        ] },
      },
      shapes: [
        { ty: 'rc', d: 1, s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 15 } },
        { ty: 'fl', c: { a: 0, k: [237 / 255, 237 / 255, 237 / 255, 1] }, o: { a: 0, k: 100 }, r: 1 },
      ],
      ip: 0, op: 72, st: 0, bm: 0,
    };
  }),
};
