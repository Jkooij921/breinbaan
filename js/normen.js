// VOORLOPIGE NORMEN. Niet geijkt op echte mensen.
// Bijna elk getal hier is een aanname over hoe een gemiddelde volwassene scoort.
// Vervang ze zodra er eerste pogingen van genoeg mensen zijn (richtlijn uit het rapport: 200 of meer).
// Verander je iets, hoog dan het versienummer op. Elke opgeslagen uitslag onthoudt met welke versie hij is berekend.
BB.NORMEN = {
  versie: '0.2-voorlopig',

  // Patronen en cijferreeksen: aangenomen moeilijkheid per niveau (0 tot en met 5).
  // 0 betekent: een gemiddelde volwassene heeft de helft kans. 1 betekent: iemand die 1 standaarddeviatie
  // boven het gemiddelde zit heeft de helft kans.
  moeilijkheid: {
    patronen: [-2.0, -1.0, -0.2, 0.4, 1.0, 1.7],
    reeksen: [-2.0, -1.2, -0.4, 0.3, 0.9, 1.6],
  },
  gokkans: { patronen: 1 / 6, reeksen: 0 },
  helling: 1.5,

  // Cijfers onthouden: gemiddelde span. Vooruit en achteruit komen uit Woods e.a. 2011 (voorgelezen cijfers,
  // 763 volwassenen). De spreiding en de gesorteerde ronde zijn aannames.
  onthouden: {
    vooruit: { gem: 6.4, sd: 1.2 },
    achteruit: { gem: 4.9, sd: 1.3 },
    gesorteerd: { gem: 5.5, sd: 1.3 },
    samenhang: 0.5,
  },

  // Aantal goede sommen in 3 minuten en netto score bij symbolen zoeken in 2 minuten. Beide een aanname.
  sommen: { gem: 23, sd: 6.5 },
  symbolen: { gem: 34, sd: 8 },

  // Hoe sterk de onderdelen onderling samenhangen. Nodig om het gewogen gemiddelde op de IQ-schaal te zetten.
  samenhangOnderdelen: 0.40,

  // Hoe zwaar elk onderdeel meetelt. Redeneren telt het zwaarst. Tempo hangt het minst samen met denkvermogen
  // en het meest met het apparaat, dus dat telt licht. Een ronde cijfers onthouden is een wankel meetpunt.
  gewicht: { patronen: 1, reeksen: 1, cijfers: 0.5, sommen: 0.25, symbolen: 0.25 },

  // Marge rond de schatting per testlengte in minuten (95 van de 100 keer).
  // Verwachting op basis van vergelijkbare tests, nog niet zelf gemeten.
  marge: { 5: 18, 10: 17, 25: 15 },
  margeSmal: 8, // twee van de drie keer, bij de test van 25 minuten

  ondergrens: 70,
  bovengrens: 145,
};
