import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { PomodoroTimer } from './PomodoroTimer';

describe('PomodoroTimer', () => {
  beforeEach(() => {
    // Use fake timers to control setInterval and Date
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  it('renders initial state correctly', () => {
    render(<PomodoroTimer />);
    // Initial mode is Pomodoro (25:00)
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作業' })).toBeDisabled();
  });

  it('starts and pauses the timer', () => {
    render(<PomodoroTimer />);
    const startButton = screen.getByRole('button', { name: 'スタート' });

    // Start the timer
    fireEvent.click(startButton);
    expect(screen.getByRole('button', { name: '一時停止' })).toBeInTheDocument();

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('24:55')).toBeInTheDocument();

    // Pause the timer
    const pauseButton = screen.getByRole('button', { name: '一時停止' });
    fireEvent.click(pauseButton);
    expect(screen.getByRole('button', { name: 'スタート' })).toBeInTheDocument();
  });

  it('resets the timer', () => {
    render(<PomodoroTimer />);
    const startButton = screen.getByRole('button', { name: 'スタート' });
    const resetButton = screen.getByRole('button', { name: 'リセット' });

    fireEvent.click(startButton);
    act(() => {
      vi.advanceTimersByTime(10000); // 10 seconds
    });
    expect(screen.getByText('24:50')).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'スタート' })).toBeInTheDocument();
  });

  it('switches between modes', () => {
    render(<PomodoroTimer />);
    const shortBreakButton = screen.getByRole('button', { name: '短い休憩' });
    const longBreakButton = screen.getByRole('button', { name: '長い休憩' });

    // Switch to Short Break (5:00)
    fireEvent.click(shortBreakButton);
    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(shortBreakButton).toBeDisabled();

    // Switch to Long Break (15:00)
    fireEvent.click(longBreakButton);
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(longBreakButton).toBeDisabled();
  });
});
