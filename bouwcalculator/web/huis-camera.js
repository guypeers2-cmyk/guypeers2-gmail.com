/* Session-only house camera. No project, DOM, storage or price dependencies. */
(function () {
  'use strict';
  const finite = n => {
    n = Number(n);
    if (!Number.isFinite(n)) throw Error('Ongeldige camerawaarde.');
    return n;
  };
  const bound = (n, lo, hi) => Math.max(lo, Math.min(hi, finite(n)));
  function draai(x, y, lengte, breedte, hoek = 0) {
    const index = ((Math.trunc(finite(hoek)) % 4) + 4) % 4;
    return [[x,y], [y,lengte-x], [lengte-x,breedte-y], [breedte-y,x]][index];
  }
  function viewBox(center, zoom = 1, x = 0, y = 0) {
    zoom = bound(zoom, 1, 3);
    const width = 800/zoom, height = 500/zoom;
    const cx = bound(center[0], width/2, 800-width/2);
    const cy = bound(center[1], height/2, 500-height/2);
    return [cx-width/2+bound(x,-800,800), cy-height/2+bound(y,-500,500), width, height];
  }
  function maak() {
    let zoom = 1, hoek = 0, x = 0, y = 0;
    const lees = () => ({zoom, hoek, x, y});
    return {
      lees,
      zoom(n) { zoom = bound(n,1,3); return lees(); },
      verschuif(nx, ny) { const px = bound(nx,-800,800), py = bound(ny,-500,500); x = px; y = py; return lees(); },
      draai(delta) { hoek = ((hoek+Math.trunc(finite(delta)))%4+4)%4; x = y = 0; return lees(); },
      passend() { zoom = 1; x = y = 0; return lees(); },
    };
  }
  globalThis.BouwHuisCamera = {maak, draai, viewBox};
})();
