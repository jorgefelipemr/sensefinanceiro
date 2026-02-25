import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  PlusIcon, 
  TrashIcon, 
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

interface ItemVenda {
  item_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export default function Vendas() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [vendasRealizadas, setVendasRealizadas] = useState<any[]>([]);
  
  // Estados de busca e seleção
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [mostrarSugestoesCli, setMostrarSugestoesCli] = useState(false);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);

  // Estados da venda atual
  const [itensCarrinho, setItensCarrinho] = useState<ItemVenda[]>([]);
  const [parcelas, setParcelas] = useState(1); // Novo: Controle de parcelas
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  // Estado para Visualização de Resumo
  const [vendaVisualizar, setVendaVisualizar] = useState<any>(null);

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    const { data: cli } = await supabase.from('contatos').select('*').eq('tipo', 'cliente');
    const { data: prod } = await supabase.from('itens').select('*');
    const { data: vend } = await supabase.from('vendas').select('*, contatos(nome)').order('data_venda', { ascending: false });

    if (cli) setClientes(cli);
    if (prod) setProdutos(prod);
    if (vend) setVendasRealizadas(vend);
  }

  const adicionarAoCarrinho = (produto: any) => {
    const novoItem: ItemVenda = {
      item_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      preco_unitario: produto.preco_venda,
      subtotal: produto.preco_venda
    };
    setItensCarrinho([...itensCarrinho, novoItem]);
    setBuscaProduto('');
    setMostrarSugestoesProd(false);
  };

  const atualizarLinha = (index: number, campo: keyof ItemVenda, valor: number) => {
    const novosItens = [...itensCarrinho];
    const item = novosItens[index];
    if (campo === 'quantidade') item.quantidade = valor;
    if (campo === 'preco_unitario') item.preco_unitario = valor;
    item.subtotal = item.quantidade * item.preco_unitario;
    setItensCarrinho(novosItens);
  };

  const visualizarVenda = async (venda: any) => {
    const { data: itens } = await supabase.from('venda_itens').select('*, itens(nome)').eq('venda_id', venda.id);
    setVendaVisualizar({ ...venda, itens });
  };

  const finalizarVenda = async () => {
    if (!clienteSelecionado || itensCarrinho.length === 0) return alert("Preencha o cliente e os itens!");
    
    setProcessando(true);
    setProgresso(10);

    try {
      const valorTotalVenda = itensCarrinho.reduce((acc, i) => acc + i.subtotal, 0);

      // 1. Criar a Venda
      const { data: venda, error: erroVenda } = await supabase.from('vendas').insert([{ 
        cliente_id: clienteSelecionado.id, 
        valor_total: valorTotalVenda, 
        status: 'pedido' 
      }]).select().single();

      if (erroVenda) throw erroVenda;
      setProgresso(40);

      // 2. Criar os Itens da Venda
      const itensParaInserir = itensCarrinho.map(item => ({
        venda_id: venda.id, 
        item_id: item.item_id, 
        quantidade: item.quantidade, 
        preco_unitario: item.preco_unitario, 
        subtotal: item.subtotal
      }));

      const { error: erroItens } = await supabase.from('venda_itens').insert(itensParaInserir);
      if (erroItens) throw erroItens;
      setProgresso(70);

      // 3. Gerar Parcelas no Financeiro (Contas a Receber)
      const valorPorParcela = valorTotalVenda / parcelas;
      const lancamentosFinanceiros = [];

      for (let i = 1; i <= parcelas; i++) {
        const dataVencimento = new Date();
        dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1)); // Incrementa os meses

        lancamentosFinanceiros.push({
          descricao: `Venda Pedido #${venda.id.slice(0, 5).toUpperCase()} - Parcela ${i}/${parcelas}`,
          valor: valorPorParcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          tipo: 'receber',
          contato_id: clienteSelecionado.id,
          venda_id: venda.id,
          status: 'pendente'
        });
      }

      const { error: erroFinanceiro } = await supabase.from('financeiro').insert(lancamentosFinanceiros);
      if (erroFinanceiro) throw erroFinanceiro;

      setProgresso(100);
      
      setTimeout(() => {
        setItensCarrinho([]);
        setClienteSelecionado(null);
        setBuscaCliente('');
        setParcelas(1);
        setProcessando(false);
        setProgresso(0);
        carregarDados();
      }, 600);

    } catch (err: any) { 
      alert(err.message);
      setProcessando(false);
      setProgresso(0);
    }
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      {/* OVERLAY DE PROCESSAMENTO */}
      {processando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-darker border border-primary/20 p-8 rounded-[40px] shadow-2xl text-center">
            <ArrowPathIcon className="h-12 w-12 text-primary animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2 italic">Processando <span className="text-primary not-italic">Pedido</span></h3>
            <p className="text-secondary text-sm mb-8">Salvando itens e gerando financeiro...</p>
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-secondary/10">
              <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${progresso}%` }}></div>
            </div>
            <p className="text-primary font-black text-xs mt-4 tracking-widest">{progresso}%</p>
          </div>
        </div>
      )}

      <header className="mb-10"><h2 className="text-3xl font-light text-primary italic">Vendas <span className="font-semibold not-italic text-white">& Pedidos</span></h2></header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-darker p-8 rounded-[30px] border border-secondary/10 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-8 text-primary uppercase tracking-tighter">Novo Pedido</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* AUTOCOMPLETE CLIENTE */}
              <div className="relative">
                <label className="text-[10px] font-black text-secondary uppercase mb-2 block tracking-widest">Cliente</label>
                {clienteSelecionado ? (
                  <div className="flex justify-between items-center bg-primary/10 border border-primary/30 p-4 rounded-2xl animate-in fade-in zoom-in-95">
                    <span className="font-bold text-primary">{clienteSelecionado.nome}</span>
                    <button onClick={() => {setClienteSelecionado(null); setBuscaCliente('');}} className="text-primary hover:text-white transition-colors"><XMarkIcon className="h-5 w-5"/></button>
                  </div>
                ) : (
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-4 text-secondary" />
                    <input 
                      type="text" placeholder="Pesquisar cliente..."
                      className="w-full bg-dark border border-secondary/20 rounded-2xl p-4 pl-12 outline-none focus:border-primary transition-all"
                      value={buscaCliente} onChange={(e) => {setBuscaCliente(e.target.value); setMostrarSugestoesCli(true);}}
                    />
                    {mostrarSugestoesCli && buscaCliente && (
                      <div className="absolute w-full mt-2 bg-darker border border-secondary/20 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                        {clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).map(c => (
                          <button key={c.id} onClick={() => {setClienteSelecionado(c); setMostrarSugestoesCli(false);}} className="w-full text-left p-4 hover:bg-primary/10 border-b border-secondary/5 transition-colors text-sm">
                            <p className="font-bold">{c.nome}</p>
                            <p className="text-[10px] text-secondary">{c.cpf_cnpj}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AUTOCOMPLETE PRODUTO */}
              <div className="relative">
                <label className="text-[10px] font-black text-secondary uppercase mb-2 block tracking-widest">Adicionar Item</label>
                <div className="relative">
                  <PlusIcon className="h-5 w-5 absolute left-4 top-4 text-primary" />
                  <input 
                    type="text" placeholder="Buscar produto/serviço..."
                    className="w-full bg-dark border border-secondary/20 rounded-2xl p-4 pl-12 outline-none focus:border-primary transition-all"
                    value={buscaProduto} onChange={(e) => {setBuscaProduto(e.target.value); setMostrarSugestoesProd(true);}}
                  />
                  {mostrarSugestoesProd && buscaProduto && (
                    <div className="absolute w-full mt-2 bg-darker border border-secondary/20 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {produtos.filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase())).map(p => (
                        <button key={p.id} onClick={() => adicionarAoCarrinho(p)} className="w-full text-left p-4 hover:bg-primary/10 border-b border-secondary/5 flex justify-between items-center transition-colors text-sm">
                          <p className="font-bold">{p.nome}</p>
                          <span className="text-primary font-bold">R$ {p.preco_venda.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TABELA COM EDIÇÃO */}
            <div className="border-t border-secondary/10 pt-8 overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-secondary text-[10px] uppercase font-black tracking-widest border-b border-secondary/5">
                    <th className="pb-4">Descrição</th>
                    <th className="pb-4 w-24 text-center">Qtd</th>
                    <th className="pb-4 w-40 text-right">Unitário</th>
                    <th className="pb-4 w-40 text-right">Subtotal</th>
                    <th className="pb-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/5">
                  {itensCarrinho.map((item, index) => (
                    <tr key={index} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-sm">{item.nome}</td>
                      <td className="py-4">
                        <input type="number" className="w-20 bg-dark border border-secondary/20 rounded-lg p-2 text-center text-sm" value={item.quantidade} onChange={(e) => atualizarLinha(index, 'quantidade', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-4 text-right">
                        <input type="number" className="w-28 bg-dark border border-secondary/20 rounded-lg p-2 text-right text-sm" value={item.preco_unitario} onChange={(e) => atualizarLinha(index, 'preco_unitario', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-4 text-right font-bold text-primary text-sm">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 text-right">
                        <button onClick={() => setItensCarrinho(itensCarrinho.filter((_, i) => i !== index))} className="text-danger p-2 hover:bg-danger/10 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {itensCarrinho.length > 0 && (
                <div className="mt-12 flex flex-col md:flex-row justify-between items-center bg-black/20 p-8 rounded-3xl border border-secondary/5 gap-6">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* SELETOR DE PARCELAS */}
                    <div className="bg-dark p-3 rounded-2xl border border-secondary/10">
                      <label className="text-[10px] text-secondary font-black uppercase block mb-1">Pagamento</label>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-5 w-5 text-primary" />
                        <select 
                          className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                          value={parcelas}
                          onChange={(e) => setParcelas(Number(e.target.value))}
                        >
                          {[1,2,3,4,5,6,10,12].map(n => (
                            <option key={n} value={n} className="bg-darker">
                              {n === 1 ? 'À vista' : `${n}x sem juros`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-secondary uppercase font-black tracking-widest mb-1">Total Pedido</p>
                      <p className="text-4xl font-black text-primary">R$ {itensCarrinho.reduce((acc, item) => acc + item.subtotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  
                  <button onClick={finalizarVenda} disabled={processando} className="bg-primary text-darker font-black px-12 py-5 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-xl active:scale-95 disabled:opacity-50 w-full md:w-auto justify-center">
                    <CheckIcon className="h-6 w-6" /> Finalizar Venda
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HISTÓRICO LATERAL */}
        <div className="bg-darker p-8 rounded-[30px] border border-secondary/10 shadow-xl h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-tighter"><ShoppingCartIcon className="h-5 w-5" /> Recentes</h3>
          <div className="space-y-4">
            {vendasRealizadas.map(v => (
              <button key={v.id} onClick={() => visualizarVenda(v)} className="w-full text-left p-5 bg-dark rounded-2xl border border-secondary/5 hover:border-primary/40 transition-all group flex flex-col gap-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-sm text-gray-200 group-hover:text-primary transition-colors truncate flex-1">{v.contatos?.nome}</p>
                  <EyeIcon className="h-4 w-4 text-secondary opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-[10px] text-secondary font-mono uppercase">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm font-black text-white">R$ {v.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL RESUMO */}
      {vendaVisualizar && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex justify-center items-center z-[60] p-4">
          <div className="bg-darker border border-primary/20 w-full max-w-xl rounded-[40px] p-10 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setVendaVisualizar(null)} className="absolute right-8 top-8 text-secondary hover:text-white transition-colors"><XMarkIcon className="h-8 w-8"/></button>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-primary italic">Resumo da <span className="text-white not-italic">Venda</span></h3>
              <p className="text-secondary text-sm mt-2">{vendaVisualizar.contatos?.nome}</p>
              <p className="text-[10px] text-primary/60 font-mono mt-1 uppercase">{new Date(vendaVisualizar.data_venda).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {vendaVisualizar.itens?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-dark rounded-2xl border border-secondary/5">
                  <div><p className="text-sm font-bold text-gray-200">{it.itens?.nome}</p><p className="text-[10px] text-secondary font-bold uppercase">{it.quantidade}x R$ {it.preco_unitario.toFixed(2)}</p></div>
                  <p className="text-sm font-black text-primary">R$ {it.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-secondary/10 flex justify-between items-center">
              <span className="text-secondary font-black uppercase text-xs tracking-widest">Total Geral</span>
              <span className="text-3xl font-black text-primary">R$ {vendaVisualizar.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}