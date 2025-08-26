import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, getTransactions, getMonthlyPurchases, getLoans } from '../services/api';
import ExpensesByCategoryChart from '../components/ExpensesByCategoryChart';
import IncomeExpenseChart from '../components/IncomeExpenseChart'; // <-- 1. Importar el nuevo gráfico
import { Link } from 'react-router-dom';

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
  const [purchases, setPurchases] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [accountsData, transactionsData, purchasesData, loansData] = await Promise.all([
            getAccounts(), getTransactions(), getMonthlyPurchases(), getLoans()
        ]);
        setAccounts(accountsData);
        setTransactions(transactionsData);
        setPurchases(purchasesData);
        setLoans(loansData);
      } catch (error) { console.error("Failed to fetch dashboard data:", error); } 
      finally { setLoading(false); }
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
    const totalIncome = monthlyTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = monthlyTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    
    const monthlyPurchaseDebt = purchases.reduce((sum, p) => {
        const paidAmount = p.monthly_payments.filter(mp => mp.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
        return sum + (p.total_amount - paidAmount);
    }, 0);
    
    const loanDebt = loans.reduce((sum, l) => {
        const lastPayment = l.loan_payments.sort((a,b) => b.payment_number - a.payment_number)[0];
        return sum + (lastPayment ? lastPayment.remaining_balance : l.initial_amount);
    }, 0);

    const totalDebt = monthlyPurchaseDebt + loanDebt;
    
    // Usamos el `current_balance` que ya viene calculado para las cuentas
    const liquidAssets = accounts.filter(acc => acc.type !== 'credit_card').reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    const netWorth = liquidAssets - totalDebt;

    return { totalIncome, totalExpense, totalDebt, netWorth };
  }, [accounts, transactions, purchases, loans, monthlyTransactions]);

  const recentTransactions = useMemo(() => {
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [transactions]);

  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const monthly = purchases.flatMap(p => p.monthly_payments.map(mp => ({ ...mp, purchase: p }))).filter(mp => mp.status === 'pending');
    const loanInstallments = loans.flatMap(l => l.loan_payments.map(lp => ({ ...lp, loan: l }))).filter(lp => lp.status === 'pending');
    
    const allUpcoming = [...monthly, ...loanInstallments].filter(p => {
        const dueDate = new Date(p.due_date);
        return dueDate >= today && dueDate <= thirtyDaysFromNow;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return allUpcoming;
  }, [purchases, loans]);

  if (loading) return <p>Cargando datos del dashboard...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {user && <p className="mt-2 mb-6">Bienvenido, <span className="font-semibold">{user.email}</span>.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Patrimonio Neto" value={formatCurrency(summary.netWorth)} />
        <StatCard title="Deuda Total" value={formatCurrency(summary.totalDebt)} colorClass="text-orange-600" />
        <StatCard title="Ingresos (Mes)" value={formatCurrency(summary.totalIncome)} colorClass="text-green-600" />
        <StatCard title="Gastos (Mes)" value={formatCurrency(summary.totalExpense)} colorClass="text-red-600" />
      </div>
      
      {/* <-- 2. Nueva sección para los gráficos --> */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <IncomeExpenseChart transactions={transactions} />
        <ExpensesByCategoryChart transactions={monthlyTransactions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2"><h2 className="text-2xl font-bold mb-4">Transacciones Recientes</h2><div className="bg-white shadow rounded-lg p-4"><ul className="divide-y divide-gray-200">{recentTransactions.length > 0 ? recentTransactions.map(tx => (<li key={tx.id} className="py-4 flex justify-between items-center"><div><p className="text-md font-semibold">{tx.description}</p><p className="text-sm text-gray-500">{tx.type === 'transfer' ? `Transferencia` : tx.categories?.name} &middot; {new Date(tx.date).toLocaleDateString()}</p></div><p className={`text-md font-semibold ${tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-700'}`}>{tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}</p></li>)) : (<p>No hay transacciones recientes.</p>)}</ul></div></div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Próximos Pagos (30 días)</h2>
          <div className="bg-white shadow rounded-lg p-4"><ul className="divide-y divide-gray-200">{upcomingPayments.length > 0 ? upcomingPayments.map(payment => {
                const dueDate = new Date(payment.due_date);
                const today = new Date();
                const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const urgencyColor = daysUntilDue <= 7 ? 'text-red-500' : 'text-gray-500';
                const description = payment.purchase ? payment.purchase.description : payment.loan.description;
                const amount = payment.amount || payment.payment_amount;
                return (<li key={payment.id} className="py-3"><div className="flex justify-between items-center"><div><p className="text-md font-semibold">{description}</p><p className="text-sm text-gray-500">Pago #{payment.payment_number}</p></div><p className="text-md font-semibold">{formatCurrency(amount)}</p></div><p className={`text-sm mt-1 ${urgencyColor}`}>Vence en {daysUntilDue} días ({dueDate.toLocaleDateString()})</p></li>);
              }) : (<p>No tienes pagos próximos.</p>)}</ul>
              {(upcomingPayments.length > 0) && <Link to="/monthly-purchases" className="mt-4 inline-block text-blue-600 hover:underline">Ir a mis deudas →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
