/**
 * JOGATINAL - loja.js
 * Módulo de Catálogo de Venda de Consolas, Joy's (Comandos), CD's Físicos e Simulador de Retoma/Compra
 */

import { api } from './api.js';
import { formatarMT, escaparHTML, mostrarToast, debounce } from './utils.js';
import { CONFIG } from './config.js';

export class LojaController {
  constructor() {
    this.produtos = [];
    this.retomaTabela = null;
    this.categoriaAtiva = 'todos';
    this.plataformaAtiva = 'todas';
    this.termoBusca = '';
  }

  async inicializar() {
    try {
      const [produtos, retomaTabela] = await Promise.all([
        api.obterProdutos().catch(() => []),
        api.obterRetomaTabela().catch(() => null)
      ]);

      this.produtos = produtos;
      this.retomaTabela = retomaTabela;

      this.vincularEventosFiltros();
      this.vincularSimuladorRetoma();
      this.renderizarProdutos();
      this.renderizarDestaquesHome();
    } catch (erro) {
      console.error('[Loja] Erro ao carregar produtos:', erro);
    }
  }

  vincularEventosFiltros() {
    // Filtros por Categoria (Pills / Botões)
    const botoesCat = document.querySelectorAll('.btn-filtro-categoria');
    botoesCat.forEach(btn => {
      btn.addEventListener('click', () => {
        botoesCat.forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        this.categoriaAtiva = btn.dataset.categoria || 'todos';
        this.renderizarProdutos();
      });
    });

    // Filtros por Plataforma
    const selectPlataforma = document.getElementById('select-filtro-plataforma');
    if (selectPlataforma) {
      selectPlataforma.addEventListener('change', (e) => {
        this.plataformaAtiva = e.target.value;
        this.renderizarProdutos();
      });
    }

    // Campo de Busca
    const inputBusca = document.getElementById('input-busca-loja');
    if (inputBusca) {
      inputBusca.addEventListener('input', debounce((e) => {
        this.termoBusca = e.target.value.toLowerCase().trim();
        this.renderizarProdutos();
      }, 150));
    }
  }

  obterProdutosFiltrados() {
    return this.produtos.filter(p => {
      // Categoria
      if (this.categoriaAtiva !== 'todos' && p.categoria !== this.categoriaAtiva) {
        return false;
      }
      // Plataforma
      if (this.plataformaAtiva !== 'todas' && p.plataforma !== this.plataformaAtiva) {
        return false;
      }
      // Busca
      if (this.termoBusca) {
        const texto = `${p.nome} ${p.descricao} ${p.categoria} ${p.plataforma}`.toLowerCase();
        if (!texto.includes(this.termoBusca)) {
          return false;
        }
      }
      return true;
    });
  }

