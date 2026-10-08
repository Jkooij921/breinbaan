// Navigatie en de pagina's om de test en de oefenhal heen.
(function () {
  const app = document.getElementById('app'), el = BB.el;
  const PAGINAS = {
    start, uitslagen, uitleg, dev,
    iq: () => BB.iqtest.start(app),
    oefenhal: start,
    ranglijst: () => BB.oefenhal.ranglijst(app),
    verzameling: () => BB.voortgang.verzameling(app),
  };

  function toon() {
    const naam = location.hash.slice(1) || 'start';
    document.body.classList.remove('bezig');
    delete document.body.dataset.spel;
    // Een adres zoals #spel-sprint is het scherm voor de start van een spel. Bestaat het adres niet, dan komt de startpagina.
    if (PAGINAS[naam]) PAGINAS[naam]();
    else if (!BB.oefenhal.open(app, naam)) start();
    // In het menu licht de pagina op waar je bent. Alles wat met spelen te maken heeft hoort bij Spelen.
    const actief = PAGINAS[naam] && naam !== 'iq' && naam !== 'oefenhal' && naam !== 'dev' ? naam : 'start';
    document.querySelectorAll('.menu a').forEach(a => a.classList.toggle('actief', a.getAttribute('href') === '#' + actief));
    // Op een telefoon staan je level en je reeks kort in de kop.
    document.getElementById('stand').textContent = BB.voortgang.kort();
  }
  window.addEventListener('hashchange', toon);
  // Een link naar de pagina waar je al bent verandert het adres niet. Dan tekenen we de pagina zelf opnieuw.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && !e.defaultPrevented && a.getAttribute('href') === (location.hash || '#start') && !a.classList.contains('stoppen')) toon();
  });
  document.querySelector('.stoppen').addEventListener('click', e => {
    if (!confirm('Stoppen? Wat je tot nu toe hebt gedaan gaat verloren.')) e.preventDefault();
  });
  toon();

  function start() { BB.oefenhal.menu(app); }

  function uitslagen() {
    const pogingen = BB.opslag.lees('iqpogingen', []);
    const exporteer = () => {
      const blob = new Blob([JSON.stringify({ normversie: BB.NORMEN.versie, pogingen }, null, 2)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: 'breinbaan-uitslagen.json' });
      a.click();
      URL.revokeObjectURL(a.href);
    };
    const wis = () => {
      if (!confirm('Alle IQ-uitslagen op dit apparaat wissen? Dit kan niet ongedaan worden.')) return;
      BB.opslag.schrijf('iqpogingen', []);
      uitslagen();
    };
    const s = BB.scherm(app,
      el('h1', null, 'IQ-uitslagen'),
      el('p', { class: 'intro' }, 'De IQ-tests die op dit apparaat zijn gedaan. Alleen wie dit apparaat gebruikt, ziet ze.'),
      pogingen.length ? el('table', { class: 'ranglijst' },
        el('thead', null, el('tr', null, ['Nr', 'Naam', 'Datum', 'Test', 'Uitslag', ''].map(k => el('th', null, k)))),
        el('tbody', null, pogingen.map(p => el('tr', null,
          el('td', { class: 'plek' }, p.poging), el('td', null, p.naam), el('td', { class: 'datum' }, BB.fmtDatum(p.datum)),
          el('td', { class: 'datum' }, BB.iqtest.lengteVan(p) + ' min'),
          el('td', { class: 'score' }, BB.iqtest.kort(p)),
          el('td', null, el('button', { class: 'tekstknop', type: 'button', onclick: () => BB.iqtest.toonUitslag(app, p) }, 'Bekijk'))))))
        : el('p', null, 'Er is hier nog geen IQ-test gedaan. De scores van de spellen staan onder Records.'),
      el('div', { class: 'knoppen' },
        el('a', { class: 'knop', href: '#iq' }, 'Doe de IQ-test'),
        pogingen.length ? el('button', { class: 'knop stil', type: 'button', onclick: exporteer }, 'Bewaar de ruwe scores') : null,
        pogingen.length ? el('button', { class: 'knop stil', type: 'button', onclick: wis }, 'Wis alles') : null),
      el('h2', { class: 'sectiekop' }, 'Een kopie van alles bewaren'),
      el('p', { class: 'klein' }, 'Je records, rangen, stempels en IQ-uitslagen staan alleen in deze browser. Wis je de browsergegevens, dan zijn ze weg. Op een iPhone kan dat al gebeuren na een week zonder bezoek. Met een kopie zet je alles terug, ook op een ander apparaat.'),
      el('div', { class: 'knoppen' },
        el('button', { class: 'knop', type: 'button', onclick: BB.voortgang.bewaarBestand }, 'Bewaar een kopie'),
        el('label', { class: 'knop stil' }, 'Zet een kopie terug', el('input', { type: 'file', accept: '.json,application/json', hidden: '', onchange: e => {
          if (e.target.files[0]) BB.voortgang.zetTerug(e.target.files[0], gelukt => { alert(gelukt ? 'Je voortgang is teruggezet.' : 'Dit bestand hoort niet bij Breinbaan.'); if (gelukt) uitslagen(); });
        } }))));
    s.classList.add('breed');
  }

  function uitleg() {
    const N = BB.NORMEN;
    // Korte vragen met korte antwoorden. Wie meer wil weten klapt een vraag open.
    const vraag = (titel, ...alineas) => el('details', { class: 'vraag' }, el('summary', null, titel), alineas.map(a => el('p', null, a)));
    const s = BB.scherm(app,
      el('h1', null, 'Uitleg'),
      el('h2', null, 'De site'),
      vraag('Wat kan ik hier doen?',
        'Twee dingen. Je kunt ' + BB.oefenhal.SPELLEN.length + ' korte spellen spelen, verdeeld over rekenen, geheugen, puzzels en tempo. En je kunt een IQ-test doen van 5, 10 of 25 minuten.',
        'De spellen zijn om te oefenen en je eigen record te verbeteren. Alleen de IQ-test geeft een IQ-uitslag.'),
      vraag('Kost het iets? Heb ik een account nodig?', 'Nee. Alles is gratis en je hoeft niets aan te maken. Je vult alleen een naam in, zodat je score een naam heeft.'),
      vraag('Waar worden mijn scores bewaard?',
        'In de opslag van je browser, op het apparaat waar je nu op zit. Dat lijkt op cookies. Er gaat niets naar een server en niemand anders kan je scores zien.',
        'Gevolg: op een andere computer of in een andere browser zie je je scores niet. Wis je je browsergegevens, dan zijn ze weg. Onder IQ-uitslagen kun je een kopie bewaren en terugzetten.'),
      el('h2', null, 'De spellen'),
      vraag('Welke groepen spellen zijn er en wat oefen je ermee?',
        'Er zijn vier groepen. Bij Rekenen oefen je hoofdrekenen op tempo, bij Geheugen oefen je iets onthouden terwijl je met iets anders bezig bent, bij Puzzels oefen je regels ontdekken en vormen in je hoofd draaien, en bij Tempo oefen je snel en precies kijken. Je wordt beter in het spel dat je oefent, maar je IQ stijgt er niet van.'),
      vraag('Wat betekenen brons, zilver en goud?', 'Dat zijn doelen per ronde. Voor de start zie je wat je ervoor moet halen. Brons is ruim, goud is moeilijk.'),
      vraag('Wat is mijn rang?', 'Een rang zegt hoe je er de laatste tijd voor staat. Hij loopt van Zeven via Tien, Boer, Vrouw en Heer naar Aas, en volgt het gemiddelde van je laatste ' + BB.voortgang.RUNS_IN_GEMIDDELDE + ' rondes. Je krijgt hem na ' + BB.voortgang.RUNS_VOOR_RANG + ' rondes. De hoogste rang die je ooit haalde blijft staan.'),
      vraag('Wat is mijn reeks?', 'Het aantal dagen dat je achter elkaar hebt gespeeld. Een ronde per dag is genoeg. Mis je een dag, dan begint de reeks opnieuw, tenzij je een reservedag hebt.',
        'Een reservedag vangt een gemiste dag op. Je verdient er een op elke vijfde dag van een reeks en je kunt er ' + BB.voortgang.MAX_RESERVE + ' bewaren.'),
      vraag('Hoe werken punten en levels?', 'Elke ronde levert 10 punten op. Daar komt iets bij voor een medaille, een nieuw record, de dagkaart en je eerste ronde van de dag. Met genoeg punten ga je een level omhoog. Elk level kost iets meer dan het vorige.'),
      vraag('Wat is een verrassing?', 'Na een ronde krijg je soms een omgekeerde kaart. Draai hem om en je krijgt bonuspunten of een bijzondere kaart voor je verzameling. Wanneer hij komt en wat erin zit, is toeval. Er zijn ' + BB.voortgang.KAARTEN.length + ' bijzondere kaarten.'),
      vraag('Wat is de dagkaart?', 'Elke dag ligt er een kaart omgekeerd. Draai hem om en je krijgt het spel van die dag, met voor iedereen dezelfde opgaven. Je eerste poging telt. De kaart van gisteren blijft een dag liggen.'),
      vraag('Wat zijn speeldagen?', (BB.smal() ? 'Op de pagina Verzameling' : 'Op de startpagina') + ' staat een kalender. Elke dag waarop je speelt krijgt een stempel. Die teller loopt alleen op, ook als je reeks breekt. Bij 7, 14, 30, 60 en 100 speeldagen krijg je een ster.'),
      vraag('Wat is racen tegen je vorige ronde?', 'Bij Sprint en Tijdrace zie je twee banen. In de bovenste loop jij. In de onderste loopt je vorige ronde of je record mee, precies zo snel als je toen was. Zo zie je meteen of je voor of achter ligt.'),
      el('h2', null, 'De IQ-test'),
      vraag('Wat meet de test?', 'Hoe goed je patronen ziet en regels ontdekt. De volledige test meet ook hoeveel je kunt onthouden en hoe snel je werkt. Taal en ruimtelijk inzicht zitten er nog niet in.'),
      vraag('Waarom geeft de korte test geen getal?', 'Hoe minder opgaven, hoe minder een test kan zeggen. Na 5 minuten hoor je alleen of je onder, rond of boven het gemiddelde zit. Na 10 minuten krijg je een bereik van ongeveer ' + (2 * N.marge[10]) + ' punten breed. Na 25 minuten krijg je een getal met een marge van ongeveer ' + N.marge[25] + ' punten.'),
      vraag('Klopt mijn IQ-uitslag?', 'Het is een eerste schatting. De omrekening is nog niet getest op echte mensen. Bij een psycholoog is de marge ongeveer 5 punten, hier ongeveer ' + N.marge[25] + '.',
        'Dit is geen officiële test. Gebruik de uitslag niet voor beslissingen over school, werk of gezondheid.'),
      vraag('Word ik slimmer van oefenen?', 'Je wordt beter in het spel dat je oefent. Onderzoek laat zien dat je IQ daar niet van stijgt. Daarom tellen de spellen niet mee voor je IQ-uitslag, en zegt je eerste test het meest.'),
      el('a', { class: 'knop alleen-breed', href: '#start' }, 'Naar de kaarten'));
    s.classList.add('breed', 'tekst');
  }

  // Controlepagina voor de maker (#dev): alle opgaven van een vorm met het goede antwoord.
  // Niet bekijken voordat je de test zelf hebt gedaan, want dan ken je de antwoorden.
  function dev() {
    const vorm = 'A', N = BB.NORMEN;
    const patronen = BB.patronen.maakSet(vorm), reeksen = BB.reeksen.maakSet(vorm);
    const rnd = BB.maakRng('symbolen-' + vorm);
    const norm = (soort, items) => { const v = BB.iq.verwacht(items.map(x => x.niveau), soort); return 'verwacht gemiddelde ' + BB.komma(v.gem) + ' goed, spreiding ' + BB.komma(v.sd); };
    const s = BB.scherm(app,
      el('h1', null, 'Opgaven van vorm ' + vorm),
      el('p', { class: 'klein' }, 'Normversie ' + N.versie + '. Het goede antwoord heeft een groene rand.'),
      el('h2', null, 'Patronen'), el('p', { class: 'klein' }, norm('patronen', patronen)),
      patronen.map((item, n) => {
        const k = BB.patronen.keuzes(item, () => {});
        k.knoppen[item.juist].classList.add('juist');
        return [el('p', { class: 'teller' }, 'Opgave ' + (n + 1) + ' · niveau ' + (item.niveau + 1)), el('div', { class: 'patroonveld' }, BB.patronen.rooster(item), k.el)];
      }),
      el('h2', null, 'Cijferreeksen'), el('p', { class: 'klein' }, norm('reeksen', reeksen)),
      el('ol', { class: 'lijst' }, reeksen.map(r => el('li', null, r.reeks.join(', ') + ', ? → ' + r.antwoord + ' (' + r.regel + ')'))),
      el('h2', null, 'Sommen'),
      el('ol', { class: 'lijst kolommen' }, BB.sommen.maakTest(vorm).map(x => el('li', null, x.tekst + ' = ' + x.antwoord))),
      el('h2', null, 'Symbolen zoeken'),
      [0, 1, 2, 3, 4, 5].map(() => { const b = BB.symbolen.maakBeurt(rnd); return [BB.symbolen.beurtEl(b), el('p', { class: 'klein' }, b.aanwezig ? 'ja' : 'nee')]; }),
      el('h2', null, 'Kubussen (oefenhal)'),
      [0, 1, 2, 3, 3, 3].map((niveau, n) => {
        const item = BB.kubussen.maak(BB.maakRng('dev-kubus-' + n), niveau), k = BB.kubussen.keuzes(item, () => {});
        k.knoppen[item.juist].classList.add('juist');
        return [el('p', { class: 'teller' }, 'Niveau ' + (niveau + 1)), el('div', { class: 'patroonveld' }, BB.kubussen.uitslag(item), k.el)];
      }));
    s.classList.add('breed');
  }
})();
