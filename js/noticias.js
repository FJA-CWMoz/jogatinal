/**
 * JOGATINAL - noticias.js
 * Render das notícias, artigos do blog e cobertura dos campeonatos
 */

import { api } from './api.js';
import { escaparHTML } from './utils.js';

export async function carregarNoticias(containerId = 'container-noticias-lista', limite = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const noticias = await api.obterNoticias();
    const lista = limite ? noticias.slice(0, limite) : noticias;

    container.innerHTML = lista.map(post => `
      <article class="noticia-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge-estado destaque">${escaparHTML(post.categoria)}</span>
          <span class="texto-muted" style="font-size: var(--tipo-micro);"><i class="fa-solid fa-clock fa-btn-icon"></i> ${post.leituraMinutos} min de leitura</span>
        </div>

        <h3 class="noticia-titulo">${escaparHTML(post.titulo)}</h3>
        <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin: 0;">${escaparHTML(post.resumo)}</p>

        <div class="metadados-linha" style="margin-top: auto; padding-top: var(--espaco-sm); border-top: 1px solid var(--cor-borda); font-size: var(--tipo-micro);">
          <span><i class="fa-solid fa-user-pen fa-btn-icon fa-verde"></i> ${escaparHTML(post.autor)}</span>
          <span class="metadados-separador">·</span>
          <span><i class="fa-solid fa-calendar-days fa-btn-icon fa-dourado"></i> ${escaparHTML(post.data)}</span>
        </div>
      </article>
    `).join('');
  } catch (erro) {
    console.error('[Notícias] Erro ao carregar notícias:', erro);
    if (container) {
      container.innerHTML = '<p class="texto-muted">Não foi possível carregar as notícias.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('container-noticias-lista')) {
    carregarNoticias('container-noticias-lista');
  }
  if (document.getElementById('container-noticias-home')) {
    carregarNoticias('container-noticias-home', 3);
  }
});
