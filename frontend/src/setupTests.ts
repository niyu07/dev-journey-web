import "@testing-library/jest-dom";

// Mock the global fetch API for all tests
beforeEach(() => {
  vi.spyOn(window, 'fetch').mockImplementation(() => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({}),
    };
    return Promise.resolve(mockResponse as Response);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
