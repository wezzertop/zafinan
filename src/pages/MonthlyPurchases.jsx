import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createMonthlyPurchase, getMonthlyPurchases, getAccounts, getCategories, markPaymentAsPaid, revertPayment, updateMonthlyPurchase, deleteMonthlyPurchase } from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

// Componente de Formulario (sin cambios)
const MonthlyPurchaseForm = ({ onSubmit, onCancel, initialData = {} }) => {
    const [formData, setFormData] = useState({
        description: '', total_amount: '', installments_count: 3,
        purchase_date: new Date().toISOString().slice(0, 10),
        account_id: '', category_id: '',
    });
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const isEditing = !!initialData.id;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                description: initialData.description || '',
                total_amount: initialData.total_amount || '',
                installments_count: initialData.installments_count || 3,
                purchase_date: new Date(initialData.purchase_date).toISOString().slice(0, 10),
                account_id: initialData.account_id || '',
                category_id: initialData.category_id || '',
            });
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        const fetchData = async () => {
            const accountsData = await getAccounts();
            const categoriesData = await getCategories();
            const creditCardAccounts = accountsData.filter(acc => acc.type === 'credit_card');
            setAccounts(creditCardAccounts);
            setCategories(categoriesData.filter(cat => cat.type === 'expense'));
            if (creditCardAccounts.length > 0 && !isEditing) {
                setFormData(prev => ({...prev, account_id: creditCardAccounts[0].id}));
            }
        };
        fetchData();
    }, [isEditing]);

    useEffect(() => {
        if (categories.length > 0 && !isEditing) {
            setFormData(prev => ({ ...prev, category_id: categories[0].id }));
        }
    }, [categories, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            total_amount: parseFloat(formData.total_amount),
            installments_count: parseInt(formData.installments_count, 10)
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Al crear, las fechas de pago se calcularán según la configuración de tu tarjeta. Al editar, solo se actualizará la información general.</p>
            <div><label>Descripción</label><input name="description" value={formData.description} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label>Monto Total</label><input type="number" step="0.01" name="total_amount" value={formData.total_amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
                <div><label>Número de Meses</label><input type="number" name="installments_count" value={formData.installments_count} onChange={handleChange} required min="1" className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
            </div>
            <div><label>Fecha de Compra</label><input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
            <div><label>Tarjeta de Crédito</label><select name="account_id" value={formData.account_id} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}><option value="" disabled>Selecciona una tarjeta</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label>Categoría</label><select name="category_id" value={formData.category_id} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"><option value="" disabled>Selecciona una categoría</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            <div className="flex justify-end space-x-2"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button><button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button></div>
        </form>
    );
};

