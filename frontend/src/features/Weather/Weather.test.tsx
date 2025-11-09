import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Weather } from "./Weather";

describe("Weather", () => {
  // The global setup in `setupTests.ts` handles the basic fetch mocking
  // and cleanup. We can override the mock's implementation for specific
  // tests here.

  it("displays loading state initially", () => {
    // The default global mock is sufficient for this test
    render(<Weather />);
    expect(screen.getByText("天気を読み込み中...")).toBeInTheDocument();
  });

  it("displays weather information after successful fetch", async () => {
    const mockWeatherData = {
      city: "Tokyo",
      description: "晴れ",
      temperature: 25.5,
      icon: "01d",
    };
    // Override the global fetch mock for this specific test
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    } as Response);

    render(<Weather />);

    await waitFor(() => {
      expect(screen.getByText("Tokyo")).toBeInTheDocument();
    });

    expect(screen.getByText("晴れ")).toBeInTheDocument();
    expect(screen.getByText("25.5°C")).toBeInTheDocument();
    const icon = screen.getByRole("img");
    expect(icon).toHaveAttribute(
      "src",
      "https://openweathermap.org/img/wn/01d@2x.png",
    );
  });

  it("displays an error message on fetch failure", async () => {
    // Override the global fetch mock for this specific test
    vi.spyOn(window, 'fetch').mockResolvedValue({ ok: false } as Response);

    render(<Weather />);

    await waitFor(() => {
      expect(
        screen.getByText("天気情報の取得に失敗しました。"),
      ).toBeInTheDocument();
    });
  });
});
