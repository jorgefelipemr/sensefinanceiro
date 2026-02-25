import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  UserGroupIcon, TruckIcon, TagIcon, PlusIcon, 
  TrashIcon, XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon,
  ShoppingBagIcon, WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

export default function Cadastros() {
  const [abaAtiva, setAbaAtiva] = useState<'clientes' | 'fornecedores' | 'transportadoras' | 'itens' | 'categorias'>('clientes');
  const [lista, setLista] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [form, setForm] = useState({
    nome: '', nome_fantasia: '', cpf_cnpj: '', inscricao_estadual: '',
    email: '', telefone: '', cep: '', logradouro: '', numero: '',
    bairro: '', cidade: '', estado: '', tipo_categoria: 'despesa',
    // Campos para Itens
    tipo_item: 'produto', preco_venda: '', unidade_medida: 'UN', ncm: ''
  });

  const carregarDados = async () => {
    let query;
    if (abaAtiva === 'itens') {
      query = supabase.from('itens').select('*');
    } else if (abaAtiva === 'categorias') {
      query = supabase.from('categorias').select('*');
    } else {
      query = supabase.from('contatos').select('*').eq('tipo', abaAtiva.slice(0, -1));
    }
    
    const { data } = await query.order('nome', { ascending: true });
    if (data) setLista(data);
  };

  useEffect(() => { carregarDados(); }, [abaAtiva]);

  const buscarCNPJ = async () => {
    const cnpj = form.cpf_cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    setCarregando(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();
      if (data.cnpj) {
        setForm({ ...form, nome: data.razao_social, nome_fantasia: data.nome_fantasia || data.razao_social, 
          cep: data.cep, logradouro: data.logradouro, bairro: data.bairro, cidade: data.municipio, estado: data.uf, numero: data.numero });
      }
    } catch (e) { console.error(e); }
    setCarregando(false);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (abaAtiva === 'itens') {
      await supabase.from('itens').insert([{ nome: form.nome, tipo: form.tipo_item, preco_venda: parseFloat(form.preco_venda), unidade_medida: form.unidade_medida, ncm: form.ncm }]);
    } else if (abaAtiva === 'categorias') {
      await supabase.from('categorias').insert([{ nome: form.nome, tipo: form.tipo_categoria }]);
    } else {
      await supabase.from('contatos').insert([{ 
        nome: form.nome, nome_fantasia: form.nome_fantasia, cpf_cnpj: form.cpf_cnpj, tipo: abaAtiva.slice(0, -1),
        inscricao_estadual: form.inscricao_estadual, email: form.email, telefone: form.telefone,
        endereco_cep: form.cep, endereco_logradouro: form.logradouro, endereco_numero: form.numero,
        endereco_bairro: form.bairro, endereco_cidade: form.cidade, endereco_estado: form.estado
      }]);
    }
    setModalAberto(false);
    setForm({ nome: '', nome_fantasia: '', cpf_cnpj: '', inscricao_estadual: '', email: '', telefone: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', tipo_categoria: 'despesa', tipo_item: 'produto', preco_venda: '', unidade_medida: 'UN', ncm: '' });
    carregarDados();
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-dark text-white">
      <header className="mb-10 flex justify-between items-center">
        <h2 className="text-3xl font-light text-primary italic">Cadastros <span className="font-semibold not-italic text-white">Gerais</span></h2>
        <button onClick={() => setModalAberto(true)} className="bg-primary text-darker font-black px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg">
          <PlusIcon className="h-5 w-5" /> Adicionar
        </button>
      </header>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap gap-2 mb-8 bg-darker p-2 rounded-2xl border border-secondary/10">
        {[
          { id: 'clientes', label: 'Clientes', icon: UserGroupIcon },
          { id: 'fornecedores', label: 'Fornecedores', icon: TruckIcon },
          { id: 'transportadoras', label: 'Transp.', icon: TruckIcon },
          { id: 'itens', label: 'Prod/Serv', icon: ShoppingBagIcon },
          { id: 'categorias', label: 'Categorias', icon: TagIcon },
        ].map((aba) => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === aba.id ? 'bg-primary text-darker' : 'text-secondary hover:text-white'}`}>
            <aba.icon className="h-4 w-4" /> {aba.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lista.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase())).map(item => (
          <div key={item.id} className="bg-darker border border-secondary/10 p-5 rounded-2xl group shadow-md">
            <p className="font-bold text-white">{item.nome}</p>
            <p className="text-[10px] text-secondary uppercase mb-2">{item.cpf_cnpj || item.tipo}</p>
            {item.preco_venda && <p className="text-primary font-bold">R$ {item.preco_venda.toLocaleString('pt-BR')}</p>}
            <p className="text-xs text-secondary">{item.telefone || item.ncm || ''}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-darker border border-primary/20 w-full max-w-2xl rounded-[30px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary mb-6 italic">Cadastro de {abaAtiva}</h3>
            
            <form onSubmit={salvar} className="grid grid-cols-2 gap-4">
              {abaAtiva === 'itens' ? (
                <>
                  <select className="col-span-2 bg-dark border border-secondary/20 p-3 rounded-xl" value={form.tipo_item} onChange={e => setForm({...form, tipo_item: e.target.value})}>
                    <option value="produto">Produto</option>
                    <option value="servico">Serviço</option>
                  </select>
                  <input required placeholder="Nome do Item" className="col-span-2 bg-dark border border-secondary/20 p-3 rounded-xl" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
                  <input placeholder="Preço de Venda" type="number" step="0.01" className="bg-dark border border-secondary/20 p-3 rounded-xl" value={form.preco_venda} onChange={e => setForm({...form, preco_venda: e.target.value})} />
                  <input placeholder="Unidade (UN, PC, HR)" className="bg-dark border border-secondary/20 p-3 rounded-xl" value={form.unidade_medida} onChange={e => setForm({...form, unidade_medida: e.target.value})} />
                  <input placeholder="NCM" className="col-span-2 bg-dark border border-secondary/20 p-3 rounded-xl" value={form.ncm} onChange={e => setForm({...form, ncm: e.target.value})} />
                </>
              ) : (
                /* ... formulário de contatos (igual ao anterior) ... */
                <>
                  <div className="col-span-2 flex gap-2">
                    <input placeholder="CPF/CNPJ" className="flex-1 bg-dark border border-secondary/20 p-3 rounded-xl" value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})} />
                    {abaAtiva !== 'clientes' && <button type="button" onClick={buscarCNPJ} className="bg-primary text-darker px-4 rounded-xl font-bold text-[10px]">BUSCAR</button>}
                  </div>
                  <input required placeholder="Nome / Razão Social" className="col-span-2 bg-dark border border-secondary/20 p-3 rounded-xl" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
                  {/* Campos de endereço e contato aqui... */}
                </>
              )}
              <button type="submit" className="col-span-2 bg-primary text-darker font-black py-4 rounded-xl mt-4">Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}