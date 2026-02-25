import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
  CurrencyDollarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellAlertIcon,
  XMarkIcon,
  TagIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data_vencimento: string;
  status: string;
}

export default function Dashboard() {
  const [saldoTotal, setSaldoTotal] = useState<number>(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [contatoSel, setContatoSel] = useState('');

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // 1. Saldo
      const { data: dataSaldo } = await supabase.from('contas_bancarias').select('saldo_atual');
      if (dataSaldo) setSaldoTotal(dataSaldo.reduce((acc, curr) => acc + Number(curr.saldo_atual), 0));

      // 2. Transações e Gráfico
      const { data: dataTrans } = await supabase.from('transacoes').select('*').order('data_vencimento', { ascending: true });
      if (dataTrans) {
        setTransacoes([...dataTrans].reverse().slice(0, 5));
        processarDadosGrafico(dataTrans);
      }

      // 3. Cadastros auxiliares
      const { data: cat } = await supabase.from('categorias').select('*');
      const { data: cont } = await supabase.from('contatos').select('*');
      if (cat) setCategorias(cat);
      if (cont) setContatos(cont);

    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setCarregando(false);
    }
  };

  const processarDadosGrafico = (todas: Transacao[]) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const resumo: any = {};
    todas.forEach(t => {
      const d = new Date(t.data_vencimento);
      const chave = `${d.getMonth()}-${d.getFullYear()}`;
      if (!resumo[chave]) resumo[chave] = { mes: meses[d.getMonth()], entradas: 0, saidas: 0 };
      if (t.tipo === 'receita') resumo[chave].entradas += Number(t.valor);
      else resumo[chave].saidas += Number(t.valor);
    });
    setDadosGrafico(Object.values(resumo).slice(-6));
  };

  useEffect(() => { carregarDados(); }, []);

  const salvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Objeto de dados formatado para o Supabase
    const dadosParaInserir = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      data_vencimento: data,
      status: 'pendente',
      // Envia null se a string estiver vazia para não dar erro de FK
      categoria_id: categoriaSel === "" ? null : categoriaSel,
      contato_id: contatoSel === "" ? null : contatoSel,
    };

    const { error } = await supabase.from('transacoes').insert([dadosParaInserir]);
    
    if (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar lançamento. Verifique se as colunas categoria_id e contato_id existem na tabela transacoes.");
    } else {
      setModalAberto(false);
      setDescricao('');
      setValor('');
      setCategoriaSel('');
      setContatoSel('');
      carregarDados(); // Recarrega os dados para atualizar saldo, lista e gráfico
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <main className="flex-1 p-10 overflow-y-auto bg-dark">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl font-light text-white">Olá, <span className="font-semibold text-primary">Jorge</span></h2>
          <p className="text-secondary mt-2 text-lg">Visão geral das finanças hoje.</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-primary hover:bg-[#b0876b] text-darker font-bold px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95"
        >
          + Novo Lançamento
        </button>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-darker border border-primary/40 p-8 rounded-2xl relative overflow-hidden group hover:border-primary transition-all shadow-xl">
          <h3 className="text-secondary text-sm font-medium uppercase tracking-wider mb-4">Saldo Total em Contas</h3>
          <p className="text-4xl font-bold text-white mb-2">{formatarMoeda(saldoTotal)}</p>
          <div className="flex items-center text-success text-sm font-medium"><ArrowTrendingUpIcon className="h-4 w-4 mr-1" /><span>Atualizado</span></div>
        </div>

        <div className="bg-darker border border-secondary/20 p-8 rounded-2xl relative overflow-hidden hover:border-primary/30 transition-all shadow-lg">
          <h3 className="text-secondary text-sm font-medium uppercase tracking-wider mb-4 flex items-center"><span className="w-2 h-2 rounded-full bg-success mr-2"></span> Entradas (Total)</h3>
          <p className="text-3xl font-semibold text-white mb-2">{formatarMoeda(dadosGrafico.reduce((acc, curr) => acc + curr.entradas, 0))}</p>
        </div>

        <div className="bg-darker border border-secondary/20 p-8 rounded-2xl relative overflow-hidden hover:border-primary/30 transition-all shadow-lg">
          <h3 className="text-secondary text-sm font-medium uppercase tracking-wider mb-4 flex items-center"><span className="w-2 h-2 rounded-full bg-danger mr-2"></span> Saídas (Total)</h3>
          <p className="text-3xl font-semibold text-white mb-2">{formatarMoeda(dadosGrafico.reduce((acc, curr) => acc + curr.saidas, 0))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-darker border border-secondary/20 p-8 rounded-2xl shadow-sm min-h-[450px]">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><ChartPieIcon className="h-6 w-6 text-primary mr-3" />Fluxo de Caixa Mensal</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="mes" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }} />
                <Bar dataKey="entradas" fill="#C29D84" radius={[4, 4, 0, 0]} name="Entradas" />
                <Bar dataKey="saidas" fill="#E63946" radius={[4, 4, 0, 0]} name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lançamentos Recentes */}
        <div className="bg-darker border border-secondary/20 p-8 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><BellAlertIcon className="h-6 w-6 text-primary mr-3" />Lançamentos Recentes</h3>
          <div className="flex flex-col gap-4">
            {transacoes.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-dark rounded-xl border border-secondary/10 hover:border-primary/20 transition-all">
                <div>
                  <p className="font-medium text-white">{t.descricao}</p>
                  <p className="text-xs text-secondary mt-1">{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className={`font-semibold ${t.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                  {t.tipo === 'receita' ? '+' : '-'} {formatarMoeda(t.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Lançamento */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-darker border border-primary/30 w-full max-w-xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-semibold text-primary italic">Novo <span className="text-white not-italic">Lançamento</span></h3>
              <button onClick={() => setModalAberto(false)} className="text-secondary hover:text-white transition-colors"><XMarkIcon className="h-8 w-8" /></button>
            </div>
            
            <form onSubmit={salvarLancamento} className="flex flex-col gap-5">
              <div className="flex bg-dark p-1 rounded-2xl border border-secondary/20">
                <button type="button" onClick={() => setTipo('receita')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tipo === 'receita' ? 'bg-success text-darker' : 'text-secondary hover:text-white'}`}>Receita</button>
                <button type="button" onClick={() => setTipo('despesa')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tipo === 'despesa' ? 'bg-danger text-white' : 'text-secondary hover:text-white'}`}>Despesa</button>
              </div>
              
              <input type="text" required placeholder="Descrição" className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="Valor (R$)" className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary" value={valor} onChange={(e) => setValor(e.target.value)} />
                <input type="date" required className="w-full bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary" value={data} onChange={(e) => setData(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select className="bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary appearance-none" value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)}>
                  <option value="">Categoria (Opcional)</option>
                  {categorias.filter(c => c.tipo === tipo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select className="bg-dark border border-secondary/20 rounded-xl p-4 text-white outline-none focus:border-primary appearance-none" value={contatoSel} onChange={e => setContatoSel(e.target.value)}>
                  <option value="">Contato (Opcional)</option>
                  {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <button type="submit" className="bg-primary text-darker font-black py-5 rounded-2xl mt-4 hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
                Confirmar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}