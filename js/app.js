/* ═══════════════════════════════════════════
   APP.JS
   Arquivo principal — inicializa o sistema inteiro.
   É o último JS a ser carregado no index.html.
═══════════════════════════════════════════ */

async function boot() {
  try {
    if (!window.db) {
      throw new Error('API de banco não disponível. Execute o app pelo Electron.');
    }

    const [produtosCarregados, clientesCarregados, pedidosHoje, caminho] = await Promise.all([
      window.db.produtosListar(),
      window.db.clientesListar(),
      window.db.pedidosHoje(),
      window.db.dbCaminho(),
    ]);

    produtos = produtosCarregados || [];
    clientes = clientesCarregados || [];
    numPedidoAtual = (pedidosHoje || []).length + 1;

    // Restaura o carrinho e os dados da venda após um recarregamento do app
    restaurarEstadoPedido();
    const numPedidoEl = document.getElementById('num-pedido');
    if (numPedidoEl) numPedidoEl.textContent = '#' + String(numPedidoAtual).padStart(3, '0');

    // Mostra o caminho do arquivo do banco na aba Caixa
    const elCaminho = document.getElementById('db-path');
    if (elCaminho) elCaminho.textContent = caminho;

    // Renderiza o cardápio e inicia o relógio
    if (typeof renderCardapio === 'function') renderCardapio();
    iniciarRelogio();
    iniciarMonitorDeDia();

    // Inicializa o sistema de mesas/comandas
    if (typeof inicializarMesas === 'function') inicializarMesas();

    // Configura listener para sincronizar campo mesa com banco
    const mesaInput = document.getElementById('mesa-input');
    if (mesaInput) {
      mesaInput.addEventListener('change', () => {
        mesaAtual = mesaInput.value.trim();
        salvarEstadoPedido();
      });
      mesaInput.addEventListener('input', () => {
        mesaAtual = mesaInput.value.trim();
      });
    }

    // Esconde a tela de carregamento e abre a tela de Venda
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    goPage('venda');

  } catch (e) {
    // Se der erro (ex: rodando fora do Electron), mostra mensagem clara
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.innerHTML = `
        <div style="color:var(--vermelho);text-align:center;padding:40px">
          <div style="font-size:40px">⚠️</div>
          <div style="font-size:16px;margin-top:12px">Erro ao conectar ao banco de dados</div>
          <div style="font-size:12px;color:var(--cinza);margin-top:8px">${e.message}</div>
          <div style="font-size:11px;color:var(--cinza);margin-top:4px">
            Certifique-se de que está rodando dentro do Electron (npm start)
          </div>
        </div>`;
    }
  }
}

// Inicia tudo quando o HTML terminar de carregar
window.addEventListener('DOMContentLoaded', boot);

// Aviso de caixa aberto do dia anterior: dispara assim que a splash finaliza
if (window.appEvents && window.appEvents.onSplashFinalizada) {
  window.appEvents.onSplashFinalizada(async () => {
    try {
      const estado = await window.db.caixaEstado();
      if (estado?.aberto && estado.ultimaData) {
        const ir = confirm(
          '\u26a0\ufe0f CAIXA PENDENTE DE FECHAMENTO\n\n' +
          'O caixa do dia ' + estado.ultimaData + ' ficou sem fechamento e ainda está pendente.\n\n' +
          'Hoje é ' + new Date().toLocaleDateString('pt-BR') + '.\n\n' +
          'Deseja ir para o fechamento de caixa agora?'
        );
        if (ir) goPage('caixa');
      }
    } catch (e) {
      console.warn('Erro ao verificar estado do caixa:', e);
    }
  });
}