// Controle van de opgavenmakers en de score. Draai met: node test/controle.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const map = path.join(__dirname, '..', 'js');
for (const f of ['basis.js', 'normen.js', 'taken/patronen.js', 'taken/cijferreeksen.js', 'taken/onthouden.js',
  'taken/sommen.js', 'taken/symbolen.js', 'taken/rekenspan.js', 'taken/kubussen.js', 'taken/controleren.js',
  'taken/spiegelbeeld.js', 'taken/tikken.js', 'taken/kleurwoord.js', 'kaarten.js', 'voortgang.js', 'iqtest.js', 'oefenhal.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(map, f), 'utf8'), { filename: f });
}

let fouten = 0;
function eis(ok, tekst) { if (!ok) { fouten++; console.log('FOUT: ' + tekst); } }
const heel = x => Number.isInteger(x);

for (const vorm of 'ABCDEFGH') {
  const patronen = BB.patronen.maakSet(vorm);
  eis(patronen.length === 12, vorm + ' patronen: 12 opgaven');
  patronen.forEach((item, n) => {
    const waar = vorm + ' patroon ' + (n + 1);
    eis(item.cellen.length === 8, waar + ': 8 vakjes');
    eis(item.opties.length === 6, waar + ': 6 antwoorden, kreeg ' + item.opties.length);
    eis(new Set(item.opties.map(o => JSON.stringify(o))).size === item.opties.length, waar + ': antwoorden verschillen');
    eis(item.juist >= 0 && item.juist < item.opties.length, waar + ': goed antwoord zit erbij');
    eis(item.opties.every(o => o.vorm || o.lijnen || o.punten), waar + ': geen leeg antwoord');
    eis(BB.patronen.svg(item.opties[0]).includes('<svg'), waar + ': tekent');
  });

  const reeksen = BB.reeksen.maakSet(vorm);
  eis(reeksen.length === 12, vorm + ' reeksen: 12 opgaven');
  reeksen.forEach((r, n) => {
    eis(heel(r.antwoord) && r.reeks.every(heel), vorm + ' reeks ' + (n + 1) + ': hele getallen');
    eis(r.antwoord > 0 && r.reeks.every(g => g > 0), vorm + ' reeks ' + (n + 1) + ': positief ' + r.reeks + ' -> ' + r.antwoord);
  });

  const sommen = BB.sommen.maakTest(vorm);
  eis(sommen.length === 60, vorm + ' sommen: 60 opgaven');
  sommen.forEach(s => eis(heel(s.antwoord) && s.antwoord >= 0, vorm + ' som ' + s.tekst + ' = ' + s.antwoord));

  const rnd = BB.maakRng('symbolen-' + vorm);
  let ja = 0;
  for (let n = 0; n < 200; n++) {
    const b = BB.symbolen.maakBeurt(rnd);
    eis(b.zoek.some(t => b.doelen.includes(t)) === b.aanwezig, vorm + ' symbolen: antwoord klopt');
    eis(b.doelen.length === 2 && b.zoek.length === 5, vorm + ' symbolen: 2 en 5');
    ja += b.aanwezig;
  }
  eis(ja > 70 && ja < 130, vorm + ' symbolen: ongeveer de helft ja (' + ja + ')');
}

// Oefenhal: elke bewerking op elk niveau geeft een hele, niet-negatieve uitkomst.
for (let niveau = 0; niveau < 3; niveau++) {
  for (const op of ['+', '−', '×', '÷']) {
    for (let n = 0; n < 300; n++) {
      const s = BB.sommen.maak(Math.random, niveau, [op]);
      eis(heel(s.antwoord) && s.antwoord >= 0 && s.tekst.includes(op), 'oefensom ' + s.tekst + ' = ' + s.antwoord);
    }
  }
}

// Rekenspan: sommen met een hele uitkomst van 1 of meer.
for (let n = 0; n < 500; n++) {
  const s = BB.rekenspan.maakSom(Math.random);
  eis(heel(s.antwoord) && s.antwoord >= 1, 'rekenspan ' + s.tekst + ' = ' + s.antwoord);
}

// Kubussen: precies 11 geldige uitslagen, en bij elke opgave klopt precies een antwoord.
const gezien = new Set();
for (const u of BB.kubussen.UITSLAGEN) {
  const n = BB.kubussen.vouw(u);
  eis(new Set(n.map(v => v.join())).size === 6, 'uitslag vouwt tot een kubus: ' + JSON.stringify(u));
  gezien.add(JSON.stringify(u));
}
eis(BB.kubussen.UITSLAGEN.length === 11 && gezien.size === 11, 'elf verschillende uitslagen');
// Ijkpunt: bij het kruis ligt het bovenste vakje boven, het middelste links (voor) en het rechtervakje rechts.
{
  const kruis = [[1, 1], [1, 0], [2, 1], [0, 1], [1, 2], [1, 3]], n = BB.kubussen.vouw(kruis);
  eis(n[0].join() === '0,0,1' && n[1].join() === '0,1,0' && n[2].join() === '1,0,0' && n[3].join() === '-1,0,0' && n[4].join() === '0,-1,0' && n[5].join() === '0,0,-1', 'kruis vouwt zoals verwacht: ' + JSON.stringify(n));
}
for (let niveau = 0; niveau < 4; niveau++) {
  for (let n = 0; n < 300; n++) {
    const item = BB.kubussen.maak(Math.random, niveau);
    const goed = item.opties.map(o => BB.kubussen.klopt(item, o));
    eis(item.opties.length === 4 && goed.filter(Boolean).length === 1 && goed[item.juist], 'kubus niveau ' + niveau + ': precies een goed antwoord');
    eis(new Set(item.opties.map(o => o.join())).size === 4, 'kubus: vier verschillende antwoorden');
  }
}

// Patronen: de raadtest mag het goede antwoord niet kunnen aanwijzen. Oefenhal-opgaven per niveau kloppen.
let raadbaar = 0, totaal = 0;
for (const vorm of 'ABCDEFGH') for (const item of BB.patronen.maakSet(vorm)) { totaal++; if (BB.patronen.raadbaar(item.opties, item.juist)) raadbaar++; }
console.log('Patronen te raden uit de antwoorden alleen: ' + raadbaar + ' van ' + totaal);
eis(raadbaar <= totaal * 0.1, 'hooguit 10% van de patronen is te raden uit de antwoorden');
for (let niveau = 0; niveau < 6; niveau++) {
  for (let n = 0; n < 50; n++) {
    const p = BB.patronen.maak(Math.random, niveau), r = BB.reeksen.maak(Math.random, niveau);
    eis(p.niveau === niveau && p.opties.length === 6 && p.juist >= 0, 'los patroon niveau ' + niveau);
    eis(r.niveau === niveau && heel(r.antwoord) && r.antwoord > 0, 'losse reeks niveau ' + niveau);
  }
}
// Korte testversies: de gekozen opgaven bestaan en geven een schatting.
for (const v of [[[2, 5, 6, 8, 11], [3, 5, 6, 9]], [[0, 3, 4, 6, 7, 9, 10], [1, 2, 4, 7, 8, 9, 11]]]) {
  const p = BB.patronen.maakSet('A-5', v[0]), r = BB.reeksen.maakSet('A-5', v[1]);
  eis(p.length === v[0].length && r.length === v[1].length, 'korte versie heeft het goede aantal opgaven');
  const vp2 = BB.iq.verwacht(p.map(x => x.niveau), 'patronen'), vr2 = BB.iq.verwacht(r.map(x => x.niveau), 'reeksen');
  const mid = BB.iq.bereken({ patronen: { goed: vp2.gem, niveaus: p.map(x => x.niveau) }, reeksen: { goed: vr2.gem, niveaus: r.map(x => x.niveau) } });
  eis(mid.iq === 100, 'korte versie: gemiddelde scores geven 100, kreeg ' + mid.iq);
  const top = BB.iq.bereken({ patronen: { goed: p.length, niveaus: p.map(x => x.niveau) }, reeksen: { goed: r.length, niveaus: r.map(x => x.niveau) } });
  console.log('Korte versie met ' + (p.length + r.length) + ' opgaven: alles goed geeft ' + top.iq + ', verwacht ' + vp2.gem.toFixed(1) + ' + ' + vr2.gem.toFixed(1) + ' goed');
}

// Rang: Acht is brons, Tien is zilver, Vrouw is goud. Werkt voor tijden (lager is beter) en aantallen.
{
  const V = BB.voortgang, tijd = [180000, 90000, 60000], aantal = [5, 15, 25];
  eis(V.rangVan(200000, tijd, true) === 0 && V.rangVan(180000, tijd, true) === 1 && V.rangVan(90000, tijd, true) === 3 && V.rangVan(60000, tijd, true) === 5 && V.rangVan(30000, tijd, true) === 7, 'rang bij tijden');
  eis(V.rangVan(4, aantal, false) === 0 && V.rangVan(5, aantal, false) === 1 && V.rangVan(15, aantal, false) === 3 && V.rangVan(25, aantal, false) === 5 && V.rangVan(35, aantal, false) === 7, 'rang bij aantallen');
  eis(V.stand([10, 12], aantal, false) === null && V.stand([10, 12, 14], aantal, false).nu === 2, 'eerste rang na drie runs');
  eis(V.dagSpel('2026-10-06', 8) === V.dagSpel('2026-10-06', 8) && V.dagSpel('2026-10-06', 8) >= 0 && V.dagSpel('2026-10-06', 8) < 8, 'dagkaart volgt vast uit de datum');
}

// Reeks: dagen op rij, met reservedagen die een gemiste dag opvangen.
{
  const V = BB.voortgang;
  let r = {};
  for (const dag of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) r = V.reeksNa(r, dag).reeks;
  eis(r.lengte === 4 && r.reserve === 0, 'vier dagen op rij');
  const vijf = V.reeksNa(r, '2026-10-05');
  eis(vijf.reeks.lengte === 5 && vijf.reeks.reserve === 1 && vijf.uit.verdiend, 'de vijfde dag levert een reservedag op');
  eis(V.reeksNa(vijf.reeks, '2026-10-05').uit.verlengd === false, 'twee keer spelen op een dag telt een keer');
  const metGat = V.reeksNa(vijf.reeks, '2026-10-07');
  eis(metGat.reeks.lengte === 6 && metGat.reeks.reserve === 0 && metGat.uit.ingezet === 1, 'een reservedag vangt een gemiste dag op');
  const gebroken = V.reeksNa(metGat.reeks, '2026-10-10');
  eis(gebroken.reeks.lengte === 1 && gebroken.uit.gebroken === 6 && gebroken.reeks.beste === 6, 'zonder reservedag begint de reeks opnieuw en blijft de langste staan');
  eis(V.reeksNu(vijf.reeks, '2026-10-05').status === 'gedaan' && V.reeksNu(vijf.reeks, '2026-10-06').status === 'open' &&
    V.reeksNu(vijf.reeks, '2026-10-07').status === 'open' && V.reeksNu(vijf.reeks, '2026-10-08').status === 'voorbij', 'de stand van de reeks per dag');
  eis(V.levelVan(0) === 1 && V.levelVan(49) === 1 && V.levelVan(50) === 2 && V.levelVan(150) === 3 && V.levelVan(299) === 3 && V.levelVan(300) === 4, 'levels bij 0, 50, 150 en 300 punten');
  const s = V.levelStand(120);
  eis(s.level === 2 && s.binnen === 70 && s.nodig === 100, 'voortgang binnen een level');
}

// ---- de nieuwe spellen en de keuze voor de lengte van een ronde ----
const O = BB.oefenhal, REGELS = O.regels;
const standaard = () => ({ niveau: 1, ops: ['+', '−', '×', '÷'], spook: 'vorige', richting: 'vooruit', ronde: {} });
const met = (id, keuze) => Object.assign(standaard(), { ronde: { [id]: keuze } });
const spelVan = id => O.SPELLEN.find(s => s.id === id);

// Controleren: de twee rijen kloppen met het antwoord, en bij "anders" verschilt precies een cijfer.
{
  const r = BB.maakRng('controleren');
  let gelijk = 0, n = 0;
  for (let lengte = BB.controleren.START; lengte <= BB.controleren.MAX; lengte++) {
    for (let k = 0; k < 400; k++, n++) {
      const item = BB.controleren.maak(r, lengte), anders = item.boven.split('').filter((c, p) => c !== item.onder[p]).length;
      eis(item.boven.length === lengte && item.onder.length === lengte && /^\d+$/.test(item.boven + item.onder), 'controleren: twee rijen van ' + lengte + ' cijfers');
      eis((item.boven === item.onder) === item.gelijk, 'controleren: het antwoord klopt bij ' + item.boven + ' en ' + item.onder);
      eis(anders === (item.gelijk ? 0 : 1), 'controleren: precies een cijfer anders, kreeg ' + anders);
      eis(item.gelijk ? item.plek === -1 : item.boven[item.plek] !== item.onder[item.plek], 'controleren: de plek van het verschil klopt');
      eis(REGELS.TAAK.controleren.juist(item) === (item.boven === item.onder), 'controleren: het spel rekent gelijk goed als de rijen gelijk zijn');
      gelijk += item.gelijk;
    }
  }
  eis(gelijk > n * 0.45 && gelijk < n * 0.55, 'controleren: ongeveer de helft gelijk (' + gelijk + ' van ' + n + ')');
  const L = BB.controleren.lengteBij;
  eis(L(0) === 6 && L(2) === 6 && L(3) === 7 && L(17) === 11 && L(18) === 12 && L(500) === 12, 'controleren: rijen groeien van 6 naar 12 cijfers');
  for (let g = 0; g < 60; g++) eis(L(g + 1) >= L(g) && L(g + 1) - L(g) <= 1, 'controleren: de rij groeit met hooguit een cijfer tegelijk');
  eis(REGELS.TAAK.controleren.knoppen.map(k => k[1] + ':' + k[2]).join() === 'f:false,j:true', 'controleren: F is anders en J is gelijk');
}

// Spiegelbeeld: eigen draai- en spiegelfuncties, los van het spel, zodat de test het spel echt narekent.
{
  const draai = c => c.map(p => [-p[1], p[0]]), spiegel = c => c.map(p => [-p[0], p[1]]);
  const code = c => {
    const x0 = Math.min(...c.map(p => p[0])), y0 = Math.min(...c.map(p => p[1]));
    return c.map(p => (p[0] - x0) + ',' + (p[1] - y0)).sort().join(' ');
  };
  const standen = c => [c, draai(c), draai(draai(c)), draai(draai(draai(c)))].map(code);
  const aaneen = c => { // elk vakje is vanaf het eerste te bereiken
    const alle = new Set(c.map(p => p.join())), gezien = new Set([c[0].join()]), rij = [c[0]];
    while (rij.length) {
      const p = rij.pop();
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = [p[0] + d[0], p[1] + d[1]];
        if (alle.has(q.join()) && !gezien.has(q.join())) { gezien.add(q.join()); rij.push(q); }
      }
    }
    return gezien.size === c.length;
  };
  const r = BB.maakRng('spiegelbeeld');
  let gespiegeld = 0, n = 0;
  for (let niveau = 0; niveau < BB.spiegelbeeld.VAKJES.length; niveau++) {
    const vormen = new Set();
    for (let k = 0; k < 400; k++, n++) {
      const item = BB.spiegelbeeld.maak(r, niveau), waar = 'spiegelbeeld niveau ' + niveau;
      const links = standen(item.links), omgekeerd = standen(spiegel(item.links)), rechts = code(item.rechts);
      eis(item.niveau === niveau && item.links.length === BB.spiegelbeeld.VAKJES[niveau] && item.rechts.length === item.links.length, waar + ': het aantal vakjes klopt');
      eis(new Set(item.links.map(p => p.join())).size === item.links.length && aaneen(item.links), waar + ': een figuur uit een stuk zonder dubbele vakjes');
      eis([item.links, item.rechts].every(c => c.every(p => p[0] >= 0 && p[0] < 5 && p[1] >= 0 && p[1] < 5)), waar + ': past in een rooster van 5 bij 5');
      eis(omgekeerd.every(s => !links.includes(s)), waar + ': het spiegelbeeld is met geen enkele draaiing gelijk aan de figuur');
      eis(item.gespiegeld ? omgekeerd.slice(1).includes(rechts) && !links.includes(rechts) : links.slice(1).includes(rechts), waar + ': rechts is ' + (item.gespiegeld ? 'gespiegeld' : 'gedraaid'));
      eis(item.juist === (item.gespiegeld ? 0 : 1) && BB.spiegelbeeld.soort(item.links, item.rechts) === (item.gespiegeld ? 'gespiegeld' : 'gedraaid'), waar + ': het goede antwoord klopt');
      gespiegeld += item.gespiegeld;
      vormen.add(links.slice().sort()[0]);
    }
    eis(vormen.size >= 2, 'spiegelbeeld niveau ' + niveau + ': meer dan een figuur (' + vormen.size + ')');
  }
  eis(gespiegeld > n * 0.45 && gespiegeld < n * 0.55, 'spiegelbeeld: ongeveer de helft gespiegeld (' + gespiegeld + ' van ' + n + ')');
  eis(!BB.spiegelbeeld.echtAnders([[0, 0], [1, 0], [2, 0], [3, 0]]) && !BB.spiegelbeeld.echtAnders([[0, 0], [1, 0], [2, 0], [1, 1]]) &&
    BB.spiegelbeeld.echtAnders([[0, 0], [0, 1], [0, 2], [1, 2]]), 'spiegelbeeld: een balk en een T vallen af, een L mag');
  eis(BB.spiegelbeeld.TOETSEN.join() === 'f,j', 'spiegelbeeld: F is gespiegeld (knop 0) en J is gedraaid (knop 1)');
}

