import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DashboardWidget, WIDGET_METADATA, DashboardWidgetType, DEFAULT_DASHBOARD_LAYOUT, generateWidgetId } from '../../types/dashboard';
import { TranslationKey } from '../../locales/translations';

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onSave: (widgets: DashboardWidget[]) => void;
  onClose: () => void;
}

const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  widgets,
  onSave,
  onClose,
}) => {
  const { t } = useLanguage();
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([...widgets]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Track the input values for order fields - allow empty string while user is editing
  const [orderInputValues, setOrderInputValues] = useState<{ [widgetId: string]: string }>({});

  // Toggle widget visibility
  const handleToggle = (widgetId: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    );
  };

  // Arrow move controls removed; ordering is handled via drag-and-drop and numeric input.

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setLocalWidgets((prev) => {
      const newWidgets = [...prev];
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(index, 0, draggedWidget);
      setDraggedIndex(index);
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Reset to default
  const handleReset = () => {
    setLocalWidgets(DEFAULT_DASHBOARD_LAYOUT.map((w, i) => ({ ...w, order: i })));
  };

  // Save changes
  const handleSave = () => {
    onSave(localWidgets);
    onClose();
  };

  // Get all available widget types that aren't in the current list
  const availableWidgets = Object.keys(WIDGET_METADATA).filter(
    (type) => !localWidgets.find((w) => w.type === type)
  ) as DashboardWidgetType[];

  // Add a widget
  const handleAddWidget = (type: DashboardWidgetType) => {
    const metadata = WIDGET_METADATA[type];
    const newWidget: DashboardWidget = {
      id: generateWidgetId(),
      type,
      enabled: true,
      order: localWidgets.length,
      size: metadata.defaultSize,
    };
    setLocalWidgets((prev) => [...prev, newWidget]);
  };

  return (
    <div className="customizer-overlay">
      <div className="customizer-modal">
        <div className="customizer-header">
          <h2>{t('customizeDashboard')}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="customizer-content">
          <div className="customizer-toolbar">
            <p className="customizer-hint">
              {t('dragToReorder')}
            </p>
            <div className="bulk-size-control">
              <label htmlFor="bulk-size-select">{t('setAllSizes')}:</label>
              <select
                id="bulk-size-select"
                onChange={(e) => {
                  const newSize = e.target.value as import('../../types/dashboard').WidgetSize;
                  if (newSize) {
                    setLocalWidgets((prev) => prev.map((w) => ({ ...w, size: newSize })));
                    // Reset select to placeholder
                    e.target.value = '';
                  }
                }}
                className="bulk-size-select"
                defaultValue=""
              >
                <option value="" disabled>{t('selectSize')}</option>
                <option value="small">{t('small')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="large">{t('large')}</option>
                <option value="full">{t('full')}</option>
              </select>
            </div>
          </div>

          <div className="widget-list">
            {localWidgets.map((widget, index) => {
              const metadata = WIDGET_METADATA[widget.type];
              return (
                <div
                  key={widget.id}
                  className={`widget-item ${draggedIndex === index ? 'dragging' : ''} ${!widget.enabled ? 'disabled' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="widget-drag-handle">⋮⋮</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={orderInputValues[widget.id] !== undefined ? orderInputValues[widget.id] : String(index + 1)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Allow empty string or numbers only
                      if (inputValue === '' || /^\d+$/.test(inputValue)) {
                        setOrderInputValues(prev => ({ ...prev, [widget.id]: inputValue }));
                      }
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value;
                      const newOrder = parseInt(inputValue) - 1;
                      
                      // Clear the temporary input value
                      setOrderInputValues(prev => {
                        const newState = { ...prev };
                        delete newState[widget.id];
                        return newState;
                      });
                      
                      // Only reorder if valid
                      if (!Number.isNaN(newOrder) && newOrder >= 0 && newOrder < localWidgets.length && newOrder !== index) {
                        setLocalWidgets((prev) => {
                          const newWidgets = [...prev];
                          const [movedWidget] = newWidgets.splice(index, 1);
                          newWidgets.splice(newOrder, 0, movedWidget);
                          return newWidgets.map((w, i) => ({ ...w, order: i }));
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="widget-order-input"
                    title={t('order')}
                    aria-label="order"
                  />
                  
                  <div className="widget-info">
                    <span className="widget-icon">{metadata.icon}</span>
                    <div className="widget-details">
                      <span className="widget-name">
                        {t(metadata.defaultTitle as TranslationKey) || metadata.defaultTitleFallback}
                      </span>
                      <span className="widget-desc">{t(metadata.description as TranslationKey)}</span>
                    </div>
                  </div>

                  <div className="widget-controls">
                    <select
                      value={widget.size}
                      onChange={(e) => {
                        const newSize = e.target.value as import('../../types/dashboard').WidgetSize;
                        setLocalWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, size: newSize } : w)));
                      }}
                      className="widget-size-select"
                      title={t('size')}
                    >
                      <option value="small">{t('small')}</option>
                      <option value="medium">{t('medium')}</option>
                      <option value="large">{t('large')}</option>
                      <option value="full">{t('full')}</option>
                    </select>
                    {/* Up/Down arrow buttons removed per request */}
                    <button
                      onClick={() => handleToggle(widget.id)}
                      className="btn-visibility"
                      title={widget.enabled ? t('hide') : t('show')}
                      style={{
                        background: widget.enabled 
                          ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(139, 92, 246, 0.3))' 
                          : 'rgba(100, 100, 120, 0.2)',
                        color: widget.enabled ? '#a78bfa' : '#9ca3af',
                        border: widget.enabled ? '1px solid rgba(139, 92, 246, 0.5)' : '1px dashed #6b7280',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '12px',
                        minWidth: '50px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {widget.enabled ? '顯示' : '隱藏'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {availableWidgets.length > 0 && (
            <div className="add-widget-section">
              <h3>{t('addWidget')}</h3>
              <div className="available-widgets">
                {availableWidgets.map((type) => {
                  const metadata = WIDGET_METADATA[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleAddWidget(type)}
                      className="btn-add-widget"
                    >
                      <span>{metadata.icon}</span>
                      <span>{t(metadata.defaultTitle as TranslationKey) || metadata.defaultTitleFallback}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="customizer-footer">
          <button onClick={handleReset} className="btn btn-secondary">
            {t('resetToDefaults')}
          </button>
          <div className="footer-actions">
            <button onClick={onClose} className="btn btn-secondary">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCustomizer;
