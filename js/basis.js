// Gedeelde hulpjes: willekeur met vaste seed, rekenwerk, schermopbouw, klok en toetsen.
var BB = {};

// Zelfde seed geeft altijd dezelfde opgaven. Dat is nodig om scores later eerlijk te vergelijken.
BB.maakRng = function (seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let a = (h ^ (h >>> 16)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
BB.rint = function (rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
BB.kies = function (rnd, lijst) { return lijst[Math.floor(rnd() * lijst.length)]; };
BB.schud = function (rnd, lijst) {
  const a = lijst.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

BB.gem = function (lijst) { return lijst.reduce((a, b) => a + b, 0) / lijst.length; };
BB.klem = function (x, laag, hoog) { return Math.max(laag, Math.min(hoog, x)); };
BB.bits = function (m) { let n = 0; for (; m; m >>>= 1) n += m & 1; return n; };

// Deel van de bevolking dat onder z scoort (normale verdeling).
BB.normCdf = function (z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
};

BB.komma = function (x, decimalen) { return x.toFixed(decimalen == null ? 1 : decimalen).replace('.', ','); };
BB.fmtTijd = function (ms) {
  const s = ms / 1000;
  if (s < 60) return BB.komma(s, 2) + ' s';
  const m = Math.floor(s / 60);
  return m + ':' + (s - m * 60).toFixed(2).padStart(5, '0').replace('.', ',');
};
BB.fmtKlok = function (ms) {
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
BB.fmtDatum = function (iso) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Telefoon of tablet: daar tik je op knoppen op het scherm in plaats van op toetsen.
BB.aanraak = function () { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches; };
// Kiest de tekst die bij het apparaat past: de eerste voor een toetsenbord, de tweede voor een aanraakscherm.
BB.zeg = function (toetsenbord, aanraak) { return BB.aanraak() ? aanraak : toetsenbord; };
// Een knop met de toets erbij die hetzelfde doet. Op een aanraakscherm staat die toets er niet bij.
BB.metToets = function (tekst, toets) { return BB.aanraak() ? tekst : tekst + ' (' + toets + ')'; };
BB.TYP = BB.zeg('Typ het antwoord en druk op Enter.', 'Tik het antwoord in en tik op OK.');

if (typeof document !== 'undefined') {
  BB.el = function (tag, attrs, ...kinderen) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const kind of kinderen.flat(Infinity)) {
      if (kind == null || kind === false) continue;
      e.append(kind.nodeType ? kind : document.createTextNode(String(kind)));
    }
    return e;
  };
  BB.leeg = function (knoop) { while (knoop.firstChild) knoop.firstChild.remove(); return knoop; };

  // Alles wat doorloopt (klokken, wachttijden, toetsen) stopt zodra er een nieuw scherm komt.
  BB.opruim = [];
  BB.toets = null;
  BB.ruimOp = function () {
    BB.toets = null;
    for (const f of BB.opruim.splice(0)) f();
  };
  BB.later = function (f, ms) {
    const id = setTimeout(f, ms);
    BB.opruim.push(() => clearTimeout(id));
  };
  BB.scherm = function (doel, ...kinderen) {
    BB.ruimOp();
    const s = BB.el('div', { class: 'scherm' }, kinderen);
    BB.leeg(doel).append(s);
    window.scrollTo(0, 0);
    return s;
  };

  // Ingedrukt houden telt niet, anders vliegt iemand per ongeluk door een uitleg heen.
  document.addEventListener('keydown', e => { if (BB.toets && !e.repeat) BB.toets(e); });
  // Enter pas na een halve seconde, zodat de laatste Enter van een onderdeel het volgende scherm niet overslaat.
  BB.opEnter = function (f) {
    BB.later(() => { BB.toets = e => { if (e.key === 'Enter') { e.preventDefault(); f(); } }; }, 500);
  };

  BB.maakBalk = function () {
    const vul = BB.el('div', { class: 'balk-vul' }), tekst = BB.el('span', { class: 'balk-tekst' });
    return { el: BB.el('div', { class: 'balk' }, BB.el('div', { class: 'balk-spoor' }, vul), tekst), vul, tekst };
  };
  // Aftelklok. Rekent met de echte tijd, dus een trage browser kost geen seconden.
  BB.klok = function (balk, seconden, klaar) {
    const start = performance.now();
    let gestopt = false;
    const id = setInterval(tik, 100);
    function stop() { gestopt = true; clearInterval(id); }
    function tik() {
      const over = Math.max(0, seconden * 1000 - (performance.now() - start));
      balk.vul.style.width = (over / (seconden * 10)) + '%';
      balk.tekst.textContent = BB.fmtKlok(over);
      balk.el.classList.toggle('krap', over < 10000);
      if (over <= 0 && !gestopt) { stop(); klaar(); }
    }
    BB.opruim.push(stop);
    tik();
    return { stop };
  };

  // Invoerveld. Enter geeft het antwoord door. schoon() haalt weg wat er niet in hoort.
  BB.invoerVeld = function (opEnter, schoon, cijfers) {
    const veld = BB.el('input', { class: 'getalveld', type: 'text', inputmode: BB.aanraak() ? 'none' : cijfers ? 'numeric' : 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Antwoord' });
    // geef: het antwoord insturen. Enter doet dat, en de knop OK van de toetsen op het scherm ook.
    veld.geef = () => { if (!veld.disabled && veld.value !== '' && veld.value !== '-') opEnter(veld.value); };
    veld.addEventListener('input', () => { veld.value = schoon(veld.value); });
    veld.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation(); // anders ziet het volgende scherm dezelfde Enter
      if (!e.repeat) veld.geef();
    });
    veld.addEventListener('blur', () => BB.later(() => {
      if (veld.isConnected && document.activeElement === document.body) veld.focus();
    }, 50));
    return veld;
  };
  BB.getalVeld = function (opEnter, alleenCijfers) {
    return BB.invoerVeld(opEnter, v => v.replace(alleenCijfers ? /[^0-9]/g : /[^0-9-]/g, ''), true);
  };

  // Toetsen op het scherm, voor telefoons en tablets. Het cijfertoetsenbord van een iPhone heeft geen Enter,
  // dus daar kun je een antwoord anders niet insturen. Op een computer blijven ze verborgen (zie .toetsen).
  // tekens: de toetsen in volgorde. De 0 komt tussen Wis en OK in, zoals op een telefoon.
  BB.toetsen = function (veld, tekens) {
    const knop = (tekst, klasse, klik, label) => BB.el('button', { type: 'button', class: 'toets' + klasse, 'aria-label': label, onclick: () => { if (!veld.disabled) klik(); } }, tekst);
    const teken = t => knop(t, '', () => { veld.value += t; });
    const nul = tekens.includes('0'), rest = tekens.replace('0', '').split('');
    return BB.el('div', { class: 'toetsen' + (rest.length > 9 ? ' letters' : '') },
      rest.map(teken),
      knop('⌫', ' wis', () => { veld.value = veld.value.slice(0, -1); }, 'Wis'),
      nul ? teken('0') : null,
      knop('OK', ' ok' + (nul ? '' : ' dubbel'), veld.geef));
  };
  BB.CIJFERS = '1234567890';
}
