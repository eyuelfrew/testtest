import { useState, useEffect } from 'react';

export default function FieldEditorModal({ field, existingFields, onSave, onClose, onManageDependencies }) {
    const [formData, setFormData] = useState({
        name: '',
        label: '',
        input_type: 'text',
        validation: [],
        possible_values: [],
        popular_values: [],
        parent_name: null,
        url: null,
        placeholder: null,
        hint: null,
        data_type: 'str',
        value: null,
        errors: []
    });

    const [isRequired, setIsRequired] = useState(false);
    const [optionInput, setOptionInput] = useState('');
    const [showCascadingHelper, setShowCascadingHelper] = useState(false);

    useEffect(() => {
        if (field) {
            setFormData(field);
            setIsRequired(field.validation?.some(v => v.type === 'DataRequired') || false);
        }
    }, [field]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleRequiredChange = (checked) => {
        setIsRequired(checked);
        if (checked) {
            setFormData(prev => ({
                ...prev,
                validation: [
                    ...prev.validation.filter(v => v.type !== 'DataRequired'),
                    { type: 'DataRequired', error_message: 'This field is required.', value: 'true' }
                ]
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                validation: prev.validation.filter(v => v.type !== 'DataRequired')
            }));
        }
    };

    const handleAddOption = () => {
        if (!optionInput.trim()) return;

        // Generate a unique ID using timestamp but ensure it fits in MySQL INT
        // Use a simple incrementing approach based on current length
        const newId = formData.possible_values.length > 0
            ? Math.max(...formData.possible_values.map(o => o.id)) + 1
            : 1000;

        const newOption = {
            id: newId,
            value: optionInput,
            id_name: String(newId),
            checked: false
        };

        setFormData(prev => ({
            ...prev,
            possible_values: [...prev.possible_values, newOption]
        }));
        setOptionInput('');
    };

    const handleRemoveOption = (optionId) => {
        setFormData(prev => ({
            ...prev,
            possible_values: prev.possible_values.filter(opt => opt.id !== optionId)
        }));
    };

    const handleParentChange = (parentName) => {
        handleChange('parent_name', parentName || null);

        // Auto-generate URL if parent is selected
        if (parentName) {
            // URL will be set properly by backend when form is saved
            handleChange('url', '/fields/{id}/options');
            setShowCascadingHelper(true);
        } else {
            handleChange('url', null);
            setShowCascadingHelper(false);
        }
    };

    const generateFieldName = (label) => {
        // Use random short ID instead of timestamp to avoid MySQL INT overflow
        const randomId = Math.floor(Math.random() * 9000) + 1000;
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return `attr_${randomId}_${slug}`;
    };

    const handleLabelChange = (label) => {
        handleChange('label', label);
        // Auto-generate name for new fields
        if (!field && label) {
            handleChange('name', generateFieldName(label));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.label) {
            alert('Name and label are required');
            return;
        }

        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">
                        {field ? 'Edit Field' : 'Add New Field'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Label - moved to top */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Field Label *</label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                placeholder="e.g., Type, Brand, Model"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Field Name - auto-generated, hidden for new fields */}
                        {field && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Field Name (Internal)</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    disabled
                                    className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600 text-sm"
                                />
                            </div>
                        )}

                        {/* Input Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Input Type</label>
                            <select
                                value={formData.input_type}
                                onChange={(e) => handleChange('input_type', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="text">Text</option>
                                <option value="textarea">Textarea</option>
                                <option value="single_select">Single Select</option>
                            </select>
                        </div>

                        {/* Required Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="required"
                                checked={isRequired}
                                onChange={(e) => handleRequiredChange(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="required" className="text-sm font-medium">
                                Required field
                            </label>
                        </div>

                        {/* Placeholder */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Placeholder (optional)</label>
                            <input
                                type="text"
                                value={formData.placeholder || ''}
                                onChange={(e) => handleChange('placeholder', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Hint */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Hint (optional)</label>
                            <input
                                type="text"
                                value={formData.hint || ''}
                                onChange={(e) => handleChange('hint', e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Cascading Dropdown Setup */}
                        {formData.input_type === 'single_select' && (
                            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                                <label className="block text-sm font-medium mb-2 text-purple-900">
                                    Parent Field (Optional)
                                </label>

                                <select
                                    value={formData.parent_name || ''}
                                    onChange={(e) => handleParentChange(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                >
                                    <option value="">None</option>
                                    {existingFields
                                        .filter(f => f.name !== formData.name && f.input_type === 'single_select')
                                        .map(f => (
                                            <option key={f.name} value={f.name}>
                                                {f.label}
                                            </option>
                                        ))}
                                </select>

                                {formData.parent_name && (
                                    <div className="mt-3 p-3 bg-white rounded border border-purple-300">
                                        <p className="text-sm text-purple-800 font-medium mb-1">
                                            ✓ Cascading field configured
                                        </p>
                                        <p className="text-xs text-purple-700">
                                            After saving, click the 🔗 button on this field to:
                                        </p>
                                        <ul className="text-xs text-purple-700 mt-1 ml-4 list-disc">
                                            <li>Add all {formData.label} options</li>
                                            <li>Map which options appear for each {existingFields.find(f => f.name === formData.parent_name)?.label}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Options (only for independent dropdowns) */}
                        {formData.input_type === 'single_select' && !formData.parent_name && (
                            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                                <label className="block text-sm font-medium mb-2 text-blue-900">
                                    Options
                                </label>

                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={optionInput}
                                        onChange={(e) => setOptionInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                                        placeholder="Add option"
                                        className="flex-1 px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                                    >
                                        Add
                                    </button>
                                </div>

                                {formData.possible_values.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 bg-white rounded border-2 border-dashed border-gray-300">
                                        <p className="text-sm">No options</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto bg-white rounded p-2">
                                        {formData.possible_values.map((opt, index) => (
                                            <div key={opt.id} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 border border-gray-200">
                                                <span className="font-medium">{opt.value}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(opt.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm px-2 py-1 hover:bg-red-50 rounded"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sub-Fields Configuration */}
                        {formData.input_type === 'single_select' && formData.possible_values && formData.possible_values.length > 0 && (
                            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50 mt-4">
                                <h4 className="text-sm font-semibold text-green-900 mb-2">
                                    📋 Sub-Fields (Optional)
                                </h4>
                                <p className="text-sm text-green-800 mb-3">
                                    Add extra fields that appear when a specific option is selected
                                </p>
                                {field && field.id ? (
                                    <button
                                        type="button"
                                        onClick={() => alert('Sub-fields manager: To be implemented - will allow configuring which fields appear when each option is selected')}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                                    >
                                        Manage Sub-Fields
                                    </button>
                                ) : (
                                    <p className="text-xs text-green-700 italic">
                                        Save this field first, then you can configure sub-fields
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                            >
                                Cancel
                            </button>
                            {field && formData.parent_name && onManageDependencies && (
                                <button
                                    type="button"
                                    onClick={() => onManageDependencies(field)}
                                    className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                                    title="Manage which options appear for each parent value"
                                >
                                    🔗 Manage Options
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                            >
                                {field ? 'Update Field' : 'Add Field'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
