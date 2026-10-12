/**
 * JOGATINAL - utils.js
 * Funções utilitárias, formatadores moçambicanos e sistema de toasts acessível
 */

/**
 * Formata um valor numérico em Meticais (MT)
 * @param {number} valor 
 * @param {boolean} considerarGratis Se 0 deve retornar "Grátis"
 * @returns {string}
 */
export function formatarMT(valor, considerarGratis = false) {
  if (considerarGratis && (valor === 0 || valor === '0')) {
    return 'Grátis';
  }
  const numero = Number(valor) || 0;
  return `${numero.toLocaleString('pt-MZ')} MT`;
}

/**
 * Formata tamanho de armazenamento em Gigabytes
 * @param {number|null} gb 
 * @returns {string}
 */
export function formatarGB(gb) {
  if (gb === null || gb === undefined) return 'Incompatível';
  const num = Number(gb);
  return `${num.toFixed(1).replace('.0', '')} GB`;
}

/**
 * Formata tempo estimado de instalação de jogos
 * Fórmula de negócio: (GB usados × 0.12) minutos, mínimo 10 min
 * @param {number} minutos 
 * @returns {string}
 */
export function formatarTempoInstalacao(minutos) {
  const m = Math.max(10, Math.round(minutos || 10));
  if (m < 60) {
    return `~${m} minutos`;
  }
  const horas = Math.floor(m / 60);
  const restoMin = m % 60;
  return restoMin > 0 ? `~${horas}h ${restoMin}m` : `~${horas}h`;
}

/**
 * Escapa strings contra injeção de HTML
 * @param {string} texto 
 * @returns {string}
 */
export function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Debounce para buscas textuais e inputs de capacidade
 * @param {Function} func 
 * @param {number} espera 
 * @returns {Function}
 */
export function debounce(func, espera = 250) {
  let timeout;
  return function executado(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), espera);
  };
}

/**
 * Sistema de Toasts elegante e acessível (NUNCA usa alert())
 * @param {string} mensagem 
 * @param {'sucesso'|'erro'|'info'} tipo 
 * @param {number} duracaoMs 
 */
export function mostrarToast(mensagem, tipo = 'info', duracaoMs = 3800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  
  let iconeHtml = '<i class="fa-solid fa-circle-info fa-dourado"></i>';
  if (tipo === 'sucesso') iconeHtml = '<i class="fa-solid fa-circle-check fa-verde"></i>';
  if (tipo === 'erro') iconeHtml = '<i class="fa-solid fa-circle-xmark fa-vermelho"></i>';
  if (tipo === 'aviso') iconeHtml = '<i class="fa-solid fa-triangle-exclamation fa-dourado"></i>';

  toast.innerHTML = `
    <span style="font-size: 1.1rem; display: inline-flex; align-items: center;">${iconeHtml}</span>
    <span>${escaparHTML(mensagem)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 250ms ease, transform 250ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 260);
  }, duracaoMs);
}
