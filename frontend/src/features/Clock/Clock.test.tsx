import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Clock } from "./Clock";

describe("Clock", () => {
  it("renders the current time and date", () => {
    // Mock Date object for consistent testing
    vi.useFakeTimers();
    const mockDate = new Date("2024-10-31T10:00:00");
    vi.setSystemTime(mockDate);

    render(<Clock />);

    // Check if the time is displayed
    expect(screen.getByText("10:00:00")).toBeInTheDocument();

    // Check if the date and day of the week are displayed
    expect(screen.getByText("2024年10月31日 (木)")).toBeInTheDocument();

    // Clean up the mock
    vi.useRealTimers();
  });
});
