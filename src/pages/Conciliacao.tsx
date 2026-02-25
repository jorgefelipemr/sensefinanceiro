import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowPathIcon, 
  CheckIcon, 
  CloudArrowUpIcon,
  TagIcon,
  UserIcon,
  CheckCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface TransacaoOFX {
  id_temp: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria_id?: string;
  contato_id?: string;
  id_vinculado?: string;
}

export default function Conciliacao() {
  const [extrato, setExtrato] = useState<TransacaoOFX[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [contasPendentes, setContasPendentes] = useState<any[]>([]);
  const [processando, setProcessando] = useState(false);

  useEffect(() => { carregarDadosAuxiliares(); }, []);

  const carregarDadosAuxiliares = async () => {
    const { data: cat } = await supabase.from('categorias').select('*');
    const { data: cont } = await supabase.from('contatos').select('*');
    const { data: pend } = await supabase.from('transacoes').select('*').eq('status', 'pendente');
    if (cat) setCategorias(cat);
    if (cont) setContatos(cont);
    if (pend) setContasPendentes(pend);
  };

  const encontrarMatch = (valorOFX: number) => {
    return contasPendentes.find(p => Math.abs(Number(p.valor)) === Math.abs(valorOFX));
  };

  const lerOFX = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      file = e.dataTransfer.files[0];
    }
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const blocos = text.split('<STMTTRN>');
      const transacoes: TransacaoOFX[] = [];

      blocos.slice(1).forEach((bloco, index) => {
        const limpar = (tag: string) => {
          const regex = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i');
          const match = bloco.match(regex);
          return match ? match[1].replace(/<\/?[A-Z0-9]+>/gi, '').trim() : '';
        };

        const valor = parseFloat(limpar('TRNAMT').replace(',', '.'));
        const dataBruta = limpar('DTPOSTED');
        const desc = limpar('MEMO') || limpar('NAME') || 'Sem descrição';
        const matchExistente = encontrarMatch(Math.abs(valor));

        transacoes.push({
          id_temp: String(index),
          data: `${dataBruta.slice(0, 4)}-${dataBruta.slice(4, 6)}-${dataBruta.slice(6, 8)}`,
          descricao: desc,
          valor: Math.abs(valor),
          tipo: valor > 0 ? 'receita' : 'despesa',
          categoria_id: matchExistente?.categoria_id || '',
          contato_id: matchExistente?.contato_id || '',
          id_vinculado: matchExistente?.id || undefined
        });
      });
      setExtrato(transacoes);
    };
    reader.readAsText(file);
  };

  const confirmarConciliacao = async () => {
    setProcessando(true);
    try {
      for (const t of extrato) {
        if (t.id_vinculado) {
          await supabase.from('transacoes').update({
            status: 'pago',
            categoria_id: t.categoria_id || null,
            contato_id: t.contato_id || null,
            data_vencimento: t.data 
          }).eq('id', t.id_vinculado);
        } else {
          await supabase.from('transacoes').insert([{
            descricao: t.descricao, valor: t.valor, tipo: t.tipo,
            data_vencimento: t.data, categoria_id: t.categoria_id || null,
            contato_id: t.contato_id || null, status: 'pago'
          }]);
        }
      }
      alert("Conciliação Finalizada!");
      setExtrato([]);
      carregarDadosAuxiliares();
    } catch (err: any) { alert(err.message); }
    setProcessando(false);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white">
      <header className="mb-12">
        <h2 className="text-3xl font-light text-primary italic">Conciliação <span className="font-semibold not-italic text-white">Bancária</span></h2>
      </header>

      {/* ÁREA DE DRAG & DROP REATIVADA */}
      {extrato.length === 0 && (
        <label 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); lerOFX(e as any); }}
          className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-primary/30 rounded-[40px] bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group"
        >
          <CloudArrowUpIcon className="h-16 w-16 text-primary/40 group-hover:text-primary transition-all mb-4" />
          <p className="text-secondary text-lg">Arraste seu arquivo <span className="text-primary font-bold">OFX</span> aqui ou clique para buscar</p>
          <input type="file" accept=".ofx" className="hidden" onChange={lerOFX} />
        </label>
      )}

      {extrato.length > 0 && (
        <div className="bg-darker border border-secondary/20 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr className="text-primary text-[10px] font-black uppercase tracking-widest border-b border-secondary/10">
                <th className="p-6">Data</th>
                <th className="p-6">Descrição</th>
                <th className="p-6 text-right">Valor</th>
                <th className="p-6">Categoria</th>
                <th className="p-6">Ação / Vínculo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/5">
              {extrato.map((t) => (
                <tr key={t.id_temp} className={`hover:bg-white/5 transition-colors ${t.id_vinculado ? 'bg-primary/10' : ''}`}>
                  <td className="p-6 text-sm text-secondary font-mono">{t.data.split('-').reverse().join('/')}</td>
                  <td className="p-6 font-medium text-sm">{t.descricao}</td>
                  <td className={`p-6 font-bold text-right ${t.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                    {t.tipo === 'receita' ? '+' : '-'} {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-4">
                    <select 
                      className="w-full bg-dark border border-secondary/20 rounded-lg p-2 text-xs text-white"
                      value={t.categoria_id}
                      onChange={(e) => setExtrato(prev => prev.map(item => item.id_temp === t.id_temp ? {...item, categoria_id: e.target.value} : item))}
                    >
                      <option value="">Categoria...</option>
                      {categorias.filter(c => c.tipo === t.tipo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    {t.id_vinculado ? (
                      <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase bg-primary/20 p-2 rounded-lg">
                        <CheckCircleIcon className="h-4 w-4" /> Baixando lançamento existente
                      </div>
                    ) : (
                      <select 
                        className="w-full bg-dark border border-secondary/20 rounded-lg p-2 text-xs text-white"
                        value={t.contato_id}
                        onChange={(e) => setExtrato(prev => prev.map(item => item.id_temp === t.id_temp ? {...item, contato_id: e.target.value} : item))}
                      >
                        <option value="">Contato...</option>
                        {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-8 bg-black/20 flex justify-end">
            <button onClick={confirmarConciliacao} disabled={processando} className="bg-primary text-darker font-black px-12 py-4 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
              {processando ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckIcon className="h-6 w-6" />}
              Confirmar Conciliação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}