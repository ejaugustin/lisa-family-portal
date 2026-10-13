/**
 * A Camera recording lease is mandatory before
 * any microphone track is attached. Never substitute a signaling acknowledgement
 * for confirmation from the native audio recorder.
 */
export interface TalkMicrophone {
  setEnabled(enabled: boolean): void;
  stop(): void;
}

export interface TalkRecordingLease {
  /** Camera must renew only while digital audio is being saved. */
  expiresAt: number;
  release(): Promise<void>;
}

export interface TalkDependencies {
  acquireMicrophone: () => Promise<TalkMicrophone>;
  prepareRecording: () => Promise<TalkRecordingLease>;
  attach: (microphone: TalkMicrophone) => Promise<void>;
  /** Must apply to this controller's peer only, never a replacement session. */
  detach: () => Promise<void>;
  now: () => number;
  changed: (state: TalkState, message?: string) => void;
}

export type TalkState = "MUTED" | "PREPARING" | "TALKING" | "UNAVAILABLE";

/** One instance per peer connection; muted by default and never auto-resumes. */
export class TalkSession {
  private generation = 0;
  private disposed = false;
  private microphone: TalkMicrophone | undefined;
  private lease: TalkRecordingLease | undefined;
  private operation: Promise<void> | undefined;
  private cleanup: Promise<void> = Promise.resolve();
  private expiration: ReturnType<typeof setTimeout> | undefined;
  private preparation: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly dependencies: TalkDependencies) {}

  start(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    // Keep a cancelled async permission/attach operation serialized until settled.
    if (this.operation !== undefined) return this.operation;
    if (this.microphone !== undefined) return Promise.resolve();
    const generation = ++this.generation;
    this.dependencies.changed("PREPARING");
    this.preparation = setTimeout(() => {
      if (generation === this.generation) {
        this.mute();
        this.dependencies.changed("UNAVAILABLE", "Talk preparation timed out.");
      }
    }, 15_000);
    const operation = this.prepare(generation).finally(() => {
      if (this.operation === operation) this.operation = undefined;
    });
    this.operation = operation;
    return operation;
  }

  /** Call immediately on blur, background, transport loss, or recording failure. */
  mute(): void {
    ++this.generation;
    this.clearTimers();
    const microphone = this.microphone;
    this.microphone = undefined;
    // Disable synchronously before any network/native cleanup is awaited.
    microphone?.setEnabled(false);
    microphone?.stop();
    const lease = this.lease;
    this.lease = undefined;
    if (lease !== undefined) void lease.release().catch(() => undefined);
    // Detach after any in-flight attach, and before the next acquisition.
    const operation = this.operation ?? Promise.resolve();
    this.cleanup = operation.then(() => this.dependencies.detach()).catch(() => undefined);
    this.dependencies.changed("MUTED");
  }

  dispose(): void {
    this.disposed = true;
    this.mute();
  }

  /** Native recording failures revoke this immediately, not after lease expiry. */
  recordingFailed(): void {
    this.mute();
    this.dependencies.changed("UNAVAILABLE", "The camera cannot save talk audio.");
  }

  renew(expiresAt: number): void {
    if (this.lease === undefined || this.microphone === undefined) return;
    try {
      this.validateLease({ ...this.lease, expiresAt });
      this.lease.expiresAt = expiresAt;
      clearTimeout(this.expiration);
      const generation = this.generation;
      this.expiration = setTimeout(() => {
        if (generation === this.generation) this.recordingFailed();
      }, expiresAt - this.dependencies.now());
    } catch { this.recordingFailed(); }
  }

  private async prepare(generation: number): Promise<void> {
    let microphone: TalkMicrophone | undefined;
    let lease: TalkRecordingLease | undefined;
    let attached = false;
    let handedOff = false;
    const current = (): boolean => !this.disposed && this.generation === generation;
    try {
      await this.cleanup;
      if (!current()) return;
      // Permission may finish after the user has left the screen.
      microphone = await this.dependencies.acquireMicrophone();
      microphone.setEnabled(false);
      this.microphone = microphone;
      if (!current()) return;
      lease = await this.dependencies.prepareRecording();
      if (!current()) return;
      this.validateLease(lease);
      attached = true;
      await this.dependencies.attach(microphone);
      if (!current()) return;
      this.validateLease(lease);
      this.microphone = microphone;
      this.lease = lease;
      handedOff = true;
      clearTimeout(this.preparation);
      this.preparation = undefined;
      this.expiration = setTimeout(() => {
        if (current()) this.recordingFailed();
      }, lease.expiresAt - this.dependencies.now());
      microphone.setEnabled(true);
      this.dependencies.changed("TALKING");
    } catch (error) {
      if (current()) {
        this.clearTimers();
        this.dependencies.changed("UNAVAILABLE", error instanceof Error ? error.message : "Talk could not start.");
      }
    } finally {
      if (current() && !handedOff) {
        clearTimeout(this.preparation);
        this.preparation = undefined;
      }
      if (!handedOff) {
        if (microphone !== undefined && this.microphone === microphone) {
          this.microphone = undefined;
          microphone.setEnabled(false);
          microphone.stop();
        }
        if (attached) await this.dependencies.detach().catch(() => undefined);
        if (lease !== undefined) await lease.release().catch(() => undefined);
      }
    }
  }

  private validateLease(lease: TalkRecordingLease): void {
    const remaining = lease.expiresAt - this.dependencies.now();
    if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 30_000) {
      throw new Error("The camera has not confirmed saved talk audio.");
    }
  }

  private clearTimers(): void {
    clearTimeout(this.expiration);
    clearTimeout(this.preparation);
    this.expiration = undefined;
    this.preparation = undefined;
  }
}
