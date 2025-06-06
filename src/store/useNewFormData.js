import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useBearStore = create()(
	persist(
		(set, get) => ({
			bears: 0,
			addABear: () => set({ bears: get().bears + 1 }),
		}),
		{
			name: "food-storage", // name of the item in the storage (must be unique)
		},
	),
);
