import { db } from "./index";
import { users, chatSessions, messages } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create a test admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log("Created admin user:", adminUser.email);

    // Create a sample chat session
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: adminUser.id,
        title: "Sample AdMob Query",
      })
      .returning();

    if (session) {
      // Add sample messages
      await db.insert(messages).values([
        {
          sessionId: session.id,
          role: "user",
          content: "What was my AdMob revenue yesterday?",
        },
        {
          sessionId: session.id,
          role: "assistant",
          content: "Based on your AdMob data, your revenue yesterday was $127.45 with 45,230 impressions and an eCPM of $2.82.",
          agentName: "AdMob Query Agent",
          metadata: {
            toolCalls: ["get_admob_report"],
            confidence: 0.95,
          },
        },
      ]);

      console.log("Created sample chat session with messages");
    }
  }

  console.log("Seeding completed!");
}

seed().catch(console.error);
