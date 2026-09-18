export type DishaCommandGroup =
  | "Mission"
  | "Map"
  | "Geo"
  | "Source"
  | "Evidence"
  | "Claims"
  | "Entities & networks"
  | "Timeline"
  | "Alerts & watch"
  | "Reports"
  | "Governance"
  | "Search"
  | "System";

export type DishaCommandSafety = "read" | "governed_write" | "review_required";
export type DishaCommandAvailability = "ready" | "planned";

export type DishaCommand = {
  id: string;
  trigger: string;
  group: DishaCommandGroup;
  label: string;
  description: string;
  keywords: string[];
  safety: DishaCommandSafety;
  availability: DishaCommandAvailability;
  href?: string;
};

type CommandSeed = [trigger: string, label: string, description: string, href?: string];

function define(
  group: DishaCommandGroup,
  safety: DishaCommandSafety,
  availability: DishaCommandAvailability,
  seeds: CommandSeed[],
): DishaCommand[] {
  return seeds.map(([trigger, label, description, href]) => ({
    id: trigger.slice(1).replaceAll(" ", "."),
    trigger,
    group,
    label,
    description,
    keywords: [...new Set([group.toLowerCase(), ...trigger.slice(1).split(" "), ...label.toLowerCase().split(/\s+/)])],
    safety,
    availability,
    href,
  }));
}

