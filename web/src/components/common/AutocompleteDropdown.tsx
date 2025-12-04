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
    <div ref={containerRef} className={`ac-select ${className}`}>
      {label && (
        <label className="ac-select-label">
          {label}
        </label>
      )}
      
      <div className="ac-select-wrapper">
        {/* Input/Display area */}
        <div
          className={`autocomplete-input-container ${disabled ? 'disabled' : ''} ${error ? 'error' : ''} ${isOpen ? 'focused' : ''}`}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {/* Icon if selected */}
          {selectedOption?.icon && !isOpen && (
            <span className="autocomplete-selected-icon">{selectedOption.icon}</span>
          )}
          
          {/* Search icon when open */}
          {isOpen && <SearchIcon size={18} className="autocomplete-search-icon" />}
          
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
            className="autocomplete-input"
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="ac-listbox"
            aria-autocomplete="list"
          />
          
          {/* Clear button */}
          {allowClear && selectedOption && !isOpen && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="autocomplete-clear-btn"
              aria-label="Clear selection"
            >
              ✕
            </button>
          )}
          
          {/* Dropdown icon */}
          {!loading && (
            <span className="autocomplete-chevron">
              {isOpen ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
            </span>
          )}
          
          {/* Loading spinner */}
          {loading && (
            <span className="autocomplete-loading">⏳</span>
          )}
        </div>

        {/* Dropdown list */}
        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            id="ac-listbox"
            role="listbox"
            className="ac-select-list"
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
                  className={`autocomplete-option ${index === highlightedIndex ? 'highlighted' : ''} ${value === option.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {/* Icon */}
                  {option.icon && (
                    <span className="autocomplete-option-icon">{option.icon}</span>
                  )}
                  
                  {/* Color indicator */}
                  {option.color && (
                    <span
                      className="autocomplete-option-color"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  
                  {/* Label and subtitle */}
                  <div className="autocomplete-option-content">
                    <div className="autocomplete-option-label">
                      {option.label}
                    </div>
                    {option.subtitle && (
                      <div className="autocomplete-option-subtitle">
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                  
                  {/* Checkmark for selected */}
                  {value === option.id && (
                    <span className="autocomplete-option-check">✓</span>
                  )}
                </div>
              ))
            ) : (
              <div className="autocomplete-empty">
                {loading ? 'Loading...' : 'No results found'}
              </div>
            )}
            
            {/* Create new option */}
            {createNewLabel && onCreateNew && (
              <>
                <div className="autocomplete-divider" />
                <div
                  className="autocomplete-create-new"
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
      {error && <p className="autocomplete-error">{error}</p>}

      <style>{`
        .ac-select {
          position: relative;
          border: none !important;
          background: none !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        .ac-select-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary) !important;
          margin-bottom: 4px;
          position: static;
          transform: none;
          background: none !important;
          padding: 0;
          border: none;
        }

        .ac-select-wrapper {
          position: relative;
          border: none !important;
          background: none !important;
          padding: 0 !important;
        }

        .autocomplete-input-container {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          height: 38px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--input-bg);
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .autocomplete-input-container:hover:not(.disabled) {
          border-color: var(--text-secondary);
        }

        .autocomplete-input-container.focused {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
        }

        .autocomplete-input-container.error {
          border-color: var(--error-text);
        }

        .autocomplete-input-container.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .autocomplete-selected-icon {
          font-size: 16px;
          flex-shrink: 0;
          line-height: 1;
        }

        .autocomplete-search-icon {
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .autocomplete-input {
          flex: 1;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          font-size: 14px;
          color: var(--text-primary);
          height: 100%;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }

        .autocomplete-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .autocomplete-input:focus {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .autocomplete-clear-btn {
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-size: 12px;
          flex-shrink: 0;
        }

        .autocomplete-clear-btn:hover {
          color: var(--text-primary);
        }

        .autocomplete-chevron {
          color: var(--text-secondary);
          flex-shrink: 0;
          display: flex;
        }

        .autocomplete-loading {
          color: var(--text-secondary);
          flex-shrink: 0;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ac-select-list {
          position: absolute;
          width: 100%;
          margin-top: 4px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 240px;
          overflow: auto;
        }

        .autocomplete-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .autocomplete-option:hover,
        .autocomplete-option.highlighted {
          background: var(--hover-bg);
        }

        .autocomplete-option.selected {
          background: var(--accent-light);
        }

        .autocomplete-option-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .autocomplete-option-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .autocomplete-option-content {
          flex: 1;
          min-width: 0;
        }

        .autocomplete-option-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .autocomplete-option-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .autocomplete-option-check {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .autocomplete-empty {
          padding: 16px 12px;
          text-align: center;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .autocomplete-divider {
          border-top: 1px solid var(--border-color);
          margin: 4px 0;
        }

        .autocomplete-create-new {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          color: var(--accent-primary);
          font-weight: 500;
          font-size: 14px;
        }

        .autocomplete-create-new:hover {
          background: var(--accent-light);
        }

        .autocomplete-error {
          margin-top: 4px;
          font-size: 12px;
          color: var(--error-text);
        }
      `}</style>
    </div>
  );
}

export default AutocompleteDropdown;
