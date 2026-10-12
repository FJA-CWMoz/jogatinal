/**
 * JOGATINAL - api.js
 * Camada de dados centralizada — lê JSON local hoje, pronta para API REST futura
 */

import { CONFIG } from './config.js';

class ApiService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Executa busca genérica com suporte a cache simples de memória
   * @param {string} endpoint 
   * @returns {Promise<any>}
   */
  async requisitar(endpoint) {
    if (this.cache.has(endpoint)) {
      return this.cache.get(endpoint);
    }

    try {
      const url = CONFIG.USAR_API_REST 
        ? `${CONFIG.API_BASE}/api/${endpoint}`
        : `${CONFIG.DATA_PATH}/${endpoint}.json`;

      const resposta = await fetch(url);
      if (!resposta.ok) {
        throw new Error(`Erro de rede ao carregar ${endpoint}: ${resposta.status}`);
      }

      const dados = await resposta.json();
      this.cache.set(endpoint, dados);
      return dados;
    } catch (erro) {
      console.error(`[API JOGATINAL] Falha ao obter ${endpoint}:`, erro);
      throw erro;
    }
  }

  async obterConfig() {
    return this.requisitar('config');
  }

  async obterJogos() {
    return this.requisitar('jogos');
  }

  async obterHDs() {
    return this.requisitar('hds');
  }

  async obterZonas() {
    return this.requisitar('zonas');
  }

  async obterPacks() {
    return this.requisitar('packs');
  }

  async obterProdutos() {
    return this.requisitar('produtos');
  }

  async obterRetomaTabela() {
    return this.requisitar('retoma_tabela');
  }

  async obterRanking() {
    return this.requisitar('ranking');
  }

  async obterTorneios() {
    return this.requisitar('torneios');
  }

  async obterHistoricoTorneios() {
    return this.requisitar('torneios_historico');
  }

  async obterNoticias() {
    return this.requisitar('noticias');
  }
}

export const api = new ApiService();
