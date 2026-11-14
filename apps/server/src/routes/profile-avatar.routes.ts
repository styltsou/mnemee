import sharp from "sharp";
import { bodyLimit } from "hono/body-limit";

import { container } from "@/container";
import { factory } from "@/factory";
import { AppError, ErrorCode } from "@/lib/errors";
import { success } from "@/lib/response";
import { authMiddleware } from "@/middleware";

const MAX_UPLOAD_BYTES = 1024 * 1024;
const avatarIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const userIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

function objectKey(userId: string, avatarId: string) {
  return `profile-avatars/${userId}/${avatarId}.webp`;
}

const profileAvatarRoutes = factory
  .createApp()
  .post(
    "/profile/avatar",
    authMiddleware,
    bodyLimit({ maxSize: MAX_UPLOAD_BYTES }),
    async (c) => {
      const contentType = c.req.header("content-type")?.split(";")[0];
      if (
        !contentType ||
        !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
          contentType,
        )
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Choose a JPEG, PNG, WebP, or AVIF image.",
        );
      }

      const bytes = new Uint8Array(await c.req.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "The image must be smaller than 1 MB.",
        );
      }

      let image: Buffer;
      try {
        image = await sharp(bytes, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize(256, 256, { fit: "cover", position: "centre" })
          .webp({ quality: 85 })
          .toBuffer();
      } catch {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Could not read this image.",
        );
      }

      const avatarId = crypto.randomUUID();
      await container.objectStorageService.putObject({
        key: objectKey(c.get("userId"), avatarId),
        body: image,
        contentType: "image/webp",
      });
      return c.json(success({ avatar: `upload:${avatarId}` }), 201);
    },
  )
  .get("/profile/avatar/:userId/:avatarId", authMiddleware, async (c) => {
    const { userId, avatarId } = c.req.param();
    if (!userIdPattern.test(userId) || !avatarIdPattern.test(avatarId)) {
      throw new AppError(ErrorCode.NOT_FOUND, "Avatar not found.");
    }
    const image = await container.objectStorageService.getObjectBytes(
      objectKey(userId, avatarId),
    );
    return c.body(Uint8Array.from(image), 200, {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    });
  });

export default profileAvatarRoutes;
