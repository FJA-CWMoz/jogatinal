/**
 * JOGATINAL - torneios.js
 * Módulo de Torneios, Desafios Multijogos e Catálogo A-Z de Jogos com Desafio na Arena
 */

import { api } from './api.js';
import { formatarMT, escaparHTML, mostrarToast, debounce } from './utils.js';
import { CONFIG } from './config.js';

let todosTorneios = [];
let todoHistorico = [];
let todosJogos = [];
let todoRanking = [];

let categoriaTorneioAtiva = 'todos';
let consolaJogoAtiva = 'todas';
let termoBuscaJogo = '';

export async function inicializarPaginaTorneios() {
  try {
    const [torneios, historico, jogos, ranking] = await Promise.all([
      api.obterTorneios().catch(() => []),
      api.obterHistoricoTorneios().catch(() => []),
      api.obterJogos().catch(() => []),
      api.obterRanking().catch(() => [])
    ]);

    todosTorneios = torneios;
    todoHistorico = historico;
    todosJogos = jogos;
    todoRanking = ranking;

    // 1. Torneios Oficiais com Inscrições Abertas
    renderizarTorneios();
    vincularFiltrosTorneios();

    // 2. Histórico de Torneios Já Acontecidos & Canal YouTube
    renderizarHistoricoTorneios();

    // 3. Lista de Jogos com Desafio (A a Z por Consola)
    renderizarJogosDesafio();
    vincularFiltrosJogosDesafio();

    // 4. Ranking dos Campeões
    renderizarRanking();
  } catch (erro) {
    console.error('[Torneios] Erro na inicialização:', erro);
  }
}

/* ==========================================================================
   1. TORNEIOS & CAMPEONATOS OFICIAIS
   ========================================================================== */

function vincularFiltrosTorneios() {
  const botoesFiltro = document.querySelectorAll('.btn-filtro-torneio');
  botoesFiltro.forEach(btn => {
    btn.addEventListener('click', () => {
      botoesFiltro.forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      categoriaTorneioAtiva = btn.dataset.categoria || 'todos';
      renderizarTorneios();
    });
  });
}

