/**
 * JOGATINAL - menu.js
 * Controlo do menu hamburger mobile, acessibilidade e destaque do link ativo
 */

export function inicializarMenu() {
  const btnToggle = document.getElementById('btn-menu-toggle');
  const drawer = document.getElementById('mobile-menu-drawer');
  const iconeHamburger = document.getElementById('icone-hamburger');

  if (btnToggle && drawer) {
    btnToggle.addEventListener('click', () => {
      const aberto = drawer.classList.toggle('aberto');
      btnToggle.setAttribute('aria-expanded', String(aberto));

      if (aberto) {
        document.body.style.overflow = 'hidden';
        if (iconeHamburger) iconeHamburger.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      } else {
        document.body.style.overflow = '';
        if (iconeHamburger) iconeHamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
    });

    // Fecha menu ao clicar num link
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('aberto');
        btnToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (iconeHamburger) iconeHamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  // Destacar o link ativo na navegação
  const caminhoAtual = window.location.pathname;
  const links = document.querySelectorAll('.nav-link, .mobile-nav-item a');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Normaliza rotas para verificar se corresponde à página atual
    const urlAtual = caminhoAtual.endsWith('/') ? `${caminhoAtual}index.html` : caminhoAtual;
    if (urlAtual.endsWith(href) || (href === 'index.html' && (urlAtual.endsWith('/') || urlAtual === ''))) {
      link.classList.add('ativo');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('ativo');
      link.removeAttribute('aria-current');
    }
  });
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarMenu);
} else {
  inicializarMenu();
}
