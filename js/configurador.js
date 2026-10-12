/**
 * JOGATINAL - configurador.js
 * Orquestrador da interface do configurador de jogos em 5 passos
 */

import { api } from './api.js';
import { carrinho } from './carrinho.js';
import { filtrarJogos, extrairGenerosUnicos } from './filtros.js';
import { calcularMetricasPack } from './packs.js';
import { gerarOrcamentoPDF, enviarWhatsApp } from './exportar.js';
import { formatarMT, formatarGB, formatarTempoInstalacao, mostrarToast, escaparHTML, debounce } from './utils.js';

class ConfiguradorUI {
  constructor() {
    this.dadosCarregados = false;
    this.termoBusca = '';
    this.generoFiltro = 'todos';
  }

  async inicializar() {
    try {
      const [config, jogos, hds, zonas, packs] = await Promise.all([
        api.obterConfig(),
        api.obterJogos(),
        api.obterHDs(),
        api.obterZonas(),
        api.obterPacks()
      ]);

      carrinho.inicializarDados({ config, jogos, hds, zonas, packs });
      this.dadosCarregados = true;

      // Restaura parâmetros da URL se existirem (?modo=...&jogos=...)
      carrinho.restaurarDeURL();

      this.vincularEventosPassos();
      this.popularFiltroGeneros(jogos);
      this.renderizarPasso1Modos(config.modos);
      this.renderizarPasso3HDs(hds);
      this.renderizarPasso3Zonas(zonas);
      this.renderizarPasso4Packs(packs, jogos);

      // Subscrever alterações de estado do carrinho
      carrinho.subscrever(resumo => this.atualizarInterface(resumo));

      // Executa primeira atualização
      this.atualizarInterface(carrinho.obterResumo());
    } catch (erro) {
      console.error('[Configurador] Erro na inicialização:', erro);
      mostrarToast('Erro ao carregar dados do catálogo. Por favor recarregue a página.', 'erro');
    }
  }

  /* ==========================================================================
     Vinculação de Eventos
     ========================================================================== */

