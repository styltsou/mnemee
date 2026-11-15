import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userAppearance } from "@/db/schema";
import { UpdateAppearanceSchema } from "@/dto/appearance.dto";
import { factory } from "@/factory";
import { AppError, ErrorCode } from "@/lib/errors";
import { success } from "@/lib/response";
import { authMiddleware } from "@/middleware";
import { validate } from "@/middleware/validate";

const appearanceRoutes = factory
  .createApp()
  .use("/me/appearance", authMiddleware)
  .get("/me/appearance", async (c) => {
    c.header("Cache-Control", "no-store");
    const userId = c.get("userId");
    const [row] = await db
      .select()
      .from(userAppearance)
      .where(eq(userAppearance.userId, userId));

    return c.json(success(row ?? { userId, preferences: {}, revision: 0 }));
  })
  .patch("/me/appearance", validate.body(UpdateAppearanceSchema), async (c) => {
    c.header("Cache-Control", "no-store");
    const userId = c.get("userId");
    const input = c.req.valid("json");
    if (input.userId !== userId) {
      throw new AppError(ErrorCode.CONFLICT, "The signed-in account changed.");
    }

    const [row] = await db
      .insert(userAppearance)
      .values({ userId, preferences: input.changes })
      .onConflictDoUpdate({
        target: userAppearance.userId,
        set: {
          preferences: sql`${userAppearance.preferences} || excluded.preferences`,
          revision: sql`${userAppearance.revision} + 1`,
        },
      })
      .returning();

    return c.json(success(row));
  });

export default appearanceRoutes;
