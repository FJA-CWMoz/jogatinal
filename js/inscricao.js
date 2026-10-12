/**
 * JOGATINAL - inscricao.js
 * Lógica de seleção de torneio, validação de campos e submissão via Web Share e WhatsApp
 */

import { api } from './api.js';
import { formatarMT, escaparHTML, mostrarToast } from './utils.js';
import { CONFIG } from './config.js';

class InscricaoManager {
  constructor() {
    this.torneios = [];
    this.torneioSelecionado = null;
  }

  async inicializar() {
    try {
      this.torneios = await api.obterTorneios();
      this.renderizarListaTorneios();

      // Verificar parâmetro na URL: ?torneio=ID
      const params = new URLSearchParams(window.location.search);
      const torneioUrl = params.get('torneio');

      if (torneioUrl) {
        const encontrado = this.torneios.find(t => t.id === torneioUrl);
        if (encontrado && encontrado.estado !== 'esgotado') {
          this.selecionarTorneio(encontrado);
        } else {
          this.selecionarPrimeiroDisponivel();
        }
      } else {
        this.selecionarPrimeiroDisponivel();
      }

      this.vincularFormulario();
    } catch (erro) {
      console.error('[Inscricao] Erro na inicialização:', erro);
      mostrarToast('Erro ao carregar dados do torneio.', 'erro');
    }
  }

  selecionarPrimeiroDisponivel() {
    const disponivel = this.torneios.find(t => t.estado === 'aberto') || this.torneios[0];
    if (disponivel) {
      this.selecionarTorneio(disponivel);
    }
  }

