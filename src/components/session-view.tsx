import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Static, Text, useInput } from "ink";
import { useEffect, useReducer, useRef, useState } from "react";
import { PROTOCOL_LABELS } from "@/components/protocol-display.tsx";
import type { OrchestratorEvent } from "@/lib/orchestrator.ts";
import { Orchestrator } from "@/lib/orchestrator.ts";
import type { Persona, ProtocolType } from "@/types.ts";

type Props = {
  topic: string;
  protocol: ProtocolType;
  personas: Persona[];
};

type CompletedMessage = {
  personaId: string;
  round: number;
  content: string;
};

type PauseMode = "none" | "paused" | "input";

type SessionPhase =
  | "discussing"
  | "moderating"
  | "summarizing"
  | "awaiting-intervention"
  | "processing-intervention"
  | "done";

type State = {
  currentRound: number;
  roundLabel: string;
  activePersonaIds: Set<string>;
  streamingText: Map<string, string>;
  completedMessages: CompletedMessage[];
  phase: SessionPhase;
  pauseMode: PauseMode;
  summary: string | null;
  moderatorSummary: string | null;
  interventionAction: string | null;
  interventionDirection: string | null;
};

type Action =
  | { type: "round-start"; round: number; label: string }
  | { type: "message-start"; personaId: string }
  | { type: "message-chunk"; personaId: string; chunk: string }
  | { type: "message-end"; personaId: string; content: string; round: number }
  | { type: "moderator-start" }
  | { type: "moderator-end"; content: string }
  | { type: "summary-start" }
  | { type: "summary-end"; content: string }
  | { type: "awaiting-intervention" }
  | {
      type: "intervention-judged";
      action: string;
      direction: string;
    }
  | { type: "complete"; summary: string }
  | { type: "interrupted" }
  | { type: "set-pause-mode"; mode: PauseMode }
  | { type: "processing-intervention" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "round-start":
      return {
        ...state,
        currentRound: action.round,
        roundLabel: action.label,
        phase: "discussing",
        summary: null,
        interventionAction: null,
        interventionDirection: null,
      };
    case "message-start": {
      const nextIds = new Set(state.activePersonaIds);
      nextIds.add(action.personaId);
      return { ...state, activePersonaIds: nextIds };
    }
    case "message-chunk": {
      const next = new Map(state.streamingText);
      next.set(
        action.personaId,
        (next.get(action.personaId) ?? "") + action.chunk,
      );
      return { ...state, streamingText: next };
    }
    case "message-end": {
      const nextStream = new Map(state.streamingText);
      nextStream.delete(action.personaId);
      const nextIds = new Set(state.activePersonaIds);
      nextIds.delete(action.personaId);
      return {
        ...state,
        activePersonaIds: nextIds,
        streamingText: nextStream,
        completedMessages: [
          ...state.completedMessages,
          {
            personaId: action.personaId,
            round: action.round,
            content: action.content,
          },
        ],
      };
    }
    case "moderator-start":
      return { ...state, phase: "moderating" };
    case "moderator-end":
      return {
        ...state,
        phase: "discussing",
        moderatorSummary: action.content,
      };
    case "summary-start":
      return { ...state, phase: "summarizing" };
    case "summary-end":
      return { ...state, summary: action.content };
    case "awaiting-intervention":
      return { ...state, phase: "awaiting-intervention" };
    case "intervention-judged":
      return {
        ...state,
        interventionAction: action.action,
        interventionDirection: action.direction,
      };
    case "processing-intervention":
      return { ...state, phase: "processing-intervention" };
    case "complete":
      return {
        ...state,
        phase: "done",
        summary: action.summary,
      };
    case "interrupted":
      return {
        ...state,
        phase: "done",
      };
    case "set-pause-mode":
      return { ...state, pauseMode: action.mode };
    default:
      return state;
  }
}

const initialState: State = {
  currentRound: 0,
  roundLabel: "",
  activePersonaIds: new Set(),
  streamingText: new Map(),
  completedMessages: [],
  phase: "discussing",
  pauseMode: "none",
  summary: null,
  moderatorSummary: null,
  interventionAction: null,
  interventionDirection: null,
};

const ESC_DOUBLE_TAP_MS = 500;

