import { z } from "zod";

const AppearanceSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  canvasPattern: z.enum(["none", "dots", "lines", "cross"]),
  assetNamesAlwaysVisible: z.boolean(),
  assetNamePosition: z.enum(["inside-top", "inside-bottom", "above", "below"]),
});

const AppearanceChangesSchema = AppearanceSchema.partial()
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);

export const UpdateAppearanceSchema = z.strictObject({
  userId: z.string().min(1),
  changes: AppearanceChangesSchema,
});

export type AppearanceChanges = z.infer<typeof AppearanceChangesSchema>;
