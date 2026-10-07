// Symbolen zoeken: staat een van de twee symbolen links ook in de rij rechts? Meet tempo.
BB.symbolen = (function () {
  const TIJD = 120;
  // Een symbool bestaat uit vier lijnstukjes tussen buurpunten op een raster van 3 bij 3.
  const STUK = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) STUK.push([x, y, x + 1, y]);
  for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) STUK.push([x, y, x, y + 1]);
  for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) { STUK.push([x, y, x + 1, y + 1]); STUK.push([x + 1, y, x, y + 1]); }
  const eind = s => [s[0] + ',' + s[1], s[2] + ',' + s[3]];
  const raakt = (i, j) => eind(STUK[i]).some(p => eind(STUK[j]).includes(p));

  function teken(rnd) {
    const gekozen = [BB.rint(rnd, 0, STUK.length - 1)];
    while (gekozen.length < 4) {
      const i = BB.rint(rnd, 0, STUK.length - 1);
      if (!gekozen.includes(i) && gekozen.some(j => raakt(i, j))) gekozen.push(i);
    }
    return gekozen.reduce((m, i) => m | (1 << i), 0);
  }
  function maakBeurt(rnd) {
    // Zeven symbolen die duidelijk van elkaar verschillen: minstens twee lijnstukjes anders.
    const tekens = [];
    while (tekens.length < 7) {
      const t = teken(rnd);
      if (tekens.every(u => BB.bits(t ^ u) >= 4)) tekens.push(t);
    }
    const doelen = tekens.slice(0, 2), zoek = tekens.slice(2), aanwezig = rnd() < 0.5;
    if (aanwezig) zoek[BB.rint(rnd, 0, 4)] = doelen[BB.rint(rnd, 0, 1)];
    return { doelen, zoek, aanwezig };
  }

  function svg(t) {
    let h = '';
    STUK.forEach((s, i) => {
      if (t >> i & 1) h += '<line x1="' + (6 + 14 * s[0]) + '" y1="' + (6 + 14 * s[1]) + '" x2="' + (6 + 14 * s[2]) + '" y2="' + (6 + 14 * s[3]) + '"/>';
    });
    return '<svg viewBox="0 0 40 40" class="teken" aria-hidden="true">' + h + '</svg>';
  }
  function beurtEl(b) {
    const groep = (lijst, klasse) => BB.el('div', { class: 'tekens ' + klasse }, lijst.map(t => BB.el('span', { class: 'teken-vak', html: svg(t) })));
    return BB.el('div', { class: 'symboolrij' }, groep(b.doelen, 'doelen'), groep(b.zoek, 'zoek'));
  }
  function knoppen(antwoord) {
    return BB.el('div', { class: 'janee' },
      BB.el('button', { class: 'knop stil', type: 'button', onclick: () => antwoord(false) }, BB.metToets('Nee', 'F')),
      BB.el('button', { class: 'knop', type: 'button', onclick: () => antwoord(true) }, BB.metToets('Ja', 'J')));
  }
  function luister(antwoord) {
    BB.toets = e => {
      const k = e.key.toLowerCase();
      if (k === 'j') antwoord(true); else if (k === 'f') antwoord(false);
    };
  }

  function oefen(doel, klaar) {
    const rnd = BB.maakRng('symbolen-oefen');
    let nr = 0, huidig;
    const veld = BB.el('div', { class: 'symboolveld' }), uitleg = BB.el('p', { class: 'terugkoppeling' });
    const knop = BB.el('button', { class: 'knop', type: 'button', hidden: '', onclick: klaar }, BB.metToets('Start het onderdeel', 'Enter'));
    const jn = knoppen(antwoord);
    BB.scherm(doel, BB.el('h2', null, 'Oefenen'),
      BB.el('p', null, 'Staat een van de twee symbolen links ook in de rij rechts? ' + BB.zeg('Druk J voor ja en F voor nee.', 'Tik op Ja of Nee.')), veld, jn, uitleg, knop);
    luister(antwoord);
    nieuw();
    function nieuw() { huidig = maakBeurt(rnd); BB.leeg(veld).append(beurtEl(huidig)); }
    function antwoord(a) {
      if (nr >= 4) return;
      const goed = a === huidig.aanwezig;
      uitleg.textContent = goed ? 'Goed.' : 'Fout. Het antwoord was ' + (huidig.aanwezig ? 'ja' : 'nee') + '.';
      uitleg.className = 'terugkoppeling ' + (goed ? 'goed' : 'fout');
      if (++nr < 4) return nieuw();
      jn.hidden = true;
      knop.hidden = false;
      BB.opEnter(klaar);
    }
  }

  function test(doel, vorm, klaar) {
    const rnd = BB.maakRng('symbolen-' + vorm);
    let goed = 0, fout = 0, af = false, huidig;
    const balk = BB.maakBalk(), veld = BB.el('div', { class: 'symboolveld' });
    BB.scherm(doel, balk.el, veld, knoppen(antwoord));
    const klok = BB.klok(balk, TIJD, einde);
    luister(antwoord);
    nieuw();
    function nieuw() { huidig = maakBeurt(rnd); BB.leeg(veld).append(beurtEl(huidig)); }
    function antwoord(a) {
      if (af) return;
      if (a === huidig.aanwezig) goed++; else fout++;
      nieuw();
    }
    function einde() {
      if (af) return;
      af = true;
      klok.stop();
      klaar({ goed, fout });
    }
  }

  return {
    maakBeurt, svg, beurtEl,
    onderdeel: {
      id: 'symbolen', naam: 'Symbolen zoeken', duur: '2 minuten',
      uitleg: [
        'Links staan twee symbolen. Rechts staat een rij van vijf.',
        'Staat een van de twee ook in de rij? ' + BB.zeg('Druk J voor ja en F voor nee.', 'Tik op Ja of Nee.'),
        'Je hebt 2 minuten. Werk zo snel als je kunt, maar een fout kost een punt.',
      ],
      oefen, test,
    },
  };
})();