// Getallen tikken: het veld bevat elk getal precies een keer, en een misser kost een seconde.
for (const n of BB.tikken.MATEN) {
  const r = BB.maakRng('tikken-' + n);
  let geschud = 0;
  for (let k = 0; k < 200; k++) {
    const veld = BB.tikken.maakVeld(r, n);
    eis(veld.length === n * n && veld.slice().sort((a, b) => a - b).every((g, p) => g === p + 1), 'tikken ' + n + ' bij ' + n + ': elk getal van 1 tot ' + n * n + ' precies een keer');
    if (veld.some((g, p) => g !== p + 1)) geschud++;
  }
  eis(geschud >= 199, 'tikken ' + n + ' bij ' + n + ': het veld is geschud');
}
eis(BB.tikken.MATEN.join() === '3,4,5' && BB.tikken.score(12345.4, 0) === 12345 && BB.tikken.score(12000, 2) === 14000, 'tikken: de score is de tijd plus een seconde per misser');

// Kleurwoord: het goede antwoord is de kleur van de letters, en die is meestal anders dan het woord.
{
  const r = BB.maakRng('kleurwoord'), K = BB.kleurwoord.KLEUREN, taak = REGELS.TAAK.kleurwoord, perInkt = [0, 0, 0, 0];
  let vorige = null, anders = 0;
  const N = 4000;
  for (let k = 0; k < N; k++) {
    const item = BB.kleurwoord.maak(r, vorige);
    eis([item.woord, item.inkt].every(x => heel(x) && x >= 0 && x < K.length), 'kleurwoord: woord en inkt zijn een van de vier kleuren');
    eis(taak.juist(item) === item.inkt, 'kleurwoord: het goede antwoord is de inkt');
    eis(!vorige || vorige.woord !== item.woord || vorige.inkt !== item.inkt, 'kleurwoord: nooit twee keer hetzelfde achter elkaar');
    anders += item.woord !== item.inkt;
    perInkt[item.inkt]++;
    vorige = item;
  }
  eis(anders > N * 0.7 && anders < N * 0.8, 'kleurwoord: ongeveer driekwart botst (' + anders + ' van ' + N + ')');
  eis(perInkt.every(a => a > N * 0.2 && a < N * 0.3), 'kleurwoord: elke kleur inkt komt even vaak voor (' + perInkt + ')');
  eis(K.join() === 'rood,blauw,groen,geel' && taak.knoppen.every((kn, p) => kn[1] === String(p + 1) && kn[2] === p && kn[0].toLowerCase().startsWith(K[p])),
    'kleurwoord: toets 1 tot en met 4 kiest rood, blauw, groen en geel');
}

