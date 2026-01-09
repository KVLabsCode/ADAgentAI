# ADAgentAI Setup Instructions

This document covers the configuration needed for organization invites, email sending, and Google Contacts integration.

## Table of Contents
1. [Neon Auth Email Configuration](#neon-auth-email-configuration)
2. [Resend Setup (Waitlist)](#resend-setup-waitlist)
3. [Google Contacts API Integration](#google-contacts-api-integration)
4. [Environment Variables Summary](#environment-variables-summary)

---

## Neon Auth Email Configuration

Neon Auth handles organization invites via its managed service. **Email delivery for organization invites is managed by Neon's platform** - you configure it in the Neon Dashboard.

### Steps to Configure

1. **Go to your Neon Dashboard**: https://console.neon.tech
2. **Navigate to your project** > **Auth** tab
3. **Configure Email Settings**:
   - Neon Auth can send invite emails automatically
   - Customize the email template if needed
   - Verify your domain for better deliverability

### How It Works

When you call `authClient.organization.inviteMember()`:
1. Neon Auth creates an invitation record in the `neon_auth.invitation` table
2. An email is sent to the invitee with an accept link
3. The invitee clicks the link and signs in with Google
4. They're automatically added to the organization

### Checking Invitation Status

```typescript
// List pending invitations
const { data } = await authClient.organization.listInvitations({
  query: { organizationId: "org-id" }
});

// Cancel an invitation
await authClient.organization.cancelInvitation({
  invitationId: "invite-id"
});

// Resend = cancel + re-invite
await authClient.organization.cancelInvitation({ invitationId: "old-id" });
await authClient.organization.inviteMember({ email: "user@gmail.com", role: "member" });
```

---

## Resend Setup (Waitlist)

Resend is already configured for waitlist emails in `backend/api/src/lib/email.ts`.

### Configuration

1. **Get a Resend API Key**: https://resend.com/api-keys
2. **Add to environment**:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   FROM_EMAIL=ADAgent <noreply@yourdomain.com>
   ```

3. **Verify your domain in Resend** for production use

### Current Email Templates

- `waitlistConfirmationEmail()` - Sent when user joins waitlist
- `waitlistInviteEmail()` - Sent when admin invites user from waitlist

### Waitlist Admin Endpoints

```bash
# Invite a single user
POST /api/waitlist/admin/invite
{ "email": "user@example.com" }

# Bulk invite
POST /api/waitlist/admin/invite-bulk
{ "emails": ["user1@example.com", "user2@example.com"] }

# List waitlist
GET /api/waitlist/admin/list?status=pending&limit=50
```

---

## Google Contacts API Integration

**Status: Partially Implemented**

To enable contact autocomplete for invites, you need to add the Google People API scope.

### Required Scope

```
https://www.googleapis.com/auth/contacts.readonly
```

### Implementation Options

#### Option A: Separate OAuth Flow (Recommended)

Add a new provider type for contacts access:

1. **Add to OAUTH_CONFIG in `providers.ts`**:
```typescript
const OAUTH_CONFIG = {
  // ... existing
  contacts: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/contacts.readonly",
  },
};
```

2. **Create contacts endpoint**:
```typescript
// GET /api/contacts/search?q=john
// Returns Google contacts matching the query
```

3. **Frontend autocomplete**:
```typescript
// Debounced search as user types in invite field
const searchContacts = async (query: string) => {
  const res = await fetch(`/api/contacts/search?q=${query}`);
  return res.json();
};
```

#### Option B: Request Scope at Sign-in

Modify Neon Auth to request additional scopes. This requires:
1. Customizing Neon Auth configuration (may require Neon support)
2. Accessing the OAuth token from Neon Auth session

### Google People API Usage

```typescript
import { google } from 'googleapis';

const people = google.people({ version: 'v1', auth: oauth2Client });

// Search connections
const { data } = await people.people.searchContacts({
  query: 'john',
  readMask: 'names,emailAddresses',
  pageSize: 10,
});

// List connections
const { data } = await people.people.connections.list({
  resourceName: 'people/me',
  personFields: 'names,emailAddresses',
  pageSize: 100,
});
```

### Install Dependencies

```bash
cd backend/api
bun add @googleapis/people googleapis
```

---

## Environment Variables Summary

### Backend API (`backend/api/.env`)

```env
# Database
DATABASE_URL=postgresql://...

# Google OAuth (for AdMob/GAM)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Encryption (for storing tokens)
ENCRYPTION_KEY=your-32-byte-hex-key

# Internal API Key (for chat server)
INTERNAL_API_KEY=your-internal-key

# Resend (for waitlist emails)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=ADAgent <noreply@yourdomain.com>

# Polar (billing - optional)
POLAR_ACCESS_TOKEN=xxx
```

### Frontend (`frontend/.env`)

```env
# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_COPILOTKIT_URL=http://localhost:5000/copilotkit

# Neon Auth
NEON_AUTH_BASE_URL=https://xxx.auth.neon.tech
NEXT_PUBLIC_NEON_AUTH_URL=https://xxx.auth.neon.tech

# Sanity (blog)
NEXT_PUBLIC_SANITY_PROJECT_ID=xxx
NEXT_PUBLIC_SANITY_DATASET=production
```

---

## What's Already Implemented

### Organization Management (Settings Page)
- [x] Invite member with Google email validation
- [x] Pending invitations list with resend/cancel
- [x] Organization rename
- [x] Organization delete (with confirmation dialog)
- [x] Members list with role badges
- [x] Remove member functionality

### Authentication
- [x] Google OAuth via Neon Auth
- [x] Organization switching (sidebar dropdown)
- [x] Role display (owner, admin, member)

### Waitlist
- [x] Join waitlist with email
- [x] Confirmation email (via Resend)
- [x] Admin invite (manual approval)
- [x] Bulk invite

---

## Pending / Future Work

1. **Google Contacts Autocomplete**
   - Add contacts scope to OAuth
   - Create contacts search endpoint
   - Build autocomplete UI component

2. **Custom Email Templates**
   - Customize Neon Auth invite emails
   - Add organization branding

3. **Multiple Organizations**
   - Currently limited to 1 org (Neon Auth free tier)
   - Upgrade to Neon Pro for multiple orgs

4. **Email Domain Validation**
   - Currently only gmail.com supported
   - Add custom domain support when ready

---

## Troubleshooting

### Invites Not Sending
1. Check Neon Dashboard > Auth > Email settings
2. Verify email domain is configured
3. Check spam folder

### Token Refresh Issues
1. Ensure `GOOGLE_CLIENT_SECRET` is correct
2. Check if OAuth consent screen is in production mode
3. Verify refresh token is stored (check `connected_providers` table)

### Organization Limit Error
- "Maximum number of organizations reached"
- This is a Neon Auth free tier limit (1 org)
- Solution: Upgrade to Neon Pro or use the MVP message we added

---

## Quick Reference

### Neon Auth Client Methods
```typescript
// Organizations
authClient.organization.create({ name, slug })
authClient.organization.update({ data: { name }, organizationId })
authClient.organization.delete({ organizationId })
authClient.organization.setActive({ organizationId })

// Members
authClient.organization.inviteMember({ email, role })
authClient.organization.listMembers({ query: { limit: 100 } })
authClient.organization.removeMember({ memberIdOrEmail })

// Invitations
authClient.organization.listInvitations({ query: { organizationId } })
authClient.organization.cancelInvitation({ invitationId })
authClient.organization.acceptInvitation({ invitationId })

// Hooks
authClient.useSession()
authClient.useListOrganizations()
authClient.useActiveOrganization()
```

### API Endpoints
```
GET  /api/providers              - List connected providers
POST /api/providers/connect/:type - Initiate OAuth
GET  /api/providers/callback/:type - OAuth callback
DELETE /api/providers/:id        - Disconnect provider

POST /api/waitlist/join          - Join waitlist
GET  /api/waitlist/status/:email - Check status
POST /api/waitlist/admin/invite  - Invite from waitlist
```
