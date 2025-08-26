import { supabase } from '../config/supabaseClient';

// --- SERVICIOS PARA CUENTAS (ACCOUNTS) ---
export const getAccounts = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado.");
  const { data, error } = await supabase.rpc('get_accounts_with_balance');
  if (error) {
    console.error("Error fetching accounts with balance:", error);
    throw error;
  }
  return data;
};
export const createAccount = async (accountData) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado.");
  const { data, error } = await supabase.from('accounts').insert([{ ...accountData, user_id: user.id }]).select().single();
  if (error) throw error;
  return data;
};
export const updateAccount = async (accountId, updatedData) => {
  const { data, error } = await supabase.from('accounts').update(updatedData).eq('id', accountId).select().single();
  if (error) throw error;
  return data;
};
export const deleteAccount = async (accountId) => {
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw error;
};

// --- SERVICIOS PARA CATEGORÍAS (CATEGORIES) ---
export const getCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id);
    if (error) throw error;
    return data;
};
export const createCategory = async (categoryData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.from('categories').insert([{ ...categoryData, user_id: user.id }]).select().single();
    if (error) throw error;
    return data;
};
export const updateCategory = async (categoryId, updatedData) => {
    const { data, error } = await supabase.from('categories').update(updatedData).eq('id', categoryId).select().single();
    if (error) throw error;
    return data;
};
export const deleteCategory = async (categoryId) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
};

// --- SERVICIOS PARA TRANSACCIONES (TRANSACTIONS) ---
export const getTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase
        .from('transactions')
        .select('*, source_account:accounts!transactions_account_id_fkey(*), destination_account:accounts!transactions_destination_account_id_fkey(*), categories(*)')
        .eq('user_id', user.id);
    if (error) throw error;
    return data;
};
export const createTransaction = async (transactionData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const payload = { ...transactionData, user_id: user.id };
    if (payload.type !== 'transfer') payload.destination_account_id = null;
    if (payload.type === 'transfer') payload.category_id = null;
    const { data, error } = await supabase.from('transactions').insert([payload]).select().single();
    if (error) throw error;
    return data;
};
export const updateTransaction = async (transactionId, updatedData) => {
    const payload = { ...updatedData };
    if (payload.type !== 'transfer') payload.destination_account_id = null;
    if (payload.type === 'transfer') payload.category_id = null;
    const { data, error } = await supabase.from('transactions').update(payload).eq('id', transactionId).select().single();
    if (error) throw error;
    return data;
};
export const deleteTransaction = async (transactionId) => {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
};

