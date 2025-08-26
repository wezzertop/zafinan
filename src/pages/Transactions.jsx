import React, { useState, useEffect, useMemo } from 'react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getAccounts, getCategories } from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// Componente de Formulario para Transacciones (sin cambios)
const TransactionForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    account_id: '',
    category_id: '',
    destination_account_id: null,
  });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (initialData.id) {
      setFormData({
        description: initialData.description || '',
        amount: initialData.amount || '',
        date: new Date(initialData.date).toISOString().slice(0, 10),
        type: initialData.type || 'expense',
        account_id: initialData.account_id || '',
        category_id: initialData.category_id || '',
        destination_account_id: initialData.destination_account_id || null,
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      const accountsData = await getAccounts();
      const categoriesData = await getCategories();
      setAccounts(accountsData);
      setCategories(categoriesData);
      if (accountsData.length > 0 && !initialData.id) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }));
      }
    };
    fetchData();
  }, [initialData.id]);
  
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.type === formData.type);
  }, [categories, formData.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, amount: parseFloat(formData.amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label>Tipo</label>
      <select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-2 border rounded">
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
        <option value="transfer">Transferencia</option>
      </select>
      <label>Descripción</label>
      <input name="description" value={formData.description} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/>
      <label>Monto</label>
      <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/>
      <label>Fecha</label>
      <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/>
      <label>{formData.type === 'transfer' ? 'Cuenta de Origen' : 'Cuenta'}</label>
      <select name="account_id" value={formData.account_id} onChange={handleChange} required className="w-full mt-1 p-2 border rounded">
        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
      </select>
      {formData.type === 'transfer' && (
        <div>
          <label>Cuenta de Destino</label>
          <select name="destination_account_id" value={formData.destination_account_id || ''} onChange={handleChange} required className="w-full mt-1 p-2 border rounded">
            <option value="" disabled>Selecciona una cuenta</option>
            {accounts.filter(acc => acc.id !== formData.account_id).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
      )}
      {formData.type !== 'transfer' && (
        <div>
          <label>Categoría</label>
          <select name="category_id" value={formData.category_id} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={filteredCategories.length === 0}>
            {filteredCategories.length > 0 ? filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>) : <option>Crea una categoría de este tipo</option>}
          </select>
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button>
      </div>
    </form>
  );
};

// Componente Principal de la Página de Transacciones
const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ account: 'all', type: 'all', category: 'all' });

  const fetchInitialData = async () => {
    try { 
      setLoading(true); 
      const [transactionsData, accountsData, categoriesData] = await Promise.all([
          getTransactions(),
          getAccounts(),
          getCategories()
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } 
    catch (error) { toast.error("Error al cargar los datos."); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const accountMatch = filters.account === 'all' || tx.account_id === filters.account || tx.destination_account_id === filters.account;
      const typeMatch = filters.type === 'all' || tx.type === filters.type;
      const categoryMatch = filters.category === 'all' || tx.category_id === filters.category;
      return accountMatch && typeMatch && categoryMatch;
    });
  }, [transactions, filters]);

  const handleFormSubmit = async (transactionData) => {
    const promise = editingTransaction
      ? updateTransaction(editingTransaction.id, transactionData)
      : createTransaction(transactionData);

    toast.promise(promise, {
      loading: 'Guardando...',
      success: `Transacción ${editingTransaction ? 'actualizada' : 'creada'} con éxito.`,
      error: `Error al ${editingTransaction ? 'actualizar' : 'crear'} la transacción.`,
    });

    try {
      await promise;
      fetchInitialData(); // Recargar todos los datos
      closeModal();
    } catch (error) {}
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      const promise = deleteTransaction(transactionId);
      toast.promise(promise, {
        loading: 'Eliminando...',
        success: 'Transacción eliminada.',
        error: 'Error al eliminar la transacción.',
      });
      try { await promise; fetchInitialData(); } catch (error) {}
    }
  };

  const openModalToCreate = () => { setEditingTransaction(null); setIsModalOpen(true); };
  const openModalToEdit = (tx) => { setEditingTransaction(tx); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingTransaction(null); };

  if (loading) return <p>Cargando transacciones...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transacciones</h1>
        <button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Agregar Transacción
        </button>
      </div>

      {/* SECCIÓN DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700">Cuenta</label>
          <select name="account" value={filters.account} onChange={handleFilterChange} className="w-full mt-1 p-2 border rounded">
            <option value="all">Todas</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700">Tipo</label>
          <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full mt-1 p-2 border rounded">
            <option value="all">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700">Categoría</label>
          <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full mt-1 p-2 border rounded">
            <option value="all">Todas</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tx.type === 'transfer' 
                    ? `De: ${tx.source_account?.name} a ${tx.destination_account?.name}`
                    : `${tx.categories?.name} (${tx.source_account?.name})`
                  }
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${ tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-700' }`}>
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${parseFloat(tx.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => openModalToEdit(tx)} className="text-blue-600 hover:text-blue-900">Editar</button>
                  <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center py-10">No hay transacciones que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}>
        <TransactionForm 
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          initialData={editingTransaction || {}}
        />
      </Modal>
    </div>
  );
};

export default Transactions;
