// De IQ-test in meerdere lengtes. Hoe langer de test, hoe meer de uitslag mag beweren.

// ---- rekenwerk: van ruwe scores naar een schatting ----
BB.iq = (function () {
  const N = BB.NORMEN;

  // Verwacht gemiddelde en spreiding van het aantal goed, gegeven de aangenomen moeilijkheid per opgave.
  function verwacht(niveaus, soort) {
    const c = N.gokkans[soort];
    let gewicht = 0, som = 0, kwadraat = 0;
    for (let t = -4; t <= 4.0001; t += 0.05) {
      const g = Math.exp(-t * t / 2);
      let e = 0, v = 0;
      for (const niveau of niveaus) {
        const p = c + (1 - c) / (1 + Math.exp(-N.helling * (t - N.moeilijkheid[soort][niveau])));
        e += p;
        v += p * (1 - p);
      }
      gewicht += g;
      som += g * e;
      kwadraat += g * (e * e + v);
    }
    const gem = som / gewicht;
    return { gem, sd: Math.sqrt(kwadraat / gewicht - gem * gem) };
  }
  const z = (x, norm) => (x - norm.gem) / norm.sd;

  // Werkt met de onderdelen die er zijn. De korte versies hebben alleen patronen en cijferreeksen.
  function bereken(ruw) {
    const zs = {};
    for (const soort of ['patronen', 'reeksen']) if (ruw[soort]) zs[soort] = z(ruw[soort].goed, verwacht(ruw[soort].niveaus, soort));
    if (ruw.cijfers) {
      const c = N.onthouden;
      // Het gemiddelde van drie rondes die onderling samenhangen schommelt minder dan een losse ronde.
      zs.cijfers = BB.gem(['vooruit', 'achteruit', 'gesorteerd'].map(k => z(ruw.cijfers[k], c[k]))) / Math.sqrt((1 + 2 * c.samenhang) / 3);
    }
    if (ruw.sommen) zs.sommen = z(ruw.sommen.goed, N.sommen);
    if (ruw.symbolen) zs.symbolen = z(Math.max(0, ruw.symbolen.goed - ruw.symbolen.fout), N.symbolen);
    // Een uitschieter op een onderdeel mag de uitslag niet in zijn eentje bepalen.
    let som = 0, w1 = 0, w2 = 0;
    for (const k in zs) {
      zs[k] = BB.klem(zs[k], -3, 3);
      const w = N.gewicht[k];
      som += w * zs[k];
      w1 += w;
      w2 += w * w;
    }
    // Spreiding van een gewogen som van scores die onderling even sterk samenhangen.
    const zTotaal = som / Math.sqrt(w2 + N.samenhangOnderdelen * (w1 * w1 - w2));
    return { z: zs, zTotaal, iq: BB.klem(Math.round(100 + 15 * zTotaal), N.ondergrens, N.bovengrens) };
  }

  const opSchaal = zWaarde => BB.klem(Math.round(100 + 15 * zWaarde), N.ondergrens, N.bovengrens);
  function etiket(score) {
    if (score >= 130) return 'zeer hoog';
    if (score >= 120) return 'hoog';
    if (score >= 110) return 'bovengemiddeld';
    if (score >= 90) return 'gemiddeld';
    return 'onder gemiddeld';
  }
  const band = score => score > 110 ? 'Boven gemiddeld' : score < 90 ? 'Onder gemiddeld' : 'Rond gemiddeld';

  return { verwacht, bereken, opSchaal, etiket, band };
})();

