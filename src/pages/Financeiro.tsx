import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  BanknotesIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'receber' | 'pagar'>('todos');
  const [resumo, setResumo] = useState({ totalReceber: 0, totalPagar: 0, saldo: 0 });

  useEffect(() => { carregarDados(); }, [filtro]);

  async function carregarDados() {
    let query = supabase.from('financeiro').select('*, contatos(nome)').order('data_vencimento', { ascending: true });
    
    if (filtro !== 'todos') query = query.eq('tipo', filtro);
    
    const { data } = await query;
    if (data) {
      setLancamentos(data);
      const rec = data.filter(i => i.tipo === 'receber' && i.status !== 'pago').reduce((acc, i) => acc + i.valor, 0);
      const pag = data.filter(i => i.tipo === 'pagar' && i.status !== 'pago').reduce((acc, i) => acc + i.valor, 0);
      setResumo({ totalReceber: rec, totalPagar: pag, saldo: rec - pag });
    }
  }

  const darBaixa = async (id: string) => {
    const { error } = await supabase
      .from('financeiro')
      .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
      .eq('id', id);
    
    if (!error) carregarDados();
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      <header className="mb-10 flex justify-between items-center">
        <h2 className="text-3xl font-light text-primary italic">Gestão <span className="font-semibold not-italic text-white">Financeira</span></h2>
        <button className="bg-primary text-darker font-black px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg">
          <PlusIcon className="h-5 w-5" /> Novo Lançamento
        </button>
      </header>

      {/* CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-darker border border-secondary/10 p-6 rounded-[30px] shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <ArrowTrendingUpIcon className="h-8 w-8 text-success" />
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">A Receber</span>
          </div>
          <p className="text-3xl font-black text-white">R$ {resumo.totalReceber.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-darker border border-secondary/10 p-6 rounded-[30px] shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <ArrowTrendingDownIcon className="h-8 w-8 text-danger" />
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">A Pagar</span>
          </div>
          <p className="text-3xl font-black text-white">R$ {resumo.totalPagar.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-6 rounded-[30px] shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <BanknotesIcon className="h-8 w-8 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Projeção Saldo</span>
          </div>
          <p className="text-3xl font-black text-primary font-mono">R$ {resumo.saldo.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* LISTAGEM DE TÍTULOS */}
      <div className="bg-darker border border-secondary/10 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-secondary/5 bg-white/5 flex gap-4">
          <button onClick={() => setFiltro('todos')} className={`px-4 py-2 rounded-lg text-xs font-bold ${filtro === 'todos' ? 'bg-primary text-darker' : 'text-secondary'}`}>TODOS</button>
          <button onClick={() => setFiltro('receber')} className={`px-4 py-2 rounded-lg text-xs font-bold ${filtro === 'receber' ? 'bg-success text-white' : 'text-secondary'}`}>RECEBER</button>
          <button onClick={() => setFiltro('pagar')} className={`px-4 py-2 rounded-lg text-xs font-bold ${filtro === 'pagar' ? 'bg-danger text-white' : 'text-secondary'}`}>PAGAR</button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-secondary">
            <tr>
              <th className="p-6">Vencimento</th>
              <th className="p-6">Descrição / Contato</th>
              <th className="p-6">Tipo</th>
              <th className="p-6 text-right">Valor</th>
              <th className="p-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary/5">
            {lancamentos.map(l => (
              <tr key={l.id} className="hover:bg-white/5 group transition-colors">
                <td className="p-6 text-sm font-mono">{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</td>
                <td className="p-6">
                  <p className="font-bold text-gray-200">{l.descricao}</p>
                  <p className="text-[10px] text-secondary uppercase">{l.contatos?.nome || 'Lançamento Manual'}</p>
                </td>
                <td className="p-6">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${l.tipo === 'receber' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {l.tipo}
                  </span>
                </td>
                <td className={`p-6 text-right font-black ${l.tipo === 'receber' ? 'text-success' : 'text-white'}`}>
                  R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-6">
                  <div className="flex justify-center">
                    {l.status === 'pago' ? (
                      <CheckCircleIcon className="h-6 w-6 text-success" />
                    ) : (
                      <button 
                        onClick={() => darBaixa(l.id)}
                        className="flex items-center gap-2 text-[10px] font-black bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary hover:text-darker transition-all"
                      >
                        BAIXAR TÍTULO
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}