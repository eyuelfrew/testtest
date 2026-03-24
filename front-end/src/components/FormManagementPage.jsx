import { useState, useEffect } from 'react';
import DynamicForm from './DynamicForm';
import FieldEditorModal from './FieldEditorModal';
import OptionDependencyManager from './OptionDependencyManager';

const API_BASE = 'http://localhost:3000/api';

export default function FormManagementPage({ category, onBack, onFormSaved }) {
    const [formId, setFormId] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [managingDependencyField, setManagingDependencyField] = useState(null);
    const [message, setMessage] = useState(null);
    const [formName, setFormName] = useState('');

    useEffect(() => {
        // Check for existing form (forms array from backend)
        const existingForm = category?.forms?.[0] || category?.form;

        if (existingForm) {
            // Existing form
            setFormId(existingForm.id);
            setFormName(existingForm.name);
            fetchFormSchema(existingForm.id);
        } else {
            // New form
            setFormId(null);
            setFormName(category?.name ? `${category.name} Form` : 'New Form');
            setFields([]);
            setLoading(false);
        }
    }, [category]);

    const fetchFormSchema = async (id) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/forms/${id}`);
            const data = await response.json();
            if (data.status === 'ok') {
                setFields(data.fields.sort((a, b) => a.pos - b.pos));
            }
        } catch (error) {
            showMessage('Failed to load form schema', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveFormSchema = async () => {
        try {
            setSaving(true);

            // Only update the form name/status
            const response = await fetch(`${API_BASE}/forms/${formId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formName })
            });

            if (response.ok) {
                showMessage('Form name updated successfully', 'success');
                onFormSaved?.(formId);
            }
        } catch (error) {
            showMessage('Failed to update form', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAddField = () => {
        setEditingField(null);
        setIsModalOpen(true);
    };

    const handleEditField = (field) => {
        setEditingField(field);
        setIsModalOpen(true);
    };

    const handleDeleteField = async (fieldName) => {
        if (!confirm('Delete this field?')) return;
        
        try {
            // Find the field to get its ID
            const fieldToDelete = fields.find(f => f.name === fieldName);
            
            if (fieldToDelete && fieldToDelete.id) {
                // Delete from database via API
                const response = await fetch(`${API_BASE}/forms/${formId}/fields/${fieldToDelete.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Remove from local state
                    setFields(fields.filter(f => f.name !== fieldName));
                    showMessage('Field deleted successfully', 'success');
                } else {
                    showMessage('Failed to delete field', 'error');
                }
            } else {
                // Field not saved yet, just remove from local state
                setFields(fields.filter(f => f.name !== fieldName));
                showMessage('Field removed', 'success');
            }
        } catch (error) {
            showMessage('Failed to delete field', 'error');
        }
    };

    const handleMoveField = (index, direction) => {
        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newFields.length) return;

        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        newFields.forEach((field, idx) => field.pos = idx + 1);
        setFields(newFields);
    };

    const handleSaveField = async (fieldData) => {
        try {
            if (editingField) {
                // Update existing field via API
                const response = await fetch(`${API_BASE}/forms/${formId}/fields/${editingField.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fieldData)
                });

                if (response.ok) {
                    const result = await response.json();
                    // Update local state with the saved field
                    setFields(fields.map(f => f.name === editingField.name ? result.field : f));
                    showMessage('Field updated successfully', 'success');
                }
            } else {
                // Create new field via API
                const response = await fetch(`${API_BASE}/forms/${formId}/fields`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...fieldData,
                        pos: fields.length + 1
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    setFields([...fields, result.field]);
                    showMessage('Field added successfully', 'success');
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            showMessage('Failed to save field', 'error');
        }
    };

    const handleManageDependencies = (field) => {
        setManagingDependencyField(field);
    };

    const handlePreviewSubmit = (data) => {
        console.log('Preview form submitted:', data);
        showMessage('Form submitted (check console)', 'success');
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {message && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    } text-white`}>
                    {message.text}
                </div>
            )}

            <div className="container mx-auto p-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            ← Back
                        </button>
                    )}
                    <div className="flex-1">
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                            placeholder="Form Name"
                        />
                        {category && (
                            <p className="text-sm text-gray-500">Category: {category.name}</p>
                        )}
                    </div>
                    <button
                        onClick={saveFormSchema}
                        disabled={saving || fields.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : formId ? 'Update Form' : 'Create Form'}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Panel - Form Manager */}
                    <div className="lg:w-2/5 bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Form Fields ({fields.length})</h2>
                            {fields.some(f => f.parent_name) && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                                    🔗 Has Cascading
                                </span>
                            )}
                        </div>

                        <div className="space-y-3 mb-4">
                            {fields.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No fields yet. Click "Add Field" to start building your form.</p>
                            ) : (
                                fields.map((field, index) => (
                                    <div key={field.name} className={`border-2 rounded-lg p-3 hover:bg-gray-50 ${field.parent_name ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium">{field.label}</h3>
                                                    {field.input_type === 'single_select' && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                            Dropdown
                                                        </span>
                                                    )}
                                                </div>
                                                {field.parent_name && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-xs text-purple-600 font-medium">
                                                            🔗 Depends on: {fields.find(f => f.name === field.parent_name)?.label}
                                                        </span>
                                                    </div>
                                                )}
                                                {field.possible_values?.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {field.possible_values.length} option{field.possible_values.length !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleMoveField(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                    title="Move up"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    onClick={() => handleMoveField(index, 'down')}
                                                    disabled={index === fields.length - 1}
                                                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                    title="Move down"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    onClick={() => handleEditField(field)}
                                                    className="p-1 px-2 hover:bg-blue-100 rounded text-blue-600"
                                                >
                                                    Edit
                                                </button>
                                                {field.parent_name && (
                                                    <button
                                                        onClick={() => handleManageDependencies(field)}
                                                        className="p-1 px-2 hover:bg-purple-100 rounded text-purple-600 text-xs"
                                                        title="Manage which options appear for this parent"
                                                    >
                                                        🔗 Options
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteField(field.name)}
                                                    className="p-1 px-2 hover:bg-red-100 rounded text-red-600"
                                                >
                                                    Del
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={handleAddField}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 font-medium"
                        >
                            + Add Field
                        </button>
                    </div>

                    {/* Right Panel - Live Preview */}
                    <div className="lg:w-3/5 bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
                        {fields.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Add fields to see preview</p>
                        ) : (
                            <DynamicForm fields={fields} onSubmit={handlePreviewSubmit} />
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <FieldEditorModal
                    field={editingField}
                    existingFields={fields}
                    onSave={handleSaveField}
                    onClose={() => setIsModalOpen(false)}
                    onManageDependencies={handleManageDependencies}
                />
            )}

            {managingDependencyField && (
                <OptionDependencyManager
                    field={managingDependencyField}
                    parentField={fields.find(f => f.name === managingDependencyField.parent_name)}
                    onClose={() => setManagingDependencyField(null)}
                />
            )}
        </div>
    );
}
