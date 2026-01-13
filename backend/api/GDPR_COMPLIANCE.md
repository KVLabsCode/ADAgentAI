# GDPR Compliance - Account Deletion

## Overview
When a user requests account deletion, we implement a GDPR-compliant approach that:
1. ✅ Deletes ALL personal data immediately
2. ✅ Retains anonymized aggregate statistics for business analytics
3. ✅ Complies with GDPR Article 89 (statistical purposes) and Recital 26

## What Gets Deleted (PII Removal)

All personal data is permanently deleted:

- ✅ Chat conversations and messages
- ✅ Connected provider credentials (OAuth tokens)
- ✅ Email addresses
- ✅ Names
- ✅ IP addresses (from sessions)
- ✅ Usage timestamps linked to user
- ✅ Organization memberships
- ✅ User preferences and settings
- ✅ LangGraph conversation checkpoints

## What Gets Anonymized (Retained for Compliance)

- ✅ Admin audit logs - User IDs replaced with `"deleted_user"`
  - **Legal Basis**: GDPR Article 6(1)(f) - Legitimate interest in security monitoring

## What Gets Retained (Aggregate Statistics - No PII)

We retain **anonymized aggregate data** in the `deleted_users` table:

```typescript
{
  anonymousId: "random-uuid",  // NOT the original user ID
  accountCreatedAt: "2024-01-15",  // Only month/year for cohort analysis
  accountDeletedAt: "2024-06-20",
  accountLifetimeDays: 156,
  totalChatSessions: 23,
  totalMessages: 145,
  totalTokensUsed: 50000,
  totalApiCalls: 67,
  hadConnectedProviders: true,
  wasOrgMember: false,
  acceptedTos: true,
  deletionReason: "user_requested"
}
```

### Why This Is GDPR Compliant

**GDPR Recital 26** states:
> "The principles of data protection should therefore not apply to anonymous information, namely information which does not relate to an identified or identifiable natural person"

**GDPR Article 89** allows:
> "Processing for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes"

### What Makes This Data Anonymous?

1. **No identifiers**: No email, name, user ID, or any way to link back to a person
2. **Random ID**: Uses a completely new random UUID, not derived from user data
3. **Aggregate only**: Only counts and boolean flags, no individual behavior tracking
4. **No re-identification**: Impossible to identify who this data belonged to

### Use Cases for Retained Data

This allows us to answer legitimate business questions:

- ✅ "How many total users have ever tried our product?" (including deleted accounts)
- ✅ "What's the average account lifetime before deletion?"
- ✅ "What percentage of users connect providers before deleting?"
- ✅ "Monthly deletion rate trends"

We **CANNOT** answer:
- ❌ "Who deleted their account?"
- ❌ "What did [specific user] do before deleting?"
- ❌ "Contact information for deleted users"

## Implementation

See [backend/api/src/routes/account.ts:L143-L340](backend/api/src/routes/account.ts) for the full implementation.

### Database Schema

```sql
CREATE TABLE deleted_users (
  id UUID PRIMARY KEY,
  anonymous_id TEXT UNIQUE NOT NULL,  -- Random, not derived from user
  account_created_at TIMESTAMP,
  account_deleted_at TIMESTAMP NOT NULL,
  account_lifetime_days INTEGER,
  total_chat_sessions INTEGER,
  total_messages INTEGER,
  total_tokens_used INTEGER,
  total_api_calls INTEGER,
  had_connected_providers BOOLEAN,
  was_org_member BOOLEAN,
  accepted_tos BOOLEAN,
  deletion_reason VARCHAR(50),
  created_at TIMESTAMP
);
```

## Compliance Review Checklist

- ✅ Personal data deleted within 30 days (we do it immediately)
- ✅ Deletion logs maintained for audit trail
- ✅ Anonymous data cannot be re-identified
- ✅ Legal basis documented (GDPR Article 89, Recital 26)
- ✅ Data minimization principle applied
- ✅ User rights respected (access, portability, erasure)
- ✅ Transparent communication (deletion dialog explains what's retained)

## Privacy Policy Updates Required

Your privacy policy should include:

> When you delete your account, all personal data is permanently deleted. We retain anonymized, aggregate statistics (such as total number of users who have used our service) for legitimate business purposes. This anonymous data cannot be used to identify you and complies with GDPR Article 89 and Recital 26.

## Questions?

For GDPR compliance questions, consult with your DPO or legal counsel.
