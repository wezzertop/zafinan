import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

const ExpensesByCategoryChart = ({ transactions }) => {

  const chartData = useMemo(() => {
    const expenses = transactions.filter(tx => tx.type === 'expense');
    const expensesByCat = expenses.reduce((acc, tx) => {
      const categoryName = tx.categories?.name || 'Sin Categoría';
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += tx.amount;
      return acc;
    }, {});

    return Object.entries(expensesByCat).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h3 className="text-lg font-bold mb-2">Gastos por Categoría</h3>
        <p className="text-gray-500">No hay datos de gastos para mostrar en la gráfica.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-center">Gastos por Categoría (Mes)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpensesByCategoryChart;
