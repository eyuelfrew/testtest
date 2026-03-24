import { useState, useEffect } from 'react';
import FormManagementPage from './FormManagementPage';
import CategoryModal from './CategoryModal';

const API_BASE = 'http://localhost:3000/api';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showFormBuilder, setShowFormBuilder] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/categories`);
            const data = await response.json();
            if (data.status === 'ok') {
                setCategories(data.data.categories);
            }
        } catch (error) {
            showMessage('Failed to load categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAddCategory = () => {
        setEditingCategory(null);
        setShowCategoryModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setShowCategoryModal(true);
    };

    const handleDeleteCategory = async (category) => {
        if (!confirm(`Delete category "${category.name}"? This cannot be undone.`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/categories/${category.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showMessage('Category deleted successfully', 'success');
                fetchCategories();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Failed to delete category', 'error');
            }
        } catch (error) {
            showMessage('Failed to delete category', 'error');
        }
    };

    const handleSaveCategory = async (categoryData) => {
        try {
            const url = editingCategory 
                ? `${API_BASE}/categories/${editingCategory.id}`
                : `${API_BASE}/categories`;
            
            const method = editingCategory ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });

            if (response.ok) {
                showMessage(editingCategory ? 'Category updated' : 'Category created', 'success');
                setShowCategoryModal(false);
                fetchCategories();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Failed to save category', 'error');
            }
        } catch (error) {
            showMessage('Failed to save category', 'error');
        }
    };

    const handleBuildForm = async (category) => {
        // Always fetch fresh category data to get latest form info
        try {
            const response = await fetch(`${API_BASE}/categories/${category.id}`);
            const data = await response.json();
            if (data.status === 'ok') {
                const freshCategory = data.data.category;
                setSelectedCategory(freshCategory);
                setShowFormBuilder(true);
            }
        } catch (error) {
            showMessage('Failed to load category', 'error');
        }
    };

    const handlePreviewForm = async (category) => {
        try {
            const response = await fetch(`${API_BASE}/categories/${category.id}`);
            const data = await response.json();
            if (data.status === 'ok' && data.data.category.forms && data.data.category.forms.length > 0) {
                const form = data.data.category.forms[0];
                setSelectedCategory({ ...category, forms: [form] });
                setShowFormBuilder(true);
            } else {
                showMessage('No form assigned to this category', 'error');
            }
        } catch (error) {
            showMessage('Failed to load form', 'error');
        }
    };

    const handleFormSaved = (formId) => {
        setShowFormBuilder(false);
        setSelectedCategory(null);
        showMessage('Form saved successfully!', 'success');
        fetchCategories();
    };

    if (showFormBuilder) {
        return (
            <FormManagementPage
                category={selectedCategory}
                onBack={() => setShowFormBuilder(false)}
                onFormSaved={handleFormSaved}
            />
        );
    }

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading categories...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {message && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
                    message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } text-white`}>
                    {message.text}
                </div>
            )}

            <div className="container mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Category Management</h1>
                    <button
                        onClick={handleAddCategory}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        + Add Category
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            onBuildForm={handleBuildForm}
                            onPreviewForm={handlePreviewForm}
                            onEdit={handleEditCategory}
                            onDelete={handleDeleteCategory}
                        />
                    ))}
                </div>
            </div>

            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    existingCategories={categories}
                    onSave={handleSaveCategory}
                    onClose={() => setShowCategoryModal(false)}
                />
            )}
        </div>
    );
}

function CategoryCard({ category, onBuildForm, onPreviewForm, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const hasForm = category.forms && category.forms.length > 0;

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                    {category.image_v2 && (
                        <img src={category.image_v2} alt={category.name} className="w-12 h-12 object-contain" />
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.children?.length || 0} subcategories</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onEdit(category)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit Category"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(category)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Category"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => onBuildForm(category)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    📝 Build Form
                </button>
                {hasForm && (
                    <button
                        onClick={() => onPreviewForm(category)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                        👁 Preview
                    </button>
                )}
            </div>

            {/* Child Categories */}
            {category.children && category.children.length > 0 && (
                <div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {expanded ? 'Hide' : 'Show'} Subcategories ({category.children.length})
                    </button>

                    {expanded && (
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {category.children.map((child) => (
                                <ChildCategoryItem
                                    key={child.id}
                                    child={child}
                                    onBuildForm={onBuildForm}
                                    onPreviewForm={onPreviewForm}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ChildCategoryItem({ child, onBuildForm, onPreviewForm, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const hasForm = child.forms && child.forms.length > 0;

    return (
        <div className="pl-3 border-l-2 border-gray-200">
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex-1">
                    <p className="text-sm font-medium">{child.name}</p>
                    {hasForm && <span className="text-xs text-green-600">✓ Has Form</span>}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onBuildForm(child)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        title="Build Form"
                    >
                        📝
                    </button>
                    {hasForm && (
                        <button
                            onClick={() => onPreviewForm(child)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Preview Form"
                        >
                            👁
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(child)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs rounded"
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(child)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 text-xs rounded"
                        title="Delete"
                    >
                        🗑️
                    </button>
                    {child.children && child.children.length > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs rounded"
                        >
                            {expanded ? '−' : '+'}
                        </button>
                    )}
                </div>
            </div>

            {/* Nested children */}
            {expanded && child.children && child.children.length > 0 && (
                <div className="mt-2 space-y-2 pl-3">
                    {child.children.map((grandchild) => (
                        <GrandchildCategoryItem
                            key={grandchild.id}
                            grandchild={grandchild}
                            onBuildForm={onBuildForm}
                            onPreviewForm={onPreviewForm}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function GrandchildCategoryItem({ grandchild, onBuildForm, onPreviewForm, onEdit, onDelete }) {
    const hasForm = grandchild.forms && grandchild.forms.length > 0;

    return (
        <div className="pl-3 border-l-2 border-gray-200">
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex-1">
                    <p className="text-sm font-medium">{grandchild.name}</p>
                    {hasForm && <span className="text-xs text-green-600">✓ Has Form</span>}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onBuildForm(grandchild)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        title="Build Form"
                    >
                        📝
                    </button>
                    {hasForm && (
                        <button
                            onClick={() => onPreviewForm(grandchild)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Preview Form"
                        >
                            👁
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(grandchild)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs rounded"
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(grandchild)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 text-xs rounded"
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}
