// Vitest swaps this in for zustand (vi.mock("zustand") in test-setup.ts). Every store created is remembered with its initial state,
// and test-setup.ts puts them all back after each test or story, so a task never keeps a list of its stores.
import { act } from "@testing-library/react";
import type * as ZustandExportedTypes from "zustand";
import { afterEach, vi } from "vitest";

const { create: actualCreate, createStore: actualCreateStore } = await vi.importActual<typeof ZustandExportedTypes>("zustand");

const resetFns = new Set<() => void>();

const createUncurried = <T,>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  resetFns.add(() => store.setState(initialState, true));
  return store;
};

export const create = (<T,>(stateCreator?: ZustandExportedTypes.StateCreator<T>) =>
  typeof stateCreator === "function" ? createUncurried(stateCreator) : createUncurried) as typeof ZustandExportedTypes.create;

const createStoreUncurried = <T,>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  resetFns.add(() => store.setState(initialState, true));
  return store;
};

export const createStore = (<T,>(stateCreator?: ZustandExportedTypes.StateCreator<T>) =>
  typeof stateCreator === "function" ? createStoreUncurried(stateCreator) : createStoreUncurried) as typeof ZustandExportedTypes.createStore;

afterEach(() => {
  act(() => resetFns.forEach((reset) => reset()));
});
