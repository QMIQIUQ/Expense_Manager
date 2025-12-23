import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLanguage } from '../../../contexts/LanguageContext';
import { WidgetProps } from './types';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ExpenseChartWidget: React.FC<WidgetProps> = ({ expenses, billingCycleDay = 1, size = 'medium' }) => {
  const { t } = useLanguage();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  const [containerHeight, setContainerHeight] = React.useState(300);

  const { cycleStart, cycleEnd } = React.useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    let cycleStart: Date;
    let cycleEnd: Date;

    if (currentDay >= billingCycleDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingCycleDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingCycleDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), billingCycleDay - 1);
    }

    return { cycleStart, cycleEnd };
  }, [billingCycleDay]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= cycleStart && expDate <= cycleEnd;
    });
  }, [expenses, cycleStart, cycleEnd]);

  // Determine chart dimensions based on widget size and container height
  const chartConfig = React.useMemo(() => {
    const isSmall = size === 'small' || isMobile;
    const isLarge = size === 'large' || size === 'full';
    
    // Calculate dynamic outer radius based on container height
    // Reserve space for legend (approximately 80-100px)
    const legendSpace = 100;
    const availableRadius = Math.max(0, (containerHeight - legendSpace) / 2);
    const baseRadius = isSmall ? 70 : isLarge ? 140 : 110;
    const dynamicRadius = Math.min(baseRadius, availableRadius);
    
    return {
      height: isSmall ? 200 : isLarge ? 350 : 300,
      outerRadius: Math.max(60, dynamicRadius),
      cy: isSmall ? '38%' : '42%',
      fontSize: isSmall ? 10 : 12,
    };
  }, [size, isMobile, containerHeight]);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update container height based on actual size
  React.useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const widgetContent = containerRef.current.closest('.widget-content');
        if (widgetContent) {
          const availableHeight = widgetContent.clientHeight;
          if (availableHeight > 100) {
            // Use available height, with min/max constraints
            const calculatedHeight = Math.max(200, Math.min(availableHeight, 450));
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

  // Calculate category totals
  const pieData = React.useMemo(() => {
    const byCategory: { [key: string]: number } = {};
    let total = 0;

    filteredExpenses.forEach((exp) => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
      total += exp.amount;
    });

    const pieData = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
      }));

    return pieData;
  }, [filteredExpenses]);

  if (pieData.length === 0) {
    return (
      <div className="widget-empty-state">
        <span>📊</span>
        <p>{t('noExpenseData')}</p>
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
      <ResponsiveContainer width="100%" height={containerHeight}>
        <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy={chartConfig.cy}
          labelLine={false}
          label={false}
          outerRadius={chartConfig.outerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{
            fontSize: `${chartConfig.fontSize}px`,
            paddingTop: '10px',
          }}
          formatter={(value: string) => {
            const item = pieData.find(d => d.name === value);
            return item ? `${value} (${item.percentage}%)` : value;
          }}
        />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseChartWidget;
