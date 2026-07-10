import type { GovernedExtension } from "./contracts";
import { vyuhaDefenseExtension } from "./vyuha-defense";

export const governedExtensionRegistry: Record<string, GovernedExtension> = {
  [vyuhaDefenseExtension.id]: vyuhaDefenseExtension,
};

export function listGovernedExtensions(): GovernedExtension[] {
  return Object.values(governedExtensionRegistry);
}
