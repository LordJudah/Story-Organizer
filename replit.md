# Media Story Organizer (StoryFlow)

## Overview

StoryFlow is an AI-powered media analysis and storytelling application that transforms unorganized photos and videos into cohesive, narrated presentations. Users upload media files, provide context through prompts, and the system uses AI to analyze content, organize it intelligently, and generate scene-by-scene narration text for professional-quality video stories.

The application follows a full-stack TypeScript architecture with React frontend, Express backend, PostgreSQL database, and integrates with OpenAI for AI capabilities and Google Cloud Storage for file uploads.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark mode default)
- **Animations**: Framer Motion for complex animations and transitions
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **File Uploads**: Uppy with AWS S3 integration for direct uploads via presigned URLs

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth via OpenID Connect with Passport.js, session-based with connect-pg-simple
- **File Storage**: Google Cloud Storage via presigned URL upload pattern
- **AI Integration**: OpenAI API (via Replit AI Integrations) for image analysis and narration generation
- **Build**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - defines all tables including users, sessions, projects, mediaItems, scenes, exports, and chat-related tables
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

### Key Data Models
- **Users**: Replit Auth managed, stores profile info
- **Projects**: User's storytelling projects with title, description, tone, status
- **MediaItems**: Uploaded photos/videos with AI-generated analysis metadata
- **Scenes**: Ordered story scenes linking to media items with narration text
- **Exports**: Generated output files from completed stories

### API Structure
- **Contract-first design**: API routes defined in `shared/routes.ts` with Zod schemas
- **RESTful endpoints**: `/api/projects`, `/api/projects/:projectId/media`, `/api/projects/:projectId/scenes`, etc.
- **Authentication**: Protected routes use `isAuthenticated` middleware
- **File uploads**: Two-step presigned URL flow via `/api/uploads/request-url`

### Replit Integrations
The application uses several Replit-specific integrations located in `server/replit_integrations/`:
- **auth/**: Replit Auth with OIDC, session storage, user management
- **object_storage/**: Google Cloud Storage wrapper with presigned URLs and ACL support
- **chat/**: Conversational AI interface with OpenAI streaming
- **image/**: Image generation and editing with OpenAI gpt-image-1 model
- **batch/**: Batch processing utilities with rate limiting and retries for LLM calls

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect authentication via Replit's identity provider
- **PostgreSQL**: Database (provisioned via Replit, connection via DATABASE_URL)
- **Google Cloud Storage**: File storage via Replit Object Storage integration
- **OpenAI API**: AI capabilities accessed through Replit AI Integrations (uses AI_INTEGRATIONS_OPENAI_API_KEY and AI_INTEGRATIONS_OPENAI_BASE_URL environment variables)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OIDC issuer URL (defaults to https://replit.com/oidc)
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key from Replit integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI base URL from Replit integrations

### Key NPM Dependencies
- **Frontend**: react, wouter, @tanstack/react-query, framer-motion, react-hook-form, @uppy/core, shadcn/ui components
- **Backend**: express, drizzle-orm, passport, openid-client, @google-cloud/storage, openai
- **Shared**: zod, drizzle-zod for schema validation