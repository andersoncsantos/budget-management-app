import { describe, it, expect, vi } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: '0.0.0',
  getDocument: vi.fn(),
}));

import { normalizeDateToISO, monthFromISO, parseAmount, isValidDescription } from '../importHelpers';
import { ImportService } from '../ImportService';
import { getCategoryStyle } from '../../lib/category-styles';

describe('normalizeDateToISO', () => {
  it('passes through already-ISO YYYY-MM-DD dates', () => {
    expect(normalizeDateToISO('2026-06-02')).toBe('2026-06-02');
    expect(normalizeDateToISO('2026-01-15')).toBe('2026-01-15');
  });

  it('handles Brazilian DD/MM/YYYY format', () => {
    expect(normalizeDateToISO('02/06/2026')).toBe('2026-06-02');
    expect(normalizeDateToISO('10/01/2026')).toBe('2026-01-10');
    expect(normalizeDateToISO('15/03/2025')).toBe('2025-03-15');
  });

  it('handles US MM/DD/YYYY when day > 12', () => {
    expect(normalizeDateToISO('02/15/2026')).toBe('2026-02-15');
    expect(normalizeDateToISO('12/31/2026')).toBe('2026-12-31');
  });

  it('defaults to DD/MM/YYYY when both segments are <= 12 (Brazilian audience)', () => {
    expect(normalizeDateToISO('05/06/2026')).toBe('2026-06-05');
    expect(normalizeDateToISO('01/02/2026')).toBe('2026-02-01');
  });

  it('handles DD-MM-YYYY and DD.MM.YYYY separators', () => {
    expect(normalizeDateToISO('02-06-2026')).toBe('2026-06-02');
    expect(normalizeDateToISO('02.06.2026')).toBe('2026-06-02');
  });

  it('handles 2-digit years (pivot at 70)', () => {
    expect(normalizeDateToISO('02/06/26')).toBe('2026-06-02');
    expect(normalizeDateToISO('02/06/85')).toBe('1985-06-02');
  });

  it('trims whitespace', () => {
    expect(normalizeDateToISO('  2026-06-02  ')).toBe('2026-06-02');
    expect(normalizeDateToISO('  02/06/2026  ')).toBe('2026-06-02');
  });

  it('returns input unchanged for unrecognized formats', () => {
    expect(normalizeDateToISO('not-a-date')).toBe('not-a-date');
    expect(normalizeDateToISO('')).toBe('');
  });
});

describe('monthFromISO', () => {
  it('maps month numbers to the correct abbreviation (Portuguese)', () => {
    expect(monthFromISO('2026-01-15')).toBe('Jan');
    expect(monthFromISO('2026-06-02')).toBe('Jun');
    expect(monthFromISO('2026-12-31')).toBe('Dez');
  });

  it('falls back to Jan for invalid month numbers', () => {
    expect(monthFromISO('2026-00-15')).toBe('Jan');
    expect(monthFromISO('2026-13-15')).toBe('Jan');
  });
});

describe('parseAmount', () => {
  it('parses numbers directly', () => {
    expect(parseAmount(100)).toBe(100);
    expect(parseAmount(-45.5)).toBe(-45.5);
  });

  it('parses Brazilian currency strings with R$ prefix', () => {
    expect(parseAmount('R$ 100,00')).toBe(100);
    expect(parseAmount('R$ 1.500,50')).toBe(1500.5);
  });

  it('parses US-style strings', () => {
    expect(parseAmount('100.50')).toBe(100.5);
  });

  it('parses negative values', () => {
    expect(parseAmount('-45.50')).toBe(-45.5);
    expect(parseAmount('-R$ 45,50')).toBe(-45.5);
  });

  it('returns NaN for invalid input', () => {
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
  });
});

