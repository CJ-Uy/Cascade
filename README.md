# Cascade

<p align="center">
  <strong>Digital Mass Document Approval and Review System</strong>
</p>

<p align="center">
  A multi-tenant workflow management system for handling document requests through configurable approval workflows across multiple organizations and business units.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a> ·
  <a href="#documentation"><strong>Documentation</strong></a>
</p>

---

## Features

### Core Capabilities

- **Multi-Tenant Architecture**: Support for multiple organizations and business units with isolated data
- **Dynamic Form Builder**: Create custom forms with various field types (text, number, file upload, tables, repeaters)
- **Workflow Engine**: Multi-section approval workflows with configurable steps and roles
- **Request Chain Linking**: Automatic progression through multi-stage workflows with parent request tracking
- **Role-Based Access Control**: 4-tier hierarchical permission system (System → Organization → Business Unit → User)
- **Approval System**: Comprehensive approval queue with multiple action options (approve, reject, send back, clarification)
- **Audit Trail**: Complete request history with all actions, comments, and status changes
- **Document Tagging**: Categorize and filter documents with custom tags
- **Real-Time Messaging**: Built-in chat system for private and group communications
- **File Attachments**: Integrated file upload system with Supabase Storage
- **Notifications**: In-app notification system for important events

### User Roles

- **Super Admin**: System-wide access across all organizations
- **Organization Admin**: Manage organization, business units, and users
- **BU Admin**: Manage business unit workflows, forms, and employees
- **Approver**: Review and approve requests
- **Member**: Create and track own requests
- **Auditor**: Read-only access for compliance and auditing

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with cookie-based sessions
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Forms**: [react-hook-form](https://react-hook-form.com/) + [zod](https://zod.dev/)
- **Tables**: [@tanstack/react-table](https://tanstack.com/table)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm or yarn
- Supabase account

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/Cascade.git
   cd Cascade
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
   ```

4. **Set up the database**

   ```bash
   npm run db:setup
   ```

   Or manually apply migrations in your Supabase dashboard.

5. **Run the development server**

   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint

npm run db:setup # Initial database setup
npm run db:reset # Reset database
npm run db:push  # Push schema changes
```

## Deployment

### Docker Deployment

Cascade includes production-ready Docker configuration for containerized deployments.

**Quick Start with Docker:**

```bash
# Build the image
docker build -t cascade-app \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-key \
  .

# Run the container
docker run -p 3000:3000 cascade-app
```

**With Docker Compose:**

```bash
# Create .env.local with your Supabase credentials
cp .env.example .env.local

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f
```

### Coolify Deployment

Cascade is optimized for [Coolify](https://coolify.io) deployment.

**Quick Setup:**

1. Create new application in Coolify
2. Connect your Git repository
3. Set environment variables (see [COOLIFY_QUICK_START.md](COOLIFY_QUICK_START.md))
4. Deploy!

See detailed instructions in:
- **[docs/COOLIFY_QUICK_START.md](docs/COOLIFY_QUICK_START.md)** - 5-minute deployment guide
- **[docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)** - Comprehensive Docker documentation

### Vercel Deployment

While Cascade can be deployed to Vercel, it's primarily designed for Docker/Coolify deployment due to its multi-tenant architecture and database requirements.

For Vercel deployment, ensure you:
1. Set up Supabase project
2. Configure environment variables
3. Use the Vercel CLI or GitHub integration

## Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

### Core Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project overview and development guidelines
- **[docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)** - High-level system design
- **[docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** - Complete database reference
- **[docs/RPC_FUNCTIONS.md](docs/RPC_FUNCTIONS.md)** - Backend functions documentation
- **[docs/RLS_POLICIES.md](docs/RLS_POLICIES.md)** - Security policies
- **[docs/ENHANCED_APPROVAL_SYSTEM.md](docs/ENHANCED_APPROVAL_SYSTEM.md)** - Approval workflow guide
- **[docs/FILE_UPLOADS.md](docs/FILE_UPLOADS.md)** - File upload patterns

### Deployment Documentation

- **[docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)** - Docker deployment guide
- **[docs/COOLIFY_QUICK_START.md](docs/COOLIFY_QUICK_START.md)** - Coolify quick start
- **[.github/workflows/docker-build.yml](.github/workflows/docker-build.yml)** - CI/CD pipeline

### Additional Resources

See [docs/README.md](docs/README.md) for the complete documentation index.

## Project Structure

```
Cascade/
├── app/                      # Next.js App Router
│   ├── (main)/              # Protected routes with sidebar
│   │   ├── dashboard/       # User dashboard
│   │   ├── requests/        # Request management
│   │   ├── approvals/       # Approval queue
│   │   ├── management/      # BU Admin features
│   │   ├── admin/           # Super Admin features
│   │   ├── organization-admin/ # Organization Admin features
│   │   ├── auditor/         # Auditor views
│   │   └── chat/            # Messaging system
│   ├── auth/                # Authentication pages
│   └── api/                 # API endpoints
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── nav/                 # Navigation components
│   └── chat/                # Chat components
├── lib/                     # Utilities and helpers
│   ├── supabase/           # Supabase clients
│   ├── auth-helpers.ts     # Authentication utilities
│   └── database.types.ts   # TypeScript types
├── supabase/               # Database migrations
│   └── migrations/
├── docs/                    # Documentation
├── Dockerfile              # Production Docker configuration
├── docker-compose.yml      # Docker Compose configuration
└── .dockerignore           # Docker ignore rules
```

## Environment Variables

Required environment variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key

# Optional
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

See [.env.example](.env.example) for complete configuration template.

## Security

Cascade implements multiple security layers:

- **Row Level Security (RLS)**: Database-level access control via Supabase
- **Role-Based Access Control**: 4-tier hierarchical permissions
- **Server-Only Operations**: Admin operations restricted to server actions
- **Non-Root Container**: Docker container runs as non-root user (UID 1001)
- **Environment Isolation**: Secrets managed via environment variables
- **Audit Trail**: Complete logging of all actions

See [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md) for security policy details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow the coding conventions outlined in [CLAUDE.md](CLAUDE.md).

## License

[Your License Here]

## Support

For issues and questions:

- **Docker Deployment**: See [docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)
- **Coolify Setup**: See [docs/COOLIFY_QUICK_START.md](docs/COOLIFY_QUICK_START.md)
- **Application Issues**: Check [CLAUDE.md](CLAUDE.md) and [docs/](docs/)
- **Bug Reports**: Open an issue on GitHub

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org) by Vercel
- [Supabase](https://supabase.com)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com)
- [Coolify](https://coolify.io) deployment platform

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Status**: Production Ready