// Versnelling: de klok begint op 8 seconden, wordt elke keer 5 procent korter en stopt bij 1,5 seconde.
{
  const T = REGELS.versnelTijd;
  eis(T(0) === 8 && Math.abs(T(1) - 7.6) < 1e-9 && Math.abs(T(10) - 8 * Math.pow(0.95, 10)) < 1e-9, 'versnelling: 8 seconden en dan steeds 5 procent minder');
  for (let g = 0; g < 80; g++) {
    eis(T(g) >= 1.5 && T(g + 1) <= T(g), 'versnelling: de klok wordt nooit langer en nooit korter dan 1,5 seconde (som ' + g + ')');
    if (T(g + 1) > 1.5) eis(Math.abs(T(g + 1) / T(g) - 0.95) < 1e-9, 'versnelling: stap van 5 procent bij som ' + g);
  }
  eis(T(32) > 1.5 && T(33) === 1.5 && T(500) === 1.5, 'versnelling: de bodem van 1,5 seconde is er na 33 goede antwoorden');
}

// Bergop: snel goed is twee omhoog, langzamer goed een omhoog, fout twee omlaag, altijd tussen 1 en 20.
{
  const S = REGELS.bergStap, B = REGELS.bergNiveau, top = REGELS.BERG.top;
  eis(top === 20 && REGELS.BERG.tijd === 90, 'bergop: 20 niveaus en 90 seconden');
  eis(S(1, true, true) === 3 && S(1, true, false) === 2 && S(5, false) === 3 && S(1, false) === 1 && S(2, false) === 1, 'bergop: stappen omhoog en omlaag');
  eis(S(19, true, true) === 20 && S(20, true, true) === 20 && S(20, true, false) === 20 && S(20, false) === 18, 'bergop: niet hoger dan 20');
  for (let t = 1; t <= top; t++) {
    eis([S(t, true, true), S(t, true, false), S(t, false)].every(x => heel(x) && x >= 1 && x <= top), 'bergop: niveau blijft tussen 1 en 20 vanaf ' + t);
    eis(B(t) >= 0 && B(t) <= 2 && (t === 1 || B(t) >= B(t - 1)), 'bergop: hoger niveau geeft nooit makkelijkere sommen (' + t + ')');
  }
  eis(B(1) === 0 && B(6) === 0 && B(7) === 1 && B(13) === 1 && B(14) === 2 && B(20) === 2 && REGELS.BERG.snel.length === 3, 'bergop: de drie niveaus van de sommenmaker komen alle drie voor');
}

