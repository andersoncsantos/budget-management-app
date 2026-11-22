import { describe, it, expect } from 'vitest';
import {
  BoundaryValidationError,
  parseAuthResponse,
  parseCategoryResponseList,
  parseMetadataResponse,
  parseTransactionBatchResponse,
  parseTransactionResponse,
  parseTransactionResponseList,
  validateStoredBudgetPayload,
} from '../validators';
import { budgetData } from '../../../budgetData';

describe('Boundary Validators (§3.1, §10.2, §13.3)', () => {
  it('validates AuthResponse and rejects malformed payloads', () => {
    const valid = parseAuthResponse({
      userId: 'u-1',
      email: 'user@example.com',
      token: 'jwt-token',
    });
    expect(valid).toEqual({
      userId: 'u-1',
      email: 'user@example.com',
      token: 'jwt-token',
    });

    expect(() => parseAuthResponse(null)).toThrow(BoundaryValidationError);
    expect(() => parseAuthResponse({ userId: 'u-1', email: '' })).toThrow(
      BoundaryValidationError
    );
  });

  it('validates TransactionResponse and TransactionResponseList', () => {
    const rawTx = {
      id: 'tx-1',
      userId: 'u-1',
      categoryId: 'cat-1',
      amount: 125.5,
      date: '2026-03-10',
      category: 'Alimentação',
      description: 'Mercado',
      bank: 'Itaú',
      type: 'EXPENSE',
    };

    expect(parseTransactionResponse(rawTx)).toEqual(rawTx);
    expect(parseTransactionResponseList([rawTx])).toHaveLength(1);

    expect(() =>
      parseTransactionResponse({ ...rawTx, type: 'UNKNOWN_TYPE' })
    ).toThrow(BoundaryValidationError);
    expect(() =>
      parseTransactionResponse({ ...rawTx, amount: Number.NaN })
    ).toThrow(BoundaryValidationError);
    expect(() => parseTransactionResponseList('not-an-array')).toThrow(
      BoundaryValidationError
    );
  });

  it('validates CategoryResponseList, TransactionBatchResponse, MetadataResponse, and stored BudgetData', () => {
    const cats = parseCategoryResponseList([
      { id: 'c-1', name: 'Contas', userId: 'u-1', createdAt: '2026-01-01' },
    ]);
    expect(cats[0]?.name).toBe('Contas');

    const batch = parseTransactionBatchResponse({
      totalRecords: 10,
      importedRecords: 8,
      failedRecords: 2,
      errors: [{ line: 4, message: 'Invalid date' }],
    });
    expect(batch.importedRecords).toBe(8);
    expect(batch.errors).toEqual([{ line: 4, message: 'Invalid date' }]);

    const meta = parseMetadataResponse({
      realBalance: 9876.54,
      updatedDate: '2026-04-12',
    });
    expect(meta.realBalance).toBe(9876.54);

    expect(validateStoredBudgetPayload(budgetData)).toBe(true);
    expect(validateStoredBudgetPayload({ metadata: {} })).toBe(false);
    expect(validateStoredBudgetPayload(null)).toBe(false);
  });
});
