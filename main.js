const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ═══════════════════════════════════════
// BANCO DE DADOS
// ═══════════════════════════════════════

const userDataPath = app.getPath('userData');

// Garante que a pasta existe antes de criar o banco
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
const dbPath = path.join(userDataPath, 'dg-lanches.db');

const relatoriosPath = path.join(userDataPath, 'relatorios');
fs.mkdirSync(relatoriosPath, { recursive: true });
console.log('Banco de dados em:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// Migração segura — adiciona colunas novas sem quebrar banco existente
try { db.prepare("ALTER TABLE pedidos ADD COLUMN taxa_entrega REAL DEFAULT 0").run(); } catch (e) { }
try { db.prepare("ALTER TABLE pedidos ADD COLUMN mesa TEXT DEFAULT ''").run(); } catch (e) { }
try { db.prepare("ALTER TABLE pedidos ADD COLUMN caixa_aberto INTEGER DEFAULT 1").run(); } catch (e) { }

db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL,
    cat       TEXT    NOT NULL,
    preco     REAL    NOT NULL,
    descricao TEXT    DEFAULT '',
    emoji     TEXT    DEFAULT '🍔',
    status    INTEGER DEFAULT 1,
    badge     TEXT    DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL,
    tel       TEXT    DEFAULT '',
    cep       TEXT    DEFAULT '',
    rua       TEXT    DEFAULT '',
    num       TEXT    DEFAULT '',
    bairro    TEXT    DEFAULT '',
    cidade    TEXT    DEFAULT '',
    comp      TEXT    DEFAULT '',
    pedidos   INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id   INTEGER DEFAULT NULL,
    cliente      TEXT    DEFAULT 'Balcão',
    total        REAL    NOT NULL,
    subtotal     REAL    NOT NULL,
    desconto     REAL    DEFAULT 0,
    taxa_entrega REAL    DEFAULT 0,
    tipo         TEXT    DEFAULT 'balcao',
    pgto         TEXT    DEFAULT 'dinheiro',
    status       TEXT    DEFAULT 'pago',
    hora         TEXT    DEFAULT '',
    data         TEXT    DEFAULT '',
    mesa         TEXT    DEFAULT '',
    caixa_aberto INTEGER DEFAULT 1,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS itens_pedido (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id      INTEGER NOT NULL,
    produto_id     INTEGER NOT NULL,
    nome           TEXT    NOT NULL,
    preco_unitario REAL    NOT NULL,
    quantidade     INTEGER NOT NULL,
    FOREIGN KEY (pedido_id)  REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
  );
`);

// Produtos padrão
const totalProdutos = db.prepare('SELECT COUNT(*) as c FROM produtos').get();
if (totalProdutos.c === 0) {
  const insert = db.prepare(`
    INSERT INTO produtos (nome, cat, preco, descricao, emoji, status, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((lista) => {
    for (const p of lista) insert.run(p.nome, p.cat, p.preco, p.desc, p.emoji, 1, p.badge || '');
  });
  insertMany([
    { nome: 'DG - Tudão (Tudo)', cat: 'lanche', preco: 17.90, desc: 'Pão, Bife tradicional, Ovo, Presunto, Bacon, Mussarela, Alface, Tomate, Milho e Batata Palha', emoji: '🍔', badge: 'CARRO CHEFE' },
    { nome: 'DG - Burguer', cat: 'lanche', preco: 13.90, desc: 'Pão, Bife tradicional, Mussarela, Alface, Tomate, Milho e Batata Palha', emoji: '🍔', badge: '' },
    { nome: 'DG - Bacon', cat: 'lanche', preco: 15.90, desc: 'Pão, Bife tradicional, Bacon, Mussarela, Alface, Tomate, Milho e Batata Palha', emoji: '🍔', badge: '' },
    { nome: 'DG - Egg Burguer', cat: 'lanche', preco: 14.90, desc: 'Pão, Bife tradicional, Ovo, Mussarela, Alface, Tomate, Milho e Batata Palha', emoji: '🍔', badge: '' },
    { nome: 'DG - Presunto', cat: 'lanche', preco: 13.90, desc: 'Pão, Bife tradicional, Presunto, Mussarela, Alface, Tomate, Milho e Batata Palha', emoji: '🍔', badge: '' },
    { nome: 'DG - Hambúrguer', cat: 'lanche', preco: 10.90, desc: 'Pão, Bife tradicional, Ovo, Batata Palha, Alface, Tomate e Milho', emoji: '🍔', badge: '' },
    { nome: 'Batata Frita 400g', cat: 'porcao', preco: 12.90, desc: 'Batata frita crocante (400 gramas)', emoji: '🍟', badge: '' },
    { nome: 'Batata c/ Bacon 400g', cat: 'porcao', preco: 16.90, desc: 'Batata frita com bacon crocante (400 gramas)', emoji: '🍟', badge: '' },
    { nome: 'Batata c/ Mussarela 400g', cat: 'porcao', preco: 14.90, desc: 'Batata frita com mussarela derretida (400 gramas)', emoji: '🍟', badge: '' },
    { nome: 'Batata c/ Muss. e Bacon 400g', cat: 'porcao', preco: 17.90, desc: 'Batata frita com mussarela e bacon (400 gramas)', emoji: '🍟', badge: '' },
    { nome: 'Batata c/ Cheddar e Bacon 400g', cat: 'porcao', preco: 18.90, desc: 'Batata frita com cheddar e bacon (400 gramas)', emoji: '🍟', badge: '' },
    { nome: 'Combo DG 1', cat: 'combo', preco: 19.90, desc: 'DG Burguer + Batata Frita 100g + Mini Refri', emoji: '🌟', badge: '' },
    { nome: 'Combo DG 2', cat: 'combo', preco: 26.90, desc: 'DG Tudão + Batata Frita 100g + Mini Refri', emoji: '🌟', badge: 'MAIS PEDIDO' },
  ]);
}

// ═══════════════════════════════════════
// JANELAS
// ═══════════════════════════════════════
let splashWindow;
let mainWindow;
let mainReady = false; // PDV terminou de carregar?
let splashDone = false; // Barra de progresso terminou?

function abrirPDV() {
  // Só abre o PDV quando os dois estiverem prontos
  if (!mainReady || !splashDone) return;
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
}

function createSplash() {
  splashWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    show: false,
    backgroundColor: "#0A0A0A",
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload-splash.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));

  splashWindow.once("ready-to-show", () => {
    splashWindow.show();
  });
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'DG Lanches — PDV',
    autoHideMenuBar: true,
    show: false, // fica escondido até a splash terminar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.maximize();

  mainWindow.webContents.once('did-finish-load', () => {
    mainReady = true;
    abrirPDV();
  });
}

