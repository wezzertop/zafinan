import { supabase } from '../config/supabaseClient';

// --- SERVICIOS PARA CUENTAS (ACCOUNTS) ---
// (El código existente de Cuentas permanece igual)
export const getAccounts = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado.");
  const { data, error } = await supabase.from('accounts').select('*').eq('user_id', user.id);
  if (error) throw error;
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
// (El código existente de Categorías permanece igual)
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

/**
 * Actualiza una transacción existente.
 * @param {string} transactionId - ID de la transacción a actualizar.
 * @param {Object} updatedData - Datos a actualizar.
 * @returns {Promise<Object>}
 */
export const updateTransaction = async (transactionId, updatedData) => {
    const payload = { ...updatedData };
    if (payload.type !== 'transfer') payload.destination_account_id = null;
    if (payload.type === 'transfer') payload.category_id = null;

    const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;
    return data;
};


export const deleteTransaction = async (transactionId) => {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
};
