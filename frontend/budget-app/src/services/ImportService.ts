import { parseAmount } from './importHelpers';

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export interface RawTransaction {
  date: string;
  category: string;
  description: string;
  amount: string | number;
  banco?: string;
}

export class ImportService {
  private static async readFileWithEncoding(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return text.replace(/^\uFEFF/, '');
    } catch {
      return new TextDecoder('windows-1252').decode(buffer);
    }
  }

  static async parseCSV(
    file: File
  ): Promise<{ transactions: RawTransaction[]; result: ImportResult }> {
    const [csvText, { default: Papa }] = await Promise.all([
      this.readFileWithEncoding(file),
      import('papaparse'),
    ]);

    return new Promise((resolve) => {
      const results: RawTransaction[] = [];
      const errors: { row: number; message: string }[] = [];

      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (parsed) => {
          parsed.data.forEach((row, index) => {
            const tx: RawTransaction = {
              date: row.Date || row.date || row.Data || row.data || '',
              category:
                row.Category || row.category || row.Categoria || row.categoria || '',
              description:
                row.Description ||
                row.description ||
                row.Descricao ||
                row.descricao ||
                row.Descrição ||
                row.descrição ||
                '',
              amount: row.Amount || row.amount || row.Valor || row.valor || '',
              banco: row.Bank || row.bank || row.Banco || row.banco || undefined,
            };

            if (this.validateRawTransaction(tx)) {
              results.push(tx);
            } else {
              errors.push({
                row: index + 2,
                message: 'Missing or invalid required fields (Date, Category, Amount)',
              });
            }
          });

          resolve({
            transactions: results,
            result: {
              successCount: results.length,
              errorCount: errors.length,
              errors,
            },
          });
        },
      });
    });
  }

  static async parsePDF(
    file: File
  ): Promise<{ transactions: RawTransaction[]; result: ImportResult }> {
    const results: RawTransaction[] = [];
    const errors: { row: number; message: string }[] = [];

    try {
      const [arrayBuffer, pdfjsLib] = await Promise.all([
        file.arrayBuffer(),
        import('pdfjs-dist'),
      ]);

      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map((item) =>
          'str' in item ? item.str : ''
        );

        const fullText = strings.join(' ');
        const transactionMatches = fullText.matchAll(
          /(\d{2}\/\d{2}\/\d{4})\s+([^\s]+)\s+([^\s]+)\s+(-?[\d,.]+)/g
        );

        for (const match of transactionMatches) {
          const [, date = '', category = '', description = '', amountStr = ''] = match;
          const amount = parseAmount(amountStr);

          if (!Number.isNaN(amount)) {
            results.push({
              date,
              category,
              description,
              amount,
            });
          } else {
            errors.push({ row: i, message: `Invalid amount in PDF row: ${amountStr}` });
          }
        }
      }

      return {
        transactions: results,
        result: {
          successCount: results.length,
          errorCount: errors.length,
          errors,
        },
      };
    } catch (e) {
      return {
        transactions: [],
        result: {
          successCount: 0,
          errorCount: 1,
          errors: [
            {
              row: 0,
              message: `Falha ao processar PDF: ${
                e instanceof Error ? e.message : 'Erro desconhecido'
              }`,
            },
          ],
        },
      };
    }
  }

  private static validateRawTransaction(tx: RawTransaction): boolean {
    const amount = parseAmount(tx.amount);
    return !!(tx.date && tx.category && !Number.isNaN(amount));
  }
}

export {
  normalizeDateToISO,
  monthFromISO,
  parseAmount,
  isValidDescription,
} from './importHelpers';
