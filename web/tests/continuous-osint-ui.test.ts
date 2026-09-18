import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("continuous intelligence source mesh UI", () => {
  it("surfaces governed watch state and safe bundle creation", () => {
    const root=path.resolve(__dirname,"..");
    const source=fs.readFileSync(path.join(root,"app/intelligence/intelligence-client.tsx"),"utf8");
    expect(source).toContain("Continuous source mesh");
    expect(source).toContain("/api/v1/osint/watch-bundles");
    expect(source).toContain("Domain intelligence");
    expect(source).toContain("Company intelligence");
    expect(source).toContain("Defensive vulnerability");
    expect(source).toContain("Active watches");
    expect(source).toContain("Watch failures");
  });
});
