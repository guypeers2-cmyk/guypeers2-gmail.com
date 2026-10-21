/* Bounded, session-only project history. No DOM or calculation dependencies. */
(function () {
  'use strict';
  function maak(limiet=50) {
    let lijst=[],index=-1,laatsteSleutel='',laatsteTijd=0;
    function reset(project) {lijst=[JSON.stringify(project)];index=0;laatsteSleutel='';laatsteTijd=0;}
    function record(project,sleutel='',nu=Date.now()) {
      const json=JSON.stringify(project);
      if(lijst[index]===json)return;
      const samen=sleutel && sleutel===laatsteSleutel && nu-laatsteTijd<700 && index>0 && index===lijst.length-1;
      lijst=lijst.slice(0,index+1);
      if(samen)lijst[index]=json;
      else {lijst.push(json);if(lijst.length>limiet+1)lijst.shift();index=lijst.length-1;}
      laatsteSleutel=sleutel;laatsteTijd=nu;
    }
    function stap(delta) {
      const nieuw=index+delta;
      if(nieuw<0 || nieuw>=lijst.length)return null;
      index=nieuw;laatsteSleutel='';return JSON.parse(lijst[index]);
    }
    return {reset,record,undo:()=>stap(-1),redo:()=>stap(1),kanUndo:()=>index>0,kanRedo:()=>index<lijst.length-1};
  }
  window.BouwHistorie={maak};
})();
