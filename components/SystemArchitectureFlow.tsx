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
const FLOW_ID = "system-architecture-v37";

function StepNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    note?: string;
    lines?: string[];
    costs?: string[];
    logo?: string;
    logos?: string[];
    textOnly?: boolean;
    large?: boolean;
    in?: boolean;
    out?: boolean;
    outTop?: boolean;
    outBot?: boolean;
    outMid?: boolean;
    outLeft?: boolean;
    outBottom?: boolean;
    outUp?: boolean;
    inTop?: boolean;
    inBot?: boolean;
    inMid?: boolean;
    inFromTop?: boolean;
    inFromBottom?: boolean;
  };
  const width = d.large
    ? 220
    : d.logos && d.logos.length > 2
      ? 220
      : 148;
  const logoSize = d.large ? 52 : 36;
  return (
    <div
      className={`relative ${flowNodeClass} ${d.large ? "gap-1.5 px-4 py-3.5" : ""}`}
      style={{ width }}
    >
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
      {d.inFromBottom ? (
        <Handle
          type="target"
          position={Position.Bottom}
          id="in-from-bottom"
          className={DOT}
        />
      ) : null}
      {d.logos?.length && !d.textOnly ? (
        <div className={`flex items-center justify-center ${d.large ? "gap-2.5" : "gap-1.5"}`}>
          {d.logos.map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={logoSize}
              height={logoSize}
              className="object-contain"
              style={{ width: logoSize, height: logoSize }}
            />
          ))}
        </div>
      ) : d.logo && !d.textOnly ? (
        <Image
          src={d.logo}
          alt=""
          width={d.large ? 52 : 40}
          height={d.large ? 52 : 40}
          className="object-contain"
          style={{
            width: d.large ? 52 : 40,
            height: d.large ? 52 : 40,
          }}
        />
      ) : null}
      <p className={`${flowLabelClass} ${d.large ? "text-base" : ""}`}>
        {d.label}
      </p>
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
      {d.outUp ? (
        <Handle
          type="source"
          position={Position.Top}
          id="out-up"
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
        position: { x: -76.0864325446909, y: 103.80130622016486 },
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
        position: { x: -75.302775116183, y: 209.49992839237248 },
        data: {
          label: "iOS · Android",
          textOnly: true,
          lines: ["report"],
          out: true,
        },
      },
      {
        id: "officer",
        type: "step",
        position: { x: -74.04272883095152, y: 270.5764467375368 },
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
        position: { x: 254.2836699034495, y: -37.576875864409296 },
        data: {
          label: "Terraform",
          logo: "/brands/terraform.png",
          lines: ["ugnai/infra", "GCP · Firebase"],
          note: "provision",
          outBottom: true,
        },
      },
      {
        id: "github",
        type: "step",
        position: { x: 524.2014458401512, y: -25.63495291243398 },
        data: {
          label: "GitHub Actions",
          logos: ["/brands/github.png", "/brands/github-actions.png"],
          lines: ["CI/CD · deploy"],
          note: "deploy",
          outBottom: true,
        },
      },
      {
        id: "squarespace",
        type: "step",
        position: { x: 253.35304292702818, y: 383.5529873966153 },
        data: {
          label: "Squarespace",
          logo: "/brands/squarespace.png",
          lines: ["DNS · ugnaiph.com"],
          inFromTop: true,
        },
      },
      {
        id: "hosting",
        type: "step",
        position: { x: 254.20985457121446, y: 187.33252284745942 },
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
          outBottom: true,
        },
      },
      {
        id: "run",
        type: "step",
        position: { x: 487.5758303932828, y: 167.3143852742473 },
        data: {
          label: "Cloud Run",
          logos: ["/brands/cloud-run.png", "/brands/nextjs.png"],
          lines: ["Next.js 15", "API + UI"],
          note: "asia-southeast1",
          large: true,
          in: true,
          inFromTop: true,
          outTop: true,
          outMid: true,
          outBottom: true,
        },
      },
      {
        id: "figma",
        type: "step",
        position: { x: 252.09530210464953, y: 501.61674087205915 },
        data: {
          label: "Figma",
          logo: "/brands/figma.png",
          lines: ["Ugnai Flow · UX"],
          out: true,
        },
      },
      {
        id: "ui",
        type: "step",
        position: { x: 487.7402620006719, y: 429.2708705811217 },
        data: {
          label: "UI stack",
          logos: [
            "/brands/shadcn.svg",
            "/brands/tailwindcss.svg",
            "/brands/lucide.svg",
            "/brands/framer-motion.svg",
          ],
          lines: ["shadcn · Tailwind · Lucide · Motion"],
          inFromTop: true,
          in: true,
        },
      },
      {
        id: "firestore",
        type: "step",
        position: { x: 824.8514332224167, y: -12.431427294827945 },
        data: {
          label: "Firestore",
          logo: "/brands/firestore.png",
          lines: ["reports · inventory"],
          in: true,
          outBot: true,
          outUp: true,
        },
      },
      {
        id: "storage",
        type: "step",
        position: { x: 787.7591940421524, y: 534.2608347864266 },
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
        position: { x: 787.7786251867639, y: 427.6481293533913 },
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
        position: { x: 1134.0544640961862, y: -227.73983564637743 },
        data: {
          label: "Vertex AI",
          logo: "/brands/vertex-ai.svg",
          lines: ["vision classify"],
          in: true,
          out: true,
        },
      },
      {
        id: "train",
        type: "step",
        position: { x: 1320, y: -227.73983564637743 },
        data: {
          label: "Train",
          textOnly: true,
          lines: ["AutoML / endpoint"],
          in: true,
          out: true,
        },
      },
      {
        id: "deploy",
        type: "step",
        position: { x: 1480, y: -227.73983564637743 },
        data: {
          label: "Deploy",
          textOnly: true,
          lines: ["API ready"],
          in: true,
        },
      },
      {
        id: "gemini",
        type: "step",
        position: { x: 1131.0289923593396, y: 10.122103276260944 },
        data: {
          label: "Gemini",
          logo: "/brands/gemini.png",
          lines: ["validate · allocate"],
          in: true,
        },
      },
      {
        id: "datasets",
        type: "step",
        position: { x: 598.8110372630342, y: -326.46850621050567 },
        data: {
          label: "Downloaded datasets",
          textOnly: true,
          lines: ["AIDERv2 · Zenodo"],
          note: "train images",
          out: true,
        },
      },
      {
        id: "bq",
        type: "step",
        position: { x: 820.9004818217878, y: -227.5975167218253 },
        data: {
          label: "BigQuery",
          logo: "/brands/bigquery.png",
          lines: ["verdict mirror"],
          in: true,
          inFromBottom: true,
          out: true,
        },
      },
      {
        id: "twilio",
        type: "step",
        position: { x: 946.8601540587107, y: 126.9984601587933 },
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
        position: { x: 1105.3856532882896, y: 184.95485379214168 },
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
        position: { x: 786.9145018931259, y: 320.60683174379375 },
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
        position: { x: 561.1357997579378, y: -230.91196180899942 },
        data: {
          label: "Earth Engine",
          logo: "/brands/earth-engine.webp",
          lines: ["offline → ee_datasets"],
          out: true,
        },
      },
      {
        id: "elevenlabs",
        type: "step",
        position: { x: 946.4159491913505, y: 243.93852558332713 },
        data: {
          label: "ElevenLabs",
          logo: "/brands/elevenlabs.png",
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
    /** Cloud Run → integrations: curved dashed so they don’t look like node-to-node hops. */
    const busStyle = {
      stroke: "#5c6570",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    };
    const busMarker = {
      type: MarkerType.ArrowClosed,
      color: "#5c6570",
    } as const;
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
        markerEnd: marker,
        style,
      },
      {
        id: "e-sqsp",
        source: "hosting",
        sourceHandle: "out-bottom",
        target: "squarespace",
        targetHandle: "in-from-top",
        label: "DNS",
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
        markerEnd: marker,
        style,
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
        id: "e-gh",
        source: "github",
        sourceHandle: "out-bottom",
        target: "run",
        targetHandle: "in-from-top",
        label: "deploy",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-ui",
        source: "run",
        sourceHandle: "out-bottom",
        target: "ui",
        targetHandle: "in-from-top",
        label: "frontend",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-figma",
        source: "figma",
        sourceHandle: "out",
        target: "ui",
        targetHandle: "in",
        label: "design",
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
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "storage",
        targetHandle: "in",
        markerEnd: busMarker,
        style: busStyle,
      },
      {
        id: "e-auth",
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "auth",
        targetHandle: "in",
        markerEnd: busMarker,
        style: busStyle,
      },
      {
        id: "e-fs-gemini",
        source: "firestore",
        sourceHandle: "out-bot",
        target: "gemini",
        targetHandle: "in",
        label: "validate",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-run-twilio",
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "twilio",
        targetHandle: "in",
        label: "alerts",
        markerEnd: busMarker,
        style: busStyle,
        ...labelBg,
      },
      {
        id: "e-run-resend",
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "resend",
        targetHandle: "in",
        markerEnd: busMarker,
        style: busStyle,
      },
      {
        id: "e-run-eleven",
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "elevenlabs",
        targetHandle: "in",
        markerEnd: busMarker,
        style: busStyle,
      },
      {
        id: "e-datasets-bq",
        source: "datasets",
        sourceHandle: "out",
        target: "bq",
        targetHandle: "in",
        label: "import",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-fs-bq",
        source: "firestore",
        sourceHandle: "out-up",
        target: "bq",
        targetHandle: "in-from-bottom",
        label: "verdict sync",
        markerEnd: marker,
        style,
        ...labelBg,
        type: "smoothstep",
      },
      {
        id: "e-run-maps",
        type: "default",
        source: "run",
        sourceHandle: "out-mid",
        target: "maps",
        targetHandle: "in",
        markerEnd: busMarker,
        style: busStyle,
      },
      {
        id: "e-ee",
        source: "ee",
        sourceHandle: "out",
        target: "firestore",
        targetHandle: "in",
        label: "ee_datasets",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-bq-vertex",
        source: "bq",
        sourceHandle: "out",
        target: "vertex",
        targetHandle: "in",
        label: "cron → GCS",
        markerEnd: marker,
        style,
        ...labelBg,
      },
      {
        id: "e-vertex-train",
        source: "vertex",
        sourceHandle: "out",
        target: "train",
        targetHandle: "in",
        markerEnd: marker,
        style,
      },
      {
        id: "e-train-deploy",
        source: "train",
        sourceHandle: "out",
        target: "deploy",
        targetHandle: "in",
        markerEnd: marker,
        style,
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
          Terraform provisions Firebase Hosting → Cloud Run (Next.js + shadcn /
          Tailwind / Lucide / Motion) → Firestore / Storage / Auth. Gemini +
          Vertex for AI; Twilio, Resend, ElevenLabs for alerts and Speak; Earth
          Engine offline datasets.
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
