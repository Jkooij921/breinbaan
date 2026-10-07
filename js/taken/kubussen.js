// Kubussen: je ziet een uitgevouwen kubus. Welke kubus kun je ervan vouwen?
// Meet ruimtelijk inzicht. Zelf gemaakt volgens regels, niet overgenomen uit een bestaande test.
BB.kubussen = (function () {
  const el = BB.el;

  // De 11 manieren om een kubus uit te vouwen, als vakjes [x, y] op een rooster.
  const UITSLAGEN = [];
  for (const ab of [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]]) UITSLAGEN.push([[0, 1], [1, 1], [2, 1], [3, 1], [ab[0], 0], [ab[1], 2]]);
  for (const b of [1, 2, 3]) UITSLAGEN.push([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [b, 2]]);
  UITSLAGEN.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]]);
  UITSLAGEN.push([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]);

  // Symbolen die er na draaien en spiegelen hetzelfde uitzien. Zo telt alleen welk vlak waar zit.
  const SYMBOLEN = ['stip', 'ring', 'plus', 'kruis', 'blok', 'vier'];

  const min = v => [-v[0], -v[1], -v[2]];
  const inproduct = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const uitproduct = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // Vouwt de uitslag van de kijker af dicht. Geeft per vakje de richting waarin dat vlak van de kubus wijst.
  // Het eerste vakje wijst naar de kijker. n = richting van het vlak, o = oost op het vlak, b = boven op het vlak.
  function vouw(cellen) {
    const plek = new Map(cellen.map((c, i) => [c[0] + ',' + c[1], i]));
    const kader = [{ n: [0, 0, 1], o: [1, 0, 0], b: [0, 1, 0] }];
    const rij = [0];
    while (rij.length) {
      const i = rij.shift(), k = kader[i], x = cellen[i][0], y = cellen[i][1];
      const buren = [
        [x + 1, y, { n: k.o, o: min(k.n), b: k.b }],
        [x - 1, y, { n: min(k.o), o: k.n, b: k.b }],
        [x, y - 1, { n: k.b, o: k.o, b: min(k.n) }],
        [x, y + 1, { n: min(k.b), o: k.o, b: k.n }],
      ];
      for (const buur of buren) {
        const j = plek.get(buur[0] + ',' + buur[1]);
        if (j != null && !kader[j]) { kader[j] = buur[2]; rij.push(j); }
      }
    }
    return kader.map(k => k.n);
  }
  // Een aanzicht toont het bovenvlak, het linker- en het rechtervlak. Dat kan alleen als de drie vlakken aan
  // elkaar grenzen en in de goede draairichting om de hoek liggen. Anders is het een spiegelbeeld.
  function soortAanzicht(nBoven, nLinks, nRechts) {
    if (inproduct(nBoven, nLinks) || inproduct(nBoven, nRechts) || inproduct(nLinks, nRechts)) return 'tegenover';
    return inproduct(nBoven, uitproduct(nLinks, nRechts)) === 1 ? 'goed' : 'spiegel';
  }

  function leg(cellen, rnd) { // willekeurig gedraaid en gespiegeld neerleggen
    let c = cellen.map(p => p.slice());
    if (rnd() < 0.5) c = c.map(p => [-p[0], p[1]]);
    for (let n = BB.rint(rnd, 0, 3); n > 0; n--) c = c.map(p => [-p[1], p[0]]);
    const x0 = Math.min(...c.map(p => p[0])), y0 = Math.min(...c.map(p => p[1]));
    return c.map(p => [p[0] - x0, p[1] - y0]);
  }

  // niveau 0 tot en met 3: hoe hoger, hoe meer foute antwoorden een spiegelbeeld zijn.
  function maak(rnd, niveau) {
    const cellen = leg(BB.kies(rnd, UITSLAGEN), rnd), n = vouw(cellen), sym = BB.schud(rnd, SYMBOLEN);
    const soorten = { goed: [], spiegel: [], tegenover: [] };
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) {
      if (a !== b && a !== c && b !== c) soorten[soortAanzicht(n[a], n[b], n[c])].push([a, b, c]);
    }
    const goed = BB.kies(rnd, soorten.goed);
    const aantalSpiegel = Math.min(niveau, 3);
    // Het lastigste foute antwoord: dezelfde drie vlakken als het goede, maar gespiegeld.
    const spiegels = aantalSpiegel ? [[goed[0], goed[2], goed[1]]] : [];
    for (const v of BB.schud(rnd, soorten.spiegel)) {
      if (spiegels.length >= aantalSpiegel) break;
      if (v.join() !== spiegels[0].join()) spiegels.push(v);
    }
    const afleiders = spiegels.concat(BB.schud(rnd, soorten.tegenover).slice(0, 3 - spiegels.length));
    const opties = BB.schud(rnd, [goed].concat(afleiders));
    return { niveau, cellen, sym, opties: opties.map(v => v.map(i => sym[i])), juist: opties.indexOf(goed) };
  }
  // Controle voor de test: klopt een antwoord bij deze uitslag?
  function klopt(item, optie) {
    const n = vouw(item.cellen), v = optie.map(s => n[item.sym.indexOf(s)]);
    return soortAanzicht(v[0], v[1], v[2]) === 'goed';
  }

  // ---- tekenen ----
  function symbool(naam) { // in een vak van 100 bij 100
    switch (naam) {
      case 'stip': return '<circle cx="50" cy="50" r="23" fill="currentColor"/>';
      case 'ring': return '<circle cx="50" cy="50" r="21" fill="none" stroke="currentColor" stroke-width="10"/>';
      case 'plus': return '<path d="M50 22V78M22 50H78" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>';
      case 'kruis': return '<path d="M28 28L72 72M72 28L28 72" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>';
      case 'blok': return '<rect x="29" y="29" width="42" height="42" fill="currentColor"/>';
      default: return [[33, 33], [67, 33], [33, 67], [67, 67]].map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9.5" fill="currentColor"/>').join('');
    }
  }
  function uitslagSvg(item) {
    const b = Math.max(...item.cellen.map(c => c[0])) + 1, h = Math.max(...item.cellen.map(c => c[1])) + 1;
    const vakjes = item.cellen.map((c, i) => '<g transform="translate(' + c[0] * 100 + ' ' + c[1] * 100 + ')">' +
      '<rect width="100" height="100" class="vlak"/>' + symbool(item.sym[i]) + '</g>').join('');
    return '<svg viewBox="-4 -4 ' + (b * 100 + 8) + ' ' + (h * 100 + 8) + '" class="uitslag-kubus" style="aspect-ratio:' + b + '/' + h + ';--breed:' + b + '" aria-hidden="true">' + vakjes + '</svg>';
  }
  // Drie zichtbare vlakken van een kubus: boven, links en rechts. Elk vlak is een scheef getrokken vierkant.
  const VLAKKEN = [
    ['boven', 'matrix(0.43 -0.25 0.43 0.25 17 37)'],
    ['links', 'matrix(0.43 0.25 0 0.5 17 37)'],
    ['rechts', 'matrix(0.43 -0.25 0 0.5 60 62)'],
  ];
  function kubusSvg(optie) {
    return '<svg viewBox="0 0 120 124" class="kubus" aria-hidden="true">' + VLAKKEN.map((v, i) =>
      '<g transform="' + v[1] + '"><rect width="100" height="100" class="vlak ' + v[0] + '"/>' + symbool(optie[i]) + '</g>').join('') + '</svg>';
  }

  function uitslag(item) { return el('div', { class: 'kubusvraag', html: uitslagSvg(item) }); }
  function keuzes(item, opKies) {
    const knoppen = item.opties.map((o, k) => el('button', { class: 'optie kubusoptie', type: 'button', 'aria-label': 'Antwoord ' + (k + 1), onclick: () => kies(k) },
      el('span', { class: 'optie-nr' }, k + 1), el('span', { class: 'optie-beeld', html: kubusSvg(o) })));
    function kies(k) {
      knoppen.forEach((b, j) => b.classList.toggle('gekozen', j === k));
      opKies(k);
    }
    return { el: el('div', { class: 'opties vier' }, knoppen), kies, knoppen };
  }

  return {
    UITSLAGEN, vouw, maak, klopt, uitslag, keuzes,
    uitleg: [
      'Je ziet een uitgevouwen kubus met op elk vlak een symbool.',
      'Vouw hem in gedachten dicht, met de symbolen aan de buitenkant. Welke van de vier kubussen krijg je?',
      'Let op welke vlakken aan elkaar grenzen. Op hogere niveaus zijn de foute antwoorden spiegelbeelden.',
      'Je hebt drie levens en 60 seconden per opgave.',
    ],
  };
})();
