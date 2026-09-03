import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  history.replaceState({}, '', '/');
  document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove());
});

describe('Host Whisperer surfaces', () => {
  it('presents the developer generator and install boundary', () => {
    render(<App />);
    expect(screen.getByText('Host Whisperer')).toBeInTheDocument();
    expect(screen.getByText(/Give your website/)).toBeInTheDocument();
    expect(screen.getByText(/Generated universal adapter/)).toBeInTheDocument();
    expect(screen.getByText(/Customer-safe boundary/)).toBeInTheDocument();
  });

  it('renders a deterministic customer checkout failure', () => {
    localStorage.removeItem('northstar-demo-cart');
    localStorage.setItem('host-whisperer-northstar-installed', 'true');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    expect(screen.getByText('Aster H1')).toBeInTheDocument();
    expect(screen.getByText(/couldn’t open checkout/)).toBeInTheDocument();
    expect(document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent).toContain('Ask AI to fix this');
  });

  it('shows the broken site before the support plugin is installed', () => {
    localStorage.removeItem('northstar-demo-cart');
    localStorage.removeItem('host-whisperer-northstar-installed');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    expect(screen.getByText(/No support integration installed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configure Host Whisperer/ })).toHaveAttribute('href', '/?demo=install');
    expect(document.querySelector('#host-whisperer-root')).toBeNull();
  });
});
