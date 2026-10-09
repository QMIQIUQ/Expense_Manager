import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
      primaryFeatures={['dashboard', 'expenses', 'incomes']}
      overflowFeatures={['budgets', 'categories']}
      activeTab="dashboard"
      labels={labels}
      navigationLabel="Main navigation"
      moreLabel="More"
      isMobile
      onNavigate={vi.fn()}
      {...overrides}
    />,
  );

describe('CompactNavigation', () => {
  it('keeps More visible beside horizontally scrollable mobile tabs', () => {
    renderNavigation();

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /More/ })).toBeInTheDocument();
  });

  it('opens More, navigates to overflow pages, and marks More active', () => {
    const onNavigate = vi.fn();
    renderNavigation({ onNavigate });

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Budgets' }));

    expect(onNavigate).toHaveBeenCalledWith('budgets');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes More when navigating to a primary page', () => {
    const onNavigate = vi.fn();
    const onOpenChange = vi.fn();
    renderNavigation({ onNavigate, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }));

    expect(onNavigate).toHaveBeenCalledWith('expenses');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes More on Escape and restores focus to its trigger', () => {
    renderNavigation();
    const trigger = screen.getByRole('button', { name: /More/ });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes More when the user clicks outside the navigation', () => {
    renderNavigation();
    render(<button type="button">Outside</button>);
    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks More active when the current destination is an overflow page', () => {
    renderNavigation({ activeTab: 'categories' });

    expect(screen.getByRole('button', { name: /More/ })).toHaveAttribute('aria-current', 'page');
  });
});
