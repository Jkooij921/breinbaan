// Alles blijft op deze computer staan, in de opslag van de browser.
BB.opslag = {
  lees(sleutel, standaard) {
    try {
      const v = localStorage.getItem('bb.' + sleutel);
      return v == null ? standaard : JSON.parse(v);
    } catch (e) {
      return standaard;
    }
  },
  schrijf(sleutel, waarde) {
    try {
      localStorage.setItem('bb.' + sleutel, JSON.stringify(waarde));
      return true;
    } catch (e) {
      return false;
    }
  },
};
