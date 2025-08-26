import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CashFlowChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500">No hay suficientes datos para generar el reporte.</p>
      </div>
    );
  }

  const formatCurrency = (value) => `$${value.toLocaleString()}`;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month_start" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="income" name="Ingresos" fill="#10B981" />
        <Bar dataKey="expense" name="Gastos" fill="#EF4444" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CashFlowChart;
