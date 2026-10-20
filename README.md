# DG Lanches PDV

Sistema de ponto de venda desktop para a DG Lanches. O aplicativo reúne vendas, pedidos, produtos, clientes e controle de caixa em uma interface desenvolvida com Electron e persiste os dados localmente em SQLite.

<img width="1917" height="940" alt="Captura de tela 2026-10-19 223716" src="https://github.com/user-attachments/assets/61f3ab67-6a8a-4c72-99c7-4c84b1991eb6" />

<img width="1917" height="1078" alt="Captura de tela 2026-10-19 223247" src="https://github.com/user-attachments/assets/fb38c52c-de05-4e5a-a2fe-5648b79bc650" />


## Funcionalidades

- **Vendas:** busca e categorias de produtos, carrinho, desconto, formas de pagamento e tipos de atendimento (balcão, retirada e delivery).
- **Pedidos:** acompanhamento de pedidos, incluindo pedidos em aberto e mesas.
- **Produtos:** cadastro e gerenciamento do cardápio.
- **Clientes:** cadastro e consulta de clientes.
- **Caixa:** abertura, consulta de vendas e relatórios por período.
- **Relatórios:** salvamento de relatórios no computador.

## Tecnologias

- [Electron](https://www.electronjs.org/)
- JavaScript, HTML e CSS
- [SQLite](https://www.sqlite.org/) com `better-sqlite3`
- [electron-builder](https://www.electron.build/) para gerar o instalador do Windows

## Requisitos

- Windows para executar o aplicativo empacotado ou gerar o instalador.
- Node.js e npm para instalar as dependências, executar os testes e iniciar ou compilar o projeto.

## Executar em desenvolvimento

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/MatheusEdson2/pdv-dg-lanches.git
cd pdv-dg-lanches
npm install
```

Inicie o aplicativo:

```bash
npm start
```

## Testes

Execute a suíte de testes automatizados com:

```bash
npm test
```

## Gerar o instalador do Windows

```bash
npm run build
```

O comando gera o instalador NSIS para Windows x64 na pasta `dist/`. Essa pasta e `node_modules/` são artefatos locais e estão excluídos do Git. Para distribuir o instalador, publique-o como arquivo de uma [GitHub Release](https://github.com/MatheusEdson2/pdv-dg-lanches/releases), em vez de adicioná-lo ao repositório.

## Dados e relatórios

O banco SQLite (`dg-lanches.db`) e os relatórios são armazenados localmente na pasta de dados do aplicativo do usuário, gerenciada pelo Electron. Os dados não são sincronizados automaticamente entre computadores. Faça cópias de segurança dos dados importantes antes de reinstalar ou desinstalar o aplicativo.
