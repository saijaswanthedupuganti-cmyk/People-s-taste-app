import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { toggleSaveHandler } from "./toggleSave.js";

describe("toggleSaveHandler", () => {
  it("saves a recommendation that wasn't saved before", async () => {
    const { store } = createTestStore();

    const result = await toggleSaveHandler("rec1", "u1", store);

    expect(result.saved).toBe(true);
    expect(await store.getSave("u1_rec1")).toBe(true);
  });

  it("unsaves a recommendation that was already saved (toggle)", async () => {
    const { store } = createTestStore();
    await toggleSaveHandler("rec1", "u1", store);

    const result = await toggleSaveHandler("rec1", "u1", store);

    expect(result.saved).toBe(false);
    expect(await store.getSave("u1_rec1")).toBe(false);
  });

  it("keeps saves independent per user", async () => {
    const { store } = createTestStore();
    await toggleSaveHandler("rec1", "u1", store);

    await toggleSaveHandler("rec1", "u2", store);

    expect(await store.getSave("u1_rec1")).toBe(true);
    expect(await store.getSave("u2_rec1")).toBe(true);
  });
});
