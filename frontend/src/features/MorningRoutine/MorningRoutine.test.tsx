import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { MorningRoutine } from "./MorningRoutine";

describe("MorningRoutine", () => {
  // Mock localStorage
  let store: { [key: string]: string } = {};
  const localStorageMock = (() => {
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
    };
  })();
  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  beforeEach(() => {
    store = {}; // Clear store before each test
    vi.useFakeTimers(); // Mock timers for Date.now()
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the list of routines", () => {
    render(<MorningRoutine />);
    expect(screen.getByText("朝のルーティン")).toBeInTheDocument();
    expect(screen.getByText("ベッドを整える")).toBeInTheDocument();
  });

  it("allows checking and unchecking a routine item", () => {
    render(<MorningRoutine />);
    const checkbox = screen.getByLabelText(
      "ベッドを整える",
    ) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("persists the checked state to localStorage", () => {
    render(<MorningRoutine />);
    const checkbox = screen.getByLabelText("ベッドを整える");
    fireEvent.click(checkbox);
    const savedState = JSON.parse(
      localStorage.getItem("morningRoutines") || "[]",
    );
    expect(savedState.routines[0].done).toBe(true);
  });

  it("resets routines if the saved date is not today", () => {
    const yesterday = "2024-01-01";
    const initialState = {
      date: yesterday,
      routines: [{ id: 1, text: "ベッドを整える", done: true }],
    };
    localStorage.setItem("morningRoutines", JSON.stringify(initialState));

    render(<MorningRoutine />);
    const checkbox = screen.getByLabelText(
      "ベッドを整える",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("adds a new routine item", () => {
    render(<MorningRoutine />);
    const input = screen.getByPlaceholderText("新しいルーティンを追加");
    const addButton = screen.getByRole("button", { name: "追加" });

    fireEvent.change(input, { target: { value: "新しいタスク" } });
    fireEvent.click(addButton);

    expect(screen.getByText("新しいタスク")).toBeInTheDocument();
  });

  it("deletes a routine item", () => {
    render(<MorningRoutine />);
    const itemToDelete = screen.getByText("ベッドを整える");
    expect(itemToDelete).toBeInTheDocument();

    const deleteButton = screen.getAllByRole("button", { name: "削除" })[0];
    fireEvent.click(deleteButton);

    expect(itemToDelete).not.toBeInTheDocument();
  });
});
