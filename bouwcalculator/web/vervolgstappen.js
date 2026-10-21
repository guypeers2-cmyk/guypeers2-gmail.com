/* Optional catalogue suggestions, never automatic quote lines or technical advice. */
(function(root){
  'use strict';
  const routes={
    elek_sleuf:['elek_kabel_3g25','elek_kabel_3g15','san_koudwater','san_warmwater','elek_sleuf_dichten'],
    elek_kabel_3g25:['elek_stopcontact','elek_stopcontact_dubbel','elek_schakelaar','elek_lichtpunt','elek_sleuf_dichten'],
    elek_kabel_3g15:['elek_schakelaar','elek_lichtpunt','elek_sleuf_dichten'],
    elek_stopcontact:['elek_kabel_3g25','elek_sleuf','elek_sleuf_dichten'],
    elek_stopcontact_dubbel:['elek_kabel_3g25','elek_sleuf','elek_sleuf_dichten'],
    elek_schakelaar:['elek_kabel_3g15','elek_lichtpunt','elek_sleuf_dichten'],
    elek_lichtpunt:['elek_kabel_3g15','elek_schakelaar','elek_sleuf_dichten'],
    san_koudwater:['san_koppeling','san_afsluitkraan','san_collector','san_isolatie','san_druktest'],
    san_warmwater:['san_koppeling','san_isolatie','san_afsluitkraan','san_druktest'],
    san_koppeling:['san_afsluitkraan','san_collector','san_druktest'],
    san_isolatie:['san_druktest','elek_sleuf_dichten'],
    san_afsluitkraan:['san_mengkraan','san_wc','san_wasmachine','san_druktest'],
    san_collector:['san_koudwater','san_warmwater','san_afsluitkraan','san_druktest'],
    san_afvoer50:['san_afvoerstuk','san_lavabo','san_wasmachine'],
    san_afvoer110:['san_afvoerstuk','san_wc'],
    san_afvoerstuk:['san_afvoer50','san_afvoer110'],
    san_wc:['san_koudwater','san_afvoer110','san_afsluitkraan','san_druktest'],
    san_lavabo:['san_mengkraan','san_koudwater','san_warmwater','san_afvoer50','san_druktest'],
    san_mengkraan:['san_koudwater','san_warmwater','san_afsluitkraan','san_druktest'],
    san_douchekraan:['san_koudwater','san_warmwater','san_afvoer50','san_druktest'],
    san_wasmachine:['san_koudwater','san_afvoer50','san_afsluitkraan','san_druktest'],
    san_druktest:['san_isolatie','elek_sleuf_dichten'],
    gyproc_wand_profiel:['elek_stopcontact','elek_schakelaar','gyproc_voegafwerking'],
    gyproc_plafond:['elek_lichtpunt','gyproc_voegafwerking'],
    gyproc_direct:['elek_stopcontact','gyproc_voegafwerking'],
    gyproc_voegafwerking:['schilderen_gyproc'],
    elek_sleuf_dichten:[],schilderen_gyproc:[]
  };
  function suggesties(id,pakketten){
    const beschikbaar=new Map(pakketten.map(p=>[p.id,p]));
    return (routes[id]||[]).filter(id=>beschikbaar.has(id)).map(id=>beschikbaar.get(id));
  }
  root.BouwVervolg={suggesties};
})(typeof window==='undefined'?globalThis:window);
