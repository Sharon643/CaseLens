import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ELK from "elkjs/lib/elk.bundled.js";

import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesState,
} from "@xyflow/react";

import type {
  Node,
  Edge,
  NodeMouseHandler,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type { CaseGraph } from "../api/caseApi";

interface InvestigationGraphProps {
  graph: CaseGraph;
  onNodeSelect: (node: Node) => void;
}

const elk = new ELK();

function getNodeColor(type: string) {
  switch (type) {
    case "person":
      return "#6f8fb3";

    case "device":
      return "#72899f";

    case "file":
      return "#8a7ca8";

    case "process":
      return "#758f82";

    case "event":
      return "#927d6c";

    default:
      return "#687585";
  }
}

function createInitialNodes(
  graph: CaseGraph
): Node[] {
  return graph.nodes.map((node, index) => ({
    id: node.id,

    position: {
      x: 100 + (index % 4) * 180,
      y: 100 + Math.floor(index / 4) * 120,
    },

    data: {
      label: node.label,
    },

    draggable: true,

    style: {
      background: getNodeColor(node.type),
      color: "#ffffff",

      border:
        "1px solid rgba(255,255,255,0.18)",

      borderRadius: "8px",

      padding: "10px 14px",

      fontSize: "12px",

      fontWeight: 500,

      boxShadow:
        "0 4px 14px rgba(0,0,0,0.25)",

      cursor: "grab",

      minWidth: "120px",

      textAlign: "center",
    },
  }));
}

function InvestigationGraph({
  graph,
  onNodeSelect,
}: InvestigationGraphProps) {

  const [layouting, setLayouting] =
    useState(false);

  const initialNodes = useMemo(
    () => createInitialNodes(graph),
    [graph]
  );

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState(initialNodes);

  const edges = useMemo<Edge[]>(() => {
    return graph.edges.map((edge) => ({
      id: edge.id,

      source: edge.source,

      target: edge.target,

      label: edge.relationship,

      type: "smoothstep",

      markerEnd: {
        type: MarkerType.ArrowClosed,
      },

      style: {
        stroke: "#637184",
        strokeWidth: 1.5,
      },

      labelStyle: {
        fill: "#a8b3c1",
        fontSize: 10,
      },

      labelBgStyle: {
        fill: "#11171f",
        fillOpacity: 0.9,
      },

      labelBgPadding: [5, 3],

      labelBgBorderRadius: 4,
    }));
  }, [graph.edges]);

  useEffect(() => {
    let cancelled = false;

    async function applyLayout() {
      setLayouting(true);

      try {
        const elkNodes = initialNodes.map((node) => ({
          id: node.id,
          width: 140,
          height: 50,
        }));

        const elkEdges = graph.edges.map(
          (edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })
        );

        const layout = await elk.layout({
          id: "caselens",

          layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",

            "elk.layered.spacing.nodeNodeBetweenLayers":
              "100",

            "elk.spacing.nodeNode":
              "60",

            "elk.edgeRouting":
              "ORTHOGONAL",

            "elk.layered.nodePlacement.strategy":
              "BRANDES_KOEPF",
          },

          children: elkNodes,

          edges: elkEdges,
        });

        if (cancelled) {
          return;
        }

        const positionedNodes =
          initialNodes.map((node) => {
            const layoutNode =
              layout.children?.find(
                (item) =>
                  item.id === node.id
              );

            if (!layoutNode) {
              return node;
            }

            return {
              ...node,

              position: {
                x: layoutNode.x ?? 0,
                y: layoutNode.y ?? 0,
              },
            };
          });

        setNodes(positionedNodes);

      } catch (error) {
        console.error(
          "ELK layout failed:",
          error
        );

      } finally {
        if (!cancelled) {
          setLayouting(false);
        }
      }
    }

    applyLayout();

    return () => {
      cancelled = true;
    };

  }, [graph, initialNodes, setNodes]);

  const handleNodeClick: NodeMouseHandler = (
    _event,
    node
  ) => {
    onNodeSelect(node);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "450px",
        position: "relative",
      }}
    >

      {layouting && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 10,

            padding: "6px 10px",

            borderRadius: "6px",

            background: "#18212c",

            border: "1px solid #344255",

            color: "#9ba7b5",

            fontSize: "11px",
          }}
        >
          Arranging graph...
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}

        onNodesChange={
          onNodesChange
        }

        fitView

        fitViewOptions={{
          padding: 0.25,
        }}

        minZoom={0.3}
        maxZoom={2}

        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}

        onNodeClick={
          handleNodeClick
        }

        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          gap={24}
          size={1}
        />

        <Controls />
      </ReactFlow>

    </div>
  );
}

export default InvestigationGraph;