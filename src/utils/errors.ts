export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export class ContentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentExtractionError';
  }
}

export class ClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentExtractionError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
