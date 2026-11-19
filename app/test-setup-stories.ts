import { vi } from "vitest";

// The zustand mock (__mocks__/zustand.ts) resets every store after each story.
vi.mock("zustand");
