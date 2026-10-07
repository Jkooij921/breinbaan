// Patronen: een raster van 3 bij 3 waarin het laatste vakje ontbreekt.
// De opgaven komen uit vaste regels en zijn zelf gemaakt, niet overgenomen uit een bestaande test.
BB.patronen = (function () {
  const TIJD = 360;
  const VORMEN = ['cirkel', 'vierkant', 'driehoek', 'ruit', 'kruis', 'ster'];
  const BASIS = { vorm: null, grootte: 1, vulling: 0, aantal: 1, lijnen: 0, punten: 0 };
  // Acht lijnen in een vierkant: vier zijden, twee diagonalen, een liggende en een staande middenlijn.
  const LIJNEN = [[22, 22, 78, 22], [78, 22, 78, 78], [78, 78, 22, 78], [22, 78, 22, 22],
    [22, 22, 78, 78], [78, 22, 22, 78], [22, 50, 78, 50], [50, 22, 50, 78]];
  // Acht plekken voor een stip rond het midden, met de klok mee vanaf boven.
  const PUNTEN = [[50, 13], [76, 24], [87, 50], [76, 76], [50, 87], [24, 76], [13, 50], [24, 24]];
  const PLEK = { 1: [[50, 50]], 2: [[32, 50], [68, 50]], 3: [[50, 30], [30, 68], [70, 68]] };
  const STRAAL = { enkel: [13, 21, 29], compact: [9, 12.5, 16] };

  // ---- regels: elke eigenschap van een vakje volgt een regel over rij (r) en kolom (c) ----
  const anders = waarden => goed => waarden.filter(v => v !== goed);
  const vast = v => ({ w: () => v, alt: () => [] });
  const perRij = waarden => ({ w: r => waarden[r], alt: anders(waarden) });
  const perKolom = waarden => ({ w: (r, c) => waarden[c], alt: anders(waarden) });
  // Elke waarde komt in elke rij en elke kolom precies een keer voor.
  const latijn = (waarden, s) => ({ w: (r, c) => waarden[(c + s * r) % 3], alt: anders(waarden) });

  function masker(rnd, min, max) {
    let m = 0;
    for (const i of BB.schud(rnd, [0, 1, 2, 3, 4, 5, 6, 7]).slice(0, BB.rint(rnd, min, max))) m |= 1 << i;
    return m;
  }
  // Het derde vakje is het eerste en tweede samen ('of'), of alleen wat in precies een van de twee zit ('xof').
  // De regel klopt zowel per rij als per kolom.
  function maskerRegel(rnd, op) {
    const f = op === 'of' ? (a, b) => a | b : (a, b) => a ^ b;
    for (;;) {
      const g = [[], [], []];
      if (op === 'of') {
        const volgorde = BB.schud(rnd, [0, 1, 2, 3, 4, 5, 6, 7]);
        let k = 0;
        const stuk = () => { let m = 0; for (let n = BB.rint(rnd, 1, 2); n > 0; n--) m |= 1 << volgorde[k++]; return m; };
        g[0][0] = stuk(); g[0][1] = stuk(); g[1][0] = stuk(); g[1][1] = stuk();
      } else {
        g[0][0] = masker(rnd, 2, 4); g[0][1] = masker(rnd, 2, 4); g[1][0] = masker(rnd, 2, 4); g[1][1] = masker(rnd, 2, 4);
      }
      g[2][0] = f(g[0][0], g[1][0]);
      g[2][1] = f(g[0][1], g[1][1]);
      for (let r = 0; r < 3; r++) g[r][2] = f(g[r][0], g[r][1]);
      const alle = g.flat();
      if (alle.includes(0) || new Set(alle).size < 9) continue;
      // Bij 'xof' moet in elke rij echt iets wegvallen, anders is het gewoon optellen.
      if (op === 'xof' && g.some(rij => (rij[0] & rij[1]) === 0)) continue;
      const goed = g[2][2], a = g[2][0], b = g[2][1];
      return {
        w: (r, c) => g[r][c],
        alt: () => {
          // De verleidelijke foute antwoorden, plus een paar die net naast het goede of naast een fout antwoord zitten.
          const kand = [op === 'of' ? a ^ b : a | b, a & b, a, b, g[1][2], g[0][2]];
          const stukjes = BB.schud(rnd, [0, 1, 2, 3, 4, 5, 6, 7]);
          for (const i of stukjes.slice(0, 3)) kand.push(goed ^ (1 << i));
          for (const i of stukjes.slice(3, 6)) kand.push(a ^ (1 << i));
          return [...new Set(kand)].filter(m => m !== goed && m !== 0);
        },
      };
    }
  }
  // Een stip die per vakje een plek opschuift, en per rij twee plekken verder begint.
  function stipRegel(rnd) {
    const begin = BB.rint(rnd, 0, 7), richting = BB.kies(rnd, [1, 7]);
    const plek = (r, c) => (begin + richting * (c + 2 * r)) % 8;
    return { w: (r, c) => 1 << plek(r, c), alt: () => [1, 7, 2, 6, 4].map(d => 1 << ((plek(2, 2) + d) % 8)) };
  }

  const drie = rnd => BB.schud(rnd, VORMEN).slice(0, 3);
  const s12 = rnd => BB.kies(rnd, [1, 2]);
  // Twaalf opgaven, twee per niveau. Meer regels tegelijk en wegstrepen maken een opgave moeilijker.
  const BLAUWDRUK = [
    rnd => ({ niveau: 0, regels: { vorm: perRij(drie(rnd)), aantal: perKolom([1, 2, 3]), vulling: vast(2), grootte: vast(2) } }),
    rnd => ({ niveau: 0, regels: { vorm: perRij(drie(rnd)), grootte: perKolom([0, 1, 2]) } }),
    rnd => ({ niveau: 1, regels: { vorm: latijn(drie(rnd), s12(rnd)), vulling: perRij(BB.schud(rnd, [0, 1, 2])), grootte: vast(2) } }),
    rnd => ({ niveau: 1, regels: { vorm: latijn(drie(rnd), s12(rnd)), aantal: perKolom([1, 2, 3]), vulling: vast(1), grootte: vast(2) } }),
    rnd => ({ niveau: 2, regels: { vorm: latijn(drie(rnd), 1), vulling: latijn([0, 1, 2], 2), grootte: perKolom([0, 1, 2]) } }),
    rnd => ({ niveau: 2, regels: { vorm: latijn(drie(rnd), s12(rnd)), vulling: perRij(BB.schud(rnd, [0, 1, 2])), punten: stipRegel(rnd) } }),
    rnd => ({ niveau: 3, regels: { lijnen: maskerRegel(rnd, 'of') } }),
    rnd => ({ niveau: 3, regels: { punten: maskerRegel(rnd, 'of'), vorm: latijn(drie(rnd), s12(rnd)) } }),
    rnd => ({ niveau: 4, regels: { lijnen: maskerRegel(rnd, 'xof') } }),
    rnd => ({ niveau: 4, regels: { punten: maskerRegel(rnd, 'xof'), vorm: perRij(drie(rnd)), vulling: latijn([0, 1, 2], s12(rnd)) } }),
    rnd => ({ niveau: 5, regels: { punten: maskerRegel(rnd, 'xof'), vorm: latijn(drie(rnd), 1), vulling: latijn([0, 1, 2], 2) } }),
    rnd => ({ niveau: 5, regels: { vorm: latijn(drie(rnd), 1), vulling: latijn([0, 1, 2], 2), aantal: perKolom([1, 2, 3]), grootte: perRij([0, 1, 2]) } }),
  ];

  function bouwItem(rnd, blauwdruk) {
    const regels = blauwdruk.regels, namen = Object.keys(regels);
    // Staan er meerdere figuren in een vakje, dan zijn ze overal klein. Zo blijft groot en klein vergelijkbaar.
    const start = Object.assign({}, BASIS, regels.aantal ? { compact: 1 } : null);
    const cellen = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const s = Object.assign({}, start);
        for (const k of namen) s[k] = regels[k].w(r, c);
        cellen.push(s);
      }
    }
    const goed = cellen.pop();
    const sleutel = s => JSON.stringify(s);
    const alts = {};
    for (const k of namen) alts[k] = regels[k].alt(goed[k]);
    // Foute antwoorden wijken op een of twee eigenschappen af van het goede.
    const kandidaten = [], gezien = new Set([sleutel(goed)]);
    const voegToe = s => { if (!gezien.has(sleutel(s))) { gezien.add(sleutel(s)); kandidaten.push(s); } };
    for (const k of namen) for (const v of alts[k]) voegToe(Object.assign({}, goed, { [k]: v }));
    for (let i = 0; i < namen.length; i++) {
      for (let j = i + 1; j < namen.length; j++) {
        for (const v of alts[namen[i]]) for (const w of alts[namen[j]]) voegToe(Object.assign({}, goed, { [namen[i]]: v, [namen[j]]: w }));
      }
    }
    // Zoek een stel foute antwoorden waarbij je het goede niet kunt raden door alleen de antwoorden te vergelijken.
    let afleiders = kandidaten.slice(0, 5);
    for (let poging = 0; poging < 300; poging++) {
      const stel = BB.schud(rnd, kandidaten).slice(0, 5);
      if (!raadbaar([goed].concat(stel), 0)) { afleiders = stel; break; }
    }
    const opties = BB.schud(rnd, [goed].concat(afleiders));
    return { niveau: blauwdruk.niveau, cellen, opties, juist: opties.indexOf(goed) };
  }

  // Raadtest: is het goede antwoord het antwoord dat het meest op alle andere lijkt?
  // Dan vind je het zonder de opgave op te lossen, en deugt het stel foute antwoorden niet.
  function raadbaar(opties, juist) {
    const lijkt = (a, b) => {
      let n = 0;
      for (const k in a) n += k === 'lijnen' || k === 'punten' ? 1 - BB.bits(a[k] ^ b[k]) / 8 : (a[k] === b[k] ? 1 : 0);
      return n;
    };
    const score = opties.map((o, i) => opties.reduce((som, p, j) => som + (i === j ? 0 : lijkt(o, p)), 0));
    return score.every((s, i) => i === juist || s < score[juist] - 1e-9);
  }

  // Vorm A is de vaste eerste poging. Andere letters geven nieuwe opgaven volgens dezelfde regels.
  // keuze: welke van de twaalf blauwdrukken meedoen (voor de korte testversies).
  function maakSet(vorm, keuze) {
    const rnd = BB.maakRng('patronen-' + vorm);
    return (keuze || BLAUWDRUK.map((b, i) => i)).map(i => bouwItem(rnd, BLAUWDRUK[i](rnd)));
  }
  // Een losse opgave van een bepaald niveau, voor de oefenhal.
  function maak(rnd, niveau) {
    return bouwItem(rnd, BLAUWDRUK[2 * niveau + (rnd() < 0.5 ? 0 : 1)](rnd));
  }

  // ---- tekenen ----
  function vormSvg(vorm, x, y, R, vulling) {
    const stijl = 'fill="currentColor" fill-opacity="' + [0, 0.5, 1][vulling] + '" stroke="currentColor" stroke-width="' +
      (R < 10 ? 2 : 3) + '" stroke-linejoin="round"';
    const veelhoek = punten => '<polygon points="' +
      punten.map(p => (x + p[0] * R).toFixed(1) + ',' + (y + p[1] * R).toFixed(1)).join(' ') + '" ' + stijl + '/>';
    switch (vorm) {
      case 'cirkel': return '<circle cx="' + x + '" cy="' + y + '" r="' + (R * 0.92).toFixed(1) + '" ' + stijl + '/>';
      case 'vierkant': return veelhoek([[-0.82, -0.82], [0.82, -0.82], [0.82, 0.82], [-0.82, 0.82]]);
      case 'driehoek': return veelhoek([[0, -0.95], [0.98, 0.75], [-0.98, 0.75]]);
      case 'ruit': return veelhoek([[0, -1.05], [0.72, 0], [0, 1.05], [-0.72, 0]]);
      case 'kruis': {
        const a = 0.34;
        return veelhoek([[-a, -1], [a, -1], [a, -a], [1, -a], [1, a], [a, a], [a, 1], [-a, 1], [-a, a], [-1, a], [-1, -a], [-a, -a]]);
      }
      default: { // ster
        const punten = [];
        for (let i = 0; i < 10; i++) {
          const hoek = Math.PI * (i / 5 - 0.5), r = i % 2 ? 0.45 : 1.08;
          punten.push([Math.cos(hoek) * r, Math.sin(hoek) * r]);
        }
        return veelhoek(punten);
      }
    }
  }
  function svg(s) {
    let h = '';
    LIJNEN.forEach((l, i) => {
      if (s.lijnen >> i & 1) h += '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
    });
    if (s.vorm) {
      const R = (s.compact ? STRAAL.compact : STRAAL.enkel)[s.grootte];
      for (const p of PLEK[s.aantal]) h += vormSvg(s.vorm, p[0], p[1], R, s.vulling);
    }
    PUNTEN.forEach((p, i) => {
      if (s.punten >> i & 1) h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5.5" fill="currentColor"/>';
    });
    return '<svg viewBox="0 0 100 100" class="patroon" aria-hidden="true">' + h + '</svg>';
  }

  // ---- scherm ----
  function rooster(item) {
    const r = BB.el('div', { class: 'matrix' });
    for (const s of item.cellen) r.append(BB.el('div', { class: 'matrix-cel', html: svg(s) }));
    r.append(BB.el('div', { class: 'matrix-cel vraag' }, '?'));
    return r;
  }
  function keuzes(item, opKies) {
    const knoppen = item.opties.map((s, k) => BB.el('button', { class: 'optie', type: 'button', 'aria-label': 'Antwoord ' + (k + 1), onclick: () => kies(k) },
      BB.el('span', { class: 'optie-nr' }, k + 1), BB.el('span', { class: 'optie-beeld', html: svg(s) })));
    function kies(k) {
      knoppen.forEach((b, j) => b.classList.toggle('gekozen', j === k));
      opKies(k);
    }
    return { el: BB.el('div', { class: 'opties' }, knoppen), kies, knoppen };
  }

  function oefen(doel, klaar) {
    const rnd = BB.maakRng('patronen-oefen');
    const item = bouwItem(rnd, BLAUWDRUK[0](rnd));
    const uitleg = BB.el('p', { class: 'terugkoppeling' });
    const knop = BB.el('button', { class: 'knop', type: 'button', hidden: '', onclick: klaar }, BB.metToets('Start het onderdeel', 'Enter'));
    const k = keuzes(item, gekozen => {
      const goed = gekozen === item.juist;
      uitleg.textContent = (goed ? 'Goed. ' : 'Het juiste antwoord is nummer ' + (item.juist + 1) + '. ') +
        'In elke rij komt er steeds een figuur bij. De vorm blijft per rij gelijk.';
      uitleg.className = 'terugkoppeling ' + (goed ? 'goed' : 'fout');
      k.knoppen[item.juist].classList.add('juist');
      knop.hidden = false;
    });
    BB.scherm(doel, BB.el('h2', null, 'Oefenopgave'),
      BB.el('p', null, 'Welk vakje hoort op de plek van het vraagteken? ' + BB.zeg('Klik erop of druk op het nummer.', 'Tik erop.')),
      BB.el('div', { class: 'patroonveld' }, rooster(item), k.el), uitleg, knop);
    BB.toets = e => {
      if (e.key >= '1' && e.key <= '6') k.kies(+e.key - 1);
      else if (e.key === 'Enter' && !knop.hidden) { e.preventDefault(); klaar(); }
    };
  }

  function test(doel, vorm, klaar, opt) {
    const items = maakSet(vorm, opt && opt.keuze), antwoorden = [];
    let i = 0, keuze = -1, af = false, huidig;
    const balk = BB.maakBalk(), teller = BB.el('p', { class: 'teller' }), veld = BB.el('div', { class: 'patroonveld' });
    const knop = BB.el('button', { class: 'knop', type: 'button', onclick: volgende }, BB.metToets('Volgende', 'Enter'));
    BB.scherm(doel, balk.el, teller, veld, knop);
    const klok = BB.klok(balk, opt ? opt.tijd : TIJD, einde);
    BB.toets = e => {
      if (e.key >= '1' && e.key <= '6') huidig.kies(+e.key - 1);
      else if (e.key === 'Enter') { e.preventDefault(); volgende(); }
    };
    toon();
    function toon() {
      keuze = -1;
      knop.disabled = true;
      teller.textContent = 'Opgave ' + (i + 1) + ' van ' + items.length;
      huidig = keuzes(items[i], k => { keuze = k; knop.disabled = false; });
      BB.leeg(veld).append(rooster(items[i]), huidig.el);
    }
    function volgende() {
      if (keuze < 0 || af) return;
      antwoorden.push(keuze);
      if (++i >= items.length) einde(); else toon();
    }
    function einde() {
      if (af) return;
      af = true;
      klok.stop();
      klaar({
        goed: antwoorden.filter((a, j) => a === items[j].juist).length,
        totaal: items.length,
        niveaus: items.map(x => x.niveau),
        antwoorden,
      });
    }
  }

  return {
    maakSet, maak, raadbaar, svg, rooster, keuzes,
    onderdeel: {
      id: 'patronen', naam: 'Patronen', duur: '6 minuten, 12 opgaven',
      uitleg: [
        'Je ziet een raster met figuren. Het laatste vakje ontbreekt.',
        'De figuren volgen een regel, van links naar rechts en van boven naar beneden. Kies het vakje dat de regel afmaakt.',
        BB.zeg('Kies met de muis of met de toetsen 1 tot en met 6. Druk daarna op Enter.', 'Tik op het vakje dat je kiest. Tik daarna op Volgende.'),
        'De opgaven worden steeds moeilijker. Weet je het niet, gok dan.',
      ],
      oefen, test,
    },
  };
})();
