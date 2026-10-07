// Speelkaarten: elk spel heeft een eigen kleur (zie css/style.css), een tekening die laat zien wat je doet,
// en een regel tekst die het in woorden zegt.
BB.kaart = (function () {
  const INKT = '#1e1b3a';
  const beeld = inhoud => '<svg viewBox="0 0 100 64" aria-hidden="true">' + inhoud + '</svg>';
  // Een wit of donker tegeltje met een getal, som of letter erop.
  function tegel(x, y, b, h, tekst, donker, letter) {
    return '<rect x="' + x + '" y="' + (y + 2) + '" width="' + b + '" height="' + h + '" rx="4" fill="' + INKT + '" opacity=".22"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + b + '" height="' + h + '" rx="4" fill="' + (donker ? INKT : '#fff') + '"/>' +
      '<text x="' + (x + b / 2) + '" y="' + (y + h / 2 + (letter || 11) * 0.36) + '" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="' + (letter || 11) + '" fill="' + (donker ? '#fff' : INKT) + '">' + tekst + '</text>';
  }
  const HART = 'M20 36C6 26 3 19 3 13a9 9 0 0 1 17-4 9 9 0 0 1 17 4c0 6-3 13-17 23z';
  const hart = (x, vol) => '<g transform="translate(' + x + ' 14) scale(.78)"><path d="' + HART + '" ' +
    (vol ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="3.5" stroke-dasharray="6 5" opacity=".75"') + '/></g>';

  // De tekening laat zien wat je in het spel doet.
  const TEKEN = {
    // een som die voorbij vliegt, op weg naar de finish
    sprint: beeld('<path d="M3 22h14M0 32h13M5 42h12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>' +
      tegel(24, 17, 46, 30, '7 × 8', false, 15) +
      '<path d="M84 12v42" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M84 13h14l-4 6 4 6H84z" fill="currentColor"/>'),
    // een stopwatch die op 60 staat
    tijdrace: beeld('<rect x="44" y="1" width="12" height="9" rx="3" fill="currentColor"/><circle cx="50" cy="37" r="26" fill="' + INKT + '" opacity=".22"/><circle cx="50" cy="35" r="26" fill="#fff"/>' +
      '<text x="50" y="43" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="24" fill="' + INKT + '">60</text>'),
    // drie levens, waarvan een al op is
    overleven: beeld(hart(5, true) + hart(35, true) + hart(65, false)),
    // om en om een som en een letter
    rekenspan: beeld(tegel(2, 20, 28, 24, '3+4') + tegel(33, 20, 16, 24, 'K', true, 13) + tegel(52, 20, 28, 24, '5×2') + tegel(83, 20, 16, 24, 'P', true, 13)),
    // een rij cijfers, en dan weet je de laatste niet meer
    cijfers: beeld(tegel(4, 18, 20, 28, '3', false, 16) + tegel(28, 18, 20, 28, '7', false, 16) + tegel(52, 18, 20, 28, '2', false, 16) +
      '<rect x="76" y="18" width="20" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4"/>' +
      '<text x="86" y="38" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="currentColor">?</text>'),
    // een raster van drie bij drie met een leeg vakje
    patronen: beeld((function () {
      const vormen = [
        (x, y) => '<circle cx="' + (x + 8) + '" cy="' + (y + 8) + '" r="4.6" fill="' + INKT + '"/>',
        (x, y) => '<rect x="' + (x + 3.6) + '" y="' + (y + 3.6) + '" width="8.8" height="8.8" rx="1.5" fill="' + INKT + '"/>',
        (x, y) => '<path d="M' + (x + 8) + ' ' + (y + 3) + 'l5.4 9.6h-10.8z" fill="' + INKT + '"/>',
      ];
      let s = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = 20 + c * 20, y = 2 + r * 20, laatste = r === 2 && c === 2;
        s += laatste
          ? '<rect x="' + x + '" y="' + y + '" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 3"/><text x="' + (x + 8.5) + '" y="' + (y + 13) + '" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="currentColor">?</text>'
          : '<rect x="' + x + '" y="' + y + '" width="17" height="17" rx="3" fill="#fff"/>' + vormen[(r + c) % 3](x + 0.5, y + 0.5);
      }
      return s;
    })()),
    // een reeks getallen met de sprongen erboven
    reeksen: beeld([['+2', 20], ['+4', 39], ['+6', 59]].map(p => '<path d="M' + (p[1] - 8) + ' 24q8 -11 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<text x="' + p[1] + '" y="13" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="8" fill="currentColor">' + p[0] + '</text>').join('') +
      tegel(3, 28, 16, 22, '1') + tegel(22, 28, 16, 22, '3') + tegel(41, 28, 16, 22, '7') + tegel(60, 28, 18, 22, '13') +
      '<rect x="82" y="28" width="16" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4"/><text x="90" y="43" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="currentColor">?</text>'),
    // een uitgevouwen kubus, een pijl en de kubus zelf
    kubussen: beeld([[15, 26], [27, 14], [27, 26], [27, 38], [39, 26], [3, 26]].map(p => '<rect x="' + p[0] + '" y="' + p[1] + '" width="12" height="12" fill="#fff" stroke="' + INKT + '" stroke-width="1.6"/>').join('') +
      '<path d="M56 32h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g stroke="' + INKT + '" stroke-width="1.6" stroke-linejoin="round"><path fill="#fff" d="M84 14 97 21 84 28 71 21z"/><path fill="#fff" d="M71 21v15l13 7V28z"/><path fill="#c9c5dc" d="M97 21v15l-13 7V28z"/></g>'),
    // drie stopwatches op een rij: elke som krijgt minder tijd dan de vorige
    versnelling: beeld([[20, 37, 17, '8', 19], [56, 41, 13, '5', 15], [84, 44, 10, '2', 12]].map(k =>
      '<rect x="' + (k[0] - k[2] * 0.22) + '" y="' + (k[1] - k[2] * 1.3) + '" width="' + (k[2] * 0.44) + '" height="' + (k[2] * 0.4) + '" rx="1.5" fill="currentColor"/>' +
      '<circle cx="' + k[0] + '" cy="' + (k[1] + 2) + '" r="' + k[2] + '" fill="' + INKT + '" opacity=".22"/><circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + k[2] + '" fill="#fff"/>' +
      '<text x="' + k[0] + '" y="' + (k[1] + k[4] * 0.36) + '" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="' + k[4] + '" fill="' + INKT + '">' + k[3] + '</text>').join('')),
    // een trap die steeds hoger wordt, met een vlag op de bovenste trede
    bergop: beeld([0, 1, 2, 3, 4].map(n => {
      const x = 8 + n * 16, h = 12 + n * 8;
      return '<rect x="' + x + '" y="' + (62 - h) + '" width="14" height="' + h + '" rx="2.5" fill="' + INKT + '" opacity=".22"/>' +
        '<rect x="' + x + '" y="' + (60 - h) + '" width="14" height="' + h + '" rx="2.5" fill="#fff"/>' +
        '<text x="' + (x + 7) + '" y="' + (71 - h) + '" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9" fill="' + INKT + '">' + (n + 1) + '</text>';
    }).join('') + '<path d="M79 16V3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M79 3h12l-3.5 4 3.5 4H79z" fill="currentColor"/>'),
    // twee rijen cijfers onder elkaar, met een cijfer dat anders is
    controleren: beeld(['48213', '48273'].map((rij, r) => rij.split('').map((c, n) => tegel(8 + n * 17.5, 5 + r * 29, 14, 22, c, r === 1 && n === 3, 13)).join('')).join('')),
    // een figuur en zijn spiegelbeeld, met de spiegel ertussen
    spiegelbeeld: beeld([[14, 8], [14, 22], [14, 36], [28, 36], [72, 8], [72, 22], [72, 36], [58, 36]].map(p =>
      '<rect x="' + p[0] + '" y="' + p[1] + '" width="14" height="14" fill="#fff" stroke="' + INKT + '" stroke-width="1.6"/>').join('') +
      '<path d="M50 3V59" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 5"/>'),
    // een veld met getallen door elkaar. De 1 en de 2 zijn al gevonden
    tikken: beeld([5, 1, 8, 3, 9, 2, 7, 4, 6].map((g, n) => tegel(22 + (n % 3) * 19.5, 1 + Math.floor(n / 3) * 20.5, 17, 17, g, g < 3, 11)).join('')),
    // het woord blauw in gele letters. Het goede antwoord is geel
    kleurwoord: beeld('<rect x="12" y="6" width="76" height="32" rx="7" fill="' + INKT + '"/>' +
      '<text x="50" y="29.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="21" fill="#ffd23f">blauw</text>' +
      [['#ff5a4f', 23], ['#4aa3ff', 41], ['#3ccf5e', 59], ['#ffd23f', 77]].map(k =>
        '<circle cx="' + k[1] + '" cy="52" r="6.5" fill="' + k[0] + '" stroke="#fff" stroke-width="2.2"/>').join('') +
      '<circle cx="77" cy="52" r="10" fill="none" stroke="' + INKT + '" stroke-width="2.2"/>'),
    // de klokvorm waarin scores zich verdelen, met jouw plek
    iq: beeld('<path d="M4 56C30 56 34 10 50 10S70 56 96 56" fill="rgba(255,255,255,.14)" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M4 56h92" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M66 56V30" stroke="var(--zon)" stroke-width="3" stroke-linecap="round"/><path fill="var(--zon)" d="m66 6 3.5 7.6 8.3.9-6.2 5.6 1.8 8.2L66 24l-7.4 4.3 1.8-8.2-6.2-5.6 8.3-.9z"/>'),
  };
  // Wat je doet, in een paar woorden. Staat op de kaart.
  const TEKST = {
    iq: 'Schat je IQ in 5, 10 of 25 minuten',
    sprint: 'Een rij sommen zo snel als je kunt',
    tijdrace: 'Zoveel mogelijk sommen binnen de tijd',
    overleven: 'Sommen maken met drie levens',
    versnelling: 'Elke som krijgt minder tijd',
    bergop: 'Hoe sneller, hoe moeilijker',
    rekenspan: 'Reken en onthoud letters',
    cijfers: 'Onthoud een rij cijfers',
    patronen: 'Welk vakje ontbreekt?',
    reeksen: 'Welk getal komt er daarna?',
    kubussen: 'Vouw de kubus in je hoofd',
    spiegelbeeld: 'Gedraaid of gespiegeld?',
    controleren: 'Zijn de twee rijen gelijk?',
    tikken: 'Tik de getallen op volgorde',
    kleurwoord: 'Kies de kleur van de letters',
  };

  function inhoud(id, naam, onder, hoek) {
    return [
      hoek ? BB.el('span', { class: 'kaart-rang', title: 'Je rang' }, hoek) : null,
      BB.el('span', { class: 'kaart-teken', html: TEKEN[id] }),
      BB.el('span', { class: 'kaart-voet' },
        BB.el('span', { class: 'kaart-naam' }, naam),
        BB.el('span', { class: 'kaart-tekst' }, TEKST[id]),
        onder ? BB.el('span', { class: 'kaart-onder' }, onder) : null),
    ];
  }
  // Een kaart is een knop: klikken is kiezen. onder: bijvoorbeeld je record. hoek: je rang.
  function el(id, naam, onder, klik, hoek) {
    return BB.el('button', { class: 'kaart k-' + id, type: 'button', onclick: klik }, inhoud(id, naam, onder, hoek));
  }
  // De grote kaart op het scherm voor de start van een spel. Geen knop, alleen beeld.
  function groot(id, naam) {
    return BB.el('div', { class: 'kaart groot k-' + id, 'aria-hidden': 'true' }, inhoud(id, naam));
  }
  const fiche = (m, tekst) => BB.el('span', { class: 'fiche m' + m }, tekst);

  return { el, groot, fiche, TEKEN, TEKST, HART };
})();
