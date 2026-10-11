// De baan (in het menu heet de pagina Levels): wat je bij elk level krijgt, welke spellen nog op slot zitten, je vier vaardigheden, je poppetje
// en de doelen van de dag. Alles bouwt op de punten uit voortgang.js en staat in de opslag van de browser.
// De regels staan los van het scherm, zodat ze te testen zijn (test/controle.js).
BB.baan = (function () {
  const el = BB.el, V = BB.voortgang, P = BB.poppetje;
  const GROEPEN = ['Rekenen', 'Geheugen', 'Puzzels', 'Tempo'];
  const opsomming = lijst => lijst.length > 1 ? lijst.slice(0, -1).join(', ') + ' en ' + lijst[lijst.length - 1] : String(lijst[0] || '');
  const punten = n => n + (n === 1 ? ' punt' : ' punten');

  // ---- de haltes: bij elk level krijg je iets ----
  // spel: een spel gaat open. variant: een andere manier om een spel te spelen (zie oefenhal.js).
  // kleur, hoofd en gezicht: een onderdeel voor je poppetje (zie poppetje.js).
  // De eerste levels gaan snel en geven twee dingen. Wat hier niet staat, heb je vanaf het begin.
  const BAAN = {
    2: [['spel', 'spiegelbeeld'], ['hoofd', 'pet']],
    3: [['spel', 'versnelling'], ['kleur', 'zon']],
    4: [['spel', 'rekenspan'], ['gezicht', 'bril']],
    5: [['spel', 'controleren'], ['hoofd', 'muts']],
    6: [['variant', 'blind'], ['kleur', 'roze']],
    7: [['spel', 'kubussen'], ['gezicht', 'knipoog']],
    8: [['variant', 'achteruit'], ['kleur', 'oranje']],
    9: [['spel', 'bergop']],
    10: [['variant', 'haast']],
    11: [['hoofd', 'feesthoed']],
    12: [['variant', 'omgekeerd']],
    13: [['gezicht', 'zonnebril']],
    14: [['variant', 'eenleven']],
    15: [['kleur', 'zee']],
    16: [['hoofd', 'hogehoed']],
    17: [['gezicht', 'sterren']],
    18: [['kleur', 'nacht']],
    19: [['hoofd', 'kroon']],
    20: [['kleur', 'goud']],
  };
  const TOP = 20;
  const alles = () => Object.keys(BAAN).reduce((lijst, l) => lijst.concat(BAAN[l]), []);
  // Het level waarop je iets krijgt. 0 betekent: dat heb je vanaf het begin.
  function levelVoor(soort, id) {
    for (const l in BAAN) if (BAAN[l].some(b => b[0] === soort && b[1] === id)) return +l;
    return 0;
  }
  const OP_SLOT = alles().filter(b => b[0] === 'spel').map(b => b[1]);
  const puntenNu = () => BB.opslag.lees('punten', {}).totaal || 0;
  const levelNu = () => V.levelVan(puntenNu());
  // Een spel is open als je level hoog genoeg is, of als je het al speelde voordat er sloten waren.
  const spelOpen = id => levelNu() >= levelVoor('spel', id) || (BB.opslag.lees('vrij', []) || []).includes(id);
  const variantOpen = id => levelNu() >= levelVoor('variant', id);

  const spelNaam = id => BB.oefenhal.SPELLEN.find(s => s.id === id).naam;
  // Wat je krijgt in woorden. lang: een regel in een lijst. Anders: een stukje van een zin.
  function wat(b, lang) {
    const soort = b[0], id = b[1];
    if (soort === 'spel') return lang ? 'Nieuw spel: ' + spelNaam(id) : 'het spel ' + spelNaam(id);
    if (soort === 'variant') {
      const v = BB.oefenhal.VARIANT[id];
      return lang ? 'Nieuwe variant: ' + v.naam + ', bij ' + opsomming(v.spellen.map(spelNaam)) : 'de variant ' + v.naam;
    }
    return lang ? 'Voor je poppetje: ' + P.metVan(soort, id) : P.metVan(soort, id) + ' voor je poppetje';
  }
  // Waar je met wat je kreeg iets kunt doen: [adres, tekst op de link].
  function waarheen(b) {
    if (b[0] === 'spel') return ['#spel-' + b[1], 'Speel'];
    if (b[0] === 'variant') return ['#spel-' + BB.oefenhal.VARIANT[b[1]].spellen[0], 'Probeer'];
    return ['#poppetje', 'Aankleden'];
  }
  // De eerstvolgende halte, in een zin. stand: uit V.levelStand.
  function halteTekst(stand) {
    const volgend = stand.level + 1;
    if (!BAAN[volgend]) return 'Je hebt alle haltes gehad.';
    return 'Volgende halte, level ' + volgend + ': ' + opsomming(BAAN[volgend].map(b => wat(b))) + '. Nog ' + punten(stand.nodig - stand.binnen) + '.';
  }

  // ---- vaardigheden: een balk per groep spellen. Hij groeit met elke ronde, sneller met een medaille of een record ----
  const V_MAX = 10, MIJLPALEN = [3, 6], VOORWERP = { Rekenen: 'telraam', Geheugen: 'olifant', Puzzels: 'kubus', Tempo: 'bliksem' };
  const vDrempel = n => 10 * (n - 1) * n; // punten die je in totaal nodig hebt voor dit niveau
  const vNiveau = p => Math.min(V_MAX, Math.floor((1 + Math.sqrt(1 + 4 * p / 10)) / 2));
  function vStand(p) {
    const niveau = vNiveau(p);
    return niveau >= V_MAX ? { niveau, vol: true } : { niveau, binnen: p - vDrempel(niveau), nodig: vDrempel(niveau + 1) - vDrempel(niveau) };
  }
  const vPunten = info => 2 + [0, 5, 10, 20][info.medaille || 0] + (info.record ? 10 : 0);
  // De voorwerpen die bij dit niveau van deze groep horen: eerst de gewone, daarna de gouden.
  const voorwerpen = (groep, niveau) => MIJLPALEN.filter(m => niveau >= m).map((m, n) => VOORWERP[groep] + (n ? '-goud' : ''));
  const vaardig = () => BB.opslag.lees('vaardigheid', {});
  function vaardigNa(info) {
    const alle = vaardig(), voor = alle[info.groep] || 0, na = voor + vPunten(info);
    alle[info.groep] = na;
    BB.opslag.schrijf('vaardigheid', alle);
    const had = voorwerpen(info.groep, vNiveau(voor));
    return { groep: info.groep, erbij: na - voor, voor: vNiveau(voor), na: vStand(na), nieuw: voorwerpen(info.groep, vNiveau(na)).filter(x => !had.includes(x)) };
  }

  // ---- je poppetje: welke onderdelen je hebt en welke je gekozen hebt ----
  // Wat je moet halen voor een onderdeel: { level } of { groep, niveau }. null betekent: dat heb je vanaf het begin.
  function nodig(slot, id) {
    if (slot !== 'voorwerp') { const level = levelVoor(slot, id); return level ? { level } : null; }
    if (id === 'geen') return null;
    const d = id.split('-');
    return { groep: GROEPEN.find(g => VOORWERP[g] === d[0]), niveau: MIJLPALEN[d[1] ? 1 : 0] };
  }
  function heeft(slot, id) {
    const n = nodig(slot, id);
    return !n || (n.level ? levelNu() >= n.level : vNiveau(vaardig()[n.groep] || 0) >= n.niveau);
  }
  const hoe = (slot, id) => { const n = nodig(slot, id); return !n ? '' : n.level ? 'level ' + n.level : n.groep + ' niveau ' + n.niveau; };
  // Het uiterlijk dat je gekozen hebt. Een onderdeel dat je niet (meer) hebt valt terug op de standaard.
  function uiterlijk() {
    const u = P.heel(BB.opslag.lees('uiterlijk', null));
    for (const s of P.SLOTS) if (!heeft(s.id, u[s.id])) u[s.id] = P.STANDAARD[s.id];
    return u;
  }

  // ---- doelen van de dag: drie kleine doelen. Overslaan kost niets ----
  // Het eerste is altijd de dagkaart, het tweede een groep spellen, het derde wisselt. Ze volgen uit de datum.
  const DOELPUNTEN = 10, ALLES_PUNTEN = 20;
  const DERDE = [
    { id: 'rondes3', tekst: 'Speel 3 rondes', nodig: 3, tel: d => d.rondes },
    { id: 'medaille', tekst: 'Haal een medaille', nodig: 1, tel: d => d.medailles },
    { id: 'spellen3', tekst: 'Speel 3 verschillende spellen', nodig: 3, tel: d => d.spellen.length },
    { id: 'rondes5', tekst: 'Speel 5 rondes', nodig: 5, tel: d => d.rondes },
    { id: 'medailles2', tekst: 'Haal 2 medailles', nodig: 2, tel: d => d.medailles },
  ];
  function doelenVan(datum) {
    const rnd = BB.maakRng('doelen-' + datum), groep = BB.kies(rnd, GROEPEN);
    return [
      { id: 'dagkaart', tekst: 'Speel de dagkaart', nodig: 1, tel: d => d.dagkaart ? 1 : 0 },
      { id: 'groep', groep, tekst: 'Speel een spel uit de groep ' + groep, nodig: 1, tel: d => d.groepen.includes(groep) ? 1 : 0 },
      BB.kies(rnd, DERDE),
    ];
  }
  const leegDag = datum => ({ datum, rondes: 0, medailles: 0, spellen: [], groepen: [], dagkaart: false, beloond: [], alles: false, punten: 0 });
  // Telt een ronde mee en zegt welke doelen daardoor gehaald zijn. Los van de opslag, zodat het te testen is.
  // info: { spel, groep, medaille, dag: de datum van de dagkaart als dit de dagkaart was }
  function dagTel(oud, datum, info) {
    const d = oud && oud.datum === datum ? JSON.parse(JSON.stringify(oud)) : leegDag(datum), delen = [];
    d.rondes++;
    if (info.medaille) d.medailles++;
    if (!d.spellen.includes(info.spel)) d.spellen.push(info.spel);
    if (!d.groepen.includes(info.groep)) d.groepen.push(info.groep);
    if (info.dag === datum) d.dagkaart = true;
    for (const doel of doelenVan(datum)) {
      if (doel.tel(d) >= doel.nodig && !d.beloond.includes(doel.id)) { d.beloond.push(doel.id); delen.push(['Doel: ' + doel.tekst.toLowerCase(), DOELPUNTEN]); }
    }
    const net = d.beloond.length === 3 && !d.alles;
    if (net) { d.alles = true; delen.push(['Alle doelen van vandaag', ALLES_PUNTEN]); }
    return { dag: d, delen, net };
  }
  // De stand van vandaag. Wie de dagkaart al speelde voordat de doelen bestonden, heeft dat doel ook gehaald.
  function dagLees() {
    const v = V.vandaag(), oud = BB.opslag.lees('dagdoelen', null), d = oud && oud.datum === v ? oud : leegDag(v);
    if (BB.opslag.lees('dagkaart', {})[v]) d.dagkaart = true;
    return d;
  }
  function dagStand() {
    const d = dagLees();
    const doelen = doelenVan(d.datum).map(doel => {
      const tel = Math.min(doel.nodig, doel.tel(d)), klaar = d.beloond.includes(doel.id) || tel >= doel.nodig;
      return { id: doel.id, tekst: doel.tekst, klaar, stand: doel.nodig > 1 && !klaar ? tel + ' van ' + doel.nodig : '' };
    });
    return { doelen, aantal: doelen.filter(x => x.klaar).length, alles: d.alles, rondes: d.rondes, punten: d.punten, datum: d.datum };
  }

  // ---- na elke ronde: doelen, punten (voortgang.js) en vaardigheid ----
  // info: { spel, groep, medaille: 0 tot 3, record, dag: de datum van de dagkaart of niets }
  function naRonde(info) {
    const doel = dagTel(dagLees(), V.vandaag(), info);
    const b = V.naRonde({ medaille: info.medaille, record: info.record, dag: !!info.dag, extra: doel.delen });
    doel.dag.punten += b.erbij + (b.verrassing ? b.verrassing.punten : 0);
    BB.opslag.schrijf('dagdoelen', doel.dag);
    return Object.assign(b, { doelNet: doel.net, vaardig: vaardigNa(info) });
  }

  // ---- de eerste keer: wie al speelde voordat dit er was, houdt zijn spellen en krijgt punten voor zijn rangen ----
  function start() {
    if (BB.opslag.lees('vrij', null) !== null) return;
    const runs = BB.opslag.lees('runs', {}), sleutels = Object.keys(runs).concat(Object.keys(BB.opslag.lees('records', {})));
    BB.opslag.schrijf('vrij', OP_SLOT.filter(id => sleutels.some(k => k.startsWith(id + '|'))));
    const v = {};
    for (const k in runs) {
      const spel = BB.oefenhal.SPELLEN.find(s => k.startsWith(s.id + '|'));
      if (spel && runs[k].rang >= 0) v[spel.groep] = (v[spel.groep] || 0) + 10 * (runs[k].rang + 1);
    }
    BB.opslag.schrijf('vaardigheid', v);
    // Wie al gespeeld heeft, krijgt op de startpagina een keer te lezen wat er nieuw is.
    if (BB.opslag.lees('punten', {}).rondes > 0) BB.opslag.schrijf('gezien', { nieuw: true });
  }

  // ======== wat je op het scherm ziet ========
  // Vervangt de inhoud van een vak. kinderen mag rijtjes in rijtjes bevatten: append zelf neemt die niet aan.
  const vul = (knoop, kinderen) => BB.leeg(knoop).append(...[kinderen].flat(Infinity).filter(k => k != null && k !== false));
  const figuur = (klasse, level) => el('span', { class: 'figuur' + (klasse ? ' ' + klasse : ''), html: P.svg(uiterlijk(), level == null ? levelNu() : level) });
  const balk = (deel, klasse) => el('div', { class: 'levelspoor' }, el('div', { class: 'levelvul' + (klasse ? ' ' + klasse : ''), style: 'width:' + Math.round(deel * 100) + '%' }));
  // De regel in de kop op een telefoon: het hoofd van je poppetje, je level en je reeks.
  function kopStand(knoop) {
    BB.leeg(knoop).append(el('span', { class: 'kop-figuur', html: P.kop(uiterlijk()) }), V.kort());
  }

  // Het level met wat erbij hoort: de balk, wat je net kreeg en wat de volgende halte is.
  // levelVoor: je level voor deze ronde. Alles daarboven heb je net gehaald.
  function levelDeel(stand, voor) {
    const nieuw = [];
    for (let l = voor + 1; l <= stand.level; l++) {
      nieuw.push(el('div', { class: 'nieuw-level' },
        el('strong', null, 'Level ' + l + ' gehaald'),
        BAAN[l] ? el('ul', null, BAAN[l].map(b => el('li', null, wat(b, true) + ' ', el('a', { href: waarheen(b)[0] }, waarheen(b)[1])))) : null));
    }
    return [V.levelBalk(stand), nieuw, el('p', { class: 'halte-regel' }, halteTekst(stand))];
  }

  // Een rij met een vaardigheid: de naam, het niveau, de balk en wat het volgende voorwerp is.
  function vaardigRij(groep, p, erbij) {
    const s = vStand(p), volgend = MIJLPALEN.find(m => m > s.niveau), ding = VOORWERP[groep] + (volgend === MIJLPALEN[1] ? '-goud' : '');
    const heb = voorwerpen(groep, s.niveau);
    return el('div', { class: 'vaardig-rij' },
      el('span', { class: 'vaardig-beeld' + (heb.length ? '' : ' dicht'), html: P.ding(heb.length ? heb[heb.length - 1] : VOORWERP[groep]) }),
      el('div', null,
        el('div', { class: 'vaardig-kop' }, el('strong', null, groep), el('span', null, 'niveau ' + s.niveau), erbij ? el('b', null, '+' + erbij) : null),
        balk(s.vol ? 1 : s.binnen / s.nodig, 'v'),
        el('span', { class: 'klein' }, (s.vol ? 'Het hoogste niveau.' : s.binnen + ' van ' + s.nodig + ' punten.') +
          (volgend ? ' Op niveau ' + volgend + ': ' + P.metVan('voorwerp', ding) + ' voor je poppetje.' : ''))));
  }

  // De doelen van vandaag als lijst met vinkjes.
  function doelenLijst(st) {
    return el('ul', { class: 'dagdoelen-lijst' }, st.doelen.map(d => el('li', { class: d.klaar ? 'klaar' : null },
      el('span', { class: 'doelvink', 'aria-hidden': 'true' }, d.klaar ? '✓' : ''),
      el('span', null, d.tekst + (d.klaar ? ' (gehaald)' : ''), d.stand ? el('span', { class: 'klein' }, ' ' + d.stand) : null))));
  }
  function doelenBlok() {
    const st = dagStand();
    return el('div', { class: 'dagdoelen' },
      el('div', { class: 'dagdoelen-kop' }, el('h2', null, 'Doelen van vandaag'), el('span', { class: 'klein' }, st.aantal + ' van 3 gehaald')),
      doelenLijst(st),
      el('p', { class: 'klein' }, st.alles ? 'Alle drie gehaald. Morgen liggen er drie nieuwe.'
        : 'Elk doel levert ' + DOELPUNTEN + ' punten op, alle drie samen nog ' + ALLES_PUNTEN + ' extra. Overslaan kost niets.'),
      st.alles ? el('a', { class: 'tekstknop', href: '#vandaag' }, 'Bekijk je dag') : null);
  }
  // Op een telefoon: de doelen in een paar woorden, met een stip per doel. Een tik opent de pagina met de doelen.
  // De strook staat in de kop boven de eerste rij kaarten, de balk op de pagina Levels.
  const stippen = st => el('span', { class: 'stippen', 'aria-hidden': 'true' }, st.doelen.map(d => el('i', { class: d.klaar ? 'vol' : null })));
  function doelenStrook() {
    const st = dagStand();
    return el('a', { class: 'dagstrook', href: '#vandaag', 'aria-label': 'Doelen van vandaag: ' + st.aantal + ' van 3 gehaald' }, 'Doelen van vandaag', stippen(st));
  }
  function doelenBalk() {
    const st = dagStand();
    return el('a', { class: 'dagbalk alleen-smal', href: '#vandaag' }, el('strong', null, 'Doelen van vandaag'), stippen(st), el('span', null, st.aantal + ' van 3'));
  }

  // Het blok op de startpagina van een computer: je poppetje, je level, je reeks en de wegen naar meer.
  function statusBlok() {
    const heb = BB.opslag.lees('verzameling', []);
    return el('div', { class: 'status' },
      el('div', { class: 'status-kop' },
        el('a', { class: 'figuur-link', href: '#poppetje', title: 'Kleed je poppetje aan' }, figuur()),
        el('div', null, levelDeel(V.levelStand(puntenNu()), levelNu()))),
      V.reeksBlok(),
      el('div', { class: 'status-links' },
        el('a', { href: '#levels' }, 'Bekijk de levels'), el('a', { href: '#poppetje' }, 'Kleed je poppetje aan'),
        el('a', { href: '#verzameling' }, 'Verzameling: ' + heb.length + ' van ' + V.KAARTEN.length + ' bijzondere kaarten')));
  }
  // Een keer, voor wie al speelde: wat er nieuw is.
  function nieuwBlok() {
    if (!BB.opslag.lees('gezien', {}).nieuw) return null;
    const weg = () => { BB.opslag.schrijf('gezien', {}); blok.remove(); };
    const blok = el('div', { class: 'melding nieuw' },
      el('strong', null, 'Nieuw: de pagina Levels en je poppetje. '),
      'Bij elk level krijg je nu iets: een spel, een variant of een onderdeel voor je poppetje. Spellen die je al speelde blijven open. ',
      el('a', { href: '#levels' }, 'Bekijk de levels'), ' ',
      el('button', { class: 'tekstknop', type: 'button', onclick: weg }, 'Sluit'));
    return blok;
  }

  // Het blok op de uitslag: wat deze ronde opleverde.
  function beloningBlok(b) {
    const levelVak = el('div', { class: 'levelvak' }, levelDeel(b.zonder, b.levelVoor));
    const u = b.reeksUit, reeksRegel = 'Reeks: ' + V.dagen(b.reeks.lengte) + ' op rij' +
      (u.verdiend ? '. Je hebt een reservedag verdiend' : '') + (u.ingezet ? '. Een reservedag ving je gemiste dag op' : '') +
      (u.gebroken > 1 ? '. Je vorige reeks van ' + V.dagen(u.gebroken) + ' was voorbij' : '') + '.';
    let verras = null;
    if (b.verrassing) {
      const v = b.verrassing;
      verras = el('button', { class: 'verrassing', type: 'button' }, el('strong', null, 'Verrassing'), el('span', null, 'Draai om'));
      verras.addEventListener('click', () => {
        if (verras.classList.contains('open')) return;
        verras.classList.add('open');
        BB.leeg(verras).append(
          v.soort === 'punten' ? el('strong', null, '+' + v.punten + ' punten') : V.spaarkaart(v.kaart, true),
          el('span', null, v.soort === 'punten' ? 'Bonuspunten' : v.dubbel ? 'Deze had je al: +' + v.punten + ' punten' : 'Nieuw in je verzameling'));
        // De bonuspunten kunnen je net over de rand van een level tillen.
        vul(levelVak, levelDeel(b.met, b.levelVoor));
      });
    }
    const g = b.vaardig, st = dagStand();
    return el('div', { class: 'beloning' },
      el('div', { class: 'beloning-punten' },
        el('strong', { class: 'erbij' }, '+' + b.erbij + ' punten'),
        el('ul', null, b.delen.map(d => el('li', null, d[0] + ' ', el('b', null, '+' + d[1])))),
        levelVak,
        el('p', { class: 'klein' }, reeksRegel)),
      el('div', { class: 'beloning-groei' },
        el('a', { class: 'figuur-link', href: '#poppetje', title: 'Kleed je poppetje aan' }, figuur()),
        el('div', { class: 'groei-tekst' },
          vaardigRij(g.groep, vaardig()[g.groep] || 0, g.erbij),
          g.na.niveau > g.voor ? el('p', { class: 'nieuw-level' }, el('strong', null, g.groep + ' is nu niveau ' + g.na.niveau + '. '),
            g.nieuw.length ? ['Je poppetje krijgt ' + opsomming(g.nieuw.map(x => P.metVan('voorwerp', x))) + '. ', el('a', { href: '#poppetje' }, 'Aankleden')] : null) : null,
          el('div', { class: 'groei-doelen' },
            el('strong', null, 'Doelen van vandaag: ' + st.aantal + ' van 3'),
            doelenLijst(st),
            b.doelNet ? el('a', { class: 'knop klein-knop', href: '#vandaag' }, 'Sluit je dag af') : null))),
      verras);
  }

  // ---- de pagina Levels (in de code heet ze nog de baan) ----
  function beeld(b) {
    if (b[0] === 'spel') return el('span', { class: 'halte-beeld k-' + b[1], html: BB.kaart.TEKEN[b[1]] });
    if (b[0] === 'variant') return el('span', { class: 'halte-beeld k-' + BB.oefenhal.VARIANT[b[1]].spellen[0], html: BB.kaart.TEKEN[BB.oefenhal.VARIANT[b[1]].spellen[0]] });
    return el('span', { class: 'halte-beeld rond', html: P.kop(Object.assign(uiterlijk(), { [b[0]]: b[1] })) });
  }
  function halte(level, stand) {
    const soort = level < stand.level ? 'gehaald' : level === stand.level ? 'nu' : 'komt';
    const tekst = soort === 'nu' ? 'Hier ben je' : soort === 'gehaald' ? 'Gehaald' : 'Nog ' + punten(V.levelDrempel(level) - stand.punten);
    return el('li', { class: 'halte ' + soort },
      el('div', { class: 'halte-spoor' }, el('span', { class: 'halte-nr' }, level), soort === 'nu' ? el('span', { class: 'kop-figuur', html: P.kop(uiterlijk()) }) : null),
      el('div', { class: 'halte-wat' },
        el('strong', null, 'Level ' + level),
        level === 1 ? el('p', null, 'Het begin: ' + (BB.oefenhal.SPELLEN.length - OP_SLOT.length) + ' spellen, de IQ-test en je poppetje.')
          : el('ul', null, BAAN[level].map(b => el('li', null, beeld(b), el('span', null, wat(b, true))))),
        el('span', { class: 'halte-stand' }, tekst)));
  }
  function baan(doel) {
    // Wie hier is geweest, hoeft de melding over wat er nieuw is niet meer te zien.
    if (BB.opslag.lees('gezien', {}).nieuw) BB.opslag.schrijf('gezien', {});
    const stand = V.levelStand(puntenNu()), heb = BB.opslag.lees('verzameling', []), alle = vaardig();
    const rij = el('ol', { class: 'haltes' }, [1].concat(Object.keys(BAAN).map(Number)).map(l => halte(l, stand)));
    const s = BB.scherm(doel,
      el('h1', null, 'De levels'),
      el('div', { class: 'baan-kop' },
        el('a', { class: 'figuur-link', href: '#poppetje', title: 'Kleed je poppetje aan' }, figuur('groot')),
        el('div', { class: 'baan-stand' },
          levelDeel(stand, stand.level),
          el('p', { class: 'klein alleen-breed' }, 'Elke ronde levert punten op. Bij elk level krijg je iets: een spel, een variant of een onderdeel voor je poppetje.'),
          el('a', { class: 'knop', href: '#poppetje' }, 'Kleed je poppetje aan'))),
      // Op een telefoon staan de doelen hier in een regel. De lijst zelf staat op de pagina met de doelen.
      el('div', { class: 'alleen-breed' }, doelenBlok()), doelenBalk(),
      el('h2', { class: 'sectiekop' }, 'Je vaardigheden'),
      el('p', { class: 'klein' }, 'Een balk per groep spellen. Hij groeit met elke ronde in die groep, en sneller met een medaille of een record. Het is geen meting van je brein.'),
      el('div', { class: 'vaardig' }, GROEPEN.map(g => vaardigRij(g, alle[g] || 0))),
      el('h2', { class: 'sectiekop' }, 'De haltes'),
      el('p', { class: 'klein' }, 'Wat je bij elk level krijgt.' + (stand.level >= TOP ? ' Je hebt ze allemaal gehad.' : BB.smal() ? ' Veeg opzij voor de haltes die nog komen.' : '')),
      rij,
      // Op een telefoon staat je reeks hier, in plaats van op de startpagina. De kalender staat bij de verzameling.
      el('div', { class: 'voortgang-smal alleen-smal' }, el('h2', { class: 'sectiekop' }, 'Je reeks'), el('div', { class: 'status' }, V.reeksBlok())),
      el('a', { class: 'tekstknop', href: '#verzameling' }, BB.zeg('Verzameling', 'Speeldagen en verzameling') + ': ' + heb.length + ' van ' + V.KAARTEN.length + ' bijzondere kaarten'),
      el('a', { class: 'knop alleen-breed', href: '#start' }, 'Naar de kaarten'));
    s.classList.add('breed', 'baanpagina');
    // Op een telefoon is de rij met haltes een strook die je opzij veegt. Hij begint bij de halte waar je bent.
    const nu = rij.querySelector('.nu') || rij.lastChild;
    rij.scrollLeft = Math.max(0, nu.offsetLeft - rij.offsetLeft - 16);
  }

  // ---- de pagina Je poppetje: kies uit wat je hebt ----
  function poppetje(doel) {
    const groot = el('div', { class: 'kleed-figuur' }), knoppen = [];
    const mini = (slot, id) => slot.id === 'voorwerp' ? (id === 'geen' ? '<span class="geen-ding"></span>' : P.ding(id)) : P.kop(Object.assign(uiterlijk(), { [slot.id]: id }));
    function ververs() {
      const u = uiterlijk();
      BB.leeg(groot).append(figuur('groot'));
      for (const k of knoppen) {
        const aan = u[k.slot.id] === k.id;
        k.knop.classList.toggle('aan', aan);
        k.knop.setAttribute('aria-pressed', aan);
        k.beeld.innerHTML = mini(k.slot, k.id);
      }
    }
    function kies(slot, id) {
      BB.opslag.schrijf('uiterlijk', Object.assign(uiterlijk(), { [slot.id]: id }));
      ververs();
      kopStand(document.getElementById('stand'));
    }
    const rijen = P.SLOTS.map(slot => el('section', { class: 'kleed-groep' },
      el('h2', null, slot.naam),
      el('div', { class: 'kleed-rij' }, slot.keuzes.map(k => {
        const heb = heeft(slot.id, k.id), beeldVak = el('span', { class: 'kleed-beeld' });
        const knop = el('button', { class: 'kleed-keuze' + (heb ? '' : ' dicht'), type: 'button', disabled: heb ? null : '', onclick: () => kies(slot, k.id) },
          beeldVak, el('strong', null, k.naam), heb ? null : el('span', { class: 'klein' }, 'Op slot tot ' + hoe(slot.id, k.id)));
        knoppen.push({ slot, id: k.id, knop, beeld: beeldVak });
        return knop;
      }))));
    const s = BB.scherm(doel,
      el('h1', null, 'Je poppetje'),
      el('div', { class: 'kleed' },
        el('div', { class: 'kleed-voor' }, groot,
          el('p', { class: 'klein' }, 'Het getal op de buik is je level.', el('span', { class: 'alleen-breed' }, ' Kies hiernaast hoe je poppetje eruitziet.'), ' Wat op slot zit, speel je vrij met levels en vaardigheden.')),
        el('div', { class: 'kleed-keuzes' }, rijen)),
      el('a', { class: 'knop stil', href: '#levels' }, 'Naar de levels'));
    s.classList.add('breed', 'kleedscherm');
    ververs();
  }

  // ---- de pagina Vandaag: de drie doelen, en het slot van je dag als je ze alle drie hebt ----
  function vandaag(doel) {
    const st = dagStand(), r = V.reeksNu(), stand = V.levelStand(puntenNu());
    const open = !BB.opslag.lees('dagkaart', {})[st.datum];
    const s = BB.scherm(doel,
      el('h1', null, st.alles ? 'Klaar voor vandaag' : 'Doelen van vandaag'),
      st.alles ? figuur('groot') : null,
      el('p', { class: 'intro' }, st.alles ? 'Je hebt de drie doelen van vandaag gehaald. Morgen liggen er drie nieuwe.'
        : 'Drie kleine doelen per dag. Ze zijn vrijwillig: je verliest niets als je ze overslaat.'),
      el('div', { class: 'dagdoelen' }, doelenLijst(st),
        st.alles ? null : el('p', { class: 'klein' }, 'Elk doel levert ' + DOELPUNTEN + ' punten op, alle drie samen nog ' + ALLES_PUNTEN + ' extra. De doelen zijn op elk apparaat hetzelfde en wisselen om middernacht.')),
      el('ul', { class: 'feiten dagfeiten' },
        el('li', null, 'Vandaag: ' + st.rondes + (st.rondes === 1 ? ' ronde' : ' rondes') + ' en ' + punten(st.punten) + '.'),
        el('li', null, r.lengte ? 'Reeks: ' + V.dagen(r.lengte) + ' op rij.' : 'Je reeks begint bij je eerste ronde van vandaag.'),
        el('li', null, halteTekst(stand))),
      el('div', { class: 'knoppen' },
        !st.alles && open ? el('a', { class: 'knop', href: '#dag-' + st.datum }, 'Speel de dagkaart') : null,
        el('a', { class: 'knop' + (!st.alles && open ? ' stil' : ''), href: '#start' }, 'Naar de kaarten'),
        el('a', { class: 'knop stil', href: '#levels' }, 'Bekijk de levels')));
    s.classList.add('dagscherm');
  }

  return {
    BAAN, TOP, OP_SLOT, GROEPEN, VOORWERP, MIJLPALEN, V_MAX, DERDE, DOELPUNTEN, ALLES_PUNTEN,
    levelVoor, levelNu, spelOpen, variantOpen, wat, halteTekst, vDrempel, vNiveau, vStand, vPunten, voorwerpen, nodig, heeft, hoe, uiterlijk,
    doelenVan, dagTel, dagStand, naRonde, start,
    figuur, kopStand, statusBlok, nieuwBlok, doelenBlok, doelenStrook, doelenBalk, beloningBlok, baan, poppetje, vandaag,
  };
})();