export const dishaCommands: DishaCommand[] = [
  ...define("Mission", "governed_write", "planned", [
    ["/mission new", "New mission", "Start a governed mission.", "/workbench"],
    ["/mission open", "Open mission", "Open a persisted mission and its evidence context."],
    ["/mission rerun", "Rerun mission", "Rerun a mission through current policy and source state."],
    ["/mission compare", "Compare missions", "Compare mission outputs, evidence and policy decisions."],
    ["/mission assign", "Assign mission", "Assign mission responsibility under authenticated governance."],
    ["/mission archive", "Archive mission", "Archive a mission while retaining its audit trail."],
    ["/mission timeline", "Mission timeline", "Inspect mission events in temporal order."],
  ]),
  ...define("Map", "read", "planned", [
    ["/map india", "Open India map", "Open the authoritative India geospatial surface.", "/dashboard#map"],
    ["/map goto", "Go to location", "Move the map to a verified geography or coordinate."],
    ["/map zoom", "Set map zoom", "Change map scale without changing source truth."],
    ["/map layer", "Manage map layers", "Enable or disable admitted geospatial layers."],
    ["/map heat", "Heat layer", "Visualize evidence-backed density values."],
    ["/map cluster", "Cluster layer", "Cluster map features at the current scale."],
    ["/map corridor", "Corridor layer", "Inspect evidence-backed corridors and routes."],
    ["/map time", "Map time", "Bind map rendering to a temporal window."],
    ["/map clear", "Clear map state", "Reset transient map filters and selections."],
  ]),
  ...define("Geo", "read", "planned", [
    ["/geo state", "State geography", "Filter by official state identifier."],
    ["/geo district", "District geography", "Filter by official district identifier."],
    ["/geo radius", "Radius search", "Query admitted features within a radius."],
    ["/geo nearby", "Nearby", "Find admitted nearby entities or evidence."],
    ["/geo within", "Within geometry", "Run a governed point-in-polygon or geometry query."],
    ["/geo incidents", "Geographic incidents", "View evidence-backed incidents in the selected geography."],
    ["/geo assets", "Geographic assets", "View admitted public infrastructure and assets."],
    ["/geo export", "Export geospatial result", "Export governed geometry and provenance."],
  ]),
  ...define("Source", "read", "planned", [
    ["/source registry", "Source registry", "Inspect registered public and official sources.", "/dashboard#sources"],
    ["/source search", "Search sources", "Search source manifests and admitted records."],
    ["/source probe", "Probe source", "Check public-source availability with provenance."],
    ["/source admit", "Admit source", "Evaluate a source against the source-admission boundary."],
    ["/source sync", "Sync source", "Schedule parser-backed source ingestion."],
    ["/source health", "Source health", "Inspect source reachability and parser status."],
    ["/source coverage", "Source coverage", "Inspect geographic and domain coverage."],
  ]),
  ...define("Evidence", "read", "planned", [
    ["/evidence mission", "Mission evidence", "Open the evidence chain for a mission."],
    ["/evidence entity", "Entity evidence", "Open evidence linked to an entity."],
    ["/evidence geo", "Geospatial evidence", "Open evidence linked to geography."],
    ["/evidence chain", "Evidence chain", "Inspect source-to-claim-to-policy-to-ledger provenance.", "/dashboard#evidence"],
    ["/evidence ledger", "Evidence ledger", "Inspect Evidence Ledger v2 records."],
    ["/evidence verify", "Verify evidence", "Verify evidence hashes and chain integrity."],
    ["/evidence export", "Export evidence", "Export evidence with provenance metadata."],
  ]),
  ...define("Claims", "read", "planned", [
    ["/claim search", "Search claims", "Search persisted evidence claims."],
    ["/claim trace", "Trace claim", "Trace a claim to records, lineage and policy."],
    ["/claim verify", "Verify claim", "Check claim provenance and supporting evidence."],
    ["/claim flag", "Flag claim", "Place a claim into governed review."],
  ]),
  ...define("Entities & networks", "read", "planned", [
    ["/entity find", "Find entity", "Resolve an entity across admitted source records."],
    ["/entity profile", "Entity profile", "Inspect identifiers, claims, geography and evidence."],
    ["/entity related", "Related entities", "Inspect evidence-backed entity relationships."],
    ["/graph entity", "Entity graph", "Open a provenance-aware entity graph."],
    ["/graph cluster", "Graph cluster", "Cluster a graph without implying unsupported relationships."],
    ["/graph route", "Graph route", "Trace a relationship path with edge evidence."],
  ]),
  ...define("Timeline", "read", "planned", [
    ["/timeline mission", "Mission timeline", "Inspect mission events over time."],
    ["/timeline entity", "Entity timeline", "Inspect time-bound entity observations."],
    ["/timeline geo", "Geographic timeline", "Inspect evidence events tied to geography."],
    ["/timeline compare", "Compare timelines", "Compare multiple evidence timelines."],
    ["/timeline playback", "Timeline playback", "Play evidence-backed map and event history."],
  ]),
  ...define("Alerts & watch", "governed_write", "planned", [
    ["/alert create", "Create alert", "Create a governed alert rule."],
    ["/alert list", "List alerts", "Inspect configured alert rules."],
    ["/alert region", "Regional alert", "Watch an admitted geography for new evidence."],
    ["/alert source", "Source alert", "Watch a registered source for meaningful changes."],
    ["/watch entity", "Watch entity", "Watch an entity for new admitted evidence."],
    ["/watch region", "Watch region", "Watch a region for admitted evidence changes."],
    ["/watch topic", "Watch topic", "Watch a research topic across admitted sources."],
  ]),
  ...define("Reports", "read", "planned", [
    ["/report generate", "Generate report", "Generate a report from governed mission evidence."],
    ["/report export", "Export report", "Export an inspectable report and evidence references."],
    ["/report brief", "Generate brief", "Generate a concise evidence-first brief."],
    ["/report geojson", "Export GeoJSON", "Export admitted map features with provenance properties."],
  ]),
  ...define("Governance", "review_required", "planned", [
    ["/review queue", "Review queue", "Open pending governance decisions."],
    ["/review approve", "Approve review", "Approve a queued action with audit evidence."],
    ["/review deny", "Deny review", "Deny a queued action with recorded rationale."],
    ["/review escalate", "Escalate review", "Escalate a decision to a higher review boundary."],
    ["/review annotate", "Annotate review", "Attach a review annotation to the audit trail."],
    ["/policy evaluate", "Evaluate policy", "Evaluate an intended action against DISHA policy."],
    ["/policy explain", "Explain policy", "Inspect the rule and evidence behind a policy decision."],
  ]),
  ...define("Search", "read", "planned", [
    ["/search all", "Search all", "Search governed indexes across source, mission, evidence, entity and geography."],
    ["/search source", "Search sources", "Search source records and manifests."],
    ["/search mission", "Search missions", "Search persisted missions."],
    ["/search evidence", "Search evidence", "Search evidence and claim provenance."],
    ["/search entity", "Search entities", "Search resolved entities."],
    ["/search geo", "Search geography", "Search official geographic identifiers and admitted map features."],
  ]),
  ...define("System", "read", "planned", [
    ["/system health", "System health", "Inspect runtime health and dependency status."],
    ["/system readiness", "System readiness", "Inspect production readiness and governance posture."],
    ["/system jobs", "System jobs", "Inspect durable workflow jobs."],
    ["/system workers", "System workers", "Inspect worker execution state."],
    ["/system connectors", "System connectors", "Inspect connector configuration and health."],
    ["/system geodata-status", "Geodata status", "Inspect geometry imports, versions, licenses and indexes.", "/dashboard#map"],
    ["/system rebuild-index", "Rebuild index", "Request a governed retrieval-index rebuild."],
  ]),
].map((command) => {
  if (command.href) return { ...command, availability: "ready" as const };
  return command;
});

export function searchDishaCommands(query: string): DishaCommand[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return dishaCommands;
  return dishaCommands.filter((command) =>
    [command.trigger, command.label, command.description, command.group, ...command.keywords]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function commandGroups(commands: DishaCommand[] = dishaCommands): DishaCommandGroup[] {
  return [...new Set(commands.map((command) => command.group))];
}
