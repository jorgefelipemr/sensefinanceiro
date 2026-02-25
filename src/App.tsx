import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Conciliacao from './pages/Conciliacao';
import { 
  HomeIcon, 
  CurrencyDollarIcon, 
  ClipboardDocumentCheckIcon, 
  ChartPieIcon,
  IdentificationIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Lancamentos from './pages/Lancamentos';
import Relatorios from './pages/Relatorios';
import Cadastros from './pages/Cadastros';
import Vendas from './pages/Vendas';
import NfVenda from './pages/NFe_Venda';
import NfCompra from './pages/NFe_Compra';
import Financeiro from './pages/Financeiro';
import Consultoria from './pages/Consultoria';

function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: HomeIcon },
    { name: 'Conciliação', path: '/conciliacao', icon: ClipboardDocumentCheckIcon },
    { name: 'Lançamentos', path: '/lancamentos', icon: CurrencyDollarIcon },
    { name: 'Vendas', path: '/vendas', icon: ShoppingCartIcon },
    { name: 'NFe Venda', path: '/nfe-venda', icon: DocumentTextIcon }, 
    { name: 'NFe Compra', path: '/nfe-compra', icon: ArrowDownTrayIcon },
    { name: 'Relatórios', path: '/relatorios', icon: ChartPieIcon },
    { name: 'Cadastros', path: '/cadastros', icon: IdentificationIcon },
    { name: 'Financeiro', path: '/financeiro', icon: BanknotesIcon },
    { name: 'Consultoria', path: '/consultoria', icon: ChartBarIcon },
  ];

  return (
    <aside className="w-72 bg-darker border-r border-secondary/20 p-6 flex flex-col h-screen sticky top-0">
      <div className="mb-12 mt-4 text-center">
        <h1 className="text-3xl font-bold tracking-[0.2em] text-primary leading-tight">SENSE</h1>
        <h1 className="text-3xl font-light tracking-[0.2em] text-primary leading-tight">AUDIO</h1>
      </div>

      <nav className="flex flex-col gap-3">
        {menuItems.map((item) => {
          const ativo = location.pathname === item.path;
          return (
            <Link 
              key={item.name}
              to={item.path} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                ativo ? 'bg-primary text-darker font-bold shadow-lg shadow-primary/20' : 'text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark text-gray-100 flex font-sans">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conciliacao" element={<Conciliacao />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/cadastros" element={<Cadastros />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/nfe-venda" element={<NfVenda />} />
          <Route path="/nfe-compra" element={<NfCompra />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/consultoria" element={<Consultoria />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;