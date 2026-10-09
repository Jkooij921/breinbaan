// De oefenhal: spellen met een uitslag, een record, medailles en een spookrun.
// Alles hier wordt beter door oefenen. Daarom telt het niet mee voor de IQ-uitslag.
BB.oefenhal = (function () {
  const el = BB.el;
  const NIVEAUS = ['Makkelijk', 'Gemiddeld', 'Moeilijk'], BEWERKINGEN = ['+', '−', '×', '÷'];
  const STRAF = 3000, LEVENS = 3, TIEN = 10;
  const MEDAILLE = ['', 'Brons', 'Zilver', 'Goud'];
  const SPOOK = [['vorige', 'Je vorige run'], ['record', 'Je record'], ['uit', 'Niemand']];
  // Seconden per som voor brons, zilver en goud, per niveau. Zelf gekozen speldoelen, geen normen.
  // Brons is ruim: bijna iedereen haalt het in de eerste ronde. Een goed begin houdt mensen binnen.
  const TEMPO = [[6, 3, 2], [12, 6, 4], [24, 12, 8]];

  const inst = () => {
    const i = Object.assign({ niveau: 1, ops: BEWERKINGEN.slice(), spook: 'vorige', richting: 'vooruit', ronde: {}, variant: {} }, BB.opslag.lees('oefen', {}));
    // Een variant die (nog) op slot zit, doet niet mee.
    const gekozen = i.variant || {};
    i.variant = {};
    for (const id in gekozen) if (BB.baan.variantOpen(gekozen[id])) i.variant[id] = gekozen[id];
    return i;
  };
  const spelerNaam = () => BB.opslag.lees('speler', '') || 'Anoniem';
  const meerGoed = d => Math.abs(d) + (d > 0 ? ' meer goed' : ' minder goed');
  const hoger = d => BB.komma(Math.abs(d)) + (d > 0 ? ' hoger' : ' lager');
  const sneller = (d, decimalen) => BB.komma(Math.abs(d) / 1000, decimalen) + ' s ' + (d < 0 ? 'sneller' : 'langzamer');
  const aantalGoed = s => s + ' goed';
  const punten = n => n + (n === 1 ? ' punt' : ' punten');
  const meerPunten = d => punten(Math.abs(d)) + (d > 0 ? ' meer' : ' minder');
  const rekenSleutel = i => i.niveau + '|' + i.ops.join('');
  const rekenBij = i => NIVEAUS[i.niveau].toLowerCase() + ', ' + i.ops.join(' ');
  const richting = i => BB.cijfers.SOORTEN.find(s => s.id === i.richting);
  // totaal: met hoeveel levens je begon. Bij de variant met een leven staat er dus een hartje.
  const hartjes = (n, totaal) => el('span', { class: 'hartjes', 'aria-label': n + (n === 1 ? ' leven over' : ' levens over') },
    Array.from({ length: totaal || LEVENS }, (x, k) => el('span', { class: 'hart' + (k < n ? '' : ' op'), html: '<svg viewBox="0 0 40 40"><path fill="currentColor" d="' + BB.kaart.HART + '"/></svg>' })));

  // ---- hoe lang een ronde duurt: bij sommige spellen kies je dat zelf. Elke keuze heeft een eigen ranglijst ----
  // kaal: de keuze die niets extra in de sleutel van de ranglijst zet. Dat is de vorm die al bestond voordat er
  // iets te kiezen viel, zodat de records van toen geldig blijven. Bij de puzzels is dat "drie levens", terwijl
  // "10 opgaven" nu de standaard is.
  const SECONDEN = { vraag: 'Hoe lang?', standaard: 60, kaal: 60, keuzes: [[30, '30 seconden'], [60, '60 seconden'], [120, '120 seconden']],
    uitleg: v => 'De klok loopt ' + v + ' seconden.', bij: v => v + ' seconden' };
  const OPGAVEN = { vraag: 'Hoe lang?', standaard: 'tien', kaal: 'levens', keuzes: [['tien', '10 opgaven'], ['levens', 'Drie levens']],
    uitleg: v => v === 'tien' ? 'Je krijgt ' + TIEN + ' opgaven die steeds moeilijker worden. Je score is het aantal dat je goed hebt.'
      : 'Je speelt door tot je drie fouten hebt gemaakt. De opgaven worden steeds moeilijker.',
    bij: v => v === 'tien' ? TIEN + ' opgaven' : 'drie levens' };
  const RONDE = {
    sprint: { vraag: 'Hoe lang?', standaard: 15, kaal: 15, keuzes: [[10, '10 sommen'], [15, '15 sommen'], [25, '25 sommen']],
      uitleg: v => 'Je maakt ' + v + ' sommen achter elkaar.', bij: v => v + ' sommen' },
    tijdrace: SECONDEN, controleren: SECONDEN, kleurwoord: SECONDEN,
    patronen: OPGAVEN, reeksen: OPGAVEN, kubussen: OPGAVEN, spiegelbeeld: OPGAVEN,
    tikken: { vraag: 'Hoe groot is het veld?', standaard: 4, kaal: 4, keuzes: BB.tikken.MATEN.map(n => [n, n + ' bij ' + n]),
      uitleg: v => 'Je zoekt de getallen 1 tot en met ' + v * v + '.', bij: v => 'veld van ' + v + ' bij ' + v },
  };
  // Een keuze die niet (meer) bestaat valt terug op de standaard.
  const rondeVan = (id, i) => { const r = RONDE[id], v = (i.ronde || {})[id]; return r.keuzes.some(k => k[0] === v) ? v : r.standaard; };
  const rondeBij = (id, i) => RONDE[id].bij(rondeVan(id, i));
  const tien = (id, i) => rondeVan(id, i) === 'tien';
  // Zet de keuze achter de rest van de sleutel, behalve bij de kale keuze.
  const metRonde = (basis, id, i) => { const v = rondeVan(id, i); return v === RONDE[id].kaal ? basis : (basis ? basis + '|' : '') + v; };
  const puzzelTekst = (vraag, id) => i => vraag + (tien(id, i) ? ' ' + TIEN + ' opgaven, van makkelijk naar moeilijk.' : ' Je speelt door tot je drie fouten hebt.');

  // ---- varianten: een andere manier om hetzelfde spel te spelen. Je speelt ze vrij met levels (zie baan.js) ----
  // Een spel heeft hooguit een variant, en elke variant heeft zijn eigen records. De dagkaart is altijd het gewone spel.
  const BLIND_MS = 2000;
  const VARIANT = {
    blind: { naam: 'Blind', spellen: ['sprint', 'tijdrace'], uitleg: 'De som verdwijnt na ' + (BLIND_MS / 1000) + ' seconden. Onthoud hem terwijl je rekent.' },
    achteruit: { naam: 'Achteruit', spellen: ['tikken'], uitleg: 'Je begint bij het hoogste getal en tikt terug naar 1.' },
    haast: { naam: 'Haast', spellen: ['patronen', 'reeksen', 'kubussen', 'spiegelbeeld'], uitleg: 'Je krijgt per opgave de helft van de tijd.' },
    omgekeerd: { naam: 'Omgekeerd', spellen: ['kleurwoord'], uitleg: 'Je kiest het woord dat er staat, niet de kleur van de letters.' },
    eenleven: { naam: 'Eén leven', spellen: ['overleven'], uitleg: 'Je hebt een leven in plaats van drie. De eerste fout is het einde.' },
  };
  const variantBij = id => Object.keys(VARIANT).find(v => VARIANT[v].spellen.includes(id)) || null;
  // De variant die bij dit spel gekozen is, of null voor het gewone spel.
  const variantVan = (id, i) => { const v = (i.variant || {})[id]; return v && v === variantBij(id) ? v : null; };
  const puzzelTijd = (p, haast) => haast ? Math.floor(p.tijd / 2) : p.tijd;

  // ---- de regels van Versnelling en Bergop, los van het scherm zodat ze te testen zijn ----
  // Versnelling: de eerste som krijgt acht seconden. Na elk goed antwoord vijf procent minder, tot anderhalve seconde.
  const versnelTijd = goed => Math.max(1.5, 8 * Math.pow(0.95, goed));
  // Bergop: twintig treden. De onderste zes geven makkelijke sommen, de bovenste zeven moeilijke.
  // snel: binnen hoeveel seconden een goed antwoord "snel" is, per niveau van de sommenmaker.
  const BERG = { tijd: 90, top: 20, snel: [3, 6, 12] };
  const bergNiveau = trede => trede <= 6 ? 0 : trede <= 13 ? 1 : 2;
  // Snel goed is twee treden omhoog, langzamer goed een trede. Fout is twee treden omlaag.
  const bergStap = (trede, goed, snel) => BB.klem(trede + (goed ? (snel ? 2 : 1) : -2), 1, BERG.top);
  // Tien opgaven: het niveau loopt gelijkmatig op van het laagste naar het hoogste.
  const tienNiveaus = max => Array.from({ length: TIEN }, (x, n) => Math.floor(n * (max + 1) / TIEN));

  // Elk spel: hoe de score heet, wat beter is, welke instellingen een eigen ranglijst geven en waar de medailles liggen.
  // rekenen: het spel gebruikt niveau en bewerkingen. race: je loopt in een baan naast je spookrun.
  // eenheid: wat er achter de score staat als dat niet "goed" is. maat: een eigen schrijfwijze voor doelen en gemiddelden.
  // bijna: hoe dicht je bij een medaille moet zitten voor "net niet".
  // Alle medailles zijn zelf gekozen speldoelen, geen normen. Brons is ruim, goud is moeilijk. De afstand tussen
  // zilver en goud is zo gekozen dat ook de hoogste rang (goud plus die afstand) nog te halen is.
  const SPELLEN = [
    { id: 'sprint', groep: 'Rekenen', naam: 'Sprint', tekst: i => rondeVan('sprint', i) + ' sommen. De snelste tijd wint. Een fout kost 3 seconden.',
      lager: true, rekenen: true, race: true, sleutel: i => metRonde(rekenSleutel(i), 'sprint', i), bij: i => rondeBij('sprint', i) + ', ' + rekenBij(i),
      toon: BB.fmtTijd, verschil: sneller,
      medailles: i => TEMPO[i.niveau].map(t => t * rondeVan('sprint', i) * 1000),
      speel: (doel, i, ctx, klaar) => rekenspel(doel, 'sprint', i, ctx, klaar) },
    { id: 'tijdrace', groep: 'Rekenen', naam: 'Tijdrace', tekst: i => 'Zoveel mogelijk goede antwoorden in ' + rondeVan('tijdrace', i) + ' seconden.',
      rekenen: true, race: true, sleutel: i => metRonde(rekenSleutel(i), 'tijdrace', i), bij: i => rondeBij('tijdrace', i) + ', ' + rekenBij(i),
      toon: aantalGoed, verschil: meerGoed,
      medailles: i => TEMPO[i.niveau].map(t => Math.round(rondeVan('tijdrace', i) / t)),
      speel: (doel, i, ctx, klaar) => rekenspel(doel, 'tijdrace', i, ctx, klaar) },
    { id: 'overleven', groep: 'Rekenen', naam: 'Overleven', tekst: i => (variantVan('overleven', i) ? 'Eén leven.' : 'Drie levens.') + ' De sommen worden moeilijker en de klok tikt mee.',
      rekenen: 'ops', sleutel: i => '|' + i.ops.join(''), bij: i => i.ops.join(' '), toon: aantalGoed, verschil: meerGoed,
      medailles: i => variantVan('overleven', i) ? [3, 10, 18] : [5, 15, 25],
      speel: (doel, i, ctx, klaar) => rekenspel(doel, 'overleven', i, ctx, klaar) },
    // Versnelling: op moeilijk is acht seconden al krap, daarom ligt brons daar bij een enkele som.
    { id: 'versnelling', groep: 'Rekenen', naam: 'Versnelling', tekst: 'Elke som krijgt iets minder tijd dan de vorige, tot je een fout maakt of te laat bent.',
      rekenen: true, sleutel: rekenSleutel, bij: rekenBij, toon: aantalGoed, verschil: meerGoed,
      medailles: i => [[8, 18, 28], [2, 7, 13], [1, 3, 6]][i.niveau],
      uitleg: () => [BB.TYP + ' De eerste som krijgt ' + versnelTijd(0) + ' seconden.',
        'Na elk goed antwoord krijg je 5 procent minder tijd, tot ' + BB.komma(versnelTijd(999)) + ' seconde per som. Boven de som zie je hoeveel tijd je nu krijgt.',
        'Een fout antwoord of te laat zijn is meteen het einde. Je score is het aantal goede antwoorden.'],
      speel: (doel, i, ctx, klaar) => rekenspel(doel, 'versnelling', i, ctx, klaar) },
    { id: 'bergop', groep: 'Rekenen', naam: 'Bergop', tekst: 'Reken ' + BERG.tijd + ' seconden: hoe sneller je goed antwoordt, hoe moeilijker de sommen en hoe meer punten.',
      rekenen: 'ops', sleutel: i => '|' + i.ops.join(''), bij: i => i.ops.join(' '), toon: punten, verschil: meerPunten, eenheid: 'punten', bijna: 10,
      medailles: () => [30, 80, 140],
      uitleg: () => ['Je begint op niveau 1 en kunt klimmen tot niveau ' + BERG.top + '. Hoe hoger het niveau, hoe moeilijker de som.',
        'Een snel goed antwoord is twee niveaus omhoog. Een langzamer goed antwoord is een niveau omhoog. Een fout antwoord is twee niveaus omlaag.',
        'Een goed antwoord levert zoveel punten op als het niveau waarop je staat. Op niveau 7 krijg je dus 7 punten.'],
      speel: (doel, i, ctx, klaar) => rekenspel(doel, 'bergop', i, ctx, klaar) },
    { id: 'rekenspan', groep: 'Geheugen', naam: 'Rekenspan', tekst: 'Los sommen op en onthoud tussendoor letters.',
      sleutel: () => '|', bij: () => 'vaste sommen', toon: s => BB.komma(s), verschil: hoger, medailles: () => [3, 5, 6],
      uitleg: () => BB.rekenspan.uitleg, speel: rekenspan },
    { id: 'cijfers', groep: 'Geheugen', naam: 'Cijfers onthouden', tekst: 'Je ziet cijfers een voor een en typt ze na.',
      sleutel: i => i.richting, bij: i => richting(i).naam.toLowerCase(), toon: s => BB.komma(s), verschil: hoger,
      medailles: i => i.richting === 'vooruit' ? [5, 7, 8] : [4, 6, 7], kiesRichting: true,
      uitleg: i => [richting(i).opdracht + ' Voorbeeld: ' + richting(i).voorbeeld + '.',
        'Je krijgt ' + BB.cijfers.BEURTEN + ' reeksen. Na een goede reeks komt er een cijfer bij, na een fout gaat er een af.',
        'Schrijf niets op. Dan oefen je je geheugen niet.'],
      speel: cijferspel },
    // Puzzels met tien opgaven: brons is drie goed, en de eerste opgaven zijn de makkelijkste.
    { id: 'patronen', groep: 'Puzzels', naam: 'Patronen', tekst: puzzelTekst('Welk vakje maakt het patroon af?', 'patronen'),
      sleutel: i => metRonde('', 'patronen', i), bij: i => rondeBij('patronen', i), toon: aantalGoed, verschil: meerGoed,
      medailles: i => tien('patronen', i) ? [3, 6, 8] : [3, 8, 11],
      speel: (doel, i, ctx, klaar) => puzzelspel(doel, PUZZEL.patronen, tien('patronen', i), ctx, klaar) },
    { id: 'reeksen', groep: 'Puzzels', naam: 'Cijferreeksen', tekst: puzzelTekst('Ontdek het patroon. Welk getal komt er daarna?', 'reeksen'),
      sleutel: i => metRonde('', 'reeksen', i), bij: i => rondeBij('reeksen', i), toon: aantalGoed, verschil: meerGoed,
      medailles: i => tien('reeksen', i) ? [3, 6, 8] : [3, 8, 11],
      speel: (doel, i, ctx, klaar) => puzzelspel(doel, PUZZEL.reeksen, tien('reeksen', i), ctx, klaar) },
    { id: 'kubussen', groep: 'Puzzels', naam: 'Kubussen', tekst: puzzelTekst('Welke kubus vouw je van de uitslag?', 'kubussen'),
      sleutel: i => metRonde('', 'kubussen', i), bij: i => rondeBij('kubussen', i), toon: aantalGoed, verschil: meerGoed,
      medailles: i => tien('kubussen', i) ? [3, 6, 8] : [3, 8, 12],
      uitleg: () => BB.kubussen.uitleg.slice(1, 3),
      speel: (doel, i, ctx, klaar) => puzzelspel(doel, PUZZEL.kubussen, tien('kubussen', i), ctx, klaar) },
    // Spiegelbeeld: met twee antwoorden heeft wie gokt er gemiddeld vijf van de tien goed. Daar ligt brons.
    { id: 'spiegelbeeld', groep: 'Puzzels', naam: 'Spiegelbeeld', tekst: puzzelTekst('Is de rechter figuur gedraaid of gespiegeld?', 'spiegelbeeld'),
      sleutel: i => metRonde('', 'spiegelbeeld', i), bij: i => rondeBij('spiegelbeeld', i), toon: aantalGoed, verschil: meerGoed,
      medailles: i => tien('spiegelbeeld', i) ? [5, 8, 9] : [3, 10, 18],
      uitleg: i => BB.spiegelbeeld.uitleg.concat(BB.zeg('Druk J voor gedraaid en F voor gespiegeld.', 'Tik op de knop Gedraaid of op de knop Gespiegeld.') + ' Je hebt ' + puzzelTijd(PUZZEL.spiegelbeeld, variantVan('spiegelbeeld', i)) + ' seconden per opgave en hogere niveaus hebben meer vierkantjes.'),
      speel: (doel, i, ctx, klaar) => puzzelspel(doel, PUZZEL.spiegelbeeld, tien('spiegelbeeld', i), ctx, klaar) },
    // Controleren: de rijen worden langer, dus twee keer zoveel tijd geeft minder dan twee keer zoveel punten.
    { id: 'controleren', groep: 'Tempo', naam: 'Controleren', tekst: i => 'Bekijk twee rijen cijfers en zeg of ze gelijk zijn, zo vaak mogelijk in ' + rondeVan('controleren', i) + ' seconden.',
      sleutel: i => metRonde('', 'controleren', i), bij: i => rondeBij('controleren', i), toon: punten, verschil: meerPunten, eenheid: 'punten',
      medailles: i => ({ 30: [3, 7, 11], 60: [6, 13, 20], 120: [11, 22, 33] })[rondeVan('controleren', i)],
      uitleg: () => BB.controleren.uitleg,
      speel: (doel, i, ctx, klaar) => tempospel(doel, TAAK.controleren, rondeVan('controleren', i), ctx, klaar) },
    { id: 'tikken', groep: 'Tempo', naam: 'Getallen tikken', tekst: i => variantVan('tikken', i)
      ? 'Tik de getallen van ' + Math.pow(rondeVan('tikken', i), 2) + ' terug naar 1 zo snel mogelijk aan.'
      : 'Tik de getallen 1 tot en met ' + Math.pow(rondeVan('tikken', i), 2) + ' zo snel mogelijk op volgorde aan.',
      // De tijden liggen hier dicht bij elkaar. Daarom het verschil in honderdsten en de doelen in tienden van seconden.
      lager: true, sleutel: i => metRonde('', 'tikken', i), bij: i => rondeBij('tikken', i), toon: BB.fmtTijd, verschil: d => sneller(d, 2),
      maat: x => BB.komma(x / 1000, x % 1000 ? 1 : 0) + ' s', bijna: 1000,
      medailles: i => ({ 3: [12000, 7000, 5500], 4: [40000, 17000, 13000], 5: [90000, 40000, 28000] })[rondeVan('tikken', i)],
      uitleg: i => variantVan('tikken', i) ? ['Je ziet een veld met getallen door elkaar. Tik ze van hoog naar laag aan: eerst het hoogste getal, dan steeds een lager, tot je bij 1 bent.'].concat(BB.tikken.uitleg.slice(1)) : BB.tikken.uitleg,
      speel: (doel, i, ctx, klaar) => tikspel(doel, rondeVan('tikken', i), ctx, klaar) },
    // Omgekeerd: het woord lezen gaat vanzelf en is dus makkelijker dan de kleur noemen. Daarom liggen de medailles daar hoger.
    { id: 'kleurwoord', groep: 'Tempo', naam: 'Kleurwoord', tekst: i => 'Kies zo vaak mogelijk in ' + rondeVan('kleurwoord', i) + ' seconden ' +
      (variantVan('kleurwoord', i) ? 'het woord dat er staat, niet de kleur van de letters.' : 'de kleur van de letters, niet het woord dat er staat.'),
      sleutel: i => metRonde('', 'kleurwoord', i), bij: i => rondeBij('kleurwoord', i), toon: punten, verschil: meerPunten, eenheid: 'punten',
      medailles: i => (variantVan('kleurwoord', i) ? [25, 45, 60] : [20, 40, 55]).map(m => Math.round(m * rondeVan('kleurwoord', i) / 60)),
      uitleg: i => variantVan('kleurwoord', i) ? [BB.kleurwoord.uitleg[0], 'Kies het woord dat er staat, niet de kleur van de letters. Staat er "rood" in blauwe letters, dan is het antwoord rood.'].concat(BB.kleurwoord.uitleg.slice(2)) : BB.kleurwoord.uitleg,
      speel: (doel, i, ctx, klaar) => tempospel(doel, ctx.variant ? TAAK.omgekeerd : TAAK.kleurwoord, rondeVan('kleurwoord', i), ctx, klaar) },
  ];
  // De koppen op de startpagina, met in een paar woorden wat je in die groep doet.
  const GROEPEN = [['Rekenen', 'Sommen uit je hoofd, op tempo'], ['Geheugen', 'Onthouden terwijl je met iets anders bezig bent'],
    ['Puzzels', 'Regels ontdekken en vormen draaien in je hoofd'], ['Tempo', 'Snel en precies kijken en kiezen']];
  const tekstVan = (spel, i) => typeof spel.tekst === 'function' ? spel.tekst(i) : spel.tekst;
  // De variant staat achteraan in de sleutel, achter een golfje. Zo blijven de sleutels van het gewone spel wat ze waren.
  const sleutel = (spel, i) => spel.id + '|' + spel.sleutel(i) + (variantVan(spel.id, i) ? '~' + variantVan(spel.id, i) : '');
  const zonderVariant = k => k.split('~')[0], variantUit = k => VARIANT[k.split('~')[1]] ? k.split('~')[1] : null;
  const beter = (spel, a, b) => spel.lager ? a < b : a > b;
  const kleur = id => { document.body.dataset.spel = id; };

  // ---- opslag: ranglijst (top 10) en per instelling de vorige en de beste run ----
  const lijst = k => BB.opslag.lees('records', {})[k] || [];
  function bewaar(spel, k, score) {
    const alles = BB.opslag.lees('records', {});
    const rij = { naam: spelerNaam(), score, datum: new Date().toISOString() };
    const top = (alles[k] || []).concat(rij).sort((a, b) => spel.lager ? a.score - b.score : b.score - a.score).slice(0, 10);
    alles[k] = top;
    BB.opslag.schrijf('records', alles);
    return { top, plek: top.indexOf(rij) + 1 }; // plek 0 betekent buiten de top 10
  }
  function medaille(spel, i, score) {
    const m = spel.medailles(i);
    let n = 0;
    while (n < 3 && (score === m[n] || beter(spel, score, m[n]))) n++;
    return n;
  }
  function tabel(spel, top, plek, kop) {
    if (!top.length) return el('p', { class: 'klein' }, 'Nog geen scores.');
    return el('table', { class: 'ranglijst' },
      kop ? el('thead', null, el('tr', null, ['Plek', 'Naam', spel.lager ? 'Tijd' : 'Score', 'Datum'].map(t => el('th', null, t)))) : null,
      el('tbody', null, top.map((r, n) =>
      el('tr', { class: n + 1 === plek ? 'nu' : null },
        el('td', { class: 'plek' }, n + 1), el('td', null, r.naam),
        el('td', { class: 'score' }, spel.toon(r.score)), el('td', { class: 'datum' }, BB.fmtDatum(r.datum))))));
  }

  // ---- wat blijft liggen tussen twee bezoeken: rang, dagkaart en stempelkaart ----
  const V = BB.voortgang, B = BB.baan;
  const span = spel => spel.id === 'rekenspan' || spel.id === 'cijfers';
  // Een drempel of gemiddelde in de eenheid van het spel, ook als het geen heel getal is.
  const maat = (spel, x) => spel.maat ? spel.maat(x) : spel.lager ? BB.fmtKlok(x) : span(spel) ? BB.komma(x)
    : BB.komma(x, Number.isInteger(x) ? 0 : 1) + ' ' + (spel.eenheid || 'goed');
  const rangNaam = n => V.RANGEN[n][1];
  // De dagkaart heeft vaste instellingen, zodat iedereen dezelfde opgaven krijgt. Ook de lengte van de ronde is de standaard.
  const dagInst = datum => Object.assign(inst(), { niveau: 1, ops: BEWERKINGEN.slice(), ronde: {}, variant: {}, richting: ['vooruit', 'achteruit', 'gesorteerd'][V.dagSpel('richting-' + datum, 3)] });
  const dagSpel = datum => SPELLEN[V.dagSpel(datum, SPELLEN.length)];

  function deel(knop, datum, spel, r) {
    const tekst = 'Breinbaan dagkaart ' + V.kortDatum(datum) + ': ' + spel.naam + ' ' + spel.toon(r.score) + (r.m ? ', ' + MEDAILLE[r.m].toLowerCase() : '');
    const vraag = () => window.prompt('Kopieer deze tekst:', tekst);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tekst).then(() => { knop.textContent = 'Gekopieerd'; }, vraag);
    else vraag();
  }
  // ---- adressen: het scherm voor de start van elk spel heeft een eigen adres ----
  // Daardoor brengt de terugknop van de telefoon of de browser je terug naar de kaarten, in plaats van weg van de site.
  const ga = (doel, naam) => { if (location.hash === '#' + naam) open(doel, naam); else location.hash = '#' + naam; };
  const naarStart = doel => { if ((location.hash || '#start') === '#start') menu(doel); else location.hash = '#start'; };
  // Het paneel met keuzes op een telefoon: een stap terug doet het dicht. Zie begin().
  let paneelDicht = null;
  if (typeof window !== 'undefined') window.addEventListener('popstate', () => { if (paneelDicht) paneelDicht(); });
  // Tekent het scherm dat bij een adres hoort. Geeft false als het adres niet (meer) bestaat.
  function open(doel, naam) {
    const spel = SPELLEN.find(sp => 'spel-' + sp.id === naam);
    if (spel) { if (B.spelOpen(spel.id)) begin(doel, spel); else opSlot(doel, spel); return true; }
    const dag = naam.startsWith('dag-') ? naam.slice(4) : null;
    if (!dag || (dag !== V.vandaag() && dag !== V.gisteren()) || BB.opslag.lees('dagkaart', {})[dag]) return false;
    begin(doel, dagSpel(dag), dag);
    return true;
  }

  // Een kaart per dag, omgekeerd op tafel. Wie hem gespeeld heeft, ziet zijn score. De kaart van gisteren
  // blijft liggen, zodat een gemiste avond niets kost.
  function dagkaart(doel) {
    const gedaan = BB.opslag.lees('dagkaart', {}), v = V.vandaag(), g = V.gisteren(), klaar = gedaan[v];
    // Wie vandaag al speelde, ziet het spel dat hij toen kreeg. De lijst met spellen kan daarna langer zijn geworden.
    const spel = (klaar && SPELLEN.find(sp => sp.id === klaar.spel)) || dagSpel(v);
    return el('div', { class: 'vandaag' },
      klaar
        ? el('div', { class: 'dagklaar k-' + spel.id },
          el('span', { class: 'kaart-teken', html: BB.kaart.TEKEN[spel.id] }),
          el('div', null, el('strong', null, 'Dagkaart van ' + V.kortDatum(v)),
            el('span', null, spel.naam + ': ' + spel.toon(klaar.score) + (klaar.m ? ', ' + MEDAILLE[klaar.m].toLowerCase() : ''))),
          el('button', { class: 'tekstknop', type: 'button', onclick: e => deel(e.target, v, spel, klaar) }, 'Deel'))
        : el('button', { class: 'kaart rug', type: 'button', onclick: () => ga(doel, 'dag-' + v) },
          el('span', { class: 'kaart-naam' }, 'Dagkaart'), el('span', { class: 'kaart-onder' }, V.kortDatum(v))),
      klaar ? null : el('p', { class: 'klein' }, 'Vandaag voor iedereen dezelfde opgaven. Draai de kaart om.'),
      gedaan[g] ? null : el('button', { class: 'tekstknop', type: 'button', onclick: () => ga(doel, 'dag-' + g) }, 'De kaart van ' + V.kortDatum(g) + ' ligt er ook nog'));
  }
  // Dezelfde dagkaart als gewone kaart, voor de eerste rij op een telefoon. tekst: wat er onder de naam staat.
  function dagTegel(doel, datum, tekst) {
    const klaar = BB.opslag.lees('dagkaart', {})[datum];
    if (!klaar) return BB.kaart.el('dag', 'Dagkaart', V.kortDatum(datum), () => ga(doel, 'dag-' + datum), null, tekst);
    const spel = SPELLEN.find(sp => sp.id === klaar.spel) || dagSpel(datum);
    const kaart = BB.kaart.el(spel.id, 'Dagkaart', 'Tik om te delen', () => deel(kaart.querySelector('.kaart-onder'), datum, spel, klaar), null,
      'Gedaan. ' + spel.naam + ': ' + spel.toon(klaar.score) + (klaar.m ? ', ' + MEDAILLE[klaar.m].toLowerCase() : ''));
    return kaart;
  }

  // ---- de tafel met kaarten: de startpagina ----
  function menu(doel) {
    document.body.classList.remove('bezig');
    delete document.body.dataset.spel;
    const i = inst(), pogingen = BB.opslag.lees('iqpogingen', []), laatste = pogingen[pogingen.length - 1], alleRuns = BB.opslag.lees('runs', {});
    const kaartVan = spel => {
      // Een spel op slot ligt er wel, met het level erbij waarop het opengaat. Zo zie je waar je naartoe speelt.
      if (!B.spelOpen(spel.id)) {
        const dicht = BB.kaart.el(spel.id, spel.naam, 'Op slot tot level ' + B.levelVoor('spel', spel.id), () => ga(doel, 'spel-' + spel.id));
        dicht.classList.add('dicht');
        dicht.prepend(el('span', { class: 'kaart-slot', html: SLOT }));
        return dicht;
      }
      const k = sleutel(spel, i), beste = lijst(k)[0], rang = (alleRuns[k] || {}).rang;
      // De rang staat in de hoek, zoals de waarde op een speelkaart.
      return BB.kaart.el(spel.id, spel.naam, beste ? 'Record ' + spel.toon(beste.score) : null, () => ga(doel, 'spel-' + spel.id), rang >= 0 ? V.RANGEN[rang][0] : null);
    };
    // Per groep eerst de spellen die open zijn, dan de spellen op slot in de volgorde waarin ze opengaan.
    const inGroep = naam => SPELLEN.filter(spel => spel.groep === naam).map((spel, n) => [B.spelOpen(spel.id) ? 0 : B.levelVoor('spel', spel.id), n, spel])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
    const iqKaart = () => BB.kaart.el('iq', 'IQ-test', laatste ? 'Laatste: ' + BB.iqtest.kort(laatste) : null, () => { location.hash = '#iq'; });
    // De kaarten liggen per soort bij elkaar, met een kop erboven. Zo blijft een tafel met vijftien kaarten te overzien.
    // Op een telefoon is elke groep een rij die je opzij veegt. Daar staat het aantal kaarten in de kop, zodat je weet dat er meer zijn.
    // rechts: wat er op een telefoon rechts in de kop staat in plaats van het aantal spellen.
    const stapel = (titel, tekst, kaarten, klasse, rechts) => el('section', { class: 'groep' + (klasse ? ' ' + klasse : '') },
      el('div', { class: 'groepkop' }, el('h2', null, titel), tekst ? el('span', { class: 'klein alleen-breed' }, tekst) : null,
        klasse ? rechts || null : el('span', { class: 'klein alleen-smal' }, kaarten.length + ' spellen')),
      el('div', { class: 'kaartrij' }, kaarten));
    const v = V.vandaag(), g = V.gisteren(), gedaan = BB.opslag.lees('dagkaart', {}), gespeeld = BB.opslag.lees('punten', {}).rondes > 0;
    const s = BB.scherm(doel,
      el('div', { class: 'held alleen-breed' },
        el('h1', null, 'Reken, puzzel en test je IQ.'),
        el('p', null, 'Achter elke kaart zit een kort spel of een test. ' + BB.zeg('Klik', 'Tik') + ' op een kaart om hem te openen. Alles is gratis en je hebt geen account nodig.'),
        B.statusBlok(),
        B.doelenBlok(),
        dagkaart(doel),
        V.stempelkaart()),
      // Op een telefoon is er geen ruimte voor de grote kop. Wie nog niet gespeeld heeft, krijgt een regel uitleg.
      gespeeld ? null : el('p', { class: 'welkom alleen-smal' }, 'Tik op een kaart. Gratis, zonder account.'),
      el('div', { class: 'tafel' },
        stapel('IQ-test', 'De enige kaart die een IQ-uitslag geeft', [iqKaart()], 'alleen-breed'),
        GROEPEN.map(gr => stapel(gr[0], gr[1], inGroep(gr[0]).map(kaartVan))),
        // Alleen op een telefoon: de dagkaart en de IQ-test samen in de eerste rij. Deze groep staat hier als laatste,
        // zodat de kaarten op een computer precies zo blijven liggen als ze lagen. Het stijlblad zet hem bovenaan.
        stapel('Begin hier', '', [dagTegel(doel, v, 'Elke dag een spel, voor iedereen gelijk'), iqKaart(),
          gedaan[g] ? null : dagTegel(doel, g, 'Die van gisteren ligt er nog')], 'eerst alleen-smal',
        // Wie al speelde, ziet naast de kop de doelen van vandaag.
        gespeeld ? B.doelenStrook() : null),
        // Een keer, voor wie al speelde: wat er nieuw is. Staat hier als laatste en komt met het stijlblad bovenaan.
        B.nieuwBlok()));
    s.classList.add('start');
  }
  const SLOT = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

  // Een spel dat nog op slot zit: wat het is, op welk level het opengaat en hoe ver je bent.
  function opSlot(doel, spel) {
    document.body.classList.remove('bezig');
    kleur(spel.id);
    const level = B.levelVoor('spel', spel.id), totaal = BB.opslag.lees('punten', {}).totaal || 0, nodig = V.levelDrempel(level);
    const groot = BB.kaart.groot(spel.id, spel.naam);
    groot.classList.add('alleen-breed', 'dicht');
    const s = BB.scherm(doel,
      groot,
      el('div', { class: 'spelbalk alleen-smal' }, el('span', { class: 'kaart-teken', html: BB.kaart.TEKEN[spel.id] }), el('strong', null, spel.naam)),
      el('div', { class: 'begin-zij' },
        el('span', { class: 'label slot' }, 'Op slot'),
        el('p', { class: 'intro' }, tekstVan(spel, inst())),
        el('div', { class: 'slotvak' },
          el('strong', null, 'Dit spel gaat open op level ' + level + '.'),
          el('div', { class: 'levelspoor' }, el('div', { class: 'levelvul', style: 'width:' + Math.round(totaal / nodig * 100) + '%' })),
          el('span', { class: 'klein' }, 'Je bent level ' + B.levelNu() + '. Nog ' + punten(nodig - totaal) + '. Elke ronde van een ander spel levert punten op.')),
        el('p', { class: 'klein' }, 'Ligt dit spel op de dagkaart, dan kun je het die dag wel spelen.'),
        el('div', { class: 'knoppen' },
          el('a', { class: 'knop groot', href: '#baan' }, 'Bekijk de baan'),
          el('button', { class: 'knop stil alleen-breed', type: 'button', onclick: () => naarStart(doel) }, 'Terug naar de kaarten'))));
    s.classList.add('begin', 'slot');
  }

  // Het scherm voor de start. Elk onderdeel zegt in woorden wat het doet.
  // dag: de datum van de dagkaart. Dan liggen de instellingen vast.
  const WOORD = { '+': 'plus', '−': 'min', '×': 'keer', '÷': 'delen' };
  const doelTekst = (spel, d) => spel.lager ? 'binnen ' + maat(spel, d) : span(spel) ? 'span ' + maat(spel, d) + ' of hoger' : maat(spel, d) + ' of meer';
  // paneel: alleen op een telefoon. Staat het paneel met de keuzes open, dan blijft het open als het scherm opnieuw getekend wordt.
  function begin(doel, spel, dag, paneel) {
    document.body.classList.remove('bezig');
    kleur(spel.id);
    const i = dag ? dagInst(dag) : inst(), k = sleutel(spel, i), beste = lijst(k)[0], doelen = spel.medailles(i);
    const runs = BB.opslag.lees('runs', {})[k] || {}, st = V.stand(runs.laatste, doelen, spel.lager);
    const zet = wijzig => {
      wijzig();
      BB.opslag.schrijf('oefen', Object.assign(inst(), dag ? { spook: i.spook } : i));
      const open = doel.querySelector('.instel.open');
      begin(doel, spel, dag, open ? { schuif: open.scrollTop } : null);
    };
    const keuze = (tekst, aan, klik) => el('button', { type: 'button', class: 'keuze' + (aan ? ' aan' : ''), 'aria-pressed': aan, onclick: () => zet(klik) }, tekst);
    // Een vakje met een vinkje: aangevinkt doet mee.
    const vink = (tekst, aan, klik) => el('button', { type: 'button', class: 'keuze vink' + (aan ? ' aan' : ''), role: 'checkbox', 'aria-checked': aan ? 'true' : 'false', onclick: () => zet(klik) },
      el('span', { class: 'vinkvak' }, aan ? '✓' : ''), tekst);
    const groep = (titel, knoppen, toelichting) => el('div', { class: 'veld' }, el('h3', null, titel), el('div', { class: 'keuzes' }, knoppen),
      toelichting ? el('p', { class: 'klein' }, toelichting) : null);
    const start = () => aftellen(doel, spel, dag);
    const naamNu = BB.opslag.lees('speler', '');
    const naam = el('input', { class: 'tekstveld', type: 'text', maxlength: 20, placeholder: 'Bijvoorbeeld Joran', value: naamNu });
    naam.addEventListener('input', () => BB.opslag.schrijf('speler', naam.value.trim()));
    // In het paneel op een telefoon sluit Enter het paneel. Anders start Enter het spel.
    naam.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); if (instel.classList.contains('open')) dicht(); else start(); } });
    const uitleg = spel.uitleg ? spel.uitleg(i) : null;
    // De lengte van de ronde, als die te kiezen is. De keuze wordt per spel onthouden.
    const ronde = RONDE[spel.id], rondeNu = ronde ? rondeVan(spel.id, i) : null;
    // De variant die bij dit spel hoort (als die er is) en of hij aan staat. vOpen: je level is hoog genoeg.
    const vKeuze = dag ? null : variantBij(spel.id), variant = variantVan(spel.id, i), vOpen = vKeuze && B.variantOpen(vKeuze);
    // Een voorbeeldsom per gekozen soort, zodat je ziet wat je krijgt.
    const voorbeelden = niveau => i.ops.map(o => BB.sommen.maak(BB.maakRng('voorbeeld-' + niveau + o), niveau, [o]).tekst).join(', ');
    const rangRegel = !st ? 'Na ' + V.RUNS_VOOR_RANG + ' rondes krijg je een rang, van Zeven tot Aas.'
      : 'Je rang is ' + rangNaam(Math.max(runs.rang, st.nu)) + '.' + (st.nu < runs.rang ? ' Je vorm nu: ' + rangNaam(st.nu) + '.' : '') +
        (st.volgende == null ? '' : ' Voor ' + rangNaam(st.nu + 1) + ' moet je gemiddelde over je laatste ' + V.RUNS_IN_GEMIDDELDE + ' rondes ' + (spel.lager ? 'onder ' : 'boven ') + maat(spel, st.volgende) + ' komen.');
    const recordRegel = beste ? 'Het record op dit apparaat: ' + spel.toon(beste.score) + ' door ' + beste.naam + '.' : '';
    // De keuzes in een paar woorden, voor de telefoon. Daar staan de keuzes zelf in een paneel achter de knop Aanpassen.
    const kort = [variant ? 'variant ' + VARIANT[variant].naam.toLowerCase() : null, ronde ? ronde.bij(rondeNu) : null, spel.rekenen === true ? NIVEAUS[i.niveau].toLowerCase() : null, spel.rekenen ? i.ops.join(' ') : null,
      spel.kiesRichting ? 'volgorde ' + richting(i).naam.toLowerCase() : null,
      spel.race ? (i.spook === 'uit' ? 'zonder tegenstander' : i.spook === 'record' ? 'tegen je record' : 'tegen je vorige ronde') : null,
      naamNu ? 'als ' + naamNu : 'zonder naam'].filter(Boolean).join(' · ');
    // Het paneel schuift op een telefoon van onderen omhoog. Dichtdoen is hetzelfde als een stap terug,
    // zodat de terugknop van de telefoon het paneel ook sluit. Op een computer staan de keuzes gewoon op de pagina.
    const dicht = () => { if (history.state && history.state.paneel) history.back(); else begin(doel, spel, dag); };
    const instel = el('div', { class: 'instel' },
      el('div', { class: 'instel-kop alleen-smal' }, el('h2', null, 'Aanpassen'), el('button', { class: 'knop', type: 'button', onclick: dicht }, 'Klaar')),
      !dag && ronde ? groep(ronde.vraag, ronde.keuzes.map(kz => keuze(kz[1], kz[0] === rondeNu, () => { i.ronde = Object.assign({}, i.ronde, { [spel.id]: kz[0] }); })),
        ronde.uitleg(rondeNu) + ' Elke keuze heeft zijn eigen records.') : null,
      vKeuze ? groep('Welke variant?', [
        keuze('Gewoon', !variant, () => { i.variant = Object.assign({}, i.variant); delete i.variant[spel.id]; }),
        vOpen ? keuze(VARIANT[vKeuze].naam, variant === vKeuze, () => { i.variant = Object.assign({}, i.variant, { [spel.id]: vKeuze }); })
          : el('button', { type: 'button', class: 'keuze dicht', disabled: '' }, VARIANT[vKeuze].naam + ' (level ' + B.levelVoor('variant', vKeuze) + ')')],
      VARIANT[vKeuze].naam + ': ' + VARIANT[vKeuze].uitleg + (vOpen ? ' Een variant heeft zijn eigen records.' : ' Deze variant gaat open op level ' + B.levelVoor('variant', vKeuze) + '.')) : null,
      !dag && spel.rekenen === true ? groep('Hoe moeilijk?', NIVEAUS.map((n, nr) => keuze(n, nr === i.niveau, () => { i.niveau = nr; }))) : null,
      !dag && spel.rekenen ? groep('Welke sommen doen mee?', BEWERKINGEN.map(o => vink(o + ' ' + WOORD[o], i.ops.includes(o), () => {
        const nieuw = BEWERKINGEN.filter(b => b === o ? !i.ops.includes(b) : i.ops.includes(b));
        if (nieuw.length) i.ops = nieuw; // minstens een soort blijft aan
      })), 'Een vinkje betekent: deze sommen krijg je. Je krijgt nu sommen zoals ' + voorbeelden(spel.rekenen === true ? i.niveau : 1) + '.') : null,
      !dag && spel.kiesRichting ? groep('In welke volgorde typ je ze na?', BB.cijfers.SOORTEN.map(soort => keuze(soort.naam, soort.id === i.richting, () => { i.richting = soort.id; })), 'Voorbeeld: ' + richting(i).voorbeeld + '.') : null,
      spel.race ? groep('Tegen wie race je?', SPOOK.map(sp => keuze(sp[1], i.spook === sp[0], () => { i.spook = sp[0]; })),
        'Tijdens het spel zie je twee banen: jij, en daaronder ' + (i.spook === 'uit' ? 'niemand. Je speelt alleen tegen de klok.' : i.spook === 'record' ? 'je snelste ronde tot nu toe.' : 'je vorige ronde.')) : null,
      el('div', { class: 'veld naamveld' }, el('h3', null, 'Hoe heet je?'), naam, el('p', { class: 'klein' }, 'Je naam komt bij je score in de lijst met records op dit apparaat.')));
    function toonPaneel(direct) {
      instel.classList.add('open');
      instel.classList.toggle('direct', direct);
      instel.setAttribute('role', 'dialog');
      instel.setAttribute('aria-modal', 'true');
      instel.setAttribute('aria-label', 'Aanpassen');
      document.body.classList.add('paneel-open');
      // Na het sluiten wordt het scherm opnieuw getekend, zodat de samenvatting klopt met wat je koos.
      paneelDicht = () => begin(doel, spel, dag);
      BB.opruim.push(() => { document.body.classList.remove('paneel-open'); paneelDicht = null; });
    }
    const groot = BB.kaart.groot(spel.id, spel.naam);
    groot.classList.add('alleen-breed');
    const s = BB.scherm(doel,
      groot,
      // Op een telefoon is de grote kaart een smalle balk: de tekening en de naam.
      el('div', { class: 'spelbalk alleen-smal' }, el('span', { class: 'kaart-teken', html: BB.kaart.TEKEN[spel.id] }), el('strong', null, spel.naam)),
      el('div', { class: 'begin-zij' },
        dag ? el('span', { class: 'label' }, 'Dagkaart van ' + V.kortDatum(dag)) : null,
        el('p', { class: 'intro' }, tekstVan(spel, i)),
        variant ? el('p', { class: 'variant-regel' }, el('span', { class: 'label' }, 'Variant ' + VARIANT[variant].naam), ' ' + VARIANT[variant].uitleg) : null,
        dag ? el('p', { class: 'klein' }, 'Iedereen krijgt vandaag dezelfde opgaven. Je eerste poging telt.',
          el('span', { class: 'alleen-breed' }, (ronde || spel.rekenen ? ' Bij de dagkaart valt er niets te kiezen, zodat iedereen hetzelfde speelt.' : '') +
            (spel.kiesRichting ? ' Volgorde: ' + richting(i).naam.toLowerCase() + '.' : ''))) : null,
        // Wie het spel nog niet gespeeld heeft, ziet de uitleg open staan. Op een telefoon staat hij dicht, achter een tik.
        uitleg ? el('details', { class: 'hoe', open: beste || BB.smal() ? null : '' }, el('summary', null, 'Hoe werkt het?'),
          el('ul', { class: 'lijst' }, uitleg.map(zin => el('li', null, zin)))) : null,
        el('div', { class: 'instel-kort alleen-smal' },
          el('div', null, el('h3', null, dag ? 'Vaste instellingen' : 'Je instellingen'), el('p', null, kort)),
          el('button', { class: 'knop stil', type: 'button', onclick: () => { history.pushState({ paneel: true }, ''); toonPaneel(false); } }, 'Aanpassen')),
        instel,
        el('div', { class: 'veld doelveld' }, el('h3', null, 'Wat kun je halen?'),
          el('div', { class: 'doelen' }, doelen.map((d, n) => el('div', null, BB.kaart.fiche(n + 1, MEDAILLE[n + 1]), el('b', null, doelTekst(spel, d))))),
          el('p', { class: 'klein alleen-breed' }, rangRegel + (beste ? ' ' + recordRegel : '')),
          beste ? el('p', { class: 'klein alleen-smal' }, recordRegel) : null),
        el('div', { class: 'knoppen' },
          el('button', { class: 'knop groot', type: 'button', onclick: start }, 'Start'),
          el('button', { class: 'knop stil alleen-breed', type: 'button', onclick: () => naarStart(doel) }, 'Terug naar de kaarten'))),
      el('div', { class: 'paneel-achter', onclick: dicht }));
    s.classList.add('begin');
    if (paneel) { toonPaneel(true); instel.scrollTop = paneel.schuif; }
    BB.opEnter(start);
  }

  function aftellen(doel, spel, dag) {
    document.body.classList.add('bezig');
    kleur(spel.id);
    const t = el('div', { class: 'aftel' }, '3');
    BB.scherm(doel, t);
    let n = 3;
    (function tik() {
      BB.later(() => {
        if (--n > 0) { t.textContent = n; return tik(); }
        const i = dag ? dagInst(dag) : inst(), k = sleutel(spel, i), runs = BB.opslag.lees('runs', {})[k] || {};
        // De spookrun: je vorige run of je record met dezelfde instellingen.
        const spook = i.spook === 'uit' ? null : (i.spook === 'record' ? runs.beste : runs.vorige) || null;
        // Bij de dagkaart komen de opgaven uit de datum. Anders zijn ze elke keer nieuw.
        const rnd = dag ? BB.maakRng('dag-' + dag + '-' + spel.id) : Math.random;
        const spookNaam = i.spook === 'record' ? 'record' : 'vorige run';
        // spookRegel: een regel om onder het spel te zetten, voor spellen zonder banen.
        spel.speel(doel, i, { spook, runs, rnd, spookNaam, variant: variantVan(spel.id, i), spookRegel: spook ? 'Je ' + spookNaam + ': ' + spel.toon(spook.score) : '' },
          res => uitslag(doel, spel, i, k, runs, res, dag));
      }, 650);
    })();
  }

  // De regel boven een spel: links de stand, rechts wat erbij hoort (levens, punten, de tijd per som).
  function kop() {
    const tekst = el('span', null), extra = el('span', { class: 'kop-extra' });
    return { el: el('div', { class: 'spelkop' }, tekst, extra), tekst, extra };
  }
  // Een korte klok per som, met tienden van seconden. BB.klok telt in hele seconden en kleurt onder de tien
  // seconden rood. Bij een klok van een paar seconden zou hij dan altijd rood zijn.
  function somKlok(balk, seconden, klaar) {
    const start = performance.now();
    let gestopt = false;
    const id = setInterval(tik, 50);
    function stop() { gestopt = true; clearInterval(id); }
    function tik() {
      const over = Math.max(0, seconden * 1000 - (performance.now() - start));
      balk.vul.style.width = (over / (seconden * 10)) + '%';
      balk.tekst.textContent = BB.komma(over / 1000) + ' s';
      balk.el.classList.toggle('krap', over < seconden * 250);
      if (over <= 0 && !gestopt) { stop(); klaar(); }
    }
    BB.opruim.push(stop);
    tik();
    return { stop };
  }

  // ---- rekenspellen: Sprint, Tijdrace, Overleven, Versnelling en Bergop ----
  // niveau is hier steeds het niveau van de sommenmaker (0 tot 2). trede is het niveau van 1 tot 20 bij Bergop.
  function rekenspel(doel, modus, i, ctx, klaar) {
    const spook = ctx.spook && ctx.spook.tijden ? ctx.spook : null, race = modus === 'sprint' || modus === 'tijdrace';
    const aantal = rondeVan('sprint', i), stappen = [], tijden = [];
    const blind = ctx.variant === 'blind', maxLevens = ctx.variant === 'eenleven' ? 1 : LEVENS;
    let verberg = null;
    BB.opruim.push(() => clearTimeout(verberg));
    // Zet de som neer. Bij de variant Blind verdwijnt hij na een paar tellen en staat er een vraagteken.
    function toonSom() {
      opgave.textContent = huidig.tekst;
      if (!blind) return;
      clearTimeout(verberg);
      verberg = setTimeout(() => { if (!af) opgave.textContent = '?'; }, BLIND_MS);
    }
    let goed = 0, fout = 0, levens = maxLevens, af = false, huidig = null, klok = null, somStart = 0, trede = 1, top = 1, score = 0;
    const balk = BB.maakBalk(), regel = kop(), opgave = el('div', { class: 'som somkaart' }), stand = el('p', { class: 'stand' }, race ? null : ctx.spookRegel || null);
    // De banen: jij in baan 1, je spookrun in baan 2. Zonder spookrun loop je alleen.
    const loper = klasse => el('i', { class: 'loper ' + klasse });
    const ik = loper('ik'), ander = spook && race ? loper('spook') : null;
    // In jouw baan loopt je eigen poppetje.
    ik.innerHTML = BB.poppetje.kop(B.uiterlijk());
    const baan = (wie, l) => el('div', { class: 'baan' }, el('span', null, wie), el('div', { class: 'baan-spoor' }, l));
    // Bergop: een trap van twintig treden. Zo zie je in een oogopslag hoe hoog je staat.
    const treden = modus === 'bergop' ? Array.from({ length: BERG.top }, (x, n) => el('i', { style: 'height:' + (20 + 80 * (n + 1) / BERG.top) + '%' })) : null;
    const veld = BB.getalVeld(antwoord);
    if (modus === 'sprint') balk.el.classList.add('alleen-tijd');
    BB.scherm(doel, balk.el, regel.el,
      race ? el('div', { class: 'race', 'aria-hidden': 'true' }, baan('Jij', ik), ander ? baan(ctx.spookNaam === 'record' ? 'Je record' : 'Vorige run', ander) : null) : null,
      treden ? el('div', { class: 'bergtrap', 'aria-hidden': 'true' }, treden) : null,
      opgave, veld, BB.toetsen(veld, BB.CIJFERS), stand);
    const start = performance.now();
    // De klok van het spel. Bij Sprint telt straftijd mee, zodat gokken niet loont.
    const nu = () => performance.now() - start + (modus === 'sprint' ? fout * STRAF : 0);
    const spookGoed = () => spook.tijden.filter(t => t <= nu()).length;
    const plek = deel => (4 + 92 * Math.min(1, deel)) + '%';
    if (modus === 'tijdrace') klok = BB.klok(balk, rondeVan('tijdrace', i), einde);
    if (modus === 'bergop') klok = BB.klok(balk, BERG.tijd, einde);
    const ticker = setInterval(tik, 100);
    BB.opruim.push(() => clearInterval(ticker));
    nieuw();
    tik();
    veld.focus();

    function niveauNu() {
      if (modus === 'overleven') return goed < 5 ? 0 : goed < 12 ? 1 : 2;
      return modus === 'bergop' ? bergNiveau(trede) : i.niveau;
    }
    function zetStand(d, eenheid) { // d > 0 betekent dat je voorloopt
      stand.className = 'stand ' + (d > 0 ? 'voor' : d < 0 ? 'achter' : 'gelijk');
      stand.textContent = d === 0 ? 'Gelijk met je ' + ctx.spookNaam : (d > 0 ? '+ ' : '− ') + eenheid + (d > 0 ? ' voor' : ' achter');
    }
    function tik() {
      if (af) return;
      if (modus === 'sprint') balk.tekst.textContent = BB.komma(nu() / 1000) + ' s';
      if (!race) return;
      const g = ander ? spookGoed() : 0, maat = modus === 'sprint' ? aantal : Math.max(spook ? spook.tijden.length : 0, goed, 10);
      ik.style.left = plek(goed / maat);
      if (ander) ander.style.left = plek(g / maat);
      if (ander && modus === 'tijdrace') zetStand(goed - g, Math.abs(goed - g) + (Math.abs(goed - g) === 1 ? ' som' : ' sommen'));
    }
    function nieuw() {
      const vorige = huidig;
      do { huidig = BB.sommen.maak(ctx.rnd, niveauNu(), i.ops); } while (vorige && huidig.tekst === vorige.tekst);
      toonSom();
      somStart = nu();
      if (modus === 'sprint') regel.tekst.textContent = 'Som ' + (goed + 1) + ' van ' + aantal;
      else if (modus === 'bergop') regel.tekst.textContent = 'Niveau ' + trede + ' van ' + BERG.top;
      else regel.tekst.textContent = goed + ' goed';
      if (modus === 'overleven') {
        BB.leeg(regel.extra).append(hartjes(levens, maxLevens));
        if (klok) klok.stop();
        // Moeilijkere sommen krijgen meer tijd, maar op het hoogste niveau wordt de klok langzaam krapper.
        klok = BB.klok(balk, [6, 10, Math.max(10, 16 - (goed - 12) * 0.25)][niveauNu()], () => mis(null));
      }
      if (modus === 'versnelling') {
        // De tijd die je voor deze som krijgt staat er in woorden bij, zodat je hem ziet krimpen.
        regel.extra.textContent = BB.komma(versnelTijd(goed)) + ' s per som';
        if (klok) klok.stop();
        klok = somKlok(balk, versnelTijd(goed), () => mis(null));
      }
      if (modus === 'bergop') {
        regel.extra.textContent = punten(score);
        treden.forEach((t, n) => { t.className = n + 1 === trede ? 'nu' : n < trede ? 'aan' : ''; });
      }
    }
    function flits(soort) {
      opgave.classList.remove('flits-goed', 'flits-fout');
      void opgave.offsetWidth; // herstart de animatie
      opgave.classList.add('flits-' + soort);
    }
    function antwoord(v) {
      if (af) return;
      veld.value = '';
      if (+v !== huidig.antwoord) return mis(v);
      goed++;
      const t = nu();
      tijden.push(t);
      stappen.push({ ok: true, som: huidig.tekst, duur: t - somStart });
      flits('goed');
      // Bij Sprint vergelijk je per som: wanneer had je spookrun deze som goed?
      if (spook && modus === 'sprint' && spook.tijden[goed - 1] != null) {
        const d = spook.tijden[goed - 1] - t;
        zetStand(Math.abs(d) < 50 ? 0 : d, BB.komma(Math.abs(d) / 1000) + ' s');
      }
      if (modus === 'bergop') {
        // De som levert de punten van de trede waarop hij stond. Daarna pas klim je.
        score += trede;
        trede = bergStap(trede, true, t - somStart < BERG.snel[bergNiveau(trede)] * 1000);
        top = Math.max(top, trede);
      }
      if (modus === 'sprint' && goed >= aantal) return einde();
      nieuw();
    }
    function mis(v) { // fout antwoord, of de klok liep af (v is dan null)
      if (af) return;
      fout++;
      stappen.push({ ok: false, som: huidig.tekst, antwoord: v, juist: huidig.antwoord });
      flits('fout');
      if (modus === 'versnelling') return einde();
      if (modus === 'bergop') trede = bergStap(trede, false);
      if (modus === 'overleven' && --levens === 0) return einde();
      if (modus !== 'sprint') nieuw();
      // Bij Sprint blijft dezelfde som staan. Wie blind speelt, krijgt hem dan nog een keer te zien.
      else if (blind) toonSom();
    }
    function einde() {
      if (af) return;
      af = true;
      if (klok) klok.stop();
      clearInterval(ticker);
      const traagste = stappen.filter(s => s.ok).sort((a, b) => b.duur - a.duur)[0];
      const missers = stappen.filter(s => !s.ok).map(s => s.som + ' = ' + s.juist + (s.antwoord == null ? ' (te laat)' : ' (jij typte ' + s.antwoord + ')'));
      klaar({
        score: modus === 'sprint' ? Math.round(nu()) : modus === 'bergop' ? score : goed,
        tijden,
        regels: [
          // Bij Versnelling is er altijd precies een misser. Die staat er meteen bij.
          modus === 'versnelling' ? 'Het ging mis bij ' + missers[0] + '.'
            : goed + ' van de ' + (goed + fout) + ' antwoorden goed' + (modus === 'sprint' && fout ? ' (' + (fout * STRAF / 1000) + ' seconden straftijd)' : ''),
          modus === 'versnelling' ? 'Voor die som had je ' + BB.komma(versnelTijd(goed)) + ' seconden.' : null,
          modus === 'bergop' ? 'Hoogste niveau: ' + top + ' van ' + BERG.top : null,
          traagste ? 'Je traagste som: ' + traagste.som + ' in ' + BB.komma(traagste.duur / 1000) + ' s' : null,
        ],
        fouten: modus === 'versnelling' ? [] : missers,
      });
    }
  }

  // ---- werkgeheugen ----
  function rekenspan(doel, i, ctx, klaar) {
    BB.rekenspan.speel(doel, ctx.rnd, r => klaar({
      score: r.span, telt: r.telt,
      regels: [r.langste ? 'Je langste goede reeks was ' + r.langste + ' letters.' : 'Geen enkele reeks was helemaal goed.',
        'Sommen goed: ' + r.somGoed + ' van ' + r.somTotaal + '.'],
      extra: [
        r.telt ? null : el('p', { class: 'melding' }, 'Je had minder dan ' + Math.round(BB.rekenspan.GRENS * 100) + '% van de sommen goed. Dan is letters onthouden te makkelijk, dus deze score telt niet mee.'),
        el('p', { class: 'klein' }, 'Je rekenspan is het aantal letters dat je ongeveer de helft van de keren goed onthoudt terwijl je rekent. Het is geen IQ.'),
      ],
    }));
  }
  function cijferspel(doel, i, ctx, klaar) {
    const soort = richting(i);
    BB.cijfers.blok(doel, soort, ctx.rnd, BB.cijfers.BEURTEN, soort.start, false, r => klaar({
      score: r.span,
      regels: [r.langste ? 'Je langste goede reeks was ' + r.langste + ' cijfers.' : 'Geen enkele reeks was helemaal goed.'],
      extra: el('p', { class: 'klein' }, 'Je span is de lengte die je ongeveer de helft van de keren goed hebt.'),
    }));
  }

  // ---- puzzels: een klok per opgave, en het wordt steeds moeilijker ----
  // Twee vormen. Tien opgaven: het niveau loopt op van de eerste naar de laatste opgave en je score is het
  // aantal goed. Drie levens: je speelt door tot je drie fouten hebt.
  const meerkeuze = (bron, vraag) => (item, kies) => {
    const k = bron.keuzes(item, kies);
    return { el: el('div', { class: 'patroonveld' }, vraag(item), k.el), k };
  };
  // direct: een klik of toets is meteen het antwoord, zonder de knop Volgende. toetsen: welke toets bij welke knop hoort.
  const PUZZEL = {
    patronen: { max: 5, tijd: 45, maak: (rnd, n) => BB.patronen.maak(rnd, n), toon: meerkeuze(BB.patronen, BB.patronen.rooster) },
    kubussen: { max: 3, tijd: 60, maak: (rnd, n) => BB.kubussen.maak(rnd, n), toon: meerkeuze(BB.kubussen, BB.kubussen.uitslag) },
    reeksen: { max: 5, tijd: 45, maak: (rnd, n) => BB.reeksen.maak(rnd, n), typen: true },
    spiegelbeeld: { max: BB.spiegelbeeld.VAKJES.length - 1, tijd: 20, maak: (rnd, n) => BB.spiegelbeeld.maak(rnd, n), direct: true, toetsen: BB.spiegelbeeld.TOETSEN,
      toon: (item, kies) => {
        const k = BB.spiegelbeeld.keuzes(item, kies);
        return { el: el('div', { class: 'spiegelveld' }, BB.spiegelbeeld.vraag(item), el('p', { class: 'opdracht' }, 'Is de rechter figuur gedraaid of gespiegeld?'), k.el), k };
      },
      fout: item => 'De rechter figuur was ' + (item.gespiegeld ? 'gespiegeld.' : 'alleen gedraaid.') },
  };
  const opsomming = lijst => lijst.length > 1 ? lijst.slice(0, -1).join(', ') + ' en ' + lijst[lijst.length - 1] : String(lijst[0]);
  function puzzelspel(doel, p, tienOpgaven, ctx, klaar) {
    const tijden = [], gemist = [], fouten = [], reeks = tienOpgaven ? tienNiveaus(p.max) : null, tijd = puzzelTijd(p, ctx.variant === 'haast');
    let goed = 0, nr = 0, levens = LEVENS, top = 0, item = null, keuze = -1, k = null, klok = null, wacht = false;
    const balk = BB.maakBalk(), regel = kop(), veld = el('div', { class: 'puzzelveld' });
    const melding = el('p', { class: 'terugkoppeling' });
    const invoer = p.typen ? BB.getalVeld(v => antwoord(+v)) : null;
    const knop = p.typen || p.direct ? null : el('button', { class: 'knop', type: 'button', onclick: () => { if (keuze >= 0) antwoord(keuze); } }, 'Volgende');
    BB.scherm(doel, balk.el, regel.el, veld, invoer, invoer ? BB.toetsen(invoer, BB.CIJFERS) : null, knop, melding);
    const start = performance.now();
    if (p.direct) {
      BB.toets = e => { const n = p.toetsen.indexOf(e.key.toLowerCase()); if (n >= 0) antwoord(n); };
    } else if (!p.typen) {
      BB.toets = e => {
        if (e.key === 'Enter') { e.preventDefault(); if (keuze >= 0) antwoord(keuze); }
        else if (!wacht && k && e.key >= '1' && +e.key <= k.knoppen.length) k.kies(+e.key - 1);
      };
    }
    nieuw();

    function toonStand(niveau) {
      if (tienOpgaven) {
        // Hier tellen geen levens. Je ziet hoe ver je bent.
        regel.tekst.textContent = 'Opgave ' + nr + ' van ' + TIEN;
        regel.extra.textContent = goed + ' goed';
        return;
      }
      regel.tekst.textContent = goed + ' goed, niveau ' + (niveau + 1) + (ctx.runs.beste ? ', record ' + ctx.runs.beste.score : '');
      BB.leeg(regel.extra).append(hartjes(levens));
    }
    function nieuw() {
      const niveau = tienOpgaven ? reeks[nr] : Math.min(p.max, Math.floor(goed / 2));
      nr++;
      top = Math.max(top, niveau);
      wacht = false;
      keuze = -1;
      item = p.maak(ctx.rnd, niveau);
      toonStand(niveau);
      melding.textContent = '';
      melding.className = 'terugkoppeling';
      if (p.typen) {
        BB.leeg(veld).append(BB.reeksen.reeksEl(item));
        invoer.disabled = false;
        invoer.value = '';
        invoer.focus();
      } else {
        const t = p.toon(item, n => {
          if (wacht) return;
          if (p.direct) return antwoord(n);
          keuze = n;
          knop.disabled = false;
        });
        k = t.k;
        BB.leeg(veld).append(t.el);
        if (knop) knop.disabled = true;
      }
      klok = BB.klok(balk, tijd, () => antwoord(null));
    }
    function einde() {
      if (!tienOpgaven) return klaar({ score: goed, tijden, regels: ['Hoogste niveau: ' + (top + 1) + ' van ' + (p.max + 1)] });
      klaar({ score: goed, tijden, fouten,
        regels: [gemist.length ? 'Niet goed: opgave ' + opsomming(gemist) + '.' : 'Alle ' + TIEN + ' opgaven goed.'] });
    }
    function antwoord(a) { // a is null als de klok afliep
      if (wacht) return;
      wacht = true;
      klok.stop();
      if (a != null && a === (p.typen ? item.antwoord : item.juist)) {
        goed++;
        tijden.push(performance.now() - start);
        return tienOpgaven && nr >= TIEN ? einde() : nieuw();
      }
      levens--;
      gemist.push(nr);
      toonStand(item.niveau);
      // Laat het goede antwoord even zien. Daar leer je meer van dan van alleen "fout".
      if (p.typen) {
        invoer.disabled = true;
        melding.textContent = (a == null ? 'Te laat. ' : 'Niet goed. ') + 'Het was ' + item.antwoord + ': ' + item.regel + '.';
        // Een reeks is in woorden na te lezen. Bij tien opgaven staat hij straks bij je fouten.
        fouten.push('Opgave ' + nr + ': ' + item.reeks.join(', ') + ', daarna ' + item.antwoord + ' (' + item.regel + ')');
      } else {
        k.knoppen[item.juist].classList.add('juist');
        if (a != null) k.knoppen[a].classList.add('mis');
        if (knop) knop.disabled = true;
        melding.textContent = (a == null ? 'Te laat. ' : 'Niet goed. ') + (p.fout ? p.fout(item) : 'Het groene antwoord was goed.');
      }
      melding.className = 'terugkoppeling fout';
      BB.later(() => {
        if (tienOpgaven ? nr < TIEN : levens > 0) return nieuw();
        einde();
      }, p.typen ? 2800 : 2000);
    }
  }

  // ---- tempo: zoveel mogelijk goede keuzes binnen de tijd. Een fout kost een punt, dus gokken loont niet ----
  // Een taak maakt de opgaven, tekent ze en zegt welke knoppen er zijn. Een knop is [tekst, toets, antwoord].
  const KLEUR = BB.kleurwoord.KLEUREN;
  const TAAK = {
    controleren: {
      maak: (rnd, goed) => BB.controleren.maak(rnd, BB.controleren.lengteBij(goed)), toon: BB.controleren.rijen, juist: item => item.gelijk,
      knoppen: [[BB.metToets('Anders', 'F'), 'f', false], [BB.metToets('Gelijk', 'J'), 'j', true]],
      stand: goed => 'Rijen van ' + BB.controleren.lengteBij(goed) + ' cijfers',
      fout: (item, a) => item.boven + ' en ' + item.onder + ' zijn ' + (item.gelijk ? 'gelijk' : 'anders') + ' (jij koos ' + (a ? 'gelijk' : 'anders') + ')',
      slot: goed => goed ? 'De langste rij die je goed had: ' + BB.controleren.lengteBij(goed - 1) + ' cijfers' : null,
    },
    kleurwoord: {
      maak: (rnd, goed, vorige) => BB.kleurwoord.maak(rnd, vorige), toon: BB.kleurwoord.woord, juist: item => item.inkt,
      knoppen: KLEUR.map((naam, n) => [BB.metToets(naam[0].toUpperCase() + naam.slice(1), n + 1), String(n + 1), n]),
      fout: (item, a) => 'Het woord ' + KLEUR[item.woord] + ' in de kleur ' + KLEUR[item.inkt] + ' (jij koos ' + KLEUR[a] + ')',
    },
  };
  // De variant Omgekeerd van Kleurwoord: dezelfde opgaven, maar het goede antwoord is het woord.
  TAAK.omgekeerd = Object.assign({}, TAAK.kleurwoord, { juist: item => item.woord });
  function tempospel(doel, taak, seconden, ctx, klaar) {
    const tijden = [], fouten = [], veel = taak.knoppen.length > 2;
    let goed = 0, fout = 0, af = false, huidig = null;
    const balk = BB.maakBalk(), regel = kop(), veld = el('div', { class: 'puzzelveld' }), stand = el('p', { class: 'stand' }, ctx.spookRegel || null);
    // Bij twee knoppen is de rechter de gekleurde, net als bij Ja en Nee in de IQ-test. Bij vier knoppen zijn ze gelijk.
    const knoppen = el('div', { class: 'janee' + (veel ? ' vier' : '') }, taak.knoppen.map((kn, n) =>
      el('button', { class: 'knop' + (veel || n === 0 ? ' stil' : ''), type: 'button', onclick: () => antwoord(kn[2]) }, kn[0])));
    BB.scherm(doel, balk.el, regel.el, veld, knoppen, stand);
    const start = performance.now(), klok = BB.klok(balk, seconden, einde);
    // Ingedrukt houden telt niet: BB.toets krijgt alleen de eerste aanslag.
    BB.toets = e => { const kn = taak.knoppen.find(x => x[1] === e.key.toLowerCase()); if (kn) antwoord(kn[2]); };
    nieuw();

    function nieuw(flits) {
      huidig = taak.maak(ctx.rnd, goed, huidig);
      const beeld = taak.toon(huidig);
      if (flits) beeld.classList.add('flits-' + flits); // de nieuwe kaart laat zien hoe het vorige antwoord was
      BB.leeg(veld).append(beeld);
      regel.tekst.textContent = punten(Math.max(0, goed - fout));
      regel.extra.textContent = taak.stand ? taak.stand(goed) : goed + ' goed, ' + fout + ' fout';
    }
    function antwoord(a) {
      if (af) return;
      const juist = a === taak.juist(huidig);
      if (juist) { goed++; tijden.push(performance.now() - start); } else { fout++; fouten.push(taak.fout(huidig, a)); }
      nieuw(juist ? 'goed' : 'fout');
    }
    function einde() {
      if (af) return;
      af = true;
      klok.stop();
      klaar({ score: Math.max(0, goed - fout), tijden, fouten,
        regels: [goed + ' goed en ' + fout + ' fout', taak.slot ? taak.slot(goed) : null] });
    }
  }

  // ---- getallen tikken: de klok loopt tot het laatste getal is gevonden ----
  function tikspel(doel, n, ctx, klaar) {
    const getallen = BB.tikken.maakVeld(ctx.rnd, n), tijden = [], laatste = n * n, stap = ctx.variant === 'achteruit' ? -1 : 1;
    let volgende = stap > 0 ? 1 : laatste, mis = 0, af = false, vorige = 0, traagste = null;
    const balk = BB.maakBalk(), regel = kop(), stand = el('p', { class: 'stand' }, ctx.spookRegel || null);
    const bord = BB.tikken.veld(getallen, n, tik);
    balk.el.classList.add('alleen-tijd');
    BB.scherm(doel, balk.el, regel.el, bord.el, stand);
    const start = performance.now(), nu = () => performance.now() - start;
    const ticker = setInterval(toon, 100);
    BB.opruim.push(() => clearInterval(ticker));
    toon();

    function toon() {
      balk.tekst.textContent = BB.komma(BB.tikken.score(nu(), mis) / 1000) + ' s';
      regel.tekst.textContent = 'Zoek ' + volgende;
      regel.extra.textContent = mis ? mis + ' keer mis, ' + (mis * BB.tikken.STRAF / 1000) + ' s erbij' : '';
    }
    function tik(g, knop) {
      if (af) return;
      if (g !== volgende) {
        mis++;
        knop.classList.remove('mis');
        void knop.offsetWidth; // herstart de animatie
        knop.classList.add('mis');
        return toon();
      }
      const t = nu();
      tijden.push(t);
      if (!traagste || t - vorige > traagste.duur) traagste = { getal: g, duur: t - vorige };
      vorige = t;
      // Een gevonden getal doet niet meer mee. Er nog eens op tikken kost dus ook geen straf.
      knop.classList.remove('mis');
      knop.classList.add('gevonden');
      knop.disabled = true;
      volgende += stap;
      if (volgende >= 1 && volgende <= laatste) return toon();
      af = true;
      clearInterval(ticker);
      klaar({
        score: BB.tikken.score(t, mis), tijden,
        regels: [mis ? mis + ' keer mis getikt (' + (mis * BB.tikken.STRAF / 1000) + (mis === 1 ? ' seconde' : ' seconden') + ' straftijd)' : 'Geen enkele keer mis getikt.',
          'Het langst zocht je naar ' + traagste.getal + ': ' + BB.komma(traagste.duur / 1000) + ' s'],
      });
    }
  }

  // ---- uitslag: de kaart draait om. Eerst jezelf, dan pas de lijst ----
  function telOp(knoop, eind, toon) { // het hoofdgetal telt kort op
    const begin = performance.now(), duur = 500;
    (function stap() {
      const deel = Math.min(1, (performance.now() - begin) / duur);
      const fijn = Number.isInteger(eind) ? 1 : 10; // hele scores tellen in hele stappen op
      knoop.textContent = toon(deel < 1 ? Math.round(eind * deel * fijn) / fijn : eind);
      if (deel < 1) requestAnimationFrame(stap);
    })();
  }
  function uitslag(doel, spel, i, k, runs, res, dag) {
    document.body.classList.remove('bezig');
    const telt = res.telt !== false, vorige = runs.vorige, beste = runs.beste, doelen = spel.medailles(i);
    const record = telt && (!beste || beter(spel, res.score, beste.score));
    const m = telt ? medaille(spel, i, res.score) : 0;
    let top = lijst(k), plek = 0, st = null, laatste = runs.laatste || [], hoogste = runs.rang == null ? -1 : runs.rang, nieuweRang = false, beloning = null;
    if (telt) {
      const run = { score: res.score, datum: new Date().toISOString(), tijden: res.tijden || null };
      // De rang volgt het gemiddelde van je laatste runs. Je hoogste rang blijft staan.
      laatste = laatste.concat(res.score).slice(-V.RUNS_IN_GEMIDDELDE);
      st = V.stand(laatste, doelen, spel.lager);
      if (st && st.nu > hoogste) { hoogste = st.nu; nieuweRang = true; }
      const alle = BB.opslag.lees('runs', {});
      alle[k] = { vorige: run, beste: record ? run : beste, laatste, rang: hoogste };
      BB.opslag.schrijf('runs', alle);
      ({ top, plek } = bewaar(spel, k, res.score));
      beloning = B.naRonde({ spel: spel.id, groep: spel.groep, medaille: m, record: record && !!beste, dag: dag || null });
      if (dag) {
        const gedaan = BB.opslag.lees('dagkaart', {});
        if (!gedaan[dag]) { gedaan[dag] = { spel: spel.id, score: res.score, m }; BB.opslag.schrijf('dagkaart', gedaan); }
      }
    }
    // De eerste regel is de vergelijking met jezelf. Die staat groot op de kaart.
    const hoofd = !telt ? 'Deze run telt niet mee.'
      : !vorige ? 'Je eerste run. Vanaf nu race je hiertegen.'
        : res.score === vorige.score ? 'Precies gelijk aan je vorige run'
          : spel.verschil(res.score - vorige.score) + ' dan je vorige run';
    const feiten = [];
    if (telt && beste) {
      feiten.push(record ? 'Je oude record was ' + spel.toon(beste.score) + '.'
        : res.score === beste.score ? 'Gelijk aan je record.' : 'Je record is ' + spel.toon(beste.score) + '.');
    }
    if (st) feiten.push('Rang ' + rangNaam(hoogste) + (st.nu < hoogste ? ', je vorm nu is ' + rangNaam(st.nu) : '') + '. Gemiddelde van je laatste ' + laatste.length + ' runs: ' + maat(spel, st.gemiddelde) + '.');
    else if (telt) feiten.push('Nog ' + (V.RUNS_VOOR_RANG - laatste.length) + (V.RUNS_VOOR_RANG - laatste.length === 1 ? ' run' : ' runs') + ' tot je eerste rang.');
    if (plek) feiten.push('Plek ' + plek + ' in de top 10 op dit apparaat.');
    // "Net niet" alleen als het letterlijk klopt en het verschil klein is.
    let volgende = null;
    if (telt && m < 3) {
      const gat = Math.abs(doelen[m] - res.score), dichtbij = gat <= (spel.bijna || (spel.lager ? 3000 : span(spel) ? 0.3 : 1));
      const gatTekst = spel.lager ? BB.komma(gat / 1000) + ' s' : span(spel) ? BB.komma(gat) : spel.eenheid ? punten(gat) : gat + ' goed';
      volgende = dichtbij ? el('p', null, 'Net niet. Nog ', el('b', null, gatTekst), ' tot ' + MEDAILLE[m + 1].toLowerCase() + '.')
        : el('p', null, MEDAILLE[m + 1] + ' bij ', el('b', null, maat(spel, doelen[m])));
    }
    // Een lange score, zoals "140 punten", krijgt een kleinere letter. Anders breekt hij over twee regels.
    const getal = el('div', { class: 'uitslag-getal' + (spel.toon(res.score).length > 7 ? ' lang' : '') }, spel.toon(res.score));
    const opnieuw = () => aftellen(doel, spel);
    // Een spel van de dagkaart kan nog op slot zitten. Dan kun je het hierna niet nog een keer spelen.
    const dicht = !B.spelOpen(spel.id), variant = variantVan(spel.id, i);
    const s = BB.scherm(doel,
      el('div', { class: 'uitslagkaart' + (record && beste ? ' record' : '') },
        el('p', { class: 'uitslag-kop' }, (dag ? 'Dagkaart van ' + V.kortDatum(dag) + ', ' : '') + spel.naam + ', ' + spel.bij(i) + (variant ? ', variant ' + VARIANT[variant].naam.toLowerCase() : '')),
        el('div', { class: 'labels' },
          beloning && beloning.zonder.level > beloning.levelVoor ? el('span', { class: 'label level' }, 'Level ' + beloning.zonder.level + ' gehaald') : null,
          record && beste ? el('span', { class: 'label' }, 'Nieuw record') : null,
          nieuweRang ? el('span', { class: 'label rang' }, (runs.rang >= 0 ? 'Nieuwe rang: ' : 'Je eerste rang: ') + rangNaam(hoogste)) : null),
        getal,
        el('p', { class: 'uitslag-hoofd' }, hoofd),
        el('ul', { class: 'feiten' }, feiten.concat(res.regels || []).filter(Boolean).map(f => el('li', null, f)))),
      el('div', { class: 'uitslag-zij' },
        m ? BB.kaart.fiche(m, MEDAILLE[m]) : el('span', { class: 'fiche leeg' }, 'Nog geen medaille'),
        volgende,
        // Stoppen is net zo'n goede keuze als doorgaan. Daarom zijn de twee knoppen even groot.
        el('div', { class: 'knoppen hoofdknoppen' },
          dicht ? null : el('button', { class: 'knop groot', type: 'button', onclick: opnieuw }, 'Nog een keer'),
          el('button', { class: 'knop groot stil', type: 'button', onclick: () => naarStart(doel) }, 'Klaar voor nu')),
        dicht ? el('p', { class: 'klein' }, spel.naam + ' zit nog op slot. Buiten de dagkaart gaat het open op level ' + B.levelVoor('spel', spel.id) + '.') : null,
        el('div', { class: 'knoppen' },
          dicht ? null : el('button', { class: 'tekstknop', type: 'button', onclick: () => ga(doel, 'spel-' + spel.id) }, 'Instellingen'),
          dag && telt ? el('button', { class: 'tekstknop', type: 'button', onclick: e => deel(e.target, dag, spel, { score: res.score, m }) }, 'Deel je dagkaart') : null)),
      el('div', { class: 'uitslag-onder' },
        beloning ? B.beloningBlok(beloning) : null,
        res.fouten && res.fouten.length ? el('details', { class: 'hoe' }, el('summary', null, 'Bekijk je fouten (' + res.fouten.length + ')'),
          el('ul', { class: 'lijst' }, res.fouten.slice(0, 12).map(f => el('li', null, f)))) : null,
        res.extra,
        el('h3', null, 'Records op dit apparaat'),
        tabel(spel, top, plek, true)));
    // Wie nog op de toetsen tikt als de tijd om is, mag niet per ongeluk "Nog een keer" of "Klaar voor nu" raken.
    // Daarom doen de knoppen het eerste moment niets.
    s.classList.add('eind', 'wacht');
    BB.later(() => s.classList.remove('wacht'), 600);
    telOp(getal, res.score, spel.toon);
    if (!dicht) BB.opEnter(opnieuw);
  }

  // De recordpagina toont elke lijst die er is, met in woorden bij welke instellingen hij hoort.
  // De lengte van de ronde staat achteraan in de sleutel. Staat er niets, dan is het de kale keuze.
  // Geeft de plek van die keuze in het rijtje, of -1 als het spel geen keuze heeft.
  function rondeUit(spel, k) {
    const ronde = RONDE[spel.id], deel = zonderVariant(k).slice(spel.id.length + 1).split('|')[spel.rekenen ? 2 : 0];
    if (!ronde) return -1;
    const plek = ronde.keuzes.findIndex(kz => String(kz[0]) === deel);
    return plek >= 0 ? plek : ronde.keuzes.findIndex(kz => kz[0] === ronde.kaal);
  }
  function instellingTekst(spel, k) {
    const rest = zonderVariant(k).slice(spel.id.length + 1).split('|'), delen = [], ronde = RONDE[spel.id];
    const soorten = ops => 'sommen met ' + ops.split('').map(o => WOORD[o]).join(', ');
    if (ronde) delen.push(ronde.bij(ronde.keuzes[rondeUit(spel, k)][0]));
    if (spel.rekenen === true) delen.push('niveau ' + NIVEAUS[+rest[0]].toLowerCase());
    if (spel.rekenen) delen.push(soorten(rest[1]));
    if (spel.kiesRichting) delen.push('volgorde: ' + BB.cijfers.SOORTEN.find(x => x.id === rest[0]).naam.toLowerCase());
    if (variantUit(k)) delen.push('variant ' + VARIANT[variantUit(k)].naam.toLowerCase());
    const tekst = delen.join(', ');
    return tekst ? tekst[0].toUpperCase() + tekst.slice(1) : '';
  }
  function ranglijst(doel) {
    delete document.body.dataset.spel;
    const alles = BB.opslag.lees('records', {}), blokken = [];
    for (const spel of SPELLEN) {
      // Per spel staan de lijsten in de volgorde van de keuzes: eerst de kortste ronde.
      const sleutels = Object.keys(alles).filter(k => k.startsWith(spel.id + '|') && alles[k].length);
      for (const k of sleutels.sort((a, b) => rondeUit(spel, a) - rondeUit(spel, b))) blokken.push({ spel, k });
    }
    const leeg = SPELLEN.filter(sp => !blokken.some(b => b.spel === sp)).map(sp => sp.naam);
    const s = BB.scherm(doel,
      el('h1', null, 'Records'),
      el('p', { class: 'intro' }, 'De tien beste scores per spel die op dit apparaat zijn gehaald.'),
      el('p', { class: 'klein' }, 'Alleen wie deze computer of telefoon gebruikt, ziet deze lijsten. Spelen jullie met meer mensen op een apparaat, vul dan voor de start ieder je eigen naam in.'),
      blokken.length
        ? el('div', { class: 'lijsten' }, blokken.map(b => el('article', { class: 'lijstkaart k-' + b.spel.id },
          el('h3', null, b.spel.naam), el('p', { class: 'klein' }, instellingTekst(b.spel, b.k)), tabel(b.spel, alles[b.k], 0, true))))
        : el('p', null, 'Er zijn nog geen scores. Speel een spel, dan staat je score hier.'),
      blokken.length && leeg.length ? el('p', { class: 'klein' }, 'Nog niet gespeeld: ' + leeg.join(', ') + '.') : null,
      // Op een telefoon staat Spelen al in het menu onderaan.
      el('a', { class: 'knop alleen-breed', href: '#start' }, 'Naar de kaarten'));
    s.classList.add('breed');
  }

  // De regels en de teksten gaan mee naar buiten voor test/controle.js.
  return { menu, open, ranglijst, SPELLEN, GROEPEN, RONDE, VARIANT, variantBij, variantVan, sleutel, instellingTekst, rondeUit, tekstVan,
    regels: { versnelTijd, BERG, bergNiveau, bergStap, tienNiveaus, puzzelTijd, PUZZEL, TAAK, TIEN, BLIND_MS } };
})();
