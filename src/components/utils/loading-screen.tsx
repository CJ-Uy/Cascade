import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";

interface ILoadingScreenProps {
	/**
	 * Controls the visibility of the loading screen.
	 * When set to false, the component will fade out and unmount.
	 */
	isLoading: boolean;
}

export const LoadingScreen = ({ isLoading }: ILoadingScreenProps) => {
	// This state tracks if the component should be in the DOM.
	// It stays `true` during the fade-out animation.
	const [isMounted, setIsMounted] = useState(isLoading);

	useEffect(() => {
		let timeoutId: NodeJS.Timeout;

		if (isLoading) {
			// If we need to show the loader, mount it immediately.
			setIsMounted(true);
		} else {
			// If we need to hide it, wait for the fade-out animation
			// to complete before unmounting the component.
			timeoutId = setTimeout(() => {
				setIsMounted(false);
			}, 300); // This duration MUST match the transition duration below.
		}

		// Cleanup function to clear the timeout if the component unmounts
		// or if `isLoading` changes again before the timeout finishes.
		return () => clearTimeout(timeoutId);
	}, [isLoading]); // This effect runs whenever the `isLoading` prop changes.

	// If the component is not mounted, render nothing.
	if (!isMounted) {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
				// Add transition classes for a smooth fade
				"transition-opacity duration-400 ease-in-out",
				// Control opacity based on the `isLoading` prop
				isLoading ? "opacity-100" : "opacity-0",
			)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48" // Hardcoded size
				height="48" // Hardcoded size
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor" // Uses the parent's text color
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="animate-spin text-primary" // Hardcoded animation and color
			>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
		</div>
	);
};