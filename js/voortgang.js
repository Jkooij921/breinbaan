// Wat blijft liggen tussen twee bezoeken: je rang, je speeldagen, je reeks, je punten, je verzameling,
// de dagkaart en een reservekopie. Alles staat in de opslag van de browser.
BB.voortgang = (function () {
  const el = BB.el;
  const sleutelVan = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const vandaag = () => sleutelVan(new Date());
  const gisteren = () => { const d = new Date(); d.setDate(d.getDate() - 1); return sleutelVan(d); };
  const kortDatum = s => new Date(s + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  const dagenTussen = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const dagen = n => n + (n === 1 ? ' dag' : ' dagen');

  // ---- rang: acht treden uit het kaartspel, uit het gemiddelde van je laatste vijf runs ----
  // Een gelukkige ronde verandert zo niets, en je hoogste rang blijft altijd staan.
  const RANGEN = [['7', 'Zeven'], ['8', 'Acht'], ['9', 'Negen'], ['10', 'Tien'], ['B', 'Boer'], ['V', 'Vrouw'], ['H', 'Heer'], ['A', 'Aas']];
  const RUNS_VOOR_RANG = 3, RUNS_IN_GEMIDDELDE = 5;
  // Drempels voor Acht tot en met Aas, afgeleid van de medailles: Acht is brons, Tien is zilver, Vrouw is goud.
  function drempels(m) {
    const b = m[0], z = m[1], g = m[2];
    return [b, (b + z) / 2, z, (z + g) / 2, g, g + (g - z) / 2, g + (g - z)];
  }
  function rangVan(gemiddelde, m, lager) {
    let n = 0;
    for (const d of drempels(m)) {
      if (lager ? gemiddelde <= d : gemiddelde >= d) n++; else break;
    }
    return n; // 0 is Zeven, 7 is Aas
  }
  // laatste: de scores van je laatste runs. Geeft null zolang je nog geen drie runs hebt.
  function stand(laatste, m, lager) {
    if (!laatste || laatste.length < RUNS_VOOR_RANG) return null;
    const gemiddelde = BB.gem(laatste), nu = rangVan(gemiddelde, m, lager);
    return { gemiddelde, nu, volgende: nu < 7 ? drempels(m)[nu] : null };
  }

  // ---- stempelkaart: elke dag waarop je speelt krijgt een stempel. De teller loopt alleen op ----
  const MIJLPALEN = [7, 14, 30, 60, 100];
  function stempel() {
    const lijst = BB.opslag.lees('speeldagen', []), v = vandaag();
    if (lijst.includes(v)) return false;
    BB.opslag.schrijf('speeldagen', lijst.concat(v));
    return true;
  }
  function stempelkaart() {
    const lijst = BB.opslag.lees('speeldagen', []), nu = new Date();
    const lengte = new Date(nu.getFullYear(), nu.getMonth() + 1, 0).getDate(), vakjes = [];
    for (let d = 1; d <= lengte; d++) {
      const vol = lijst.includes(sleutelVan(new Date(nu.getFullYear(), nu.getMonth(), d)));
      vakjes.push(el('span', { class: 'stempel' + (vol ? ' vol' : '') + (d === nu.getDate() ? ' nu' : '') }, d));
    }
    const volgende = MIJLPALEN.find(m => m > lijst.length);
    return el('div', { class: 'stempelkaart' },
      el('h2', null, 'Speeldagen in ' + nu.toLocaleDateString('nl-NL', { month: 'long' })),
      el('div', { class: 'stempels' }, vakjes),
      el('p', { class: 'klein' }, 'Elke dag waarop je speelt krijgt een stempel. ' + lijst.length + (lijst.length === 1 ? ' speeldag' : ' speeldagen') + ' in totaal.' +
        (volgende ? ' Bij ' + volgende + ' krijg je een ster.' : '')),
      el('div', { class: 'mijlpalen' }, MIJLPALEN.map(m => el('span', { class: 'mijlpaal' + (lijst.length >= m ? ' gehaald' : '') }, m))));
  }

  // ---- reeks: hoeveel dagen op rij je speelt. Een reservedag vangt een gemiste dag op ----
  const MAX_RESERVE = 2, RESERVE_ELKE = 5;
  const leeg = r => Object.assign({ lengte: 0, laatste: null, reserve: 0, beste: 0 }, r);
  // De regels als losse functie, zodat ze te testen zijn. Geeft de nieuwe stand en wat er gebeurde.
  function reeksNa(oud, dag) {
    const r = leeg(oud), uit = { verlengd: false, ingezet: 0, gebroken: 0, verdiend: false };
    if (r.laatste === dag) return { reeks: r, uit };
    const gemist = r.laatste ? dagenTussen(r.laatste, dag) - 1 : 0;
    if (!r.laatste || r.lengte === 0) r.lengte = 1;
    else if (gemist <= r.reserve) { r.reserve -= gemist; uit.ingezet = gemist; r.lengte++; }
    else { uit.gebroken = r.lengte; r.lengte = 1; }
    uit.verlengd = true;
    // Elke vijfde dag van een reeks levert een reservedag op, tot je er twee hebt.
    if (r.lengte % RESERVE_ELKE === 0 && r.reserve < MAX_RESERVE) { r.reserve++; uit.verdiend = true; }
    r.laatste = dag;
    r.beste = Math.max(r.beste, r.lengte);
    return { reeks: r, uit };
  }
  // Hoe de reeks er nu voor staat, ook als er vandaag nog niet gespeeld is.
  function reeksNu(oud, dag) {
    const r = leeg(oud === undefined ? BB.opslag.lees('reeks', {}) : oud);
    if (!r.laatste) return Object.assign(r, { status: 'geen' });
    const gemist = dagenTussen(r.laatste, dag || vandaag()) - 1;
    if (gemist < 0) return Object.assign(r, { status: 'gedaan' });
    if (gemist <= r.reserve) return Object.assign(r, { status: 'open', gemist });
    return Object.assign(r, { status: 'voorbij', was: r.lengte, lengte: 0 });
  }
  function reeksTekst(r) {
    if (r.status === 'gedaan') return 'Vandaag is binnen.';
    if (r.status === 'open') return 'Speel vandaag om je reeks door te zetten.' + (r.gemist ? ' Je reservedag vangt de dag op die je miste.' : '');
    if (r.status === 'voorbij') return 'Je reeks van ' + dagen(r.was) + ' is voorbij. Vandaag begint een nieuwe.';
    return 'Speel vandaag en je reeks begint.';
  }

  // ---- punten en levels: elke ronde levert punten op. Een level kost steeds iets meer ----
  const drempel = level => 25 * (level - 1) * level; // punten die je in totaal nodig hebt voor dit level
  const levelVan = punten => Math.floor((1 + Math.sqrt(1 + 4 * punten / 25)) / 2);
  function levelStand(punten) {
    const level = levelVan(punten);
    return { level, punten, binnen: punten - drempel(level), nodig: drempel(level + 1) - drempel(level) };
  }
  const MEDAILLEPUNTEN = [0, 5, 10, 20], MEDAILLENAAM = ['', 'Brons', 'Zilver', 'Goud'];
  function levelBalk(s) {
    return el('div', { class: 'levelbalk' },
      el('strong', null, 'Level ' + s.level),
      el('div', { class: 'levelspoor' }, el('div', { class: 'levelvul', style: 'width:' + Math.round(s.binnen / s.nodig * 100) + '%' })),
      el('span', null, s.binnen + ' van ' + s.nodig + ' punten'));
  }

  // ---- verzameling: twaalf bijzondere kaarten die je bij een verrassing kunt krijgen ----
  // soort 0 komt vaak voor, soort 1 soms, soort 2 zelden.
  const KAARTEN = [
    { id: 'hartenaas', naam: 'Hartenaas', teken: '♥', kleur: 'tomaat', soort: 0 },
    { id: 'ruitenboer', naam: 'Ruitenboer', teken: '♦', kleur: 'oranje', soort: 0 },
    { id: 'klavervrouw', naam: 'Klavervrouw', teken: '♣', kleur: 'munt', soort: 0 },
    { id: 'schoppenheer', naam: 'Schoppenheer', teken: '♠', kleur: 'lucht', soort: 0 },
    { id: 'hartentien', naam: 'Hartentien', teken: '♥', kleur: 'roze', soort: 0 },
    { id: 'ruitenzeven', naam: 'Ruitenzeven', teken: '♦', kleur: 'zon', soort: 0 },
    { id: 'joker', naam: 'Joker', teken: '★', kleur: 'druif', soort: 1 },
    { id: 'bliksem', naam: 'Bliksemkaart', teken: '⚡', kleur: 'zon', soort: 1 },
    { id: 'nacht', naam: 'Nachtkaart', teken: '☾', kleur: 'inkt', soort: 1 },
    { id: 'klaver', naam: 'Geluksklaver', teken: '♣', kleur: 'zee', soort: 1 },
    { id: 'kroon', naam: 'Kroonkaart', teken: '♛', kleur: 'goud', soort: 2 },
    { id: 'regenboog', naam: 'Regenboogkaart', teken: '✦', kleur: 'regenboog', soort: 2 },
  ];
  const SOORT = ['Gewoon', 'Zeldzaam', 'Heel zeldzaam'];
  const KANS_VERRASSING = 0.2, DUBBEL = 20;
  function spaarkaart(k, heb) {
    return el('div', { class: 'spaarkaart' + (heb ? ' s-' + k.kleur : ' dicht') },
      el('span', { class: 'spaar-teken' }, heb ? k.teken : '?'),
      el('strong', null, heb ? k.naam : 'Nog niet gevonden'), el('span', null, SOORT[k.soort]));
  }
  // Trekt een verrassing: bonuspunten of een bijzondere kaart. rnd is alleen voor de test anders dan Math.random.
  function trek(rnd) {
    if (rnd() < 0.5) return { soort: 'punten', punten: BB.kies(rnd, [10, 20, 20, 30, 50]) };
    const worp = rnd(), soort = worp < 0.6 ? 0 : worp < 0.9 ? 1 : 2;
    const kaart = BB.kies(rnd, KAARTEN.filter(k => k.soort === soort));
    const heb = BB.opslag.lees('verzameling', []);
    if (heb.includes(kaart.id)) return { soort: 'kaart', kaart, dubbel: true, punten: DUBBEL };
    BB.opslag.schrijf('verzameling', heb.concat(kaart.id));
    return { soort: 'kaart', kaart, dubbel: false, punten: 0 };
  }

  // ---- na elke ronde: stempel, reeks, punten en soms een verrassing ----
  // info: { medaille: 0 tot 3, record: nieuw record, dag: dagkaart, extra: nog meer regels met punten }
  function naRonde(info) {
    const eersteVandaag = stempel();
    const r = reeksNa(BB.opslag.lees('reeks', {}), vandaag());
    BB.opslag.schrijf('reeks', r.reeks);
    const delen = [['Ronde gespeeld', 10]];
    if (info.medaille) delen.push([MEDAILLENAAM[info.medaille], MEDAILLEPUNTEN[info.medaille]]);
    if (info.record) delen.push(['Nieuw record', 10]);
    if (info.dag) delen.push(['Dagkaart', 15]);
    if (eersteVandaag) delen.push(['Eerste ronde vandaag', 10]);
    // extra: wat er van buiten bij komt, zoals een gehaald doel van de dag (zie baan.js).
    for (const d of info.extra || []) delen.push(d);
    const p = Object.assign({ totaal: 0, rondes: 0, verrast: false }, BB.opslag.lees('punten', {}));
    const voor = p.totaal, erbij = delen.reduce((som, d) => som + d[1], 0);
    // De eerste verrassing komt bij je derde ronde, zodat iedereen er een meemaakt. Daarna is het toeval.
    let verrassing = null;
    if ((!p.verrast && p.rondes >= 2) || Math.random() < KANS_VERRASSING) {
      verrassing = trek(Math.random);
      p.verrast = true;
    }
    p.totaal += erbij + (verrassing ? verrassing.punten : 0);
    p.rondes++;
    BB.opslag.schrijf('punten', p);
    return { delen, erbij, verrassing, levelVoor: levelVan(voor), zonder: levelStand(voor + erbij), met: levelStand(p.totaal), reeks: r.reeks, reeksUit: r.uit };
  }

  // Het blok met je reeks: hoeveel dagen op rij, wat je vandaag moet doen en je reservedagen.
  function reeksBlok() {
    const r = reeksNu();
    return el('div', { class: 'reeksregel' + (r.status === 'open' && r.lengte ? ' open' : '') },
      el('strong', null, r.lengte ? 'Reeks: ' + dagen(r.lengte) + ' op rij' : 'Reeks'),
      el('span', null, reeksTekst(r)),
      el('span', { class: 'klein' }, 'Reservedagen: ' + r.reserve + ' van ' + MAX_RESERVE + (r.beste > r.lengte ? '. Langste reeks: ' + dagen(r.beste) : '') + '.'));
  }

  // De kop op een telefoon: level en reeks in een paar woorden. Wie erop tikt, komt bij de baan.
  function kort() {
    return 'Level ' + levelVan(BB.opslag.lees('punten', {}).totaal || 0) + ' · ' + dagen(reeksNu().lengte) + ' op rij';
  }

  function verzameling(doel) {
    const heb = BB.opslag.lees('verzameling', []);
    const s = BB.scherm(doel,
      el('h1', null, 'Verzameling'),
      // Op een telefoon staat de kalender met je speeldagen hier, in plaats van op de startpagina.
      el('div', { class: 'voortgang-smal alleen-smal' }, stempelkaart(), el('h2', null, 'Bijzondere kaarten')),
      el('p', { class: 'intro' }, 'Je hebt ' + heb.length + ' van de ' + KAARTEN.length + ' bijzondere kaarten.'),
      el('p', { class: 'klein' }, 'Na een ronde krijg je soms een verrassing: bonuspunten of een bijzondere kaart. Welke kaart je krijgt is toeval. Een kaart die je al had levert ' + DUBBEL + ' punten op.'),
      el('div', { class: 'spaarkaarten' }, KAARTEN.map(k => spaarkaart(k, heb.includes(k.id)))),
      el('div', { class: 'knoppen links' }, el('a', { class: 'knop stil', href: '#baan' }, 'Naar de baan'), el('a', { class: 'knop alleen-breed', href: '#start' }, 'Naar de kaarten')));
    s.classList.add('breed');
  }

  // ---- dagkaart: welk spel vandaag ligt, volgt uit de datum. Iedereen krijgt dus hetzelfde, zonder server ----
  const dagSpel = (datum, aantal) => Math.floor(BB.maakRng('dagkaart-' + datum)() * aantal);

  // ---- reservekopie: de browser kan zijn opslag wissen, dus je kunt alles in een bestand bewaren ----
  const SLEUTELS = ['speler', 'oefen', 'records', 'runs', 'iqpogingen', 'speeldagen', 'dagkaart', 'reeks', 'punten', 'verzameling',
    'vrij', 'vaardigheid', 'uiterlijk', 'dagdoelen', 'gezien', 'sleutel', 'online', 'onlinenaam'];
  function bewaarBestand() {
    const data = { site: 'breinbaan', datum: new Date().toISOString() };
    for (const k of SLEUTELS) data[k] = BB.opslag.lees(k, null);
    const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })), download: 'breinbaan-voortgang-' + vandaag() + '.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function zetTerug(bestand, klaar) {
    const lezer = new FileReader();
    lezer.onload = () => {
      try {
        const data = JSON.parse(lezer.result);
        if (data.site !== 'breinbaan') throw new Error('ander bestand');
        for (const k of SLEUTELS) if (data[k] != null) BB.opslag.schrijf(k, data[k]);
        // Een kopie van voor de baan weet niet welke spellen open waren. Dan wordt dat opnieuw uitgezocht (zie baan.js).
        if (data.vrij == null) BB.opslag.schrijf('vrij', null);
        klaar(true);
      } catch (e) {
        klaar(false);
      }
    };
    lezer.onerror = () => klaar(false);
    lezer.readAsText(bestand);
  }

  return {
    vandaag, gisteren, kortDatum, dagen, RANGEN, RUNS_VOOR_RANG, RUNS_IN_GEMIDDELDE, MAX_RESERVE, RESERVE_ELKE, KAARTEN, SLEUTELS,
    drempels, rangVan, stand, stempel, stempelkaart, reeksNa, reeksNu, reeksBlok, levelVan, levelStand, levelDrempel: drempel, levelBalk, spaarkaart,
    naRonde, kort, verzameling, dagSpel, bewaarBestand, zetTerug,
  };
})();
