import React, { useState, useEffect } from 'react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/api';
import Modal from '../components/Modal';

const AccountForm = ({ onSubmit, initialData = {}, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    initial_balance: 0,
    last_four_digits: '',
    payment_due_day: 1,
    statement_cutoff_day: 1,
    credit_limit: 0,
  });

  useEffect(() => {
    if (initialData.id) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'checking',
        initial_balance: initialData.initial_balance || 0,
        last_four_digits: initialData.last_four_digits || '',
        payment_due_day: initialData.payment_due_day || 1,
        statement_cutoff_day: initialData.statement_cutoff_day || 1,
        credit_limit: initialData.credit_limit || 0,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
        name: formData.name,
        type: formData.type,
        initial_balance: parseFloat(formData.initial_balance)
    };
    if (formData.type === 'credit_card') {
        dataToSubmit.last_four_digits = formData.last_four_digits;
        dataToSubmit.payment_due_day = formData.payment_due_day;
        dataToSubmit.statement_cutoff_day = formData.statement_cutoff_day;
        dataToSubmit.credit_limit = parseFloat(formData.credit_limit);
        dataToSubmit.initial_balance = 0; // El saldo inicial de una TC es siempre 0
    }
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre de la Cuenta</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Cuenta</label>
        <select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-2 border rounded">
          <option value="checking">Corriente</option>
          <option value="savings">Ahorros</option>
          <option value="credit_card">Tarjeta de Crédito</option>
          <option value="cash">Efectivo</option>
        </select>
      </div>
      
      {formData.type === 'credit_card' ? (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700">Últimos 4 Dígitos</label>
                <input type="text" name="last_four_digits" value={formData.last_four_digits} onChange={handleChange} maxLength="4" className="w-full mt-1 p-2 border rounded"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Límite de Crédito</label>
                <input type="number" step="0.01" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className="w-full mt-1 p-2 border rounded"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Día de Corte</label>
                    <input type="number" name="statement_cutoff_day" value={formData.statement_cutoff_day} onChange={handleChange} min="1" max="31" className="w-full mt-1 p-2 border rounded"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Día Límite de Pago</label>
                    <input type="number" name="payment_due_day" value={formData.payment_due_day} onChange={handleChange} min="1" max="31" className="w-full mt-1 p-2 border rounded"/>
                </div>
            </div>
        </>
      ) : (
        <div>
            <label className="block text-sm font-medium text-gray-700">Saldo Inicial</label>
            <input type="number" step="0.01" name="initial_balance" value={formData.initial_balance} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button>
      </div>
    </form>
  );
};


const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try { setLoading(true); const data = await getAccounts(); setAccounts(data); } 
    catch (error) { console.error("Failed to fetch accounts:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleFormSubmit = async (accountData) => {
    try {
      if (editingAccount) { await updateAccount(editingAccount.id, accountData); } 
      else { await createAccount(accountData); }
      fetchAccounts();
      closeModal();
    } catch (error) { console.error("Failed to save account:", error); }
  };
  
  const handleDelete = async (accountId) => {
    if (window.confirm('¿Estás seguro? Se eliminarán las transacciones asociadas.')) {
        try { await deleteAccount(accountId); fetchAccounts(); } 
        catch (error) { console.error("Failed to delete account:", error); }
    }
  };

  const openModalToCreate = () => { setEditingAccount(null); setIsModalOpen(true); };
  const openModalToEdit = (account) => { setEditingAccount(account); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingAccount(null); };

  if (loading) return <p>Cargando cuentas...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cuentas</h1>
        <button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">+ Agregar Cuenta</button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <ul className="divide-y divide-gray-200">
          {accounts.length > 0 ? accounts.map(account => (
            <li key={account.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">{account.name} {account.type === 'credit_card' && account.last_four_digits && `(**** ${account.last_four_digits})`}</p>
                <p className="text-sm text-gray-500 capitalize">{account.type.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* AJUSTE CLAVE: Mostrar el saldo actual y mejorar la vista de tarjetas de crédito */}
                {account.type === 'credit_card' ? (
                    <div className="text-right">
                        <p className="text-lg font-mono text-red-600">${(account.current_balance || 0).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">de ${account.credit_limit.toFixed(2)}</p>
                    </div>
                ) : (
                    <p className="text-lg font-mono">${(account.current_balance || 0).toFixed(2)}</p>
                )}
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
        <AccountForm onSubmit={handleFormSubmit} initialData={editingAccount || {}} onCancel={closeModal} />
      </Modal>
    </div>
  );
};

export default Accounts;
