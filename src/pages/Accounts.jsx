import React, { useState, useEffect } from 'react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/api';
import Modal from '../components/Modal';

const AccountForm = ({ onSubmit, initialData = {}, onCancel }) => {
  const [name, setName] = useState(initialData.name || '');
  const [type, setType] = useState(initialData.type || 'checking');
  const [initial_balance, setInitialBalance] = useState(initialData.initial_balance || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, type, initial_balance: parseFloat(initial_balance) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre de la Cuenta</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Cuenta</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
          <option value="checking">Corriente</option>
          <option value="savings">Ahorros</option>
          <option value="credit_card">Tarjeta de Crédito</option>
          <option value="cash">Efectivo</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Saldo Inicial</label>
        <input
          type="number"
          step="0.01"
          value={initial_balance}
          onChange={(e) => setInitialBalance(e.target.value)}
          required
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button>
      </div>
    </form>
  );
};


const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null); // null para crear, objeto de cuenta para editar
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleFormSubmit = async (accountData) => {
    try {
      if (editingAccount) {
        // Actualizar cuenta
        await updateAccount(editingAccount.id, accountData);
      } else {
        // Crear cuenta
        await createAccount(accountData);
      }
      fetchAccounts(); // Recargar la lista de cuentas
      closeModal();
    } catch (error) {
      console.error("Failed to save account:", error);
    }
  };
  
  const handleDelete = async (accountId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta?')) {
        try {
            await deleteAccount(accountId);
            fetchAccounts();
        } catch (error) {
            console.error("Failed to delete account:", error);
        }
    }
  };

  const openModalToCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openModalToEdit = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  if (loading) return <p>Cargando cuentas...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cuentas</h1>
        <button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Agregar Cuenta
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <ul className="divide-y divide-gray-200">
          {accounts.length > 0 ? accounts.map(account => (
            <li key={account.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">{account.name}</p>
                <p className="text-sm text-gray-500">{account.type}</p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-lg font-mono">${parseFloat(account.initial_balance).toFixed(2)}</p>
                <button onClick={() => openModalToEdit(account)} className="text-blue-500 hover:underline">Editar</button>
                <button onClick={() => handleDelete(account.id)} className="text-red-500 hover:underline">Eliminar</button>
              </div>
            </li>
          )) : (
            <p>No tienes cuentas registradas. ¡Crea la primera!</p>
          )}
        </ul>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}>
        <AccountForm 
            onSubmit={handleFormSubmit}
            initialData={editingAccount || {}}
            onCancel={closeModal}
        />
      </Modal>
    </div>
  );
};

export default Accounts;
