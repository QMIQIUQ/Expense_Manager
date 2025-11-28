import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ScheduledPayment, ScheduledPaymentRecord, Category } from '../../types';

interface PaymentCalendarViewProps {
  scheduledPayments: ScheduledPayment[];
  paymentRecords: ScheduledPaymentRecord[];
  categories: Category[];
  onPaymentClick?: (payment: ScheduledPayment) => void;
}

const PaymentCalendarView: React.FC<PaymentCalendarViewProps> = ({
  scheduledPayments,
  paymentRecords,
  categories,
  onPaymentClick,
}) => {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get payments for a specific day
  const getPaymentsForDay = (day: number, month: number, year: number) => {
    return scheduledPayments.filter(payment => {
      if (!payment.isActive || payment.isCompleted) return false;
      
      if (payment.frequency === 'monthly') {
        return payment.dueDay === day;
      } else {
        // Yearly - check if this is the start date month
        const startDate = new Date(payment.startDate);
        return startDate.getMonth() === month && startDate.getDate() === day;
      }
    });
  };

  // Check if a payment has been made for a specific period
  const isPaymentMade = (paymentId: string, month: number, year: number) => {
    return paymentRecords.some(
      record => record.scheduledPaymentId === paymentId && 
                record.periodMonth === month + 1 && 
                record.periodYear === year
    );
  };

  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6366f1';
  };

  // Calendar logic
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  // Get payments for selected date
  const selectedDatePayments = useMemo(() => {
    if (!selectedDate) return [];
    return getPaymentsForDay(
      selectedDate.getDate(),
      selectedDate.getMonth(),
      selectedDate.getFullYear()
    );
  }, [selectedDate, scheduledPayments]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--card-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          style={{ color: 'var(--text-primary)' }}
        >
          ‹
        </button>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {monthName}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          style={{ color: 'var(--text-primary)' }}
        >
          ›
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium py-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="h-12" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const payments = getPaymentsForDay(day, currentMonth.getMonth(), currentMonth.getFullYear());
          const isToday = 
            day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear();
          const isSelected = 
            selectedDate?.getDate() === day &&
            selectedDate?.getMonth() === currentMonth.getMonth() &&
            selectedDate?.getFullYear() === currentMonth.getFullYear();

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
              className={`h-12 rounded-lg flex flex-col items-center justify-start p-1 transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                backgroundColor: isToday ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>{day}</span>
              {payments.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {payments.slice(0, 3).map((payment, i) => {
                    const isPaid = isPaymentMade(payment.id!, currentMonth.getMonth(), currentMonth.getFullYear());
                    return (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isPaid ? 'var(--success-text)' : getCategoryColor(payment.category),
                        }}
                        title={payment.name}
                      />
                    );
                  })}
                  {payments.length > 3 && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>+{payments.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            {selectedDate.toLocaleDateString()} - {t('paymentsOnDate')}
          </h4>
          
          {selectedDatePayments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('noPaymentsOnDate')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDatePayments.map(payment => {
                const isPaid = isPaymentMade(payment.id!, selectedDate.getMonth(), selectedDate.getFullYear());
                return (
                  <button
                    key={payment.id}
                    onClick={() => onPaymentClick?.(payment)}
                    className="flex items-center justify-between p-2 rounded-lg text-left"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getCategoryColor(payment.category) }}
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{payment.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--error-text)' }}>
                        ${payment.amount.toFixed(2)}
                      </span>
                      {isPaid && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentCalendarView;
