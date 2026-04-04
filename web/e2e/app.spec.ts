import { expect, test } from "@playwright/test";

test("chat, research tools, collaboration, settings, file explorer, and share flows work", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "API & Auth" }).click();

  const localModeSwitch = page.getByRole("switch").first();
  await localModeSwitch.click();
  await expect(page.getByText("Local Ollama service through its chat-completions interface")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("combobox", { name: "Model" })).toHaveValue(
    "qwen2.5-coder:7b"
  );
  await page.getByRole("button", { name: "Close settings" }).click();

  await page.getByRole("button", { name: "New conversation", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

  await page.getByRole("textbox", { name: "Message" }).fill("buddy status");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Stop generation" })).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByText("AG-Claw research reply via ollama on qwen2.5-coder:7b: buddy status")).toBeVisible();

  await page.getByRole("button", { name: "Comment" }).click();
  await page.getByPlaceholder("Add a comment").fill("Buddy review note");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Buddy review note")).toBeVisible();

  await page.getByRole("button", { name: "Research tools" }).click();
  await expect(page.getByRole("heading", { name: "Research Workbench" })).toBeVisible();

  await page.getByRole("button", { name: "ISA-95 Retrieval" }).click();
  await expect(page.getByText("ISA-95 Core Workflow Set")).toBeVisible();
  await page.getByRole("button", { name: "Retrieve research" }).click();
  await expect(page.getByText("Material genealogy and traceability")).toBeVisible();
  await expect(page.getByText("Datasets used")).toBeVisible();

  await page.getByRole("button", { name: "Log Slimming" }).click();
  await page.getByRole("button", { name: "Slim log" }).click();
  await expect(page.getByText("Batch=42 started by operator=anne")).toBeVisible();

  await page.getByRole("button", { name: "Orchestrate" }).click();
  await page.getByRole("button", { name: "Run orchestration" }).click();
  await expect(page.getByText("Prepared 3 research roles for model qwen2.5-coder:7b.").first()).toBeVisible();
  await expect(page.getByText("plc analyst")).toBeVisible();
  await expect(page.getByText("Check batch genealogy, state transitions, and operator acknowledgement steps.")).toBeVisible();
  await expect(page.getByText("Recent orchestration runs")).toBeVisible();
  await expect(
    page.getByText("Review the MES release flow for operator approvals and genealogy capture.").first()
  ).toBeVisible();
  await page.getByRole("button", { name: /Prepared 3 research roles for model qwen2.5-coder:7b./ }).last().click();
  await expect(page.getByText("Persisted orchestration detail")).toBeVisible();
  await expect(page.getByText("Select provider adapter implementation.")).toBeVisible();

  await page.getByRole("button", { name: "HMI Review" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "mixer-release-screen.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lm3sAAAAASUVORK5CYII=",
      "base64"
    ),
  });
  await page.getByRole("button", { name: "Interpret screen" }).click();
  await expect(page.getByText("Reviewed screen 'Mixer release screen' in research mode.")).toBeVisible();
  await expect(page.getByText("Adapter: heuristic")).toBeVisible();
  await expect(page.getByText("The interface suggests a manual or override-capable operating mode.")).toBeVisible();
  await expect(page.getByText("Attached screenshot received: mixer-release-screen.png.")).toBeVisible();
  await page.getByRole("button", { name: "Close research workbench" }).click();

  await page.getByRole("button", { name: "Files" }).click();
  await expect(page.getByText("Loading files...")).not.toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "buddy" }).click();
  await page.getByRole("button", { name: "companion.ts" }).click();
  await expect(page.getByText("companion.ts").first()).toBeVisible();
  await expect(page.getByText("companionUserId")).toBeVisible();

  await page.getByRole("banner").getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("heading", { name: "Share Conversation" })).toBeVisible();
  await page.getByRole("button", { name: "Create share link" }).click();

  const shareUrl = await page.locator("input[readonly]").last().inputValue();
  expect(shareUrl).toContain("/share/");

  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: "New conversation" })).toBeVisible();
  await expect(page.getByText("AG-Claw research reply via ollama on qwen2.5-coder:7b: buddy status")).toBeVisible();
});
