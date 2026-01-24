import cytoscape from "cytoscape";
import type { Layouts } from "cytoscape";
import { useEffect, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRef = useRef<Layouts | null>(null);

  useEffect(() => {
    if (!containerRef.current || !nodes || nodes.length === 0) {
      return;
    }

    // Cleanup existing instance first
    if (layoutRef.current) {
      layoutRef.current.stop();
      layoutRef.current = null;
    }
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    // Create a set of valid node IDs for edge validation
    const nodeIds = new Set(nodes.map((n) => n.id));

    const nodeElements: cytoscape.ElementDefinition[] = nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name,
        depth: node.depth,
      },
    }));

    // Filter edges to only include those where both source and target exist
    const validEdges = (edges || []).filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );

    const edgeElements: cytoscape.ElementDefinition[] = validEdges.map((edge, index) => ({
      data: {
        id: `edge-${index}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        strength: edge.strength,
      },
    }));

    const elements = [...nodeElements, ...edgeElements];

    // Initialize Cytoscape without layout
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#3b82f6",
            label: "data(label)",
            "font-size": "12px",
            color: "#1f2937",
            "text-valign": "bottom",
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
            "font-weight": "bold",
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
            "curve-style": "bezier",
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
      ],
    });

    cyRef.current = cy;

    // Add click handler
    cy.on("tap", "node", (evt) => {
      const nodeId = evt.target.id();
      onNodeClick?.(nodeId);
    });

    // Run layout separately so we can track it
    // Use requestAnimationFrame to ensure container is fully rendered
    const animationId = requestAnimationFrame(() => {
      if (!cyRef.current) return;

      const layout = cy.layout({
        name: "cose",
        animate: false, // Disable animation to avoid timing issues
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
        padding: 50,
        fit: true,
        randomize: false,
      });

      layoutRef.current = layout;
      layout.run();
    });

    // Store animation frame ID for cleanup
    const currentAnimationId = animationId;

    // Cleanup on unmount
    return () => {
      // Cancel pending animation frame
      cancelAnimationFrame(currentAnimationId);
      // Stop layout first to prevent animation callbacks
      if (layoutRef.current) {
        layoutRef.current.stop();
        layoutRef.current = null;
      }
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [nodes, edges, onNodeClick]);

  // Don't render if no nodes
  if (!nodes || nodes.length === 0) {
    return (
      <div className="border rounded-lg bg-white shadow-sm flex items-center justify-center h-[600px]">
        <p className="text-gray-500">グラフデータがありません</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div ref={containerRef} style={{ width: "100%", height: "600px" }} />
    </div>
  );
}
