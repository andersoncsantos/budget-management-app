/**
 * Runtime boundary validators for untrusted API and localStorage payloads (§3.1, §10.2, §13.3).
 *
 * Uses strict `unknown` narrowing with zero `any` casts to ensure external data
 * matches our expected contracts before entering the application state.
 */

import type {
  AuthResponse,
  CategoryResponse,
  MetadataResponse,
  TransactionBatchResponse,
  TransactionImportError,
  TransactionResponse,
  TransactionType,
} from '../../types/api';
import type { BudgetData } from '../../budgetData';

export class BoundaryValidationError extends Error {
  readonly boundary: string;

  constructor(boundary: string, details: string) {
    super(`[BoundaryValidationError:${boundary}] ${details}`);
    this.name = 'BoundaryValidationError';
    this.boundary = boundary;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(
  obj: Record<string, unknown>,
  field: string,
  boundary: string
): string {
  const val = obj[field];
  if (typeof val !== 'string' || val.trim() === '') {
    throw new BoundaryValidationError(
      boundary,
      `Expected non-empty string for "${field}", received ${typeof val}`
    );
  }
  return val;
}

function expectNullableString(
  obj: Record<string, unknown>,
  field: string,
  boundary: string
): string | null {
  const val = obj[field];
  if (val === undefined || val === null) return null;
  if (typeof val !== 'string') {
    throw new BoundaryValidationError(
      boundary,
      `Expected string or null for "${field}", received ${typeof val}`
    );
  }
  return val;
}

function expectFiniteNumber(
  obj: Record<string, unknown>,
  field: string,
  boundary: string
): number {
  const val = obj[field];
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new BoundaryValidationError(
      boundary,
      `Expected finite number for "${field}", received ${String(val)}`
    );
  }
  return val;
}

function expectTransactionType(
  obj: Record<string, unknown>,
  field: string,
  boundary: string
): TransactionType {
  const val = obj[field];
  if (val !== 'EXPENSE' && val !== 'INCOME') {
    throw new BoundaryValidationError(
      boundary,
      `Expected "EXPENSE" | "INCOME" for "${field}", received ${String(val)}`
    );
  }
  return val;
}

export function parseAuthResponse(raw: unknown): AuthResponse {
  const boundary = 'AuthResponse';
  if (!isRecord(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an object');
  }
  return {
    userId: expectString(raw, 'userId', boundary),
    email: expectString(raw, 'email', boundary),
    token: expectString(raw, 'token', boundary),
  };
}

export function parseTransactionResponse(raw: unknown): TransactionResponse {
  const boundary = 'TransactionResponse';
  if (!isRecord(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an object');
  }
  return {
    id: expectNullableString(raw, 'id', boundary),
    userId: expectString(raw, 'userId', boundary),
    categoryId: expectNullableString(raw, 'categoryId', boundary),
    amount: expectFiniteNumber(raw, 'amount', boundary),
    date: expectString(raw, 'date', boundary),
    category: expectString(raw, 'category', boundary),
    description: expectNullableString(raw, 'description', boundary),
    bank: expectNullableString(raw, 'bank', boundary),
    type: expectTransactionType(raw, 'type', boundary),
  };
}

export function parseTransactionResponseList(raw: unknown): TransactionResponse[] {
  const boundary = 'TransactionResponse[]';
  if (!Array.isArray(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an array');
  }
  return raw.map((item) => parseTransactionResponse(item));
}

export function parseCategoryResponse(raw: unknown): CategoryResponse {
  const boundary = 'CategoryResponse';
  if (!isRecord(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an object');
  }
  return {
    id: expectString(raw, 'id', boundary),
    name: expectString(raw, 'name', boundary),
    userId: expectString(raw, 'userId', boundary),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
  };
}

export function parseCategoryResponseList(raw: unknown): CategoryResponse[] {
  const boundary = 'CategoryResponse[]';
  if (!Array.isArray(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an array');
  }
  return raw.map((item) => parseCategoryResponse(item));
}

export function parseTransactionBatchResponse(raw: unknown): TransactionBatchResponse {
  const boundary = 'TransactionBatchResponse';
  if (!isRecord(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an object');
  }
  const rawErrors = Array.isArray(raw.errors) ? raw.errors : [];
  const errors: TransactionImportError[] = rawErrors.map((err) => {
    if (!isRecord(err)) {
      throw new BoundaryValidationError(boundary, 'Invalid error entry');
    }
    const line =
      typeof err.line === 'number' && Number.isFinite(err.line) ? err.line : null;
    const message = typeof err.message === 'string' ? err.message : 'Unknown import error';
    return { line, message };
  });

  return {
    totalRecords: expectFiniteNumber(raw, 'totalRecords', boundary),
    importedRecords: expectFiniteNumber(raw, 'importedRecords', boundary),
    failedRecords: expectFiniteNumber(raw, 'failedRecords', boundary),
    errors,
  };
}

export function parseMetadataResponse(raw: unknown): MetadataResponse {
  const boundary = 'MetadataResponse';
  if (!isRecord(raw)) {
    throw new BoundaryValidationError(boundary, 'Payload must be an object');
  }
  return {
    realBalance: expectFiniteNumber(raw, 'realBalance', boundary),
    updatedDate: expectNullableString(raw, 'updatedDate', boundary),
  };
}

export function validateStoredBudgetPayload(raw: unknown): raw is BudgetData & {
  transactions?: unknown[];
} {
  if (!isRecord(raw)) return false;
  if (!isRecord(raw.metadata)) return false;
  if (!isRecord(raw.income)) return false;
  if (!isRecord(raw.expenses)) return false;
  if (!isRecord(raw.balance) || !isRecord(raw.balance.monthlyValues)) return false;
  return true;
}
