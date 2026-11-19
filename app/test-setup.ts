import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// The zustand mock (__mocks__/zustand.ts) resets every store after each test.
vi.mock("zustand");
