/**
 * JOGATINAL - exportar.js
 * Exportação profissional em PDF via jsPDF local e envio WhatsApp com Web Share API
 */

import { formatarMT, formatarGB, formatarTempoInstalacao, mostrarToast } from './utils.js';
import { CONFIG } from './config.js';

/**
 * Obtém instância do jsPDF disponível globalmente via script ou pacote
 */
function obterInstanciaJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }
  if (typeof window.jsPDF === 'function') {
    return window.jsPDF;
  }
  throw new Error('Biblioteca jsPDF não inicializada.');
}

/**
 * Gera PDF oficial da encomenda de jogos da JOGATINAL
 * @param {Object} resumo Dados do resumo do carrinho
 */
export async function gerarOrcamentoPDF(resumo) {
  try {
    const jsPDF = obterInstanciaJsPDF();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeFicheiro = `jogatinal-${resumo.consolaId}-${dataHoje}.pdf`;

    // 1. Cabeçalho Grafite Escuro (#14120f)
    doc.setFillColor(20, 18, 15);
    doc.rect(0, 0, 210, 40, 'F');

    // Linha Verde Relva (#3fa86a)
    doc.setFillColor(63, 168, 106);
    doc.rect(0, 40, 210, 3, 'F');

    // Título JOGATINAL
    doc.setTextColor(245, 241, 232);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('JOGATINAL', 15, 22);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(168, 159, 145);
    doc.text('Futebol Virtual & Jogos Digitais | Matola & Maputo', 15, 30);

    // Dados do cabeçalho à direita
    doc.setFontSize(8);
    doc.setTextColor(232, 184, 75); // Dourado
    doc.text(`DATA: ${dataHoje}`, 195, 18, { align: 'right' });
    doc.setTextColor(245, 241, 232);
    doc.text(`CONSOLA: ${resumo.consolaId}`, 195, 24, { align: 'right' });
    doc.text(`WHATSAPP / TEL: +258 85 339 0327`, 195, 30, { align: 'right' });

    // 2. Metadados da Configuração
    let y = 52;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 18, 15);
    doc.text('RESUMO DA ENCOMENDA & MODO DE SERVIÇO', 15, y);

    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 55, 50);

    let modoTexto = 'Trago o meu HD (Apenas instalação)';
    if (resumo.modoId === 'comprar_hd') modoTexto = `Compro HD (${resumo.hdSelecionado?.nome || 'HD Externo'}) + Jogos`;
    if (resumo.modoId === 'deslocacao') modoTexto = `Deslocação ao Domicílio (${resumo.zonaSelecionada?.nome || 'Zona Selecionada'})`;
    if (resumo.modoId === 'hd_pronto') modoTexto = `HD Pronto a Jogar (${resumo.hdSelecionado?.nome || 'HD'}) + Jogos Testados`;

    doc.text(`• Modo: ${modoTexto}`, 15, y);
    y += 5;
    doc.text(`• Consola Selecionada: ${resumo.consolaId}`, 15, y);
    y += 5;
    doc.text(`• Espaço Utilizado: ${resumo.espacoUsadoGB} GB / ${resumo.capacidadeTotalGB} GB (${resumo.percentualUso}% ocupado)`, 15, y);
    y += 5;
    doc.text(`• Tempo Estimado de Instalação: ${formatarTempoInstalacao(resumo.tempoInstalacaoMinutos)}`, 15, y);

    // 3. Barra Visual de Ocupação de Armazenamento
    y += 8;
    const larguraBarra = 180;
    doc.setFillColor(230, 225, 218);
    doc.roundedRect(15, y, larguraBarra, 4, 1.5, 1.5, 'F');
    const larguraOcupada = (Math.min(100, resumo.percentualUso) / 100) * larguraBarra;
    doc.setFillColor(63, 168, 106);
    if (larguraOcupada > 0) {
      doc.roundedRect(15, y, larguraOcupada, 4, 1.5, 1.5, 'F');
    }

    // 4. Tabela de Jogos
    y += 14;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 18, 15);
    doc.text(`JOGOS SELECIONADOS (${resumo.quantidadeJogos})`, 15, y);

    y += 4;
    // Cabeçalho da tabela
    doc.setFillColor(240, 237, 230);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 70, 60);
    doc.text('#', 18, y + 5);
    doc.text('TÍTULO DO JOGO', 26, y + 5);
    doc.text('GÉNERO', 110, y + 5);
    doc.text('TAMANHO', 150, y + 5);
    doc.text('VALOR', 190, y + 5, { align: 'right' });

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 25, 20);

    if (resumo.jogosSelecionados.length === 0) {
      y += 6;
      doc.text('Nenhum jogo selecionado.', 18, y);
      y += 4;
    } else {
      resumo.jogosSelecionados.forEach((jogo, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(250, 248, 245);
          doc.rect(15, y, 180, 6.5, 'F');
        }

        const tamanhoGB = jogo.tamanhos ? jogo.tamanhos[resumo.consolaId] : 0;
        doc.text(String(index + 1), 18, y + 4.5);
        doc.text(String(jogo.nome).substring(0, 45), 26, y + 4.5);
        doc.text(String(jogo.genero).substring(0, 22), 110, y + 4.5);
        doc.text(formatarGB(tamanhoGB), 150, y + 4.5);
        doc.text(formatarMT(jogo.preco, true), 190, y + 4.5, { align: 'right' });

        y += 6.5;

        // Se passar da página, adiciona página nova
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
      });
    }

    // 5. Bloco de Resumo Financeiro
    y += 8;
    doc.setDrawColor(210, 200, 185);
    doc.line(15, y, 195, y);
    y += 6;

    doc.setFontSize(9);
    doc.text('Subtotal Jogos Avulso:', 120, y);
    doc.text(formatarMT(resumo.precoJogosBruto), 190, y, { align: 'right' });
    y += 5;

    if (resumo.descontoPack > 0) {
      doc.setTextColor(63, 168, 106);
      doc.text(`Desconto (${resumo.packAplicado?.nome || 'Pack Especial'}):`, 120, y);
      doc.text(`- ${formatarMT(resumo.descontoPack)}`, 190, y, { align: 'right' });
      doc.setTextColor(30, 25, 20);
      y += 5;
    }

    if (resumo.precoHD > 0) {
      doc.text(`HD Selecionado (${resumo.hdSelecionado?.nome}):`, 120, y);
      doc.text(formatarMT(resumo.precoHD), 190, y, { align: 'right' });
      y += 5;
    }

    if (resumo.taxaDeslocacao > 0) {
      doc.text(`Taxa de Deslocação (${resumo.zonaSelecionada?.nome}):`, 120, y);
      doc.text(formatarMT(resumo.taxaDeslocacao), 190, y, { align: 'right' });
      y += 5;
    }

    if (resumo.taxaPreparacao > 0) {
      doc.text('Taxa de Preparação e Teste Prévio:', 120, y);
      doc.text(formatarMT(resumo.taxaPreparacao), 190, y, { align: 'right' });
      y += 5;
    }

    // TOTAL DOURADO
    y += 4;
    doc.setFillColor(20, 18, 15);
    doc.roundedRect(110, y, 85, 14, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 241, 232);
    doc.text('VALOR TOTAL:', 116, y + 9);
    doc.setTextColor(232, 184, 75); // Dourado
    doc.setFontSize(14);
    doc.text(formatarMT(resumo.totalGeral), 190, y + 9.5, { align: 'right' });

    // 6. Rodapé Legal & Contactos
    y = 275;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 110, 100);
    doc.text('JOGATINAL - Matola Muhalaze / Ngolhoza, Província de Maputo | Tel/WhatsApp: +258 85 339 0327 | contacto@jogatinal.mz', 105, y, { align: 'center' });
    y += 4;
    doc.text('* Este documento é uma cotação/orçamento detalhado para encomenda e não constitui fatura comercial fiscal.', 105, y, { align: 'center' });

    doc.save(nomeFicheiro);
    mostrarToast(`PDF gerado com sucesso: ${nomeFicheiro}`, 'sucesso');
  } catch (erro) {
    console.error('[PDF] Falha na geração:', erro);
    mostrarToast('Não foi possível gerar o PDF. Tente novamente.', 'erro');
  }
}

