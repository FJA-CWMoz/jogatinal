/**
 * JOGATINAL - packs.js
 * Lógica de cálculo de descontos, poupança e renderização dos packs sugeridos
 */

import { formatarMT } from './utils.js';

/**
 * Calcula preços e poupança de um determinado pack
 * @param {Object} pack 
 * @param {Array} todosJogos 
 * @param {string} consolaId 
 * @returns {Object}
 */
export function calcularMetricasPack(pack, todosJogos, consolaId) {
  const jogosDoPack = pack.jogosIds
    .map(id => todosJogos.find(j => j.id === id))
    .filter(Boolean);

  // Jogos compatíveis com a consola escolhida
  const jogosCompativeis = jogosDoPack.filter(j => 
    j.tamanhos && j.tamanhos[consolaId] !== null && j.tamanhos[consolaId] !== undefined
  );

  let precoBruto = 0;
  let espacoTotalGB = 0;

  jogosCompativeis.forEach(j => {
    precoBruto += Number(j.preco) || 0;
    espacoTotalGB += Number(j.tamanhos[consolaId]) || 0;
  });

  const descontoPercent = Number(pack.descontoPercent) || 0;
  const valorDesconto = Math.round(precoBruto * (descontoPercent / 100));
  const precoComDesconto = Math.max(0, precoBruto - valorDesconto);

  return {
    jogosCompativeis,
    quantidadeTotal: pack.jogosIds.length,
    quantidadeCompativel: jogosCompativeis.length,
    precoBruto,
    precoComDesconto,
    poupanca: valorDesconto,
    espacoTotalGB: Math.round(espacoTotalGB * 10) / 10,
    disponivelNaConsola: jogosCompativeis.length >= (pack.minimoManter || 2)
  };
}

/**
 * Gera lista de nomes dos jogos do pack para exibição
 * @param {Object} pack 
 * @param {Array} todosJogos 
 * @returns {string}
 */
export function obterNomesJogosPack(pack, todosJogos) {
  return pack.jogosIds
    .map(id => {
      const j = todosJogos.find(item => item.id === id);
      return j ? j.nome : id;
    })
    .join(', ');
}
