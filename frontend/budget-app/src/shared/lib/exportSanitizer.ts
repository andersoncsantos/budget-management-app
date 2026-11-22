/**
 * Security utilities for CSV and HTML/PDF exports (§8, §10.2).
 *
 * - Protects CSV exports against spreadsheet formula injection (CWE-1236) by prefixing
 *   strings starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote `'`.
 * - Escapes all HTML special characters before generating printable statement views
 *   to prevent Cross-Site Scripting (XSS).
 */

import type { Transaction } from '../../services/IBudgetService';
import { formatBRL } from '../../utils/currency';

const FORMULA_TRIGGER_REGEX = /^[\s]*[=+\-@\t\r]/;

/**
 * Sanitizes a text value against spreadsheet formula injection and wraps it in
 * RFC 4180 CSV double quotes.
 *
 * @example
 * ```ts
 * sanitizeCsvCell('=cmd|\' /C calc\'!A0') // "'\"'=cmd|' /C calc'!A0\"'"
 * sanitizeCsvCell('Mercado "Extra"')      // "\"Mercado \"\"Extra\"\"\""
 * ```
 */
export function sanitizeCsvCell(value: string | null | undefined): string {
  const raw = value ?? '';
  const neutralized = FORMULA_TRIGGER_REGEX.test(raw) ? `'${raw}` : raw;
  const escapedQuotes = neutralized.replace(/"/g, '""');
  return `"${escapedQuotes}"`;
}

/**
 * Generates a UTF-8 BOM-prefixed CSV string for the provided transactions,
 * sanitized against formula injection (§8, §10.2).
 */
export function buildSanitizedStatementCsv(transactions: readonly Transaction[]): string {
  const header = 'Date,Category,Description,Amount,Bank';
  const rows = transactions.map((tx) => {
    const dateCell = sanitizeCsvCell(tx.data);
    const categoryCell = sanitizeCsvCell(tx.categoria);
    const descriptionCell = sanitizeCsvCell(tx.descricao ?? '');
    const amountCell = String(tx.valor);
    const bankCell = sanitizeCsvCell(tx.banco ?? '');
    return `${dateCell},${categoryCell},${descriptionCell},${amountCell},${bankCell}`;
  });
  return '\uFEFF' + [header, ...rows].join('\n');
}

/**
 * Escapes HTML special characters (`&`, `<`, `>`, `"`, `'`) to prevent XSS
 * in generated print/PDF documents (§10.2).
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert(1)</script>') // "&lt;script&gt;alert(1)&lt;/script&gt;"
 * ```
 */
export function escapeHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a complete, XSS-safe printable HTML document for PDF export of the
 * active filtered transactions.
 */
export function buildSanitizedStatementPrintHtml(
  transactions: readonly Transaction[],
  generatedDateLabel: string
): string {
  const rowsHtml = transactions
    .map((tx) => {
      const amountClass = tx.valor >= 0 ? 'amount-positive' : 'amount-negative';
      const amountPrefix = tx.valor >= 0 ? '+' : '';
      const safeDate = escapeHtml(tx.data);
      const safeCategory = escapeHtml(tx.categoria);
      const safeDescription = escapeHtml(tx.descricao || '-');
      const safeAmount = escapeHtml(`${amountPrefix}${formatBRL(tx.valor)}`);
      const safeBank = escapeHtml(tx.banco || '-');

      return `
        <tr>
          <td>${safeDate}</td>
          <td><span class="category-badge">${safeCategory}</span></td>
          <td>${safeDescription}</td>
          <td class="${amountClass}" style="text-align: right; font-variant-numeric: tabular-nums;">${safeAmount}</td>
          <td>${safeBank}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Extrato Financeiro</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
    h1 { color: #1e293b; margin-bottom: 8px; }
    .date-range { color: #475569; margin-bottom: 20px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .amount-positive { color: #047857; font-weight: 600; }
    .amount-negative { color: #dc2626; font-weight: 600; }
    .category-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>Extrato Financeiro</h1>
  <p class="date-range">Gerado em ${escapeHtml(generatedDateLabel)}</p>
  <table>
    <thead>
      <tr>
        <th scope="col">Data</th>
        <th scope="col">Categoria</th>
        <th scope="col">Descrição</th>
        <th scope="col" style="text-align: right;">Valor</th>
        <th scope="col">Banco</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
}
