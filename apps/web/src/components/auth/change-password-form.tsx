import { useRef, useState, type FormEvent } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthFeedback } from "@/components/auth/password-strength-feedback";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function clearFeedback() {
    setError(null);
    setSuccess(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    clearFeedback();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current password.");
      return;
    }

    submitting.current = true;
    setPending(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        setError(
          error.code === "INVALID_PASSWORD"
            ? "Your current password is incorrect."
            : (error.message ??
                "Unable to change your password. Please try again."),
        );
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      setError("Unable to change your password. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <div className="px-4 py-4 sm:px-5">
        <h4 id="change-password-heading" className="text-sm font-medium">
          Password
        </h4>
        <p
          id="change-password-description"
          className="text-sm text-muted-foreground"
        >
          Changing your password signs you out on other devices.
        </p>
      </div>
      <form
        aria-labelledby="change-password-heading"
        aria-describedby="change-password-description"
        aria-busy={pending}
        className="space-y-4 rounded-t-lg border-t border-border/70 bg-background px-4 py-4 sm:px-5"
        onSubmit={(event) => void changePassword(event)}
      >
        <PasswordField
          label="Current password"
          id="settings-current-password"
          name="currentPassword"
          autoComplete="current-password"
          required
          disabled={pending}
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            clearFeedback();
          }}
        />
        <div>
          <PasswordField
            label="New password"
            id="settings-new-password"
            name="newPassword"
            autoComplete="new-password"
            aria-describedby={newPassword ? "password-feedback" : undefined}
            minLength={8}
            maxLength={128}
            required
            disabled={pending}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearFeedback();
            }}
            onFocus={() => setNewPasswordFocused(true)}
            onBlur={() => setNewPasswordFocused(false)}
          />
          <PasswordStrengthFeedback
            password={newPassword}
            email={email}
            expanded={newPasswordFocused}
          />
        </div>
        <PasswordField
          label="Confirm new password"
          id="settings-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={pending}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearFeedback();
          }}
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={
              pending || !currentPassword || !newPassword || !confirmPassword
            }
          >
            {pending ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            ) : null}
            {pending ? "Changing password…" : "Change password"}
          </Button>
        </div>
      </form>
      <p
        role="status"
        className={
          success
            ? "border-t border-border/70 px-4 py-4 text-sm text-emerald-600 sm:px-5 dark:text-emerald-400"
            : "sr-only"
        }
      >
        {success
          ? "Password changed. Your other sessions have been signed out."
          : null}
      </p>
    </div>
  );
}
