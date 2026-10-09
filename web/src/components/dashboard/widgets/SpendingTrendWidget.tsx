import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { WidgetProps } from './types';
import { formatDateLocal, formatDateShort } from '../../../utils/dateUtils';
import { getBillingCycleRange } from './utils';
import { useCurrencyConversionMapState } from '../../../hooks/useCurrencyConversionMap';
import { DEFAULT_BASE_CURRENCY, formatMoney, getExpenseDisplaySource } from '../../../utils/currencyUtils';

const SpendingTrendWidget: React.FC<WidgetProps> = ({ expenses, billingCycleDay, displayCurrency, size = 'medium' }) => {
  const { t } = useLanguage();
  const { dateFormat } = useUserSettings();
  const targetCurrency = displayCurrency || DEFAULT_BASE_CURRENCY;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = React.useState(220);

  const { cycleStart, cycleEnd } = React.useMemo(
    () => getBillingCycleRange(billingCycleDay ?? 1),
    [billingCycleDay]
  );

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= cycleStart && expDate <= cycleEnd;
    });
  }, [expenses, cycleStart, cycleEnd]);

  const conversionEntries = React.useMemo(() => filteredExpenses.map((expense, index) => {
    const displaySource = getExpenseDisplaySource(expense, targetCurrency);
    return {
      key: expense.id || `${expense.date}-${index}`,
      amount: displaySource.amount,
      sourceCurrency: displaySource.sourceCurrency,
      date: expense.date,
    };
  }), [filteredExpenses, targetCurrency]);
  const conversionState = useCurrencyConversionMapState(conversionEntries, targetCurrency);

  // Determine chart dimensions based on widget size
  const chartConfig = React.useMemo(() => {
    switch (size) {
      case 'small':
        return { height: 160, fontSize: 9, xAxisHeight: 45, showGrid: false };
      case 'large':
      case 'full':
        return { height: 280, fontSize: 12, xAxisHeight: 60, showGrid: true };
      default:
        return { height: 220, fontSize: 11, xAxisHeight: 60, showGrid: true };
    }
  }, [size]);

  // Update container height based on actual size
  React.useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const widgetContent = containerRef.current.closest('.widget-content');
        if (widgetContent) {
          const availableHeight = widgetContent.clientHeight;
          if (availableHeight > 100) {
            // Use available height, with min/max constraints
            const calculatedHeight = Math.max(160, Math.min(availableHeight, 400));
            setContainerHeight(calculatedHeight);
            return;
          }
        }
        // Fallback to configured height
        setContainerHeight(chartConfig.height);
      }
    };

    // Initial update
    updateHeight();
    
    // Use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      const widgetContent = containerRef.current.closest('.widget-content');
      if (widgetContent) {
        resizeObserver.observe(widgetContent);
      }
    }

    // Also listen to window resize
    window.addEventListener('resize', updateHeight);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [chartConfig.height]);

  // Calculate last 7 days spending trend
  const spendingTrend = React.useMemo(() => {
    const last7Days: { [date: string]: number } = {};
    const today = new Date();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateLocal(date);
      last7Days[dateStr] = 0;
    }

    // Accumulate expenses
    filteredExpenses.forEach((exp, index) => {
      if (Object.prototype.hasOwnProperty.call(last7Days, exp.date)) {
        const key = exp.id || `${exp.date}-${index}`;
        const displaySource = getExpenseDisplaySource(exp, targetCurrency);
        const amount = displaySource.sourceCurrency === targetCurrency
          ? displaySource.amount
          : conversionState.amountsByKey[key] ?? Number.NaN;
        last7Days[exp.date] += amount;
      }
    });

    return Object.entries(last7Days).map(([date, amount]) => ({
      date: formatDateShort(date, dateFormat),
      amount: parseFloat(amount.toFixed(2)),
    }));
  }, [conversionState.amountsByKey, dateFormat, filteredExpenses, targetCurrency]);

  if (spendingTrend.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📈</span>
        <p>{t('noTrendData')}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: chartConfig.height,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {!conversionState.isLoading && conversionState.failedKeys.length > 0 && (
        <div className="text-xs mb-2" style={{ color: 'var(--warning-text)' }}>{t('conversionUnavailable')}</div>
      )}
      <ResponsiveContainer width="100%" height={containerHeight}>
        <LineChart data={spendingTrend}>
        {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey="date"
          tick={{ fontSize: chartConfig.fontSize }}
          angle={-45}
          textAnchor="end"
          height={chartConfig.xAxisHeight}
        />
        <YAxis tick={{ fontSize: chartConfig.fontSize }} />
        <Tooltip formatter={(value: number) => formatMoney(value, targetCurrency)} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          dot={{ r: size === 'small' ? 3 : 4 }}
          activeDot={{ r: size === 'small' ? 4 : 6 }}
        />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingTrendWidget;
