import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const IncomeExpenseChart = ({ transactions }) => {
  const chartData = useMemo(() => {
    const dataByMonth = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const today = new Date();

    // Inicializar los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
      dataByMonth[monthKey] = { month: monthName, ingresos: 0, gastos: 0 };
    }

    // Procesar transacciones
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
      
      if (dataByMonth[monthKey]) {
        if (tx.type === 'income') {
          dataByMonth[monthKey].ingresos += tx.amount;
        } else if (tx.type === 'expense') {
          dataByMonth[monthKey].gastos += tx.amount;
        }
      }
    });

    return Object.values(dataByMonth);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center h-full flex flex-col justify-center">
        <h3 className="text-lg font-bold mb-2">Ingresos vs. Gastos</h3>
        <p className="text-gray-500">No hay transacciones para mostrar en la gráfica.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-center">Ingresos vs. Gastos (Últimos 6 Meses)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
          <Bar dataKey="ingresos" fill="#10B981" name="Ingresos" />
          <Bar dataKey="gastos" fill="#EF4444" name="Gastos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeExpenseChart;
