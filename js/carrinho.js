/**
 * JOGATINAL - carrinho.js
 * Estado puro do configurador de jogos (sem dependências de DOM)
 * Rege regras de capacidade por consola, descontos de packs, taxas e tempo de instalação
 */

export class CarrinhoEstado {
  constructor() {
    this.ouvintes = [];

    // Estado inicial
    this.modoId = 'meu_hd'; // 'meu_hd' | 'comprar_hd' | 'deslocacao' | 'hd_pronto'
    this.consolaId = 'PS4'; // 'PS5' | 'PS4' | 'PS3' | 'PS2'
    this.capacidadeTotalGB = 500;
    this.deduzirSO = false; // Deduzir ~90GB do Sistema Operativo da Consola
    
    this.hdSelecionado = null;
    this.zonaSelecionada = null;
    this.packAplicado = null;
    this.jogosSelecionadosIds = new Set();

    // Catálogos e configurações carregadas
    this.todosJogos = [];
    this.todosHDs = [];
    this.todasZonas = [];
    this.todosPacks = [];
    this.taxas = { preparacao: 250 };
    this.instalacao = { tempoPorGB: 0.12, tempoMinimo: 10 };
  }

  /**
   * Inicializa catálogos no estado
   */
  inicializarDados({ jogos, hds, zonas, packs, config }) {
    this.todosJogos = jogos || [];
    this.todosHDs = hds || [];
    this.todasZonas = zonas || [];
    this.todosPacks = packs || [];
    if (config?.taxas) this.taxas = config.taxas;
    if (config?.instalacao) this.instalacao = config.instalacao;

    // Se houver HD recomendado por padrão
    const hdRecomendado = this.todosHDs.find(h => h.recomendado) || this.todosHDs[0];
    if (hdRecomendado) {
      this.hdSelecionado = hdRecomendado;
    }

    if (this.todasZonas.length > 0) {
      this.zonaSelecionada = this.todasZonas[0];
    }

    this.notificar();
  }

  /**
   * Subscrever alterações de estado
   * @param {Function} ouvinte 
   */
  subscrever(ouvinte) {
    this.ouvintes.push(ouvinte);
    return () => {
      this.ouvintes = this.ouvintes.filter(fn => fn !== ouvinte);
    };
  }

  notificar() {
    const resumo = this.obterResumo();
    this.ouvintes.forEach(fn => fn(resumo));
  }

  /* ==========================================================================
     Mutadores de Estado
     ========================================================================== */

  definirModo(modoId) {
    this.modoId = modoId;
    if (modoId === 'comprar_hd' || modoId === 'hd_pronto') {
      if (this.hdSelecionado) {
        this.capacidadeTotalGB = this.hdSelecionado.capacidadeGB;
      }
    }
    this.notificar();
  }

  definirConsola(consolaId) {
    this.consolaId = consolaId;
    // Remove jogos que não são compatíveis com a nova consola
    const idsValidos = new Set();
    for (const id of this.jogosSelecionadosIds) {
      const jogo = this.todosJogos.find(j => j.id === id);
      if (jogo && jogo.tamanhos && jogo.tamanhos[consolaId] !== null) {
        idsValidos.add(id);
      }
    }
    this.jogosSelecionadosIds = idsValidos;
    this.notificar();
  }

  definirCapacidadeManual(gb) {
    const valor = Math.max(50, Number(gb) || 500);
    this.capacidadeTotalGB = valor;
    this.notificar();
  }

  selecionarHD(hdId) {
    const hd = this.todosHDs.find(h => h.id === hdId);
    if (hd) {
      this.hdSelecionado = hd;
      this.capacidadeTotalGB = hd.capacidadeGB;
      this.notificar();
    }
  }

  selecionarZona(zonaId) {
    const zona = this.todasZonas.find(z => z.id === zonaId);
    if (zona) {
      this.zonaSelecionada = zona;
      this.notificar();
    }
  }

  alternarJogo(jogoId) {
    if (this.jogosSelecionadosIds.has(jogoId)) {
      this.jogosSelecionadosIds.delete(jogoId);
    } else {
      const jogo = this.todosJogos.find(j => j.id === jogoId);
      if (!jogo) return;

      const tamanho = jogo.tamanhos[this.consolaId];
      if (tamanho === null || tamanho === undefined) {
        return; // Jogo incompatível com consola
      }

      const espacoUsado = this.calcularEspacoUsado();
      if (espacoUsado + tamanho > this.capacidadeTotalGB) {
        return; // Não cabe
      }

      this.jogosSelecionadosIds.add(jogoId);
    }

    this.validarMinimoPack();
    this.notificar();
  }

