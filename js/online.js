// De ranglijst van iedereen. Scores gaan alleen naar de server als de speler daarvoor kiest.
// Zonder server (of zonder verbinding) werkt de site gewoon door op dit apparaat.
// In deze code staan geen geheimen: alles wat hier staat kan iedereen lezen. De geheimen staan op de server.
BB.online = (function () {
  const el = BB.el;
  // Het adres van de server. Leeg betekent: er is geen server en de site werkt alleen op dit apparaat.
  const ADRES = '';
  const adres = () => (typeof window !== 'undefined' && window.BREINBAAN_SERVER) || ADRES;
  // Dubbelklikken op het bestand (file:) kan niet met de server praten: die neemt alleen verzoeken van de echte site aan.
  const kan = () => !!adres() && typeof fetch === 'function' && typeof location !== 'undefined' && location.protocol !== 'file:';
  const keuze = () => BB.opslag.lees('online', null); // 'ja', 'nee' of nog niet gekozen
  const doetMee = () => kan() && keuze() === 'ja' && !!BB.opslag.lees('sleutel', null);
  const plek = n => n + 'e';
  const spelers = n => n + (n === 1 ? ' speler' : ' spelers');

  // Een verzoek aan de server. Geeft altijd een antwoord terug, ook als de server niet te bereiken is: dan { ok: false, fout: 'verbinding' }.
  function vraag(pad, body) {
    const stop = typeof AbortController === 'function' ? new AbortController() : null;
    const klok = stop ? setTimeout(() => stop.abort(), 9000) : null;
    return fetch(adres() + '/api/' + pad, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: stop ? stop.signal : undefined })
      .then(r => r.json())
      .catch(() => ({ ok: false, fout: 'verbinding', tekst: 'De ranglijst van iedereen is nu niet te bereiken.' }))
      .then(antwoord => { clearTimeout(klok); return antwoord || { ok: false, fout: 'verbinding' }; });
  }
  // De sleutel van dit apparaat: een willekeurige code. Daaraan herkent de server je, zonder account.
  function sleutel() {
    let s = BB.opslag.lees('sleutel', null);
    if (!s) {
      s = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      BB.opslag.schrijf('sleutel', s);
    }
    return s;
  }
  const lokaleNaam = () => BB.opslag.lees('speler', '') || '';
  // Wat de server van je naam vond. lokaal: de naam waar dat oordeel over ging.
  function onthoudNaam(lokaal, antwoord) {
    BB.opslag.schrijf('onlinenaam', { lokaal, naam: antwoord.naam || null, ok: antwoord.ok !== false && !antwoord.naamFout, tekst: antwoord.naamFout || (antwoord.ok === false ? antwoord.tekst : '') || '' });
  }

  function meedoen() {
    const lokaal = lokaleNaam();
    return vraag('mee', { sleutel: sleutel(), naam: lokaal }).then(a => {
      if (a.ok) { BB.opslag.schrijf('online', 'ja'); onthoudNaam(lokaal, a); }
      return a;
    });
  }
  // Stoppen: alles van dit apparaat gaat van de server af en de sleutel wordt weggegooid.
  function stoppen() {
    const s = BB.opslag.lees('sleutel', null);
    const klaar = () => { BB.opslag.schrijf('online', 'nee'); BB.opslag.schrijf('sleutel', null); BB.opslag.schrijf('onlinenaam', null); };
    if (!s || !kan()) { klaar(); return Promise.resolve({ ok: true }); }
    return vraag('wis', { sleutel: s }).then(a => { if (a.ok) klaar(); return a; });
  }
  // Stuurt de naam van dit apparaat naar de server als die veranderd is. Gebeurt voor elke ronde.
  function naamBij() {
    if (!doetMee()) return Promise.resolve(null);
    const lokaal = lokaleNaam(), stand = BB.opslag.lees('onlinenaam', null);
    if (stand && stand.lokaal === lokaal) return Promise.resolve(stand);
    return vraag('naam', { sleutel: sleutel(), naam: lokaal }).then(a => {
      if (a.fout !== 'verbinding' && a.fout !== 'druk') onthoudNaam(lokaal, a);
      return BB.opslag.lees('onlinenaam', null);
    });
  }
  // De start van een ronde: de server geeft een startbewijs. Zonder startbewijs telt de score niet voor de ranglijst.
  function start(spel, k, dag) {
    if (!doetMee()) return null;
    naamBij();
    return vraag('start', { sleutel: sleutel(), spel, k, dag: dag || '' }).then(a => (a.ok ? a.ticket : null));
  }
  const stuur = (kaartje, score) => kaartje.then(ticket => (ticket ? vraag('score', { sleutel: sleutel(), ticket, score }) : { ok: false, fout: 'verbinding', tekst: 'De ranglijst van iedereen was bij de start niet te bereiken.' }));
  const lijsten = (sleutels, dag) => vraag('lijsten', { sleutel: doetMee() ? sleutel() : undefined, sleutels, dag });

  // ======== wat je op het scherm ziet ========
  // Wat er onder het veld voor je naam staat: hoe je op de ranglijst van iedereen heet.
  function naamRegel() {
    if (!doetMee()) return 'Je naam komt bij je score in de lijst met records op dit apparaat.';
    const stand = BB.opslag.lees('onlinenaam', null), lokaal = lokaleNaam();
    if (!stand || stand.lokaal !== lokaal) return 'Je naam komt ook op de ranglijst van iedereen. Hij wordt eerst gekeurd: schelden en namen van anderen kunnen niet.';
    if (!stand.ok) return 'Deze naam kan niet op de ranglijst van iedereen. Daar heet je ' + (stand.naam || 'Speler') + '. Kies een andere naam om dat te veranderen.';
    return lokaal ? 'Zo heet je ook op de ranglijst van iedereen.' : 'Zonder naam heet je op de ranglijst van iedereen ' + (stand.naam || 'Speler') + '.';
  }

  // Een naam melden die niet kan. Staat onder elke ranglijst van iedereen.
  function meldBlok(top) {
    const anderen = top.filter(r => !r.jij && !/^Speler \d+$/.test(r.naam));
    if (!anderen.length || !doetMee()) return null;
    return el('details', { class: 'hoe meld' }, el('summary', null, 'Een naam melden die niet kan'),
      el('p', { class: 'klein' }, 'Staat er een naam die scheldt of kwetst? Meld hem. Na genoeg meldingen verdwijnt de naam van de lijst tot de beheerder ernaar gekeken heeft.'),
      el('div', { class: 'keuzes' }, anderen.map(r => {
        const knop = el('button', { class: 'keuze', type: 'button' }, 'Meld ' + r.naam);
        knop.addEventListener('click', () => {
          if (!confirm('De naam ' + r.naam + ' melden?')) return;
          knop.disabled = true;
          vraag('meld', { sleutel: sleutel(), pid: r.pid }).then(a => { knop.textContent = a.ok ? 'Gemeld: ' + r.naam : 'Melden lukte niet'; });
        });
        return knop;
      })));
  }
  // Een ranglijst als tabel, met eronder jouw plek. toon: hoe het spel een score schrijft.
  function tabel(lijst, toon, lager) {
    if (!lijst.top.length) return el('p', { class: 'klein' }, 'Hier staat nog niemand. De eerste score is voor wie hem instuurt.');
    return el('table', { class: 'ranglijst' },
      el('thead', null, el('tr', null, ['Plek', 'Naam', lager ? 'Tijd' : 'Score'].map(t => el('th', null, t)))),
      el('tbody', null, lijst.top.map((r, n) => el('tr', { class: r.jij ? 'nu' : null },
        el('td', { class: 'plek' }, n + 1), el('td', null, r.naam + (r.jij ? ' (jij)' : '')), el('td', { class: 'score' }, toon(r.score))))));
  }
  function plekRegel(lijst, toon) {
    if (lijst.wacht) return 'Je score ' + toon(lijst.eigen) + ' is zo goed dat hij eerst wordt nagekeken. Daarna komt hij op de lijst.';
    if (lijst.plek == null) return lijst.van ? spelers(lijst.van) + ' op deze lijst.' : '';
    return 'Jij staat ' + plek(lijst.plek) + ' van ' + spelers(lijst.van) + ', met ' + toon(lijst.eigen) + '.';
  }
  const lijstBlok = (lijst, spel) => [tabel(lijst, spel.toon, spel.lager), el('p', { class: 'klein' }, plekRegel(lijst, spel.toon)), meldBlok(lijst.top)];

  // De vraag om mee te doen. opKlaar: wat er moet gebeuren als de speler gekozen heeft.
  function uitnodiging(opKlaar) {
    const melding = el('p', { class: 'klein', role: 'status' });
    const blok = el('div', { class: 'uitnodiging' },
      el('h3', null, 'Wil je op de ranglijst van iedereen?'),
      el('p', null, 'Dan gaan je beste scores en je naam naar de server van Breinbaan, zodat andere spelers ze zien. Je hebt geen account nodig. Dit apparaat krijgt een willekeurige code. Meer weten we niet van je.'),
      el('div', { class: 'knoppen links' },
        el('button', { class: 'knop', type: 'button', onclick: e => {
          e.target.disabled = true;
          melding.textContent = 'Even geduld.';
          meedoen().then(a => {
            if (!a.ok) { e.target.disabled = false; melding.textContent = a.tekst || 'Dat lukte nu niet. Probeer het later nog eens.'; return; }
            BB.leeg(blok).append(el('h3', null, 'Je doet mee'),
              el('p', null, 'Je heet op de ranglijst ' + a.naam + '. Vanaf je volgende ronde staat je score erop.' + (a.naamFout ? ' ' + a.naamFout : '')),
              el('p', { class: 'klein' }, 'Stoppen kan altijd, op de pagina ', el('a', { href: '#privacy' }, 'Privacy'), '.'));
            if (opKlaar) opKlaar(true);
          });
        } }, 'Ja, doe mee'),
        el('button', { class: 'knop stil', type: 'button', onclick: () => { BB.opslag.schrijf('online', 'nee'); blok.remove(); if (opKlaar) opKlaar(false); } }, 'Nee, alleen op dit apparaat')),
      melding,
      el('p', { class: 'klein' }, el('a', { href: '#privacy' }, 'Wat er precies bewaard wordt')));
    return blok;
  }

  // Op de uitslag: de ranglijst van iedereen voor het spel dat je net speelde, of de vraag om mee te doen.
  // antwoord: de belofte van stuur(), of niets als deze ronde niet is ingestuurd.
  function uitslagBlok(spel, antwoord, dag) {
    if (!kan()) return null;
    if (!doetMee()) return keuze() === null ? uitnodiging() : null;
    const vak = el('div', { class: 'online-blok' }, el('h3', null, 'Ranglijst van iedereen'), el('p', { class: 'klein' }, 'De ranglijst wordt opgehaald.'));
    if (!antwoord) { BB.leeg(vak).append(el('h3', null, 'Ranglijst van iedereen'), el('p', { class: 'klein' }, 'Deze ronde is niet ingestuurd.')); return vak; }
    antwoord.then(a => {
      BB.leeg(vak).append(el('h3', null, 'Ranglijst van iedereen'));
      if (!a.ok) { vak.append(el('p', { class: 'klein' }, (a.tekst || 'Deze ronde is niet ingestuurd.') + ' Je score staat wel op dit apparaat.')); return; }
      if (a.dag) vak.append(el('h4', null, 'De dagkaart van vandaag'), ...lijstBlok(a.dag, spel).filter(Boolean), el('h4', null, spel.naam + ', alle dagen'));
      vak.append(...lijstBlok(a.lijst, spel).filter(Boolean));
    });
    return vak;
  }

  // Op de pagina Records: de ranglijsten van iedereen voor de spellen die je gespeeld hebt.
  // kaarten: [{ spel, k, tekst }]. dagSpel: het spel van de dagkaart van vandaag.
  function recordsBlok(kaarten, dagSpel, datum) {
    const vak = el('div', { class: 'online-records' });
    if (!doetMee() && keuze() !== 'ja') vak.append(uitnodiging(() => {}));
    const lijstenVak = el('div', { class: 'lijsten' }, el('p', { class: 'klein' }, 'De ranglijsten worden opgehaald.'));
    vak.append(lijstenVak);
    lijsten(kaarten.map(x => x.k), { datum, spel: dagSpel.id }).then(a => {
      BB.leeg(lijstenVak);
      if (!a.ok) { lijstenVak.append(el('p', null, a.tekst || 'De ranglijst van iedereen is nu niet te bereiken.')); return; }
      if (a.dag) lijstenVak.append(el('article', { class: 'lijstkaart k-' + dagSpel.id }, el('h3', null, 'Dagkaart van vandaag'), el('p', { class: 'klein' }, dagSpel.naam + '. Voor iedereen dezelfde opgaven, je eerste poging telt.'), lijstBlok(a.dag, dagSpel)));
      for (const x of kaarten) {
        if (a.lijsten[x.k]) lijstenVak.append(el('article', { class: 'lijstkaart k-' + x.spel.id }, el('h3', null, x.spel.naam), el('p', { class: 'klein' }, x.tekst), lijstBlok(a.lijsten[x.k], x.spel)));
      }
    });
    return vak;
  }

  // ---- de pagina Privacy: wat er bewaard wordt, en de knop om te stoppen ----
  function privacy(doel) {
    const stand = el('div', { class: 'kader' });
    function toonStand() {
      BB.leeg(stand);
      if (!kan()) { stand.append(el('strong', null, 'Op dit moment gaat er niets naar een server.'), el('p', null, 'Alles wat je doet blijft op dit apparaat.')); return; }
      if (doetMee()) {
        const naam = (BB.opslag.lees('onlinenaam', null) || {}).naam;
        stand.append(el('strong', null, 'Je doet mee met de ranglijst van iedereen' + (naam ? ', als ' + naam : '') + '.'),
          el('p', null, 'Wil je stoppen? Dan gaat alles van dit apparaat van de server af: je naam, je scores en de code van dit apparaat. Wat op dit apparaat zelf staat, blijft staan.'),
          el('button', { class: 'knop stil', type: 'button', onclick: e => {
            if (!confirm('Stoppen met de ranglijst van iedereen en alles van de server wissen?')) return;
            e.target.disabled = true;
            stoppen().then(a => { if (a.ok) toonStand(); else { e.target.disabled = false; alert('Dat lukte nu niet. Probeer het later nog eens.'); } });
          } }, 'Stop en wis mijn gegevens van de server'));
      } else {
        stand.append(el('strong', null, 'Je doet niet mee met de ranglijst van iedereen.'), el('p', null, 'Er gaat niets van jou naar de server. Je scores staan alleen op dit apparaat.'), uitnodiging(toonStand));
      }
    }
    toonStand();
    const punt = (kop, ...alineas) => [el('h2', null, kop), alineas.map(a => el('p', null, a))];
    const s = BB.scherm(doel,
      el('h1', null, 'Privacy'),
      el('p', { class: 'intro' }, 'Wat Breinbaan van je bewaart, waar dat staat en hoe je het weghaalt.'),
      stand,
      punt('Op je eigen apparaat', 'Je scores, je level, je poppetje en je IQ-uitslagen staan in de opslag van je browser. Dat lijkt op cookies. Ze gaan nergens heen en alleen wie dit apparaat gebruikt kan ze zien. Wis je je browsergegevens, dan zijn ze weg.',
        'Breinbaan gebruikt geen cookies om je te volgen, geen advertenties en geen meetprogramma\'s van andere bedrijven.'),
      punt('Als je meedoet met de ranglijst van iedereen', 'Dat gebeurt alleen als je daar zelf voor kiest. Dan bewaart de server:',
        'Een willekeurige code van dit apparaat. Daaraan herkent de server dat een score van jou is. De code zegt niets over wie je bent.',
        'De naam die je kiest. Kies geen naam waaraan anderen je kunnen herkennen als je dat niet wilt.',
        'Je beste score per spel en je score op de dagkaart, met de datum.',
        'Je e-mailadres, je echte naam, je leeftijd of je IQ-uitslag komen nooit op de server. De IQ-test blijft altijd op je eigen apparaat.'),
      punt('Wat de server verder ziet', 'Elk apparaat op internet heeft een adres (een IP-adres). De server gebruikt dat alleen om te tellen of iemand niet te veel verzoeken achter elkaar stuurt. Hij bewaart er een onleesbare code van, die elke dag anders is en na een dag weg is.',
        'De server draait bij Cloudflare. Dat bedrijf verwerkt de verzoeken en ziet daarbij dezelfde gegevens.'),
      punt('Hoe lang', 'Tot je stopt met meedoen. Stuur je een jaar lang niets in, dan gaat alles van jou vanzelf van de server af.'),
      punt('Namen', 'Een naam wordt gekeurd voordat anderen hem zien. Schelden, kwetsen en namen van slachtoffers of daders kunnen niet. Zie je toch een naam die niet kan, dan kun je hem onder de ranglijst melden.'),
      punt('Vragen of iets laten weghalen', 'Met de knop hierboven haal je zelf alles weg. Wil je iets laten weghalen dat je niet zelf kunt wissen, vraag het dan aan degene van wie je de link naar deze site kreeg.'),
      el('a', { class: 'knop alleen-breed', href: '#start' }, 'Naar de kaarten'));
    s.classList.add('breed', 'tekst');
  }

  return { kan, keuze, doetMee, start, stuur, naamBij, naamRegel, meedoen, stoppen, uitnodiging, uitslagBlok, recordsBlok, privacy, plekRegel };
})();
