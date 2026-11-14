import { UserAvatar } from "@/components/user-avatar";
import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AVATAR_GRADIENTS,
  AVATAR_GRADIENT_CLASS,
  avatarGradientStyle,
  gradientAvatarValue,
  resolveAvatar,
} from "@/lib/avatar";
import { authClient } from "@/lib/auth-client";
import { chooseAvatar, useOptimisticAvatar } from "@/lib/optimistic-avatar";
import { uploadProfilePhoto } from "@/lib/profile-avatar";
import { cn } from "@/lib/utils";

const TILE_CLASS =
  "relative size-9 shrink-0 overflow-hidden rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// Display a cool-to-warm sweep without changing the catalog order used for
// stable automatic avatar assignments.
const PICKER_GRADIENTS = [
  "nebula",
  "glacier",
  "aurora",
  "lagoon",
  "meadow",
  "citrus",
  "amber",
  "ember",
  "terracotta",
  "coral",
  "sunset",
  "orchid",
  "dusk",
  "slate",
].map((id) => AVATAR_GRADIENTS.find((gradient) => gradient.id === id)!);

/**
 * Lets the user pick their avatar. A choice is stored on `user.avatar` and
 * beats the Google picture; picking "Google photo" clears it so the avatar
 * follows the provider again.
 */
export function AvatarPicker() {
  const { data } = authClient.useSession();
  const user = data?.user;
  const choice = useOptimisticAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionVersion = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const activeUserId = user?.id;
    const cancelPendingUpload = () => {
      if (!activeUserId) return;
      selectionVersion.current++;
      uploadController.current?.abort();
    };
    return cancelPendingUpload;
  }, [user?.id]);

  if (!user) return null;
  const userId = user.id;
  const persistedAvatar = user.avatar ?? "";

  const activeAvatar =
    choice.userId === user.id && choice.avatar !== null
      ? choice.avatar
      : user.avatar;
  const resolved = resolveAvatar({ ...user, avatar: activeAvatar });
  const googleSelected =
    resolved.kind === "image" && resolved.src === user.image;
  const selectedGradientId =
    resolved.kind === "gradient" ? resolved.gradient.id : null;
  const uploadedAvatar =
    activeAvatar?.startsWith("upload:") && resolved.kind === "image"
      ? resolved.src
      : null;

  function selectAvatar(avatar: string) {
    selectionVersion.current++;
    setUploadError(null);
    chooseAvatar(userId, avatar, persistedAvatar);
  }

  async function uploadPhoto(file: File) {
    const version = ++selectionVersion.current;
    setUploadError(null);
    setUploading(true);
    const controller = new AbortController();
    uploadController.current = controller;
    try {
      const avatar = await uploadProfilePhoto(file, controller.signal);
      if (version === selectionVersion.current) {
        chooseAvatar(userId, avatar, persistedAvatar);
      }
    } catch (error) {
      if (version === selectionVersion.current) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Could not upload this photo.",
        );
      }
    } finally {
      if (uploadController.current === controller) {
        uploadController.current = null;
        setUploading(false);
      }
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 bg-card px-4 py-4 sm:px-5">
        <UserAvatar
          className="size-14"
          name={user.name || user.email}
          user={user}
        />
        <div>
          <h4 className="text-sm font-medium">Avatar</h4>
          <p className="text-sm text-muted-foreground">
            {user.image
              ? "Use your Google photo, upload one, or pick a gradient."
              : "Upload a photo or pick a gradient."}
          </p>
        </div>
      </div>
      <div className="rounded-t-lg border-t border-border/70 bg-background px-4 py-4 sm:px-5">
        <div
          aria-label="Avatar"
          className="flex flex-wrap gap-3 p-0.5"
          role="radiogroup"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            const radios = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="radio"]',
              ),
            );
            const index = radios.indexOf(event.target as HTMLButtonElement);
            if (index === -1) return;
            let next: number;
            switch (event.key) {
              case "ArrowRight":
              case "ArrowDown":
                next = (index + 1) % radios.length;
                break;
              case "ArrowLeft":
              case "ArrowUp":
                next = (index - 1 + radios.length) % radios.length;
                break;
              case "Home":
                next = 0;
                break;
              case "End":
                next = radios.length - 1;
                break;
              default:
                return;
            }
            event.preventDefault();
            radios[next].focus();
            radios[next].click();
          }}
        >
          {user.image ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-checked={googleSelected}
                    aria-label="Google photo"
                    tabIndex={googleSelected ? 0 : -1}
                    className={cn(
                      TILE_CLASS,
                      googleSelected &&
                        "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    onClick={() => selectAvatar("")}
                    role="radio"
                    type="button"
                  />
                }
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                  src={user.image}
                />
              </TooltipTrigger>
              <TooltipContent>Google photo</TooltipContent>
            </Tooltip>
          ) : null}
          {PICKER_GRADIENTS.map((gradient) => {
            const selected = selectedGradientId === gradient.id;
            return (
              <Tooltip key={gradient.id}>
                <TooltipTrigger
                  render={
                    <button
                      aria-checked={selected}
                      aria-label={gradient.label}
                      tabIndex={selected ? 0 : -1}
                      className={cn(
                        TILE_CLASS,
                        AVATAR_GRADIENT_CLASS,
                        selected &&
                          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                      )}
                      onClick={() =>
                        selectAvatar(gradientAvatarValue(gradient.id))
                      }
                      role="radio"
                      style={avatarGradientStyle(gradient)}
                      type="button"
                    />
                  }
                />
                <TooltipContent>{gradient.label}</TooltipContent>
              </Tooltip>
            );
          })}
          {uploadedAvatar ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-checked="true"
                    aria-label="Your photo"
                    className={cn(
                      TILE_CLASS,
                      "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    role="radio"
                    tabIndex={0}
                    type="button"
                  />
                }
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  src={uploadedAvatar}
                />
              </TooltipTrigger>
              <TooltipContent>Your photo</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={
                    uploading
                      ? "Uploading profile photo"
                      : "Upload a profile photo"
                  }
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted p-0 text-muted-foreground hover:bg-foreground/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  type="button"
                />
              }
            >
              {uploading ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="size-4 motion-safe:animate-spin"
                />
              ) : (
                <PlusIcon aria-hidden="true" className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>Upload a profile photo</TooltipContent>
          </Tooltip>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadPhoto(file);
          }}
        />
        {uploadError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {uploadError}
          </p>
        ) : null}
        {choice.userId === user.id && choice.error ? (
          <p className="text-sm text-destructive" role="alert">
            {choice.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
