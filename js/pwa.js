/**
 * JOGATINAL - pwa.js
 * Registo de Service Worker, instalação In-App (Chromium + iOS) e indicador offline
 */

import { mostrarToast } from './utils.js';

let promptInstalacao = null;

export function inicializarPWA() {
  // 1. Registo de Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registar Service Worker:', err);
        });
    });
  }

  // 2. Indicadores de Conetividade Offline / Online
  window.addEventListener('offline', () => {
    mostrarToast('Modo Offline: Estás a navegar com os dados em cache.', 'info', 5000);
  });

  window.addEventListener('online', () => {
    mostrarToast('Ligação restabelecida com sucesso!', 'sucesso', 3000);
  });

  // 3. Captura do evento de instalação (Chromium / Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacao = e;
    atualizarBotoesInstalacao(true);
  });

  window.addEventListener('appinstalled', () => {
    promptInstalacao = null;
    atualizarBotoesInstalacao(false);
    mostrarToast('Aplicação instalada com sucesso no teu telemóvel!', 'sucesso');
  });

  // 4. Vincular botões de instalação se existirem na página
  vincularBotoesInstalacao();
}

function atualizarBotoesInstalacao(visivel) {
  const botoes = document.querySelectorAll('.btn-pwa-install');
  botoes.forEach(btn => {
    btn.style.display = visivel ? 'inline-flex' : 'none';
  });
}

function vincularBotoesInstalacao() {
  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (isStandalone) {
    atualizarBotoesInstalacao(false);
    return;
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-pwa-install');
    if (!btn) return;

    if (promptInstalacao) {
      promptInstalacao.prompt();
      const escolha = await promptInstalacao.userChoice;
      if (escolha.outcome === 'accepted') {
        promptInstalacao = null;
        atualizarBotoesInstalacao(false);
      }
    } else if (isIOS) {
      mostrarGuiaInstalacaoIOS();
    } else {
      mostrarToast('Para instalar: Clica no menu do teu navegador (⋮) e escolhe "Instalar aplicação".', 'info', 5000);
    }
  });
}

function mostrarGuiaInstalacaoIOS() {
  let modal = document.getElementById('modal-ios-install');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-ios-install';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    `;
    modal.innerHTML = `
      <div style="background-color: var(--cor-superficie); border: 1px solid var(--cor-borda); border-radius: var(--raio-lg); padding: 24px; max-width: 360px; width: 100%; box-shadow: var(--sombra-elevada);">
        <h4 style="font-family: var(--fonte-subtitulos); font-size: 1.2rem; color: var(--cor-texto-principal); margin-bottom: 8px;">
          Instalar no iPhone / iPad
        </h4>
        <p style="font-size: var(--tipo-pequeno); color: var(--cor-texto-suave); line-height: 1.5; margin-bottom: 16px;">
          1. Toca no botão <strong>Partilhar</strong> (ícone com quadrado e seta para cima) na barra inferior do Safari.<br /><br />
          2. Rola para baixo e seleciona <strong>"Adicionar ao Ecrã Principal"</strong>.
        </p>
        <button type="button" id="btn-fechar-ios-guia" class="btn btn-verde btn-block">Entendido</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-fechar-ios-guia').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  } else {
    modal.style.display = 'flex';
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPWA);
} else {
  inicializarPWA();
}
