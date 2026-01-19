import type cytoscape from "cytoscape";
import { useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";

interface Node {
  id: string;
  name: string;
  image_url: string | null;
  depth: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number | null;
  type: string;
}

interface NetworkGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
}

export function NetworkGraph({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);

  const elements = [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name,
        depth: node.depth,
      },
    })),
    ...edges.map((edge, index) => ({
      data: {
        id: `edge-${index}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        strength: edge.strength,
      },
    })),
  ];

  const layout = {
    name: "cose" as const,
    animate: true,
    animationDuration: 500,
    nodeRepulsion: () => 8000,
    idealEdgeLength: () => 100,
    padding: 50,
  };

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#3b82f6",
        label: "data(label)",
        "font-size": "12px",
        color: "#1f2937",
        "text-valign": "bottom" as const,
        "text-margin-y": 5,
        width: 40,
        height: 40,
      },
    },
    {
      selector: "node[depth = 0]",
      style: {
        "background-color": "#ef4444",
        width: 60,
        height: 60,
        "font-size": "14px",
        "font-weight": "bold" as const,
      },
    },
    {
      selector: "node[depth = 1]",
      style: {
        "background-color": "#f97316",
        width: 50,
        height: 50,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#94a3b8",
        "curve-style": "bezier" as const,
        opacity: 0.6,
      },
    },
    {
      selector: "node:active",
      style: {
        "overlay-color": "#3b82f6",
        "overlay-opacity": 0.3,
      },
    },
  ];

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "600px" }}
        cy={(cy: cytoscape.Core) => {
          cyRef.current = cy;
          cy.on("tap", "node", (evt: cytoscape.EventObject) => {
            const nodeId = evt.target.id();
            onNodeClick?.(nodeId);
          });
        }}
      />
    </div>
  );
}
