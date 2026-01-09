# Mobile Responsiveness Guide

This document outlines the mobile responsiveness patterns, breakpoints, and best practices used in the Cascade project.

---

## Overview

Cascade is built with a **mobile-first approach** using Tailwind CSS 4. All components and pages should be fully functional and visually appealing on devices ranging from mobile phones (320px) to large desktop screens (2560px+).

---

## Tailwind CSS Breakpoints

Cascade uses Tailwind CSS's default responsive breakpoints:

| Breakpoint | Min Width | Typical Devices                         | Usage                                                             |
| ---------- | --------- | --------------------------------------- | ----------------------------------------------------------------- |
| `sm:`      | 640px     | Large phones (landscape), small tablets | Adjust layout for larger mobile devices                           |
| `md:`      | 768px     | Tablets (portrait), small laptops       | **Most common breakpoint** - switch from mobile to desktop layout |
| `lg:`      | 1024px    | Tablets (landscape), laptops            | Enhanced desktop features, wider grids                            |
| `xl:`      | 1280px    | Desktop monitors                        | Optimized desktop experience                                      |
| `2xl:`     | 1536px    | Large desktop monitors                  | Maximum content width, multi-column layouts                       |

**Default (no prefix)**: < 640px - Mobile-first styles apply to all devices unless overridden.

---

## Core Responsive Patterns

### 1. Sidebar Navigation

The main navigation sidebar uses shadcn/ui's Sidebar component with built-in mobile responsiveness:

**Implementation:**

```tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const SIDEBAR_WIDTH = "16rem"; // Desktop
const SIDEBAR_WIDTH_MOBILE = "18rem"; // Mobile drawer
```

**Behavior:**

- **Desktop (≥768px)**: Persistent sidebar on the left
- **Mobile (<768px)**: Collapsed sidebar, accessible via hamburger menu (Sheet/Drawer)
- **Keyboard shortcut**: Press `b` to toggle sidebar on any device

**Key Files:**

- [components/ui/sidebar.tsx](../components/ui/sidebar.tsx) - Base sidebar component
- [components/nav/bar.jsx](../components/nav/bar.jsx) - Main navigation implementation
- [hooks/use-mobile.ts](../hooks/use-mobile.ts) - Mobile detection hook

---

### 2. Responsive Padding & Spacing

**Standard Pattern:**

```tsx
<div className="space-y-6 p-4 md:p-8">{/* Content */}</div>
```

**Guidelines:**

- **Mobile**: `p-4` (1rem / 16px padding)
- **Desktop**: `md:p-8` (2rem / 32px padding)
- **Spacing**: Use `space-y-4` on mobile, `space-y-6` on desktop for vertical spacing
- **Gaps**: Use `gap-4` on mobile, `gap-6` or `gap-8` on desktop

---

### 3. Grid Layouts

**Responsive Grid Pattern:**

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Grid items */}
</div>
```

**Common Configurations:**

| Mobile   | Tablet (md:) | Desktop (lg:) | Use Case                |
| -------- | ------------ | ------------- | ----------------------- |
| 1 column | 2 columns    | 3 columns     | Cards, dashboards       |
| 1 column | 1 column     | 2 columns     | Forms, detail views     |
| 1 column | 2 columns    | 4 columns     | Icon grids, small cards |

**Example (Dashboard Cards):**

```tsx
// app/(main)/dashboard/page.tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <InvitationsCard />
  <PendingSectionFormsTable />
  <StatsCard />
</div>
```

---

### 4. Data Tables

Data tables require special handling on mobile due to limited horizontal space.

**Pattern: Horizontal Scroll Container**

```tsx
<div className="w-full overflow-x-auto rounded-md border">
  <Table className="min-w-[640px]">{/* Table content */}</Table>
</div>
```

**Best Practices:**

- Set `min-w-[640px]` or similar on the table to prevent column collapse
- Use `overflow-x-auto` on the parent container
- Consider card-based layouts on mobile for complex tables
- Hide less critical columns on mobile using `hidden md:table-cell`

**Example (Responsive Table Columns):**

```tsx
<TableHead className="hidden md:table-cell">Created At</TableHead>
<TableCell className="hidden md:table-cell">{createdAt}</TableCell>
```

---

### 5. Modal Dialogs & Sheets

**Desktop**: Use `Dialog` component (centered modal overlay)
**Mobile**: Use `Sheet` or `Drawer` component (bottom drawer)

**Responsive Dialog Pattern:**

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function ResponsiveModal() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetContent side="bottom">{/* Content */}</SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog>
      <DialogContent>{/* Content */}</DialogContent>
    </Dialog>
  );
}
```

---

### 6. Form Layouts

**Single Column on Mobile, Two Columns on Desktop:**

