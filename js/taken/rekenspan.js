// Rekenspan: sommen oplossen en tussendoor letters onthouden.
// In onderzoek heet dit een "operation span"-taak. Het is de gangbare manier om werkgeheugen te meten met rekenen:
// je moet iets vasthouden terwijl je met iets anders bezig bent. Snel sommen maken alleen meet vooral tempo.
BB.rekenspan = (function () {
  const el = BB.el;
  const LETTERS = 'FHJKLNPQRSTY'.split('');
  const RONDES = 6, START = 3, MIN = 2, MAX = 8, SECONDEN = 8;
  // Wie de sommen laat liggen, kan de letters makkelijk herhalen. Onder deze grens telt de score daarom niet.
  const GRENS = 0.8;

  function maakSom(rnd) {
    for (;;) {
      const c = BB.rint(rnd, 1, 9), plus = rnd() < 0.5;
      let tekst, basis;
      if (rnd() < 0.5) {
        const a = BB.rint(rnd, 2, 9), b = BB.rint(rnd, 2, 5);
        tekst = '(' + a + ' × ' + b + ')';
        basis = a * b;
      } else {
        const d = BB.rint(rnd, 2, 5);
        basis = BB.rint(rnd, 2, 9);
        tekst = '(' + (d * basis) + ' ÷ ' + d + ')';
      }
      const antwoord = plus ? basis + c : basis - c;
      if (antwoord >= 1) return { tekst: tekst + (plus ? ' + ' : ' − ') + c, antwoord };
    }
  }

  // Gaat een ronde goed, dan komt er een letter bij. Gaat hij fout, dan gaat er een af.
  function speel(doel, rnd, klaar) {
    const lengtes = [], goed = [];
    let lengte = START, somGoed = 0, somTotaal = 0, reeks = [], nr = 0, huidig = null, klok = null, fase = '';
    const teller = el('p', { class: 'teller' }), balk = BB.maakBalk(), beeld = el('div', { class: 'som' }), hint = el('p', { class: 'hint' });
    const getal = BB.getalVeld(v => naSom(+v === huidig.antwoord));
    const letters = BB.invoerVeld(naLetters, v => v.toUpperCase().replace(/[^A-Z]/g, ''));
    const geen = el('button', { class: 'tekstknop', type: 'button', onclick: () => naLetters('') }, 'Weet ik niet meer');
    BB.scherm(doel, teller, balk.el, beeld, getal, BB.toetsen(getal, BB.CIJFERS), letters, BB.toetsen(letters, LETTERS.join('')), geen, hint);
    ronde();

    function toon(nieuw) {
      fase = nieuw;
      getal.hidden = nieuw !== 'som';
      letters.hidden = geen.hidden = nieuw !== 'letters';
      balk.el.style.visibility = nieuw === 'som' ? '' : 'hidden';
    }
    function ronde() {
      reeks = BB.schud(rnd, LETTERS).slice(0, lengte);
      nr = 0;
      teller.textContent = 'Ronde ' + (lengtes.length + 1) + ' van ' + RONDES + ', ' + lengte + ' letters';
      som();
    }
    function som() {
      huidig = maakSom(rnd);
      beeld.className = 'som';
      beeld.textContent = huidig.tekst + ' =';
      hint.textContent = BB.zeg('Reken uit en druk op Enter.', 'Reken uit en tik op OK.');
      getal.value = '';
      toon('som');
      getal.focus();
      klok = BB.klok(balk, SECONDEN, () => naSom(false));
    }
    function naSom(juist) {
      if (fase !== 'som') return;
      klok.stop();
      somTotaal++;
      if (juist) somGoed++;
      toon('kijk');
      beeld.className = 'som letter';
      beeld.textContent = reeks[nr++];
      hint.textContent = 'Onthoud deze letter.';
      BB.later(() => { beeld.textContent = ''; BB.later(nr < reeks.length ? som : vraag, 300); }, 1000);
    }
    function vraag() {
      beeld.className = 'som';
      hint.textContent = BB.zeg('Typ de letters in de volgorde waarin je ze zag. Druk daarna op Enter.', 'Tik de letters aan in de volgorde waarin je ze zag. Tik daarna op OK.');
      letters.value = '';
      toon('letters');
      letters.focus();
    }
    function naLetters(v) {
      if (fase !== 'letters') return;
      const juist = v === reeks.join('');
      lengtes.push(lengte);
      goed.push(juist);
      lengte = BB.klem(lengte + (juist ? 1 : -1), MIN, MAX);
      toon('kijk');
      beeld.className = 'som ' + (juist ? 'tekst-goed' : 'tekst-fout');
      beeld.textContent = juist ? 'Goed' : reeks.join(' ');
      hint.textContent = juist ? '' : 'Dit waren de letters.';
      BB.later(() => {
        if (lengtes.length < RONDES) return ronde();
        klaar({
          span: BB.cijfers.schat(lengtes.concat(lengte), goed),
          langste: Math.max(0, ...lengtes.filter((l, i) => goed[i])),
          somGoed, somTotaal,
          telt: somGoed / somTotaal >= GRENS,
        });
      }, juist ? 700 : 1800);
    }
  }

  return {
    maakSom, speel, GRENS,
    uitleg: [
      'Je krijgt een som. ' + BB.TYP + ' Je hebt ' + SECONDEN + ' seconden per som.',
      'Na elke som zie je kort een letter. Die onthoud je.',
      BB.zeg('Na een paar sommen typ je alle letters in de volgorde waarin je ze zag.', 'Na een paar sommen tik je alle letters aan in de volgorde waarin je ze zag.'),
      'Gaat het goed, dan komt er een letter bij. Je speelt ' + RONDES + ' rondes.',
      'Je moet minstens ' + Math.round(GRENS * 100) + '% van de sommen goed hebben. Anders telt je score niet.',
    ],
  };
})();
