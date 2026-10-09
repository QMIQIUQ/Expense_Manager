import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeatureTab } from '../../types';
import CompactNavigation from './CompactNavigation';

const labels: Record<FeatureTab, string> = {
  dashboard: 'Overview',
  expenses: 'Expenses',
  incomes: 'Income',
  categories: 'Categories',
  budgets: 'Budgets',
  recurring: 'Scheduled payments',
  paymentMethods: 'Payment methods',
  settings: 'Settings',
  profile: 'Profile',
  admin: 'Admin',
};

const renderNavigation = (overrides: Partial<React.ComponentProps<typeof CompactNavigation>> = {}) =>
  render(
    <CompactNavigation
      features={['dashboard', 'expenses', 'incomes', 'budgets', 'categories']}
      activeTab="dashboard"
      labels={labels}
      navigationLabel="Main navigation"
      isMobile
      onNavigate={vi.fn()}
      {...overrides}
    />,
  );

describe('CompactNavigation', () => {
  it('shows every destination in one horizontally scrollable navigation with no More button', () => {
    renderNavigation();

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(navigation).toHaveClass('compact-navigation-scroll');
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Overview', 'Expenses', 'Income', 'Budgets', 'Categories',
    ]);
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument();
  });

  it('navigates to any destination and marks the active page', () => {
    const onNavigate = vi.fn();
    renderNavigation({ onNavigate, activeTab: 'categories' });

    expect(screen.getByRole('button', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Budgets' }));
    expect(onNavigate).toHaveBeenCalledWith('budgets');
  });

  it('keeps the active destination visible when the saved feature order changes', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const view = renderNavigation({
      features: ['dashboard', 'expenses', 'incomes', 'budgets', 'categories'],
      activeTab: 'categories',
    });
    scrollIntoView.mockClear();

    view.rerender(
      <CompactNavigation
        features={['categories', 'dashboard', 'expenses', 'incomes', 'budgets']}
        activeTab="categories"
        labels={labels}
        navigationLabel="Main navigation"
        isMobile
        onNavigate={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
  });
});
