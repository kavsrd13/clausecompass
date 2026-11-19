/**
 * One active request per UI operation. A superseded response may still settle
 * after cancellation, so only its current owner can update the view.
 */
export class LatestRequest {
  /** @type {AbortController | null} */
  #active = null;
  #timeoutMs;
  #setBusy;

  /** @param {number} timeoutMs @param {(busy: boolean) => void} setBusy */
  constructor(timeoutMs, setBusy) {
    this.#timeoutMs = timeoutMs;
    this.#setBusy = setBusy;
  }

  cancel() {
    this.#active?.abort();
    this.#active = null;
    this.#setBusy(false);
  }

  /**
   * @template T
   * @param {(signal: AbortSignal) => Promise<T>} load
   * @param {(value: T) => void} onSuccess
   * @param {(error: unknown) => void} onError
   */
  async run(load, onSuccess, onError) {
    this.#active?.abort();
    const request = new AbortController();
    this.#active = request;
    this.#setBusy(true);
    try {
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(this.#timeoutMs),
      ]);
      const value = await load(signal);
      // A loader can resolve even after its request has been cancelled.
      signal.throwIfAborted();
      onSuccess(value);
    } catch (error) {
      if (this.#active === request) onError(error);
    } finally {
      if (this.#active === request) {
        this.#active = null;
        this.#setBusy(false);
      }
    }
  }
}
