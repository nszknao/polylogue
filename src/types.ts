export type ProtocolType =
  | "round-robin"
  | "devils-advocate"
  | "dialectical"
  | "ngt"
  | "stepladder"
  | "delphi";

export type ContextStrategy = "summary" | "full" | "last-speaker-only";

export type DisplayPolicy = {
  showPersonaName: boolean;
  showModel: boolean;
  revealAfterSummary: boolean;
};

export type RoundConfig = {
  label: string;
  type: string;
  participants: string[];
  promptBuilder: (context: RoundContext) => string;
};

export type RoundContext = {
  topic: string;
  persona: Persona;
  allMessages: Array<{ name: string; content: string }>;
  moderatorSummary?: string;
};

export type Protocol = {
  type: ProtocolType;
  name: string;
  description: string;
  displayPolicy: DisplayPolicy;
  contextStrategy: ContextStrategy;
  buildRounds: (personas: Persona[], topic: string) => RoundConfig[];
};

export type PersonaTool = "web_search";

export type Persona = {
  id: string;
  name: string;
  expertise: string;
  perspective: string;
  color: string;
  model: string;
  role?: string;
  tools?: PersonaTool[];
};

export type Message = {
  personaId: string;
  round: number;
  content: string;
  timestamp: number;
};

export type Round = {
  number: number;
  type: string;
  messages: Message[];
};

export type Session = {
  id: string;
  topic: string;
  protocol: ProtocolType;
  displayPolicy: DisplayPolicy;
  personas: Persona[];
  rounds: Round[];
  summary: string;
  createdAt: number;
};
