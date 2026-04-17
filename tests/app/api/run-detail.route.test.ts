import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  deleteRun: vi.fn(),
  getRun: vi.fn(),
}));

vi.mock("../../../lib/storage", () => ({
  deleteRun: mocked.deleteRun,
  getRun: mocked.getRun,
}));

import { DELETE } from "../../../app/api/runs/[id]/route";

describe("DELETE /api/runs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the run and returns ok", async () => {
    mocked.deleteRun.mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost/api/runs/run_123"), {
      params: Promise.resolve({ id: "run_123" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocked.deleteRun).toHaveBeenCalledWith("run_123");
  });
});
