import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  PresentationChartLineIcon 
} from '@heroicons/react/24/outline';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Tipagem para o estado de dados, substituindo o 'any'
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
    // Nota: Se a base crescer muito, ideal é fazer essa soma direto no Supabase (RPC)
    const { data: vendas } = await supabase.from('vendas').select('valor_total');
    const { data: fin } = await supabase.from('financeiro').select('*');
    
    const fat = vendas?.reduce((acc, v) => acc + Number(v.valor_total), 0) || 0;
    const gastos = fin?.filter(f => f.tipo === 'pagar').reduce((acc, f) => acc + Number(f.valor), 0) || 0;
    const lucro = fat - gastos;

    setDados({ fat, gastos, lucro });
    solicitarAnaliseIA(fat, gastos, lucro);
  }

  async function solicitarAnaliseIA(fat: number, gastos: number, lucro: number) {
    console.log("Minha chave é:", import.meta.env.VITE_GEMINI_API_KEY);
    setCarregandoIA(true);
    setAnaliseIA(""); // Limpa para o efeito de "digitação" iniciar do zero
    
    try {
      // 2. Usando a variável de ambiente segura do Vite
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Chave de API não encontrada no arquivo .env");
      }

      // O .trim() é a mágica aqui: ele corta qualquer espaço ou quebra de linha acidental!
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Aja como um consultor financeiro sênior da Sense Audio. 
        Analise: Faturamento R$ ${fat}, Gastos R$ ${gastos}, Lucro R$ ${lucro}.
        Dê 3 dicas curtas e motivadoras para 2026.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // 3. Efeito de Digitação corrigido
      let i = 0;
      const interval = setInterval(() => {
        setAnaliseIA((prev) => prev + text.charAt(i));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setCarregandoIA(false); // Agora o loading só desativa quando termina de digitar!
        }
      }, 15); // Velocidade da digitação

    } catch (error) {
      console.error("Erro na consultoria:", error);
      setAnaliseIA("Não consegui acessar minha base de consultoria. Verifique sua chave de API ou conexão.");
      setCarregandoIA(false); // Garante que o loading saia mesmo se der erro
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
        {/* Lado Esquerdo: Cards de Dados */}
        <div className="space-y-6">
          <div className="bg-darker p-6 rounded-[30px] border border-secondary/10">
            <p className="text-secondary text-[10px] font-black uppercase mb-1">Faturamento Bruto</p>
            <p className="text-2xl font-black">R$ {dados?.fat.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-primary/10 p-6 rounded-[30px] border border-primary/20">
            <p className="text-primary text-[10px] font-black uppercase mb-1">Resultado Final</p>
            <p className="text-3xl font-black text-primary">R$ {dados?.lucro.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Lado Direito: IA com efeito de digitação */}
        <div className="lg:col-span-2">
          <div className="bg-darker border border-primary/30 rounded-[40px] p-10 relative overflow-hidden shadow-2xl min-h-[400px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary p-2 rounded-lg animate-pulse">
                <SparklesIcon className="h-6 w-6 text-darker" />
              </div>
              <h3 className="text-xl font-bold">Análise Estratégica do <span className="text-primary">Gemini</span></h3>
            </div>

            {carregandoIA && !analiseIA ? (
              <div className="flex flex-col items-center justify-center py-20">
                <ArrowPathIcon className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-secondary italic">Consultor Gemini está processando...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed whitespace-pre-line italic text-lg">
                  {analiseIA}
                  {carregandoIA && <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse">|</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}