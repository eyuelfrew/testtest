import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

export default function OptionDependencyManager({ field, parentField, onClose }) {
    const [parentOptions, setParentOptions] = useState([]);
    const [childOptions, setChildOptions] = useState([]);
    const [selectedParentOption, setSelectedParentOption] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newOptionValue, setNewOptionValue] = useState('');

    useEffect(() => {
        loadData();
    }, [field, parentField]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load parent options
            const parentRes = await fetch(`${API_BASE}/fields/${parentField.id}/options/manage`);
            const parentData = await parentRes.json();
            setParentOptions(parentData.options || []);

            // Load child options
            const childRes = await fetch(`${API_BASE}/fields/${field.id}/options/manage`);
            const childData = await childRes.json();
            setChildOptions(childData.options || []);

            // Select first parent option by default
            if (parentData.options && parentData.options.length > 0) {
                setSelectedParentOption(parentData.options[0].id);
            }

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
                        parent_option_id: selectedParentOption
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
                        Add options for <strong>{field.label}</strong> and assign them to a <strong>{parentField.label}</strong>
                    </p>

                    {/* Parent Selection Dropdown */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Select {parentField.label}:
                        </label>
                        <select
                            value={selectedParentOption}
                            onChange={(e) => setSelectedParentOption(Number(e.target.value))}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        >
                            {parentOptions.map(parent => (
                                <option key={parent.id} value={parent.id}>
                                    {parent.value}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Add Options Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Add {field.label} options (comma-separated):
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newOptionValue}
                                onChange={(e) => setNewOptionValue(e.target.value)}
                                placeholder={`e.g., HP, Dell, Lenovo`}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddOptions()}
                            />
                            <button
                                onClick={handleAddOptions}
                                disabled={!selectedParentOption || !newOptionValue.trim()}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                            >
                                Add
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            Options will be created and linked to "{selectedParent?.value || 'select a parent'}"
                        </p>
                    </div>

                    {/* Existing Options List */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">Existing {field.label} Options:</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {childOptions.length === 0 ? (
                                <p className="text-gray-500 italic">No options yet. Add options above.</p>
                            ) : (
                                childOptions.map(option => {
                                    const parent = parentOptions.find(p => p.id === option.parent_option_id);
                                    return (
                                        <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                            <div>
                                                <span className="font-medium">{option.value}</span>
                                                {parent && (
                                                    <span className="ml-2 text-sm text-gray-600">
                                                      → {parent.value}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteOption(option.id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    );
                                })
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
