import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from '../icons';
import { designTokens } from '../../styles/designTokens';

export interface AutocompleteOption<T = unknown> {
  id: string;
  label: string;
  icon?: string;
  subtitle?: string;
  color?: string;
  data?: T; // Additional data to pass through
}

interface AutocompleteDropdownProps<T = unknown> {
  options: AutocompleteOption<T>[];
  value?: string; // Selected option ID
  onChange: (optionId: string, option: AutocompleteOption<T> | null) => void;
  onSearch?: (searchTerm: string) => void; // For server-side search
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  minSearchLength?: number; // Minimum characters to trigger search
  debounceMs?: number; // Debounce delay for search
  loading?: boolean;
  createNewLabel?: string; // Label for "Create new" option
  onCreateNew?: () => void; // Callback for creating new item
}

function AutocompleteDropdown<T = unknown>({
  options,
  value,
  onChange,
  onSearch,
  placeholder = 'Search or select...',
  label,
  error,
  disabled = false,
  allowClear = true,
  className = '',
  minSearchLength = 0,
  debounceMs = 300,
  loading = false,
  createNewLabel,
  onCreateNew,
}: AutocompleteDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption<T>[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Find selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.length < minSearchLength) {
      setFilteredOptions(options);
      return;
    }

    // Client-side filtering
    const searchLower = searchTerm.toLowerCase();
    const filtered = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.subtitle?.toLowerCase().includes(searchLower)
    );
    setFilteredOptions(filtered);

    // Server-side search (debounced)
    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearch(searchTerm);
      }, debounceMs);
    }
  }, [searchTerm, options, onSearch, minSearchLength, debounceMs]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleSelect = useCallback((option: AutocompleteOption<T>) => {
    onChange(option.id, option);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(0);
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (createNewLabel && onCreateNew) {
            onCreateNew();
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredOptions, highlightedIndex, createNewLabel, onCreateNew, handleSelect]
  );

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // handleSelect is memoized above

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Input/Display area */}
        <div
          className={`flex items-center gap-2 px-3 py-2 border rounded-md bg-white cursor-pointer transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
          } ${error ? 'border-red-500' : isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'} ${
            !disabled ? 'hover:border-gray-400' : ''
          }`}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {/* Icon if selected */}
          {selectedOption?.icon && !isOpen && (
            <span className="text-xl flex-shrink-0">{selectedOption.icon}</span>
          )}
          
          {/* Search icon when open */}
          {isOpen && <SearchIcon size={18} className="text-gray-400 flex-shrink-0" />}
          
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : selectedOption?.label || ''}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 outline-none bg-transparent text-sm"
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="dropdown-listbox"
            aria-autocomplete="list"
          />
          
          {/* Clear button */}
          {allowClear && selectedOption && !isOpen && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label="Clear selection"
            >
              ✕
            </button>
          )}
          
          {/* Dropdown icon */}
          {!loading && (
            <span className="text-gray-400 flex-shrink-0">
              {isOpen ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
            </span>
          )}
          
          {/* Loading spinner */}
          {loading && (
            <span className="text-gray-400 flex-shrink-0 animate-spin">⏳</span>
          )}
        </div>

        {/* Dropdown list */}
        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            id="dropdown-listbox"
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
            style={{ zIndex: designTokens.zIndex.dropdown }}
          >
            {/* Options list */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  data-index={index}
                  role="option"
                  aria-selected={value === option.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-50'
                      : value === option.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {/* Icon */}
                  {option.icon && (
                    <span className="text-xl flex-shrink-0">{option.icon}</span>
                  )}
                  
                  {/* Color indicator */}
                  {option.color && (
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  
                  {/* Label and subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {option.label}
                    </div>
                    {option.subtitle && (
                      <div className="text-xs text-gray-500 truncate">
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                  
                  {/* Checkmark for selected */}
                  {value === option.id && (
                    <span className="text-blue-600 flex-shrink-0">✓</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {loading ? 'Loading...' : 'No results found'}
              </div>
            )}
            
            {/* Create new option */}
            {createNewLabel && onCreateNew && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 text-blue-600 font-medium text-sm"
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                >
                  <span>+</span>
                  <span>{createNewLabel}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default AutocompleteDropdown;
