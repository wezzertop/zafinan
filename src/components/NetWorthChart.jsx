import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const NetWorthChart = ({ data }) => {
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
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month_end" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Line type="monotone" dataKey="assets" name="Activos" stroke="#10B981" strokeWidth={2} />
        <Line type="monotone" dataKey="liabilities" name="Pasivos" stroke="#EF4444" strokeWidth={2} />
        <Line type="monotone" dataKey="net_worth" name="Patrimonio Neto" stroke="#3B82F6" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default NetWorthChart;
