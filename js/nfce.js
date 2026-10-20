/* ═══════════════════════════════════════════
   NFCE.JS
   Integração com Focus NFe para emissão de NFC-e
   Configuração via localStorage: nfce_token, nfce_cnpj, nfce_url
═════════════════════════════════════════════ */

function getNFCeConfig() {
  return {
    token: localStorage.getItem('nfce_token') || '',
    url:   localStorage.getItem('nfce_url')   || 'https://homologacao.focusnfe.com.br',
    cnpj:  localStorage.getItem('nfce_cnpj')  || '',
  };
}

function nfceConfigurar() {
  const cfg = getNFCeConfig();
  const token = prompt('Token Focus NFe (atual: ' + (cfg.token ? cfg.token.substring(0,8)+'...' : 'não definido') + ')\n\nCole o token completo:', cfg.token || '');
  if (token === null) return;
  const cnpj = prompt('CNPJ do emitente (somente números):', cfg.cnpj || '');
  if (cnpj === null) return;
  const prod = confirm('Usar ambiente de produção?\n\nOK = Produção\nCancelar = Homologação');
  localStorage.setItem('nfce_token', token.trim());
  localStorage.setItem('nfce_cnpj',  cnpj.replace(/\D/g, ''));
  localStorage.setItem('nfce_url',   prod ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br');
  toast('✅ Configurações NFC-e salvas!');
}

async function emitirNFCe(pedido) {
  if (!pedido) {
    toast('Nenhum pedido carregado para emitir NFC-e.', 'error');
    return;
  }

  const cfg = getNFCeConfig();
  if (!cfg.token || !cfg.cnpj) {
    toast('⚠️ NFC-e não configurada! Token e CNPJ são obrigatórios.', 'error');
    setTimeout(() => nfceConfigurar(), 600);
    return;
  }

  const itens = pedido.itens.map((item, index) => ({
    numero_item: index + 1,
    codigo_produto: String(item.id),
    descricao: item.nome,
    codigo_ncm: '21069090',
    cfop: '5102',
    unidade_comercial: 'UN',
    quantidade_comercial: item.qty,
    valor_unitario_comercial: item.preco,
    valor_unitario_tributavel: item.preco,
    quantidade_tributavel: item.qty,
    valor_bruto: item.preco * item.qty,
    codigo_ean: 'SEM GTIN',
    codigo_ean_tributavel: 'SEM GTIN',
    icms_origem: 0,
    icms_situacao_tributaria: '400',
    pis_situacao_tributaria: '07',
    cofins_situacao_tributaria: '07',
  }));

  const formasPgto = { dinheiro: '01', credito: '03', debito: '04', pix: '17' };

  const nota = {
    cnpj_emitente: cfg.cnpj,
    natureza_operacao: 'VENDA',
    forma_pagamento: 0,
    tipo_documento: 65,
    local_destino: 1,
    consumidor_final: 1,
    frete_modalidade: 9,
    presenca_comprador: pedido.tipo === 'delivery' ? 2 : 1,
    itens,
    formas_pagamento: [{
      forma_pagamento: formasPgto[pedido.pgto] || '01',
      valor_pagamento: pedido.total.toFixed(2),
    }],
  };

  try {
    toast('📤 Emitindo NFC-e...', 'info');
    const referencia = `PDV-${Date.now()}`;
    const resposta = await fetch(`${cfg.url}/v2/nfce?ref=${referencia}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Token token=' + cfg.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nota),
    });
    const dados = await resposta.json();
    if (dados.status === 'autorizado' || dados.status === 'processando_autorizacao') {
      toast('✅ NFC-e emitida com sucesso!');
      return dados;
    } else {
      console.error('Erro NFC-e:', dados);
      toast('Erro NFC-e: ' + (dados.mensagem_sefaz || dados.mensagem || dados.status), 'error');
      return null;
    }
  } catch (e) {
    toast('Erro ao conectar Focus NFe: ' + e.message, 'error');
    return null;
  }
}