// Sommen: de meting (vaste lijst, 3 minuten) en de sommenmaker voor de oefenhal.
// De meting telt het aantal goede antwoorden in een vast tijdblok. Die score herhaalt zich in onderzoek het best.
BB.sommen = (function () {
  const TIJD = 180;
  const R = BB.rint;
  const som = (tekst, antwoord) => ({ tekst, antwoord });

  // Zes treden van elk tien sommen, oplopend in moeilijkheid. Niemand hoort het einde te halen.
  // Bij meerdere bewerkingen staan er haakjes, zodat de volgorde geen kennisvraag wordt.
  const TREDEN = [
    [
      r => { const a = R(r, 3, 9), b = R(r, 3, 9); return som(a + ' + ' + b, a + b); },
      r => { const b = R(r, 3, 9), u = R(r, 3, 9); return som((b + u) + ' − ' + b, u); },
      r => { const a = R(r, 3, 9), b = R(r, 3, 9); return som(a + ' × ' + b, a * b); },
      r => { const d = R(r, 2, 5), q = R(r, 3, 9); return som((d * q) + ' ÷ ' + d, q); },
    ], [
      r => { const a = R(r, 2, 5) * 10 + R(r, 5, 9), b = R(r, 1, 3) * 10 + R(r, 5, 9); return som(a + ' + ' + b, a + b); },
      r => { const a = R(r, 5, 9) * 10 + R(r, 0, 4), b = R(r, 1, 3) * 10 + R(r, 5, 9); return som(a + ' − ' + b, a - b); },
      r => { const d = R(r, 6, 9), q = R(r, 4, 9); return som((d * q) + ' ÷ ' + d, q); },
      r => { const a = R(r, 6, 9), b = R(r, 7, 12); return som(a + ' × ' + b, a * b); },
    ], [
      r => { const a = R(r, 13, 29), b = R(r, 3, 8); return som(a + ' × ' + b, a * b); },
      r => { const a = R(r, 12, 49), b = R(r, 12, 49), c = R(r, 12, 49); return som(a + ' + ' + b + ' + ' + c, a + b + c); },
      r => { const d = R(r, 3, 7), q = R(r, 12, 24); return som((d * q) + ' ÷ ' + d, q); },
      r => { const a = R(r, 100, 150), b = R(r, 12, 39), c = R(r, 12, 39); return som(a + ' − ' + b + ' − ' + c, a - b - c); },
    ], [
      r => { const a = R(r, 6, 12), b = R(r, 4, 9), c = R(r, 11, 49); return som('(' + a + ' × ' + b + ') + ' + c, a * b + c); },
      r => { const a = R(r, 6, 9), b = R(r, 4, 9), c = BB.kies(r, [100, 120, 150, 200]); return som(c + ' − (' + a + ' × ' + b + ')', c - a * b); },
      r => { const a = R(r, 7, 15), b = R(r, 5, 9), c = R(r, 3, 6); return som('(' + a + ' + ' + b + ') × ' + c, (a + b) * c); },
      r => { const n = 2 * R(r, 107, 249); return som('de helft van ' + n, n / 2); },
      r => { const n = 40 * R(r, 3, 12); return som('25% van ' + n, n / 4); },
    ], [
      r => { const a = R(r, 11, 19), b = R(r, 11, 15); return som(a + ' × ' + b, a * b); },
      r => { const a = R(r, 125, 489), b = R(r, 125, 489); return som(a + ' + ' + b, a + b); },
      r => { const b = R(r, 125, 389), a = b + R(r, 115, 480); return som(a + ' − ' + b, a - b); },
      r => { const a = R(r, 6, 9), b = R(r, 6, 9), c = R(r, 6, 9), d = R(r, 6, 9); return som('(' + a + ' × ' + b + ') + (' + c + ' × ' + d + ')', a * b + c * d); },
      r => { const n = 20 * R(r, 3, 12); return som('15% van ' + n, n * 3 / 20); },
      r => { const n = 4 * R(r, 16, 40); return som('3/4 van ' + n, n * 3 / 4); },
    ], [
      r => { const a = R(r, 21, 39), b = R(r, 12, 19); return som(a + ' × ' + b, a * b); },
      r => { const a = R(r, 13, 19), b = R(r, 11, 39); return som('(' + a + ' × ' + a + ') − ' + b, a * a - b); },
      r => { const b = R(r, 113, 887); return som('1000 − ' + b, 1000 - b); },
      r => { const c = BB.kies(r, [3, 4, 6]), k = R(r, 3, 9), b = R(r, 6, 12); return som('(' + (c * k) + ' × ' + b + ') ÷ ' + c, k * b); },
      r => { const a = R(r, 7, 12), b = R(r, 7, 12), c = R(r, 3, 6), d = R(r, 3, 6); return som('(' + a + ' × ' + b + ') − (' + c + ' × ' + d + ')', a * b - c * d); },
    ],
  ];

  function maakTest(vorm) {
    const rnd = BB.maakRng('sommen-' + vorm), lijst = [];
    for (const trede of TREDEN) for (let i = 0; i < 10; i++) lijst.push(trede[i % trede.length](rnd));
    return lijst;
  }

  // Oefenhal: een losse som. niveau 0 = makkelijk, 1 = gemiddeld, 2 = moeilijk.
  function maak(rnd, niveau, bewerkingen) {
    const bereik = [[1, 10], [11, 89], [125, 875]][niveau];
    const maal = [[2, 10, 2, 10], [3, 12, 6, 19], [12, 25, 11, 19]][niveau];
    const deel = [[2, 10, 2, 10], [3, 12, 6, 19], [6, 19, 12, 29]][niveau];
    switch (BB.kies(rnd, bewerkingen)) {
      case '+': { const a = R(rnd, bereik[0], bereik[1]), b = R(rnd, bereik[0], bereik[1]); return som(a + ' + ' + b, a + b); }
      case '−': {
        const hoog = niveau === 0 ? 20 : bereik[1] + (niveau === 1 ? 10 : 124);
        const a = R(rnd, bereik[0] + 1, hoog), b = R(rnd, bereik[0], a - 1);
        return som(a + ' − ' + b, a - b);
      }
      case '×': { const a = R(rnd, maal[0], maal[1]), b = R(rnd, maal[2], maal[3]); return som(a + ' × ' + b, a * b); }
      default: { const d = R(rnd, deel[0], deel[1]), q = R(rnd, deel[2], deel[3]); return som((d * q) + ' ÷ ' + d, q); }
    }
  }

  function oefen(doel, klaar) {
    const uitleg = BB.el('p', { class: 'terugkoppeling' });
    const knop = BB.el('button', { class: 'knop', type: 'button', hidden: '', onclick: klaar }, BB.metToets('Start het onderdeel', 'Enter'));
    const veld = BB.getalVeld(v => {
      const goed = +v === 13;
      uitleg.textContent = goed ? 'Goed.' : 'Het juiste antwoord is 13.';
      uitleg.className = 'terugkoppeling ' + (goed ? 'goed' : 'fout');
      veld.disabled = true;
      knop.hidden = false;
      BB.opEnter(klaar);
    });
    BB.scherm(doel, BB.el('h2', null, 'Oefensom'), BB.el('div', { class: 'som' }, '8 + 5 ='), veld, BB.toetsen(veld, BB.CIJFERS),
      BB.el('p', { class: 'hint' }, BB.TYP), uitleg, knop);
    veld.focus();
  }

  function test(doel, vorm, klaar) {
    const lijst = maakTest(vorm);
    let i = 0, goed = 0, fout = 0, af = false;
    const balk = BB.maakBalk(), opgave = BB.el('div', { class: 'som' });
    const veld = BB.getalVeld(v => {
      if (af) return;
      if (+v === lijst[i].antwoord) goed++; else fout++;
      veld.value = '';
      if (++i >= lijst.length) einde(); else toon();
    });
    BB.scherm(doel, balk.el, opgave, veld, BB.toetsen(veld, BB.CIJFERS), BB.el('p', { class: 'hint' }, BB.TYP));
    const klok = BB.klok(balk, TIJD, einde);
    toon();
    veld.focus();
    function toon() { opgave.textContent = lijst[i].tekst + ' ='; }
    function einde() {
      if (af) return;
      af = true;
      klok.stop();
      klaar({ goed, fout });
    }
  }

  return {
    maakTest, maak,
    onderdeel: {
      id: 'sommen', naam: 'Sommen', duur: '3 minuten',
      uitleg: [
        'Reken uit je hoofd. Geen pen, papier of rekenmachine.',
        'Je hebt 3 minuten. Het gaat om het aantal goede antwoorden.',
        'De sommen worden steeds moeilijker. Een fout antwoord levert niets op, dus gokken helpt niet.',
      ],
      oefen, test,
    },
  };
})();
