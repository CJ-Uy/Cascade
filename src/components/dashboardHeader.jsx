"use client";

export function DashboardHeader({ title }) {
	return (
		<div className="mb-8 w-[95%] border-b-2 border-gray-300 pb-2 text-left">
			<h1 className="text-4xl font-bold">{title}</h1>
		</div>
	);
}
