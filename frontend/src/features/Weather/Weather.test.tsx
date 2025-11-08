import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Weather } from "./Weather";

describe("Weather", () => {
  beforeEach(() => {
    // Mock fetch function before each test
    window.fetch = vi.fn();
  });

  it("displays loading state initially", () => {
    (window.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
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
    (window.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    });

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
    (window.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    render(<Weather />);

    await waitFor(() => {
      expect(
        screen.getByText("天気情報の取得に失敗しました。"),
      ).toBeInTheDocument();
    });
  });
});