  aplicarPack(packId) {
    const pack = this.todosPacks.find(p => p.id === packId);
    if (!pack) return;

    this.packAplicado = pack;
    // Adiciona todos os jogos do pack que sejam compatíveis com a consola
    for (const jId of pack.jogosIds) {
      const jogo = this.todosJogos.find(j => j.id === jId);
      if (jogo && jogo.tamanhos[this.consolaId] !== null) {
        const tamanho = jogo.tamanhos[this.consolaId];
        const espacoUsado = this.calcularEspacoUsado();
        if (espacoUsado + tamanho <= this.capacidadeTotalGB || this.jogosSelecionadosIds.has(jId)) {
          this.jogosSelecionadosIds.add(jId);
        }
      }
    }

    this.validarMinimoPack();
    this.notificar();
  }

  removerPack() {
    this.packAplicado = null;
    this.notificar();
  }

  definirDeduzirSO(deduzir) {
    this.deduzirSO = Boolean(deduzir);
    this.notificar();
  }

  obterCapacidadeEfetiva() {
    if (this.deduzirSO) {
      return Math.max(30, this.capacidadeTotalGB - 90);
    }
    return this.capacidadeTotalGB;
  }

  limparJogos() {
    this.jogosSelecionadosIds.clear();
    this.packAplicado = null;
    this.notificar();
  }

  validarMinimoPack() {
    if (!this.packAplicado) return;
    const jogosDoPackSelecionados = this.packAplicado.jogosIds.filter(id => 
      this.jogosSelecionadosIds.has(id)
    ).length;

    // Desconto só vale se mantiver mínimo de jogos (minimoManter)
    if (jogosDoPackSelecionados < this.packAplicado.minimoManter) {
      this.packAplicado = null;
    }
  }

  /* ==========================================================================
     Cálculos Financeiros, Espaciais e Poupança de Megas
     ========================================================================== */

  calcularEspacoUsado() {
    let total = 0;
    for (const id of this.jogosSelecionadosIds) {
      const jogo = this.todosJogos.find(j => j.id === id);
      if (jogo && jogo.tamanhos && jogo.tamanhos[this.consolaId] !== null) {
        total += Number(jogo.tamanhos[this.consolaId]) || 0;
      }
    }
    return Math.round(total * 10) / 10;
  }

  jogoCabe(jogo) {
    if (!jogo || !jogo.tamanhos) return false;
    const tamanho = jogo.tamanhos[this.consolaId];
    if (tamanho === null || tamanho === undefined) return false;

    // Se já estiver selecionado, pode ser desmarcado
    if (this.jogosSelecionadosIds.has(jogo.id)) return true;

    const espacoUsado = this.calcularEspacoUsado();
    const capacidadeEfetiva = this.obterCapacidadeEfetiva();
    return (espacoUsado + tamanho) <= capacidadeEfetiva;
  }

  calcularPoupancaDadosMoveis() {
    const gb = this.calcularEspacoUsado();
    // 1 GB médio de pacotes de dados móveis em Moçambique (Vodacom / Movitel) custa ~35 MT
    const custoDadosMoveis = Math.round(gb * 35);
    // Tempo estimado de download em conexões móveis médias de 3G/4G: ~0.35 horas por GB
    const tempoDownloadHoras = Math.round(gb * 0.35);
    const { totalGeral } = this.calcularTotal();
    const poupancaDinheiro = Math.max(0, custoDadosMoveis - totalGeral);

    return {
      gb,
      custoDadosMoveis,
      tempoDownloadHoras,
      poupancaDinheiro
    };
  }

  obterLinkPartilha() {
    const url = new URL(window.location.origin + '/jogos.html');
    url.searchParams.set('modo', this.modoId);
    url.searchParams.set('consola', this.consolaId);
    url.searchParams.set('gb', String(this.capacidadeTotalGB));
    if (this.deduzirSO) url.searchParams.set('so', '1');
    if (this.hdSelecionado) url.searchParams.set('hd', this.hdSelecionado.id);
    if (this.zonaSelecionada) url.searchParams.set('zona', this.zonaSelecionada.id);
    if (this.packAplicado) url.searchParams.set('pack', this.packAplicado.id);
    if (this.jogosSelecionadosIds.size > 0) {
      url.searchParams.set('jogos', Array.from(this.jogosSelecionadosIds).join(','));
    }
    return url.toString();
  }

