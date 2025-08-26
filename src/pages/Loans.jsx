import React, { useState, useEffect, useMemo } from 'react';
import { getLoans, createLoan, payLoanInstallment, revertLoanPayment, makePrincipalPayment, revertPrincipalPayment, updateLoan, deleteLoan, recalculateLoan, getAccounts } from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LoanForm = ({ onSubmit, onCancel, initialData = {} }) => {
    const [formData, setFormData] = useState({
        description: '', initial_amount: '', term_months: 12, interest_rate: '',
        start_date: new Date().toISOString().slice(0, 10), issuing_institution: '', late_fee: 0, payment_day_of_month: 15
    });
    const isEditing = !!initialData.id;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                description: initialData.description || '', initial_amount: initialData.initial_amount || '',
                term_months: initialData.term_months || 12, interest_rate: initialData.interest_rate || '',
                start_date: new Date(initialData.start_date).toISOString().slice(0, 10),
                issuing_institution: initialData.issuing_institution || '', late_fee: initialData.late_fee || 0,
                payment_day_of_month: initialData.payment_day_of_month || 15
            });
        }
    }, [initialData, isEditing]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            initial_amount: parseFloat(formData.initial_amount), term_months: parseInt(formData.term_months, 10),
            interest_rate: parseFloat(formData.interest_rate), late_fee: parseFloat(formData.late_fee),
            payment_day_of_month: parseInt(formData.payment_day_of_month, 10)
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Al editar, solo se actualizará la información general. Los montos y plazos no se pueden cambiar.</p>
            <div><label>Descripción</label><input name="description" value={formData.description} onChange={handleChange} required className="w-full mt-1 p-2 border rounded"/></div>
            <div><label>Institución</label><input name="issuing_institution" value={formData.issuing_institution} onChange={handleChange} className="w-full mt-1 p-2 border rounded"/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label>Monto del Préstamo</label><input type="number" step="0.01" name="initial_amount" value={formData.initial_amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
                <div><label>Tasa de Interés Anual (%)</label><input type="number" step="0.01" name="interest_rate" value={formData.interest_rate} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label>Plazo (meses)</label><input type="number" name="term_months" value={formData.term_months} onChange={handleChange} required min="1" className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
                <div><label>Fecha de Inicio</label><input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label>Día de Pago (1-28)</label><input type="number" name="payment_day_of_month" value={formData.payment_day_of_month} onChange={handleChange} required min="1" max="28" className="w-full mt-1 p-2 border rounded" disabled={isEditing}/></div>
                <div><label>Comisión por Atraso ($)</label><input type="number" step="0.01" name="late_fee" value={formData.late_fee} onChange={handleChange} className="w-full mt-1 p-2 border rounded"/></div>
            </div>
            <div className="flex justify-end space-x-2"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button><button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button></div>
        </form>
    );
};

const PaymentModal = ({ isOpen, onClose, onConfirm, accounts, title, children }) => {
    const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                {children}
                <div><label className="block text-sm font-medium text-gray-700">Pagar desde la cuenta:</label><select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full mt-1 p-2 border rounded">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                <div className="flex justify-end space-x-2"><button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button><button onClick={() => onConfirm(selectedAccount)} className="px-4 py-2 text-white bg-blue-600 rounded-md">Confirmar</button></div>
            </div>
        </Modal>
    );
};

