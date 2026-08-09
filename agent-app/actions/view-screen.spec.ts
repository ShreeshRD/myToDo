import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readAppState: vi.fn(),
}));

vi.mock("@agent-native/core/application-state", () => ({
  readAppState: mocks.readAppState,
}));

import action from "./view-screen";

describe("view-screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current navigation state when present", async () => {
    // readAppState is called twice: once for "navigation", once for "page-context"
    mocks.readAppState
      .mockResolvedValueOnce({ view: "chat", threadId: "t1" }) // navigation
      .mockResolvedValueOnce(null); // page-context (absent)

    const result = await action.run({});

    expect(mocks.readAppState).toHaveBeenCalledWith("navigation");
    expect(mocks.readAppState).toHaveBeenCalledWith("page-context");
    expect(result).toEqual({
      navigation: { view: "chat", threadId: "t1" },
    });
  });

  it("includes pageContext when present", async () => {
    const ctx = { view: "Today", selectedTaskId: 42, filters: ["Home"] };
    mocks.readAppState
      .mockResolvedValueOnce({ view: "Today" }) // navigation
      .mockResolvedValueOnce(ctx); // page-context

    const result = await action.run({});

    expect(result).toEqual({
      navigation: { view: "Today" },
      pageContext: ctx,
    });
  });

  it("returns a fallback message when there is no navigation state", async () => {
    mocks.readAppState.mockResolvedValue(null);

    const result = await action.run({});

    expect(result).toBe("No application state found. Is the app running?");
  });

  it("is marked read-only", () => {
    expect(action.readOnly).toBe(true);
  });
});
