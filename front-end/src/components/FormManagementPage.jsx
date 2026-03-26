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

            if (!formId) {
                // CREATE new form
                const response = await fetch(`${API_BASE}/forms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formName,
                        category_id: category.id,
                        fields: fields // Include all locally added fields
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setFormId(data.id);
                    // Update fields with IDs from server
                    if (data.form && data.form.Fields) {
                        setFields(data.form.Fields.sort((a, b) => a.pos - b.pos));
                    }
                    showMessage('Form created successfully', 'success');
                    onFormSaved?.(data.id);
                } else {
                    const error = await response.json();
                    showMessage(error.error || 'Failed to create form', 'error');
                }
            } else {
                // UPDATE existing form
                const response = await fetch(`${API_BASE}/forms/${formId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: formName })
                });

                if (response.ok) {
                    showMessage('Form name updated successfully', 'success');
                    onFormSaved?.(formId);
                } else {
                    showMessage('Failed to update form', 'error');
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            showMessage('Failed to save form', 'error');
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
            if (formId) {
                if (editingField && editingField.id) {
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
                    // Create new field via API (for existing form)
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
            } else {
                // New form - just save to local state for now
                if (editingField) {
                    // Update local field in state
                    setFields(fields.map(f => f.name === editingField.name ? { ...fieldData, name: editingField.name } : f));
                    showMessage('Field updated (local)', 'success');
                } else {
                    // Add new field to local state
                    // generateFieldName is already handled by modal if name/id is missing
                    setFields([...fields, { ...fieldData, pos: fields.length + 1 }]);
                    showMessage('Field added (local)', 'success');
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Field save error:', error);
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
        <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
            {message && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-[100] ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    } text-white animate-in slide-in-from-right duration-300`}>
                    {message.text}
                </div>
            )}

            {/* Top Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                            title="Back"
                        >
                            ←
                        </button>
                    )}
                    <div>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-all px-1"
                            placeholder="Untitled Form"
                        />
                        {category?.name && (
                            <p className="text-xs text-gray-500 px-1">Category: {category.name}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={saveFormSchema}
                        disabled={saving || fields.length === 0}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            formId ? 'Update Form' : 'Create Form'
                        )}
                    </button>
                </div>
            </div>

            <main className="flex-1 flex overflow-hidden">
                {/* Left Side: Field Manager */}
                <div className="flex-1 overflow-y-auto p-8 bg-white scrollbar-thin">
                    <div className="max-w-3xl mx-auto pb-20">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fields Editor</h2>
                                <p className="text-gray-600">Drag to reorder or click to edit properties</p>
                            </div>
                            <button
                                onClick={handleAddField}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-all border border-blue-100"
                            >
                                + Add Field
                            </button>
                        </div>

                        <div className="space-y-4">                            {fields.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                <div className="text-4xl mb-4">📝</div>
                                <h3 className="text-gray-400 font-medium">No fields yet</h3>
                                <button
                                    onClick={handleAddField}
                                    className="mt-4 text-blue-600 font-bold hover:underline"
                                >
                                    Add your first attribute
                                </button>
                            </div>
                        ) : (() => {
                            // Hierarchical sort: ensure children follow parents
                            const ordered = [];
                            const seen = new Set();

                            const addWithChildren = (fieldName) => {
                                if (seen.has(fieldName)) return;
                                const field = fields.find(f => f.name === fieldName);
                                if (!field) return;

                                ordered.push(field);
                                seen.add(fieldName);

                                // Add children
                                fields
                                    .filter(f => f.parent_name === fieldName)
                                    .sort((a, b) => a.pos - b.pos)
                                    .forEach(child => addWithChildren(child.name));
                            };

                            // Start with roots (fields without parents)
                            fields
                                .filter(f => !f.parent_name)
                                .sort((a, b) => a.pos - b.pos)
                                .forEach(root => addWithChildren(root.name));

                            // Catch any orphans
                            fields.forEach(f => {
                                if (!seen.has(f.name)) addWithChildren(f.name);
                            });

                            return (
                                <div className="space-y-3">
                                    {ordered.map((field) => {
                                        const getDepth = (f, depth = 0) => {
                                            if (!f.parent_name) return depth;
                                            const parent = fields.find(p => p.name === f.parent_name);
                                            return parent ? getDepth(parent, depth + 1) : depth;
                                        };
                                        const depth = getDepth(field);

                                        return (
                                            <div
                                                key={field.name}
                                                style={{ marginLeft: `${depth * 2.5}rem` }}
                                                className={`group relative border-2 rounded-2xl p-4 transition-all hover:shadow-md ${field.parent_name ? 'border-purple-100 bg-purple-50/30' : 'border-gray-100 bg-white'
                                                    }`}
                                            >
                                                {field.parent_name && (
                                                    <div
                                                        className="absolute top-1/2 w-8 h-[2px] bg-purple-100"
                                                        style={{ left: '-2rem' }}
                                                    ></div>
                                                )}

                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-xs font-mono text-gray-400 bg-gray-100/50 px-1.5 py-0.5 rounded">#{field.pos}</span>
                                                            <h3 className="font-bold text-gray-800">{field.label}</h3>
                                                            <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 text-gray-400 px-2 py-0.5 rounded-md shadow-sm">
                                                                {field.input_type}
                                                            </span>
                                                        </div>

                                                        {field.parent_name && (
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <span className="text-[10px] text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                                                    {field.trigger_option_id
                                                                        ? `👁 Shows if ${fields.find(f => f.name === field.parent_name)?.label} is "${fields.find(f => f.name === field.parent_name)?.possible_values?.find(o => o.id == field.trigger_option_id)?.value || '...'}"`
                                                                        : `🔗 Options from ${fields.find(f => f.name === field.parent_name)?.label}`
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col bg-gray-50 rounded-lg border border-gray-100 p-0.5">
                                                            <button
                                                                onClick={() => handleMoveField(fields.indexOf(field), 'up')}
                                                                disabled={fields.indexOf(field) === 0}
                                                                className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-400 border border-transparent disabled:opacity-0 transition-all"
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                onClick={() => handleMoveField(fields.indexOf(field), 'down')}
                                                                disabled={fields.indexOf(field) === fields.length - 1}
                                                                className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-400 border border-transparent disabled:opacity-0 transition-all"
                                                            >
                                                                ▼
                                                            </button>
                                                        </div>

                                                        <div className="h-10 w-[1px] bg-gray-100 mx-1"></div>

                                                        <button
                                                            onClick={() => handleEditField(field)}
                                                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white border-2 border-blue-50 bg-blue-50/30 rounded-xl transition-all"
                                                        >
                                                            Edit
                                                        </button>

                                                        {(field.input_type === 'single_select' || field.input_type === 'multiple_select') && (
                                                            <button
                                                                onClick={() => handleManageDependencies(field)}
                                                                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-purple-600 hover:bg-purple-600 hover:text-white border-2 border-purple-50 bg-purple-50/30 rounded-xl transition-all flex items-center gap-2"
                                                            >
                                                                <span>Options</span>
                                                                {field.possible_values?.length > 0 && (
                                                                    <span className="bg-purple-100 text-purple-600 px-1.5 rounded-md group-hover:bg-purple-500 group-hover:text-white text-[10px]">
                                                                        {field.possible_values.length}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeleteField(field.name)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                        </div>

                        {fields.length > 0 && (
                            <button
                                onClick={handleAddField}
                                className="mt-8 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
                            >
                                <span className="text-xl group-hover:scale-125 transition-transform inline-block mr-2">+</span>
                                Add another attribute
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side: Device Preview */}
                <div className="w-[480px] bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-start p-8 overflow-y-auto">
                    <div className="sticky top-0 w-full">
                        <div className="text-center mb-8">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Live Simulator</h2>
                            <p className="text-xs text-gray-400">Mobile listing view</p>
                        </div>

                        <div className="relative mx-auto w-[320px]">
                            {/* Smartphone Frame UI */}
                            <div className="absolute -inset-x-4 -inset-y-8 border-[12px] border-gray-900 rounded-[3.5rem] pointer-events-none shadow-2xl z-10 flex flex-col">
                                <div className="h-8 flex justify-center items-center">
                                    <div className="w-20 h-4 bg-gray-900 rounded-b-2xl flex items-center justify-center">
                                        <div className="w-8 h-1 rounded-full bg-gray-800"></div>
                                    </div>
                                </div>
                                <div className="flex-1"></div>
                                <div className="h-8 flex justify-center items-center">
                                    <div className="w-16 h-1 rounded-full bg-gray-800"></div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden h-[600px] border border-gray-200 flex flex-col relative">
                                <div className="bg-white p-4 border-b">
                                    <div className="h-2 w-1/3 bg-gray-100 rounded-full mb-2"></div>
                                    <div className="h-4 w-2/3 bg-gray-200 rounded-full"></div>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                    <DynamicForm fields={fields} onSubmit={handlePreviewSubmit} />
                                </div>
                                <div className="p-4 bg-gray-50 border-t">
                                    <div className="w-full h-10 bg-blue-600 rounded-xl opacity-20"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                            Production Ready UI Engine v2.0
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
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
