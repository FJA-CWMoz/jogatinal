/**
 * JOGATINAL - filtros.js
 * Lógica de pesquisa em tempo real e filtros de jogos por consola e género
 */

/**
 * Filtra jogos por termo de busca, género e suporte na consola
 * @param {Array} jogos 
 * @param {string} termoBusca 
 * @param {string} generoSelecionado 
 * @param {string} consolaId 
 * @returns {Array}
 */
export function filtrarJogos(jogos, termoBusca = '', generoSelecionado = 'todos', consolaId = 'PS4') {
  if (!Array.isArray(jogos)) return [];

  const termoNormalizado = termoBusca.trim().toLowerCase();

  return jogos.filter(jogo => {
    // 1. Filtro de consola (deve ter tamanho definido para a consola atual)
    const tamanhoConsola = jogo.tamanhos ? jogo.tamanhos[consolaId] : null;
    const compativelConsola = tamanhoConsola !== null && tamanhoConsola !== undefined;
    if (!compativelConsola) return false;

    // 2. Filtro de género
    if (generoSelecionado !== 'todos') {
      const generoJogo = (jogo.genero || '').toLowerCase();
      if (!generoJogo.includes(generoSelecionado.toLowerCase())) {
        return false;
      }
    }

    // 3. Filtro de texto (nome, género, ano ou tags)
    if (termoNormalizado) {
      const nomeCorresponde = (jogo.nome || '').toLowerCase().includes(termoNormalizado);
      const generoCorresponde = (jogo.genero || '').toLowerCase().includes(termoNormalizado);
      const tagsCorrespondem = Array.isArray(jogo.tags) && jogo.tags.some(t => t.toLowerCase().includes(termoNormalizado));
      
      if (!nomeCorresponde && !generoCorresponde && !tagsCorrespondem) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt', { sensitivity: 'base' }));
}

/**
 * Extrai lista única de géneros a partir do catálogo
 * @param {Array} jogos 
 * @returns {Array<string>}
 */
export function extrairGenerosUnicos(jogos) {
  if (!Array.isArray(jogos)) return [];
  const conjunto = new Set();
  jogos.forEach(j => {
    if (j.genero) {
      // Divide géneros compostos como "Ação / Aventura"
      const partes = j.genero.split('/').map(p => p.trim());
      partes.forEach(p => conjunto.add(p));
    }
  });
  return Array.from(conjunto).sort();
}