  renderizarListaTorneios() {
    const container = document.getElementById('lista-selecao-torneios');
    if (!container) return;

    container.innerHTML = this.torneios.map(t => {
      const isEsgotado = t.estado === 'esgotado';
      const isSelecionado = this.torneioSelecionado?.id === t.id;

      return `
        <div class="torneio-item-escolha ${isSelecionado ? 'selecionado' : ''} ${isEsgotado ? 'esgotado' : ''}" data-id="${escaparHTML(t.id)}">
          <div class="torneio-escolha-header">
            <h4 class="torneio-escolha-titulo">${escaparHTML(t.titulo)}</h4>
            <span class="torneio-escolha-premio">${escaparHTML(t.premioTotal)}</span>
          </div>
          <div class="metadados-linha" style="font-size: var(--tipo-micro);">
            <span>${escaparHTML(t.jogo)}</span>
            <span class="metadados-separador">·</span>
            <span>${escaparHTML(t.consola)}</span>
            <span class="metadados-separador">·</span>
            <span style="color: ${isEsgotado ? 'var(--cor-texto-muted)' : 'var(--cor-verde-marca)'};">
              ${isEsgotado ? 'Esgotado' : `Taxa: ${formatarMT(t.taxaInscricao)}`}
            </span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.torneio-item-escolha').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const t = this.torneios.find(itemT => itemT.id === id);
        if (t.estado === 'esgotado') {
          mostrarToast('Este torneio já tem as vagas esgotadas.', 'info');
          return;
        }
        this.selecionarTorneio(t);
      });
    });
  }

  selecionarTorneio(t) {
    this.torneioSelecionado = t;

    // Atualiza classe selecionada na lista
    document.querySelectorAll('.torneio-item-escolha').forEach(item => {
      item.classList.toggle('selecionado', item.dataset.id === t.id);
    });

    // Atualiza resumo
    const painelResumo = document.getElementById('painel-resumo-torneio');
    if (painelResumo) {
      const vagasRestantes = Math.max(0, t.vagasTotal - t.vagasOcupadas);
      painelResumo.innerHTML = `
        <div class="resumo-torneio-selecionado">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="texto-muted" style="font-size: var(--tipo-micro); text-transform: uppercase;">Torneio Selecionado</span>
            ${vagasRestantes <= 8 ? `<span class="badge-estado destaque"><i class="fa-solid fa-triangle-exclamation fa-btn-icon"></i> Restam apenas ${vagasRestantes} vagas!</span>` : ''}
          </div>
          <h4 class="resumo-torneio-titulo">${escaparHTML(t.titulo)}</h4>
          <p style="font-size: var(--tipo-pequeno); margin: 0;">
            <i class="fa-solid fa-calendar-days fa-verde fa-btn-icon"></i> <strong>Data:</strong> ${escaparHTML(t.data)} às ${escaparHTML(t.hora || '10h00')} | <i class="fa-solid fa-location-dot fa-dourado fa-btn-icon"></i> <strong>Local:</strong> ${escaparHTML(t.local)}
          </p>
          <p style="font-size: var(--tipo-pequeno); margin: 0;">
            <i class="fa-solid fa-trophy fa-dourado fa-btn-icon"></i> <strong>Prémio Total:</strong> <span style="color: var(--cor-dourado); font-weight: 700;">${escaparHTML(t.premioTotal)}</span> | 
            <i class="fa-solid fa-ticket fa-verde fa-btn-icon"></i> <strong>Taxa de Inscrição:</strong> <strong>${formatarMT(t.taxaInscricao)}</strong>
          </p>
          <small class="texto-muted">Regras: ${escaparHTML(t.regrasResumo)}</small>
        </div>
      `;
    }

    // Pré-preenche campos automáticos
    const inputJogo = document.getElementById('inscricao-jogo');
    if (inputJogo) inputJogo.value = t.jogo;
    const inputConsola = document.getElementById('inscricao-consola');
    if (inputConsola) inputConsola.value = t.consola;
  }

  vincularFormulario() {
    const form = document.getElementById('form-inscricao-torneio');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!this.torneioSelecionado) {
        mostrarToast('Por favor seleciona um torneio primeiro.', 'erro');
        return;
      }

      // Validação de campos
      const nome = document.getElementById('inscricao-nome')?.value.trim();
      const whatsapp = document.getElementById('inscricao-whatsapp')?.value.trim();
      const idade = document.getElementById('inscricao-idade')?.value.trim();
      const nickname = document.getElementById('inscricao-nickname')?.value.trim() || 'Nenhum';
      const termos = document.getElementById('inscricao-termos')?.checked;

      // Limpar erros anteriores
      document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

      let valido = true;

      if (!nome || nome.length < 3) {
        this.marcarErro('inscricao-nome', 'Insira o seu nome completo (mínimo 3 letras).');
        valido = false;
      }

      if (!whatsapp || whatsapp.length < 8) {
        this.marcarErro('inscricao-whatsapp', 'Insira um contacto de WhatsApp válido (ex: 85 339 0327).');
        valido = false;
      }

      const idadeNum = Number(idade);
      if (!idade || isNaN(idadeNum) || idadeNum < 10 || idadeNum > 70) {
        this.marcarErro('inscricao-idade', 'Idade deve ser entre 10 e 70 anos.');
        valido = false;
      }

      if (!termos) {
        this.marcarErro('inscricao-termos-erro', 'Deves aceitar o regulamento e termos do torneio.');
        valido = false;
      }

      if (!valido) {
        mostrarToast('Verifica os campos assinalados a vermelho.', 'erro');
        return;
      }

      // Montar mensagem para WhatsApp
      const mensagem = `🏆 *INSCRIÇÃO EM TORNEIO - JOGATINAL*

Olá, Equipa JOGATINAL! Gostaria de confirmar a minha inscrição no torneio:

📋 *DADOS DO TORNEIO:*
• *Torneio:* ${this.torneioSelecionado.titulo}
• *Jogo & Consola:* ${this.torneioSelecionado.jogo} (${this.torneioSelecionado.consola})
• *Data:* ${this.torneioSelecionado.data}
• *Taxa de Inscrição:* ${formatarMT(this.torneioSelecionado.taxaInscricao)}

👤 *DADOS DO JOGADOR:*
• *Nome:* ${nome}
• *Gamer Tag / Nickname:* ${nickname}
• *WhatsApp:* ${whatsapp}
• *Idade:* ${idade} anos

Li e aceito o Regulamento Oficial da JOGATINAL. Como posso efetuar o pagamento da taxa via M-Pesa / e-Mola para confirmar a minha vaga?`;

      const btnSubmit = form.querySelector('button[type="submit"]');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'A enviar inscrição...';
      }

      try {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Inscrição Torneio - ${this.torneioSelecionado.titulo}`,
              text: mensagem
            });
            mostrarToast('Inscrição enviada com sucesso!', 'sucesso');
            form.reset();
            return;
          } catch (erroShare) {
            if (erroShare.name !== 'AbortError') {
              console.warn('[Share] Fallback para wa.me:', erroShare);
            } else {
              return;
            }
          }
        }

        const url = `https://wa.me/${CONFIG.TELEFONE_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        mostrarToast('Inscrição pronta! A abrir o WhatsApp...', 'sucesso');
        form.reset();
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = 'Submeter Inscrição via WhatsApp →';
        }
      }
    });
  }

  marcarErro(campoId, mensagem) {
    const el = document.getElementById(campoId);
    if (!el) return;
    const erroEl = el.closest('.form-group')?.querySelector('.form-error') || 
                   document.getElementById(`${campoId}-erro`);
    if (erroEl) {
      erroEl.textContent = mensagem;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-inscricao-torneio')) {
    const manager = new InscricaoManager();
    manager.inicializar();
  }
});
