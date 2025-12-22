# Cascade Documentation

**Last Updated:** 2025-12-22

Welcome to the comprehensive documentation for the Cascade project - a Digital Mass Document Approval and Review System built with Next.js 15, React 19, Supabase, and TypeScript.

## 📚 Documentation Index

### Core Documentation

- **[System Architecture](./SYSTEM_ARCHITECTURE.md)** ⭐
  Comprehensive overview of the application's architecture, including database schema, key patterns, and file structure. **Start here** for a high-level understanding.

- **[API Reference](./API_REFERENCE.md)**
  Overview of the API surface including RPC functions, REST endpoints, and server actions.

- **[Changelog](./CHANGELOG.md)**
  Version history, major changes, schema restructures, and feature updates.

### Technical Reference

- **[Database Schema](./DATABASE_SCHEMA.md)** 📊
  Complete database schema reference with all tables, fields, relationships, enums, indexes, and foreign key constraints. Includes query examples and schema evolution notes.

- **[RPC Functions](./RPC_FUNCTIONS.md)** 🔧
  Exhaustive reference for all Supabase RPC (Remote Procedure Call) functions including authentication, permissions, request operations, workflows, and auditing.

- **[RLS Policies](./RLS_POLICIES.md)** 🔒
  Row Level Security policies documentation covering multi-tenancy enforcement, permission hierarchies, and security best practices.

### Feature Documentation

- **[Auditor Views PRD](./auditor-views-prd.md)** 📋
  Product Requirements Document for the Auditor Views feature, including access control, tag management, and audit trails.

---

## Quick Start

### For New Developers

1. Read [System Architecture](./SYSTEM_ARCHITECTURE.md) for overall understanding
2. Review [Database Schema](./DATABASE_SCHEMA.md) to understand data model
3. Check [RPC Functions](./RPC_FUNCTIONS.md) for available backend operations
4. See [RLS Policies](./RLS_POLICIES.md) for security implementation

### For Feature Development

1. Understand the **request/workflow** model in System Architecture
2. Review relevant **RPC functions** in RPC_FUNCTIONS.md
3. Check **RLS policies** for your tables in RLS_POLICIES.md
4. Follow established patterns from System Architecture

### For Security Audits

1. Review RLS Policies - All security policies
2. Check RPC Functions - Function-level access control
3. Verify Database Schema - Foreign key cascades and constraints

---

## Key Concepts

### Architecture Overview

- **Forms**: Reusable templates with dynamic fields
- **Workflow Chains**: Multi-section approval processes (sections executed in order)
- **Requests**: User-submitted form instances that flow through workflows
- **Scope System**: BU/ORGANIZATION/SYSTEM level resource visibility

### Permission Model (4-Tier Hierarchy)

1. **System Level** - Super Admin, AUDITOR (global access)
2. **Organization Level** - Organization Admin (all BUs in org)
3. **Business Unit Level** - BU Admin (specific BU management)
4. **Membership Level** - Member, Approver, Auditor (BU-specific)

See [RLS_POLICIES.md](./RLS_POLICIES.md) for details.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Row Level Security
- **Styling**: Tailwind CSS 4, shadcn/ui
- **State**: React Context + Server Components
- **Forms**: react-hook-form + zod
- **Tables**: @tanstack/react-table
- **Real-time**: Supabase subscriptions (Chat)

---

## Recent Changes (December 2024)

- ✅ **Workflow Chains Architecture** - Multi-section workflows replacing single workflows
- ✅ **Request System** - Replaced "documents/requisitions" with unified "requests"
- ✅ **Form Fields Enhancement** - Added `repeater`, `grid-table` field types
- ✅ **Auditor System** - System and BU-level auditors with tag management
- ✅ **Deprecated Tables** - Removed `workflow_form_mappings`, `form_initiator_access`

See [CHANGELOG.md](./CHANGELOG.md) for complete history.

---

## Documentation Maintenance

When making significant changes, update:

1. Relevant doc files (Schema, RPC, RLS, etc.)
2. CHANGELOG.md with version/date
3. SYSTEM_ARCHITECTURE.md if architecture changes
4. This README if structure changes

---

**For questions or clarifications, please open an issue or contact the development team.**
