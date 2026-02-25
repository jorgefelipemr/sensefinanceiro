import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  DocumentArrowDownIcon, 
  PresentationChartLineIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data_vencimento: string;
  status: string;
}

export default function Relatorios() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'dre' | 'fluxo'>('dre');
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);

  const carregarDados = async () => {
    const { data } = await supabase.from('transacoes').select('*').order('data_vencimento', { ascending: true });
    if (data) setTransacoes(data);
  };

  useEffect(() => { carregarDados(); }, []);

  const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Number(t.valor), 0);
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Number(t.valor), 0);
  const lucroLiquido = receitas - despesas;

  const exportarRelatorio = (tipo: 'DRE' | 'Fluxo') => {
    const doc = new jsPDF();
    const corCobre: [number, number, number] = [194, 157, 132];
    
    doc.setFontSize(18);
    doc.setTextColor(corCobre[0], corCobre[1], corCobre[2]);
    doc.text(`SENSE AUDIO - ${tipo === 'DRE' ? 'DRE' : 'FLUXO DE CAIXA'}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    if (tipo === 'DRE') {
      autoTable(doc, {
        startY: 35,
        head: [['ITEM', 'VALOR']],
        body: [
          ['RECEITA TOTAL', `R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['DESPESA TOTAL', `R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['LUCRO/PREJUÍZO LÍQUIDO', `R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ],
        headStyles: { fillColor: corCobre, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
      });
    } else {
      autoTable(doc, {
        startY: 35,
        head: [['Data', 'Descrição', 'Tipo', 'Valor']],
        body: transacoes.map(t => [
          new Date(t.data_vencimento).toLocaleDateString('pt-BR'),
          t.descricao,
          t.tipo.toUpperCase(),
          `R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]),
        headStyles: { fillColor: [40, 40, 40], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } }
      });
    }

    doc.save(`SenseAudio_${tipo}_${new Date().getTime()}.pdf`);
    setMenuExportarAberto(false);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light text-primary italic">Relatórios <span className="font-semibold not-italic text-white">Gerenciais</span></h2>
          <p className="text-secondary mt-2 text-lg">Análise de desempenho e movimentações.</p>
        </div>

        <div className="relative">
          <button 
            onClick={() => setMenuExportarAberto(!menuExportarAberto)}
            className="bg-primary hover:bg-[#b0876b] text-darker font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <DocumentArrowDownIcon className="h-5 w-5" /> Exportar... <ChevronDownIcon className="h-4 w-4" />
          </button>
          
          {menuExportarAberto && (
            <div className="absolute right-0 mt-2 w-48 bg-darker border border-secondary/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <button onClick={() => exportarRelatorio('DRE')} className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 hover:text-primary transition-all border-b border-secondary/10">Exportar DRE (Resumo)</button>
              <button onClick={() => exportarRelatorio('Fluxo')} className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 hover:text-primary transition-all">Exportar Fluxo (Detalhado)</button>
            </div>
          )}
        </div>
      </header>

      {/* Navegação Simplificada */}
      <div className="flex gap-4 mb-8 border-b border-secondary/10 pb-4">
        <button 
          onClick={() => setAbaAtiva('dre')}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${abaAtiva === 'dre' ? 'bg-primary text-darker' : 'text-secondary hover:text-white hover:bg-white/5'}`}
        >
          <PresentationChartLineIcon className="h-5 w-5" /> DRE / RESULTADO
        </button>
        <button 
          onClick={() => setAbaAtiva('fluxo')}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${abaAtiva === 'fluxo' ? 'bg-primary text-darker' : 'text-secondary hover:text-white hover:bg-white/5'}`}
        >
          <ArrowsRightLeftIcon className="h-5 w-5" /> FLUXO DE CAIXA
        </button>
      </div>

      <div className="bg-darker border border-secondary/20 rounded-3xl p-8 shadow-2xl">
        {abaAtiva === 'dre' ? (
          <div className="animate-in fade-in duration-500">
            <h3 className="text-xl font-bold mb-8 text-primary uppercase tracking-widest border-l-4 border-primary pl-4">Demonstrativo de Resultado</h3>
            <div className="space-y-6 max-w-3xl">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-gray-400 font-medium">Receita Bruta (Entradas)</span>
                <span className="text-success text-xl font-bold">{receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-gray-400 font-medium">Custos e Despesas (Saídas)</span>
                <span className="text-danger text-xl font-bold">({despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-primary/10 rounded-2xl border border-primary/20 mt-10">
                <span className="text-xl font-black text-white uppercase tracking-tighter">Lucro Líquido</span>
                <span className={`text-3xl font-black ${lucroLiquido >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
             <h3 className="text-xl font-bold mb-8 text-primary uppercase tracking-widest border-l-4 border-primary pl-4">Detalhamento de Fluxo</h3>
             <table className="w-full text-left">
              <thead>
                <tr className="text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-secondary/10">
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Descrição</th>
                  <th className="pb-4">Tipo</th>
                  <th className="pb-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                {transacoes.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-all group">
                    <td className="py-4 text-sm text-secondary">{new Date(t.data_vencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 text-sm font-medium text-gray-200">{t.descricao}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${t.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className={`py-4 text-sm font-bold text-right ${t.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                      {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}