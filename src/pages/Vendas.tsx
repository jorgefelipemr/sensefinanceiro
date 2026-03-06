import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ItemPedido {
  id: string; // id temporário pro carrinho
  item_id: string; // ID real da tabela 'itens' do Supabase
  descricao: string;
  qtd: number;
  unitario: number;
  subtotal: number;
}

export default function Vendas() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Cadastros
  const [clientesDb, setClientesDb] = useState<any[]>([]);
  const [produtosDb, setProdutosDb] = useState<any[]>([]);

  // Estados do Pedido (Cabeçalho)
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  
  // Estados do Item (Carrinho)
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string | null>(null);
  const [descItem, setDescItem] = useState('');
  const [mostrarListaProdutos, setMostrarListaProdutos] = useState(false);
  const [qtdItem, setQtdItem] = useState(1);
  const [valorItem, setValorItem] = useState('');

  useEffect(() => {
    carregarVendas();
    carregarCadastros(); 
  }, []);

  async function carregarCadastros() {
    // Puxa da tabela contatos (que são os seus clientes)
    const { data: c } = await supabase.from('contatos').select('*');
    if (c) setClientesDb(c);

    // Puxa da tabela itens (que são os seus produtos)
    const { data: p } = await supabase.from('itens').select('*');
    if (p) setProdutosDb(p);
  }

  async function carregarVendas() {
    // Fazemos um JOIN com contatos para mostrar o nome na lista de recentes
    const { data, error } = await supabase
      .from('vendas')
      .select('*, contatos(nome, nome_fantasia)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setVendas(data);
    if (error) console.error("Erro ao carregar vendas:", error);
  }

  // --- AUTOCOMPLETE INTELIGENTE ---
  function escolherCliente(cliente: any) {
    setBuscaCliente(cliente.nome || cliente.nome_fantasia || 'Cliente sem nome');
    setClienteSelecionadoId(cliente.id); // Salva o UUID real
    setMostrarListaClientes(false);
  }

  function escolherProduto(produto: any) {
    setDescItem(produto.nome || produto.descricao || '');
    setValorItem(produto.preco_venda || '');
    setProdutoSelecionadoId(produto.id); // Salva o UUID real
    setMostrarListaProdutos(false);
  }

  // --- CARRINHO ---
  function adicionarItem() {
    if (!descItem || !valorItem || qtdItem < 1 || !produtoSelecionadoId) {
      alert("Selecione um produto da lista antes de adicionar ao carrinho.");
      return;
    }
    
    const novoItem: ItemPedido = {
      id: Math.random().toString(36).substring(2, 9),
      item_id: produtoSelecionadoId,
      descricao: descItem,
      qtd: Number(qtdItem),
      unitario: Number(valorItem),
      subtotal: Number(qtdItem) * Number(valorItem)
    };

    setItens([...itens, novoItem]);
    
    // Limpa os campos do item
    setDescItem('');
    setProdutoSelecionadoId(null);
    setQtdItem(1);
    setValorItem('');
  }

  function removerItem(id: string) {
    setItens(itens.filter(item => item.id !== id));
  }

  const valorTotalPedido = itens.reduce((acc, item) => acc + item.subtotal, 0);

  // --- GRAVAÇÃO COMPLETA NO BANCO ---
  async function finalizarVenda() {
    if (itens.length === 0) {
      alert("Adicione pelo menos um item ao pedido.");
      return;
    }
    if (!clienteSelecionadoId) {
      alert("Selecione um cliente da lista para finalizar a venda.");
      return;
    }

    setSalvando(true);

    try {
      // 1. Grava na tabela 'vendas' com os nomes exatos das suas colunas!
      const { data: vendaInserida, error: erroVenda } = await supabase
        .from('vendas')
        .insert([{ 
          cliente_id: clienteSelecionadoId, 
          valor_total: valorTotalPedido,
          status: 'concluido'
        }])
        .select()
        .single(); // Retorna a venda recém criada para pegarmos o ID dela

      if (erroVenda) throw erroVenda;

      // 2. Monta o pacote de itens para a tabela 'venda_itens'
      const itensParaGravar = itens.map(item => ({
        venda_id: vendaInserida.id, // O ID da venda que acabamos de criar
        item_id: item.item_id,      // O ID do produto
        quantidade: item.qtd,
        preco_unitario: item.unitario,
        subtotal: item.subtotal
      }));

      // 3. Grava todos os itens de uma vez na tabela 'venda_itens'
      const { error: erroItens } = await supabase.from('venda_itens').insert(itensParaGravar);
      if (erroItens) throw erroItens;

      // Sucesso total! Limpa a tela
      setBuscaCliente('');
      setClienteSelecionadoId(null);
      setItens([]);
      carregarVendas();
      alert("Venda e Itens registrados com sucesso!");

    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Falha na gravação. Veja o console F12 para detalhes.");
    } finally {
      setSalvando(false);
    }
  }

  // Filtros em tempo real
  const clientesFiltrados = clientesDb.filter(c => 
    (c.nome || c.nome_fantasia || '').toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const produtosFiltrados = produtosDb.filter(p => 
    (p.nome || p.descricao || '').toLowerCase().includes(descItem.toLowerCase())
  );

  return (
    <div className="flex-1 p-10 bg-dark text-white font-sans overflow-y-auto">
      <header className="flex items-center gap-4 mb-10">
        <div className="bg-primary p-3 rounded-xl shadow-lg shadow-primary/20">
          <ShoppingCartIcon className="h-8 w-8 text-darker" />
        </div>
        <h2 className="text-3xl font-bold">Vendas <span className="text-primary">& Pedidos</span></h2>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LADO ESQUERDO: NOVO PEDIDO */}
        <div className="xl:col-span-2 bg-darker border border-white/5 rounded-[40px] p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-primary tracking-widest uppercase mb-8">Novo Pedido</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="relative">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-2">Cliente (Busca Inteligente)</label>
              <input 
                type="text" 
                placeholder="Pesquisar cliente cadastrado..." 
                className="w-full bg-dark border border-white/10 p-4 rounded-2xl focus:border-primary outline-none transition-all"
                value={buscaCliente} 
                onChange={e => {
                  setBuscaCliente(e.target.value);
                  setMostrarListaClientes(true);
                  setClienteSelecionadoId(null); // Reseta o ID se ele digitar de novo
                }}
                onFocus={() => setMostrarListaClientes(true)}
                onBlur={() => setTimeout(() => setMostrarListaClientes(false), 200)}
              />
              {mostrarListaClientes && buscaCliente && !clienteSelecionadoId && (
                <ul className="absolute z-10 w-full bg-darker border border-primary/20 mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {clientesFiltrados.length > 0 ? clientesFiltrados.map(c => (
                    <li 
                      key={c.id} 
                      onClick={() => escolherCliente(c)}
                      className="p-3 hover:bg-primary/20 cursor-pointer text-sm font-bold transition-colors"
                    >
                      {c.nome || c.nome_fantasia}
                    </li>
                  )) : (
                    <li className="p-3 text-secondary text-sm italic">Nenhum contato encontrado...</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-dark p-6 rounded-3xl border border-white/5 mb-8 relative">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-4">Adicionar Item</label>
            <div className="flex flex-wrap gap-4 items-end relative">
              
              <div className="flex-1 min-w-[200px] relative">
                <input 
                  type="text" 
                  placeholder="Buscar produto/serviço..." 
                  className="w-full bg-darker border border-white/10 p-4 rounded-2xl focus:border-primary outline-none"
                  value={descItem} 
                  onChange={e => {
                    setDescItem(e.target.value);
                    setMostrarListaProdutos(true);
                    setProdutoSelecionadoId(null);
                  }}
                  onFocus={() => setMostrarListaProdutos(true)}
                  onBlur={() => setTimeout(() => setMostrarListaProdutos(false), 200)}
                />
                {mostrarListaProdutos && descItem && !produtoSelecionadoId && (
                  <ul className="absolute z-20 w-full bg-darker border border-primary/20 mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {produtosFiltrados.length > 0 ? produtosFiltrados.map(p => (
                      <li 
                        key={p.id} 
                        onClick={() => escolherProduto(p)}
                        className="p-3 hover:bg-primary/20 cursor-pointer text-sm flex justify-between items-center transition-colors"
                      >
                        <span className="font-bold">{p.nome}</span>
                        <span className="text-primary">R$ {Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </li>
                    )) : (
                      <li className="p-3 text-secondary text-sm italic">Nenhum item encontrado...</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="w-24">
                <input 
                  type="number" min="1" placeholder="Qtd" 
                  className="w-full bg-darker border border-white/10 p-4 rounded-2xl focus:border-primary outline-none text-center"
                  value={qtdItem} onChange={e => setQtdItem(Number(e.target.value))}
                />
              </div>
              <div className="w-32">
                <input 
                  type="number" step="0.01" placeholder="R$ Unit." 
                  className="w-full bg-darker border border-white/10 p-4 rounded-2xl focus:border-primary outline-none"
                  value={valorItem} onChange={e => setValorItem(e.target.value)}
                />
              </div>
              <button 
                onClick={adicionarItem}
                className={`bg-white/5 border p-4 rounded-2xl transition-all flex items-center gap-2 
                  ${produtoSelecionadoId ? 'text-primary border-primary/50 hover:bg-primary hover:text-darker' : 'text-gray-500 border-white/5 cursor-not-allowed'}`}
                title={!produtoSelecionadoId ? "Selecione um item da lista" : "Adicionar ao carrinho"}
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {itens.length > 0 && (
            <div className="mb-8">
              <table className="w-full text-left text-sm">
                <thead className="text-secondary uppercase text-[10px] tracking-widest border-b border-white/10">
                  <tr>
                    <th className="pb-4">Descrição</th>
                    <th className="pb-4 text-center">Qtd</th>
                    <th className="pb-4">Unitário</th>
                    <th className="pb-4">Subtotal</th>
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itens.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-4 font-medium text-white">{item.descricao}</td>
                      <td className="py-4 text-center">{item.qtd}</td>
                      <td className="py-4">R$ {item.unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 text-primary font-bold">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 text-right">
                        <button onClick={() => removerItem(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="flex justify-between items-center mt-6 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                <span className="text-secondary font-bold uppercase tracking-widest">Total do Pedido</span>
                <span className="text-3xl font-black text-primary">R$ {valorTotalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <button 
                onClick={finalizarVenda}
                disabled={salvando}
                className="w-full bg-primary text-darker py-5 rounded-2xl font-black tracking-widest uppercase mt-6 hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {salvando ? 'Processando ERP...' : <><CheckCircleIcon className="h-6 w-6" /> Finalizar Pedido</>}
              </button>
            </div>
          )}
        </div>

        {/* LADO DIREITO: VENDAS RECENTES */}
        <div className="bg-darker border border-white/5 rounded-[40px] p-8 shadow-2xl flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <ClockIcon className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold text-primary tracking-widest uppercase">Recentes</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {vendas.length === 0 ? (
              <p className="text-secondary text-sm italic">Nenhuma venda registrada ainda.</p>
            ) : (
              vendas.map(v => (
                <div key={v.id} className="bg-dark p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    {/* Exibe o nome do contato graças ao JOIN 'contatos(nome)' lá em cima */}
                    <p className="font-bold text-sm text-white">
                      {v.contatos ? (v.contatos.nome || v.contatos.nome_fantasia) : 'Consumidor'}
                    </p>
                    <span className="text-xs text-secondary">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-lg font-black text-primary">R$ {Number(v.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Gravado no ERP</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}