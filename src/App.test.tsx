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
    expect(screen.getByText('The request travels over the API')).toBeInTheDocument();
    expect(screen.getByText('Host Whisperer works the host')).toBeInTheDocument();
    expect(screen.getByText('The customer is unblocked')).toBeInTheDocument();
    expect(screen.getByText(/WebMCP lives in the installed plugin/)).toBeInTheDocument();
  });

  it('replays the real support activity in the hero console', () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.queryByText('Issue reported')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText('Issue reported')).toBeInTheDocument();

    // The labels and details are the ones the installed plugin writes on
    // the shop page, so the promise here cannot drift from the demo.
    // One act per beat: each flush lets the effect schedule the next line.
    for (let beat = 0; beat < 5; beat += 1) act(() => { vi.advanceTimersByTime(2400); });
    expect(screen.getByText('Resolution ready')).toBeInTheDocument();
    expect(screen.getByText('A bounded resolution is ready for your approval.')).toBeInTheDocument();
    expect(screen.getByText('Resolution approved')).toBeInTheDocument();
  });

  it('offers one plugin download behind a host connection', () => {
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Connect your host' })).toBeInTheDocument();
    expect(screen.getByLabelText('Host')).toBeInTheDocument();
    expect(screen.getByText('host-whisperer-plugin.js')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download plugin/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Connect your host in step 1/)).toBeInTheDocument();
  });

  it('drops back to an unconnected host when the host is changed', async () => {
    vi.useFakeTimers();
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'rnd_switch_hosts_4410' } });
    fireEvent.click(screen.getByRole('button', { name: /Connect Render/ }));
    await act(async () => { vi.advanceTimersByTime(1600); });

    expect(screen.getByText('Render connected')).toBeInTheDocument();
    // The masked token stands in for the entry field, which is gone.
    expect(screen.queryByLabelText('API token')).not.toBeInTheDocument();

    await act(async () => { fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'cloudflare' } }); });

    expect(screen.queryByText('Render connected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Cloudflare/ })).toBeInTheDocument();
    expect(screen.getByLabelText('API token')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /Download plugin/ })).not.toBeInTheDocument();

    // The studio profile outlives a single render, so hand it back as found.
    await act(async () => { fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'render' } }); });
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
    expect(screen.getByRole('heading', { name: 'Gerald XL' })).toBeInTheDocument();
    expect(screen.queryByText('Service Unavailable')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Checkout$/ }));
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
    localStorage.setItem('host-whisperer-bigpink-installed', 'false');
    history.replaceState({}, '', '/?view=shop');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Checkout$/ }));
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(document.querySelector('#host-whisperer-root')).toBeNull();
  });

  it('keeps the store admin as a distinct installation surface', () => {
    localStorage.setItem('host-whisperer-bigpink-bundle-ready', 'true');
    localStorage.setItem('host-whisperer-bigpink-installed', 'false');
    history.replaceState({}, '', '/?view=admin');
    render(<App />);
    expect(screen.getByText('Store integrations')).toBeInTheDocument();
    expect(screen.getByText('Store developer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Install plugin on storefront/ })).toBeInTheDocument();
  });
});
