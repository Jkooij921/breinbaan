// Controleren: twee rijen cijfers onder elkaar. Zijn ze precies gelijk, of is er een cijfer anders?
// Meet hoe snel en precies je kijkt. De rijen komen uit het toeval, niet uit een bestaande test.
BB.controleren = (function () {
  const START = 6, MAX = 12, PER_STAP = 3;

  // Na elke drie goede antwoorden komt er een cijfer bij, tot de rij twaalf cijfers lang is.
  const lengteBij = goed => Math.min(MAX, START + Math.floor(goed / PER_STAP));

  // De helft van de paren is gelijk. Bij de andere helft is precies een cijfer anders.
  function maak(rnd, lengte) {
    const boven = [];
    for (let n = 0; n < lengte; n++) boven.push(BB.rint(rnd, 0, 9));
    const onder = boven.slice(), gelijk = rnd() < 0.5;
    let plek = -1;
    if (!gelijk) {
      plek = BB.rint(rnd, 0, lengte - 1);
      onder[plek] = (onder[plek] + BB.rint(rnd, 1, 9)) % 10; // altijd een ander cijfer
    }
    return { boven: boven.join(''), onder: onder.join(''), gelijk, plek };
  }

  // Elk cijfer krijgt een eigen vakje van vaste breedte. Anders zou een smalle 1 de rij korter maken
  // en zag je aan de lengte al dat er iets anders is.
  function rijen(item) {
    const rij = tekst => BB.el('span', { class: 'cijferrij', 'aria-label': tekst.split('').join(' ') }, tekst.split('').map(c => BB.el('i', { 'aria-hidden': 'true' }, c)));
    return BB.el('div', { class: 'som rijen' }, rij(item.boven), rij(item.onder));
  }

  return {
    maak, lengteBij, rijen, START, MAX,
    uitleg: [
      'Je ziet twee rijen cijfers onder elkaar. Zijn ze precies gelijk, of is er een cijfer anders?',
      BB.zeg('Druk J voor gelijk en F voor anders. Je kunt ook op de knoppen klikken.', 'Tik op de knop Gelijk of op de knop Anders.'),
      'Een goed antwoord is een punt erbij, een fout antwoord een punt eraf. Gokken helpt dus niet.',
      'De rijen beginnen met ' + START + ' cijfers en worden langer als het goed gaat, tot ' + MAX + ' cijfers.',
    ],
  };
})();