// Tien opgaven: tien stuks, nooit makkelijker dan de vorige, van het laagste naar het hoogste niveau.
for (const id of ['patronen', 'reeksen', 'kubussen', 'spiegelbeeld']) {
  const p = REGELS.PUZZEL[id], niveaus = REGELS.tienNiveaus(p.max), r = BB.maakRng('tien-' + id);
  eis(niveaus.length === 10 && REGELS.TIEN === 10 && niveaus[0] === 0 && niveaus[9] === p.max, id + ': tien opgaven van niveau 1 tot en met ' + (p.max + 1) + ' (' + niveaus + ')');
  eis(niveaus.every((n, k) => k === 0 || (n >= niveaus[k - 1] && n - niveaus[k - 1] <= 1)), id + ': het niveau loopt op zonder een niveau over te slaan (' + niveaus + ')');
  const items = niveaus.map(n => p.maak(r, n));
  eis(items.length === 10 && items.every((item, k) => item.niveau === niveaus[k] && (k === 0 || item.niveau >= items[k - 1].niveau)), id + ': de tien opgaven zelf worden nooit makkelijker');
  eis(items.every(item => p.typen ? heel(item.antwoord) : item.juist >= 0), id + ': elke opgave heeft een goed antwoord');
}

// De lijst met spellen: elk spel heeft een kaart, een groep, teksten en medailles voor elke keuze.
{
  const V = BB.voortgang, groepen = O.GROEPEN.map(g => g[0]), verboden = /[;·–—]| - /;
  eis(O.SPELLEN.length === 14 && new Set(O.SPELLEN.map(s => s.id)).size === 14, '14 verschillende spellen');
  eis(groepen.join() === 'Rekenen,Geheugen,Puzzels,Tempo' && groepen.map(g => O.SPELLEN.filter(s => s.groep === g).length).join() === '5,2,4,3', 'vier groepen met 5, 2, 4 en 3 spellen');
  eis(BB.kaart.TEKEN.iq && BB.kaart.TEKST.iq, 'de IQ-test heeft een kaart');
  for (const spel of O.SPELLEN) {
    const ronde = O.RONDE[spel.id], keuzes = ronde ? ronde.keuzes.map(k => k[0]) : [null];
    eis(groepen.includes(spel.groep), spel.id + ': hoort bij een groep');
    eis(typeof BB.kaart.TEKEN[spel.id] === 'string' && BB.kaart.TEKEN[spel.id].includes('<svg') && BB.kaart.TEKST[spel.id], spel.id + ': heeft een tekening en een regel tekst op de kaart');
    eis(!verboden.test(BB.kaart.TEKST[spel.id]) && !verboden.test(spel.naam), spel.id + ': geen streepjes of puntkomma op de kaart');
    if (ronde) eis(keuzes.includes(ronde.standaard) && keuzes.includes(ronde.kaal) && ronde.vraag.endsWith('?'), spel.id + ': de keuze voor de lengte heeft een vraag en een standaard');
    for (const keuze of keuzes) {
      for (let niveau = 0; niveau < 3; niveau++) {
        const i = Object.assign(keuze == null ? standaard() : met(spel.id, keuze), { niveau }), m = spel.medailles(i), waar = spel.id + ' ' + (keuze == null ? '' : keuze) + ' niveau ' + niveau;
        eis(m.length === 3 && m.every(x => heel(x) || x % 0.5 === 0) && (spel.lager ? m[0] > m[1] && m[1] > m[2] && m[2] > 0 : m[0] > 0 && m[0] < m[1] && m[1] < m[2]), waar + ': brons, zilver en goud lopen op (' + m + ')');
        const d = V.drempels(m);
        eis(d.every((x, k) => k === 0 || (spel.lager ? x < d[k - 1] : x > d[k - 1])) && d[6] > 0, waar + ': acht rangen met oplopende drempels (' + d + ')');
        if (keuze === 'tien') eis(d[6] <= 10, waar + ': de hoogste rang is te halen met tien opgaven (' + d[6] + ')');
        const tekst = O.tekstVan(spel, i), uitleg = spel.uitleg ? spel.uitleg(i) : [], k = O.sleutel(spel, i);
        eis(typeof tekst === 'string' && tekst.length > 10 && !verboden.test(tekst), waar + ': een regel tekst zonder streepjes of puntkomma (' + tekst + ')');
        eis(uitleg.every(zin => typeof zin === 'string' && !verboden.test(zin)), waar + ': uitleg zonder streepjes of puntkomma');
        eis(k.startsWith(spel.id + '|') && typeof spel.bij(i) === 'string' && !verboden.test(spel.bij(i)), waar + ': sleutel en omschrijving');
        const inWoorden = O.instellingTekst(spel, k);
        if (ronde) eis(inWoorden.toLowerCase().includes(ronde.bij(keuze).toLowerCase()), waar + ': de recordpagina noemt de keuze in woorden (' + inWoorden + ')');
        if (ronde) eis(typeof ronde.uitleg(keuze) === 'string' && !verboden.test(ronde.uitleg(keuze)), waar + ': de keuze heeft een uitleg');
      }
    }
    // Verschillende keuzes mogen nooit in dezelfde ranglijst terechtkomen.
    eis(new Set(keuzes.map(keuze => O.sleutel(spel, keuze == null ? standaard() : met(spel.id, keuze)))).size === keuzes.length, spel.id + ': elke keuze heeft een eigen sleutel');
  }
  for (const id of ['versnelling', 'bergop', 'controleren', 'spiegelbeeld', 'tikken', 'kleurwoord']) {
    const u = spelVan(id).uitleg(standaard());
    eis(u.length >= 2 && u.length <= 4, id + ': uitleg van twee tot vier korte regels (' + u.length + ')');
  }
  eis(spelVan('kleurwoord').uitleg(standaard()).some(zin => /kleurenblind/.test(zin)), 'kleurwoord: de uitleg zegt dat je kleuren moet kunnen zien');

  // Records van voor deze uitbreiding blijven geldig: dezelfde sleutel en dezelfde medailles als toen.
  const sleutels = id => O.sleutel(spelVan(id), standaard());
  eis(sleutels('sprint') === 'sprint|1|+−×÷' && sleutels('tijdrace') === 'tijdrace|1|+−×÷' && sleutels('overleven') === 'overleven||+−×÷' &&
    sleutels('rekenspan') === 'rekenspan||' && sleutels('cijfers') === 'cijfers|vooruit', 'de sleutels bij de standaardinstellingen zijn niet veranderd');
  for (const id of ['patronen', 'reeksen', 'kubussen']) {
    eis(O.sleutel(spelVan(id), met(id, 'levens')) === id + '|' && sleutels(id) === id + '|tien', id + ': drie levens houdt de oude sleutel, tien opgaven krijgt een nieuwe');
  }
  eis(O.sleutel(spelVan('sprint'), met('sprint', 10)) === 'sprint|1|+−×÷|10' && O.sleutel(spelVan('tijdrace'), met('tijdrace', 120)) === 'tijdrace|1|+−×÷|120', 'een andere lengte komt achteraan in de sleutel');
  eis(O.sleutel(spelVan('sprint'), met('sprint', 999)) === 'sprint|1|+−×÷', 'een keuze die niet bestaat valt terug op de standaard');
  eis(spelVan('sprint').medailles(standaard()).join() === '180000,90000,60000' && spelVan('sprint').medailles(met('sprint', 10)).join() === '120000,60000,40000' &&
    spelVan('sprint').medailles(met('sprint', 25)).join() === '300000,150000,100000', 'sprint: de medailles schalen mee met het aantal sommen');
  eis(spelVan('tijdrace').medailles(standaard()).join() === '5,10,15' && spelVan('tijdrace').medailles(met('tijdrace', 30)).join() === '3,5,8' &&
    spelVan('tijdrace').medailles(met('tijdrace', 120)).join() === '10,20,30', 'tijdrace: de medailles schalen mee met de tijd');
  eis(spelVan('patronen').medailles(met('patronen', 'levens')).join() === '3,8,11' && spelVan('kubussen').medailles(met('kubussen', 'levens')).join() === '3,8,12' &&
    spelVan('overleven').medailles(standaard()).join() === '5,15,25', 'drie levens en overleven: de medailles zijn niet veranderd');
  eis(O.instellingTekst(spelVan('sprint'), 'sprint|1|+−×÷') === '15 sommen, niveau gemiddeld, sommen met plus, min, keer, delen' &&
    O.instellingTekst(spelVan('patronen'), 'patronen|') === 'Drie levens' && O.instellingTekst(spelVan('patronen'), 'patronen|tien') === '10 opgaven' &&
    O.instellingTekst(spelVan('tikken'), 'tikken|5') === 'Veld van 5 bij 5' && O.instellingTekst(spelVan('cijfers'), 'cijfers|achteruit') === 'Volgorde: achterstevoren' &&
    O.instellingTekst(spelVan('bergop'), 'bergop||+−') === 'Sommen met plus, min', 'de recordpagina beschrijft elke instelling in woorden');
  eis(['sprint|1|+−×÷|25', 'sprint|1|+−×÷', 'sprint|1|+−×÷|10'].sort((a, b) => O.rondeUit(spelVan('sprint'), a) - O.rondeUit(spelVan('sprint'), b)).join(' ') === 'sprint|1|+−×÷|10 sprint|1|+−×÷ sprint|1|+−×÷|25' &&
    O.rondeUit(spelVan('patronen'), 'patronen|tien') < O.rondeUit(spelVan('patronen'), 'patronen|') && O.rondeUit(spelVan('rekenspan'), 'rekenspan||') === -1, 'de recordpagina zet de lijsten in de volgorde van de keuzes');
  const dag = V.dagSpel('2026-10-07', O.SPELLEN.length);
  eis(heel(dag) && dag >= 0 && dag < O.SPELLEN.length, 'de dagkaart kiest uit alle 14 spellen');
}

