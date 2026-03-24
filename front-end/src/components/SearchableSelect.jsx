import { useState, useRef, useEffect } from 'react';

/**
 * A custom searchable dropdown component for large lists.
 */
export default function SearchableSelect({ 
    options, 
    value, 
    onChange, 
    placeholder = 'Select...', 
    disabled = false,
    className = '',
    isLoading = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        String(opt.value || opt.id_name || opt.id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => String(opt.id) === String(value));

    const handleSelect = (option) => {
        onChange(option.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded bg-white text-left transition-all ${
                    isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'
                } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'}`}
                disabled={disabled}
            >
                <span className={`block truncate ${!selectedOption && 'text-gray-400'}`}>
                    {isLoading ? 'Loading...' : (selectedOption ? selectedOption.value : placeholder)}
                </span>
                <span className="ml-2 pointer-events-none text-gray-400">
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-75">
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search..."
                            className="w-full px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                                        String(opt.id) === String(value) ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                    {opt.value}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
