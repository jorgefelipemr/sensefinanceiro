import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  PresentationChartLineIcon 
} from '@heroicons/react/24/outline';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Inicialização usando a chave do seu .env (sem espaços!)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface DadosFinanceiros {
  fat: number;
  gastos: number;
  lucro: number;
}

export default function Consultoria() {
  const [analiseIA, setAnaliseIA] = useState("");
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [dados, setDados] = useState<DadosFinanceiros | null>(null);

  useEffect(() => { 
    carregarDadosEAnalisar(); 
  }, []);

  async function carregarDadosEAnalisar() {
    try {
      // Puxamos do 'financeiro' pois é onde seus testes estão aparecendo
      const { data: fin, error } = await supabase.from('financeiro').select('*');
      
      if (error) throw error;

      // Lógica baseada no seu print: Valores positivos = Faturamento | Negativos = Gastos
      const fat = fin?.filter(f => Number(f.valor) > 0).reduce((acc, f) => acc + Number(f.valor), 0) || 0;
      const gastos = fin?.filter(f => Number(f.valor) < 0).reduce((acc, f) => acc + Math.abs(Number(f.valor)), 0) || 0;
      const lucro = fat - gastos;

      setDados({ fat, gastos, lucro });

      // Só chama a IA se houver dados para não gastar cota a toa
      if (fat !== 0 || gastos !== 0) {
        await solicitarAnaliseIA(fat, gastos, lucro);
      } else {
        setAnaliseIA("Aguardando lançamentos financeiros para iniciar a consultoria...");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }

  async function solicitarAnaliseIA(fat: number, gastos: number, lucro: number) {
    setCarregandoIA(true);
    setAnaliseIA(""); 
    
    try {
      // Usando o modelo 2.0 Flash conforme conversamos
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `Aja como consultor sênior da Sense Audio. 
      Analise estes números: Faturamento R$ ${fat}, Gastos R$ ${gastos}, Lucro R$ ${lucro}. 
      Dê 3 dicas curtas e motivadoras para 2026.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let index = 0;
      const typing = setInterval(() => {
        setAnaliseIA(text.substring(0, index));
        index++;
        
        if (index > text.length) {
          clearInterval(typing);
          setCarregandoIA(false);
        }
      }, 15);

    } catch (error: any) {
      console.error("ERRO API:", error);
      // Tratamento para o erro 429 (Cota) que apareceu no seu console
      if (error.status === 429) {
        setAnaliseIA("Muitas consultas seguidas! Aguarde 1 minuto para o Gemini processar novamente.");
      } else {
        setAnaliseIA("Não consegui conectar com o consultor. Verifique a chave no .env.");
      }
      setCarregandoIA(false);
    }
  }

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white font-sans">
      <header className="mb-12 flex items-center gap-4">
        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
          <PresentationChartLineIcon className="h-8 w-8 text-darker" />
        </div>
        <h2 className="text-3xl font-light text-primary italic">
          Consultoria <span className="font-semibold not-italic text-white">Estratégica IA</span>
        </h2>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cards com os valores dos seus testes */}
        <div className="space-y-6">
          <div className="bg-darker p-8 rounded-[35px] border border-secondary/10 shadow-2xl">
            <p className="text-secondary text-[10px] font-black uppercase mb-1 tracking-widest">Faturamento Teste</p>
            <p className="text-3xl font-black text-white">R$ {dados?.fat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-primary/10 p-8 rounded-[35px] border border-primary/20 shadow-xl">
            <p className="text-primary text-[10px] font-black uppercase mb-1 tracking-widest">Lucro Real</p>
            <p className="text-4xl font-black text-primary">R$ {dados?.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <button 
            onClick={() => carregarDadosEAnalisar()}
            className="w-full py-4 bg-dark border border-secondary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${carregandoIA ? 'animate-spin' : ''}`} />
            Recalcular Consultoria
          </button>
        </div>

        {/* Diagnóstico da IA */}
        <div className="lg:col-span-2">
          <div className="bg-darker border border-primary/30 rounded-[40px] p-10 relative overflow-hidden shadow-2xl min-h-[450px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary p-2 rounded-lg animate-pulse">
                <SparklesIcon className="h-6 w-6 text-darker" />
              </div>
              <h3 className="text-xl font-bold italic tracking-tight">Insight do <span className="text-primary not-italic">Consultor Gemini 2.0</span></h3>
            </div>

            {carregandoIA && !analiseIA ? (
              <div className="flex flex-col items-center justify-center py-20">
                <ArrowPathIcon className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-secondary italic">Analisando lançamentos da Sense Audio...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed whitespace-pre-line italic text-lg font-light border-l-2 border-primary/20 pl-6">
                  {analiseIA}
                  {carregandoIA && <span className="inline-block w-1.5 h-6 ml-1 bg-primary animate-ping"></span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}