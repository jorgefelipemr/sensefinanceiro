import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  DocumentPlusIcon, 
  DocumentTextIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

export default function NfVenda() {
  const [notas, setNotas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  
  // Estados para o Modal e Autocomplete
  const [modalAberto, setModalAberto] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  
  // Estados de Processamento
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [itensNf, setItensNf] = useState<any[]>([]);

  const location = useLocation();

  useEffect(() => { 
    carregarDados();
    verificarClonagem();
  }, []);

  async function carregarDados() {
    const { data: nf } = await supabase.from('notas_fiscais').select('*, contatos(nome)').eq('tipo', 'venda').order('data_emissao', { ascending: false });
    const { data: cli } = await supabase.from('contatos').select('*').eq('tipo', 'cliente');
    if (nf) setNotas(nf);
    if (cli) setClientes(cli);
  }

  const verificarClonagem = () => {
    const params = new URLSearchParams(location.search);
    const itensClonados = localStorage.getItem('nfe_espelho_itens');
    if (params.get('origem') === 'espelho' && itensClonados) {
      setItensNf(JSON.parse(itensClonados));
      setModalAberto(true);
      localStorage.removeItem('nfe_espelho_itens');
    }
  };

  const finalizarEmissao = async () => {
    if (!clienteSelecionado) return alert("Selecione um cliente!");
    
    setProcessando(true);
    setProgresso(30);

    const valorTotal = itensNf.reduce((acc, i) => acc + (i.quantidade * (i.valor_unitario || i.preco_unitario)), 0);

    try {
      setProgresso(60);
      const { error } = await supabase.from('notas_fiscais').insert([{
        tipo: 'venda',
        contato_id: clienteSelecionado.id,
        valor_total: valorTotal,
        status: 'autorizada',
        chave_acesso: '3526' + Math.random().toString().slice(2, 12) + Math.random().toString().slice(2, 12)
      }]);

      if (error) throw error;

      setProgresso(100);
      setTimeout(() => {
        setProcessando(false);
        setProgresso(0);
        setModalAberto(false);
        setItensNf([]);
        setClienteSelecionado(null);
        carregarDados();
      }, 600);
    } catch (err: any) {
      alert(err.message);
      setProcessando(false);
    }
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      {/* OVERLAY DE PROCESSAMENTO PADRONIZADO */}
      {processando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-darker border border-primary/20 p-8 rounded-[40px] shadow-2xl text-center">
            <ArrowPathIcon className="h-12 w-12 text-primary animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2 italic">Emitindo <span className="text-primary not-italic">NF-e</span></h3>
            <p className="text-secondary text-sm mb-8">Comunicando com a SEFAZ e gerando protocolo...</p>
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-secondary/10">
              <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${progresso}%` }}></div>
            </div>
            <p className="text-primary font-black text-xs mt-4 tracking-widest">{progresso}%</p>
          </div>
        </div>
      )}

      <header className="mb-12 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light text-primary italic">NF-e de <span className="font-semibold not-italic text-white">Venda</span></h2>
          <p className="text-secondary text-sm mt-1 uppercase tracking-widest font-bold opacity-50 text-[10px]">Documentos Fiscais de Saída</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="bg-primary text-darker font-black px-8 py-4 rounded-2xl flex items-center gap-2 shadow-xl hover:scale-105 transition-all">
          <PlusIcon className="h-6 w-6" /> Nova NF-e
        </button>
      </header>

      {/* FILTRO E RESUMO */}
      <div className="bg-darker border border-secondary/10 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-secondary/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-96">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-3.5 text-secondary" />
              <input 
                type="text" placeholder="Filtrar por número ou cliente..." 
                className="w-full bg-dark border border-secondary/20 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary transition-all"
                value={busca} onChange={(e) => setBusca(e.target.value)}
              />
           </div>
           <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{notas.length} notas emitidas</span>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-primary border-b border-secondary/5">
            <tr>
              <th className="p-6">Data de Emissão</th>
              <th className="p-6">Número / Chave</th>
              <th className="p-6">Cliente Destinatário</th>
              <th className="p-6 text-right">Valor Líquido</th>
              <th className="p-6 text-center">Documentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary/5">
            {notas.filter(n => n.contatos?.nome.toLowerCase().includes(busca.toLowerCase())).map(n => (
              <tr key={n.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-6 text-sm">
                  <p className="font-bold text-gray-200">{new Date(n.data_emissao).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-secondary">{new Date(n.data_emissao).toLocaleTimeString('pt-BR')}</p>
                </td>
                <td className="p-6">
                  <p className="font-mono text-primary text-sm font-bold">NF {n.numero_nf.toString().padStart(6, '0')}</p>
                  <p className="text-[9px] text-secondary truncate w-40 font-mono" title={n.chave_acesso}>{n.chave_acesso}</p>
                </td>
                <td className="p-6 font-bold text-gray-200">{n.contatos?.nome}</td>
                <td className="p-6 font-black text-right text-primary text-lg">R$ {n.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="p-6">
                  <div className="flex justify-center gap-2">
                    <button className="p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all shadow-sm" title="Baixar DANFE"><DocumentTextIcon className="h-5 w-5"/></button>
                    <button className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm" title="Baixar XML"><CheckBadgeIcon className="h-5 w-5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE NOVA NF-e COM AUTOCOMPLETE */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex justify-center items-center z-[80] p-4">
          <div className="bg-darker border border-primary/20 w-full max-w-3xl rounded-[40px] p-12 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => {setModalAberto(false); setItensNf([]);}} className="absolute right-10 top-10 text-secondary hover:text-white transition-colors"><XMarkIcon className="h-8 w-8"/></button>
            
            <div className="mb-10">
              <h3 className="text-3xl font-bold text-primary italic">Emitir <span className="text-white not-italic">Nota de Saída</span></h3>
              <p className="text-secondary text-sm mt-2">Preencha o destinatário para autorizar a nota fiscal.</p>
            </div>

            <div className="space-y-8">
              {/* BUSCA DE CLIENTE (AUTOCOMPLETE) */}
              <div className="relative">
                <label className="text-[10px] font-black text-secondary uppercase mb-3 block tracking-widest">Destinatário</label>
                {clienteSelecionado ? (
                  <div className="flex justify-between items-center bg-primary/10 border border-primary/30 p-5 rounded-2xl">
                    <div>
                      <p className="font-bold text-primary text-lg">{clienteSelecionado.nome}</p>
                      <p className="text-xs text-primary/60">{clienteSelecionado.cpf_cnpj}</p>
                    </div>
                    <button onClick={() => {setClienteSelecionado(null); setBuscaCliente('');}} className="text-primary hover:text-white"><XMarkIcon className="h-6 w-6"/></button>
                  </div>
                ) : (
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-6 w-6 absolute left-4 top-4 text-secondary" />
                    <input 
                      type="text" placeholder="Pesquisar cliente pelo nome..."
                      className="w-full bg-dark border border-secondary/20 rounded-2xl p-5 pl-14 outline-none focus:border-primary transition-all text-lg"
                      value={buscaCliente} onChange={(e) => {setBuscaCliente(e.target.value); setMostrarSugestoes(true);}}
                    />
                    {mostrarSugestoes && buscaCliente && (
                      <div className="absolute w-full mt-2 bg-dark border border-secondary/20 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                        {clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).map(c => (
                          <button key={c.id} onClick={() => {setClienteSelecionado(c); setMostrarSugestoes(false);}} className="w-full text-left p-5 hover:bg-primary/10 border-b border-secondary/5 transition-colors">
                            <p className="font-bold text-sm">{c.nome}</p>
                            <p className="text-[10px] text-secondary">{c.cpf_cnpj}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LISTA DE ITENS DA NF */}
              <div className="bg-dark p-8 rounded-[30px] border border-secondary/5">
                <h4 className="text-[10px] font-black text-primary uppercase mb-6 tracking-widest border-b border-primary/10 pb-2">Itens para Faturamento</h4>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {itensNf.map((it, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-secondary/5">
                      <div>
                        <p className="text-sm font-bold text-gray-200">{it.itens?.nome || it.nome}</p>
                        <p className="text-[10px] text-secondary uppercase font-bold">{it.quantidade} UN x R$ {(it.valor_unitario || it.preco_unitario).toFixed(2)}</p>
                      </div>
                      <p className="font-black text-primary">R$ {(it.quantidade * (it.valor_unitario || it.preco_unitario)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="flex justify-between items-center pt-8 border-t border-secondary/10">
                <div>
                  <p className="text-[10px] text-secondary uppercase font-black tracking-widest">Valor Total da Operação</p>
                  <p className="text-4xl font-black text-primary">R$ {itensNf.reduce((acc, i) => acc + (i.quantidade * (i.valor_unitario || i.preco_unitario)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <button 
                  onClick={finalizarEmissao}
                  className="bg-primary text-darker font-black px-14 py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-lg"
                >
                  <CheckBadgeIcon className="h-7 w-7" /> AUTORIZAR AGORA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}