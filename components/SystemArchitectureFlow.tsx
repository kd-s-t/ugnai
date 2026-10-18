"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FlowCostsBelow,
  flowLabelClass,
  flowMetaClass,
  flowNodeClass,
} from "@/components/flow/FlowMark";
import { FlowCopyJsonButton } from "@/components/flow/FlowCopyJsonButton";
import { useFlowLayout } from "@/components/flow/useFlowLayout";

const DOT = "!size-2 !bg-[#0f1b2d] !border-0";
const FLOW_ID = "system-architecture-v3";

function StepNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    note?: string;
    lines?: string[];
    costs?: string[];
    logo?: string;
    textOnly?: boolean;
    in?: boolean;
    out?: boolean;
    outTop?: boolean;
    outBot?: boolean;
    outMid?: boolean;
    outLeft?: boolean;
    outBottom?: boolean;
    inTop?: boolean;
    inBot?: boolean;
    inMid?: boolean;
    inFromTop?: boolean;
  };
  return (
    <div className={`relative ${flowNodeClass}`} style={{ width: 148 }}>
      {d.note ? (
        <p className="absolute -top-6 left-1/2 w-max -translate-x-1/2 font-mono text-[10px] text-[var(--muted)]">
          {d.note}
        </p>
      ) : null}
      {d.in ? (
        <Handle type="target" position={Position.Left} id="in" className={DOT} />
      ) : null}
      {d.inTop ? (
        <Handle
          type="target"
          position={Position.Left}
          id="in-top"
          style={{ top: "25%" }}
          className={DOT}
        />
      ) : null}
      {d.inMid ? (
        <Handle
          type="target"
          position={Position.Left}
          id="in-mid"
          style={{ top: "50%" }}
          className={DOT}
        />
      ) : null}
      {d.inBot ? (
        <Handle
          type="target"
          position={Position.Left}
          id="in-bot"
          style={{ top: "75%" }}
          className={DOT}
        />
      ) : null}
      {d.inFromTop ? (
        <Handle
          type="target"
          position={Position.Top}
          id="in-from-top"
          className={DOT}
        />
      ) : null}
      {d.logo && !d.textOnly ? (
        <Image
          src={d.logo}
          alt=""
          width={40}
          height={40}
          className="size-10 object-contain"
        />
      ) : null}
      <p className={flowLabelClass}>{d.label}</p>
      {d.lines?.map((line) => (
        <p key={line} className={flowMetaClass}>
          {line}
        </p>
      ))}
      <FlowCostsBelow costs={d.costs} />
      {d.out ? (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className={DOT}
        />
      ) : null}
      {d.outTop ? (
        <Handle
          type="source"
          position={Position.Right}
          id="out-top"
          style={{ top: "25%" }}
          className={DOT}
        />
      ) : null}
      {d.outMid ? (
        <Handle
          type="source"
          position={Position.Right}
          id="out-mid"
          style={{ top: "50%" }}
          className={DOT}
        />
      ) : null}
      {d.outBot ? (
        <Handle
          type="source"
          position={Position.Right}
          id="out-bot"
          style={{ top: "75%" }}
          className={DOT}
        />
      ) : null}
      {d.outLeft ? (
        <Handle
          type="source"
          position={Position.Left}
          id="out-left"
          className={DOT}
        />
      ) : null}
      {d.outBottom ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="out-bottom"
          className={DOT}
        />
      ) : null}
    </div>
  );
}

const nodeTypes = {
  step: StepNode,
};

