import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildPluginFile } from './studio';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  history.replaceState({}, '', '/');
  document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove());
});

const shadowText = () => document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent ?? '';

describe('Host Whisperer surfaces', () => {
  it('explains the flow with the animated diagram on the homepage', () => {
    render(<App />);
    expect(screen.getAllByText('Host Whisperer')).not.toHaveLength(0);
    expect(screen.getByText(/One failure, seen from every side/)).toBeInTheDocument();
    expect(screen.getByText('The customer asks for something')).toBeInTheDocument();
    expect(screen.getByText('Host Whisperer works the problem')).toBeInTheDocument();
    expect(screen.getByText('The customer is unblocked')).toBeInTheDocument();
    expect(screen.getByText(/WebMCP lives in the installed plugin/)).toBeInTheDocument();
  });

  it('offers one plugin download behind a host connection', () => {
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Connect your host' })).toBeInTheDocument();
    expect(screen.getByLabelText('Host')).toBeInTheDocument();
    expect(screen.getByText('host-whisperer-plugin.js')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download plugin/ })).toBeDisabled();
  });

  it('keeps the host token out of storage and out of the downloaded plugin', async () => {
    vi.useFakeTimers();
    const token = 'rnd_do_not_leak_9911';
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: token } });
    fireEvent.click(screen.getByRole('button', { name: /Connect Render/ }));
    await act(async () => { vi.advanceTimersByTime(1600); });

    expect(screen.getByText('Render connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download plugin/ })).toBeEnabled();
    expect(JSON.stringify(localStorage)).not.toContain(token);
    expect(document.body.innerHTML).not.toContain(token);

    const plugin = await buildPluginFile();
    expect(plugin).not.toContain(token);
    expect(plugin).toContain('createHostWhispererRuntime');
  });

  it('fails checkout with a visible server error and offers help after a delay', () => {
    vi.useFakeTimers();
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    expect(screen.getByText('Aster H1')).toBeInTheDocument();
    expect(screen.queryByText('Service Unavailable')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    expect(screen.getByText('503')).toBeInTheDocument();
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/no healthy instances/)).toBeInTheDocument();

    // The plugin is installed, but it stays out of the way while the
    // customer takes in the error.
    expect(shadowText()).not.toContain('Ask Codex');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(shadowText()).toContain('Ask Codex');
  });

  it('shows the same failure as a dead end without the plugin', () => {
    localStorage.setItem('host-whisperer-northstar-installed', 'false');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(document.querySelector('#host-whisperer-root')).toBeNull();
  });

  it('keeps the store admin as a distinct installation surface', () => {
    localStorage.setItem('host-whisperer-northstar-bundle-ready', 'true');
    localStorage.setItem('host-whisperer-northstar-installed', 'false');
    history.replaceState({}, '', '/?view=admin');
    render(<App />);
    expect(screen.getByText('Store integrations')).toBeInTheDocument();
    expect(screen.getByText('Store developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Install plugin on storefront/ })).toBeInTheDocument();
  });
});