export function SessionView({ topic, protocol, personas }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const orchestratorRef = useRef<Orchestrator | null>(null);
  const [interventionDraft, setInterventionDraft] = useState("");
  const lastEscRef = useRef<number>(0);

  useEffect(() => {
    const orchestrator = new Orchestrator();
    orchestratorRef.current = orchestrator;

    const handleEvent = (event: OrchestratorEvent) => {
      switch (event.type) {
        case "round-start":
          dispatch({
            type: "round-start",
            round: event.round,
            label: event.label,
          });
          break;
        case "message-start":
          dispatch({ type: "message-start", personaId: event.personaId });
          break;
        case "message-chunk":
          dispatch({
            type: "message-chunk",
            personaId: event.personaId,
            chunk: event.chunk,
          });
          break;
        case "message-end":
          dispatch({
            type: "message-end",
            personaId: event.personaId,
            content: event.content,
            round: event.round,
          });
          break;
        case "moderator-start":
          dispatch({ type: "moderator-start" });
          break;
        case "moderator-end":
          dispatch({ type: "moderator-end", content: event.content });
          break;
        case "summary-start":
          dispatch({ type: "summary-start" });
          break;
        case "summary-end":
          dispatch({ type: "summary-end", content: event.content });
          break;
        case "awaiting-intervention":
          dispatch({ type: "awaiting-intervention" });
          break;
        case "intervention-judged":
          dispatch({
            type: "intervention-judged",
            action: event.action,
            direction: event.direction,
          });
          break;
        case "complete":
          dispatch({
            type: "complete",
            summary: event.summary,
          });
          break;
        case "interrupted":
          dispatch({ type: "interrupted" });
          break;
      }
    };

    orchestrator.run(topic, personas, protocol, handleEvent).catch(() => {
      dispatch({ type: "interrupted" });
    });
  }, [topic, personas, protocol]);

  useInput((_input, key) => {
    if (state.phase === "done") return;
    if (state.pauseMode === "input") return;

    // Esc×2 detection (500ms window)
    if (key.escape) {
      const now = Date.now();
      if (now - lastEscRef.current < ESC_DOUBLE_TAP_MS) {
        lastEscRef.current = 0;
        if (state.pauseMode === "none") {
          orchestratorRef.current?.pause();
          dispatch({ type: "set-pause-mode", mode: "paused" });
        }
      } else {
        lastEscRef.current = now;
      }
      return;
    }

    if (state.pauseMode === "paused") {
      if (_input === "c") {
        orchestratorRef.current?.resume();
        dispatch({ type: "set-pause-mode", mode: "none" });
      } else if (_input === "m") {
        dispatch({ type: "set-pause-mode", mode: "input" });
      } else if (_input === "q") {
        orchestratorRef.current?.abort();
        dispatch({ type: "set-pause-mode", mode: "none" });
      }
    }

    // In awaiting-intervention phase, allow direct intervention
    if (state.phase === "awaiting-intervention" && state.pauseMode === "none") {
      if (_input === "m") {
        dispatch({ type: "set-pause-mode", mode: "input" });
      } else if (_input === "q") {
        orchestratorRef.current?.abort();
      }
    }
  });

  const handleInterventionSubmit = (value: string) => {
    if (value.trim()) {
      if (state.phase === "awaiting-intervention") {
        orchestratorRef.current?.submitIntervention(value.trim());
        dispatch({ type: "processing-intervention" });
      } else {
        orchestratorRef.current?.setUserDirection(value.trim());
        orchestratorRef.current?.resume();
      }
    } else {
      if (state.phase !== "awaiting-intervention") {
        orchestratorRef.current?.resume();
      }
    }
    setInterventionDraft("");
    dispatch({ type: "set-pause-mode", mode: "none" });
  };

  const personaMap = new Map(personas.map((p) => [p.id, p]));

  // Track which round each message belongs to for header display
  const seenRounds = new Set<number>();
  type StaticItem =
    | { kind: "header"; id: string }
    | {
        kind: "message";
        id: string;
        personaId: string;
        round: number;
        content: string;
        showRoundHeader: boolean;
      };

  const staticItems: StaticItem[] = [
    { kind: "header", id: "__header__" },
    ...state.completedMessages.map((msg): StaticItem => {
      const showRoundHeader = !seenRounds.has(msg.round);
      if (showRoundHeader) seenRounds.add(msg.round);
      return {
        kind: "message",
        ...msg,
        showRoundHeader,
        id: `${msg.personaId}-r${msg.round}`,
      };
    }),
  ];

  return (
    <Box flexDirection="column">
      {/* Completed messages — rendered once and scrolled off */}
      <Static items={staticItems}>
        {(item) => {
          if (item.kind === "header") {
            return (
              <Box key={item.id} flexDirection="column" marginBottom={1}>
                <Text>
                  <Text bold color="green">
                    Protocol:{" "}
                  </Text>
                  <Text bold>{PROTOCOL_LABELS[protocol]}</Text>
                </Text>
                <Text>
                  <Text bold color="green">
                    Personas:{" "}
                  </Text>
                  <Text>
                    {personas.map((p) => `${p.name} (${p.model})`).join(", ")}
                  </Text>
                </Text>
              </Box>
            );
          }
          const persona = personaMap.get(item.personaId);
          return (
            <Box key={item.id} flexDirection="column">
              {item.showRoundHeader && (
                <Box marginTop={item.round > 1 ? 1 : 0} marginBottom={1}>
                  <Text bold color="cyan">
                    Round {item.round}
                  </Text>
                </Box>
              )}
              <Box flexDirection="column" marginBottom={1}>
                <Text bold color={persona?.color ?? "white"}>
                  {persona?.name ?? item.personaId}
                  <Text dimColor> ({persona?.model})</Text>
                </Text>
                <Box marginLeft={2}>
                  <Text wrap="wrap">{item.content}</Text>
                </Box>
              </Box>
            </Box>
          );
        }}
      </Static>

      {/* Currently streaming messages */}
      {state.activePersonaIds.size > 0 &&
        state.pauseMode === "none" &&
        [...state.activePersonaIds].map((pid) => (
          <Box key={`stream-${pid}`} flexDirection="column" marginBottom={1}>
            <Text bold color={personaMap.get(pid)?.color ?? "white"}>
              {personaMap.get(pid)?.name ?? pid}
              <Text dimColor> ({personaMap.get(pid)?.model})</Text>
            </Text>
            <Box marginLeft={2}>
              <Text wrap="wrap" dimColor>
                {state.streamingText.get(pid) ?? ""}
              </Text>
            </Box>
          </Box>
        ))}

      {/* Moderator phase */}
      {state.phase === "moderating" && (
        <Box>
          <Spinner label="Moderator organizing discussion points..." />
        </Box>
      )}

      {/* Summary generation */}
      {state.phase === "summarizing" && (
        <Box>
          <Spinner label="Generating summary..." />
        </Box>
      )}

      {/* Summary display */}
      {state.summary && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="green">
            --- Summary ---
          </Text>
          <Box marginTop={1}>
            <Text wrap="wrap">{state.summary}</Text>
          </Box>
        </Box>
      )}

      {/* Processing intervention */}
      {state.phase === "processing-intervention" && (
        <Box marginTop={1}>
          <Spinner label="Processing intervention..." />
        </Box>
      )}

      {/* Awaiting intervention */}
      {state.phase === "awaiting-intervention" &&
        state.pauseMode === "none" && (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="green"
            paddingX={1}
            marginTop={1}
          >
            <Text bold color="green">
              Session active
            </Text>
            <Text>
              <Text color="blue">m</Text> Send intervention |{" "}
              <Text color="red">q</Text> End session
            </Text>
          </Box>
        )}

      {/* Pause menu (during discussion) */}
      {state.pauseMode === "paused" && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          marginTop={1}
        >
          <Text bold color="yellow">
            Paused
          </Text>
          <Text>
            <Text color="green">c</Text> Continue | <Text color="blue">m</Text>{" "}
            Send message | <Text color="red">q</Text> Quit
          </Text>
        </Box>
      )}

      {/* Text input for intervention/direction */}
      {state.pauseMode === "input" && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="blue">
            {state.phase === "awaiting-intervention"
              ? "Intervention message:"
              : "Direction for the discussion:"}
          </Text>
          <Box>
            <Text color="green">&gt; </Text>
            <TextInput
              defaultValue={interventionDraft}
              onSubmit={handleInterventionSubmit}
              onChange={setInterventionDraft}
            />
          </Box>
        </Box>
      )}

      {/* Hint for Esc×2 */}
      {state.pauseMode === "none" && state.phase === "discussing" && (
        <Box marginTop={1}>
          <Text dimColor>[Esc×2 to pause]</Text>
        </Box>
      )}

      {/* Done */}
      {state.phase === "done" && (
        <Box marginTop={1}>
          <Text bold color="green">
            Session complete
          </Text>
        </Box>
      )}
    </Box>
  );
}