function SystemArchitectureFlowCanvas() {
  const { defaultNodes, defaultEdges } = useMemo(() => {
    const n: Node[] = [
      {
        id: "citizen",
        type: "step",
        position: { x: -81.1963498739745, y: 29.707504945552515 },
        data: {
          label: "Citizen Web",
          logo: "/brands/citizens.png",
          lines: ["report · track"],
          out: true,
        },
      },
      {
        id: "mobile",
        type: "step",
        position: { x: -80.05273931236924, y: 200 },
        data: {
          label: "iOS · Android",
          textOnly: true,
          lines: ["report ingest"],
          out: true,
        },
      },
      {
        id: "officer",
        type: "step",
        position: { x: -73.19107594273758, y: 360 },
        data: {
          label: "Officer Admin",
          logo: "/brands/officer.png",
          lines: ["command center"],
          out: true,
        },
      },
      {
        id: "terraform",
        type: "step",
        position: { x: 306.4594607292632, y: 40 },
        data: {
          label: "Terraform",
          textOnly: true,
          lines: ["ugnai/infra", "GCP · Firebase"],
          note: "provision",
          outBottom: true,
        },
      },
      {
        id: "hosting",
        type: "step",
        position: { x: 306.4594607292632, y: 189.70750494555253 },
        data: {
          label: "Firebase Hosting",
          logo: "/brands/firebase.png",
          lines: ["CDN → Cloud Run"],
          note: "ugnaiph.com",
          inFromTop: true,
          inTop: true,
          inMid: true,
          inBot: true,
          out: true,
        },
      },
      {
        id: "run",
        type: "step",
        position: { x: 488.4268657791937, y: 186.03716376428656 },
        data: {
          label: "Cloud Run",
          logo: "/brands/cloud-run.png",
          lines: ["Next.js 15", "API + UI"],
          note: "asia-southeast1",
          in: true,
          outTop: true,
          outMid: true,
          outBot: true,
        },
      },
      {
        id: "firestore",
        type: "step",
        position: { x: 716.0105478624737, y: 62.872211232105485 },
        data: {
          label: "Firestore",
          logo: "/brands/firestore.png",
          lines: ["reports · inventory"],
          in: true,
          outTop: true,
          outBot: true,
        },
      },
      {
        id: "storage",
        type: "step",
        position: { x: 718.2977689856843, y: 194.28194719197361 },
        data: {
          label: "Storage",
          logo: "/brands/gcs.png",
          lines: ["media · TTS · EE"],
          in: true,
        },
      },
      {
        id: "auth",
        type: "step",
        position: { x: 722.8722112321054, y: 331.99472606876304 },
        data: {
          label: "Firebase Auth",
          logo: "/brands/firebase.png",
          lines: ["officer · citizen"],
          in: true,
        },
      },
      {
        id: "vertex",
        type: "step",
        position: { x: 1064.0685611060799, y: -27.446653478526592 },
        data: {
          label: "Vertex AI",
          logo: "/brands/vertex-ai.svg",
          lines: ["vision classify"],
          in: true,
          out: true,
        },
      },
      {
        id: "gemini",
        type: "step",
        position: { x: 1076.648277283738, y: 133.13833663036837 },
        data: {
          label: "Gemini",
          logo: "/brands/gemini.png",
          lines: ["validate · allocate"],
          inTop: true,
          inBot: true,
          outTop: true,
          outBot: true,
        },
      },
      {
        id: "bq",
        type: "step",
        position: { x: 1077.7918878453431, y: 329.7338746017371 },
        data: {
          label: "BigQuery",
          logo: "/brands/bigquery.png",
          lines: ["verdict mirror"],
          in: true,
          out: true,
        },
      },
      {
        id: "twilio",
        type: "step",
        position: { x: 1369.2543631175806, y: -76.64827728373803 },
        data: {
          label: "Twilio",
          logo: "/brands/twilio.png",
          lines: ["SMS · voice"],
          in: true,
        },
      },
      {
        id: "resend",
        type: "step",
        position: { x: 1365.8235314327649, y: 54.78782833231473 },
        data: {
          label: "Resend",
          logo: "/brands/resend.png",
          lines: ["email kits"],
          in: true,
        },
      },
      {
        id: "maps",
        type: "step",
        position: { x: 1371.541584240791, y: 204.52170293405192 },
        data: {
          label: "Maps · Weather",
          logo: "/brands/google-maps.png",
          lines: ["basemap · forecast"],
          in: true,
        },
      },
      {
        id: "ee",
        type: "step",
        position: { x: 1364.6799208711595, y: 340.5322507965257 },
        data: {
          label: "Earth Engine",
          logo: "/brands/earth-engine.webp",
          lines: ["offline → ee_datasets"],
          outLeft: true,
        },
      },
      {
        id: "elevenlabs",
        type: "step",
        position: { x: 1365.8235314327649, y: 470 },
        data: {
          label: "ElevenLabs",
          textOnly: true,
          lines: ["Mangugnai Speak", "/api/ai/tts"],
          in: true,
        },
      },
    ];

    const marker = {
      type: MarkerType.ArrowClosed,
      color: "#0f1b2d",
    } as const;
    const style = { stroke: "#0f1b2d", strokeWidth: 1.75 };
    const labelBg = {
      labelBgStyle: { fill: "#eef1f5" },
      labelBgPadding: [4, 6] as [number, number],
      labelStyle: { fill: "#5c6570", fontSize: 11 },
    };

    const e: Edge[] = [
      {
        id: "e-tf",
        source: "terraform",
        sourceHandle: "out-bottom",
        target: "hosting",
        targetHandle: "in-from-top",
        label: "provision",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-citizen",
        source: "citizen",
        sourceHandle: "out",
        target: "hosting",
        targetHandle: "in-top",
        markerEnd: marker,
        style,
      },
      {
        id: "e-mobile",
        source: "mobile",
        sourceHandle: "out",
        target: "hosting",
        targetHandle: "in-mid",
        label: "ingest",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-officer",
        source: "officer",
        sourceHandle: "out",
        target: "hosting",
        targetHandle: "in-bot",
        markerEnd: marker,
        style,
      },
      {
        id: "e-cdn",
        source: "hosting",
        sourceHandle: "out",
        target: "run",
        targetHandle: "in",
        label: "rewrite",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-fs",
        source: "run",
        sourceHandle: "out-top",
        target: "firestore",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-st",
        source: "run",
        sourceHandle: "out-mid",
        target: "storage",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-auth",
        source: "run",
        sourceHandle: "out-bot",
        target: "auth",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-vertex",
        source: "firestore",
        sourceHandle: "out-top",
        target: "vertex",
        targetHandle: "in",
        label: "queued photo",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-vertex-gemini",
        source: "vertex",
        sourceHandle: "out",
        target: "gemini",
        targetHandle: "in-top",
        label: "image signal",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-fs-gemini",
        source: "firestore",
        sourceHandle: "out-bot",
        target: "gemini",
        targetHandle: "in-bot",
        label: "text · GPS · trust",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-gemini-twilio",
        source: "gemini",
        sourceHandle: "out-top",
        target: "twilio",
        targetHandle: "in",
        label: "legit → alerts",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-gemini-resend",
        source: "gemini",
        sourceHandle: "out-bot",
        target: "resend",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-run-eleven",
        source: "run",
        sourceHandle: "out-bot",
        target: "elevenlabs",
        targetHandle: "in",
        label: "TTS",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-fs-bq",
        source: "firestore",
        sourceHandle: "out-bot",
        target: "bq",
        targetHandle: "in",
        label: "verdict sync",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-run-maps",
        source: "run",
        sourceHandle: "out-mid",
        target: "maps",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-ee",
        source: "ee",
        sourceHandle: "out-left",
        target: "firestore",
        targetHandle: "in",
        label: "ee_datasets",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-bq-train",
        source: "bq",
        sourceHandle: "out",
        target: "vertex",
        targetHandle: "in",
        label: "cron → GCS → retrain",
        markerEnd: marker,
        style,
        ...labelBg,
      },
    ];

    return { defaultNodes: n, defaultEdges: e };
  }, []);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onMoveEnd,
    onReconnect,
    resetLayout,
    hasSavedLayout,
    defaultViewport,
    fitView,
    hydrated,
    canvasKey,
  } = useFlowLayout(FLOW_ID, defaultNodes, defaultEdges);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#eef1f5]">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <FlowCopyJsonButton flowId={FLOW_ID} nodes={nodes} edges={edges} />
        {hasSavedLayout ? (
          <button
            type="button"
            onClick={resetLayout}
            className="rounded-[8px] border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Reset layout
          </button>
        ) : null}
      </div>
      {hydrated ? (
        <ReactFlow
          key={canvasKey}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onMoveEnd={onMoveEnd}
          onReconnect={onReconnect}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          fitView={fitView}
          fitViewOptions={{ padding: 0.12 }}
          edgesReconnectable
          reconnectRadius={28}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background gap={18} size={1} color="#d5dae2" />
          <Controls showInteractive={false} />
        </ReactFlow>
      ) : null}
    </div>
  );
}

export function SystemArchitectureFlow() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide">
          System Architecture
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Terraform provisions Firebase Hosting → Cloud Run (Next.js) →
          Firestore / Storage / Auth. Gemini + Vertex for AI; Twilio, Resend,
          ElevenLabs for alerts and Speak; Earth Engine offline datasets.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <SystemArchitectureFlowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
