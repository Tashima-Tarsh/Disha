import { appendEvidenceEvent } from "../unified/evidence-ledger";
import type { GovernedExtensionLifecycleEvent, EvidenceEmitter, ExtensionEvidenceInput } from "./contracts";

export class LedgerEvidenceEmitter implements EvidenceEmitter {
  private readonly events: GovernedExtensionLifecycleEvent[] = [];

  /** Appends to the core ledger before exposing the event in the lifecycle trace. */
  async emit(input: ExtensionEvidenceInput): Promise<string> {
    const { extensionId, phase, ...appendInput } = input;
    if (!extensionId.trim()) throw new Error("Extension evidence requires a non-empty extensionId");
    const event = await appendEvidenceEvent(appendInput);

    this.events.push({ extensionId, phase, evidenceEventId: event.eventId });

    return event.eventId;
  }

  lifecycle(): GovernedExtensionLifecycleEvent[] {
    return [...this.events];
  }
}

export function createLedgerEvidenceEmitter(): LedgerEvidenceEmitter {
  return new LedgerEvidenceEmitter();
}