// De dagkaart: dezelfde seed geeft bij elk nieuw spel dezelfde opgaven.
{
  const twee = f => JSON.stringify(f(BB.maakRng('dag-2026-10-07'))) === JSON.stringify(f(BB.maakRng('dag-2026-10-07')));
  eis(twee(r => BB.controleren.maak(r, 9)) && twee(r => BB.spiegelbeeld.maak(r, 3)) && twee(r => BB.tikken.maakVeld(r, 4)) &&
    twee(r => [0, 1, 2, 3, 4].map(() => BB.kleurwoord.maak(r, null))) && twee(r => BB.sommen.maak(r, REGELS.bergNiveau(9), ['+', '×'])), 'dezelfde seed geeft dezelfde opgaven');
}

// Cijferreeksen.
const rnd = BB.maakRng('controle');
for (const soort of ['vooruit', 'achteruit', 'gesorteerd']) {
  for (let lengte = 2; lengte <= 9; lengte++) {
    for (let n = 0; n < 50; n++) {
      const r = BB.cijfers.maakReeks(rnd, lengte, soort);
      eis(r.length === lengte && r.every(d => d >= 1 && d <= 9), soort + ' lengte ' + lengte);
      eis(r.every((d, i) => d !== r[i - 1]), soort + ': geen dubbel cijfer achter elkaar');
      if (soort !== 'vooruit') eis(BB.cijfers.doel(r, soort).join('') !== r.join(''), soort + ': antwoord verschilt van de reeks');
    }
  }
}
eis(BB.cijfers.schat([4, 5, 6, 7, 6, 7, 6, 7, 6], [true, true, true, false, true, false, true, false]) === 6.5, 'span 6,5 bij om en om 6 goed en 7 fout');
eis(BB.cijfers.schat([4, 5, 6, 7, 8, 9, 9, 9, 9], [true, true, true, true, true, true, true, true]) === 9.5, 'plafond 9,5');

