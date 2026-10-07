// Kleurwoord: de naam van een kleur, in letters die zelf ook een kleur hebben. Je kiest de kleur van
// de letters, niet het woord. In onderzoek heet dit de Stroop-taak: lezen gaat vanzelf en dat zit je in de weg.
BB.kleurwoord = (function () {
  const KLEUREN = ['rood', 'blauw', 'groen', 'geel'];
  // Meestal botsen woord en kleur. Soms kloppen ze, anders kun je het woord gewoon leren wegstrepen.
  const KANS_ANDERS = 0.75;

  // woord en inkt zijn plekken in KLEUREN. Het goede antwoord is altijd de inkt.
  // Nooit twee keer precies hetzelfde achter elkaar, anders zie je niet dat er een nieuwe opgave staat.
  function maak(rnd, vorige) {
    for (;;) {
      const woord = BB.rint(rnd, 0, KLEUREN.length - 1);
      const inkt = rnd() < KANS_ANDERS ? (woord + BB.rint(rnd, 1, KLEUREN.length - 1)) % KLEUREN.length : woord;
      if (!vorige || vorige.woord !== woord || vorige.inkt !== inkt) return { woord, inkt };
    }
  }

  // Het woord staat op een donkere kaart. Daarop is ook geel goed te lezen.
  function woord(item) {
    return BB.el('div', { class: 'som kleurwoord inkt-' + KLEUREN[item.inkt] }, KLEUREN[item.woord]);
  }

  return {
    maak, woord, KLEUREN, KANS_ANDERS,
    uitleg: [
      'Je ziet de naam van een kleur. De letters hebben zelf ook een kleur, en die is vaak een andere.',
      'Kies de kleur van de letters, niet het woord dat er staat. Staat er "rood" in blauwe letters, dan is het antwoord blauw.',
      BB.zeg('Gebruik de toetsen 1 tot en met 4 of klik op de knoppen.', 'Tik op de knop met de goede kleur.') + ' Een goed antwoord is een punt erbij, een fout antwoord een punt eraf.',
      'Voor dit spel moet je kleuren goed kunnen onderscheiden. Ben je kleurenblind, dan is dit spel niet eerlijk voor je.',
    ],
  };
})();
