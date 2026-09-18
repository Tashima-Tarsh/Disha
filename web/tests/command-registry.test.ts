import { describe, expect, it } from "vitest";

import { dishaCommands, searchDishaCommands } from "../lib/command-registry";

describe("DISHA universal command registry", () => {
  it("contains the requested intelligence command families without arbitrary execution", () => {
    const triggers = dishaCommands.map((command) => command.trigger);
    expect(triggers).toEqual(expect.arrayContaining([
      "/mission new",
      "/mission compare",
      "/map india",
      "/map heat",
      "/geo district",
      "/geo radius",
      "/source registry",
      "/source probe",
      "/evidence chain",
      "/evidence verify",
      "/claim trace",
      "/entity profile",
      "/graph route",
      "/timeline playback",
      "/alert region",
      "/watch entity",
      "/report geojson",
      "/review approve",
      "/policy evaluate",
      "/search all",
      "/system geodata-status",
      "/system rebuild-index",
    ]));
    expect(new Set(dishaCommands.map((command) => command.id)).size).toBe(dishaCommands.length);
    expect(dishaCommands.every((command) => command.trigger.startsWith("/"))).toBe(true);
    expect(dishaCommands.every((command) => ["read", "governed_write", "review_required"].includes(command.safety))).toBe(true);
    expect(triggers.join(" ")).not.toMatch(/exploit|payload|persistence|exfiltrat|credential dump/i);
  });

  it("only marks commands ready when a concrete navigation surface exists", () => {
    const ready = dishaCommands.filter((command) => command.availability === "ready");
    expect(ready.length).toBeGreaterThan(0);
    expect(ready.every((command) => Boolean(command.href))).toBe(true);
    expect(dishaCommands.find((command) => command.trigger === "/map india")?.href).toBe("/dashboard#map");
    expect(dishaCommands.find((command) => command.trigger === "/evidence chain")?.href).toBe("/dashboard#evidence");
  });

  it("searches by slash command, label and domain", () => {
    expect(searchDishaCommands("/geo").some((command) => command.trigger === "/geo radius")).toBe(true);
    expect(searchDishaCommands("ledger").some((command) => command.trigger === "/evidence ledger")).toBe(true);
    expect(searchDishaCommands("governance").some((command) => command.trigger === "/policy evaluate")).toBe(true);
  });
});
