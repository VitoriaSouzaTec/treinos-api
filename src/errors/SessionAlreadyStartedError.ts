export class SessionAlreadyStartedError extends Error {
  constructor(message: string = "A session is already started for this day") {
    super(message);
    this.name = "SessionAlreadyStartedError";
  }
}
