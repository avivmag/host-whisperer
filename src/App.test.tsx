import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Host Whisperer UI', () => {
  it('presents the plain-English incident experience and provider catalog', () => {
    render(<App />);
    expect(screen.getByText('Host Whisperer')).toBeInTheDocument();
    expect(screen.getByText(/Tell me what/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Render/ })).toBeInTheDocument();
    expect(screen.getByText(/Plain-English diagnosis/)).toBeInTheDocument();
  });
});
