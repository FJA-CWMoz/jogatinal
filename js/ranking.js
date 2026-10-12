/**
 * JOGATINAL - ranking.js
 * Renderização do Leaderboard oficial com destaque dourado para o Top 3
 */

import { api } from './api.js';
import { escaparHTML } from './utils.js';

export async function carregarRanking(containerId = 'container-ranking-lista', limite = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const ranking = await api.obterRanking();
    const lista = limite ? ranking.slice(0, limite) : ranking;

    container.innerHTML = lista.map(jogador => {
      let classeTop = '';
      if (jogador.posicao === 1) classeTop = 'top-1';
      else if (jogador.posicao === 2) classeTop = 'top-2';
      else if (jogador.posicao === 3) classeTop = 'top-3';

      let coroa = '';
      if (jogador.posicao === 1) coroa = '<i class="fa-solid fa-crown fa-dourado fa-btn-icon"></i>';
      else if (jogador.posicao === 2) coroa = '<i class="fa-solid fa-medal" style="color: #cbd5e1; margin-right: 0.25rem;"></i>';
      else if (jogador.posicao === 3) coroa = '<i class="fa-solid fa-medal" style="color: #d97706; margin-right: 0.25rem;"></i>';

      return `
        <div class="ranking-linha ${classeTop}">
          <div class="ranking-posicao">${coroa}#${jogador.posicao}</div>
          
          <div class="ranking-jogador-info">
            <div class="ranking-jogador-nome">
              ${escaparHTML(jogador.nome)}
              <span class="ranking-jogador-nick">"${escaparHTML(jogador.nickname)}"</span>
            </div>
            <span class="texto-muted" style="font-size: var(--tipo-micro);">
              <i class="fa-solid fa-location-dot fa-verde"></i> ${escaparHTML(jogador.bairro)}, ${escaparHTML(jogador.cidade)} · <i class="fa-solid fa-gamepad fa-dourado"></i> ${escaparHTML(jogador.jogoPrincipal)}
            </span>
          </div>

          <div style="display: none; font-size: var(--tipo-pequeno);" class="desktop-only-stat">
            <span class="texto-muted">Aproveitamento:</span>
            <strong>${escaparHTML(jogador.aproveitamento || '75%')}</strong>
          </div>

          <div style="text-align: right;">
            <div class="ranking-pontos">${jogador.pontos.toLocaleString('pt-MZ')}</div>
            <div style="font-size: var(--tipo-micro); color: var(--cor-texto-suave);">
              <span style="color: var(--cor-verde-hover); font-weight: 600;">${jogador.vitorias}V</span> - 
              <span style="color: var(--cor-vermelho-erro);">${jogador.derrotas}D</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (erro) {
    console.error('[Ranking] Falha ao carregar ranking:', erro);
    if (container) {
      container.innerHTML = '<p class="texto-muted">Não foi possível carregar o ranking.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('container-ranking-lista')) {
    carregarRanking('container-ranking-lista');
  }
  if (document.getElementById('container-ranking-home')) {
    carregarRanking('container-ranking-home', 5);
  }
});
