import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  history.replaceState({}, '', '/');
  document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove());
});

describe('Host Whisperer surfaces', () => {
  it('presents the complete product walkthrough on the homepage', () => {
    render(<App />);
    expect(screen.getAllByText('Host Whisperer')).not.toHaveLength(0);
    expect(screen.getByText(/Turn website errors/)).toBeInTheDocument();
    expect(screen.getByText(/The complete walkthrough/)).toBeInTheDocument();
    expect(screen.getByText(/WebMCP lives in the installed plugin/)).toBeInTheDocument();
    expect(screen.getByText('Northstar Market')).toBeInTheDocument();
    expect(screen.getByText('Northstar Admin')).toBeInTheDocument();
  });

  it('presents the store admin as a distinct installation surface', () => {
    localStorage.setItem('host-whisperer-northstar-bundle-ready', 'true');
    localStorage.removeItem('host-whisperer-northstar-installed');
    history.replaceState({}, '', '/?view=admin');
    render(<App />);
    expect(screen.getByText('Store integrations')).toBeInTheDocument();
    expect(screen.getByText('Store developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Install plugin on storefront/ })).toBeInTheDocument();
  });

  it('keeps developer configuration on a separate integration page', () => {
    const registerTool = vi.fn();
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } });
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    expect(screen.getByText(/Configure the support boundary/)).toBeInTheDocument();
    expect(screen.getByText(/Generated universal adapter/)).toBeInTheDocument();
    expect(screen.getByText(/Customer-safe boundary/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Service reference/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Configure this page with ChatGPT/)).not.toBeInTheDocument();
    expect(registerTool).not.toHaveBeenCalled();
  });

  it('renders a deterministic customer checkout failure', () => {
    localStorage.removeItem('northstar-demo-cart');
    localStorage.setItem('host-whisperer-northstar-installed', 'true');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    expect(screen.getByText('Aster H1')).toBeInTheDocument();
    expect(screen.queryByText(/couldn’t open checkout/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    expect(screen.getByText(/couldn’t open checkout/)).toBeInTheDocument();
    expect(document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent).toContain('Ask AI to fix this');
  });

  it('shows the broken site before the support plugin is installed', () => {
    localStorage.removeItem('northstar-demo-cart');
    localStorage.removeItem('host-whisperer-northstar-installed');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    expect(screen.queryByText(/couldn’t open checkout/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    expect(screen.getByText(/couldn’t open checkout/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Configure Host Whisperer/ })).not.toBeInTheDocument();
    expect(document.querySelector('#host-whisperer-root')).toBeNull();
  });
});
