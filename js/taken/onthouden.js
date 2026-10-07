// Cijfers onthouden: cijfers zien en natypen. Drie rondes: zelfde volgorde, achterstevoren, van laag naar hoog.
// De score is de gemiddelde span: de lengte waarbij het ongeveer de helft van de keren goed gaat.
// Dat herhaalt zich in onderzoek beter dan "de langste reeks die je goed had".
BB.cijfers = (function () {
  const SOORTEN = [
    { id: 'vooruit', naam: 'In dezelfde volgorde', opdracht: 'Typ de cijfers in dezelfde volgorde.', voorbeeld: '3 7 2 wordt 372', start: 4 },
    { id: 'achteruit', naam: 'Achterstevoren', opdracht: 'Typ de cijfers achterstevoren.', voorbeeld: '3 7 2 wordt 273', start: 3 },
    { id: 'gesorteerd', naam: 'Van laag naar hoog', opdracht: 'Typ de cijfers van laag naar hoog.', voorbeeld: '3 7 2 wordt 237', start: 3 },
  ];
  const BEURTEN = 8, MIN = 2, MAX = 9;

  function doel(reeks, soort) {
    if (soort === 'vooruit') return reeks.slice();
    if (soort === 'achteruit') return reeks.slice().reverse();
    return reeks.slice().sort((a, b) => a - b);
  }
  function maakReeks(rnd, lengte, soort) {
    for (;;) {
      let r;
      if (soort === 'gesorteerd') {
        // Hier mogen cijfers terugkomen, anders is een lange reeks altijd 123456789.
        r = [];
        while (r.length < lengte) {
          const d = BB.rint(rnd, 1, 9);
          if (d !== r[r.length - 1]) r.push(d);
        }
      } else {
        r = BB.schud(rnd, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, lengte);
      }
      if (soort === 'vooruit' || doel(r, soort).join('') !== r.join('')) return r;
    }
  }
  // lengtes bevat ook de lengte die na de laatste beurt aan de beurt zou zijn.
  function schat(lengtes, goed) {
    const fout = goed.indexOf(false);
    if (fout === -1) return Math.max.apply(null, lengtes) + 0.5;
    return BB.gem(lengtes.slice(fout));
  }

  // Een ronde. De reeks wordt een cijfer langer na een goed antwoord en een cijfer korter na een fout.
  function blok(scherm, soort, rnd, beurten, start, oefenen, klaar) {
    const lengtes = [], goed = [];
    let lengte = start, huidig = null, wacht = true;
    const teller = BB.el('p', { class: 'teller' });
    const beeld = BB.el('div', { class: 'cijferscherm', 'aria-live': 'off' });
    const opdracht = BB.el('p', { class: 'opdracht' });
    const veld = BB.getalVeld(controleer, true);
    const invoer = BB.el('div', { class: 'cijferinvoer', hidden: '' }, opdracht, veld,
      BB.toetsen(veld, '123456789')); // de 0 komt in dit spel niet voor
    BB.scherm(scherm, teller, beeld, invoer);
    beurt();

    function beurt() {
      teller.textContent = oefenen ? 'Oefenreeks' : soort.naam + ': reeks ' + (lengtes.length + 1) + ' van ' + beurten;
      invoer.hidden = true;
      wacht = true;
      veld.value = '';
      beeld.className = 'cijferscherm';
      beeld.textContent = '';
      huidig = maakReeks(rnd, lengte, soort.id);
      let i = 0;
      BB.later(stap, 900);
      function stap() {
        if (i >= huidig.length) {
          opdracht.textContent = soort.opdracht;
          invoer.hidden = false;
          wacht = false;
          veld.focus();
          return;
        }
        beeld.textContent = huidig[i++];
        BB.later(() => { beeld.textContent = ''; BB.later(stap, 250); }, 750);
      }
    }
    function controleer(tekst) {
      if (wacht) return;
      wacht = true;
      const juist = tekst === doel(huidig, soort.id).join('');
      lengtes.push(lengte);
      goed.push(juist);
      lengte = BB.klem(lengte + (juist ? 1 : -1), MIN, MAX);
      invoer.hidden = true;
      if (lengtes.length < beurten) return beurt();
      klaar({
        juist, antwoord: doel(huidig, soort.id).join(''),
        span: schat(lengtes.concat(lengte), goed),
        langste: Math.max(0, ...lengtes.filter((l, i) => goed[i])),
      });
    }
  }

  function test(scherm, vorm, klaar) {
    const rnd = BB.maakRng('cijfers-' + vorm), oefenRnd = BB.maakRng('cijfers-oefen'), uit = {};
    let nr = 0;
    ronde();
    function ronde() {
      if (nr >= SOORTEN.length) return klaar(uit);
      const soort = SOORTEN[nr];
      const start = () => blok(scherm, soort, oefenRnd, 1, 3, true, naOefenen);
      BB.scherm(scherm, BB.el('p', { class: 'teller' }, 'Ronde ' + (nr + 1) + ' van 3'), BB.el('h2', null, soort.naam),
        BB.el('p', null, 'Je ziet de cijfers een voor een. ' + soort.opdracht),
        BB.el('p', { class: 'voorbeeld' }, 'Voorbeeld: ' + soort.voorbeeld),
        BB.el('button', { class: 'knop', type: 'button', onclick: start }, BB.metToets('Oefenreeks', 'Enter')));
      BB.opEnter(start);
      function naOefenen(r) {
        const echt = () => blok(scherm, soort, rnd, BEURTEN, soort.start, false, res => { uit[soort.id] = res.span; nr++; ronde(); });
        BB.scherm(scherm, BB.el('h2', null, r.juist ? 'Goed' : 'Niet goed'),
          r.juist ? null : BB.el('p', null, 'Het juiste antwoord was ' + r.antwoord + '.'),
          BB.el('p', null, 'Nu ' + BEURTEN + ' echte reeksen. Gaat het goed, dan worden ze langer.'),
          BB.el('button', { class: 'knop', type: 'button', onclick: echt }, BB.metToets('Start', 'Enter')));
        BB.opEnter(echt);
      }
    }
  }

  return {
    maakReeks, doel, schat, blok, SOORTEN, BEURTEN,
    onderdeel: {
      id: 'cijfers', naam: 'Cijfers onthouden', duur: '6 minuten',
      uitleg: [
        'Je ziet cijfers een voor een verschijnen. Daarna typ je ze na.',
        'Er zijn drie rondes: in dezelfde volgorde, achterstevoren, en van laag naar hoog.',
        'Schrijf niets op en zeg de cijfers niet hardop tegen iemand anders. Dan meet de test je geheugen niet meer.',
      ],
      test,
    },
  };
})();