  restaurarDeURL() {
    const params = new URLSearchParams(window.location.search);
    let alterou = false;

    if (params.has('modo')) {
      this.modoId = params.get('modo');
      alterou = true;
    }
    if (params.has('consola')) {
      this.consolaId = params.get('consola');
      alterou = true;
    }
    if (params.has('gb')) {
      this.capacidadeTotalGB = Number(params.get('gb')) || 500;
      alterou = true;
    }
    if (params.has('so')) {
      this.deduzirSO = params.get('so') === '1';
      alterou = true;
    }
    if (params.has('hd')) {
      const hd = this.todosHDs.find(h => h.id === params.get('hd'));
      if (hd) {
        this.hdSelecionado = hd;
        this.capacidadeTotalGB = hd.capacidadeGB;
        alterou = true;
      }
    }
    if (params.has('zona')) {
      const zona = this.todasZonas.find(z => z.id === params.get('zona'));
      if (zona) {
        this.zonaSelecionada = zona;
        alterou = true;
      }
    }
    if (params.has('pack')) {
      const pack = this.todosPacks.find(p => p.id === params.get('pack'));
      if (pack) {
        this.packAplicado = pack;
        alterou = true;
      }
    }
    if (params.has('jogos')) {
      const ids = params.get('jogos').split(',').map(s => s.trim());
      ids.forEach(id => {
        if (this.todosJogos.some(j => j.id === id)) {
          this.jogosSelecionadosIds.add(id);
        }
      });
      alterou = true;
    }

    if (alterou) {
      this.notificar();
    }
  }

  calcularDescontoPack() {
    if (!this.packAplicado) return 0;

    let somaPrecosJogosPack = 0;
    for (const jId of this.packAplicado.jogosIds) {
      if (this.jogosSelecionadosIds.has(jId)) {
        const jogo = this.todosJogos.find(j => j.id === jId);
        if (jogo) {
          somaPrecosJogosPack += Number(jogo.preco) || 0;
        }
      }
    }

    const percentual = Number(this.packAplicado.descontoPercent) || 0;
    return Math.round(somaPrecosJogosPack * (percentual / 100));
  }

  calcularTotal() {
    let precoJogos = 0;
    for (const id of this.jogosSelecionadosIds) {
      const jogo = this.todosJogos.find(j => j.id === id);
      if (jogo) {
        precoJogos += Number(jogo.preco) || 0;
      }
    }

    const desconto = this.calcularDescontoPack();
    let subtotalJogos = Math.max(0, precoJogos - desconto);

    let precoHD = 0;
    if ((this.modoId === 'comprar_hd' || this.modoId === 'hd_pronto') && this.hdSelecionado) {
      precoHD = Number(this.hdSelecionado.preco) || 0;
    }

    let taxaDeslocacao = 0;
    if (this.modoId === 'deslocacao' && this.zonaSelecionada) {
      taxaDeslocacao = Number(this.zonaSelecionada.taxa) || 0;
    }

    let taxaPreparacao = 0;
    if (this.modoId === 'hd_pronto') {
      taxaPreparacao = Number(this.taxas.preparacao) || 250;
    }

    return {
      precoJogosBruto: precoJogos,
      descontoPack: desconto,
      subtotalJogos,
      precoHD,
      taxaDeslocacao,
      taxaPreparacao,
      totalGeral: subtotalJogos + precoHD + taxaDeslocacao + taxaPreparacao
    };
  }

  calcularTempoInstalacaoMinutos() {
    const gb = this.calcularEspacoUsado();
    const taxa = Number(this.instalacao.tempoPorGB) || 0.12;
    const minimo = Number(this.instalacao.tempoMinimo) || 10;
    return Math.max(minimo, Math.round(gb * taxa));
  }

  obterResumo() {
    const espacoUsado = this.calcularEspacoUsado();
    const capacidadeEfetiva = this.obterCapacidadeEfetiva();
    const espacoLivre = Math.max(0, Math.round((capacidadeEfetiva - espacoUsado) * 10) / 10);
    const percentualUso = capacidadeEfetiva > 0 
      ? Math.min(100, Math.round((espacoUsado / capacidadeEfetiva) * 100))
      : 0;

    const financeiro = this.calcularTotal();
    const tempoInstalacao = this.calcularTempoInstalacaoMinutos();
    const poupancaDados = this.calcularPoupancaDadosMoveis();

    const listaJogosSelecionados = Array.from(this.jogosSelecionadosIds)
      .map(id => this.todosJogos.find(j => j.id === id))
      .filter(Boolean);

    return {
      modoId: this.modoId,
      consolaId: this.consolaId,
      capacidadeTotalGB: this.capacidadeTotalGB,
      capacidadeEfetivaGB: capacidadeEfetiva,
      deduzirSO: this.deduzirSO,
      espacoUsadoGB: espacoUsado,
      espacoLivreGB: espacoLivre,
      percentualUso,
      hdSelecionado: this.hdSelecionado,
      zonaSelecionada: this.zonaSelecionada,
      packAplicado: this.packAplicado,
      quantidadeJogos: this.jogosSelecionadosIds.size,
      jogosSelecionados: listaJogosSelecionados,
      tempoInstalacaoMinutos: tempoInstalacao,
      poupancaDados,
      ...financeiro
    };
  }
}

export const carrinho = new CarrinhoEstado();
