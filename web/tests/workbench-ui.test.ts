import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workbenchClient = path.resolve(__dirname, "../app/workbench/workbench-client.tsx");
const workbenchStyles = path.resolve(__dirname, "../app/workbench/workbench.module.css");

describe("DISHA Workbench UI", () => {
  it("uses real governed APIs instead of the demo engine", () => {
    const source = fs.readFileSync(workbenchClient, "utf8");

    expect(source).toContain("/api/v1/agentic/mission");
    expect(source).toContain("/api/v1/evidence/");
    expect(source).toContain("GovernedExtensionResult");
    expect(source).not.toContain('from "./demo-engine"');
  });

  it("keeps the premium civic design system", () => {
    const css = fs.readFileSync(workbenchStyles, "utf8");

    expect(css).toContain("#f8f5f0");
    expect(css).toContain("#2c2823");
    expect(css).toContain("#b85c38");
    expect(css).toContain("#6b6f4e");
    expect(css).not.toContain("glass");
    expect(css).not.toContain("cyber");
  });
});
