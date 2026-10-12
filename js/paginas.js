/**
 * JOGATINAL - paginas.js
 * Inicialização compartilhada das páginas institucionais e injeção de dados de contacto via JSON
 */

import { api } from './api.js';
import { escaparHTML, mostrarToast } from './utils.js';

export async function inicializarPaginas() {
  // 1. Atualizar ano corrente no footer
  const elAno = document.getElementById('ano-corrente');
  if (elAno) {
    elAno.textContent = new Date().getFullYear();
  }

  // 2. Se estiver na página de contactos, popular cartões via config.json
  const containerContactos = document.getElementById('container-contactos-cards');
  if (containerContactos) {
    try {
      const config = await api.obterConfig();
      const n = config.negocio;

      containerContactos.innerHTML = `
        <div class="contacto-card">
          <div class="contacto-icone-wrapper"><i class="fa-brands fa-whatsapp fa-verde"></i></div>
          <h4 class="contacto-titulo">WhatsApp & Chamadas</h4>
          <p class="contacto-valor">${escaparHTML(n.whatsappFormatado || '+258 85 339 0327')}</p>
          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-top: auto;">
            Linha direta para chamadas e WhatsApp: suporte, agendamento de jogos e inscrições.
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: var(--espaco-sm);">
            <a href="https://wa.me/${n.whatsapp}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-verde" style="flex: 1; min-width: 120px; justify-content: center;">
              <i class="fa-brands fa-whatsapp fa-btn-icon"></i> WhatsApp
            </a>
            <a href="tel:+${n.whatsapp}" class="btn btn-sm btn-outline" style="flex: 1; min-width: 100px; justify-content: center;">
              <i class="fa-solid fa-phone fa-btn-icon"></i> Ligar
            </a>
          </div>
        </div>

        <div class="contacto-card">
          <div class="contacto-icone-wrapper"><i class="fa-solid fa-envelope fa-azul"></i></div>
          <h4 class="contacto-titulo">Correio Eletrónico</h4>
          <p class="contacto-valor">${escaparHTML(n.email)}</p>
          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-top: auto;">
            Para parcerias desportivas, patrocínios de torneios e assuntos corporativos.
          </p>
          <a href="mailto:${escaparHTML(n.email)}" class="btn btn-sm btn-secundario" style="margin-top: var(--espaco-sm); justify-content: center;">
            <i class="fa-solid fa-paper-plane fa-btn-icon"></i> Enviar Email
          </a>
        </div>

        <div class="contacto-card">
          <div class="contacto-icone-wrapper"><i class="fa-solid fa-location-dot fa-verde"></i></div>
          <h4 class="contacto-titulo">Localização & Arena</h4>
          <p class="contacto-valor">${escaparHTML(n.localizacao)}</p>
          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-top: auto;">
            Na zona de Matola Muhalaze / Ngolhoza, com paragens de chapa e transporte local acessível.
          </p>
          <span class="texto-muted" style="font-size: var(--tipo-micro);"><i class="fa-solid fa-square-parking fa-btn-icon"></i> Estacionamento seguro no local</span>
        </div>

        <div class="contacto-card">
          <div class="contacto-icone-wrapper" style="background-color: rgba(255, 0, 0, 0.15); border-color: rgba(255, 0, 0, 0.35); color: #ff3333;"><i class="fa-brands fa-youtube"></i></div>
          <h4 class="contacto-titulo">Canal Oficial no YouTube</h4>
          <p class="contacto-valor" style="color: #ff4d4d;">${escaparHTML(n.youtubeNome || '@JOGATINAL-MZ')}</p>
          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-top: auto;">
            Transmissões ao vivo, melhores momentos dos torneios da arena, golos e jogadas memoráveis.
          </p>
          <a href="${escaparHTML(n.youtube || 'https://www.youtube.com/@JOGATINAL-MZ')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="margin-top: var(--espaco-sm); justify-content: center; background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%); color: #ffffff; font-weight: 800;">
            <i class="fa-brands fa-youtube fa-btn-icon"></i> Subscrever Canal
          </a>
        </div>
      `;
    } catch (erro) {
      console.error('[Contactos] Falha ao carregar contactos:', erro);
    }
  }

  // 3. Vincular formulário rápido de contacto se existir
  const formContacto = document.getElementById('form-mensagem-contacto');
  if (formContacto) {
    formContacto.addEventListener('submit', (e) => {
      e.preventDefault();
      mostrarToast('Mensagem enviada! Entraremos em contacto pelo teu WhatsApp/Chamada em breve.', 'sucesso');
      formContacto.reset();
    });
  }

  // 4. Funcionalidade de 1 Toque para Copiar M-Pesa / e-Mola (Mobile-First)
  document.addEventListener('click', (e) => {
    const btnCopiar = e.target.closest('.btn-copiar-acao');
    if (btnCopiar) {
      const texto = btnCopiar.dataset.copiar || '853390327';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(() => {
          mostrarToast(`Número ${texto} copiado para a área de transferência!`, 'sucesso');
        }).catch(() => {
          mostrarToast(`Número de Contacto: ${texto}`, 'info');
        });
      } else {
        mostrarToast(`Número de Contacto: ${texto}`, 'info');
      }
    }
  });

  // 5. Se estiver na página de ranking.html, carregar ranking completo
  const containerRankingCompleto = document.getElementById('container-ranking-completo');
  if (containerRankingCompleto) {
    try {
      const ranking = await api.obterRanking();
      containerRankingCompleto.innerHTML = `
        <div class="ranking-tabela-container">
          <div class="ranking-lista">
            ${ranking.map(r => {
              let classeTop = '';
              let coroaHtml = '';
              if (r.posicao === 1) {
                classeTop = 'top-1';
                coroaHtml = '<i class="fa-solid fa-crown fa-dourado fa-btn-icon"></i>';
              } else if (r.posicao === 2) {
                classeTop = 'top-2';
                coroaHtml = '<i class="fa-solid fa-medal" style="color: #cbd5e1; margin-right: 0.25rem;"></i>';
              } else if (r.posicao === 3) {
                classeTop = 'top-3';
                coroaHtml = '<i class="fa-solid fa-medal" style="color: #d97706; margin-right: 0.25rem;"></i>';
              }

              return `
                <div class="ranking-linha ${classeTop}">
                  <div class="ranking-posicao">${coroaHtml}#${r.posicao}</div>
                  <div class="ranking-jogador-info">
                    <span class="ranking-jogador-nome">${escaparHTML(r.nome)}</span>
                    <span class="ranking-jogador-nick">@${escaparHTML(r.nickname)}</span>
                    <small class="texto-muted">${escaparHTML(r.bairro)} · <i class="fa-solid fa-gamepad fa-verde"></i> ${escaparHTML(r.jogoPrincipal)} (${r.vitorias}V / ${r.derrotas}D)</small>
                  </div>
                  <div style="text-align: right;">
                    <span class="texto-muted" style="font-size: var(--tipo-micro); text-transform: uppercase;">Pontos</span>
                    <div class="ranking-pontos">${r.pontos}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      console.error('[Ranking] Erro ao carregar ranking:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', inicializarPaginas);
