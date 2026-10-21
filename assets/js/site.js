// Comportements du site (menu, onglets)
(function () {
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('.has-sub > a').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (window.innerWidth <= 960) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });

  document.querySelectorAll('[data-tabs]').forEach((tabs) => {
    const panels = document.querySelector(`[data-panels="${tabs.dataset.tabs}"]`);
    tabs.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b === btn));
        panels.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === btn.dataset.tab));
      });
    });
  });

  document.querySelectorAll('a[href="#"]').forEach((a) => {
    if (!a.dataset.ask && !a.hasAttribute('data-open-chat')) a.addEventListener('click', (e) => e.preventDefault());
  });
})();
