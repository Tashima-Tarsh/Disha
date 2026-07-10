import { appendEvidenceEvent, type EvidenceAppendInput } from "../unified/evidence-ledger";
import type { GovernedExtensionLifecycleEvent, GovernedExtensionPhase, EvidenceEmitter } from "./contracts";

export class LedgerEvidenceEmitter implements EvidenceEmitter {
  private readonly events: GovernedExtensionLifecycleEvent[] = [];

  async emit(input: EvidenceAppendInput & { extensionId?: string; phase?: GovernedExtensionPhase }): Promise<string> {
    const { extensionId, phase, ...appendInput } = input;
    const event = await appendEvidenceEvent(appendInput);

    if (extensionId && phase) {
      this.events.push({ extensionId, phase, evidenceEventId: event.eventId });
    }

    return event.eventId;
  }

  lifecycle(): GovernedExtensionLifecycleEvent[] {
    return [...this.events];
  }
}

export function createLedgerEvidenceEmitter(): LedgerEvidenceEmitter {
  return new LedgerEvidenceEmitter();
}
