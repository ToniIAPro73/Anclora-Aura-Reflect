export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details) {
    super(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
}

export class ModelInvocationError extends HttpError {
  constructor(message, details) {
    super(502, "MODEL_INVOCATION_FAILED", message, details);
  }
}

export class UpstreamUnavailableError extends HttpError {
  constructor(message) {
    super(503, "UPSTREAM_UNAVAILABLE", message);
  }
}
