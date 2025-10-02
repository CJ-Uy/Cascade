"use client";
import { useState } from "react";

import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";
import Image from "next/image";

export function HomeNav() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Use a relative container to position the hamburger button correctly
    <nav className="relative flex h-16 w-full items-center justify-between px-4 md:px-6">
      {/* SECTION 1: Logo (Left on Desktop, Left on Mobile) */}
      <div className="flex-shrink-0">
        <Link href="/" className="block">
          {" "}
          {/* Light Mode Logo */}
          <Image
            src="/svgs/Logo&TextBlack.svg"
            alt="Akiva Cascade Logo"
            width={150}
            height={40}
            className="block dark:hidden" // `block` by default, `hidden` in dark mode
          />
          {/* Dark Mode Logo */}
          <Image
            src="/svgs/Logo&TextWhite.svg"
            alt="Akiva Cascade Logo"
            width={150}
            height={40}
            className="hidden dark:block" // `hidden` by default, `block` in dark mode
          />
        </Link>
      </div>

      {/* SECTION 2: Hyperlink Navs (Middle on Desktop, Hidden on Mobile) */}
      <div className="hidden md:absolute md:top-1/2 md:left-1/2 md:flex md:-translate-x-1/2 md:-translate-y-1/2 md:gap-x-6 lg:gap-x-8">
        <Link href="/" className="text-gray-700 hover:text-blue-600">
          Home
        </Link>
        <Link href="/protected" className="text-gray-700 hover:text-blue-600">
          Dashboard
        </Link>
        <Link
          href={process.env.GFORM_SUPPORT_TICKET_LINK || "#"}
          className="text-gray-700 hover:text-blue-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          Support
        </Link>
      </div>

      {/* SECTION 3: Theme Switcher (Right on Desktop, Hidden on Mobile) */}
      <div className="hidden md:block">
        <ThemeSwitcher />
      </div>

      {/* HAMBURGER BUTTON (Visible only on Mobile) */}
      <div className="md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="text-gray-700 focus:outline-none"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16m-7 6h7"
            ></path>
          </svg>
        </button>
      </div>

      {/* SIDEBAR (The slide-out menu) */}
      <aside
        className={`fixed top-0 right-0 z-40 h-full w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Sidebar Header with Logo and Close Button */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h1 className="text-xl font-bold">Akiva Cascade</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="text-gray-700 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="flex flex-col gap-y-4 p-4">
          <Link
            href="/"
            className="text-gray-700 hover:text-blue-600"
            onClick={() => setSidebarOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-700 hover:text-blue-600"
            onClick={() => setSidebarOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/contact"
            className="text-gray-700 hover:text-blue-600"
            onClick={() => setSidebarOpen(false)}
          >
            Support
          </Link>
          <div className="border-t pt-4">
            <ThemeSwitcher />
          </div>
        </div>
      </aside>

      {/* Overlay for when the sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black opacity-50 md:hidden"
        ></div>
      )}
    </nav>
  );
}
