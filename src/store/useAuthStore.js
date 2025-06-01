import { create } from "zustand";

export const useAuthStore = create(() => ({
	userId: "",
	authenticated: false,
	setNewValue: (newId) => set({ userId: newId, authenticated: true }),
}));