app.whenReady().then(() => {
  createSplash();
  createMain();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Splash avisa que a barra terminou → tenta abrir o PDV
ipcMain.on('splash:pronto', () => {
  splashDone = true;
  abrirPDV();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('splash:finalizada');
  }
});

// ═══════════════════════════════════════
// IPC — PRODUTOS
// ═══════════════════════════════════════
ipcMain.handle('produtos:listar', () => {
  return db.prepare('SELECT * FROM produtos ORDER BY cat, nome').all();
});

ipcMain.handle('produtos:salvar', (_, p) => {
  if (p.id) {
    db.prepare(`UPDATE produtos SET nome=?, cat=?, preco=?, descricao=?, emoji=?, status=?, badge=? WHERE id=?`)
      .run(p.nome, p.cat, p.preco, p.descricao, p.emoji, p.status, p.badge, p.id);
    return { ok: true, id: p.id };
  } else {
    const r = db.prepare(`INSERT INTO produtos (nome, cat, preco, descricao, emoji, status, badge) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(p.nome, p.cat, p.preco, p.descricao, p.emoji, p.status, p.badge);
    return { ok: true, id: r.lastInsertRowid };
  }
});

ipcMain.handle('produtos:deletar', (_, id) => {
  db.prepare('DELETE FROM produtos WHERE id=?').run(id);
  return { ok: true };
});

// ═══════════════════════════════════════
// IPC — CLIENTES
// ═══════════════════════════════════════
ipcMain.handle('clientes:listar', () => {
  return db.prepare('SELECT * FROM clientes ORDER BY nome').all();
});

ipcMain.handle('clientes:salvar', (_, c) => {
  if (c.id) {
    db.prepare(`UPDATE clientes SET nome=?, tel=?, cep=?, rua=?, num=?, bairro=?, cidade=?, comp=? WHERE id=?`)
      .run(c.nome, c.tel, c.cep, c.rua, c.num, c.bairro, c.cidade, c.comp, c.id);
    return { ok: true, id: c.id };
  } else {
    const r = db.prepare(`INSERT INTO clientes (nome, tel, cep, rua, num, bairro, cidade, comp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.nome, c.tel, c.cep, c.rua, c.num, c.bairro, c.cidade, c.comp);
    return { ok: true, id: r.lastInsertRowid };
  }
});

ipcMain.handle('clientes:deletar', (_, id) => {
  const linkedPedidos = db.prepare('SELECT COUNT(*) as c FROM pedidos WHERE cliente_id=?').get(id).c;
  if (linkedPedidos > 0) {
    // Desvincula pedidos: define cliente_id NULL e nome como 'Balcão'
    db.prepare("UPDATE pedidos SET cliente_id=NULL, cliente='Balcão' WHERE cliente_id=?").run(id);
    // Atualiza contagem 'pedidos' não é necessária pois cliente será removido
    db.prepare('DELETE FROM clientes WHERE id=?').run(id);
    return { ok: true, reassigned: linkedPedidos };
  }

  db.prepare('DELETE FROM clientes WHERE id=?').run(id);
  return { ok: true, reassigned: 0 };
});

// ═══════════════════════════════════════
// IPC — PEDIDOS
// ═══════════════════════════════════════
ipcMain.handle('pedidos:listar', () => {
  const lista = db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all();
  const getItens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id=?');
  return lista.map(p => ({ ...p, itens: getItens.all(p.id) }));
});

ipcMain.handle('pedidos:salvar', (_, ped) => {
  const salvar = db.transaction((ped) => {
    const r = db.prepare(`
      INSERT INTO pedidos (cliente_id, cliente, total, subtotal, desconto, taxa_entrega, tipo, pgto, status, hora, data, mesa, caixa_aberto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ped.clienteId || null,
      ped.cliente,
      ped.total,
      ped.subtotal,
      ped.desconto,
      ped.taxaEntrega || 0,
      ped.tipo,
      ped.pgto,
      ped.status,
      ped.hora,
      ped.data,
      ped.mesa || '',
      ped.caixaAberto !== undefined ? ped.caixaAberto : 1
    );

    const pedidoId = r.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of ped.itens) {
      insertItem.run(pedidoId, item.id, item.nome, item.preco, item.qty);
    }

    if (ped.clienteId) {
      db.prepare('UPDATE clientes SET pedidos = pedidos + 1 WHERE id=?').run(ped.clienteId);
    }

    return pedidoId;
  });

  const id = salvar(ped);
  return { ok: true, id };
});

// Cria novo pedido com status='aberto' para mesa/comanda
ipcMain.handle('pedidos:salvarAberto', (_, ped) => {
  const salvar = db.transaction((ped) => {
    const r = db.prepare(`
      INSERT INTO pedidos (cliente_id, cliente, total, subtotal, desconto, taxa_entrega, tipo, pgto, status, hora, data, mesa, caixa_aberto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ped.cliente_id || null,
      ped.cliente,
      ped.total,
      ped.subtotal,
      ped.desconto,
      ped.taxa_entrega || 0,
      ped.tipo,
      ped.pgto,
      ped.status || 'aberto',
      ped.hora,
      ped.data,
      ped.mesa || '',
      ped.caixa_aberto !== undefined ? ped.caixa_aberto : 1
    );

    const pedidoId = r.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of ped.itens || []) {
      insertItem.run(pedidoId, item.id, item.nome, item.preco, item.qty);
    }

    if (ped.cliente_id) {
      db.prepare('UPDATE clientes SET pedidos = pedidos + 1 WHERE id=?').run(ped.cliente_id);
    }

    return pedidoId;
  });

  const id = salvar(ped);
  return { ok: true, id };
});

// Atualiza um pedido aberto com novos itens e valores
ipcMain.handle('pedidos:atualizarAberto', (_, data) => {
  // Extrai o ID corretamente - pode ser um número ou um objeto
  let idPedido = data.id;
  if (typeof idPedido === 'object' && idPedido !== null && idPedido.id) {
    idPedido = idPedido.id;
  }
  idPedido = Number(idPedido);

  if (!idPedido) return { ok: false, error: 'ID requerido' };

  try {
    const atualizar = db.transaction((txData) => {
      // Atualiza totais - SQL em uma linha para evitar problemas com whitespace
      const updateStmt = db.prepare('UPDATE pedidos SET total=?, subtotal=?, desconto=?, pgto=? WHERE id=?');
      updateStmt.run(txData.total || 0, txData.subtotal || 0, txData.desconto || 0, txData.pgto || 'dinheiro', idPedido);

      // Remove itens antigos
      const deleteStmt = db.prepare('DELETE FROM itens_pedido WHERE pedido_id=?');
      deleteStmt.run(idPedido);

      // Insere itens novos
      const insertStmt = db.prepare('INSERT INTO itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade) VALUES (?, ?, ?, ?, ?)');

      for (const item of txData.itens || []) {
        // Suporta ambas estruturas: { id, preco } e { produto_id, preco_unitario }
        const prodId = item.id || item.produto_id;
        const preco = item.preco || item.preco_unitario || 0;
        const qty = item.qty || item.quantidade || 1;

        if (!prodId) continue; // pula se não tem ID de produto

        insertStmt.run(idPedido, prodId, item.nome || 'Item', preco, qty);
      }
    });

    atualizar(data);
    return { ok: true };
  } catch (e) {
    console.error('Erro em pedidos:atualizarAberto:', e.message, 'ID:', idPedido, 'Data:', JSON.stringify(data));
    return { ok: false, error: e.message };
  }
});

// Retorna lista de pedidos abertos da mesa
ipcMain.handle('pedidos:abertos', () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const lista = db.prepare("SELECT * FROM pedidos WHERE data=? AND status='aberto' ORDER BY id ASC").all(hoje);

  // Carrega itens de cada pedido
  const getItens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id=?');
  for (const p of lista) {
    p.itens = getItens.all(p.id);
  }

  return lista;
});

// Marca um pedido aberto como pago
ipcMain.handle('pedidos:finalizarAberto', (_, pedidoId) => {
  if (!pedidoId) return { ok: false, error: 'ID requerido' };

  try {
    const now = new Date();
    const hoje = now.toLocaleDateString('pt-BR');
    const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    // Atualiza status e registra data/hora do pagamento
    db.prepare("UPDATE pedidos SET status='pago', data=?, hora=? WHERE id=?").run(hoje, hora, pedidoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pedidos:hoje', () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const lista = db.prepare("SELECT * FROM pedidos WHERE data=? AND status='pago' ORDER BY id ASC").all(hoje);
  const getItens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id=?');
  return lista.map((p, idx) => ({ ...p, seq: idx + 1, itens: getItens.all(p.id) }));
});

ipcMain.handle('pedidos:cancelar', (_, id) => {
  const pedido = db.prepare('SELECT cliente_id FROM pedidos WHERE id=?').get(id);
  if (!pedido) {
    throw new Error('Pedido não encontrado');
  }

  const deleteItens = db.prepare('DELETE FROM itens_pedido WHERE pedido_id=?');
  const deletePedido = db.prepare('DELETE FROM pedidos WHERE id=?');
  const decrementarCliente = db.prepare('UPDATE clientes SET pedidos = CASE WHEN pedidos > 0 THEN pedidos - 1 ELSE 0 END WHERE id=?');

  db.transaction(() => {
    deleteItens.run(id);
    deletePedido.run(id);
    if (pedido.cliente_id) {
      decrementarCliente.run(pedido.cliente_id);
    }
  })();

  return { ok: true };
});
ipcMain.handle('pedidos:caixa', (_, dataParaListar) => {
  const data = dataParaListar || new Date().toLocaleDateString('pt-BR');
  const lista = db.prepare("SELECT * FROM pedidos WHERE data=? AND status='pago' ORDER BY id ASC").all(data);
  const getItens = db.prepare('SELECT * FROM itens_pedido WHERE pedido_id=?');
  return lista.map((p, idx) => ({ ...p, seq: idx + 1, itens: getItens.all(p.id) }));
});

ipcMain.handle('caixa:limpar', (_, dataParaFechar) => {
  const data = dataParaFechar || new Date().toLocaleDateString('pt-BR');
  const pedidosDoDia = db.prepare('SELECT id FROM pedidos WHERE data=? AND status=?').all(data, 'pago');
  const qtd = pedidosDoDia.length;
  if (qtd > 0) {
    db.prepare("UPDATE pedidos SET status='fechado' WHERE data=? AND status='pago'").run(data);
  }
  return { ok: true, qtd, data };
});

ipcMain.handle('caixa:estado', () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const pedidos = db.prepare("SELECT data, status FROM pedidos WHERE status IN ('pago','fechado') ORDER BY id ASC").all();
  const { aberto, dataAberta } = require('./js/caixa-state').montarEstadoCaixa(pedidos, hoje);

  return {
    aberto,
    ultimaData: dataAberta,
    hoje,
  };
});

ipcMain.handle('caixa:abrir', () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  db.prepare("UPDATE pedidos SET status='pago' WHERE data=? AND status='fechado'").run(hoje);
  return { ok: true, hoje };
});

ipcMain.handle('caixa:relatorio', (_, { periodo }) => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const sql = `SELECT * FROM pedidos WHERE status IN ('pago','fechado') AND data IS NOT NULL`;
  const lista = db.prepare(sql).all();
  return lista.filter(p => {
    const data = p.data ? p.data.split('/').reverse().join('-') : null;
    if (!data) return false;
    const d = new Date(data);
    if (periodo === 'mensal') return d >= inicio && d <= fim;
    if (periodo === 'anual') return d.getFullYear() === hoje.getFullYear();
    return true;
  });
});
ipcMain.handle('db:caminho', () => dbPath);

ipcMain.handle('relatorio:salvar', async (_, { nomeArquivo, html }) => {
  const desktopPath = app.getPath('desktop');
  const defaultPath = path.join(relatoriosPath, nomeArquivo);
  const fallbackPath = path.join(desktopPath, nomeArquivo);

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Salvar relatório',
    defaultPath,
    filters: [{ name: 'Planilha Excel', extensions: ['xls', 'xlsx', 'html'] }],
  });

  const destino = filePath || fallbackPath;

  if (canceled && !filePath) {
    fs.mkdirSync(relatoriosPath, { recursive: true });
    fs.writeFileSync(destino, html, 'utf8');
    return { ok: true, path: destino, fallback: true };
  }

  if (!filePath) {
    fs.mkdirSync(relatoriosPath, { recursive: true });
    fs.writeFileSync(destino, html, 'utf8');
    return { ok: true, path: destino, fallback: true };
  }

  fs.writeFileSync(destino, html, 'utf8');
  return { ok: true, path: destino };
});