  renderizarProdutos() {
    const container = document.getElementById('container-produtos-loja');
    if (!container) return;

    const filtrados = this.obterProdutosFiltrados();

    if (filtrados.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: var(--espaco-2xl) var(--espaco-md); background-color: var(--cor-superficie); border-radius: var(--raio-lg); border: 1px dashed var(--cor-borda);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;"><i class="fa-solid fa-gamepad fa-dourado"></i></span>
          <h4 style="font-family: var(--fonte-subtitulos); margin-bottom: 4px;">Nenhum produto encontrado</h4>
          <p class="texto-muted" style="font-size: var(--tipo-pequeno); max-width: 400px; margin: 0 auto var(--espaco-md);">
            Não encontramos artigos para os filtros selecionados. Podes perguntar diretamente no WhatsApp pelo que procuras!
          </p>
          <a href="https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=Olá JOGATINAL! Procuro uma consola/joy/cd específico..." target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-verde">
            <i class="fa-brands fa-whatsapp fa-btn-icon"></i> Perguntar no WhatsApp
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtrados.map(p => this.gerarCardProdutoHTML(p)).join('');
  }

  renderizarDestaquesHome() {
    const container = document.getElementById('container-vitrine-home');
    if (!container) return;

    const destaques = this.produtos.filter(p => p.destaque).slice(0, 6);
    container.innerHTML = destaques.map(p => this.gerarCardProdutoHTML(p)).join('');
  }

  gerarCardProdutoHTML(p) {
    const msgWhatsApp = encodeURIComponent(
      `Olá JOGATINAL! Tenho interesse no seguinte artigo da loja:\n` +
      `📦 Artigo: ${p.nome}\n` +
      `💰 Preço: ${formatarMT(p.preco)}\n` +
      `🛡️ Estado: ${p.estado}\n\n` +
      `Está disponível para levantamento em Matola Muhalaze / Ngolhoza ou entrega ao domicílio?`
    );

    const linkWhatsApp = `https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=${msgWhatsApp}`;

    let iconeCat = '<i class="fa-solid fa-gamepad"></i>';
    if (p.categoria === 'joy') iconeCat = '<i class="fa-solid fa-gamepad"></i>';
    if (p.categoria === 'cd') iconeCat = '<i class="fa-solid fa-compact-disc"></i>';
    if (p.categoria === 'consola') iconeCat = '<i class="fa-solid fa-tv"></i>';

    return `
      <article class="card card-destaque card-produto-item" style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; box-sizing: border-box; overflow: hidden;">
        <div>
          ${p.imagem ? `
            <div style="width: 100%; height: 180px; border-radius: var(--raio-md); overflow: hidden; background-color: var(--cor-fundo-secundario); margin-bottom: var(--espaco-sm); position: relative;">
              <img src="${escaparHTML(p.imagem)}" alt="${escaparHTML(p.nome)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
              <span class="badge-estado" style="position: absolute; top: 10px; left: 10px; background-color: rgba(20, 18, 15, 0.9); border: 1px solid var(--cor-borda);">
                ${iconeCat} ${escaparHTML(p.plataforma)}
              </span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="badge-estado ${p.estado.includes('Novo') ? 'aberto' : 'destaque'}">
              <i class="fa-solid fa-shield-halved fa-btn-icon"></i> ${escaparHTML(p.estado)}
            </span>
            <span style="font-size: var(--tipo-micro); color: var(--cor-verde-hover); font-weight: 600;">
              <i class="fa-solid fa-circle-check"></i> Em Stock
            </span>
          </div>

          <h3 style="font-family: var(--fonte-subtitulos); font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; line-height: 1.25; word-break: break-word;">
            ${escaparHTML(p.nome)}
          </h3>

          <p style="font-size: var(--tipo-micro); color: var(--cor-texto-suave); line-height: 1.45; margin-bottom: var(--espaco-sm);">
            ${escaparHTML(p.descricao)}
          </p>

          ${p.itensInclusos ? `
            <div style="background-color: var(--cor-fundo-secundario); border-radius: var(--raio-sm); padding: 6px 10px; margin-bottom: var(--espaco-sm);">
              <span style="font-size: var(--tipo-micro); color: var(--cor-texto-muted); display: block; font-weight: 700; text-transform: uppercase;"><i class="fa-solid fa-box-open fa-btn-icon"></i> Inclui:</span>
              <span style="font-size: var(--tipo-micro); color: var(--cor-texto-principal);">${escaparHTML(p.itensInclusos.slice(0, 3).join(' · '))}</span>
            </div>
          ` : ''}
        </div>

        <div style="border-top: 1px solid var(--cor-borda); padding-top: var(--espaco-sm); margin-top: var(--espaco-xs);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px; margin-bottom: var(--espaco-sm);">
            <span class="texto-muted" style="font-size: var(--tipo-micro); text-transform: uppercase;">Preço à Vista</span>
            <div class="preco-bebas" style="font-size: 1.85rem; color: var(--cor-dourado); line-height: 1;">
              ${formatarMT(p.preco)}
            </div>
          </div>

          <a href="${linkWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn btn-verde btn-block" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-brands fa-whatsapp fa-btn-icon"></i> Comprar / Encomendar
          </a>
        </div>
      </article>
    `;
  }

  /* ==========================================================================
     Simulador de Venda & Retoma (Compramos a tua Consola, Joy ou CD)
     ========================================================================== */

  vincularSimuladorRetoma() {
    const selectTipo = document.getElementById('retoma-tipo-item');
    const selectModelo = document.getElementById('retoma-modelo-item');
    const selectEstado = document.getElementById('retoma-estado-item');
    const elValorEstimado = document.getElementById('retoma-valor-estimado');
    const btnEnviarProposta = document.getElementById('btn-retoma-enviar-whatsapp');

    if (!selectTipo || !selectModelo || !this.retomaTabela) return;

    const popularModelos = () => {
      const tipo = selectTipo.value; // 'consolas' | 'joys' | 'cds'
      const lista = this.retomaTabela[tipo] || [];

      selectModelo.innerHTML = lista.map(item => `
        <option value="${item.id}" data-base="${item.base}" data-excelente="${item.excelente}" data-bom="${item.bom}" data-marcas="${item.marcas}">
          ${escaparHTML(item.nome)}
        </option>
      `).join('');

      atualizarCalculoRetoma();
    };

    const atualizarCalculoRetoma = () => {
      const opt = selectModelo.selectedOptions[0];
      if (!opt) return;

      const estado = selectEstado.value; // 'excelente' | 'bom' | 'marcas'
      const valor = Number(opt.dataset[estado]) || Number(opt.dataset.base) || 0;

      if (elValorEstimado) {
        elValorEstimado.textContent = formatarMT(valor);
      }

      if (btnEnviarProposta) {
        const tipoNome = selectTipo.selectedOptions[0]?.text || '';
        const modeloNome = opt.text;
        const estadoNome = selectEstado.selectedOptions[0]?.text || '';

        const msg = encodeURIComponent(
          `Olá JOGATINAL! Gostaria de vender / dar em retoma o seguinte artigo:\n` +
          `📌 Tipo: ${tipoNome}\n` +
          `🎮 Modelo: ${modeloNome}\n` +
          `🔍 Estado de Conservação: ${estadoNome}\n` +
          `💵 Estimativa pelo site: ~${formatarMT(valor)}\n\n` +
          `Gostaria de agendar uma avaliação física ou enviar fotos para pagamento via M-Pesa em Matola Muhalaze / Ngolhoza!`
        );

        btnEnviarProposta.href = `https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=${msg}`;
      }
    };

    selectTipo.addEventListener('change', popularModelos);
    selectModelo.addEventListener('change', atualizarCalculoRetoma);
    selectEstado.addEventListener('change', atualizarCalculoRetoma);

    popularModelos();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loja = new LojaController();
  loja.inicializar();
});