function renderizarTorneios() {
  const container = document.getElementById('container-lista-torneios');
  if (!container) return;

  let lista = todosTorneios;
  if (categoriaTorneioAtiva !== 'todos') {
    lista = lista.filter(t => t.categoria === categoriaTorneioAtiva);
  }

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--espaco-xl); background-color: var(--cor-superficie); border-radius: var(--raio-lg); border: 1px dashed var(--cor-borda);">
        <p class="texto-muted" style="margin-bottom: var(--espaco-sm);">Nenhum torneio agendado nesta categoria de momento.</p>
        <a href="https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=Olá JOGATINAL! Gostaria de propor um desafio 1v1 na arena..." target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-verde">
          <i class="fa-brands fa-whatsapp fa-btn-icon"></i> Propor Desafio 1v1 na Arena via WhatsApp
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = lista.map(t => {
    const vagasRestantes = Math.max(0, t.vagasTotal - t.vagasOcupadas);
    const esgotado = t.estado === 'esgotado' || vagasRestantes <= 0;
    const poucasVagas = !esgotado && vagasRestantes <= 8;
    const percentualVagas = Math.min(100, Math.round((t.vagasOcupadas / t.vagasTotal) * 100));

    let badgeHtml = '<span class="badge-estado aberto"><i class="fa-solid fa-circle-check fa-btn-icon"></i> Inscrições Abertas</span>';
    if (esgotado) {
      badgeHtml = '<span class="badge-estado esgotado"><i class="fa-solid fa-ban fa-btn-icon"></i> Vagas Esgotadas</span>';
    } else if (poucasVagas) {
      badgeHtml = `<span class="badge-estado destaque"><i class="fa-solid fa-triangle-exclamation fa-btn-icon"></i> Restam apenas ${vagasRestantes} vagas!</span>`;
    }

    const msgInscricao = encodeURIComponent(
      `Olá JOGATINAL! Quero inscrever-me no torneio / desafio:\n` +
      `🏆 Torneio: ${t.titulo}\n` +
      `🎮 Jogo: ${t.jogo} (${t.consola})\n` +
      `📅 Data: ${t.data}\n` +
      `🎟️ Taxa: ${formatarMT(t.taxaInscricao)}\n\n` +
      `Meu Nome / Nickname de Jogador é: `
    );

    const linkWhatsApp = `https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=${msgInscricao}`;

    return `
      <article class="card card-destaque" style="display: flex; flex-direction: column; justify-content: space-between; gap: var(--espaco-sm); width: 100%; box-sizing: border-box; overflow: hidden;">
        <div>
          ${t.imagem ? `
            <div style="width: 100%; height: 160px; border-radius: var(--raio-md); overflow: hidden; background-color: var(--cor-fundo-secundario); margin-bottom: var(--espaco-xs);">
              <img src="${escaparHTML(t.imagem)}" alt="${escaparHTML(t.titulo)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--espaco-xs); margin-bottom: 4px; flex-wrap: wrap;">
            <div>
              ${badgeHtml}
              <h3 style="font-family: var(--fonte-subtitulos); font-size: 1.2rem; font-weight: 700; margin-top: 6px; line-height: 1.25; word-break: break-word;">${escaparHTML(t.titulo)}</h3>
            </div>
            <div style="text-align: right; margin-left: auto;">
              <span class="texto-muted" style="font-size: var(--tipo-micro); text-transform: uppercase;">Prémio Total</span>
              <div class="preco-bebas" style="font-size: 1.6rem; color: var(--cor-dourado);">${escaparHTML(t.premioTotal)}</div>
            </div>
          </div>

          <div class="metadados-linha" style="margin-bottom: 6px;">
            <span><i class="fa-solid fa-gamepad fa-verde"></i> ${escaparHTML(t.jogo)}</span>
            <span class="metadados-separador">·</span>
            <span><i class="fa-brands fa-playstation fa-dourado"></i> ${escaparHTML(t.consola)}</span>
          </div>

          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-bottom: 4px; line-height: 1.4;">
            <i class="fa-solid fa-calendar-days fa-verde"></i> <strong>Data:</strong> ${escaparHTML(t.data)} às ${escaparHTML(t.hora || '10h00')}<br />
            <i class="fa-solid fa-location-dot fa-dourado"></i> <strong>Local:</strong> ${escaparHTML(t.local)}
          </p>

          <p style="font-size: var(--tipo-micro); color: var(--cor-texto-muted); margin-bottom: var(--espaco-xs); line-height: 1.35;">
            <i class="fa-solid fa-clipboard-list"></i> ${escaparHTML(t.regrasResumo)}
          </p>
        </div>

        <div style="border-top: 1px solid var(--cor-borda); padding-top: var(--espaco-sm);">
          <div style="display: flex; justify-content: space-between; font-size: var(--tipo-micro); margin-bottom: 4px;">
            <span class="texto-muted">Vagas: ${t.vagasOcupadas} de ${t.vagasTotal}</span>
            <span style="font-weight: 600; color: ${esgotado ? 'var(--cor-texto-muted)' : 'var(--cor-verde-marca)'};">${percentualVagas}% preenchido</span>
          </div>
          <div class="progresso-container" style="height: 6px; margin-bottom: var(--espaco-sm);">
            <div class="progresso-barra ${percentualVagas >= 90 ? 'nivel-critico' : percentualVagas >= 75 ? 'nivel-alerta' : ''}" style="width: ${percentualVagas}%;"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--espaco-xs); flex-wrap: wrap;">
            <div>
              <span class="texto-muted" style="font-size: var(--tipo-micro);">Inscrição:</span>
              <strong style="color: var(--cor-texto-principal); font-size: 1.1rem; display: block;">${formatarMT(t.taxaInscricao)}</strong>
            </div>

            ${esgotado ? `
              <button class="btn btn-sm btn-secundario" disabled><i class="fa-solid fa-ban fa-btn-icon"></i> Esgotado</button>
            ` : `
              <a href="${linkWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-verde" style="white-space: nowrap;">
                <i class="fa-brands fa-whatsapp fa-btn-icon"></i> Inscrever via WhatsApp
              </a>
            `}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ==========================================================================
   2. HISTÓRICO DE TORNEIOS ANTERIORES & CANAL YOUTUBE
   ========================================================================== */

function renderizarHistoricoTorneios() {
  const container = document.getElementById('container-historico-torneios');
  if (!container) return;

  if (todoHistorico.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--espaco-xl); background-color: var(--cor-superficie); border-radius: var(--raio-lg); border: 1px dashed var(--cor-borda);">
        <p class="texto-muted">Carregando registos de edições anteriores da arena...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = todoHistorico.map(h => {
    const youtubeUrl = h.youtubeUrl || CONFIG.YOUTUBE_URL || 'https://www.youtube.com/@JOGATINAL-MZ';
    const partidasHtml = (h.partidasDestaque || []).map(p => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--cor-borda); font-size: var(--tipo-micro);">
        <span><strong style="color: var(--cor-dourado);">${escaparHTML(p.fase)}:</strong> ${escaparHTML(p.confronto)}</span>
        <span class="texto-muted" style="font-size: 0.7rem;"><i class="fa-brands fa-youtube fa-vermelho" style="color: #ff0000;"></i> ${escaparHTML(p.tempo)}</span>
      </div>
    `).join('');

    return `
      <article class="card card-historico-torneio" style="display: flex; flex-direction: column; justify-content: space-between; gap: var(--espaco-sm); width: 100%; box-sizing: border-box; border-left: 3px solid var(--cor-dourado); background: linear-gradient(145deg, rgba(22, 28, 43, 0.95) 0%, rgba(16, 20, 31, 0.95) 100%);">
        <div>
          <div style="position: relative; width: 100%; height: 160px; border-radius: var(--raio-md); overflow: hidden; background-color: var(--cor-fundo-secundario); margin-bottom: var(--espaco-xs);">
            <img src="${escaparHTML(h.imagem)}" alt="${escaparHTML(h.titulo)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/assets/images/hero_championship_matola_1790914747226.jpg'">
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(10,12,18,0.85) 100%);"></div>
            <span class="badge-estado" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); color: var(--cor-dourado); border: 1px solid var(--cor-dourado); font-size: 0.65rem;">
              <i class="fa-solid fa-trophy"></i> Concluído na Arena
            </span>
            <span class="badge-estado" style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.85); color: #ffffff; font-size: 0.65rem;">
              <i class="fa-brands fa-youtube"></i> Gravado no YouTube
            </span>
            <div style="position: absolute; bottom: 8px; left: 10px; right: 10px;">
              <span style="font-size: var(--tipo-micro); color: var(--cor-dourado); font-weight: 700; text-transform: uppercase;">${escaparHTML(h.edicao)}</span>
              <h3 style="color: #ffffff; font-family: var(--fonte-subtitulos); font-size: 1.15rem; font-weight: 800; line-height: 1.2; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.9);">${escaparHTML(h.titulo)}</h3>
            </div>
          </div>

          <!-- Banner do Campeão Consagrado -->
          <div style="background: linear-gradient(135deg, rgba(255, 184, 0, 0.15) 0%, rgba(0, 229, 117, 0.08) 100%); border: 1px solid rgba(255, 184, 0, 0.35); border-radius: var(--raio-md); padding: 8px 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: var(--tipo-micro); color: var(--cor-dourado); font-weight: 800; text-transform: uppercase;">
                <i class="fa-solid fa-crown fa-dourado"></i> Grande Campeão
              </span>
              <span class="preco-bebas" style="font-size: 1.1rem; color: var(--cor-verde-marca);">${escaparHTML(h.campeao.placarFinal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <span style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">${escaparHTML(h.campeao.nome)} <span style="color: var(--cor-dourado);">(@${escaparHTML(h.campeao.nickname)})</span></span>
              <span class="texto-muted" style="font-size: var(--tipo-micro);">${escaparHTML(h.campeao.bairro)}</span>
            </div>
            <p style="font-size: var(--tipo-micro); color: var(--cor-texto-suave); margin: 4px 0 0 0;">
              Vice: <strong>${escaparHTML(h.campeao.viceCampeao)}</strong> · Prémio Distribuído: <strong style="color: var(--cor-dourado);">${escaparHTML(h.premioDistribuido)}</strong>
            </p>
          </div>

          <div class="metadados-linha" style="margin-bottom: 6px; font-size: var(--tipo-micro);">
            <span><i class="fa-solid fa-gamepad fa-verde"></i> ${escaparHTML(h.jogo)}</span>
            <span class="metadados-separador">·</span>
            <span><i class="fa-brands fa-playstation fa-dourado"></i> ${escaparHTML(h.consola)}</span>
            <span class="metadados-separador">·</span>
            <span><i class="fa-solid fa-users"></i> ${h.participantes} Atletas</span>
          </div>

          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin-bottom: 6px; line-height: 1.4;">
            ${escaparHTML(h.destaques)}
          </p>

          <!-- Partidas em Destaque Gravadas -->
          <div style="background-color: var(--cor-fundo-secundario); border: 1px solid var(--cor-borda); border-radius: var(--raio-sm); padding: 6px 8px; margin-top: 6px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--cor-texto-muted); text-transform: uppercase; margin-bottom: 2px;">
              <i class="fa-solid fa-video" style="color: #ff0000;"></i> Momentos e Confrontos no YouTube:
            </div>
            ${partidasHtml}
          </div>
        </div>

        <div style="border-top: 1px solid var(--cor-borda); padding-top: var(--espaco-sm); margin-top: var(--espaco-xs);">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-block" style="background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%); color: #ffffff; font-weight: 800; box-shadow: 0 4px 14px rgba(255, 0, 0, 0.35);">
              <i class="fa-brands fa-youtube fa-btn-icon" style="font-size: 1rem;"></i> Assistir Vídeo & Melhores Momentos
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ==========================================================================
   3. LISTA DE JOGOS COM DESAFIO NA ARENA (A A Z POR CONSOLA)
   ========================================================================== */

function vincularFiltrosJogosDesafio() {
  // Filtro por Consola (Todas, PS5, PS4, PS3, PS2)
  const botoesConsola = document.querySelectorAll('.btn-filtro-consola-desafio');
  botoesConsola.forEach(btn => {
    btn.addEventListener('click', () => {
      botoesConsola.forEach(b => {
        b.classList.remove('btn-verde');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-verde');
      consolaJogoAtiva = btn.dataset.consola || 'todas';
      renderizarJogosDesafio();
    });
  });

  // Busca em Tempo Real
  const inputBusca = document.getElementById('input-busca-jogos-desafio');
  if (inputBusca) {
    inputBusca.addEventListener('input', debounce((e) => {
      termoBuscaJogo = e.target.value.toLowerCase().trim();
      renderizarJogosDesafio();
    }, 150));
  }
}

function renderizarJogosDesafio() {
  const container = document.getElementById('container-jogos-desafio');
  if (!container) return;

  // Filtra jogos pela consola selecionada
  let jogosFiltrados = todosJogos.filter(j => {
    // Consola
    if (consolaJogoAtiva !== 'todas') {
      const temTamanho = j.tamanhos && j.tamanhos[consolaJogoAtiva] !== null && j.tamanhos[consolaJogoAtiva] !== undefined;
      if (!temTamanho) return false;
    }

    // Busca
    if (termoBuscaJogo) {
      const texto = `${j.nome} ${j.genero} ${(j.tags || []).join(' ')}`.toLowerCase();
      if (!texto.includes(termoBuscaJogo)) return false;
    }

    return true;
  });

  // Ordena rigorosamente de A a Z
  jogosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt', { sensitivity: 'base' }));

  // Atualiza badge de contagem
  const contadorEl = document.getElementById('contador-jogos-desafio');
  if (contadorEl) {
    const nomeConsola = consolaJogoAtiva === 'todas' ? 'Todas as Consolas' : consolaJogoAtiva;
    contadorEl.innerHTML = `<i class="fa-solid fa-arrow-down-a-z fa-btn-icon"></i> <strong>${jogosFiltrados.length} jogos</strong> em ordem (A → Z) para <strong>${nomeConsola}</strong>`;
  }

  if (jogosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--espaco-xl); background-color: var(--cor-superficie); border-radius: var(--raio-lg); border: 1px dashed var(--cor-borda);">
        <p class="texto-muted" style="margin-bottom: var(--espaco-sm);">Nenhum jogo encontrado para esta consola ou pesquisa.</p>
        <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave);">Podes solicitar a instalação de qualquer jogo no nosso WhatsApp!</p>
      </div>
    `;
    return;
  }

  let letraAtual = '';
  const htmlBlocos = [];

  jogosFiltrados.forEach(j => {
    const primeiraLetra = (j.nome || '').charAt(0).toUpperCase();
    if (primeiraLetra !== letraAtual && /[A-Z0-9]/.test(primeiraLetra)) {
      letraAtual = primeiraLetra;
      htmlBlocos.push(`
        <div style="grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; margin-top: var(--espaco-md); margin-bottom: var(--espaco-xs);">
          <span style="font-family: var(--fonte-numeros); font-size: 1.25rem; color: var(--cor-dourado); background-color: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio-sm); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700;">
            ${letraAtual}
          </span>
          <div style="flex: 1; height: 1px; background: linear-gradient(to right, var(--cor-borda), transparent);"></div>
        </div>
      `);
    }

    // Identifica consolas suportadas
    const consolasDisponiveis = Object.entries(j.tamanhos || {})
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, _]) => k);

    const desafiosLista = j.desafios || ["1v1 Direto", "Mata-Mata Presencial"];

    const msgDesafio = encodeURIComponent(
      `Olá JOGATINAL! Quero marcar um desafio 1v1 na Arena em Matola Muhalaze / Ngolhoza:\n` +
      `🎮 Jogo: ${j.nome}\n` +
      `🕹️ Consola: ${consolaJogoAtiva !== 'todas' ? consolaJogoAtiva : consolasDisponiveis.join('/')}\n\n` +
      `Podem confirmar a disponibilidade de um posto gaming de 120Hz para este fim de semana?`
    );

    const linkDesafio = `https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=${msgDesafio}`;

    htmlBlocos.push(`
      <div class="jogo-desafio-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 4px;">
            <h4 class="jogo-desafio-nome">${escaparHTML(j.nome)}</h4>
            <span class="badge-estado aberto" style="font-size: 0.65rem; flex-shrink: 0;"><i class="fa-solid fa-circle-check"></i> Pronto na Arena</span>
          </div>

          <p class="texto-muted" style="margin: 0; font-size: var(--tipo-micro);">
            ${escaparHTML(j.genero)} · ${j.ano || ''}
          </p>

          <div class="jogo-desafio-tags">
            ${consolasDisponiveis.map(c => `<span class="badge-consola-tag"><i class="fa-brands fa-playstation"></i> ${c}</span>`).join('')}
            ${desafiosLista.map(d => `<span class="badge-desafio-tag"><i class="fa-solid fa-bolt"></i> ${escaparHTML(d)}</span>`).join('')}
          </div>

          <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); margin: 6px 0 0 0; line-height: 1.35;">
            ${escaparHTML(j.descricao || '')}
          </p>
        </div>

        <div style="margin-top: var(--espaco-sm); padding-top: var(--espaco-xs); border-top: 1px solid var(--cor-borda);">
          <a href="${linkDesafio}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-verde btn-block" style="text-decoration: none; gap: 4px; font-size: var(--tipo-micro);">
            <i class="fa-brands fa-whatsapp fa-btn-icon"></i> Desafiar Amigo neste Jogo
          </a>
        </div>
      </div>
    `);
  });

  container.innerHTML = htmlBlocos.join('');
}

/* ==========================================================================
   3. RANKING / LEADERBOARD DA ARENA
   ========================================================================== */

function renderizarRanking() {
  const container = document.getElementById('container-ranking-torneios');
  if (!container) return;

  if (todoRanking.length === 0) {
    container.innerHTML = '<p class="texto-muted">Classificação em atualização para a próxima jornada.</p>';
    return;
  }

  container.innerHTML = `
    <div class="ranking-tabela-container">
      <div class="ranking-lista">
        ${todoRanking.slice(0, 10).map((r, index) => {
          let classeTop = '';
          if (r.posicao === 1) classeTop = 'top-1';
          else if (r.posicao === 2) classeTop = 'top-2';
          else if (r.posicao === 3) classeTop = 'top-3';

          return `
            <div class="ranking-linha ${classeTop}">
              <div class="ranking-posicao">#${r.posicao}</div>
              <div class="ranking-jogador-info">
                <span class="ranking-jogador-nome">${escaparHTML(r.nome)}</span>
                <span class="ranking-jogador-nick">@${escaparHTML(r.nickname)}</span>
                <small class="texto-muted">${escaparHTML(r.bairro)} · <i class="fa-solid fa-gamepad fa-verde"></i> ${escaparHTML(r.jogoPrincipal)}</small>
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
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPaginaTorneios);
} else {
  inicializarPaginaTorneios();
}