// --- SERVICIOS PARA COMPRAS A MESES (MONTHLY PURCHASES) ---
export const createMonthlyPurchase = async (purchaseData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data: account, error: accountError } = await supabase.from('accounts').select('statement_cutoff_day, payment_due_day').eq('id', purchaseData.account_id).single();
    if (accountError) throw new Error("No se pudo obtener la información de la tarjeta.");
    const { data: purchase, error: purchaseError } = await supabase.from('monthly_purchases').insert([{ ...purchaseData, user_id: user.id }]).select().single();
    if (purchaseError) { console.error("Error creating purchase record:", purchaseError); throw purchaseError; }
    try {
        const payments = [];
        const monthlyAmount = purchase.total_amount / purchase.installments_count;
        const purchaseDate = new Date(purchase.purchase_date);
        for (let i = 1; i <= purchase.installments_count; i++) {
            let dueDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1);
            let firstPaymentMonthOffset = 1;
            if (purchaseDate.getDate() >= account.statement_cutoff_day) { firstPaymentMonthOffset = 2; }
            dueDate.setMonth(dueDate.getMonth() + i + firstPaymentMonthOffset - 1);
            dueDate.setDate(account.payment_due_day);
            payments.push({
                user_id: user.id, purchase_id: purchase.id, payment_number: i,
                amount: monthlyAmount, due_date: dueDate.toISOString().slice(0, 10), status: 'pending',
            });
        }
        const { error: paymentsError } = await supabase.from('monthly_payments').insert(payments);
        if (paymentsError) throw paymentsError;
        return purchase;
    } catch (error) {
        console.error("Payments creation failed. Rolling back purchase...", error);
        await supabase.from('monthly_purchases').delete().eq('id', purchase.id);
        throw new Error("Error al generar los pagos mensuales. La compra ha sido cancelada.");
    }
};
export const getMonthlyPurchases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.from('monthly_purchases').select('*, monthly_payments(*), accounts(*), categories(*)').eq('user_id', user.id);
    if (error) throw error;
    return data;
};
export const markPaymentAsPaid = async (payment, purchase) => {
    const transaction = await createTransaction({
        description: `${purchase.description} (Pago ${payment.payment_number}/${purchase.installments_count})`,
        amount: payment.amount, date: new Date().toISOString(), type: 'expense',
        account_id: purchase.account_id, category_id: purchase.category_id,
    });
    const { error: updateError } = await supabase.from('monthly_payments').update({ status: 'paid', transaction_id: transaction.id }).eq('id', payment.id);
    if (updateError) throw updateError;
};
export const revertPayment = async (payment) => {
    if (!payment.transaction_id) {
        throw new Error("Pago sin transacción asociada para revertir.");
    }
    const { error: updateError } = await supabase
        .from('monthly_payments')
        .update({ status: 'pending', transaction_id: null })
        .eq('id', payment.id);

    if (updateError) {
        console.error("Error al actualizar el estado del pago:", updateError);
        throw updateError;
    }

    const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', payment.transaction_id);
    
    if (deleteError) {
        console.error("Error al eliminar la transacción:", deleteError);
        throw deleteError;
    }
};
export const updateMonthlyPurchase = async (purchaseId, purchaseData) => {
    const { data, error } = await supabase.from('monthly_purchases').update(purchaseData).eq('id', purchaseId).select().single();
    if (error) throw error;
    return data;
};
export const deleteMonthlyPurchase = async (purchaseId) => {
    const { error } = await supabase.rpc('delete_purchase_and_cleanup', { purchase_id_to_delete: purchaseId });
    if (error) throw error;
};

