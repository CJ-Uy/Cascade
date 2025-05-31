import { create } from "zustand";

export const useCounterStore = create(() => ({
	count: 0,
	increment: () => {
		set((state) => ({ count: state + 1 }));
	},
	incrementAsync: async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		set((state) => ({ count: state + 1 }));
	},
	setNewValue: (newCount) => set({ count: newCount }),
}));