/**
 * Monta texto formatado profissional para envio por WhatsApp
 * @param {Object} resumo 
 * @returns {string}
 */
export function gerarMensagemWhatsApp(resumo) {
  let modoNome = 'Trago o meu HD';
  if (resumo.modoId === 'comprar_hd') modoNome = `Comprar HD (${resumo.hdSelecionado?.nome || '1TB'})`;
  if (resumo.modoId === 'deslocacao') modoNome = `Deslocação ao domicílio (${resumo.zonaSelecionada?.nome || 'Matola'})`;
  if (resumo.modoId === 'hd_pronto') modoNome = `HD já com jogos prontos (${resumo.hdSelecionado?.nome || '1TB'})`;

  let jogosTexto = '';
  resumo.jogosSelecionados.forEach((j, i) => {
    const gb = j.tamanhos ? j.tamanhos[resumo.consolaId] : 0;
    jogosTexto += `  ${i + 1}. *${j.nome}* (${formatarGB(gb)}) - ${formatarMT(j.preco, true)}\n`;
  });

  if (!jogosTexto) {
    jogosTexto = '  (Nenhum jogo selecionado ainda)\n';
  }

  let descontoTexto = '';
  if (resumo.descontoPack > 0) {
    descontoTexto = `🎁 *Desconto Pack (${resumo.packAplicado?.nome}):* -${formatarMT(resumo.descontoPack)}\n`;
  }

  let taxaExtraTexto = '';
  if (resumo.precoHD > 0) {
    taxaExtraTexto += `💾 *HD Escolhido:* ${resumo.hdSelecionado?.nome} (${formatarMT(resumo.precoHD)})\n`;
  }
  if (resumo.taxaDeslocacao > 0) {
    taxaExtraTexto += `📍 *Deslocação:* ${resumo.zonaSelecionada?.nome} (${formatarMT(resumo.taxaDeslocacao)})\n`;
  }
  if (resumo.taxaPreparacao > 0) {
    taxaExtraTexto += `⚡ *Taxa de Preparação:* ${formatarMT(resumo.taxaPreparacao)}\n`;
  }

  return `⚽🎮 *PEDIDO JOGATINAL - CONFIGURADOR DE JOGOS*

Olá, Equipa JOGATINAL! Montei a minha encomenda no site e quero confirmar os detalhes:

📋 *DADOS GERAIS:*
• *Modo:* ${modoNome}
• *Consola:* ${resumo.consolaId}
• *Armazenamento:* ${resumo.espacoUsadoGB} GB usados de ${resumo.capacidadeTotalGB} GB (${resumo.percentualUso}%)
• *Tempo Estimado:* ${formatarTempoInstalacao(resumo.tempoInstalacaoMinutos)}

🎮 *JOGOS ESCOLHIDOS (${resumo.quantidadeJogos}):*
${jogosTexto}
${taxaExtraTexto}${descontoTexto}
💰 *VALOR TOTAL: ${formatarMT(resumo.totalGeral)}*

Como podemos avançar com o pagamento e entrega? Aguardo o vosso retorno. Obrigado!`;
}

/**
 * Envia orçamento via Web Share API (mobile) ou abre WhatsApp via wa.me (fallback)
 * @param {Object} resumo 
 */
export async function enviarWhatsApp(resumo) {
  const mensagem = gerarMensagemWhatsApp(resumo);
  const telefone = CONFIG.TELEFONE_WHATSAPP;

  // 1. Tentar Web Share API se suportado (Mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Pedido de Jogos JOGATINAL',
        text: mensagem
      });
      mostrarToast('Orçamento partilhado com sucesso!', 'sucesso');
      return;
    } catch (erro) {
      if (erro.name !== 'AbortError') {
        console.warn('[WebShare] Falha, alternando para wa.me:', erro);
      } else {
        return; // Usuário cancelou
      }
    }
  }

  // 2. Fallback para URL wa.me
  const urlWhatsApp = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
  mostrarToast('A abrir o WhatsApp...', 'sucesso');
}
