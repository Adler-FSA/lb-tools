(() => {
  'use strict';

  /*
   * FSA WINDOWS DESKTOP UX TEMPLATE
   *
   * Zweck:
   * Desktop-spezifische Texte/Anpassungen getrennt vom gemeinsamen Produktkern halten.
   *
   * Hier ausschließlich gezielte Anpassungen eintragen, die in der installierten
   * Windows-Version anders sein müssen als in Browser/PWA/Web-Auslieferungen.
   *
   * Vor Freigabe immer gegen 04-abnahme-testmatrix.md prüfen.
   */

  const PRODUCT_NAME = '{{PRODUCT_NAME}}';

  function applyDesktopUx() {
    document.documentElement.dataset.fsaDesktop = 'windows';

    // PRODUKTSPEZIFISCH:
    // Gezielt Elemente über stabile IDs/data-Attribute ansprechen.
    // Keine pauschalen Text-Ersetzungen über den gesamten DOM verwenden.
    // Beispiel:
    // const hint = document.querySelector('[data-desktop-storage-hint]');
    // if (hint) hint.textContent = 'Deine Daten werden lokal in der installierten Windows-Anwendung geführt.';

    document.dispatchEvent(new CustomEvent('fsa:desktop-ready', {
      detail: { platform: 'windows', product: PRODUCT_NAME }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDesktopUx, { once: true });
  } else {
    applyDesktopUx();
  }
})();
