/* ═══════════════════════════════════════════
   NAVEGACAO.JS
   Controla a troca entre as páginas (Venda, Pedidos, Produtos, Clientes, Caixa)
═══════════════════════════════════════════ */

function goPage(p) {
  // Esconde todas as páginas e desmarca todas as abas
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  // Mostra a página escolhida e marca a aba correspondente
  document.getElementById('page-' + p).classList.add('active');
  document.getElementById('tab-' + p).classList.add('active');

  // Cada página recarrega seus próprios dados do banco ao ser aberta
  if (p === 'venda') {
    renderCardapio();
    if (typeof renderCarrinho === 'function') renderCarrinho();
  }
  if (p === 'produtos') renderTabelaProdutos();
  if (p === 'clientes') renderTabelaClientes();
  if (p === 'pedidos')  renderTabelaPedidos();
  if (p === 'caixa')    renderCaixa();
}

function refreshApp() {
  salvarEstadoPedido();
  toast('🔄 Aplicativo carregando novamente...');
  window.location.reload();
}

function refreshData() {
  toast('🔁 Recarregando dados da página atual...');
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  const pageId = activePage.id.replace('page-', '');

  if (pageId === 'venda') {
    renderCardapio();
    if (typeof renderCarrinho === 'function') renderCarrinho();
    if (typeof calcTotal === 'function') calcTotal();
    salvarEstadoPedido();
  }
  if (pageId === 'produtos') {
    renderTabelaProdutos();
  }
  if (pageId === 'clientes') {
    renderTabelaClientes();
  }
  if (pageId === 'pedidos') {
    renderTabelaPedidos();
  }
  if (pageId === 'caixa') {
    renderCaixa();
  }
}

// Atalhos de teclado: F2 leva direto para a tela de Venda, F5 atualiza o app, Ctrl+R recarrega dados
document.addEventListener('keydown', e => {
  if (e.key === 'F2') {
    e.preventDefault();
    goPage('venda');
  }
  if (e.key === 'F5') {
    e.preventDefault();
    refreshApp();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    refreshData();
  }
});