// Score: gemiddelde ruwe scores moeten rond 100 uitkomen, alles goed bij het plafond, alles fout bij de bodem.
const niveaus = BB.patronen.maakSet('A').map(x => x.niveau);
const vp = BB.iq.verwacht(niveaus, 'patronen'), vr = BB.iq.verwacht(niveaus, 'reeksen'), N = BB.NORMEN;
const ruw = (p, r, c, s, y) => ({
  patronen: { goed: p, niveaus }, reeksen: { goed: r, niveaus },
  cijfers: { vooruit: N.onthouden.vooruit.gem + c, achteruit: N.onthouden.achteruit.gem + c, gesorteerd: N.onthouden.gesorteerd.gem + c },
  sommen: { goed: s, fout: 0 }, symbolen: { goed: y, fout: 0 },
});
const midden = BB.iq.bereken(ruw(vp.gem, vr.gem, 0, N.sommen.gem, N.symbolen.gem));
eis(midden.iq === 100, 'gemiddelde scores geven 100, kreeg ' + midden.iq);
eis(BB.iq.bereken(ruw(12, 12, 3, 45, 60)).iq === N.bovengrens, 'alles goed geeft het plafond');
eis(BB.iq.bereken(ruw(0, 0, -4, 0, 0)).iq === N.ondergrens, 'alles fout geeft de bodem');

console.log('Patronen: verwacht ' + vp.gem.toFixed(2) + ' goed (sd ' + vp.sd.toFixed(2) + '), hoogste z ' + ((12 - vp.gem) / vp.sd).toFixed(2));
console.log('Reeksen:  verwacht ' + vr.gem.toFixed(2) + ' goed (sd ' + vr.sd.toFixed(2) + '), hoogste z ' + ((12 - vr.gem) / vr.sd).toFixed(2));
for (const stap of [-1, 1, 2]) {
  const u = BB.iq.bereken(ruw(vp.gem + stap * vp.sd, vr.gem + stap * vr.sd, stap * 1.2, N.sommen.gem + stap * N.sommen.sd, N.symbolen.gem + stap * N.symbolen.sd));
  console.log('Overal ' + stap + ' sd: IQ ' + u.iq);
}
console.log('Reeksen vorm A:');
BB.reeksen.maakSet('A').forEach(r => console.log('  ' + r.reeks.join(', ') + ', ? -> ' + r.antwoord + '  (' + r.regel + ')'));
console.log(fouten ? fouten + ' fout(en)' : 'Alles in orde');
process.exit(fouten ? 1 : 0);
