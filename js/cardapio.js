/* ═══════════════════════════════════════════
   CARDAPIO.JS
   Renderiza os produtos disponíveis na tela de Venda
═══════════════════════════════════════════ */

function renderCardapio() {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  const buscaInput = document.getElementById('busca-produto');
  const busca = (buscaInput?.value || '').toLowerCase();

  const nomesCategorias = {
    lanche: '🍔 LANCHES',
    porcao: '🍟 PORÇÕES',
    combo:  '🌟 COMBOS',
    bebida: '🥤 BEBIDAS',
    acai:   '🍧 AÇAÍ',
    pizza:  '🍕 PIZZAS',
  };

  // Filtra: precisa estar ativo, bater com a categoria escolhida e com a busca
  const ativos = produtos.filter(p => {
    if (!p.status) return false;
    if (catAtual !== 'todos' && p.cat !== catAtual) return false;
    if (busca && !p.nome.toLowerCase().includes(busca) && !(p.descricao || '').toLowerCase().includes(busca)) return false;
    return true;
  });

  if (!ativos.length) {
    grid.innerHTML = '<p style="color:var(--cinza);grid-column:1/-1;text-align:center;padding:40px">Nenhum produto encontrado</p>';
    return;
  }

  // Agrupa os produtos por categoria, para mostrar com título de seção
  const grupos = {};
  ativos.forEach(p => {
    if (!grupos[p.cat]) grupos[p.cat] = [];
    grupos[p.cat].push(p);
  });

  let html = '';
  Object.entries(grupos).forEach(([cat, lista]) => {
    if (catAtual === 'todos') {
      html += `<div class="cat-title">${nomesCategorias[cat] || cat.toUpperCase()}</div>`;
    }
    lista.forEach(p => {
      html += `
        <div class="produto-card" onclick="addAoCarrinho(${p.id})">
          <div class="produto-top">
            <span class="produto-emoji">${p.emoji || '🍔'}</span>
            ${p.badge ? `<span class="produto-badge">${p.badge}</span>` : ''}
          </div>
          <div class="produto-nome">${p.nome}</div>
          <div class="produto-desc">${p.descricao || ''}</div>
          <div class="produto-footer">
            <span class="produto-preco">${fmt(p.preco)}</span>
            <button class="btn-add" onclick="event.stopPropagation();addAoCarrinho(${p.id})">+</button>
          </div>
        </div>`;
    });
  });

  grid.innerHTML = html;
}

// Troca a categoria ativa (Todos, Lanches, Porções, Combos)
function filtrarCat(cat, btn) {
  catAtual = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCardapio();
}

// Chamado a cada letra digitada na busca
function filtrarProdutos() {
  renderCardapio();
}