import React from 'react';
import { render, screen } from '@testing-library/react';
import Page from '../app/page';

describe('Page', () => {
  it('should render the CloudPulse dashboard', () => {
    const { baseElement } = render(<Page />);
    expect(baseElement).toBeTruthy();
    expect(screen.getByText('CloudPulse')).toBeTruthy();
    expect(screen.getByText('Total Monthly Spend')).toBeTruthy();
    expect(screen.getByText('FinOps AI Copilot (GenUI)')).toBeTruthy();
  });
});
