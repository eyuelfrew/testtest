import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

export default function OptionDependencyManager({ field, parentField, onClose }) {
    const [parentOptions, setParentOptions] = useState([]);
    const [childOptions, setChildOptions] = useState([]);
    const [selectedParentOption, setSelectedParentOption] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [parentSearch, setParentSearch] = useState('');
    const [childSearch, setChildSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [field, parentField]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load parent options only if parentField exists
            if (parentField) {
                const parentRes = await fetch(`${API_BASE}/fields/${parentField.id}/options/manage`);
                const parentData = await parentRes.json();
                const options = parentData.options || [];
                setParentOptions(options);

                // Select first parent option by default if not already selected
                if (options.length > 0 && !selectedParentOption) {
                    setSelectedParentOption(options[0].id);
                }
            }

            // Load child options (the options for the current field)
            const childRes = await fetch(`${API_BASE}/fields/${field.id}/options/manage`);
            const childData = await childRes.json();
            setChildOptions(childData.options || []);

        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOptions = async () => {
        if (!newOptionValue.trim() || !selectedParentOption) return;

        try {
            // Split by comma and create each option
            const values = newOptionValue.split(',').map(v => v.trim()).filter(v => v);
            
            for (const value of values) {
                await fetch(`${API_BASE}/fields/${field.id}/options`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        value,
                        parent_option_id: selectedParentOption || null
                    })
                });
            }

            // Reload options
            await loadData();
            setNewOptionValue('');
            alert('Options added successfully!');
        } catch (error) {
            console.error('Failed to add options:', error);
            alert('Failed to add options');
        }
    };

    const handleDeleteOption = async (optionId) => {
        if (!confirm('Delete this option?')) return;

        try {
            await fetch(`${API_BASE}/fields/${field.id}/options/${optionId}`, {
                method: 'DELETE'
            });
            await loadData();
        } catch (error) {
            console.error('Failed to delete option:', error);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg">Loading...</div>
            </div>
        );
    }

    const selectedParent = parentOptions.find(p => p.id === selectedParentOption);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-2">
                        Manage {field.label} Options
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Add options for <strong>{field.label}</strong> {parentField ? `and assign them to a ${parentField.label}` : ''}
                    </p>

                    {/* Parent Selection - only if parentField exists */}
                    {parentField && (
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Step 1: Select {parentField.label}
                                </label>
                                <input
                                    type="text"
                                    placeholder={`Filter ${parentField.label}...`}
                                    value={parentSearch}
                                    onChange={(e) => setParentSearch(e.target.value)}
                                    className="px-3 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                                />
                            </div>
                            <select
                                value={selectedParentOption || ''}
                                onChange={(e) => setSelectedParentOption(Number(e.target.value))}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                {!selectedParentOption && <option value="">Select...</option>}
                                {parentOptions
                                    .filter(p => p.value.toLowerCase().includes(parentSearch.toLowerCase()))
                                    .map(parent => (
                                        <option key={parent.id} value={parent.id}>
                                            {parent.value}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Add Options */}
                    <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                            {parentField ? `Step 2: Add ${field.label} options for "${selectedParent?.value || '...'}"` : `Add options for ${field.label}`}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newOptionValue}
                                onChange={(e) => setNewOptionValue(e.target.value)}
                                placeholder={`e.g., HP, Dell, Lenovo (comma-separated)`}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddOptions()}
                            />
                            <button
                                onClick={handleAddOptions}
                                disabled={(parentField && !selectedParentOption) || !newOptionValue.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Existing Options List */}
                    <div className="flex flex-col h-80 border rounded-lg bg-white overflow-hidden">
                        <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">Existing {field.label} Options</h3>
                            <input
                                type="text"
                                placeholder="Search existing..."
                                value={childSearch}
                                onChange={(e) => setChildSearch(e.target.value)}
                                className="px-3 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {childOptions.filter(o => o.value.toLowerCase().includes(childSearch.toLowerCase())).length === 0 ? (
                                <p className="text-gray-500 italic text-center py-8">No matching options found.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    {childOptions
                                        .filter(o => o.value.toLowerCase().includes(childSearch.toLowerCase()))
                                        .map(option => {
                                            const parent = parentOptions.find(p => p.id === option.parent_option_id);
                                            return (
                                                <div key={option.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 group">
                                                    <div className="flex items-center">
                                                        <span className="text-sm font-medium">{option.value}</span>
                                                        {parent && (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded uppercase border border-blue-100">
                                                              {parent.value}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteOption(option.id)}
                                                        className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold mb-2 text-blue-900">How it works:</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Select a parent option (e.g., "Laptop")</li>
                            <li>Type child options (e.g., "HP, Dell, Lenovo")</li>
                            <li>Click "Add" - options are created and linked to the parent</li>
                            <li>In the form, when user selects "Laptop", only HP, Dell, Lenovo will appear</li>
                        </ol>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
