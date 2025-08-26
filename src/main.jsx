import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Importar páginas y componentes
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Accounts from './pages/Accounts.jsx'
import Categories from './pages/Categories.jsx';
import Transactions from './pages/Transactions.jsx';
import MonthlyPurchases from './pages/MonthlyPurchases.jsx';
import Loans from './pages/Loans.jsx';
import Recurring from './pages/Recurring.jsx';
import Reports from './pages/Reports.jsx'; // <-- 1. Importar la nueva página
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Definir las rutas de la aplicación
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: '/accounts', element: <ProtectedRoute><Accounts /></ProtectedRoute> },
      { path: '/categories', element: <ProtectedRoute><Categories /></ProtectedRoute> },
      { path: '/transactions', element: <ProtectedRoute><Transactions /></ProtectedRoute> },
      { path: '/recurring', element: <ProtectedRoute><Recurring /></ProtectedRoute> },
      { path: '/monthly-purchases', element: <ProtectedRoute><MonthlyPurchases /></ProtectedRoute> },
      { path: '/loans', element: <ProtectedRoute><Loans /></ProtectedRoute> },
      { path: '/reports', element: <ProtectedRoute><Reports /></ProtectedRoute> }, // <-- 2. Agregar la nueva ruta
      { path: '/login', element: <Login /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
