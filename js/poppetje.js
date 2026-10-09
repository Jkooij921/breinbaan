// Je poppetje: een loper met een startnummer op de buik. Het nummer is je level.
// Dezelfde tekenstijl als op de kaarten: vlakke kleuren, een witte tegel met een getal en een schaduw recht eronder.
// Hier staat alleen hoe elk onderdeel heet en hoe het getekend wordt. Wanneer je het krijgt, staat in baan.js.
BB.poppetje = (function () {
  const INKT = '#1e1b3a', WIT = '#fff', GOUD = '#f6b92b', GOUD_D = '#c98a0c';
  // lijn: de kleur van de mond en het montuur. Op een donker lijf is die wit.
  const KLEUREN = [
    { id: 'druif', naam: 'Paars', vul: '#7a5cfa', donker: '#5a3fd0' },
    { id: 'tomaat', naam: 'Rood', vul: '#ff5b4d', donker: '#c93e33' },
    { id: 'munt', naam: 'Groen', vul: '#25c48a', donker: '#169a69' },
    { id: 'lucht', naam: 'Blauw', vul: '#3b9dff', donker: '#1f78d6' },
    { id: 'zon', naam: 'Geel', vul: '#ffc533', donker: '#d99d0e' },
    { id: 'roze', naam: 'Roze', vul: '#ff7ab6', donker: '#d95592' },
    { id: 'oranje', naam: 'Oranje', vul: '#ff8f3f', donker: '#d66d1f' },
    { id: 'zee', naam: 'Zeegroen', vul: '#18b6d1', donker: '#0f8fa6' },
    { id: 'nacht', naam: 'Nachtblauw', vul: INKT, donker: '#0c0a1f', lijn: WIT },
    { id: 'goud', naam: 'Goud', vul: GOUD, donker: GOUD_D, glans: true },
  ];
  const HOOFD = [
    { id: 'geen', naam: 'Niets' }, { id: 'zweetband', naam: 'Zweetband', met: 'een zweetband' }, { id: 'pet', naam: 'Pet', met: 'een pet' },
    { id: 'muts', naam: 'Muts', met: 'een muts' }, { id: 'feesthoed', naam: 'Feesthoed', met: 'een feesthoed' },
    { id: 'hogehoed', naam: 'Hoge hoed', met: 'een hoge hoed' }, { id: 'kroon', naam: 'Kroon', met: 'een kroon' },
  ];
  const GEZICHT = [
    { id: 'gewoon', naam: 'Gewoon' }, { id: 'blij', naam: 'Blij', met: 'een blij gezicht' }, { id: 'bril', naam: 'Bril', met: 'een bril' },
    { id: 'knipoog', naam: 'Knipoog', met: 'een knipoog' }, { id: 'zonnebril', naam: 'Zonnebril', met: 'een zonnebril' },
    { id: 'sterren', naam: 'Sterren in de ogen', met: 'sterren in de ogen' },
  ];
  // Een voorwerp hoort bij een vaardigheid. De gouden versie is dezelfde tekening in goud.
  const VOORWERP = [
    { id: 'geen', naam: 'Niets' },
    { id: 'telraam', naam: 'Telraam', met: 'een telraam' }, { id: 'telraam-goud', naam: 'Gouden telraam', met: 'een gouden telraam' },
    { id: 'olifant', naam: 'Olifant', met: 'een olifant' }, { id: 'olifant-goud', naam: 'Gouden olifant', met: 'een gouden olifant' },
    { id: 'kubus', naam: 'Kubus', met: 'een kubus' }, { id: 'kubus-goud', naam: 'Gouden kubus', met: 'een gouden kubus' },
    { id: 'bliksem', naam: 'Bliksem', met: 'een bliksem' }, { id: 'bliksem-goud', naam: 'Gouden bliksem', met: 'een gouden bliksem' },
  ];
  const SLOTS = [
    { id: 'kleur', naam: 'Kleur', keuzes: KLEUREN },
    { id: 'hoofd', naam: 'Op het hoofd', keuzes: HOOFD },
    { id: 'gezicht', naam: 'Gezicht', keuzes: GEZICHT },
    { id: 'voorwerp', naam: 'In de hand', keuzes: VOORWERP },
  ];
  const STANDAARD = { kleur: 'druif', hoofd: 'geen', gezicht: 'gewoon', voorwerp: 'geen' };
  const keuze = (slot, id) => SLOTS.find(s => s.id === slot).keuzes.find(k => k.id === id) || {};
  const naamVan = (slot, id) => keuze(slot, id).naam;
  // Het onderdeel in een lopende zin: "een pet", "de kleur geel".
  const metVan = (slot, id) => slot === 'kleur' ? 'de kleur ' + keuze(slot, id).naam.toLowerCase() : keuze(slot, id).met;
  // Een keuze die niet (meer) bestaat valt terug op de standaard.
  function heel(u) {
    const uit = {};
    for (const s of SLOTS) uit[s.id] = u && s.keuzes.some(k => k.id === u[s.id]) ? u[s.id] : STANDAARD[s.id];
    return uit;
  }

  const ster = (cx, cy, R, r) => {
    let d = '';
    for (let n = 0; n < 10; n++) {
      const hoek = -Math.PI / 2 + n * Math.PI / 5, straal = n % 2 ? r : R;
      d += (n ? 'L' : 'M') + (cx + Math.cos(hoek) * straal).toFixed(1) + ' ' + (cy + Math.sin(hoek) * straal).toFixed(1);
    }
    return d + 'Z';
  };
  const glinster = (cx, cy, s) => '<path d="M' + cx + ' ' + (cy - s) + 'Q' + cx + ' ' + cy + ' ' + (cx + s) + ' ' + cy + 'Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + s) +
    'Q' + cx + ' ' + cy + ' ' + (cx - s) + ' ' + cy + 'Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - s) + 'Z" fill="' + WIT + '" stroke="' + GOUD_D + '" stroke-width=".9" stroke-linejoin="round"/>';

  const OOG = '<circle cx="45" cy="52" r="8.5" fill="' + WIT + '"/><circle cx="65" cy="52" r="8.5" fill="' + WIT + '"/>';
  const PUPIL = '<circle cx="46.6" cy="52.8" r="3.7" fill="' + INKT + '"/><circle cx="66.6" cy="52.8" r="3.7" fill="' + INKT + '"/>' +
    '<circle cx="47.9" cy="51.3" r="1.2" fill="' + WIT + '"/><circle cx="67.9" cy="51.3" r="1.2" fill="' + WIT + '"/>';
  const lach = lijn => '<path d="M48 64.5Q55 70 62 64.5" fill="none" stroke="' + lijn + '" stroke-width="2.6" stroke-linecap="round"/>';
  const open = lijn => '<path d="M47 63H63Q62 71.5 55 71.5Q48 71.5 47 63Z" fill="' + (lijn === WIT ? WIT : INKT) + '"/><ellipse cx="55" cy="69" rx="3.4" ry="1.8" fill="#ff5b4d"/>';
  const TEKEN_GEZICHT = {
    gewoon: lijn => OOG + PUPIL + lach(lijn),
    blij: lijn => OOG + PUPIL + open(lijn),
    bril: lijn => OOG + PUPIL + '<g fill="none" stroke="' + lijn + '" stroke-width="2.4" stroke-linecap="round"><circle cx="45" cy="52" r="9.8"/><circle cx="65" cy="52" r="9.8"/><path d="M35.2 51L30.5 49M74.8 51L79.5 49"/></g>' + lach(lijn),
    knipoog: lijn => '<circle cx="45" cy="52" r="8.5" fill="' + WIT + '"/><circle cx="46.6" cy="52.8" r="3.7" fill="' + INKT + '"/><circle cx="47.9" cy="51.3" r="1.2" fill="' + WIT + '"/>' +
      '<path d="M58.5 54Q65 47.5 71.5 54" fill="none" stroke="' + lijn + '" stroke-width="2.9" stroke-linecap="round"/>' +
      '<path d="M47 63.5Q55 71 63 63.5" fill="none" stroke="' + lijn + '" stroke-width="2.6" stroke-linecap="round"/>',
    zonnebril: lijn => '<g fill="' + INKT + '" stroke="' + WIT + '" stroke-width="1.5"><rect x="34.5" y="45.5" width="19" height="13" rx="5.5"/><rect x="56.5" y="45.5" width="19" height="13" rx="5.5"/></g>' +
      '<rect x="52.8" y="49.4" width="4.4" height="2.6" fill="' + INKT + '"/><path d="M38.5 50l4.5-1.8M60.5 50l4.5-1.8" stroke="' + WIT + '" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
      '<path d="M49 65Q56 68.5 62 63.5" fill="none" stroke="' + lijn + '" stroke-width="2.6" stroke-linecap="round"/>',
    sterren: lijn => OOG + '<path d="' + ster(45, 52.3, 6.2, 2.7) + ster(65, 52.3, 6.2, 2.7) + '" fill="#ffc533" stroke="' + GOUD_D + '" stroke-width=".8" stroke-linejoin="round"/>' + open(lijn),
  };
  const TEKEN_HOOFD = {
    geen: '',
    zweetband: '<path d="M38.4 35H71.6A27 27 0 0 1 78.4 42H31.6A27 27 0 0 1 38.4 35Z" fill="' + WIT + '"/><path d="M35.3 37.5H74.7L76.6 39.5H33.4Z" fill="#ff5b4d"/>',
    pet: '<rect x="66" y="36" width="27" height="6.5" rx="3.2" fill="#c93e33"/><path d="M33 40.5A27 27 0 0 1 54 30H56A27 27 0 0 1 77 40.5Z" fill="#ff5b4d"/>' +
      '<path d="M33 40.5H77" stroke="' + WIT + '" stroke-width="2.2" stroke-linecap="round"/><circle cx="55" cy="30.3" r="2.6" fill="' + WIT + '"/>',
    muts: '<path d="M31 41Q30 14 55 13Q80 14 79 41Z" fill="#3b9dff"/><rect x="28.5" y="34.5" width="53" height="8.5" rx="4.2" fill="' + WIT + '"/><circle cx="55" cy="10.5" r="6.2" fill="#ffc533"/>',
    feesthoed: '<path d="M41 33L57 7L70 31Z" fill="#ffc533"/><path d="M46.5 24L65.1 22L66.75 25L44.7 27ZM51.8 15.5L60.5 13.5L62.1 16.5L49.9 18.5Z" fill="#ff5b4d"/><circle cx="57" cy="6.5" r="4.2" fill="#7a5cfa"/>',
    hogehoed: '<g transform="rotate(-6 55 30)"><rect x="40" y="5" width="30" height="25" rx="3" fill="' + INKT + '"/><rect x="40" y="20.5" width="30" height="5" fill="#ffc533"/><rect x="33" y="27" width="44" height="6.5" rx="3.2" fill="' + INKT + '"/></g>',
    kroon: '<path d="M37 33L35 13.5L45.5 22.5L55 9.5L64.5 22.5L75 13.5L73 33Z" fill="#ffc533"/><rect x="37" y="27.5" width="36" height="5.5" fill="#d99d0e"/>' +
      '<circle cx="55" cy="30.2" r="2" fill="#ff5b4d"/><circle cx="45" cy="30.2" r="1.6" fill="#3b9dff"/><circle cx="65" cy="30.2" r="1.6" fill="#3b9dff"/>' +
      '<circle cx="35" cy="13" r="2.7" fill="#ffc533"/><circle cx="55" cy="9" r="2.7" fill="#ffc533"/><circle cx="75" cy="13" r="2.7" fill="#ffc533"/>',
  };
  // goud: dezelfde tekening in goud, met een glinstering erbij.
  const TEKEN_VOORWERP = {
    telraam: goud => '<rect x="84" y="56" width="22" height="24" rx="3.5" fill="' + (goud ? '#fff4cf' : WIT) + '" stroke="' + (goud ? GOUD_D : INKT) + '" stroke-width="2.4"/>' +
      '<path d="M86 62.5H104M86 68H104M86 73.5H104" stroke="' + (goud ? GOUD_D : INKT) + '" stroke-width="1"/>' +
      [[89, 62.5, '#ff5b4d'], [93.6, 62.5, '#ff5b4d'], [101.2, 62.5, '#ffc533'], [89, 68, '#3b9dff'], [96.6, 68, '#3b9dff'], [101.2, 68, '#3b9dff'], [91.4, 73.5, '#25c48a'], [96, 73.5, '#25c48a'], [100.6, 73.5, '#ff5b4d']]
        .map(k => '<circle cx="' + k[0] + '" cy="' + k[1] + '" r="2.3" fill="' + (goud ? GOUD : k[2]) + '"/>').join(''),
    // een olifant van voren: twee grote oren, twee ogen en een slurf die opzij krult
    olifant: goud => '<circle cx="87" cy="61.5" r="7" fill="' + (goud ? '#ffe08a' : '#a9b5d0') + '"/><circle cx="105" cy="61.5" r="7" fill="' + (goud ? '#ffe08a' : '#a9b5d0') + '"/>' +
      '<path d="M96 68V76.5Q96 81.5 102 80" fill="none" stroke="' + (goud ? GOUD : '#5a6a8c') + '" stroke-width="4.6" stroke-linecap="round"/>' +
      '<circle cx="96" cy="64.5" r="8.2" fill="' + (goud ? GOUD : '#5a6a8c') + '"/>' +
      '<circle cx="92.8" cy="63" r="1.5" fill="' + (goud ? INKT : WIT) + '"/><circle cx="99.2" cy="63" r="1.5" fill="' + (goud ? INKT : WIT) + '"/>',
    kubus: goud => '<g stroke="' + INKT + '" stroke-width="1.6" stroke-linejoin="round"><path d="M95 56.5L106 62V74.5L95 80L84 74.5V62Z" fill="' + (goud ? '#ffd35a' : '#e7e4f3') + '"/>' +
      '<path d="M95 56.5L106 62L95 67.5L84 62Z" fill="' + (goud ? '#fff3c4' : WIT) + '"/><path d="M106 62V74.5L95 80V67.5Z" fill="' + (goud ? '#e0a31a' : '#c9c5dc') + '"/></g>',
    bliksem: goud => '<path d="M98 53L86 70H94L90.5 84L104.5 65.5H96.5L100.5 53Z" fill="' + (goud ? GOUD : '#3b9dff') + '" stroke="' + INKT + '" stroke-width="1.6" stroke-linejoin="round"/>',
  };

  // level: het getal op het startnummer. alleenKop: zonder armen, benen en startnummer, voor een klein rondje.
  function teken(u, level, alleenKop) {
    const k = KLEUREN.find(x => x.id === u.kleur), lijn = k.lijn || INKT;
    const ding = u.voorwerp === 'geen' ? null : u.voorwerp.split('-');
    const lijf = '<rect x="27" y="34" width="56" height="68" rx="27" fill="' + k.donker + '"/><rect x="27" y="30" width="56" height="68" rx="27" fill="' + k.vul + '"/>' +
      (k.glans ? '<ellipse cx="38.5" cy="46" rx="4" ry="9" fill="' + WIT + '" opacity=".5" transform="rotate(28 38.5 46)"/>' + glinster(76, 37, 4.6) : '');
    if (alleenKop) return lijf + TEKEN_GEZICHT[u.gezicht](lijn) + TEKEN_HOOFD[u.hoofd];
    return '<ellipse cx="55" cy="117" rx="27" ry="4.5" fill="' + INKT + '" opacity=".14"/>' +
      // benen en schoenen
      '<rect x="42" y="92" width="9" height="21" rx="4.5" fill="' + k.donker + '"/><rect x="59" y="92" width="9" height="21" rx="4.5" fill="' + k.donker + '"/>' +
      '<rect x="36.5" y="109" width="17" height="8" rx="4" fill="' + INKT + '"/><rect x="56.5" y="109" width="17" height="8" rx="4" fill="' + INKT + '"/>' +
      // armen: links zwaait, rechts draagt wat je in de hand hebt
      '<path d="M31 67Q15 63 12.5 47" fill="none" stroke="' + k.donker + '" stroke-width="8" stroke-linecap="round"/><circle cx="12.3" cy="45.5" r="5.6" fill="' + k.vul + '"/>' +
      '<path d="M79 67Q90 71 93.5 80" fill="none" stroke="' + k.donker + '" stroke-width="8" stroke-linecap="round"/>' +
      lijf +
      // het startnummer
      '<rect x="41" y="77" width="28" height="17" rx="5" fill="' + INKT + '" opacity=".22"/><rect x="41" y="75" width="28" height="17" rx="5" fill="' + WIT + '"/>' +
      (level ? '<text x="55" y="88.2" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12.5" fill="' + INKT + '">' + level + '</text>' : '') +
      TEKEN_GEZICHT[u.gezicht](lijn) + TEKEN_HOOFD[u.hoofd] +
      (ding ? TEKEN_VOORWERP[ding[0]](ding[1] === 'goud') + (ding[1] === 'goud' ? glinster(105, 53, 4.4) : '') : '') +
      '<circle cx="93.8" cy="81.5" r="5.6" fill="' + k.vul + '"/>';
  }
  // De hele figuur als tekst, om in een pagina te zetten. u: het uiterlijk, level: het getal op het startnummer.
  const svg = (u, level) => '<svg class="poppetje" viewBox="-3 0 116 122" aria-hidden="true">' + teken(heel(u), level, false) + '</svg>';
  // Alleen het hoofd, voor een klein rondje in de kop van de pagina.
  const kop = u => '<svg class="poppetje-kop" viewBox="19 0 72 72" aria-hidden="true">' + teken(heel(u), 0, true) + '</svg>';
  // Alleen het voorwerp, zonder het poppetje eromheen.
  function ding(id) {
    const d = id.split('-');
    return '<svg class="poppetje-ding" viewBox="78 47 34 38" aria-hidden="true">' + TEKEN_VOORWERP[d[0]](d[1] === 'goud') + (d[1] === 'goud' ? glinster(105, 53, 4.4) : '') + '</svg>';
  }

  return { SLOTS, STANDAARD, heel, naamVan, metVan, svg, kop, ding };
})();
