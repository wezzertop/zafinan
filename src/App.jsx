import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// --- Iconos SVG para la barra lateral ---
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.37 3.63a2.12 2.12 0 1 1 3 3L12 16l-4 1 1-4Z"/></svg>;
const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
const AccountsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const CategoriesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>;
const TransactionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>;
const RecurringIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/><path d="M15 5.5l3 3"/></svg>;
const DebtIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;


// --- Componente de Enlace de Navegación Personalizado ---
const NavLink = ({ to, icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeClasses = 'bg-blue-100 text-blue-600';
  const inactiveClasses = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? activeClasses : inactiveClasses}`}
    >
      <span className="mr-3">{icon}</span>
      {children}
    </Link>
  );
};

// --- Componente de la Barra Lateral ---
const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b">
        <Link to="/" className="text-2xl font-bold text-blue-600">Zafinan</Link>
      </div>
      <div className="flex flex-col flex-grow p-4">
        <nav className="flex-grow space-y-1">
          <NavLink to="/" icon={<DashboardIcon />}>Dashboard</NavLink>
          <NavLink to="/reports" icon={<ReportsIcon />}>Reportes</NavLink> {/* <-- 3. Agregar el enlace */}
          
          <div className="pt-4 mt-4 border-t border-gray-200">
             <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gestión</h3>
             <div className="mt-2 space-y-1">
                <NavLink to="/accounts" icon={<AccountsIcon />}>Cuentas</NavLink>
                <NavLink to="/categories" icon={<CategoriesIcon />}>Categorías</NavLink>
                <NavLink to="/transactions" icon={<TransactionsIcon />}>Transacciones</NavLink>
                <NavLink to="/recurring" icon={<RecurringIcon />}>Recurrentes</NavLink>
             </div>
          </div>
          
          <div className="pt-4 mt-4 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deudas</h3>
            <div className="mt-2 space-y-1">
              <NavLink to="/monthly-purchases" icon={<DebtIcon />}>Compras a Meses</NavLink>
              <NavLink to="/loans" icon={<DebtIcon />}>Préstamos</NavLink>
            </div>
          </div>
        </nav>
        
        <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <LogoutIcon />
              <span className="ml-3">Cerrar Sesión</span>
            </button>
        </div>
      </div>
    </div>
  );
};


// --- Componente Principal de la Aplicación ---
function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className="flex h-screen bg-gray-100 text-gray-800">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                <div className="container mx-auto px-6 py-8">
                    <Outlet /> 
                </div>
            </div>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App;