  vincularEventosPassos() {
    // Passo 2: Consolas
    const botoesConsola = document.querySelectorAll('.consola-card');
    botoesConsola.forEach(btn => {
      btn.addEventListener('click', () => {
        const consolaId = btn.dataset.consola;
        carrinho.definirConsola(consolaId);
      });
    });

    // Passo 3: Input de Espaço Manual
    const inputEspaco = document.getElementById('input-capacidade-manual');
    if (inputEspaco) {
      inputEspaco.addEventListener('input', debounce((e) => {
        const val = Number(e.target.value) || 0;
        if (val > 0) carrinho.definirCapacidadeManual(val);
      }, 300));
    }

    // Passo 3: Atalhos de Capacidade
    const atalhos = document.querySelectorAll('.btn-chip-atalho');
    atalhos.forEach(btn => {
      btn.addEventListener('click', () => {
        const gb = Number(btn.dataset.gb);
        if (inputEspaco) inputEspaco.value = gb;
        carrinho.definirCapacidadeManual(gb);
      });
    });

    // Passo 3: Checkbox de Dedução do SO da Consola (~90GB)
    const checkSO = document.getElementById('checkbox-deduzir-so');
    if (checkSO) {
      checkSO.addEventListener('change', (e) => {
        carrinho.definirDeduzirSO(e.target.checked);
        mostrarToast(
          e.target.checked 
            ? 'Espaço recalculado deduzindo ~90 GB do sistema operativo.' 
            : 'Espaço total do disco restaurado.',
          'info'
        );
      });
    }

    // Botões de Partilha de Pedido (Link Direto)
    const copiarLinkPedido = () => {
      const link = carrinho.obterLinkPartilha();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
          mostrarToast('Link do pedido copiado! Podes enviar a quem vai efetuar o pagamento.', 'sucesso');
        }).catch(() => {
          mostrarToast('Link do pedido: ' + link, 'info');
        });
      } else {
        mostrarToast('Link do pedido: ' + link, 'info');
      }
    };

    const btnPartilhar = document.getElementById('btn-partilhar-link');
    if (btnPartilhar) btnPartilhar.addEventListener('click', copiarLinkPedido);

    const btnDrawerPartilhar = document.getElementById('btn-drawer-partilhar');
    if (btnDrawerPartilhar) btnDrawerPartilhar.addEventListener('click', copiarLinkPedido);

    // Passo 5: Botões de Filtro Rápido por Consola (PS5, PS4, PS3, PS2)
    const botoesFiltroConsola = document.querySelectorAll('.btn-filtro-consola-passo5');
    botoesFiltroConsola.forEach(btn => {
      btn.addEventListener('click', () => {
        const consolaId = btn.dataset.consola;
        carrinho.definirConsola(consolaId);
      });
    });

    // Passo 5: Campo de Pesquisa em Tempo Real
    const inputBusca = document.getElementById('input-busca-jogos');
    if (inputBusca) {
      inputBusca.addEventListener('input', debounce((e) => {
        this.termoBusca = e.target.value;
        this.renderizarPasso5Jogos(carrinho.obterResumo());
      }, 150));
    }

    // Passo 5: Dropdown de Filtro de Género
    const selectGenero = document.getElementById('select-genero-jogos');
    if (selectGenero) {
      selectGenero.addEventListener('change', (e) => {
        this.generoFiltro = e.target.value;
        this.renderizarPasso5Jogos(carrinho.obterResumo());
      });
    }

    // Passo 5: Botão Limpar Seleção
    const btnLimpar = document.getElementById('btn-limpar-jogos');
    if (btnLimpar) {
      btnLimpar.addEventListener('click', () => {
        if (carrinho.jogosSelecionadosIds.size === 0) return;
        carrinho.limparJogos();
        mostrarToast('Todos os jogos foram desmarcados.', 'info');
      });
    }

    // Gaveta Mobile de Resumo
    const drawerOverlay = document.getElementById('drawer-resumo-overlay');
    const btnAbrirDrawer = document.getElementById('btn-abrir-resumo-drawer');
    const btnFecharDrawer = document.getElementById('btn-fechar-drawer');

    if (btnAbrirDrawer && drawerOverlay) {
      btnAbrirDrawer.addEventListener('click', () => {
        drawerOverlay.classList.add('aberto');
        document.body.style.overflow = 'hidden';
      });
    }

    const fecharDrawer = () => {
      if (drawerOverlay) {
        drawerOverlay.classList.remove('aberto');
        document.body.style.overflow = '';
      }
    };

    if (btnFecharDrawer) {
      btnFecharDrawer.addEventListener('click', fecharDrawer);
    }
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', (e) => {
        if (e.target === drawerOverlay) fecharDrawer();
      });
    }

    // Ações dentro do Drawer Mobile
    const btnDrawerPDF = document.getElementById('btn-drawer-pdf');
    if (btnDrawerPDF) {
      btnDrawerPDF.addEventListener('click', async () => {
        const resumo = carrinho.obterResumo();
        if (resumo.quantidadeJogos === 0) {
          mostrarToast('Seleciona pelo menos 1 jogo antes de gerar o PDF.', 'info');
          return;
        }
        btnDrawerPDF.disabled = true;
        btnDrawerPDF.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-btn-icon"></i> A gerar...';
        try {
          await gerarOrcamentoPDF(resumo);
        } finally {
          btnDrawerPDF.disabled = false;
          btnDrawerPDF.innerHTML = '<i class="fa-solid fa-file-pdf fa-btn-icon"></i> Descarregar PDF';
        }
      });
    }

    const btnDrawerWhatsApp = document.getElementById('btn-drawer-whatsapp');
    if (btnDrawerWhatsApp) {
      btnDrawerWhatsApp.addEventListener('click', async () => {
        const resumo = carrinho.obterResumo();
        fecharDrawer();
        await enviarWhatsApp(resumo);
      });
    }

    // Rodapé Fixo: Botões de Ação com proteção async
    const btnPDF = document.getElementById('btn-exportar-pdf');
    if (btnPDF) {
      btnPDF.addEventListener('click', async () => {
        const resumo = carrinho.obterResumo();
        if (resumo.quantidadeJogos === 0) {
          mostrarToast('Por favor seleciona pelo menos 1 jogo antes de gerar o PDF.', 'info');
          return;
        }
        btnPDF.disabled = true;
        btnPDF.classList.add('carregando');
        btnPDF.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-btn-icon"></i> A gerar...';
        try {
          await gerarOrcamentoPDF(resumo);
        } finally {
          btnPDF.disabled = false;
          btnPDF.classList.remove('carregando');
          btnPDF.innerHTML = '<i class="fa-solid fa-file-pdf fa-btn-icon"></i> Gerar PDF';
        }
      });
    }

    const btnWhatsApp = document.getElementById('btn-enviar-whatsapp');
    if (btnWhatsApp) {
      btnWhatsApp.addEventListener('click', async () => {
        const resumo = carrinho.obterResumo();
        btnWhatsApp.disabled = true;
        btnWhatsApp.classList.add('carregando');
        btnWhatsApp.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-btn-icon"></i> A preparar...';
        try {
          await enviarWhatsApp(resumo);
        } finally {
          btnWhatsApp.disabled = false;
          btnWhatsApp.classList.remove('carregando');
          btnWhatsApp.innerHTML = '<i class="fa-brands fa-whatsapp fa-btn-icon"></i> Enviar WhatsApp';
        }
      });
    }
  }

  /* ==========================================================================
     Renderização de Componentes
     ========================================================================== */

  renderizarPasso1Modos(modos) {
    const container = document.getElementById('container-modos');
    if (!container) return;

    container.innerHTML = modos.map(m => `
      <div class="modo-card ${carrinho.modoId === m.id ? 'selecionado' : ''}" data-modo-id="${escaparHTML(m.id)}">
        <div class="modo-card-header">
          <span class="modo-letra">${escaparHTML(m.letra)}</span>
          ${m.taxaExtra > 0 ? `<span class="modo-taxa-tag">+${formatarMT(m.taxaExtra)} preparação</span>` : ''}
        </div>
        <h4 class="modo-titulo">${escaparHTML(m.nome)}</h4>
        <p class="modo-subtitulo">${escaparHTML(m.subtitulo)}</p>
      </div>
    `).join('');

    container.querySelectorAll('.modo-card').forEach(card => {
      card.addEventListener('click', () => {
        const modoId = card.dataset.modoId;
        carrinho.definirModo(modoId);
      });
    });
  }

  popularFiltroGeneros(jogos) {
    const select = document.getElementById('select-genero-jogos');
    if (!select) return;

    const generos = extrairGenerosUnicos(jogos);
    select.innerHTML = '<option value="todos">Todos os Géneros</option>' + 
      generos.map(g => `<option value="${escaparHTML(g)}">${escaparHTML(g)}</option>`).join('');
  }

  renderizarPasso3HDs(hds) {
    const container = document.getElementById('container-hds-loja');
    if (!container) return;

    container.innerHTML = hds.map(hd => `
      <div class="hd-card ${carrinho.hdSelecionado?.id === hd.id ? 'selecionado' : ''}" data-hd-id="${escaparHTML(hd.id)}">
        <div class="hd-card-topo">
          <span class="hd-capacidade">${escaparHTML(hd.nome)}</span>
          <span class="hd-preco">${formatarMT(hd.preco)}</span>
        </div>
        <p class="texto-muted" style="margin: 0; font-size: var(--tipo-pequeno);">${escaparHTML(hd.marca)} · ${escaparHTML(hd.tipo)}</p>
        <p style="font-size: var(--tipo-pequeno); margin-top: 4px;">${escaparHTML(hd.descricao)}</p>
      </div>
    `).join('');

    container.querySelectorAll('.hd-card').forEach(card => {
      card.addEventListener('click', () => {
        carrinho.selecionarHD(card.dataset.hdId);
      });
    });
  }

  renderizarPasso3Zonas(zonas) {
    const select = document.getElementById('select-zonas-deslocacao');
    if (!select) return;

    select.innerHTML = zonas.map(z => `
      <option value="${escaparHTML(z.id)}">${escaparHTML(z.nome)} (+${formatarMT(z.taxa)}) — ${escaparHTML(z.tempoEstimado)}</option>
    `).join('');

    select.addEventListener('change', (e) => {
      carrinho.selecionarZona(e.target.value);
    });
  }

  renderizarPasso4Packs(packs, todosJogos) {
    const container = document.getElementById('container-packs');
    if (!container) return;

    const consolaAtual = carrinho.consolaId;

    container.innerHTML = packs.map(pack => {
      const metricas = calcularMetricasPack(pack, todosJogos, consolaAtual);
      const isAplicado = carrinho.packAplicado?.id === pack.id;

      return `
        <div class="pack-card ${isAplicado ? 'aplicado' : ''}" data-pack-id="${escaparHTML(pack.id)}">
          <div class="pack-header">
            <h4 class="pack-nome">${escaparHTML(pack.nome)}</h4>
            <span class="pack-desconto-tag">-${pack.descontoPercent}%</span>
          </div>
          <p class="pack-jogos-lista">${escaparHTML(pack.descricao)}</p>
          <div class="pack-precos-row">
            <span class="pack-preco-original">${formatarMT(metricas.precoBruto)}</span>
            <span class="pack-preco-desconto">${formatarMT(metricas.precoComDesconto)}</span>
            <span class="pack-poupanca">Poupe ${formatarMT(metricas.poupanca)}</span>
          </div>
          <div class="pack-acoes-row">
            <button class="btn btn-sm ${isAplicado ? 'btn-dourado' : 'btn-secundario'} btn-aplicar-pack" data-pack-id="${escaparHTML(pack.id)}" style="flex: 1;">
              ${isAplicado ? '<i class="fa-solid fa-check fa-btn-icon"></i> Pack Aplicado' : '<i class="fa-solid fa-plus fa-btn-icon"></i> Aplicar Pack'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-aplicar-pack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const packId = btn.dataset.packId;
        if (carrinho.packAplicado?.id === packId) {
          carrinho.removerPack();
          mostrarToast('Pack removido.', 'info');
        } else {
          carrinho.aplicarPack(packId);
          mostrarToast(`Pack ${packId} aplicado! Jogos selecionados com desconto.`, 'sucesso');
        }
      });
    });
  }

  renderizarPasso5Jogos(resumo) {
    const container = document.getElementById('container-jogos');
    if (!container) return;

    const jogosFiltrados = filtrarJogos(
      carrinho.todosJogos,
      this.termoBusca,
      this.generoFiltro,
      resumo.consolaId
    );

    // Atualiza contador A-Z
    const elContadorAZ = document.getElementById('contador-jogos-az');
    if (elContadorAZ) {
      elContadorAZ.innerHTML = `<i class="fa-solid fa-arrow-down-a-z fa-btn-icon fa-dourado"></i> <strong>${jogosFiltrados.length} jogos</strong> em ordem (A → Z) para <strong>${resumo.consolaId}</strong>`;
    }

    // Atualiza botões de consola do Passo 5
    document.querySelectorAll('.btn-filtro-consola-passo5').forEach(btn => {
      const ativa = btn.dataset.consola === resumo.consolaId;
      btn.classList.toggle('btn-verde', ativa);
      btn.classList.toggle('btn-outline', !ativa);
    });

    if (jogosFiltrados.length === 0) {
      container.innerHTML = `
        <div class="estado-vazio" style="grid-column: 1 / -1;">
          <div class="estado-vazio-icone"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h4 class="estado-vazio-titulo">Nenhum jogo encontrado</h4>
          <p class="estado-vazio-texto">Tenta alterar o termo da pesquisa ou trocar a consola selecionada (${resumo.consolaId}).</p>
        </div>
      `;
      return;
    }

    let letraAtual = '';
    const htmlCards = [];

    jogosFiltrados.forEach(jogo => {
      const primeiraLetra = (jogo.nome || '').charAt(0).toUpperCase();
      if (primeiraLetra !== letraAtual && /[A-Z0-9]/.test(primeiraLetra)) {
        letraAtual = primeiraLetra;
        htmlCards.push(`
          <div class="divisor-alfabetico" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; margin-top: var(--espaco-md); margin-bottom: 2px;">
            <span style="font-family: var(--fonte-numeros); font-size: 1.3rem; color: var(--cor-dourado); background-color: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio-sm); width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700;">
              ${letraAtual}
            </span>
            <div style="flex: 1; height: 1px; background: linear-gradient(to right, var(--cor-borda), transparent);"></div>
          </div>
        `);
      }

      const selecionado = carrinho.jogosSelecionadosIds.has(jogo.id);
      const tamanho = jogo.tamanhos ? jogo.tamanhos[resumo.consolaId] : null;
      const compativel = tamanho !== null && tamanho !== undefined;
      const cabe = carrinho.jogoCabe(jogo);
      const bloqueado = compativel && !selecionado && !cabe;

      let classeEstado = '';
      if (selecionado) classeEstado = 'selecionado';
      else if (bloqueado) classeEstado = 'bloqueado';
      else if (!compativel) classeEstado = 'incompativel';

      htmlCards.push(`
        <div class="jogo-card ${classeEstado}" data-jogo-id="${escaparHTML(jogo.id)}" tabindex="0" role="checkbox" aria-checked="${selecionado}">
          <div class="jogo-card-header">
            <h4 class="jogo-nome">${escaparHTML(jogo.nome)}</h4>
            <div class="jogo-check-box">${selecionado ? '<i class="fa-solid fa-check"></i>' : ''}</div>
          </div>
          <p class="texto-muted" style="margin: 0; font-size: var(--tipo-pequeno);">${escaparHTML(jogo.genero)} · ${jogo.ano}</p>
          <div class="jogo-meta-row">
            <span class="jogo-tamanho">${compativel ? formatarGB(tamanho) : 'Não disponível nesta consola'}</span>
            <span class="jogo-preco ${jogo.preco === 0 ? 'gratis' : ''}">${formatarMT(jogo.preco, true)}</span>
          </div>
        </div>
      `);
    });

    container.innerHTML = htmlCards.join('');

    container.querySelectorAll('.jogo-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.jogoId;
        const jogo = carrinho.todosJogos.find(j => j.id === id);
        if (!carrinho.jogoCabe(jogo) && !carrinho.jogosSelecionadosIds.has(id)) {
          mostrarToast(`Espaço insuficiente no disco para ${jogo.nome}. Liberta espaço ou escolhe um HD maior.`, 'erro');
          return;
        }
        carrinho.alternarJogo(id);
      });
    });
  }

  /* ==========================================================================
     Atualização Geral da Interface Reativa
     ========================================================================== */

  atualizarInterface(resumo) {
    // 1. Atualizar cartões de Modo
    document.querySelectorAll('.modo-card').forEach(card => {
      card.classList.toggle('selecionado', card.dataset.modoId === resumo.modoId);
    });

    // 2. Visibilidade condicional do Passo 3 conforme Modo
    const blocoEspacoManual = document.getElementById('seccao-espaco-manual');
    const blocoHDsLoja = document.getElementById('seccao-hds-loja');
    const blocoZonas = document.getElementById('seccao-zonas-deslocacao');

    if (blocoEspacoManual) {
      blocoEspacoManual.style.display = (resumo.modoId === 'meu_hd' || resumo.modoId === 'deslocacao') ? 'block' : 'none';
    }
    if (blocoHDsLoja) {
      blocoHDsLoja.style.display = (resumo.modoId === 'comprar_hd' || resumo.modoId === 'hd_pronto') ? 'block' : 'none';
    }
    if (blocoZonas) {
      blocoZonas.style.display = (resumo.modoId === 'deslocacao') ? 'block' : 'none';
    }

    // 3. Atualizar Consola Selecionada
    document.querySelectorAll('.consola-card').forEach(card => {
      card.classList.toggle('selecionado', card.dataset.consola === resumo.consolaId);
    });

    // 4. Atualizar HDs Selecionados
    document.querySelectorAll('.hd-card').forEach(card => {
      card.classList.toggle('selecionado', card.dataset.hdId === resumo.hdSelecionado?.id);
    });

    // 5. Renderizar / Atualizar Jogos e Packs
    this.renderizarPasso4Packs(carrinho.todosPacks, carrinho.todosJogos);
    this.renderizarPasso5Jogos(resumo);

    // 6. Atualizar Rodapé Fixo e Métricas
    const elContagem = document.getElementById('rodape-jogos-contagem');
    if (elContagem) elContagem.textContent = `${resumo.quantidadeJogos} jogos`;

    const elEspacoTexto = document.getElementById('rodape-espaco-texto');
    if (elEspacoTexto) elEspacoTexto.textContent = `${resumo.espacoUsadoGB} / ${resumo.capacidadeTotalGB} GB`;

    const elBarraProgresso = document.getElementById('rodape-barra-progresso');
    if (elBarraProgresso) {
      elBarraProgresso.style.width = `${Math.min(100, resumo.percentualUso)}%`;
      elBarraProgresso.classList.remove('nivel-alerta', 'nivel-critico');
      if (resumo.percentualUso > 90) {
        elBarraProgresso.classList.add('nivel-critico');
      } else if (resumo.percentualUso >= 75) {
        elBarraProgresso.classList.add('nivel-alerta');
      }
    }

    const elTotal = document.getElementById('rodape-valor-total');
    if (elTotal) elTotal.textContent = formatarMT(resumo.totalGeral);

    const elTempo = document.getElementById('rodape-tempo-instalacao');
    if (elTempo) elTempo.textContent = formatarTempoInstalacao(resumo.tempoInstalacaoMinutos);

    // 7. Atualizar Conteúdo da Gaveta Mobile de Resumo
    const elCorpoDrawer = document.getElementById('drawer-resumo-corpo');
    if (elCorpoDrawer) {
      const jogosHtml = resumo.jogosSelecionados.length > 0 
        ? resumo.jogosSelecionados.map(j => `
            <div class="drawer-item-lista">
              <span>${escaparHTML(j.nome)} <small class="texto-muted">(${formatarGB(j.tamanhos[resumo.consolaId])})</small></span>
              <strong style="color: var(--cor-texto-principal);">${formatarMT(j.preco, true)}</strong>
            </div>
          `).join('')
        : '<p class="texto-muted" style="padding: var(--espaco-md) 0; text-align: center;">Nenhum jogo selecionado ainda.</p>';

      elCorpoDrawer.innerHTML = `
        <div style="background-color: var(--cor-fundo-secundario); border: 1px solid var(--cor-borda); border-radius: var(--raio-md); padding: var(--espaco-md); margin-bottom: var(--espaco-md);">
          <div style="display: flex; justify-content: space-between; font-size: var(--tipo-pequeno); margin-bottom: 4px;">
            <span class="texto-muted">Consola:</span>
            <strong>${resumo.consolaId}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: var(--tipo-pequeno); margin-bottom: 4px;">
            <span class="texto-muted">Espaço Ocupado:</span>
            <strong>${resumo.espacoUsadoGB} / ${resumo.capacidadeTotalGB} GB (${resumo.percentualUso}%)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: var(--tipo-pequeno);">
            <span class="texto-muted">Faltam para encher:</span>
            <span style="color: var(--cor-verde-hover); font-weight: 600;">${resumo.espacoLivreGB} GB livres</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: var(--tipo-pequeno); margin-top: 4px;">
            <span class="texto-muted">Tempo Estimado:</span>
            <span>${formatarTempoInstalacao(resumo.tempoInstalacaoMinutos)}</span>
          </div>
        </div>

        <h4 style="font-size: var(--tipo-pequeno); text-transform: uppercase; color: var(--cor-texto-muted); margin-bottom: var(--espaco-xs);">
          Jogos Selecionados (${resumo.quantidadeJogos}):
        </h4>
        <div style="max-height: 220px; overflow-y: auto; margin-bottom: var(--espaco-md);">
          ${jogosHtml}
        </div>

        <div style="border-top: 1px solid var(--cor-borda); padding-top: var(--espaco-sm); font-size: var(--tipo-pequeno); display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <span class="texto-muted">Subtotal Jogos:</span>
            <span>${formatarMT(resumo.precoJogosBruto)}</span>
          </div>
          ${resumo.descontoPack > 0 ? `
            <div style="display: flex; justify-content: space-between; color: var(--cor-verde-marca);">
              <span>Desconto (${resumo.packAplicado?.nome}):</span>
              <strong>-${formatarMT(resumo.descontoPack)}</strong>
            </div>
          ` : ''}
          ${resumo.precoHD > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span class="texto-muted">HD (${resumo.hdSelecionado?.nome}):</span>
              <span>${formatarMT(resumo.precoHD)}</span>
            </div>
          ` : ''}
          ${resumo.taxaDeslocacao > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span class="texto-muted">Deslocação (${resumo.zonaSelecionada?.nome}):</span>
              <span>${formatarMT(resumo.taxaDeslocacao)}</span>
            </div>
          ` : ''}
          ${resumo.taxaPreparacao > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span class="texto-muted">Taxa de Preparação:</span>
              <span>${formatarMT(resumo.taxaPreparacao)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--cor-borda); padding-top: 6px; margin-top: 4px;">
            <span style="font-weight: 700;">TOTAL ESTIMADO:</span>
            <span style="font-family: var(--fonte-numeros); font-size: 1.8rem; color: var(--cor-dourado);">${formatarMT(resumo.totalGeral)}</span>
          </div>
        </div>
      `;
    }

    // 8. Atualizar Estado do Checkbox de SO
    const checkSO = document.getElementById('checkbox-deduzir-so');
    if (checkSO) checkSO.checked = Boolean(resumo.deduzirSO);

    // 9. Atualizar Simulador de Poupança de Megas vs. HD
    const elPoupancaValor = document.getElementById('valor-poupanca-dados');
    if (elPoupancaValor) elPoupancaValor.textContent = formatarMT(resumo.poupancaDados.poupancaDinheiro);

    const elCustoMegas = document.getElementById('custo-estimado-megas');
    if (elCustoMegas) elCustoMegas.textContent = `${formatarMT(resumo.poupancaDados.custoDadosMoveis)} (~${resumo.poupancaDados.gb} GB)`;

    const elTempoDownload = document.getElementById('tempo-estimado-download');
    if (elTempoDownload) elTempoDownload.textContent = `~${resumo.poupancaDados.tempoDownloadHoras} horas contínuas`;

    const elCustoJogatinal = document.getElementById('custo-jogatinal-comparativo');
    if (elCustoJogatinal) elCustoJogatinal.textContent = formatarMT(resumo.totalGeral);

    const elTempoGravacao = document.getElementById('tempo-gravacao-comparativo');
    if (elTempoGravacao) elTempoGravacao.textContent = formatarTempoInstalacao(resumo.tempoInstalacaoMinutos);
  }
}

// Inicializar quando na página de jogos
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('configurador-app')) {
    const configurador = new ConfiguradorUI();
    configurador.inicializar();
  }
});
