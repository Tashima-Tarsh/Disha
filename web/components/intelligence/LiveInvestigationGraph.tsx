"use client";

import cytoscape, { type Core, type ElementDefinition, type EventObject } from "cytoscape";
import { Focus, Maximize2, RefreshCcw, Route, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./live-investigation-graph.module.css";

export type LiveInvestigationArticle = {
  title?: string;
  url?: string;
  domain?: string;
  language?: string;
  sourceCountry?: string;
  seenDate?: string;
};

export type LiveInvestigationVulnerability = {
  cveID?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  requiredAction?: string;
};

export type LiveInvestigationSource = {
  sourceId?: string;
  sourceName?: string;
  owner?: string;
  domain?: string;
  url?: string;
  ok?: boolean;
  status?: number;
};

type SelectedNode = {
  id: string;
  kind: string;
  label: string;
  detail?: string;
  url?: string;
  meta?: string;
};

export function LiveInvestigationGraph({
  query,
  articles,
  vulnerabilities,
  sources,
  onPivot,
}: {
  query: string;
  articles: LiveInvestigationArticle[];
  vulnerabilities: LiveInvestigationVulnerability[];
  sources: LiveInvestigationSource[];
  onPivot: (query: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);

  const elements = useMemo<ElementDefinition[]>(() => {
    const rows: ElementDefinition[] = [];
    const rootId = "root:query";
    rows.push({
      data: {
        id: rootId,
        label: query,
        kind: "query",
        detail: "Current public-intelligence investigation root",
      },
      classes: "query",
    });

    const seenDomains = new Set<string>();
    articles.slice(0, 18).forEach((article, index) => {
      const articleId = `article:${index}:${hash(article.url ?? article.title ?? String(index))}`;
      const title = article.title?.trim() || "Public-source observation";
      rows.push({
        data: {
          id: articleId,
          label: truncate(title, 46),
          fullLabel: title,
          kind: "article",
          detail: [article.sourceCountry, article.language, article.seenDate].filter(Boolean).join(" · "),
          url: article.url,
        },
        classes: "article",
      });
      rows.push({
        data: {
          id: `edge:query:${articleId}`,
          source: rootId,
          target: articleId,
          label: "observed",
          kind: "edge",
        },
      });

      const domain = article.domain?.trim().toLowerCase();
      if (domain) {
        const domainId = `domain:${domain}`;
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          rows.push({
            data: {
              id: domainId,
              label: domain,
              kind: "domain",
              detail: "Public reporting source domain",
              meta: domain,
            },
            classes: "domain",
          });
        }
        rows.push({
          data: {
            id: `edge:${domainId}:${articleId}`,
            source: domainId,
            target: articleId,
            label: "published",
            kind: "edge",
          },
        });
      }
    });

    vulnerabilities.slice(0, 8).forEach((item, index) => {
      const cve = item.cveID?.trim() || `KEV-${index + 1}`;
      const id = `kev:${cve}`;
      rows.push({
        data: {
          id,
          label: cve,
          kind: "vulnerability",
          detail: item.vulnerabilityName ?? item.shortDescription ?? "Known exploited vulnerability",
          meta: [item.vendorProject, item.product, item.dateAdded].filter(Boolean).join(" · "),
        },
        classes: "vulnerability",
      });
      rows.push({
        data: {
          id: `edge:query:${id}`,
          source: rootId,
          target: id,
          label: "watch",
          kind: "edge",
        },
      });
    });

    sources.forEach((source, index) => {
      const id = `source:${source.sourceId ?? index}`;
      rows.push({
        data: {
          id,
          label: source.sourceName ?? source.sourceId ?? "Official source",
          kind: "official-source",
          detail: source.owner ?? source.domain ?? "Registered public source",
          url: source.url,
          meta: source.status ? `HTTP ${source.status}` : undefined,
          reachable: source.ok ? "true" : "false",
        },
        classes: source.ok ? "official-source reachable" : "official-source unavailable",
      });
      rows.push({
        data: {
          id: `edge:query:${id}`,
          source: rootId,
          target: id,
          label: "source",
          kind: "edge",
        },
      });
    });

    return rows;
  }, [query, articles, vulnerabilities, sources]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const cy = cytoscape({
      container: host,
      elements,
      minZoom: 0.24,
      maxZoom: 3.2,
      wheelSensitivity: 0.16,
      selectionType: "single",
      boxSelectionEnabled: false,
      autoungrabify: false,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            color: "#dbe9e5",
            "font-size": 8.5,
            "font-weight": 650,
            "text-wrap": "ellipsis",
            "text-max-width": "96px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "background-color": "#397f6f",
            "border-width": 1,
            "border-color": "#6da999",
            width: 18,
            height: 18,
            "transition-property": "opacity, background-color, border-color, width, height",
            "transition-duration": 180,
          },
        },
        {
          selector: "node.query",
          style: {
            width: 34,
            height: 34,
            "background-color": "#d2b168",
            "border-color": "#ffe2a2",
            "border-width": 2,
            color: "#f6ecd2",
            "font-size": 10,
            "text-max-width": "140px",
          },
        },
        {
          selector: "node.domain",
          style: {
            "background-color": "#477e9c",
            "border-color": "#78acc9",
            shape: "round-rectangle",
            width: 22,
            height: 16,
          },
        },
        {
          selector: "node.article",
          style: {
            "background-color": "#4b9c86",
            "border-color": "#7cc5b2",
            width: 15,
            height: 15,
          },
        },
        {
          selector: "node.vulnerability",
          style: {
            "background-color": "#a66d56",
            "border-color": "#d49b82",
            shape: "diamond",
            width: 19,
            height: 19,
          },
        },
        {
          selector: "node.official-source",
          style: {
            "background-color": "#7b7652",
            "border-color": "#b6aa6b",
            shape: "hexagon",
            width: 19,
            height: 19,
          },
        },
        {
          selector: "node.unavailable",
          style: {
            opacity: 0.42,
          },
        },
        {
          selector: "node:selected",
          style: {
            width: 28,
            height: 28,
            "border-width": 3,
            "border-color": "#fff0b5",
            "background-color": "#d8b15f",
          },
        },
        {
          selector: "node.faded, edge.faded",
          style: {
            opacity: 0.12,
          },
        },
        {
          selector: "node.neighbor",
          style: {
            opacity: 1,
            "border-color": "#d5c07b",
            "border-width": 2,
          },
        },
        {
          selector: "edge",
          style: {
            width: 0.9,
            "line-color": "#34545d",
            "target-arrow-color": "#557985",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.65,
            "curve-style": "bezier",
            opacity: 0.56,
            "transition-property": "opacity, line-color, width",
            "transition-duration": 160,
          },
        },
        {
          selector: "edge.highlighted",
          style: {
            opacity: 0.95,
            width: 1.8,
            "line-color": "#b8a15f",
            "target-arrow-color": "#d9c277",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 650,
        randomize: true,
        componentSpacing: 42,
        nodeRepulsion: () => 7200,
        idealEdgeLength: () => 78,
        edgeElasticity: () => 90,
        gravity: 0.22,
        numIter: 650,
        padding: 34,
      },
    });

    cyRef.current = cy;

    const selectNode = (event: EventObject) => {
      const node = event.target;
      cy.elements().removeClass("faded neighbor highlighted");
      cy.elements().addClass("faded");
      node.removeClass("faded");
      node.neighborhood("node").removeClass("faded").addClass("neighbor");
      node.connectedEdges().removeClass("faded").addClass("highlighted");

      setSelected({
        id: node.id(),
        kind: String(node.data("kind") ?? "node"),
        label: String(node.data("fullLabel") ?? node.data("label") ?? node.id()),
        detail: valueOrUndefined(node.data("detail")),
        url: valueOrUndefined(node.data("url")),
        meta: valueOrUndefined(node.data("meta")),
      });
    };

    let lastTap: { id: string; at: number } | null = null;
    cy.on("tap", "node", (event) => {
      const node = event.target;
      const now = Date.now();
      const isDouble = lastTap?.id === node.id() && now - lastTap.at < 420;
      lastTap = isDouble ? null : { id: node.id(), at: now };
      selectNode(event);

      if (isDouble) {
        const kind = String(node.data("kind") ?? "");
        const pivotValue = String(node.data("meta") ?? node.data("fullLabel") ?? node.data("label") ?? "").trim();
        if (pivotValue && ["domain", "article", "vulnerability", "official-source"].includes(kind)) {
          onPivot(pivotValue);
        }
      }
    });

    cy.on("tap", (event) => {
      if (event.target === cy) clearSelection(cy, setSelected);
    });

    cy.on("mouseover", "node", (event) => {
      host.style.cursor = "pointer";
      event.target.animate({ style: { "border-width": 2.5 } }, { duration: 100 });
    });
    cy.on("mouseout", "node", (event) => {
      host.style.cursor = "default";
      if (!event.target.selected()) event.target.animate({ style: { "border-width": 1 } }, { duration: 100 });
    });

    const fitTimer = window.setTimeout(() => cy.fit(undefined, 40), 760);

    return () => {
      window.clearTimeout(fitTimer);
      cyRef.current = null;
      cy.destroy();
    };
  }, [elements, layoutRevision, onPivot]);

  function fit() {
    cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 44 }, duration: 420 });
  }

  function relayout() {
    setLayoutRevision((value) => value + 1);
  }

  function focusRoot() {
    const cy = cyRef.current;
    if (!cy) return;
    const root = cy.$id("root:query");
    if (root.nonempty()) {
      root.select();
      cy.animate({ center: { eles: root }, zoom: 1.2, duration: 420 });
    }
  }

  function clear() {
    const cy = cyRef.current;
    if (!cy) return;
    clearSelection(cy, setSelected);
  }

  return (
    <section className={styles.shell} aria-label="Live investigation graph">
      <header className={styles.toolbar}>
        <div className={styles.title}>
          <Route size={15} />
          <div>
            <strong>Live investigation canvas</strong>
            <span>Click to inspect · double-click to pivot · drag to reorganize</span>
          </div>
        </div>
        <div className={styles.tools}>
          <button type="button" onClick={focusRoot} title="Focus investigation root"><Focus size={14} /></button>
          <button type="button" onClick={fit} title="Fit graph"><Maximize2 size={14} /></button>
          <button type="button" onClick={relayout} title="Rebuild force layout"><RefreshCcw size={14} /></button>
          {selected ? <button type="button" onClick={clear} title="Clear selection"><X size={14} /></button> : null}
        </div>
      </header>

      <div className={styles.stage}>
        <div className={styles.graph} ref={containerRef} />
        <div className={styles.legend}>
          <span><i className={styles.queryDot} /> Query</span>
          <span><i className={styles.articleDot} /> Report</span>
          <span><i className={styles.domainDot} /> Domain</span>
          <span><i className={styles.sourceDot} /> Official source</span>
          <span><i className={styles.kevDot} /> KEV</span>
        </div>

        {selected ? (
          <aside className={styles.inspector}>
            <div className={styles.inspectorHead}>
              <span>{humanize(selected.kind)}</span>
              <button type="button" onClick={clear}><X size={13} /></button>
            </div>
            <strong>{selected.label}</strong>
            {selected.detail ? <p>{selected.detail}</p> : null}
            {selected.meta ? <small>{selected.meta}</small> : null}
            <div className={styles.inspectorActions}>
              {selected.kind !== "query" ? (
                <button type="button" onClick={() => onPivot(selected.meta || selected.label)}>
                  <Search size={13} /> Pivot investigation
                </button>
              ) : null}
              {selected.url ? <a href={selected.url} target="_blank" rel="noreferrer">Open source</a> : null}
            </div>
          </aside>
        ) : (
          <div className={styles.hint}>Select any node to isolate its neighborhood.</div>
        )}
      </div>
    </section>
  );
}

function clearSelection(cy: Core, setSelected: (value: SelectedNode | null) => void) {
  cy.elements().removeClass("faded neighbor highlighted");
  cy.elements().unselect();
  setSelected(null);
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function hash(value: string) {
  let acc = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    acc ^= value.charCodeAt(i);
    acc = Math.imul(acc, 16777619);
  }
  return (acc >>> 0).toString(36);
}

function valueOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}
