import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Host Whisperer UI', () => {
  it('presents the WebMCP project-room experience and provider catalog', () => {
    render(<App />);
    expect(screen.getByText('Host Whisperer')).toBeInTheDocument();
    expect(screen.getByText(/Tell your agent what/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Render/ })).toBeInTheDocument();
    expect(screen.getByText(/No cloud keys stored/)).toBeInTheDocument();
  });
});