// --- SERVICIOS PARA PRÉSTAMOS (LOANS) ---
export const getLoans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.from('loans').select('*, loan_payments(*), loan_principal_payments(*)').eq('user_id', user.id);
    if (error) throw error;
    return data;
};
export const createLoan = async (loanData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data: loan, error: loanError } = await supabase.from('loans').insert([{...loanData, user_id: user.id}]).select().single();
    if (loanError) throw loanError;
    try {
        const payments = [];
        const monthlyRate = (loan.interest_rate / 100) / 12;
        const monthlyPayment = (loan.initial_amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loan.term_months));
        let remainingBalance = loan.initial_amount;
        const startDate = new Date(loan.start_date);
        for (let i = 1; i <= loan.term_months; i++) {
            const interest = remainingBalance * monthlyRate;
            const principal = monthlyPayment - interest;
            remainingBalance -= principal;
            const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, loan.payment_day_of_month);
            payments.push({
                user_id: user.id, loan_id: loan.id, payment_number: i,
                due_date: dueDate.toISOString().slice(0, 10),
                payment_amount: monthlyPayment, principal_amount: principal,
                interest_amount: interest, remaining_balance: remainingBalance > 0 ? remainingBalance : 0,
                status: 'pending'
            });
        }
        const { error: paymentsError } = await supabase.from('loan_payments').insert(payments);
        if (paymentsError) throw paymentsError;
        return loan;
    } catch (error) {
        await supabase.from('loans').delete().eq('id', loan.id);
        throw new Error("Error al calcular la amortización. El préstamo ha sido cancelado.");
    }
};
export const payLoanInstallment = async (payment, loan, fromAccountId) => {
    const transaction = await createTransaction({
        description: `${loan.description} (Pago ${payment.payment_number}/${loan.term_months})`,
        amount: payment.payment_amount, date: new Date().toISOString(), type: 'expense',
        account_id: fromAccountId, category_id: null,
    });
    const { error } = await supabase.from('loan_payments').update({ status: 'paid', transaction_id: transaction.id }).eq('id', payment.id);
    if (error) throw error;
};
export const revertLoanPayment = async (payment) => {
    if (!payment.transaction_id) {
        throw new Error("Pago sin transacción asociada para revertir.");
    }
    const { error: updateError } = await supabase
        .from('loan_payments')
        .update({ status: 'pending', transaction_id: null })
        .eq('id', payment.id);

    if (updateError) {
        console.error("Error al actualizar el estado del pago:", updateError);
        throw updateError;
    }

    const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', payment.transaction_id);

    if (deleteError) {
        console.error("Error al eliminar la transacción:", deleteError);
        throw deleteError;
    }
};
export const makePrincipalPayment = async (loan, numPaymentsToAdvance, fromAccountId) => {
    const pendingPayments = loan.loan_payments.filter(p => p.status === 'pending').sort((a,b) => b.payment_number - a.payment_number);
    const paymentsToUpdate = pendingPayments.slice(0, numPaymentsToAdvance);
    if (paymentsToUpdate.length === 0) throw new Error("No hay pagos pendientes para adelantar.");

    const totalAmount = paymentsToUpdate.reduce((sum, p) => sum + p.payment_amount, 0);

    const transaction = await createTransaction({
        description: `Abono a capital para ${loan.description} (${numPaymentsToAdvance} pagos)`,
        amount: totalAmount, date: new Date().toISOString(), type: 'expense',
        account_id: fromAccountId, category_id: null,
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: principalPayment, error: principalPaymentError } = await supabase.from('loan_principal_payments').insert([{
        user_id: user.id, loan_id: loan.id, payment_date: new Date().toISOString(),
        amount: totalAmount, transaction_id: transaction.id, is_applied: false
    }]).select().single();
    if (principalPaymentError) throw principalPaymentError;
};
export const revertPrincipalPayment = async (principalPaymentId) => {
    const { error } = await supabase.rpc('revert_principal_payment_and_cleanup', { p_principal_payment_id: principalPaymentId });
    if (error) throw error;
};
export const updateLoan = async (loanId, loanData) => {
    const { data, error } = await supabase.from('loans').update(loanData).eq('id', loanId).select().single();
    if (error) throw error;
    return data;
};
export const deleteLoan = async (loanId) => {
    const { error } = await supabase.rpc('delete_loan_and_cleanup', { loan_id_to_delete: loanId });
    if (error) throw error;
};
export const recalculateLoan = async (loanId, strategy) => {
    const { error } = await supabase.rpc('recalculate_loan_amortization', {
        p_loan_id: loanId,
        p_recalculation_date: new Date().toISOString().slice(0, 10),
        p_strategy: strategy
    });
    if (error) throw error;
};

// --- SERVICIOS PARA TRANSACCIONES RECURRENTES ---
export const getRecurringTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, account:accounts!recurring_transactions_account_id_fkey(*), category:categories(*), destination_account:accounts!recurring_transactions_destination_account_id_fkey(*)')
        .eq('user_id', user.id);
    if (error) throw error;
    return data;
};
export const createRecurringTransaction = async (recurringData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const payload = { ...recurringData, user_id: user.id, next_due_date: recurringData.start_date };
    const { data, error } = await supabase.from('recurring_transactions').insert([payload]).select().single();
    if (error) throw error;
    return data;
};
export const updateRecurringTransaction = async (id, updatedData) => {
    const { data, error } = await supabase.from('recurring_transactions').update(updatedData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};
export const deleteRecurringTransaction = async (id) => {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
};
export const executeRecurringTransaction = async (recurringTx) => {
    await createTransaction({
        description: recurringTx.description,
        amount: recurringTx.amount,
        date: recurringTx.next_due_date,
        type: recurringTx.type,
        account_id: recurringTx.account_id,
        category_id: recurringTx.category_id,
        destination_account_id: recurringTx.destination_account_id,
    });

    const currentDueDate = new Date(recurringTx.next_due_date + 'T00:00:00');
    const nextDueDate = new Date(currentDueDate);
    switch (recurringTx.frequency) {
        case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
        case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
        case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
        case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
        default: throw new Error('Frecuencia no válida');
    }

    await updateRecurringTransaction(recurringTx.id, {
        next_due_date: nextDueDate.toISOString().slice(0, 10),
    });
};

// --- SERVICIOS PARA REPORTES ---
export const getNetWorthTrendData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.rpc('get_net_worth_trend');
    if (error) {
        console.error("Error fetching net worth trend data:", error);
        throw error;
    }
    return data;
};

export const getCashFlowTrendData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data, error } = await supabase.rpc('get_cash_flow_trend');
    if (error) {
        console.error("Error fetching cash flow trend data:", error);
        throw error;
    }
    return data;
};
