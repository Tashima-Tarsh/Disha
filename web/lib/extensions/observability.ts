type ExtensionObservation = {
  extensionId: string;
  missionId: string;
  stage: string;
  status: "success" | "failure" | "skipped";
  details?: Record<string, unknown>;
};

export function recordExtensionObservation(observation: ExtensionObservation): void {
  console.info(JSON.stringify({
    type: "governed_extension",
    ts: new Date().toISOString(),
    ...observation,
  }));
}
