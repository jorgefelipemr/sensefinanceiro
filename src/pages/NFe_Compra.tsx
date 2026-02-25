import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  DocumentArrowUpIcon, 
  PlusIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
  CloudArrowDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function NfCompra() {
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    const { data } = await supabase.from('notas_fiscais').select('*, contatos(nome)').eq('tipo', 'compra').order('data_emissao', { ascending: false });
    if (data) setNotas(data);
  }

  const lerXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setProgresso(10); // Iniciou a leitura
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const xmlText = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        setProgresso(30); // Parser XML concluído

        const cnpj = xmlDoc.getElementsByTagName("emit")[0].getElementsByTagName("CNPJ")[0].textContent;
        const razaoSocial = xmlDoc.getElementsByTagName("emit")[0].getElementsByTagName("xNome")[0].textContent;
        const nNF = xmlDoc.getElementsByTagName("ide")[0].getElementsByTagName("nNF")[0].textContent;
        const vNF = xmlDoc.getElementsByTagName("total")[0].getElementsByTagName("vNF")[0].textContent;
        const chave = xmlDoc.getElementsByTagName("infNFe")[0].getAttribute("Id")?.replace('NFe', '');

        setProgresso(50); // Dados extraídos, verificando fornecedor

        let { data: fornecedor } = await supabase.from('contatos').select('id').eq('cpf_cnpj', cnpj).single();

        if (!fornecedor) {
          const { data: novoFornecedor } = await supabase.from('contatos').insert([{
            nome: razaoSocial,
            cpf_cnpj: cnpj,
            tipo: 'fornecedor'
          }]).select().single();
          fornecedor = novoFornecedor;
        }

        setProgresso(70); // Criando a nota fiscal

        const { data: novaNota, error: erroNota } = await supabase.from('notas_fiscais').insert([{
          numero_nf: parseInt(nNF || '0'),
          chave_acesso: chave,
          tipo: 'compra',
          contato_id: fornecedor?.id,
          valor_total: parseFloat(vNF || '0'),
          status: 'autorizada'
        }]).select().single();

        if (erroNota) throw erroNota;

        setProgresso(85); // Processando itens

        const itensXML = xmlDoc.getElementsByTagName("det");
        const itensParaSalvar = [];

        for (let i = 0; i < itensXML.length; i++) {
          const qCom = itensXML[i].getElementsByTagName("qCom")[0].textContent;
          const vUnCom = itensXML[i].getElementsByTagName("vUnCom")[0].textContent;
          const ncm = itensXML[i].getElementsByTagName("NCM")[0].textContent;

          itensParaSalvar.push({
            nf_id: novaNota.id,
            quantidade: parseFloat(qCom || '0'),
            valor_unitario: parseFloat(vUnCom || '0'),
            ncm: ncm
          });
        }
        
        await supabase.from('nf_itens').insert(itensParaSalvar);

        setProgresso(100); // Finalizado
        setTimeout(() => {
            setCarregando(false);
            setProgresso(0);
            carregarDados();
        }, 500);

      } catch (err) {
        console.error(err);
        alert("Erro ao processar XML.");
        setCarregando(false);
        setProgresso(0);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      {/* OVERLAY DE CARREGAMENTO COM BARRA DE PROGRESSO */}
      {carregando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-darker border border-primary/20 p-8 rounded-[40px] shadow-2xl text-center">
            <ArrowPathIcon className="h-12 w-12 text-primary animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2 italic">Processando <span className="text-primary not-italic">XML</span></h3>
            <p className="text-secondary text-sm mb-8">Lendo dados do fornecedor e itens da nota...</p>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-secondary/10">
              <div 
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${progresso}%` }}
              ></div>
            </div>
            <p className="text-primary font-black text-xs mt-4 tracking-widest">{progresso}%</p>
          </div>
        </div>
      )}

      <header className="mb-12 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light text-primary italic">NF-e de <span className="font-semibold not-italic text-white">Compra</span></h2>
          <p className="text-secondary text-sm mt-1 tracking-wide">Importação e automação de entrada de estoque.</p>
        </div>
        
        <div className="flex gap-4">
          <label className="bg-secondary/20 hover:bg-secondary/40 text-white font-black px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all border border-secondary/10">
            <DocumentArrowUpIcon className="h-5 w-5" /> Importar XML
            <input type="file" className="hidden" accept=".xml" onChange={lerXML} />
          </label>
          <button className="bg-primary text-darker font-black px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
            <PlusIcon className="h-5 w-5" /> Nova NF
          </button>
        </div>
      </header>

      {/* Grid de Notas Mantido */}
      <div className="space-y-4">
        {notas.map(n => (
          <div key={n.id} className="bg-darker border border-secondary/10 p-6 rounded-[30px] flex justify-between items-center group hover:border-primary/40 transition-all shadow-xl">
             <div className="flex gap-8 items-center">
                <div className="text-center border-r border-secondary/10 pr-8">
                  <p className="text-[10px] text-secondary uppercase font-black">Emissão</p>
                  <p className="font-bold">{new Date(n.data_emissao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary uppercase font-black tracking-widest">Fornecedor</p>
                  <p className="font-bold text-lg leading-tight">{n.contatos?.nome}</p>
                  <p className="text-xs text-secondary font-mono mt-1">Nº: {n.numero_nf} | Série: {n.serie}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right">
                    <p className="text-[10px] text-secondary uppercase font-black">Valor Total</p>
                    <p className="text-2xl font-black text-white">R$ {n.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <button className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-6 py-3 rounded-2xl hover:bg-blue-500 hover:text-white transition-all font-bold text-xs uppercase flex items-center gap-2">
                  <ArrowsRightLeftIcon className="h-4 w-4" /> Clonar Saída
                </button>
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}