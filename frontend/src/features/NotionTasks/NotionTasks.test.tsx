import { render, screen, waitFor } from "@testing-library/react";
import NotionTasks from "./NotionTasks";

global.fetch = jest.fn();

describe("NotionTasks", () => {
  it("renders tasks on successful fetch", async () => {
    const mockTasks = [{ id: "1", title: "Test Task 1" }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<NotionTasks />);

    await waitFor(() => {
      expect(screen.getByText("Test Task 1")).toBeInTheDocument();
    });
  });

  it("renders error message on fetch failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<NotionTasks />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error: Failed to fetch Notion tasks/i),
      ).toBeInTheDocument();
    });
  });
});
