import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { ensureUserProfileHandler } from "./ensureUserProfile.js";

describe("ensureUserProfileHandler", () => {
  it("creates a new user profile with a username derived from email", async () => {
    const { store, users } = createTestStore();

    const result = await ensureUserProfileHandler(
      { uid: "u1", displayName: "Priyanka R.", photoURL: "https://example.com/p.jpg", email: "priyanka.eats@gmail.com" },
      store,
    );

    expect(result.username).toBe("priyanka.eats");
    expect(result.displayName).toBe("Priyanka R.");
    expect(result.tier).toBe("explorer");
    expect(result.trustScore).toBe(10);
    expect(users.size).toBe(1);
  });

  it("is idempotent - returns the existing profile instead of overwriting it", async () => {
    const { store } = createTestStore();
    const first = await ensureUserProfileHandler(
      { uid: "u1", displayName: "Priyanka R.", photoURL: "", email: "priyanka.eats@gmail.com" },
      store,
    );

    const second = await ensureUserProfileHandler(
      { uid: "u1", displayName: "A different name", photoURL: "", email: "priyanka.eats@gmail.com" },
      store,
    );

    expect(second.displayName).toBe(first.displayName);
    expect(second.displayName).toBe("Priyanka R.");
  });

  it("sanitizes an email local-part with characters that aren't valid in a username", async () => {
    const { store } = createTestStore();

    const result = await ensureUserProfileHandler(
      { uid: "u2", displayName: "Arjun+Test", photoURL: "", email: "arjun+test.99@gmail.com" },
      store,
    );

    expect(result.username).toBe("arjuntest.99");
  });
});
