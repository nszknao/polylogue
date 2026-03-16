import type { Persona, Protocol, ProtocolType } from "@/types.ts";
import { delphiProtocol } from "./delphi.ts";
import { devilsAdvocateProtocol } from "./devils-advocate.ts";
import { dialecticalProtocol } from "./dialectical.ts";
import { ngtProtocol } from "./ngt.ts";
import { roundRobinProtocol } from "./round-robin.ts";
import { stepladderProtocol } from "./stepladder.ts";

const protocols: Record<ProtocolType, Protocol> = {
  "round-robin": roundRobinProtocol,
  "devils-advocate": devilsAdvocateProtocol,
  dialectical: dialecticalProtocol,
  ngt: ngtProtocol,
  stepladder: stepladderProtocol,
  delphi: delphiProtocol,
};

export function getProtocol(type: ProtocolType): Protocol {
  return protocols[type];
}

export function assignRoles(
  protocol: ProtocolType,
  personas: Persona[],
): Persona[] {
  switch (protocol) {
    case "devils-advocate":
      return personas.map((p, i) => ({
        ...p,
        role: i === personas.length - 1 ? "devil" : "advocate",
      }));
    case "dialectical": {
      const mid = Math.ceil(personas.length / 2);
      return personas.map((p, i) => ({
        ...p,
        role: i < mid ? "team-a" : "team-b",
      }));
    }
    default:
      return personas;
  }
}
