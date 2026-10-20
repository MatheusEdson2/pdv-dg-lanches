// Expõe funções seguras para o index.html usar
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  // Produtos
  produtosListar:  ()   => ipcRenderer.invoke('produtos:listar'),
  produtosSalvar:  (p)  => ipcRenderer.invoke('produtos:salvar', p),
  produtosDeletar: (id) => ipcRenderer.invoke('produtos:deletar', id),

  // Clientes
  clientesListar:  ()   => ipcRenderer.invoke('clientes:listar'),
  clientesSalvar:  (c)  => ipcRenderer.invoke('clientes:salvar', c),
  clientesDeletar: (id) => ipcRenderer.invoke('clientes:deletar', id),

  // Pedidos
  pedidosListar:    ()   => ipcRenderer.invoke('pedidos:listar'),
  pedidosSalvar:    (p)  => ipcRenderer.invoke('pedidos:salvar', p),
  pedidosHoje:      ()   => ipcRenderer.invoke('pedidos:hoje'),
  pedidosCaixaHoje: (data) => ipcRenderer.invoke('pedidos:caixa', data),
  pedidoCancelar:   (id) => ipcRenderer.invoke('pedidos:cancelar', id),
  salvarPedidoAberto:    (p)  => ipcRenderer.invoke('pedidos:salvarAberto', p),
  atualizarPedidoAberto: (d)  => ipcRenderer.invoke('pedidos:atualizarAberto', d),
  pedidosAbertos:   ()   => ipcRenderer.invoke('pedidos:abertos'),
  finalizarPedidoAberto: (id) => ipcRenderer.invoke('pedidos:finalizarAberto', id),

  // Caixa
  caixaLimpar: (data) => ipcRenderer.invoke('caixa:limpar', data),
  caixaEstado: () => ipcRenderer.invoke('caixa:estado'),
  caixaAbrir: () => ipcRenderer.invoke('caixa:abrir'),
  caixaRelatorio: (periodo) => ipcRenderer.invoke('caixa:relatorio', { periodo }),

  // Info
  dbCaminho: () => ipcRenderer.invoke('db:caminho'),
  salvarRelatorio: (nomeArquivo, html) => ipcRenderer.invoke('relatorio:salvar', { nomeArquivo, html }),
});

contextBridge.exposeInMainWorld('appEvents', {
  onSplashFinalizada: (callback) => ipcRenderer.on('splash:finalizada', callback),
});