const PrincipalPaymentModal = ({ isOpen, onClose, onConfirm, accounts, loan }) => {
    const [numPayments, setNumPayments] = useState(1);
    const pendingPayments = loan.loan_payments.filter(p => p.status === 'pending').sort((a,b) => b.payment_number - a.payment_number);
    const totalAmount = pendingPayments.slice(0, numPayments).reduce((sum, p) => sum + p.payment_amount, 0);

    return (
        <PaymentModal isOpen={isOpen} onClose={onClose} onConfirm={(accountId) => onConfirm(numPayments, accountId)} accounts={accounts} title="Abonar a Capital">
             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md"><p className="font-bold">Importante</p><p>Este pago cubrirá los últimos pagos pendientes de tu deuda. No reemplaza tu próxima mensualidad.</p></div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Adelantar pagos:</label>
                <select value={numPayments} onChange={(e) => setNumPayments(parseInt(e.target.value, 10))} className="w-full mt-1 p-2 border rounded">
                    {pendingPayments.map((p, index) => <option key={p.id} value={index + 1}>{index + 1} pago(s)</option>)}
                </select>
                <p className="text-center font-bold text-xl mt-2">Total a Pagar: ${totalAmount.toFixed(2)}</p>
            </div>
        </PaymentModal>
    );
};

const RecalculateModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Recalcular Amortización">
            <div className="space-y-4">
                <p>Has realizado abonos a capital. ¿Cómo deseas aplicar este pago para recalcular tu deuda?</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => onConfirm('reduce_term')} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md">Reducir Plazo</button>
                    <button onClick={() => onConfirm('reduce_payment')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md">Reducir Pago Mensual</button>
                </div>
            </div>
        </Modal>
    );
};

const LoanChart = ({ loan }) => {
    const chartData = useMemo(() => {
        const totalInterest = loan.loan_payments.reduce((sum, p) => sum + p.interest_amount, 0);
        return [{ name: 'Capital', value: loan.initial_amount }, { name: 'Intereses', value: parseFloat(totalInterest.toFixed(2)) }];
    }, [loan]);
    const COLORS = ['#0088FE', '#FF8042'];
    return (
        <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `$${value.toFixed(2)}`} /><Legend /></PieChart></ResponsiveContainer></div>
    );
};

