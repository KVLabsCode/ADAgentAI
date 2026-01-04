import { db } from "../src/db";
import { users, connectedProviders } from "../src/db/schema";
import { eq } from "drizzle-orm";

const result = await db.select({
  userId: users.id,
  email: users.email,
  provider: connectedProviders.provider,
  publisherId: connectedProviders.publisherId
}).from(users)
  .leftJoin(connectedProviders, eq(users.id, connectedProviders.userId))
  .limit(5);

console.log(JSON.stringify(result, null, 2));
process.exit(0);