// ---- het verloop van de test ----
BB.iqtest = (function () {
  const el = BB.el, N = BB.NORMEN;
  const P = BB.patronen.onderdeel, R = BB.reeksen.onderdeel;
  const ONDERDELEN = [P, R, BB.cijfers.onderdeel, BB.sommen.onderdeel, BB.symbolen.onderdeel];
  // keuze: welke opgaven uit de generator meedoen. tijd: seconden voor het onderdeel.
  const VERSIES = [
    { id: 5, naam: 'Snelle indicatie', duur: '5 minuten', opgaven: '9 opgaven',
      geeft: 'Onder, rond of boven gemiddeld. Geen getal.',
      delen: [{ o: P, opt: { keuze: [2, 5, 6, 8, 11], tijd: 150 } }, { o: R, opt: { keuze: [3, 5, 6, 9], tijd: 120 } }],
      regels: 'Alleen goed of fout telt. Eerder klaar zijn levert niets op en gokken kost geen punten.' },
    { id: 10, naam: 'Korte test', duur: '10 minuten', opgaven: '14 opgaven',
      geeft: 'Een bereik van ongeveer ' + (2 * N.marge[10]) + ' punten breed.',
      delen: [{ o: P, opt: { keuze: [0, 3, 4, 6, 7, 9, 10], tijd: 280 } }, { o: R, opt: { keuze: [1, 2, 4, 7, 8, 9, 11], tijd: 280 } }],
      regels: 'Alleen goed of fout telt. Eerder klaar zijn levert niets op en gokken kost geen punten.' },
    { id: 25, naam: 'Volledige test', duur: '25 minuten', opgaven: 'vijf onderdelen',
      geeft: 'Een geschat IQ met marge en een score per onderdeel.',
      delen: ONDERDELEN.map(o => ({ o })),
      regels: 'Patronen en cijferreeksen tellen het zwaarst. Daar telt alleen goed of fout. Bij sommen en symbolen telt ook je tempo.' },
    { id: 45, naam: 'Uitgebreide test', duur: '45 minuten', opgaven: 'volgt later', dicht: true,
      geeft: 'Komt later.' },
  ];
  const LEEFTIJDEN = ['Zeg ik liever niet', '16 of 17', '18 tot 24', '25 tot 34', '35 tot 44', '45 tot 54', '55 tot 64', '65 tot 74', '75 of ouder'];
  const lengteVan = p => p.lengte || 25;
  const minuten = s => BB.komma(s / 60, s % 60 ? 1 : 0) + ' minuten';

  function start(doel) {
    document.body.classList.remove('bezig');
    document.body.dataset.spel = 'iq';
    // Elke lengte is een kaart met het aantal minuten groot erop.
    const s = BB.scherm(doel,
      el('h1', null, 'Hoe lang wil je?'),
      el('p', { class: 'intro' }, 'Hoe langer de test, hoe preciezer de uitslag. Die is altijd gratis.'),
      el('div', { class: 'versies' }, VERSIES.map(v => el(v.dicht ? 'div' : 'button', {
        class: 'versiekaart' + (v.dicht ? ' dicht' : ''), type: v.dicht ? null : 'button', onclick: v.dicht ? null : () => welkom(doel, v),
      }, el('span', { class: 'versie-min' }, v.id), el('span', { class: 'versie-eenheid' }, 'minuten'),
        el('strong', null, v.naam), el('span', { class: 'versie-geeft' }, v.geeft)))),
      el('p', { class: 'klein' }, 'Voor 16 jaar en ouder. Geen officiële IQ-test. ', el('a', { href: '#uitleg' }, 'Hoe werkt de score?')));
    s.classList.add('breed');
  }

  function welkom(doel, versie) {
    const eerder = BB.opslag.lees('iqpogingen', []);
    const poging = eerder.length + 1;
    // Wie een lengte voor het eerst doet, krijgt altijd vorm A. Zo maakt iedereen dezelfde opgaven en zijn
    // eerste pogingen te vergelijken. Elke lengte heeft eigen opgaven, zodat de korte test de lange niet verklapt.
    const letter = 'ABCDEFGH'[eerder.filter(p => lengteVan(p) === versie.id).length % 8];
    const vorm = versie.id === 25 ? letter : letter + '-' + versie.id;
    const naamVeld = el('input', { class: 'tekstveld', type: 'text', maxlength: 20, placeholder: 'Je naam', value: BB.opslag.lees('speler', '') });
    const leeftijdVeld = el('select', { class: 'tekstveld' }, LEEFTIJDEN.map(l => el('option', null, l)));
    const geoefendVak = el('input', { type: 'checkbox' });
    const ruw = {};
    let nr = 0, naam = '', leeftijd = '', geoefend = false;

    document.body.dataset.spel = 'iq';
    BB.scherm(doel,
      el('p', { class: 'teller' }, versie.duur + ', ' + versie.opgaven),
      el('h1', null, versie.naam),
      poging > 1 ? el('p', { class: 'melding' }, 'Dit wordt je ' + poging + 'e test. Je krijgt nieuwe opgaven, maar wie de soorten opgaven al kent scoort gemiddeld ongeveer 5 punten hoger. Je eerste test zegt het meest.') : null,
      el('ul', { class: 'lijst' },
        el('li', null, 'Zorg dat je ' + versie.duur + ' niet gestoord wordt.'),
        el('li', null, 'Geen pen, papier of rekenmachine.'),
        el('li', null, versie.regels)),
      el('div', { class: 'velden' },
        el('label', null, 'Naam', naamVeld),
        el('label', null, 'Leeftijd (mag je overslaan)', leeftijdVeld)),
      el('label', { class: 'vinkje' }, geoefendVak, 'Ik heb dit soort puzzels eerder geoefend'),
      el('button', { class: 'knop groot', type: 'button', onclick: begin }, 'Begin'),
      el('button', { class: 'tekstknop', type: 'button', onclick: () => start(doel) }, 'Andere lengte kiezen'));

    function begin() {
      naam = naamVeld.value.trim() || 'Anoniem';
      leeftijd = leeftijdVeld.selectedIndex ? leeftijdVeld.value : '';
      geoefend = geoefendVak.checked;
      BB.opslag.schrijf('speler', naamVeld.value.trim());
      document.body.classList.add('bezig');
      onderdeel();
    }
    function onderdeel() {
      if (nr >= versie.delen.length) return klaar();
      const deel = versie.delen[nr], o = deel.o;
      const echt = () => o.test(doel, vorm, res => { ruw[o.id] = res; nr++; onderdeel(); }, deel.opt);
      const verder = () => (o.oefen ? o.oefen(doel, echt) : echt());
      BB.scherm(doel,
        el('p', { class: 'teller' }, 'Onderdeel ' + (nr + 1) + ' van ' + versie.delen.length + ', ' +
          (deel.opt ? minuten(deel.opt.tijd) + ', ' + deel.opt.keuze.length + ' opgaven' : o.duur)),
        el('h1', null, o.naam),
        el('ul', { class: 'lijst' }, o.uitleg.map(zin => el('li', null, zin))),
        el('button', { class: 'knop groot', type: 'button', onclick: verder }, o.oefen ? 'Naar de oefenopgave' : 'Verder'));
      BB.opEnter(verder);
    }
    function klaar() {
      const uit = BB.iq.bereken(ruw);
      const p = {
        datum: new Date().toISOString(), naam, leeftijd, geoefend, poging, lengte: versie.id, vorm,
        apparaat: BB.aanraak() ? 'aanraakscherm' : 'toetsenbord',
        normversie: N.versie, ruw, z: uit.z, iq: uit.iq,
      };
      BB.opslag.schrijf('iqpogingen', eerder.concat(p));
      document.body.classList.remove('bezig');
      toonUitslag(doel, p);
    }
  }

  // ---- de uitslag ----
  const grens = (score, marge) => [Math.max(N.ondergrens, score - marge), Math.min(N.bovengrens, score + marge)];
  // De uitslag in een paar woorden, voor lijsten. Elke lengte zegt niet meer dan hij kan waarmaken.
  function kort(p) {
    const lengte = lengteVan(p);
    if (lengte === 5) return BB.iq.band(p.iq);
    if (lengte === 10) return grens(p.iq, N.marge[10]).join(' tot ');
    return p.iq >= N.bovengrens ? N.bovengrens + '+' : p.iq <= N.ondergrens ? 'onder ' + N.ondergrens : String(p.iq);
  }

  // De klokvorm waarin scores zich verdelen, met jouw gebied ingekleurd.
  function klok(laag, hoog, punt) {
    const x = s => ((s - 55) / 90 * 300).toFixed(1), y = s => (84 - 70 * Math.exp(-Math.pow((s - 100) / 15, 2) / 2)).toFixed(1);
    let lijn = '', vlak = 'M' + x(laag) + ',84';
    for (let s = 55; s <= 145; s++) lijn += (s === 55 ? 'M' : 'L') + x(s) + ',' + y(s);
    for (let s = laag; s <= hoog; s++) vlak += 'L' + x(s) + ',' + y(s);
    return '<svg viewBox="0 0 300 100" class="curve" role="img" aria-label="Verdeling van scores met jouw gebied">' +
      '<path class="vlak" d="' + vlak + 'L' + x(hoog) + ',84Z"/><path class="lijn" d="' + lijn + '"/>' +
      (punt == null ? '' : '<line class="punt" x1="' + x(punt) + '" x2="' + x(punt) + '" y1="' + y(punt) + '" y2="84"/>') +
      [70, 85, 100, 115, 130].map(s => '<text x="' + x(s) + '" y="97">' + s + '</text>').join('') + '</svg>';
  }
  function staaf(score) {
    const breedte = N.bovengrens - N.ondergrens;
    const plek = s => (BB.klem(s, N.ondergrens, N.bovengrens) - N.ondergrens) / breedte * 100;
    return el('div', { class: 'staaf', role: 'img', 'aria-label': 'Score ' + score },
      el('div', { class: 'staaf-midden', style: 'left:' + plek(85) + '%;width:' + (plek(115) - plek(85)) + '%' }),
      el('div', { class: 'staaf-punt', style: 'left:' + plek(score) + '%' }));
  }
  function wat(id, r) {
    if (id === 'patronen' || id === 'reeksen') return r.goed + ' van ' + r.totaal + ' goed';
    if (id === 'cijfers') return 'span ' + BB.komma(r.vooruit) + ' vooruit, ' + BB.komma(r.achteruit) + ' achteruit, ' + BB.komma(r.gesorteerd) + ' gesorteerd';
    return r.goed + ' goed, ' + r.fout + ' fout';
  }

  function toonUitslag(doel, p) {
    const lengte = lengteVan(p), versie = VERSIES.find(v => v.id === lengte);
    const delen = ONDERDELEN.filter(o => p.ruw[o.id]);
    const procent = BB.klem(Math.round(BB.normCdf((p.iq - 100) / 15) * 100), 1, 99);
    let kop, zinnen, beeld;
    if (lengte === 5) {
      const zone = p.iq > 110 ? [110, 145] : p.iq < 90 ? [55, 90] : [90, 110];
      kop = el('div', { class: 'uitslag-getal woord' }, kort(p));
      beeld = klok(zone[0], zone[1]);
      zinnen = [
        'Negen opgaven zijn te weinig voor een getal. De marge is dan ongeveer ' + N.marge[5] + ' punten naar boven en naar beneden.',
        'Wil je een bereik of een getal, doe dan de korte of de volledige test.',
      ];
    } else if (lengte === 10) {
      const g = grens(p.iq, N.marge[10]);
      kop = [el('div', { class: 'uitslag-soort' }, 'Geschat IQ-bereik'), el('div', { class: 'uitslag-getal bereik' }, kort(p))];
      beeld = klok(g[0], g[1]);
      zinnen = [
        'Je echte score ligt waarschijnlijk ergens in dit bereik. Veertien opgaven zijn te weinig om er een enkel getal van te maken.',
        'De volledige test van 25 minuten geeft een getal met een kleinere marge.',
      ];
    } else {
      const g = grens(p.iq, N.marge[25]);
      kop = [el('div', { class: 'uitslag-soort' }, 'Geschat IQ'), el('div', { class: 'uitslag-getal' }, kort(p)),
        el('div', { class: 'uitslag-etiket' }, BB.iq.etiket(p.iq))];
      beeld = klok(g[0], g[1], p.iq);
      zinnen = [
        ['Twee van de drie keer ligt je echte score tussen ', el('strong', null, p.iq - N.margeSmal), ' en ', el('strong', null, p.iq + N.margeSmal),
          '. Vrijwel zeker ligt hij tussen ' + g[0] + ' en ' + g[1] + '.'],
        'Met deze voorlopige normering scoor je hoger dan ongeveer ' + procent + ' van de 100 volwassenen.',
      ];
    }
    document.body.classList.remove('bezig');
    document.body.dataset.spel = 'iq';
    const s = BB.scherm(doel,
      el('div', { class: 'uitslagkaart' },
        el('p', { class: 'uitslag-kop' }, versie.naam + ', ' + BB.fmtDatum(p.datum)),
        el('span', { class: 'label' }, 'Voorlopige normering'),
        kop,
        el('div', { html: beeld }),
        zinnen.map(zin => el('p', null, zin))),
      el('div', { class: 'uitslag-onder' },
        p.poging > 1 ? el('p', { class: 'melding' }, 'Dit was je ' + p.poging + 'e test. Wie de soorten opgaven al kent, scoort gemiddeld ongeveer 5 punten hoger.') : null,
        el('h2', null, 'Per onderdeel'),
        el('div', { class: 'onderdelen' }, delen.map(o => {
          const score = BB.iq.opSchaal(p.z[o.id]);
          return el('div', { class: 'onderdeel-rij' },
            el('div', { class: 'onderdeel-naam' }, el('strong', null, o.naam), el('span', null, wat(o.id, p.ruw[o.id]))),
            staaf(score),
            // Bij de korte versies zijn er te weinig opgaven per onderdeel voor een eigen getal.
            el('div', { class: 'onderdeel-score' }, lengte === 25 ? score : '', el('span', null, BB.iq.etiket(score))));
        })),
        el('p', { class: 'klein' }, 'Het grijze vlak is het gemiddelde gebied, van 85 tot 115. Een los onderdeel is veel minder precies dan het totaal.'),
        el('div', { class: 'kader' },
          el('strong', null, 'Wat deze uitslag waard is'),
          el('p', null, 'Een eerste schatting. De omrekening is nog niet getest op echte mensen en vergelijkt je met alle volwassenen samen. Voor een officiële meting ga je naar een psycholoog.')),
        el('div', { class: 'knoppen' },
          lengte === 25 ? null : el('button', { class: 'knop', type: 'button', onclick: () => start(doel) }, 'Doe een langere test'),
          el('a', { class: 'knop' + (lengte === 25 ? '' : ' stil'), href: '#start' }, 'Naar de kaarten'),
          el('a', { class: 'knop stil', href: '#uitleg' }, 'Hoe werkt de score?'))));
    s.classList.add('eind', 'iq');
  }

  return { start, toonUitslag, kort, lengteVan, VERSIES, ONDERDELEN };
})();