// Componente para mostrar una compra individual
const PurchaseItem = ({ purchase, onDataRefresh, onEdit }) => {
    const summary = useMemo(() => {
        const paidCount = purchase.monthly_payments.filter(p => p.status === 'paid').length;
        const paidAmount = purchase.monthly_payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = purchase.total_amount - paidAmount;
        const isOverdue = purchase.monthly_payments.some(p => p.status === 'pending' && new Date(p.due_date) < new Date());
        const progressPercentage = (paidAmount / purchase.total_amount) * 100;
        return { paidCount, paidAmount, remainingAmount, isOverdue, progressPercentage };
    }, [purchase]);

    const upcomingDueDate = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futurePendingPayments = purchase.monthly_payments.filter(p => p.status === 'pending' && new Date(p.due_date) >= today).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        return futurePendingPayments.length > 0 ? new Date(futurePendingPayments[0].due_date) : null;
    }, [purchase.monthly_payments]);

    const getPaymentStatusBadge = (payment) => {
        if (payment.status === 'paid') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">Pagado</span>;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dueDate = new Date(payment.due_date);
        if (dueDate < today) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">Vencido</span>;
        if (upcomingDueDate && dueDate.getTime() === upcomingDueDate.getTime()) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">Pagar en este corte</span>;
        return null;
    };

    const handlePayInstallment = async (payment) => {
        if (window.confirm(`¿Confirmas el pago de $${payment.amount.toFixed(2)}?`)) {
            toast.promise(markPaymentAsPaid(payment, purchase), { loading: 'Procesando...', success: 'Pago registrado.', error: 'Error al registrar.' }).then(() => onDataRefresh());
        }
    };
    
    const handleRevertPayment = async (payment) => {
        if (window.confirm(`¿Revertir el pago de $${payment.amount.toFixed(2)}?`)) {
            // AJUSTE CLAVE: Llamar a la función `revertPayment` que ahora tiene la lógica correcta.
            toast.promise(revertPayment(payment), { loading: 'Revertiendo...', success: 'Pago revertido.', error: 'Error al revertir.' }).then(() => onDataRefresh());
        }
    };
    
    const handleDeletePurchase = async () => {
        if (window.confirm(`¿Eliminar "${purchase.description}"?`)) {
            toast.promise(deleteMonthlyPurchase(purchase.id), { loading: 'Eliminando...', success: 'Compra eliminada.', error: 'Error al eliminar.' }).then(() => onDataRefresh());
        }
    };

    return (
        <details className="bg-white shadow rounded-lg p-4 open:ring-blue-500 group">
            <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <div>
                    <span>{purchase.description} - ${purchase.total_amount}</span>
                    <div className="text-sm font-normal text-gray-500 mt-1 flex items-center gap-4 flex-wrap">
                        <span>Pagado: {summary.paidCount}/{purchase.installments_count} (${summary.paidAmount.toFixed(2)})</span>
                        <span>Restante: ${summary.remainingAmount.toFixed(2)}</span>
                        {summary.isOverdue && <span className="text-red-500 font-bold">¡Pagos Vencidos!</span>}
                    </div>
                </div>
                <div className="text-gray-500 group-open:rotate-90 transform transition-transform">▶</div>
            </summary>
            <div className="mt-4">
                {/* **BARRA DE PROGRESO** */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${summary.progressPercentage}%` }}></div>
                </div>
                <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-600">Tarjeta: {purchase.accounts?.name} {purchase.accounts?.last_four_digits && `(**** ${purchase.accounts.last_four_digits})`} | Categoría: {purchase.categories?.name}</p>
                    <div className="flex gap-2"><button onClick={() => onEdit(purchase)} className="text-xs text-blue-600 hover:underline">Editar</button><button onClick={handleDeletePurchase} className="text-xs text-red-600 hover:underline">Eliminar</button></div>
                </div>
                {purchase.accounts && (<div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md"><span>Límite: ${purchase.accounts.credit_limit} | </span><span>Corte: Día {purchase.accounts.statement_cutoff_day} | </span><span>Pago: Día {purchase.accounts.payment_due_day}</span></div>)}
                <h4 className="font-bold mt-3 mb-1">Pagos:</h4>
                <ul className="divide-y divide-gray-200">
                    {purchase.monthly_payments.sort((a,b) => a.payment_number - b.payment_number).map(payment => (
                        <li key={payment.id} className="py-2 flex justify-between items-center">
                            <div><span>Pago {payment.payment_number} - Vence: {new Date(payment.due_date).toLocaleDateString()}</span><span className="text-gray-500 text-sm"> (${payment.amount.toFixed(2)})</span></div>
                            <div className="flex items-center gap-2">
                                {getPaymentStatusBadge(payment)}
                                {payment.status === 'pending' && <button onClick={() => handlePayInstallment(payment)} className="px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700">Pagar</button>}
                                {payment.status === 'paid' && <button onClick={() => handleRevertPayment(payment)} className="text-xs text-blue-600 hover:underline">Revertir</button>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </details>
    );
};

// Componente Principal de la Página
const MonthlyPurchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [hasCreditCards, setHasCreditCards] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try { setLoading(true); const [purchasesData, accountsData] = await Promise.all([getMonthlyPurchases(), getAccounts()]); setPurchases(purchasesData); setHasCreditCards(accountsData.some(acc => acc.type === 'credit_card')); } 
        catch (error) { toast.error("Error al cargar los datos."); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleFormSubmit = async (purchaseData) => {
        const promise = editingPurchase 
            ? updateMonthlyPurchase(editingPurchase.id, { description: purchaseData.description, category_id: purchaseData.category_id })
            : createMonthlyPurchase(purchaseData);
        
        toast.promise(promise, { loading: 'Guardando...', success: 'Compra guardada.', error: 'Error al guardar.' })
            .then(() => { fetchData(); closeModal(); });
    };
    
    const openModalToCreate = () => { setEditingPurchase(null); setIsModalOpen(true); };
    const openModalToEdit = (purchase) => { setEditingPurchase(purchase); setIsModalOpen(true); };
    const closeModal = () => { setEditingPurchase(null); setIsModalOpen(false); };

    if (loading) return <p>Cargando datos...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Compras a Meses</h1>
                {hasCreditCards && (<button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">+ Agregar Compra</button>)}
            </div>

            {!hasCreditCards ? (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
                    <p className="font-bold">No tienes tarjetas de crédito</p>
                    <p>Para usar esta función, primero necesitas agregar una cuenta de tipo "Tarjeta de Crédito" en la sección de Cuentas.</p>
                    <Link to="/accounts" className="mt-2 inline-block bg-yellow-500 text-white font-bold py-2 px-4 rounded hover:bg-yellow-600">Agregar Cuenta</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {purchases.length > 0 ? purchases.map(purchase => (
                        <PurchaseItem key={purchase.id} purchase={purchase} onDataRefresh={fetchData} onEdit={openModalToEdit} />
                    )) : (
                        <p>No hay compras a meses registradas.</p>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPurchase ? 'Editar Compra' : 'Registrar Compra a Meses'}>
                <MonthlyPurchaseForm onSubmit={handleFormSubmit} onCancel={closeModal} initialData={editingPurchase || {}} />
            </Modal>
        </div>
    );
};

export default MonthlyPurchases;
