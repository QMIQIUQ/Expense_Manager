import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import '../../index.css';
import DashboardMenuSection from './DashboardMenuSection';

describe('DashboardMenuSection', () => {
  it('keeps the trigger and submenu action rows full-width, padded buttons', () => {
    render(
      <div className="dashboard-menu-panel">
        <DashboardMenuSection
          id="test-menu-section"
          title="Features"
          expanded
          onToggle={vi.fn()}
        >
          <button className="menu-item-hover w-full">Feature Settings</button>
        </DashboardMenuSection>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Features' });
    const action = screen.getByRole('button', { name: 'Feature Settings' });
    const section = trigger.parentElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'test-menu-section');
    expect(section).toHaveClass('dashboard-menu-section');
    expect(section).not.toHaveClass('px-4', 'py-2');
    expect(getComputedStyle(trigger)).toMatchObject({
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '44px',
      margin: '0px',
    });
    expect(getComputedStyle(action)).toMatchObject({
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '44px',
    });
  });

  it('uses one accessible button target for the label and arrow', () => {
    const onToggle = vi.fn();
    render(
      <DashboardMenuSection
        id="test-menu-section"
        title="Appearance"
        expanded={false}
        onToggle={onToggle}
      >
        <span>Theme options</span>
      </DashboardMenuSection>,
    );

    const trigger = screen.getByRole('button', { name: 'Appearance' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Theme options').parentElement).toHaveAttribute('hidden');

    fireEvent.click(trigger.querySelector('svg') as SVGElement);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
