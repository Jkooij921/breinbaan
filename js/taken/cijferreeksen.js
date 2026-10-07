// Cijferreeksen: ontdek het patroon in een rij getallen. Welk getal komt er daarna?
// (Het onthouden van cijfers staat in onthouden.js.) Zelf gemaakt volgens vaste regels.
BB.reeksen = (function () {
  const TIJD = 300;
  const R = BB.rint;

  // rij: het getal op plek i volgt uit een formule. keten: elk getal volgt uit het vorige.
  function rij(f, n, regel) {
    const r = [];
    for (let i = 0; i < n; i++) r.push(f(i));
    return { reeks: r, antwoord: f(n), regel };
  }
  function keten(start, n, stap, regel) {
    const r = [start];
    while (r.length <= n) r.push(stap(r.length - 1, r[r.length - 1]));
    return { reeks: r.slice(0, n), antwoord: r[n], regel };
  }

  // Twaalf reeksen, twee per niveau.
  const MAKERS = [
    [0, r => { const a = R(r, 2, 9), d = R(r, 3, 6); return rij(i => a + d * i, 5, 'steeds +' + d); }],
    [0, r => { const a = R(r, 45, 70), d = R(r, 4, 7); return rij(i => a - d * i, 5, 'steeds −' + d); }],
    [1, r => { const k = BB.kies(r, [2, 3]), a = R(r, 2, 4); return rij(i => a * Math.pow(k, i), k === 2 ? 5 : 4, 'steeds ×' + k); }],
    [1, r => { const p = R(r, 2, 4), q = R(r, 5, 8); return keten(R(r, 3, 9), 6, (i, v) => v + (i % 2 ? q : p), 'om en om +' + p + ' en +' + q); }],
    [2, r => { const d = R(r, 1, 3), k = R(r, 1, 3); return keten(R(r, 1, 9), 6, (i, v) => v + d + k * i, 'de stap wordt steeds ' + k + ' groter, te beginnen bij +' + d); }],
    [2, r => { const p = R(r, 5, 9), q = R(r, 2, 4); return keten(R(r, 8, 15), 6, (i, v) => i % 2 ? v - q : v + p, 'om en om +' + p + ' en −' + q); }],
    [3, r => {
      const a = R(r, 2, 6), da = R(r, 2, 5), b = R(r, 24, 40), db = R(r, 2, 5);
      return rij(i => i % 2 ? b - db * (i - 1) / 2 : a + da * i / 2, 7, 'twee reeksen door elkaar: de ene +' + da + ', de andere −' + db);
    }],
    [3, r => { const c = R(r, 1, 3); return keten(R(r, 4, 6), 6, (i, v) => i % 2 ? v - c : v * 2, 'om en om ×2 en −' + c); }],
    [4, r => {
      const a = R(r, 1, 4), reeks = [a, a + R(r, 1, 3)];
      while (reeks.length < 7) reeks.push(reeks[reeks.length - 1] + reeks[reeks.length - 2]);
      return { reeks: reeks.slice(0, 6), antwoord: reeks[6], regel: 'elk getal is de som van de twee ervoor' };
    }],
    [4, r => {
      const km = BB.kies(r, [[2, 1], [2, 3], [2, -1], [3, 1], [3, -1]]);
      return keten(R(r, 2, 4), 5, (i, v) => v * km[0] + km[1], 'steeds ×' + km[0] + ' en dan ' + (km[1] > 0 ? '+' : '−') + Math.abs(km[1]));
    }],
    [5, r => { const d = R(r, 1, 2); return keten(R(r, 1, 4), 5, (i, v) => v + d * Math.pow(3, i), 'de stap wordt steeds 3 keer zo groot, te beginnen bij +' + d); }],
    [5, r => keten(R(r, 1, 3), 5, (i, v) => v * (i + 1), 'eerst ×1, dan ×2, dan ×3, dan ×4, dan ×5')],
  ];

  // keuze: welke van de twaalf reeksen meedoen (voor de korte testversies).
  function maakSet(vorm, keuze) {
    const rnd = BB.maakRng('reeksen-' + vorm);
    return (keuze || MAKERS.map((m, i) => i)).map(i => Object.assign({ niveau: MAKERS[i][0] }, MAKERS[i][1](rnd)));
  }
  // Een losse reeks van een bepaald niveau, voor de oefenhal.
  function maak(rnd, niveau) {
    const m = MAKERS[2 * niveau + (rnd() < 0.5 ? 0 : 1)];
    return Object.assign({ niveau: m[0] }, m[1](rnd));
  }

  function reeksEl(item) {
    return BB.el('div', { class: 'reeks' }, item.reeks.map(g => BB.el('span', { class: 'reeks-getal' }, g)),
      BB.el('span', { class: 'reeks-getal vraag' }, '?'));
  }

  function oefen(doel, klaar) {
    const item = { reeks: [2, 4, 6, 8], antwoord: 10 };
    const uitleg = BB.el('p', { class: 'terugkoppeling' });
    const knop = BB.el('button', { class: 'knop', type: 'button', hidden: '', onclick: klaar }, BB.metToets('Start het onderdeel', 'Enter'));
    const veld = BB.getalVeld(v => {
      const goed = +v === item.antwoord;
      uitleg.textContent = (goed ? 'Goed. ' : 'Het juiste antwoord is 10. ') + 'Er komt steeds 2 bij.';
      uitleg.className = 'terugkoppeling ' + (goed ? 'goed' : 'fout');
      veld.disabled = true;
      knop.hidden = false;
      BB.opEnter(klaar);
    });
    BB.scherm(doel, BB.el('h2', null, 'Oefenopgave'), BB.el('p', null, 'Welk getal komt er op de plek van het vraagteken? ' + BB.TYP),
      reeksEl(item), veld, BB.toetsen(veld, BB.CIJFERS), uitleg, knop);
    veld.focus();
  }

  function test(doel, vorm, klaar, opt) {
    const items = maakSet(vorm, opt && opt.keuze), antwoorden = [];
    let i = 0, af = false;
    const balk = BB.maakBalk(), teller = BB.el('p', { class: 'teller' }), plek = BB.el('div');
    const veld = BB.getalVeld(v => geef(+v));
    const sla = BB.el('button', { class: 'knop stil', type: 'button', onclick: () => geef(null) }, 'Weet ik niet');
    BB.scherm(doel, balk.el, teller, plek, veld, BB.toetsen(veld, BB.CIJFERS), sla);
    const klok = BB.klok(balk, opt ? opt.tijd : TIJD, einde);
    toon();
    function toon() {
      teller.textContent = 'Reeks ' + (i + 1) + ' van ' + items.length;
      BB.leeg(plek).append(reeksEl(items[i]));
      veld.value = '';
      veld.focus();
    }
    function geef(a) {
      if (af) return;
      antwoorden.push(a);
      if (++i >= items.length) einde(); else toon();
    }
    function einde() {
      if (af) return;
      af = true;
      klok.stop();
      klaar({
        goed: antwoorden.filter((a, j) => a === items[j].antwoord).length,
        totaal: items.length,
        niveaus: items.map(x => x.niveau),
        antwoorden,
      });
    }
  }

  return {
    maakSet, maak, reeksEl,
    onderdeel: {
      id: 'reeksen', naam: 'Cijferreeksen', duur: '5 minuten, 12 opgaven',
      uitleg: [
        'Je ziet een rij getallen die een regel volgt. Welk getal komt er daarna?',
        BB.TYP + ' Je kunt niet terug naar een vorige reeks.',
        'De reeksen worden steeds moeilijker. Kom je er niet uit, kies dan "Weet ik niet".',
      ],
      oefen, test,
    },
  };
})();
