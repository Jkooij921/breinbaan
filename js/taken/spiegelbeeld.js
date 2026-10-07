// Spiegelbeeld: twee figuren van vierkantjes naast elkaar. Is de rechter de linker die gedraaid is,
// of is hij ook nog gespiegeld? Meet ruimtelijk inzicht: je draait de figuur in je hoofd.
// Zelf gemaakt volgens regels, niet overgenomen uit een bestaande test.
BB.spiegelbeeld = (function () {
  const el = BB.el;
  const VELD = 5; // een figuur past in een rooster van vijf bij vijf, ook nadat hij gedraaid is
  const VAKJES = [4, 5, 6, 7, 8]; // niveau 0 tot en met 4: hoe hoger, hoe meer vierkantjes

  const draai = c => c.map(p => [-p[1], p[0]]); // een kwartslag
  const spiegel = c => c.map(p => [-p[0], p[1]]);
  // Schuift de figuur naar de hoek en zet de vakjes op een vaste volgorde. Twee figuren zijn gelijk
  // als ze daarna hetzelfde zijn.
  function norm(c) {
    const x0 = Math.min(...c.map(p => p[0])), y0 = Math.min(...c.map(p => p[1]));
    return c.map(p => [p[0] - x0, p[1] - y0]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  const code = c => norm(c).map(p => p.join()).join(' ');
  function standen(c) { // de vier standen die je door draaien krijgt
    const uit = [c];
    while (uit.length < 4) uit.push(draai(uit[uit.length - 1]));
    return uit;
  }
  // Een figuur is alleen bruikbaar als je zijn spiegelbeeld met draaien niet terugkrijgt.
  // Bij een rechte balk of een vierkant zou "gespiegeld" anders hetzelfde zijn als "gedraaid".
  function echtAnders(c) {
    const s = code(spiegel(c));
    return standen(c).every(d => code(d) !== s);
  }

  // Groeit een figuur uit een vakje: steeds komt er een vakje bij dat aan de figuur vastzit.
  function groei(rnd, aantal) {
    const c = [[0, 0]];
    while (c.length < aantal) {
      const p = BB.kies(rnd, c), r = BB.kies(rnd, [[1, 0], [-1, 0], [0, 1], [0, -1]]), q = [p[0] + r[0], p[1] + r[1]];
      if (c.some(v => v[0] === q[0] && v[1] === q[1])) continue;
      const xs = c.map(v => v[0]).concat(q[0]), ys = c.map(v => v[1]).concat(q[1]);
      if (Math.max(...xs) - Math.min(...xs) < VELD && Math.max(...ys) - Math.min(...ys) < VELD) c.push(q);
    }
    return norm(c);
  }

  // De rechter figuur is de linker na een kwartslag, een halve slag of driekwart slag. In de helft van
  // de opgaven is hij eerst gespiegeld. juist: 0 is gespiegeld, 1 is gedraaid (de volgorde van de knoppen).
  function maak(rnd, niveau) {
    let links;
    do { links = groei(rnd, VAKJES[niveau]); } while (!echtAnders(links));
    const gespiegeld = rnd() < 0.5, basis = standen(gespiegeld ? spiegel(links) : links).slice(1);
    // Liever een stand die er anders uitziet dan links. Sommige figuren zien er na een halve slag hetzelfde uit.
    const anders = basis.filter(s => code(s) !== code(links));
    return { niveau, links, rechts: norm(BB.kies(rnd, anders.length ? anders : basis)), gespiegeld, juist: gespiegeld ? 0 : 1 };
  }
  // Controle voor de test: is b uit a te krijgen door alleen te draaien, of alleen na spiegelen?
  function soort(a, b) {
    if (standen(a).some(s => code(s) === code(b))) return 'gedraaid';
    return standen(spiegel(a)).some(s => code(s) === code(b)) ? 'gespiegeld' : 'anders';
  }

  // ---- tekenen ----
  // Elke figuur staat midden in een even groot vak, zodat de plek niets verraadt.
  function svg(c) {
    const b = Math.max(...c.map(p => p[0])) + 1, h = Math.max(...c.map(p => p[1])) + 1;
    const dx = (VELD - b) * 10, dy = (VELD - h) * 10;
    return '<svg viewBox="-4 -4 108 108" class="figuur" aria-hidden="true">' +
      c.map(p => '<rect x="' + (dx + p[0] * 20) + '" y="' + (dy + p[1] * 20) + '" width="20" height="20" class="vakje"/>').join('') + '</svg>';
  }
  function vraag(item) {
    const vak = (naam, c) => el('div', { class: 'figuurvak' }, el('span', { class: 'figuurnaam' }, naam), el('span', { html: svg(c) }));
    return el('div', { class: 'figuren' }, vak('Links', item.links), vak('Rechts', item.rechts));
  }
  // De F ligt links op het toetsenbord en de J rechts. De knoppen staan in dezelfde volgorde.
  const TOETSEN = ['f', 'j'];
  function keuzes(item, opKies) {
    const knoppen = [[BB.metToets('Gespiegeld', 'F'), ' stil'], [BB.metToets('Gedraaid', 'J'), '']].map((k, n) =>
      el('button', { class: 'knop' + k[1], type: 'button', onclick: () => opKies(n) }, k[0]));
    return { el: el('div', { class: 'janee' }, knoppen), kies: opKies, knoppen };
  }

  return {
    maak, soort, echtAnders, standen, spiegel, code, vraag, keuzes, VAKJES, TOETSEN,
    uitleg: [
      'Je ziet twee figuren van vierkantjes. De rechter is de linker, maar dan gedraaid of gespiegeld.',
      'Gedraaid betekent: je kunt de linker figuur over de tafel schuiven en draaien tot hij op de rechter past.',
      'Gespiegeld betekent: dat lukt pas als je hem eerst omkeert, zoals je hem in een spiegel ziet.',
    ],
  };
})();
