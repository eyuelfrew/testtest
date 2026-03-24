import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

export default function DynamicForm({ fields, onSubmit }) {
    const [formValues, setFormValues] = useState({});
    const [errors, setErrors] = useState({});
    const [fieldOptions, setFieldOptions] = useState({});
    const [loadingFields, setLoadingFields] = useState({});
    const [subFields, setSubFields] = useState({}); // Store sub-fields by parent field + option

    useEffect(() => {
        // Initialize form values with defaults
        const initialValues = {};
        fields.forEach(field => {
            if (field.value) {
                initialValues[field.name] = field.value.id || field.value;
            }
        });
        setFormValues(initialValues);
    }, [fields]);

    useEffect(() => {
        // Handle cascading selects
        fields.forEach(field => {
            if (field.parent_name && field.id) {
                const parentField = fields.find(f => f.name === field.parent_name);
                const parentValue = formValues[field.parent_name];

                // Get the actual option ID from parent field's possible_values
                if (parentValue && parentField && parentField.possible_values) {
                    // Try to find matching option by ID or value
                    const selectedOption = parentField.possible_values.find(
                        opt => String(opt.id) === String(parentValue) || opt.value === parentValue
                    );

                    if (selectedOption && selectedOption.id) {
                        fetchDependentOptions(field, selectedOption.id);
                    } else {
                        console.warn('Could not find matching parent option for value:', parentValue);
                    }
                }
            }
        });
    }, [formValues, fields]);

    const fetchDependentOptions = async (field, parentOptionId) => {
        // Don't fetch if parentOptionId is invalid
        if (!parentOptionId || parentOptionId === 'undefined' || parentOptionId === 'null' || parentOptionId === '') {
            console.warn('Invalid parentOptionId, skipping fetch:', parentOptionId);
            return;
        }

        const cacheKey = `${field.name}_${parentOptionId}`;
        if (fieldOptions[cacheKey]) return; // Already cached

        // Don't fetch if field has no valid field ID
        if (!field.id) {
            console.warn('Field has no ID, cannot fetch options:', field.name);
            return;
        }

        try {
            setLoadingFields(prev => ({ ...prev, [field.name]: true }));

            const response = await fetch(
                `${API_BASE}/fields/${field.id}/options?parent_value_id=${parentOptionId}`
            );

            if (!response.ok) {
                console.error(`Failed to fetch options for field ${field.id}: ${response.status}`);
                return;
            }

            const options = await response.json();

            // Check if response is an array
            if (!Array.isArray(options)) {
                console.warn('Options response is not an array:', options);
                return;
            }

            // Check if free text is allowed
            const hasFreeText = options.some(opt => opt.id === '__FREE_TEXT__');
            
            setFieldOptions(prev => ({ 
                ...prev, 
                [cacheKey]: options.filter(opt => opt.id !== '__FREE_TEXT__'),
                [`${cacheKey}_freeText`]: hasFreeText
            }));

            // Fetch sub-fields for this selected option
            if (parentOptionId) {
                fetchSubFields(field, parentOptionId);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
        } finally {
            setLoadingFields(prev => ({ ...prev, [field.name]: false }));
        }
    };

    const fetchSubFields = async (field, triggerOptionId) => {
        try {
            const cacheKey = `${field.id}_${triggerOptionId}`;
            if (subFields[cacheKey]) return; // Already cached

            const response = await fetch(
                `${API_BASE}/fields/${field.id}/subfields?trigger_option_id=${triggerOptionId}`
            );

            if (response.ok) {
                const data = await response.json();
                setSubFields(prev => ({
                    ...prev,
                    [cacheKey]: data.subFields || []
                }));
            }
        } catch (error) {
            console.error('Failed to fetch sub-fields:', error);
        }
    };

    const handleChange = (fieldName, value) => {
        setFormValues(prev => ({ ...prev, [fieldName]: value }));
        setErrors(prev => ({ ...prev, [fieldName]: null }));

        // Clear dependent fields when parent changes
        fields.forEach(field => {
            if (field.parent_name === fieldName) {
                // Clear the child field value
                setFormValues(prev => ({ ...prev, [field.name]: '' }));

                // Clear ALL cached options for this child field
                setFieldOptions(prev => {
                    const newOptions = { ...prev };
                    Object.keys(newOptions).forEach(key => {
                        if (key.startsWith(`${field.name}_`)) {
                            delete newOptions[key];
                        }
                    });
                    return newOptions;
                });
            }
        });
    };

    const validate = () => {
        const newErrors = {};

        fields.forEach(field => {
            const value = formValues[field.name];

            if (field.validation) {
                field.validation.forEach(rule => {
                    if (rule.type === 'DataRequired' && !value) {
                        newErrors[field.name] = rule.error_message;
                    }
                });
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formValues);
        }
    };

    const renderField = (field) => {
        const value = formValues[field.name] || '';
        const error = errors[field.name];
        const isLoading = loadingFields[field.name];

        // Check if field should be disabled (parent not selected)
        const isDisabled = field.parent_name && !formValues[field.parent_name];

        // Get options for this field
        let options = field.possible_values || [];
        let allowFreeText = false;

        if (field.parent_name && formValues[field.parent_name]) {
            // Find the parent field and get the selected option ID
            const parentField = fields.find(f => f.name === field.parent_name);
            const parentValue = formValues[field.parent_name];

            if (parentField) {
                const selectedOption = parentField.possible_values?.find(
                    opt => opt.id == parentValue || opt.value === parentValue
                );

                if (selectedOption) {
                    const cacheKey = `${field.name}_${selectedOption.id}`;
                    const fetchedOptions = fieldOptions[cacheKey];

                    // If we have fetched options (even if empty array), use them
                    if (fetchedOptions !== undefined) {
                        options = fetchedOptions;
                        allowFreeText = fieldOptions[`${cacheKey}_freeText`] || false;
                    }
                }
            }
        }

        // If free text is allowed and user has typed a custom value, add it to options
        if (allowFreeText && value && !options.find(opt => opt.id === value)) {
            options = [...options, { id: value, value: value, id_name: value, isCustom: true }];
        }

        return (
            <div key={field.name} className="mb-4">
                <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.validation?.some(v => v.type === 'DataRequired') && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                </label>

                {field.input_type === 'single_select' && (
                    <>
                        <select
                            value={allowFreeText && !options.find(opt => opt.id === value) ? '' : value}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            disabled={isDisabled || isLoading}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
                                } ${isDisabled ? 'bg-gray-100' : ''}`}
                        >
                            <option value="">
                                {isLoading ? 'Loading...' : isDisabled ? 'Select parent first' : 'Select...'}
                            </option>
                            {options.map((opt, index) => (
                                <option key={`${opt.id}-${index}-${opt.value}`} value={opt.id}>
                                    {opt.value}{opt.isCustom ? ' (custom)' : ''}
                                </option>
                            ))}
                        </select>
                        {allowFreeText && (
                            <input
                                type="text"
                                value={allowFreeText && !options.find(opt => opt.id === value) ? value : ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                placeholder="Or type your own..."
                                className={`w-full px-3 py-2 mt-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                        )}
                    </>
                )}

                {field.input_type === 'text' && (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
                            }`}
                    />
                )}

                {field.input_type === 'textarea' && (
                    <textarea
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder || ''}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
                            }`}
                    />
                )}

                {field.hint && (
                    <p className="text-xs text-gray-500 mt-1">{field.hint}</p>
                )}

                {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                )}

                {/* Render sub-fields for this field if parent has a value */}
                {field.sub_fields && field.sub_fields.length > 0 && value && (
                    <div className="mt-4 ml-4 pl-4 border-l-2 border-blue-300">
                        {field.sub_fields
                            .filter(sf => sf.trigger_option_id == value)
                            .map(subField => (
                                <div key={subField.id} className="mt-3">
                                    <label className="block text-sm font-medium mb-1">
                                        {subField.label}
                                        {subField.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {subField.input_type === 'single_select' && (
                                        <select
                                            value={formValues[subField.name] || ''}
                                            onChange={(e) => handleChange(subField.name, e.target.value)}
                                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select...</option>
                                            <option value="option1">Option 1</option>
                                            <option value="option2">Option 2</option>
                                        </select>
                                    )}
                                    {subField.input_type === 'text' && (
                                        <input
                                            type="text"
                                            value={formValues[subField.name] || ''}
                                            onChange={(e) => handleChange(subField.name, e.target.value)}
                                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        );
    };

    if (fields.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <p>No fields to display</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(renderField)}

            <button
                type="submit"
                className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 font-medium mt-6"
            >
                Submit
            </button>
        </form>
    );
}
