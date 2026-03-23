export class NextFlowApiError extends Error {
  statusCode: number;
  success: boolean = false;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "NextFlowApiError";
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends NextFlowApiError {
  constructor(message: string = "Unauthorized. Please sign in to continue.") {
    super(401, message);
  }
}

export class ForbiddenError extends NextFlowApiError {
  constructor(
    message: string = "Forbidden. You do not have access to this resource.",
  ) {
    super(403, message);
  }
}

export class NotFoundError extends NextFlowApiError {
  constructor(message: string = "Resource not found.") {
    super(404, message);
  }
}

export class ValidationError extends NextFlowApiError {
  constructor(message: string = "Invalid request data.") {
    super(422, message);
  }
}

export class ConflictError extends NextFlowApiError {
  constructor(message: string = "Conflict. Resource already exists.") {
    super(409, message);
  }
}

export class InternalServerError extends NextFlowApiError {
  constructor(
    message: string = "Internal server error. Please try again later.",
  ) {
    super(500, message);
  }
}

export function isNextFlowApiError(error: unknown): error is NextFlowApiError {
  return error instanceof NextFlowApiError;
}
