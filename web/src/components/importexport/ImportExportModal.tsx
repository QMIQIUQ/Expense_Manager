import React, { useState, useRef } from 'react';
import { Category } from '../../types';
import {
  parseUploadedFile,
  matchCategories,
  importData,
  exportErrorsToCSV,
  ImportOptions,
  ImportResult,
  CategoryMapping,
} from '../../utils/importExportUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingCategories: Category[];
  onImportComplete: () => void;
}

interface ExpenseRow {
  id?: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  notes?: string;
}

interface CategoryRow {
  id?: string;
  name: string;
  color?: string;
}

interface ParsedData {
  expenses: ExpenseRow[];
  categories: CategoryRow[];
  errors: string[];
}

const ImportExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  existingCategories,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'complete'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [categoryMappings, setCategoryMappings] = useState<Map<string, CategoryMapping>>(new Map());
  const [options, setOptions] = useState<ImportOptions>({
    autoCreateCategories: false,
    conflictStrategy: 'import-as-new',
    preserveIds: false,
  });
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.csv'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension.toLowerCase())) {
      setErrorMessage('Please select a .xlsx or .csv file');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    
    // Parse file
    try {
      const parsed = await parseUploadedFile(selectedFile);
      setParsedData(parsed);
      
      // Generate category mappings
      const uniqueCategories = [...new Set(parsed.expenses.map(e => e.category))];
      const mappings = matchCategories(uniqueCategories, existingCategories);
      setCategoryMappings(mappings);
      
      setStep('preview');
    } catch (error) {
      setErrorMessage(`Failed to parse file: ${(error as Error).message}`);
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !userId) return;

    setStep('importing');
    setErrorMessage('');
    setProgress({ current: 0, total: parsedData.expenses.length, message: 'Starting import...' });

    try {
      const result = await importData(
        userId,
        parsedData.expenses,
        parsedData.categories,
        existingCategories,
        options,
        (current, total, message) => {
          setProgress({ current, total, message });
        }
      );

      setImportResult(result);
      setStep('complete');
      onImportComplete();
    } catch (error) {
      setErrorMessage(`Import failed: ${(error as Error).message}`);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('select');
    setFile(null);
    setParsedData(null);
    setCategoryMappings(new Map());
    setImportResult(null);
    setProgress({ current: 0, total: 0, message: '' });
    setErrorMessage('');
    onClose();
  };

  const renderSelectStep = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Import Expenses</h3>
      <p style={styles.description}>
        Upload a .xlsx or .csv file containing your expense data.
      </p>
      {errorMessage && (
        <div style={styles.errorBox}>
          <strong>⚠️ Error:</strong> {errorMessage}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv"
        onChange={handleFileSelect}
        style={styles.fileInput}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={styles.uploadButton}
      >
        📁 Choose File
      </button>
      {file && <p style={styles.fileName}>Selected: {file.name}</p>}
    </div>
  );

  const renderPreviewStep = () => {
    if (!parsedData) return null;

    const previewExpenses = parsedData.expenses.slice(0, 20);
    const hasUnmatchedCategories = Array.from(categoryMappings.values()).some(m => !m.matched);

    // Detect blank / empty category names and rows that contain them
    const blankCategoryRows: number[] = parsedData.expenses.reduce((acc: number[], e, idx) => {
      if (!e.category || String(e.category).trim() === '') acc.push(idx + 2); // +2 for header + 1-index
      return acc;
    }, []);

    return (
      <div style={styles.stepContent}>
        <h3 style={styles.stepTitle}>Preview & Configure</h3>
        
        {/* Import Error Message */}
        {errorMessage && (
          <div style={styles.errorBox}>
            <strong>⚠️ Import Error:</strong> {errorMessage}
          </div>
        )}
        
        {/* Parse Errors */}
        {parsedData.errors.length > 0 && (
          <div style={styles.errorBox}>
            <strong>⚠️ Parse Errors:</strong>
            <ul style={styles.errorList}>
              {parsedData.errors.slice(0, 5).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
              {parsedData.errors.length > 5 && <li>...and {parsedData.errors.length - 5} more</li>}
            </ul>
          </div>
        )}
        
        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Expenses:</span>
            <span style={styles.statValue}>{parsedData.expenses.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Categories:</span>
            <span style={styles.statValue}>{categoryMappings.size}</span>
          </div>
        </div>
        
        {/* Category Mappings */}
        <div style={styles.mappingSection}>
          <h4 style={styles.sectionTitle}>Category Mapping</h4>
          <div style={styles.mappingList}>
            {Array.from(categoryMappings.entries()).map(([name, mapping]) => (
              <div key={name} style={styles.mappingItem}>
                <span style={styles.mappingName}>{name === '' ? '(blank)' : name}</span>
                <span style={mapping.matched ? styles.mappingMatched : styles.mappingUnmatched}>
                  {mapping.matched ? `✓ Matched: ${mapping.matched.name}` : '⚠️ Not found'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Options */}
        <div style={styles.optionsSection}>
          <h4 style={styles.sectionTitle}>Import Options</h4>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={options.autoCreateCategories}
              onChange={(e) => setOptions({ ...options, autoCreateCategories: e.target.checked })}
              style={styles.checkbox}
            />
            <span>Auto-create missing categories</span>
          </label>
          {hasUnmatchedCategories && !options.autoCreateCategories && (
            <p style={styles.warning}>
              ⚠️ Some categories don't exist. Enable auto-create or they will be skipped.
            </p>
          )}
        </div>
        
        {/* Preview Table */}
        <div style={styles.previewSection}>
          <h4 style={styles.sectionTitle}>Preview (first 20 rows)</h4>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {previewExpenses.map((exp, idx) => {
                  const isBlank = !exp.category || String(exp.category).trim() === '';
                  return (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{exp.date}</td>
                      <td style={styles.td}>{exp.description}</td>
                      <td style={{
                        ...styles.td,
                        ...(isBlank ? styles.blankCategoryCell : {}),
                      }}>
                        {isBlank ? <em style={styles.blankText}>(blank)</em> : exp.category}
                      </td>
                      <td style={styles.td}>${exp.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {blankCategoryRows.length > 0 && (
            <div style={styles.blankWarning}>
              ⚠️ Found {blankCategoryRows.length} row(s) with a blank category (e.g. rows: {blankCategoryRows.slice(0,5).join(', ')}{blankCategoryRows.length > 5 ? `, ...` : ''}).
              These rows will be skipped unless you provide a category or enable "Auto-create missing categories" and fill the category name. Please fix the source file before importing.
            </div>
          )}
          {parsedData.expenses.length > 20 && (
            <p style={styles.moreRows}>...and {parsedData.expenses.length - 20} more rows</p>
          )}
        </div>
        
        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={handleClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleImport} style={styles.importButton}>
            Start Import
          </button>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div style={styles.stepContent}>
      <h3 style={styles.stepTitle}>Importing...</h3>
      <div style={styles.progressSection}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${(progress.current / progress.total) * 100}%`,
            }}
          />
        </div>
        <p style={styles.progressText}>
          {progress.message} ({progress.current} / {progress.total})
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!importResult) return null;

    return (
      <div style={styles.stepContent}>
        <h3 style={styles.stepTitle}>Import Complete</h3>
        <div style={styles.resultSection}>
          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>✅ Success:</span>
            <span style={styles.resultValue}>{importResult.success}</span>
          </div>
          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>⏭️ Skipped:</span>
            <span style={styles.resultValue}>{importResult.skipped}</span>
          </div>
          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>❌ Failed:</span>
            <span style={styles.resultValue}>{importResult.failed}</span>
          </div>
        </div>
        
        {importResult.errors.length > 0 && (
          <div style={styles.errorSection}>
            <h4 style={styles.sectionTitle}>Errors:</h4>
            <div style={styles.errorList}>
              {importResult.errors.slice(0, 10).map((err, idx) => (
                <div key={idx} style={styles.errorItem}>
                  {err.row > 0 && <strong>Row {err.row}: </strong>}
                  {err.message}
                </div>
              ))}
              {importResult.errors.length > 10 && (
                <div style={styles.errorItem}>...and {importResult.errors.length - 10} more errors</div>
              )}
            </div>
            <button
              onClick={() => exportErrorsToCSV(importResult.errors)}
              style={styles.downloadErrorsButton}
            >
              📥 Download Error Report
            </button>
          </div>
        )}
        
        <button onClick={handleClose} style={styles.closeButton}>
          Close
        </button>
      </div>
    );
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {step === 'select' && renderSelectStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  stepTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#333',
  },
  description: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    padding: '12px 24px',
    backgroundColor: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 500 as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  fileName: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  errorBox: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFC107',
    borderRadius: '6px',
    padding: '15px',
    fontSize: '14px',
    color: '#856404',
  },
  errorList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#333',
  },
  mappingSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600 as const,
    color: '#333',
  },
  mappingList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '10px',
  },
  mappingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  mappingName: {
    fontWeight: 500 as const,
    color: '#333',
  },
  mappingMatched: {
    color: '#28a745',
    fontSize: '14px',
  },
  mappingUnmatched: {
    color: '#dc3545',
    fontSize: '14px',
  },
  optionsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  checkbox: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  warning: {
    margin: 0,
    padding: '10px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFC107',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#856404',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
    border: '1px solid #ddd',
    borderRadius: '6px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    backgroundColor: '#f8f9fa',
    fontWeight: 600 as const,
    borderBottom: '2px solid #ddd',
  },
  tr: {
    borderBottom: '1px solid #ddd',
  },
  td: {
    padding: '10px 12px',
  },
  blankCategoryCell: {
    backgroundColor: '#fff5f5',
    border: '1px solid #f5c6cb',
    color: '#721c24',
  },
  blankText: {
    fontStyle: 'italic' as const,
    color: '#721c24',
  },
  moreRows: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
    textAlign: 'center' as const,
  },
  blankWarning: {
    marginTop: '10px',
    padding: '12px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFC107',
    borderRadius: '6px',
    color: '#856404',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
  importButton: {
    padding: '10px 20px',
    backgroundColor: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  progressBar: {
    width: '100%',
    height: '30px',
    backgroundColor: '#e9ecef',
    borderRadius: '15px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    transition: 'width 0.3s ease',
  },
  progressText: {
    margin: 0,
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#666',
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  resultLabel: {
    fontSize: '16px',
    fontWeight: 500 as const,
  },
  resultValue: {
    fontSize: '24px',
    fontWeight: 600 as const,
  },
  errorSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  errorItem: {
    padding: '8px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#721c24',
  },
  downloadErrorsButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
  closeButton: {
    padding: '10px 20px',
    backgroundColor: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
};

export default ImportExportModal;
