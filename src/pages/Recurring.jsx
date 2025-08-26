import React, { useState, useEffect, useMemo } from 'react';
import { getRecurringTransactions, createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, executeRecurringTransaction, getAccounts, getCategories } from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// Formulario para crear/editar transacciones recurrentes
const RecurringForm = ({ onSubmit, onCancel, initialData = {} }) => {
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'expense',
        frequency: 'monthly',
        start_date: new Date().toISOString().slice(0, 10),
        account_id: '',
        category_id: '', // Se inicializa vacío
        destination_account_id: null,
    });
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (initialData.id) {
            setFormData({
                description: initialData.description || '',
                amount: initialData.amount || '',
                type: initialData.type || 'expense',
                frequency: initialData.frequency || 'monthly',
                start_date: new Date(initialData.start_date).toISOString().slice(0, 10),
                account_id: initialData.account_id || '',
                category_id: initialData.category_id || '',
                destination_account_id: initialData.destination_account_id || null,
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchData = async () => {
            const [accountsData, categoriesData] = await Promise.all([getAccounts(), getCategories()]);
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

    // AJUSTE CLAVE: Asegurar que siempre haya una categoría seleccionada por defecto.
    useEffect(() => {
        if (!initialData.id && filteredCategories.length > 0) {
            // Si es un formulario nuevo y ya hay categorías filtradas,
            // y si la categoría actual no es válida, selecciona la primera.
            const currentCategoryIsValid = filteredCategories.some(c => c.id === formData.category_id);
            if (!currentCategoryIsValid) {
                setFormData(prev => ({ ...prev, category_id: filteredCategories[0].id }));
            }
        }
    }, [filteredCategories, initialData.id, formData.category_id]);


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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label>Tipo</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-2 border rounded">
                        <option value="expense">Gasto</option>
                        <option value="income">Ingreso</option>
                        <option value="transfer">Transferencia</option>
                    </select>
                </div>
                <div>
                    <label>Frecuencia</label>
                    <select name="frequency" value={formData.frequency} onChange={handleChange} className="w-full mt-1 p-2 border rounded">
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                    </select>
                </div>
            </div>
            <div>
                <label>Descripción</label>
                <input name="description" value={formData.description} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label>Monto</label>
                    <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label>Fecha de Inicio</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" />
                </div>
            </div>
            <div>
                <label>{formData.type === 'transfer' ? 'Cuenta de Origen' : 'Cuenta'}</label>
                <select name="account_id" value={formData.account_id} onChange={handleChange} required className="w-full mt-1 p-2 border rounded">
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
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


// Componente principal de la página
const Recurring = () => {
    const [recurringTxs, setRecurringTxs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getRecurringTransactions();
            setRecurringTxs(data);
        } catch (error) {
            toast.error("Error al cargar las transacciones recurrentes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const { pending, upcoming } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sortedTxs = [...recurringTxs].sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));
        return sortedTxs.reduce((acc, tx) => {
            const dueDate = new Date(tx.next_due_date + 'T00:00:00');
            if (dueDate <= today) {
                acc.pending.push(tx);
            } else {
                acc.upcoming.push(tx);
            }
            return acc;
        }, { pending: [], upcoming: [] });
    }, [recurringTxs]);

    const handleFormSubmit = async (data) => {
        const promise = editingTx
            ? updateRecurringTransaction(editingTx.id, data)
            : createRecurringTransaction(data);

        toast.promise(promise, {
            loading: 'Guardando...',
            success: 'Transacción recurrente guardada.',
            error: 'Error al guardar.',
        }).then(() => {
            fetchData();
            closeModal();
        });
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta transacción recurrente?')) {
            toast.promise(deleteRecurringTransaction(id), {
                loading: 'Eliminando...',
                success: 'Eliminada con éxito.',
                error: 'Error al eliminar.',
            }).then(fetchData);
        }
    };

    const handleExecute = (tx) => {
        toast.promise(executeRecurringTransaction(tx), {
            loading: 'Registrando transacción...',
            success: 'Transacción registrada con éxito.',
            error: 'Error al registrar la transacción.',
        }).then(fetchData);
    };

    const openModalToCreate = () => { setEditingTx(null); setIsModalOpen(true); };
    const openModalToEdit = (tx) => { setEditingTx(tx); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingTx(null); };

    if (loading) return <p>Cargando...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Transacciones Recurrentes</h1>
                <button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    + Agregar Recurrente
                </button>
            </div>

            {/* SECCIÓN DE PENDIENTES */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Pendientes de Registrar</h2>
                <div className="bg-white shadow rounded-lg p-4">
                    {pending.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {pending.map(tx => (
                                <li key={tx.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{tx.description}</p>
                                        <p className="text-sm text-gray-500">
                                            Próximo: {new Date(tx.next_due_date + 'T00:00:00').toLocaleDateString()} - ${tx.amount}
                                        </p>
                                    </div>
                                    <button onClick={() => handleExecute(tx)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                                        Registrar Ahora
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No hay transacciones pendientes.</p>}
                </div>
            </div>

            {/* SECCIÓN DE PRÓXIMAS */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Todas las Transacciones Programadas</h2>
                <div className="bg-white shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Vencimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {upcoming.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(tx.next_due_date + 'T00:00:00').toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.frequency}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => openModalToEdit(tx)} className="text-blue-600 hover:text-blue-900">Editar</button>
                                        <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTx ? 'Editar Transacción Recurrente' : 'Nueva Transacción Recurrente'}>
                <RecurringForm
                    onSubmit={handleFormSubmit}
                    onCancel={closeModal}
                    initialData={editingTx || {}}
                />
            </Modal>
        </div>
    );
};

export default Recurring;
