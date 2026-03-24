import { useState, useEffect } from 'react';

export default function CategoryModal({ category, existingCategories, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        parent_id: null,
        image: '',
        image_v2: '',
        position: 0
    });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                slug: category.slug || '',
                parent_id: category.parent_id || null,
                image: category.image || '',
                image_v2: category.image_v2 || '',
                position: category.position || 0
            });
        }
    }, [category]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Auto-generate slug from name
    const generateSlug = (name) => {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        handleChange('name', name);
        if (!category) { // Only auto-generate for new categories
            handleChange('slug', generateSlug(name));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.slug) {
            alert('Name and slug are required');
            return;
        }

        onSave(formData);
    };

    // Flatten categories for dropdown (exclude self and descendants)
    const getAvailableParents = (cats, excludeId = null) => {
        const result = [];
        const flatten = (categories, level = 0) => {
            for (const cat of categories) {
                if (cat.id !== excludeId) {
                    result.push({ ...cat, level });
                }
                if (cat.children && cat.children.length > 0) {
                    flatten(cat.children, level + 1);
                }
            }
        };
        flatten(cats);
        return result;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">
                        {category ? 'Edit Category' : 'Add New Category'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={handleNameChange}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., Electronics"
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => handleChange('slug', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., electronics"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">URL-friendly name (lowercase, hyphens)</p>
                        </div>

                        {/* Parent Category */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Parent Category</label>
                            <select
                                value={formData.parent_id || ''}
                                onChange={(e) => handleChange('parent_id', e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">None (Top Level)</option>
                                {getAvailableParents(existingCategories, category?.id).map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {'  '.repeat(cat.level)}{cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Position */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Position</label>
                            <input
                                type="number"
                                value={formData.position}
                                onChange={(e) => handleChange('position', Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                        </div>

                        {/* Image URL (optional) */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Image URL (optional)</label>
                            <input
                                type="url"
                                value={formData.image_v2}
                                onChange={(e) => handleChange('image_v2', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="https://example.com/image.png"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                            >
                                {category ? 'Update' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