```tsx
<form className="space-y-6">
  <div className="grid gap-4 md:grid-cols-2">
    <div>
      <Label>First Name</Label>
      <Input />
    </div>
    <div>
      <Label>Last Name</Label>
      <Input />
    </div>
  </div>

  <div>
    <Label>Email (Full Width)</Label>
    <Input />
  </div>
</form>
```

**Form Field Guidelines:**

- **Short inputs** (name, phone): 2 columns on desktop (`md:grid-cols-2`)
- **Long inputs** (email, address): Full width on all devices
- **Text areas**: Always full width
- **Action buttons**: Full width on mobile, auto-width on desktop

**Button Responsive Pattern:**

```tsx
<Button className="w-full md:w-auto">Submit</Button>
```

---

### 7. Typography & Text

**Responsive Font Sizes:**

```tsx
<h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
  Page Title
</h1>

<p className="text-sm md:text-base">
  Body text
</p>
```

**Text Truncation:**

```tsx
<p className="truncate md:line-clamp-2 lg:line-clamp-none">
  Long text that wraps differently per device
</p>
```

---

### 8. Navigation & Action Buttons

**Mobile: Bottom Sheet Actions**

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button className="w-full md:hidden">Actions</Button>
  </SheetTrigger>
  <SheetContent side="bottom">
    <div className="space-y-2">
      <Button className="w-full">Approve</Button>
      <Button className="w-full" variant="destructive">
        Reject
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

**Desktop: Inline Buttons**

```tsx
<div className="hidden gap-2 md:flex">
  <Button>Approve</Button>
  <Button variant="destructive">Reject</Button>
</div>
```

---

## Component-Specific Patterns

### Cards

**Standard Card Pattern:**

```tsx
<Card className="w-full">
  <CardHeader className="p-4 md:p-6">
    <CardTitle className="text-lg md:text-xl">Title</CardTitle>
  </CardHeader>
  <CardContent className="p-4 md:p-6">{/* Content */}</CardContent>
</Card>
```

### LinkedRequestsChain (Example of Mobile-First Design)

Located at: [app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx](<../app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx>)

**Responsive Features:**

- **Mobile**: Vertical timeline with full-width cards
- **Flex wrap**: `flex-wrap` allows content to stack on small screens
- **Icon sizes**: Smaller icons on mobile (`h-3 w-3` vs `h-4 w-4`)
- **Button sizes**: `size="sm"` for mobile-friendly touch targets
- **Text sizes**: `text-xs` and `text-sm` for mobile readability

---

## Testing Checklist

When implementing responsive designs, test the following:

### Device Sizes

- [ ] Mobile (375px - iPhone SE)
- [ ] Mobile Large (414px - iPhone Pro Max)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1280px - Laptop)
- [ ] Large Desktop (1920px - Desktop Monitor)

### Interactions

- [ ] Touch targets are at least 44x44px
- [ ] Forms are usable with on-screen keyboard
- [ ] Modals/sheets close properly on mobile
- [ ] Tables scroll horizontally without breaking layout
- [ ] Navigation is accessible via hamburger menu

### Layout

- [ ] No horizontal scrolling (except intentional table scrolling)
- [ ] Text is readable without zooming
- [ ] Images scale properly
- [ ] Spacing is consistent across breakpoints

---

## Common Pitfalls

### ❌ Don't Do This:

```tsx
// Fixed widths break on mobile
<div className="w-96">Content</div>

// Desktop-only design
<div className="grid grid-cols-4">Cards</div>

// Tiny touch targets
<Button size="xs">Click</Button>
```

### ✅ Do This Instead:

```tsx
// Responsive widths
<div className="w-full md:w-96">Content</div>

// Mobile-first grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">Cards</div>

// Accessible touch targets
<Button size="sm" className="min-h-[44px] min-w-[44px]">Click</Button>
```

---

## Utilities

### useIsMobile Hook

Located at: [hooks/use-mobile.ts](../hooks/use-mobile.ts)

**Usage:**

```tsx
import { useIsMobile } from "@/hooks/use-mobile";

export function MyComponent() {
  const isMobile = useIsMobile();

  return <div>{isMobile ? <MobileView /> : <DesktopView />}</div>;
}
```

**Note**: This hook uses `matchMedia` with a 768px breakpoint (md: breakpoint).

---

## Resources

- **Tailwind CSS Documentation**: https://tailwindcss.com/docs/responsive-design
- **shadcn/ui Components**: https://ui.shadcn.com
- **Mobile-First Design Principles**: Start with mobile, enhance for desktop
- **Touch Target Guidelines**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

---

## Future Enhancements

- **Container Queries**: When widely supported, use for more granular component-level responsiveness
- **Adaptive Images**: Implement responsive image loading for better mobile performance
- **PWA Support**: Consider Progressive Web App features for mobile users
- **Touch Gestures**: Swipe gestures for mobile-specific interactions

---

**Last Updated**: January 2026

For questions or improvements to this guide, please update this document and submit a PR.
