import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, getTransactions } from '../services/api';
import ExpensesByCategoryChart from '../components/ExpensesByCategoryChart';

const StatCard = ({ title, value, colorClass = 'text-gray-800' }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className={`text-3xl font-semibold mt-1 ${colorClass}`}>{value}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const accountsData = await getAccounts();
        const transactionsData = await getTransactions();
        setAccounts(accountsData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };
  
  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
  }, [transactions]);

  const summary = useMemo(() => {
    // Cálculo de Ingresos y Gastos del mes
    const totalIncome = monthlyTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = monthlyTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

    // Cálculo de Saldo Total (más preciso)
    let totalBalance = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
    
    transactions.forEach(tx => {
      if (tx.type === 'income') totalBalance += tx.amount;
      if (tx.type === 'expense') totalBalance -= tx.amount;
      // Las transferencias no afectan el saldo total, ya que el dinero solo se mueve.
    });

    return { totalIncome, totalExpense, totalBalance };
  }, [accounts, transactions, monthlyTransactions]);

  const recentTransactions = useMemo(() => {
    return transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  if (loading) return <p>Cargando datos del dashboard...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {user && <p className="mt-2 mb-6">Bienvenido de nuevo, <span className="font-semibold">{user.email}</span>.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Saldo Total" value={formatCurrency(summary.totalBalance)} />
        <StatCard title="Ingresos (Mes)" value={formatCurrency(summary.totalIncome)} colorClass="text-green-600" />
        <StatCard title="Gastos (Mes)" value={formatCurrency(summary.totalExpense)} colorClass="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Transacciones Recientes</h2>
          <div className="bg-white shadow rounded-lg p-4">
            <ul className="divide-y divide-gray-200">
              {recentTransactions.length > 0 ? recentTransactions.map(tx => (
                <li key={tx.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="text-md font-semibold">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {tx.type === 'transfer' ? `Transferencia` : tx.categories?.name} &middot; {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`text-md font-semibold ${tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-700'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                  </p>
                </li>
              )) : (
                <p>No hay transacciones recientes.</p>
              )}
            </ul>
          </div>
        </div>
        <div>
          <ExpensesByCategoryChart transactions={monthlyTransactions} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
