"use client";

import cytoscape, { type Core } from "cytoscape";
import { useEffect, useRef } from "react";

import type { WorkspaceEdge, WorkspaceEntity } from "@/lib/intelligence/workspace-contract";
import styles from "./intelligence-graph.module.css";

export function IntelligenceGraph({
  entities,
  edges,
  selectedEntityId,
  onSelectEntity,
}: {
  entities: WorkspaceEntity[];
  edges: WorkspaceEdge[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;

  useEffect(() => {
    if (!containerRef.current || !entities.length) return;
    const allowed = new Set(entities.map((entity) => entity.entityId));
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...entities.map((entity) => ({
          data: { id: entity.entityId, label: entity.displayName, type: entity.entityType },
        })),
        ...edges.filter((edge) => allowed.has(edge.fromEntityId) && allowed.has(edge.toEntityId)).map((edge) => ({
          data: {
            id: edge.edgeId,
            source: edge.fromEntityId,
            target: edge.toEntityId,
            label: edge.relationType,
            confidence: edge.confidence,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#2f7f6a",
            "border-color": "#86bcae",
            "border-width": 1,
            color: "#dfe9e6",
            label: "data(label)",
            "font-size": 9,
            "text-wrap": "ellipsis",
            "text-max-width": 84,
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 18,
            height: 18,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#d8b363",
            "border-color": "#ffe2a6",
            "border-width": 2,
            width: 24,
            height: 24,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#36525b",
            "target-arrow-color": "#55747a",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.72,
          },
        },
      ],
      layout: { name: "breadthfirst", directed: true, spacingFactor: 1.35, padding: 24 },
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;
    cy.on("tap", "node", (event) => onSelectRef.current(event.target.id()));
    return () => { cyRef.current = null; cy.destroy(); };
  }, [entities, edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (!selectedEntityId) return;
    const node = cy.$id(selectedEntityId);
    if (node.nonempty()) {
      node.select();
      cy.animate({ center: { eles: node }, duration: 260 });
    }
  }, [selectedEntityId]);

  if (!entities.length) {
    return <div className={styles.empty}>No persisted entity relationships are available in this workspace.</div>;
  }
  return <div className={styles.graph} ref={containerRef} aria-label="Evidence-linked entity graph" />;
}
