import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildPluginFile } from './studio';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
  Object.defineProperty(document, 'modelContext', { configurable: true, value: undefined });
  history.replaceState({}, '', '/');
  document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove());
});

const shadowText = () => document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent ?? '';

describe('Host Whisperer surfaces', () => {
  it('explains the flow with the animated diagram on the homepage', () => {
    render(<App />);
    expect(screen.getAllByText('Host Whisperer')).not.toHaveLength(0);
    expect(screen.getByRole('heading', { name: /What if 5xx errors came with a recovery path/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText('The request travels over the API')).toBeInTheDocument();
    expect(screen.getByText('A failure travels back')).toBeInTheDocument();
    expect(screen.getByText('Host Whisperer works the host')).toBeInTheDocument();
    expect(screen.getByText('The end-user is unblocked')).toBeInTheDocument();
    expect(screen.getByText(/Give your website an end-to-end recovery path/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Integrate|Start integration/ })).not.toHaveLength(0);
    expect(screen.queryByLabelText(/Repair progress/)).not.toBeInTheDocument();
  });

  it('replays the real support activity in the hero console', () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.queryByText('Issue reported')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(900); });
    expect(screen.getByText('Issue reported')).toBeInTheDocument();

    // The labels and details are the ones the installed plugin writes on
    // the shop page, so the promise here cannot drift from the demo.
    // One act per beat: each flush lets the effect schedule the next line.
    for (let beat = 0; beat < 5; beat += 1) act(() => { vi.advanceTimersByTime(3400); });
    expect(screen.getByText('Resolution selected')).toBeInTheDocument();
    expect(screen.getByText('The one resolution this website allows for this failure.')).toBeInTheDocument();
    expect(screen.getByText('Applying resolution')).toBeInTheDocument();
  });

  it('explains the project and its prototype limits on the about page', () => {
    history.replaceState({}, '', '/?view=about');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Website failures should come with a recovery path.' })).toBeInTheDocument();
    expect(screen.getByText('WebMCP')).toBeInTheDocument();
    expect(screen.getByText('Real handoff, simulated host')).toBeInTheDocument();
    expect(screen.getByText(/Provider operations are simulated/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Try the live demo/ })).toHaveAttribute('href', '/?view=shop');
    expect(screen.queryByRole('iframe')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aviv Magnezy' })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /aviv.magnezy@gmail.com/ })).toHaveAttribute('href', 'mailto:aviv.magnezy@gmail.com');
  });

  it('presents website integration before the host connection and plugin download', () => {
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Integrate Host Whisperer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Host')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer website URL')).toHaveValue('https://longdogechallenge.com/');
    expect(screen.getByLabelText('API token')).not.toHaveValue('');
    expect(screen.queryByRole('option', { name: 'AWS' })).not.toBeInTheDocument();
    expect(screen.getByText('Render workspace permissions')).toBeInTheDocument();
    expect(screen.getByText('Trigger rollbacks')).toBeInTheDocument();
    expect(screen.getByText('host-whisperer-plugin.js')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download plugin/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Complete the host connection in step 1/)).toBeInTheDocument();
  });

  it('drops back to an unconnected host when the host is changed', async () => {
    vi.useFakeTimers();
    history.replaceState({}, '', '/?view=integrate');
    render(<App />);
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'rnd_switch_hosts_4410' } });
    fireEvent.click(screen.getByRole('button', { name: /Connect Render/ }));
    await act(async () => { vi.advanceTimersByTime(1600); });

    expect(screen.getByText('Render connected')).toBeInTheDocument();
    expect(screen.queryByLabelText('API token')).not.toBeInTheDocument();
    expect(screen.getByText('Granted permissions')).toBeInTheDocument();
    expect(screen.queryByText('Render workspace permissions')).not.toBeInTheDocument();

    await act(async () => { fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'cloudflare' } }); });

    expect(screen.queryByText('Render connected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Cloudflare/ })).toBeInTheDocument();
    expect(screen.getByLabelText('API token')).not.toHaveValue('');
    expect(screen.getByText('Cloudflare API token permissions')).toBeInTheDocument();
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
    expect(shadowText()).not.toContain('Ask ChatGPT');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(shadowText()).toContain('Ask ChatGPT');
    expect(shadowText()).toContain('Something went wrong. Want help getting back on track?');
    expect(shadowText()).not.toContain('Host Whisperer');
    expect(shadowText()).not.toContain('checkout just fell over');
  });

  it('registers store support before checkout and restores a failed checkout after refresh', () => {
    vi.useFakeTimers();
    const registerTool = vi.fn(async () => undefined);
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } });
    history.replaceState({}, '', '/?view=shop');
    const first = render(<App />);

    expect(registerTool).toHaveBeenCalledOnce();
    expect(shadowText()).not.toContain('Ask ChatGPT');
    fireEvent.click(screen.getByRole('button', { name: /^Checkout$/ }));
    expect(sessionStorage.getItem('host-whisperer-bigpink-checkout-attempted')).toBe('true');

    first.unmount();
    render(<App />);
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(registerTool).toHaveBeenCalledOnce();
  });

  it('selects a pool float from the lower catalog and keeps its color in sync', () => {
    history.replaceState({}, '', '/?view=shop');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Melon Drama' }));

    expect(screen.getByRole('heading', { name: 'Melon Drama' })).toBeInTheDocument();
    expect(screen.getByText('Sunset Coral')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sunset Coral Melon Drama inflatable pool float' })).toBeInTheDocument();
    expect(screen.queryByText('Shade')).not.toBeInTheDocument();
    expect(screen.queryByText('Poolside')).not.toBeInTheDocument();
    expect(screen.queryByText('In the box')).not.toBeInTheDocument();
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
