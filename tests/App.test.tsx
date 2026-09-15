import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

describe('Stage 0 application baseline', () => {
  it('renders the product name and current stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "HAN's AI STUDIO" })).toBeInTheDocument();
    expect(screen.getByText('Stage 0')).toBeInTheDocument();
  });
});
