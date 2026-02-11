import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render the button with text', () => {
    // Renders the button with "Click me" text
    render(<Button>Click me</Button>);
    // Finds the button by its role and name
    const button = screen.getByRole('button', { name: /click me/i });
    // Asserts that the button is in the document
    expect(button).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    // Creates a mock function for the click handler
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    // Simulates a click event
    fireEvent.click(button);
    // Expects the mock function to have been called once
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply variant classes correctly', () => {
    // Renders a destructive variant button
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    // Checks if the correct Tailwind class is applied
    expect(button).toHaveClass('bg-destructive');
  });

  it('should be disabled when disabled prop is passed', () => {
    // Renders a disabled button
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    // Checks if the button has the disabled attribute
    expect(button).toBeDisabled();
  });

  it('should render as a different element using asChild', () => {
    // Renders a button as a span using asChild (Slot)
    render(
      <Button asChild>
        <span>Custom Span</span>
      </Button>
    );
    // Checks if "Custom Span" is rendered
    expect(screen.getByText('Custom Span')).toBeInTheDocument();
  });
});
