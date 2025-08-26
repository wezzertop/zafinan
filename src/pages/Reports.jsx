import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getNetWorthTrendData, getCashFlowTrendData } from '../services/api'; // 1. Importar la nueva función
import NetWorthChart from '../components/NetWorthChart';
import CashFlowChart from '../components/CashFlowChart'; // 2. Importar el nuevo gráfico

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [netWorthData, setNetWorthData] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]); // 3. Añadir estado para los nuevos datos

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 4. Pedir los datos para ambos reportes en paralelo
        const [netWorthTrend, cashFlowTrend] = await Promise.all([
          getNetWorthTrendData(),
          getCashFlowTrendData()
        ]);
        setNetWorthData(netWorthTrend);
        setCashFlowData(cashFlowTrend);
      } catch (error) {
        toast.error("Error al cargar los datos para los reportes.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p>Generando reportes...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reportes Financieros</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Evolución de Patrimonio Neto (Últimos 12 Meses)</h2>
          <NetWorthChart data={netWorthData} />
        </div>

        {/* 5. Reemplazar el marcador de posición con el gráfico real */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Flujo de Efectivo Mensual (Últimos 12 Meses)</h2>
          <CashFlowChart data={cashFlowData} />
        </div>
      </div>
    </div>
  );
};

export default Reports;
