import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowPathIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data_vencimento: string;
  status: string;
}

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<Transacao[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [carregando, setCarregando] = useState(true);

  // Estados para o Modal (Novo/Editar)
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('pendente');

  const buscarLancamentos = async () => {
    setCarregando(true);
    let query = supabase.from('transacoes').select('*').order('data_vencimento', { ascending: false });
    if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);
    const { data } = await query;
    if (data) setLancamentos(data);
    setCarregando(false);
  };

  useEffect(() => { buscarLancamentos(); }, [filtroStatus]);

  const abrirModal = (l?: Transacao) => {
    if (l) {
      setEditandoId(l.id);
      setDescricao(l.descricao);
      setValor(l.valor.toString());
      setTipo(l.tipo);
      setData(l.data_vencimento);
      setStatus(l.status);
    } else {
      setEditandoId(null);
      setDescricao('');
      setValor('');
      setTipo('receita');
      setData(new Date().toISOString().split('T')[0]);
      setStatus('pendente');
    }
    setModalAberto(true);
  };

  const salvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const dados = { descricao, valor: parseFloat(valor), tipo, data_vencimento: data, status };

    if (editandoId) {
      await supabase.from('transacoes').update(dados).eq('id', editandoId);
    } else {
      await supabase.from('transacoes').insert([dados]);
    }

    setModalAberto(false);
    buscarLancamentos();
  };

  const deletarLancamento = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      await supabase.from('transacoes').delete().eq('id', id);
      buscarLancamentos();
    }
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light text-primary italic">Fluxo de <span className="font-semibold not-italic">Lançamentos</span></h2>
          <p className="text-secondary mt-2 text-lg">Gerenciamento total do seu Livro Caixa.</p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => abrirModal()} className="bg-primary hover:bg-[#b0876b] text-darker font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg">
            <PlusIcon className="h-5 w-5" /> Novo Lançamento
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <div className="flex gap-4 mb-6">
        <div className="flex bg-darker p-1 rounded-xl border border-secondary/20">
          {(['todos', 'pendente', 'pago'] as const).map((s) => (
            <button key={s} onClick={() => setFiltroStatus(s)} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filtroStatus === s ? 'bg-primary text-darker' : 'text-secondary hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-darker border border-secondary/20 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-secondary/10">
              <th className="p-5 font-bold text-xs text-primary uppercase tracking-widest">Data</th>
              <th className="p-5 font-bold text-xs text-primary uppercase tracking-widest">Descrição</th>
              <th className="p-5 font-bold text-xs text-primary uppercase tracking-widest">Status</th>
              <th className="p-5 font-bold text-xs text-primary uppercase tracking-widest text-right">Valor</th>
              <th className="p-5 font-bold text-xs text-primary uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l) => (
              <tr key={l.id} className="border-b border-secondary/5 hover:bg-white/5 transition-all group">
                <td className="p-5 text-sm text-secondary font-mono">
                  {new Date(l.data_vencimento).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    {l.tipo === 'receita' ? <ArrowTrendingUpIcon className="h-5 w-5 text-success" /> : <ArrowTrendingDownIcon className="h-5 w-5 text-danger" />}
                    <span className="font-medium">{l.descricao}</span>
                  </div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${l.status === 'pago' ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                    {l.status}
                  </span>
                </td>
                <td className={`p-5 text-sm font-bold text-right ${l.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                  {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(l.valor)}
                </td>
                <td className="p-5">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => abrirModal(l)} className="p-2 hover:bg-primary/20 rounded-lg text-primary"><PencilSquareIcon className="h-5 w-5" /></button>
                    <button onClick={() => deletarLancamento(l.id)} className="p-2 hover:bg-danger/20 rounded-lg text-danger"><TrashIcon className="h-5 w-5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Reutilizável (Novo/Editar) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-darker border border-primary/30 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-semibold text-primary">{editandoId ? 'Editar' : 'Novo'} Lançamento</h3>
              <button onClick={() => setModalAberto(false)} className="text-secondary hover:text-white"><XMarkIcon className="h-8 w-8" /></button>
            </div>
            <form onSubmit={salvarLancamento} className="flex flex-col gap-5">
              <div className="flex bg-dark p-1 rounded-2xl border border-secondary/20">
                <button type="button" onClick={() => setTipo('receita')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tipo === 'receita' ? 'bg-success text-darker' : 'text-secondary'}`}>Receita</button>
                <button type="button" onClick={() => setTipo('despesa')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tipo === 'despesa' ? 'bg-danger text-white' : 'text-secondary'}`}>Despesa</button>
              </div>
              <input type="text" required placeholder="O que é?" className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary transition-all" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="Valor" className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary" value={valor} onChange={(e) => setValor(e.target.value)} />
                <input type="date" required className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-secondary text-sm">Status:</label>
                <select className="bg-dark border border-secondary/20 rounded-xl p-2 text-white flex-1" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago / Recebido</option>
                </select>
              </div>
              <button type="submit" className="bg-primary text-darker font-bold py-4 rounded-2xl mt-4 hover:scale-105 transition-all shadow-xl shadow-primary/20">
                {editandoId ? 'Atualizar Lançamento' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}