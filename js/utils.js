/* ═══════════════════════════════════════════
   UTILS.JS
   Funções auxiliares pequenas, usadas em vários lugares.
   Reaproveitável em qualquer projeto futuro.
═══════════════════════════════════════════ */

// Formata número para "R$ 0,00"
function fmt(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

// Mostra um avisinho no canto da tela (verde, vermelho ou laranja)
function toast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 5500);
}

// Abre uma janela modal pelo ID
function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}

// Fecha uma janela modal pelo ID
function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Atualiza o relógio no topo da tela, a cada segundo
function iniciarRelogio() {
  setInterval(() => {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
  }, 1000);
}

// Monitora a troca de dia e atualiza os pedidos do dia automaticamente
function iniciarMonitorDeDia() {
  let dataAtual = new Date().toLocaleDateString('pt-BR');

  setInterval(() => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    if (hoje !== dataAtual) {
      dataAtual = hoje;
      toast('🕒 Novo dia detectado. Iniciando novo dia de pedidos.', 'info');
      if (typeof renderTabelaPedidos === 'function') renderTabelaPedidos();
      if (typeof renderCaixa === 'function') renderCaixa();
      if (typeof atualizarNumPedidoAtual === 'function') atualizarNumPedidoAtual();
    }
  }, 60000);
}