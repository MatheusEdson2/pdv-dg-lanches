/* ═══════════════════════════════════════════
   PRODUTOS.JS
   CRUD completo de produtos (criar, ler, editar, deletar)
   Todos os dados são salvos no banco SQLite via window.db
═══════════════════════════════════════════ */

// Sugere emoji automaticamente ao mudar de categoria
function sugerirEmoji() {
  const cat = document.getElementById('prod-cat')?.value;
  const map = { lanche: '🍔', porcao: '🍟', combo: '🌟', bebida: '🥤', acai: '🍧', pizza: '🍕' };
  const el = document.getElementById('prod-emoji');
  if (el && map[cat]) el.value = map[cat];
}

// Define o emoji pelo botão de atalho
function escolherEmoji(emoji) {
  const el = document.getElementById('prod-emoji');
  if (el) el.value = emoji;
}

// Busca os produtos do banco e monta a tabela na tela
async function renderTabelaProdutos() {
  produtos = await window.db.produtosListar();

  const nomesCat = { lanche: 'Lanche', porcao: 'Porção', combo: 'Combo', bebida: 'Bebida', acai: 'Açaí', pizza: 'Pizza' };
  const classesCat = { lanche: 'cat-lanche', porcao: 'cat-porcao', combo: 'cat-combo', bebida: 'cat-lanche', acai: 'cat-combo', pizza: 'cat-combo' };

  const tbody = document.getElementById('tbody-produtos');
  if (!produtos.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--cinza);padding:30px">Nenhum produto cadastrado</td></tr>';
    atualizarSelecionadosProdutos();
    return;
  }

  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td><input type="checkbox" class="select-produto" data-id="${p.id}" onclick="atualizarSelecionadosProdutos()"></td>
      <td>
        <b>${p.emoji || ''} ${p.nome}</b>
        ${p.badge ? `<span style="font-size:10px;background:var(--laranja);color:#fff;padding:1px 6px;border-radius:20px;margin-left:6px">${p.badge}</span>` : ''}
      </td>
      <td>
        <span class="cat-tag ${classesCat[p.cat] || 'cat-lanche'}">${nomesCat[p.cat] || p.cat}</span>
      </td>
      <td style="color:var(--cinza);font-size:12px;max-width:200px">${p.descricao || ''}</td>
      <td class="preco-col">${fmt(p.preco)}</td>
      <td>
        <span class="status-pill ${p.status ? 'status-on' : 'status-off'}">
          ${p.status ? '✅ Ativo' : '❌ Inativo'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editarProduto(${p.id})">✏ Editar</button>
          <button class="btn-del"  onclick="deletarProduto(${p.id})">🗑</button>
        </div>
      </td>
    </tr>`).join('');
  atualizarSelecionadosProdutos();
}

// Abre o modal vazio (novo) ou preenchido (editar)
function abrirModalProduto(id = null) {
  const titleEl = document.getElementById('modal-produto-title');
  const idEl = document.getElementById('prod-id');
  const nomeEl = document.getElementById('prod-nome');
  const catEl = document.getElementById('prod-cat');
  const precoEl = document.getElementById('prod-preco');
  const descEl = document.getElementById('prod-desc');
  const emojiEl = document.getElementById('prod-emoji');
  const statusEl = document.getElementById('prod-status');
  const badgeEl = document.getElementById('prod-badge');

  if (titleEl) titleEl.textContent = id ? 'EDITAR PRODUTO' : 'NOVO PRODUTO';

  // Limpa todos os campos
  if (idEl) idEl.value = '';
  if (nomeEl) nomeEl.value = '';
  if (catEl) catEl.value = 'lanche';
  if (precoEl) precoEl.value = '';
  if (descEl) descEl.value = '';
  if (emojiEl) emojiEl.value = '🍔';
  if (statusEl) statusEl.value = '1';
  if (badgeEl) badgeEl.value = '';

  // Se for edição, preenche com os dados do produto
  if (id) {
    const p = produtos.find(x => x.id === id);
    if (p) {
      if (idEl) idEl.value = p.id;
      if (nomeEl) nomeEl.value = p.nome || '';
      if (catEl) catEl.value = p.cat || 'lanche';
      if (precoEl) precoEl.value = p.preco;
      if (descEl) descEl.value = p.descricao || '';
      if (emojiEl) emojiEl.value = p.emoji || '🍔';
      if (statusEl) statusEl.value = p.status;
      if (badgeEl) badgeEl.value = p.badge || '';
    }
  }

  abrirModal('modal-produto');

  setTimeout(() => {
    if (nomeEl && typeof nomeEl.focus === 'function') {
      nomeEl.focus();
      nomeEl.select?.();
    }
  }, 50);
}

// Atalho chamado pelo botão Editar na tabela
function editarProduto(id) {
  abrirModalProduto(id);
}

// Salva (cria ou atualiza) o produto no banco
async function salvarProduto() {
  const id       = parseInt(document.getElementById('prod-id').value) || null;
  const nome     = document.getElementById('prod-nome').value.trim();
  const cat      = document.getElementById('prod-cat').value;
  const preco    = parseFloat(document.getElementById('prod-preco').value);
  const descricao = document.getElementById('prod-desc').value.trim();
  const emoji    = document.getElementById('prod-emoji').value.trim() || '🍔';
  const status   = parseInt(document.getElementById('prod-status').value);
  const badge    = document.getElementById('prod-badge').value.trim();

  if (!nome || isNaN(preco)) {
    toast('Preencha o nome e o preço!', 'error');
    return;
  }

  try {
    await window.db.produtosSalvar({ id, nome, cat, preco, descricao, emoji, status, badge });

    // Atualiza a lista em memória e re-renderiza
    produtos = await window.db.produtosListar();
    fecharModal('modal-produto');
    renderTabelaProdutos();
    renderCardapio();

    toast(id ? '✏ Produto atualizado!' : '✅ Produto adicionado!');
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
  }
}

// Remove o produto do banco após confirmação
async function deletarProduto(id) {
  if (!confirm('Remover este produto do banco de dados?')) return;

  try {
    await window.db.produtosDeletar(id);
    produtos = await window.db.produtosListar();
    renderTabelaProdutos();
    renderCardapio();
    toast('🗑 Produto removido', 'info');
  } catch (e) {
    toast('Erro ao remover: ' + e.message, 'error');
  }
}

function atualizarSelecionadosProdutos() {
  const master = document.getElementById('select-all-produtos');
  const boxes = Array.from(document.querySelectorAll('.select-produto'));
  if (!master || !boxes.length) return;
  master.checked = boxes.every(box => box.checked);
}

function toggleSelecionarTodosProdutos(source) {
  const boxes = Array.from(document.querySelectorAll('.select-produto'));
  if (!boxes.length) return;

  const checked = source && source.checked !== undefined
    ? source.checked
    : !boxes.every(box => box.checked);

  boxes.forEach(box => box.checked = checked);
  const master = document.getElementById('select-all-produtos');
  if (master) master.checked = checked;
}

async function deletarProdutosSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.select-produto:checked')).map(cb => parseInt(cb.dataset.id));
  if (!selecionados.length) { toast('Selecione ao menos um produto', 'info'); return; }
  if (!confirm(`Excluir ${selecionados.length} produto(s) selecionado(s)?`)) return;

  for (const id of selecionados) {
    await window.db.produtosDeletar(id);
  }

  produtos = await window.db.produtosListar();
  renderTabelaProdutos();
  renderCardapio();
  toast(`🗑 ${selecionados.length} produto(s) excluído(s)`);
} 