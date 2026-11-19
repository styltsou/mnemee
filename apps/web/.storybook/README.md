# Component workshop

From the repository root, run `bun run --cwd apps/web storybook`, then open http://localhost:6006.
Build a static copy with `bun run --cwd apps/web build-storybook`.

UI → Button includes controls, all variants, sizes, ordinary disabled states, icon buttons, and an interruptible transition demo. Clicking Playground, With Icon, Icon Only, or the idle Variants/Sizes buttons simulates a two-second request and then restores the idle state. Switch light/dark using the theme toolbar. Use the system reduced-motion setting to check the fade-only treatment.

For a server-confirmed action, pass `pending={isPending}` in both idle and pending states. The component reserves spinner space, keeps its label, disables itself, and sets `aria-busy`. Keep `disabled` for validation and other unrelated blocking conditions. Do not pass `pending` to optimistic actions: their visible result is immediate and their progress belongs with the resulting content.

The workshop uses the application's actual CSS and shared components, without the router, auth, or deployment plugins. Stories have their own TypeScript project to keep tooling types out of the app.

Additional stories cover Input, Textarea, Checkbox, Switch, Select, Tabs, ButtonGroup, Dialog, AlertDialog, Tooltip, Progress, and Avatar. Form controls include disabled/invalid states where supported. Dialog actions only affect story-local state. The theme is applied to the preview document so portalled dialogs, menus, and tooltips follow it too.
