import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Si no hay usuario, redirigir a la página de login
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
