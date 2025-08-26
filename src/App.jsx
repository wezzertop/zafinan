import { Outlet, useNavigate, Link } from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast'; // <-- Importar Toaster

// Componente de Navegación (sin cambios)
const AppNavigation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-2xl font-bold text-blue-600">Zafinan</Link>
          {user && (
            <div className="space-x-4">
              <Link to="/" className="text-gray-600 hover:text-blue-500">Dashboard</Link>
              <Link to="/accounts" className="text-gray-600 hover:text-blue-500">Cuentas</Link>
              <Link to="/categories" className="text-gray-600 hover:text-blue-500">Categorías</Link>
              <Link to="/transactions" className="text-gray-600 hover:text-blue-500">Transacciones</Link>
            </div>
          )}
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 font-semibold text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};


function App() {
  return (
    <AuthProvider>
      {/* Contenedor de notificaciones */}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className="min-h-screen bg-gray-100 text-gray-800">
        <AppNavigation />
        <main className="container mx-auto px-6 py-8">
          <Outlet /> 
        </main>
      </div>
    </AuthProvider>
  )
}

export default App