describe('isValidDescription', () => {
  it('accepts valid descriptions (3-255 chars)', () => {
    expect(isValidDescription('Uber ride')).toBe(true);
    expect(isValidDescription('Monthly salary')).toBe(true);
    expect(isValidDescription('a'.repeat(255))).toBe(true);
  });

  it('accepts accented characters and special characters', () => {
    expect(isValidDescription('Café com pão')).toBe(true);
    expect(isValidDescription('Compra débito - LimaESilvaGas')).toBe(true);
  });

  it('rejects empty and short descriptions', () => {
    expect(isValidDescription('')).toBe(false);
    expect(isValidDescription('a')).toBe(false);
    expect(isValidDescription('ab')).toBe(false);
  });

  it('rejects descriptions over 255 characters', () => {
    expect(isValidDescription('a'.repeat(256))).toBe(false);
  });

  it('trims whitespace before validating length', () => {
    expect(isValidDescription('  ab  ')).toBe(false);
    expect(isValidDescription('   abc   ')).toBe(true);
  });
});

describe('ImportService.parseCSV encoding', () => {
  it('parses UTF-8 encoded CSV with accented characters', async () => {
    const csvContent = 'Data,Categoria,Descrição,Valor,Banco\n2026-09-25,Farmácia,PIX QRS RD SAÚDE,-999.00,Itaú\n2026-09-24,Alimentação,Café e Pão,-45.50,Itaú';
    const file = new File([csvContent], 'utf8.csv', { type: 'text/csv' });

    const { transactions, result } = await ImportService.parseCSV(file);

    expect(result.errorCount).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].category).toBe('Farmácia');
    expect(transactions[0].description).toBe('PIX QRS RD SAÚDE');
    expect(transactions[0].banco).toBe('Itaú');
    expect(transactions[1].category).toBe('Alimentação');
    expect(transactions[1].description).toBe('Café e Pão');
  });

  it('parses UTF-8 with BOM encoded CSV with accented characters', async () => {
    const csvContent = '\uFEFFData,Categoria,Descrição,Valor\n2026-09-25,Farmácia,Remédio,-120.00';
    const file = new File([csvContent], 'utf8-bom.csv', { type: 'text/csv' });

    const { transactions, result } = await ImportService.parseCSV(file);

    expect(result.errorCount).toBe(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].date).toBe('2026-09-25');
    expect(transactions[0].category).toBe('Farmácia');
    expect(transactions[0].description).toBe('Remédio');
  });

  it('parses Windows-1252 / ISO-8859-1 encoded CSV with accented characters without replacement character', async () => {
    const csvText = 'Data,Categoria,Descrição,Valor,Banco\n2026-09-25,Farmácia,PIX QRS RD SAÚDE25/09,-999.00,Itaú\n2026-09-24,Alimentação,Refeição,-50.00,Bradesco';
    // Encode string into single-byte Latin-1 / Windows-1252 bytes
    const latin1Bytes = new Uint8Array(csvText.length);
    for (let i = 0; i < csvText.length; i++) {
      latin1Bytes[i] = csvText.charCodeAt(i) & 0xff;
    }
    const file = new File([latin1Bytes], 'latin1.csv', { type: 'text/csv' });

    const { transactions, result } = await ImportService.parseCSV(file);

    expect(result.errorCount).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].category).toBe('Farmácia');
    expect(transactions[0].description).toBe('PIX QRS RD SAÚDE25/09');
    expect(transactions[0].banco).toBe('Itaú');
    expect(transactions[1].category).toBe('Alimentação');
    expect(transactions[1].description).toBe('Refeição');
  });
});

describe('getCategoryStyle', () => {
  it('returns distinct colors for all expense categories shown in Distribuição de Gastos', () => {
    const categories = [
      'Carro',
      'Cartão de Crédito',
      'Cartao de Credito',
      'Compras',
      'Contas',
      'Contas (Casa Erm.)',
      'Farmácia',
      'Gastos Extras',
      'Tom Penha',
      'Tarifas Bancárias',
      'Diversão',
    ];

    for (const cat of categories) {
      const style = getCategoryStyle(cat);
      expect(style.colorLight).not.toBe('#64748B');
    }

    // Accent-insensitive matching
    expect(getCategoryStyle('Cartao de Credito')).toEqual(getCategoryStyle('Cartão de Crédito'));
    expect(getCategoryStyle('Farmacia')).toEqual(getCategoryStyle('Farmácia'));
  });
});

