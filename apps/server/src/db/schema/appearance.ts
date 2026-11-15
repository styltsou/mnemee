import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { AppearanceChanges } from "@/dto/appearance.dto";
import { user } from "./auth";

export const userAppearance = pgTable("user_appearance", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferences: jsonb("preferences").$type<AppearanceChanges>().notNull(),
  revision: integer("revision").default(1).notNull(),
});
