// Getallen tikken: een veld met getallen door elkaar. Tik ze op volgorde aan, te beginnen bij 1.
// Meet hoe snel je zoekt. Zo'n veld staat in onderzoek bekend als een Schulte-tabel.
BB.tikken = (function () {
  const el = BB.el;
  const MATEN = [3, 4, 5], STRAF = 1000;

  // Het veld: de getallen 1 tot en met n keer n, geschud. Rij voor rij van links naar rechts.
  function maakVeld(rnd, n) {
    const getallen = [];
    for (let g = 1; g <= n * n; g++) getallen.push(g);
    return BB.schud(rnd, getallen);
  }
  // De score is de tijd. Elke tik op een verkeerd getal telt als een seconde erbij, zodat wild tikken niet loont.
  const score = (ms, mis) => Math.round(ms + mis * STRAF);

  // opTik krijgt het getal en zijn knop. Wat er dan gebeurt, bepaalt het spel.
  function veld(getallen, n, opTik) {
    const knoppen = getallen.map(g => el('button', { class: 'tikvak', type: 'button', onclick: e => opTik(g, e.currentTarget) }, g));
    return { el: el('div', { class: 'tikveld', style: '--n:' + n }, knoppen), knoppen };
  }

  return {
    maakVeld, score, veld, MATEN, STRAF,
    uitleg: [
      'Je ziet een veld met getallen door elkaar. Tik ze op volgorde aan: eerst 1, dan 2, en zo verder.',
      'De klok loopt tot je het laatste getal hebt gevonden. Hoe sneller, hoe beter.',
      'Een tik op een verkeerd getal kost ' + (STRAF / 1000) + ' seconde. Een getal dat je gevonden hebt wordt grijs.',
    ],
  };
})();
