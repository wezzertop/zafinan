import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import Modal from '../components/Modal';

// Componente de Formulario para crear/editar categorías
const CategoryForm = ({ onSubmit, initialData = {}, onCancel }) => {
  const [name, setName] = useState(initialData.name || '');
  const [type, setType] = useState(initialData.type || 'expense');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre de la Categoría</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Categoría</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md">
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Guardar</button>
      </div>
    </form>
  );
};

// Componente Principal de la Página de Categorías
const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleFormSubmit = async (categoryData) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
      } else {
        await createCategory(categoryData);
      }
      fetchCategories();
      closeModal();
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      try {
        await deleteCategory(categoryId);
        fetchCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    }
  };

  const openModalToCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openModalToEdit = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  if (loading) return <p>Cargando categorías...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categorías</h1>
        <button onClick={openModalToCreate} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Agregar Categoría
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <ul className="divide-y divide-gray-200">
          {categories.length > 0 ? categories.map(category => (
            <li key={category.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">{category.name}</p>
                <p className={`text-sm font-medium ${category.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => openModalToEdit(category)} className="text-blue-500 hover:underline">Editar</button>
                <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:underline">Eliminar</button>
              </div>
            </li>
          )) : (
            <p>No tienes categorías registradas.</p>
          )}
        </ul>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}>
        <CategoryForm 
          onSubmit={handleFormSubmit}
          initialData={editingCategory || {}}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
};

export default Categories;