const Loans = () => {
    const [loans, setLoans] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [modalState, setModalState] = useState({ type: null, data: null });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try { setLoading(true); const [loansData, accountsData] = await Promise.all([getLoans(), getAccounts()]); setLoans(loansData); setAccounts(accountsData.filter(acc => acc.type !== 'credit_card')); } 
        catch (error) { toast.error("Error al cargar datos."); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const summary = useMemo(() => {
        let totalDebt = 0, totalPrincipalPaid = 0, totalInterestPaid = 0;
        loans.forEach(loan => {
            const lastPayment = loan.loan_payments.sort((a,b) => b.payment_number - a.payment_number)[0];
            totalDebt += lastPayment ? lastPayment.remaining_balance : loan.initial_amount;
            totalPrincipalPaid += loan.loan_payments.filter(p => p.status === 'paid' && p.transaction_id).reduce((sum, p) => sum + p.principal_amount, 0);
            totalInterestPaid += loan.loan_payments.filter(p => p.status === 'paid' && p.transaction_id).reduce((sum, p) => sum + p.interest_amount, 0);
        });
        return { totalDebt, totalPrincipalPaid, totalInterestPaid };
    }, [loans]);

    const openModal = (type, data = null) => setModalState({ type, data });
    const closeModal = () => setModalState({ type: null, data: null });

    const handleFormSubmit = (loanData) => {
        const promise = modalState.type === 'editLoan'
            ? updateLoan(modalState.data.id, { description: loanData.description, issuing_institution: loanData.issuing_institution, late_fee: loanData.late_fee })
            : createLoan(loanData);
        toast.promise(promise, { loading: 'Guardando...', success: 'Préstamo guardado.', error: 'Error al guardar.' }).then(() => { fetchData(); closeModal(); });
    };

    const handleConfirmPayment = (fromAccountId) => {
        const { payment, loan } = modalState.data;
        toast.promise(payLoanInstallment(payment, loan, fromAccountId), { loading: 'Procesando...', success: 'Pago registrado.', error: 'Error.' }).then(() => { fetchData(); closeModal(); });
    };

    const handleConfirmPrincipalPayment = (numPayments, fromAccountId) => {
        const { loan } = modalState.data;
        toast.promise(makePrincipalPayment(loan, numPayments, fromAccountId), { loading: 'Abonando...', success: 'Abono registrado.', error: 'Error.' }).then(() => { fetchData(); closeModal(); });
    };
    
    const handleRecalculate = (strategy) => {
        const { loan } = modalState.data;
        toast.promise(recalculateLoan(loan.id, strategy), { loading: 'Recalculando...', success: 'Préstamo recalculado.', error: 'Error.' }).then(() => { fetchData(); closeModal(); });
    };

    const handleRevertPayment = (payment) => {
        if(window.confirm("¿Revertir este pago?")) toast.promise(revertLoanPayment(payment), { loading: 'Revertiendo...', success: 'Pago revertido.', error: 'Error.' }).then(fetchData);
    };

    const handleRevertPrincipalPayment = (principalPaymentId) => {
        if(window.confirm("¿Revertir este abono a capital?")) toast.promise(revertPrincipalPayment(principalPaymentId), { loading: 'Revertiendo...', success: 'Abono revertido.', error: 'Error.' }).then(fetchData);
    };
    
    const handleDeleteLoan = (loan) => {
        if(window.confirm(`¿Eliminar "${loan.description}"?`)) toast.promise(deleteLoan(loan.id), { loading: 'Eliminando...', success: 'Préstamo eliminado.', error: 'Error.' }).then(fetchData);
    };

    if (loading) return <p>Cargando préstamos...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold">Préstamos</h1><button onClick={() => openModal('newLoan')} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">+ Agregar Préstamo</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Deuda Total Actual</h3><p className="text-2xl font-semibold text-orange-600">${summary.totalDebt.toFixed(2)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Total Capital Pagado</h3><p className="text-2xl font-semibold text-green-600">${summary.totalPrincipalPaid.toFixed(2)}</p></div>
                <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Total Intereses Pagados</h3><p className="text-2xl font-semibold text-red-600">${summary.totalInterestPaid.toFixed(2)}</p></div>
            </div>
            <div className="space-y-6">
                {loans.length > 0 ? loans.map(loan => {
                    const nextPendingPayment = loan.loan_payments.filter(p => p.status === 'pending').sort((a,b) => a.payment_number - b.payment_number)[0];
                    const totalPrincipalPaid = loan.loan_payments.filter(p => p.status === 'paid' && p.transaction_id).reduce((sum, p) => sum + p.principal_amount, 0);
                    const totalExtraPaid = loan.loan_principal_payments?.filter(p => p.is_applied).reduce((sum, p) => sum + p.amount, 0) || 0;
                    const progress = ((totalPrincipalPaid + totalExtraPaid) / loan.initial_amount) * 100;
                    const hasUnappliedPrincipalPayments = loan.loan_principal_payments?.some(p => !p.is_applied);

                    return (
                        <details key={loan.id} className="bg-white shadow rounded-lg p-4 group">
                            <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                                <span>{loan.description} - ${loan.initial_amount}</span>
                                <div className="flex items-center gap-4">
                                    {hasUnappliedPrincipalPayments && <button onClick={(e) => { e.preventDefault(); openModal('recalculate', { loan }); }} className="text-sm px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700">Recalcular Deuda</button>}
                                    <button onClick={(e) => { e.preventDefault(); openModal('principalPayment', { loan }); }} className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">Abonar a Capital</button>
                                    <button onClick={(e) => { e.preventDefault(); openModal('editLoan', loan); }} className="text-xs text-blue-600 hover:underline">Editar</button>
                                    <button onClick={(e) => { e.preventDefault(); handleDeleteLoan(loan); }} className="text-xs text-red-600 hover:underline">Eliminar</button>
                                    <div className="text-gray-500 group-open:rotate-90 transform transition-transform">▶</div>
                                </div>
                            </summary>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 overflow-x-auto">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 my-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                                    <p className="text-sm text-gray-600 mb-2">Institución: {loan.issuing_institution || 'N/A'} | Día de Pago: {loan.payment_day_of_month} de cada mes | Comisión por atraso: ${loan.late_fee.toFixed(2)}</p>
                                    {loan.loan_principal_payments && loan.loan_principal_payments.length > 0 && <div className="my-2"><h4 className="font-bold text-sm">Abonos a Capital</h4><ul className="text-sm divide-y">{loan.loan_principal_payments.map(p => <li key={p.id} className="py-1 flex justify-between"><span>{new Date(p.payment_date).toLocaleDateString()}: ${p.amount.toFixed(2)}</span><button onClick={() => handleRevertPrincipalPayment(p.id)} className="text-xs text-blue-600 hover:underline">Revertir</button></li>)}</ul></div>}
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50"><tr>{['#', 'Vencimiento', 'Pago Total', 'Capital', 'Interés', 'Saldo Restante', 'Estado'].map(h => <th key={h} className="px-4 py-2 text-left font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loan.loan_payments.sort((a,b) => a.payment_number - b.payment_number).map(p => {
                                                // AJUSTE CLAVE: La condición para "Cubierto por Abono" ahora es más estricta.
                                                // Solo se considera cubierto si el estado es 'paid' Y NO tiene una transacción asociada.
                                                const isCoveredByPrincipal = p.status === 'paid' && !p.transaction_id;
                                                return (
                                                    <tr key={p.id} className={isCoveredByPrincipal ? 'bg-purple-50' : ''}>
                                                        <td className="px-4 py-2">{p.payment_number}</td><td className="px-4 py-2">{new Date(p.due_date).toLocaleDateString()}</td><td className="px-4 py-2">${p.payment_amount.toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-green-600">${p.principal_amount.toFixed(2)}</td><td className="px-4 py-2 text-red-600">${p.interest_amount.toFixed(2)}</td><td className="px-4 py-2 font-bold">${p.remaining_balance.toFixed(2)}</td>
                                                        <td className="px-4 py-2">
                                                            {p.status === 'paid' && p.transaction_id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-green-600">Pagado</span>
                                                                    <button onClick={() => handleRevertPayment(p)} className="text-xs text-blue-600 hover:underline">Revertir</button>
                                                                </div>
                                                            ) : isCoveredByPrincipal ? (
                                                                <span className="text-purple-600">Cubierto por Abono</span>
                                                            ) : (
                                                                <button onClick={() => openModal('installment', { payment: p, loan })} disabled={p.id !== nextPendingPayment?.id} className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline">Pagar</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="md:col-span-1"><LoanChart loan={loan} /></div>
                            </div>
                        </details>
                    );
                }) : <p>No hay préstamos registrados.</p>}
            </div>
            {(modalState.type === 'newLoan' || modalState.type === 'editLoan') && <Modal isOpen={true} onClose={closeModal} title={modalState.type === 'editLoan' ? 'Editar Préstamo' : 'Registrar Nuevo Préstamo'}><LoanForm onSubmit={handleFormSubmit} onCancel={closeModal} initialData={modalState.data || {}} /></Modal>}
            {modalState.type === 'installment' && <PaymentModal isOpen={true} onClose={closeModal} onConfirm={handleConfirmPayment} accounts={accounts} title="Confirmar Pago Mensual"><p>Vas a registrar un pago de <span className="font-bold">${modalState.data.payment.payment_amount.toFixed(2)}</span>.</p></PaymentModal>}
            {modalState.type === 'principalPayment' && <PrincipalPaymentModal isOpen={true} onClose={closeModal} onConfirm={handleConfirmPrincipalPayment} accounts={accounts} loan={modalState.data.loan} />}
            {modalState.type === 'recalculate' && <RecalculateModal isOpen={true} onClose={closeModal} onConfirm={handleRecalculate} />}
        </div>
    );
};

export default Loans;
