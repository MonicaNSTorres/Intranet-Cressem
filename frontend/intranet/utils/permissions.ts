import type { ScreenItem } from "@/components/search-home/search-home";

export function hasAccess(userGroups: string[], allowedGroups?: string[]) {
  if (!allowedGroups || allowedGroups.length === 0) return true;

  return allowedGroups.some((group) => userGroups.includes(group));
}

export function filterScreensByGroups(
  screens: ScreenItem[],
  userGroups: string[]
) {
  return screens.filter((screen) =>
    hasAccess(userGroups, screen.allowedGroups)
  );
}