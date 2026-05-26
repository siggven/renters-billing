import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App (smoke)', () => {
  it('renders the BahayBills heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /bahaybills/i }),
    ).toBeInTheDocument();
  });

  it('renders the T1 status badge', () => {
    render(<App />);
    expect(screen.getByText(/T1 — scaffold deployed/i)).toBeInTheDocument();
  });
});
