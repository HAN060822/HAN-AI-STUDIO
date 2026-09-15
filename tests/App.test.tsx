import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

describe('AI World Lobby', () => {
  it('renders the Home shell, primary navigation, and team identities', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /your ai world/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /workspaces/i })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'GPT' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gemini' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Codex' })).toBeInTheDocument();
  });

  it('shows an honest intent preview notice instead of executing a request', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: /global intent/i }), { target: { value: 'Plan a garden' } });
    fireEvent.click(screen.getByRole('button', { name: /preview intent entry/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/execution is not connected yet/i);
  });

  it('creates a temporary in-memory workspace through the workspace entry', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Garden project' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(screen.getByText('Garden project')).toBeInTheDocument();
    expect(screen.getByText(/resets when this page reloads/i)).toBeInTheDocument();
  });

  it('renders intentional empty states for active work and attention', () => {
    render(<App />);
    expect(screen.getByText(/nothing needs your attention/i)).toBeInTheDocument();
    expect(screen.getByText(/your work will find you here/i)).toBeInTheDocument();
    expect(screen.getByText(/your first room is waiting/i)).toBeInTheDocument();
  });
});
