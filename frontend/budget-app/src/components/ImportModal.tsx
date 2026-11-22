import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportService, normalizeDateToISO, monthFromISO, parseAmount, isValidDescription } from '../services/ImportService';
import { useBudget } from '../context/useBudget';
import type { Transaction } from '../services/IBudgetService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportRow = Omit<Transaction, 'id'>;

type ImportError = {
  line?: number;
  message: string;
};

type ImportResultData = {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: ImportError[];
};

const CHUNK_SIZE = 100;

const ImportModal = ({ isOpen, onClose }: ImportModalProps) => {
  const { addTransactions, useApi, transactions } = useBudget();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [validRows, setValidRows] = useState<ImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [duplicateSkips, setDuplicateSkips] = useState<ImportError[]>([]);
  
  const processedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setIsProcessing(false);
      setProgress(0);
      setImportResult(null);
      setValidRows([]);
      setParseErrors([]);
      setDuplicateSkips([]);
      processedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (validRows.length > 0 && !processedRef.current && isOpen) {
      processedRef.current = true;
      processImport();
    }
  }, [validRows, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
      setParseErrors([]);
      setDuplicateSkips([]);
      setValidRows([]);
      processedRef.current = false;
    }
  };

  const mapToTransaction = (tx: { category: string; description: string; amount: string | number; banco?: string }, normalizedDate: string): ImportRow => ({
    valor: parseAmount(tx.amount),
    categoria: tx.category,
    mes: monthFromISO(normalizedDate),
    data: normalizedDate,
    descricao: tx.description,
    ...(tx.banco ? { banco: tx.banco } : {}),
  });

  const processImport = async () => {
    setIsProcessing(true);
    setProgress(10);

    const totalBeforeImport = validRows.length + duplicateSkips.length + parseErrors.length;

    try {
      if (validRows.length > CHUNK_SIZE && useApi) {
        const totalChunks = Math.ceil(validRows.length / CHUNK_SIZE);
        let importedCount = 0;
        let apiSkippedCount = 0;
        const allErrors: ImportError[] = [...parseErrors, ...duplicateSkips];

        for (let i = 0; i < totalChunks; i++) {
          const chunk = validRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const chunkNum = i + 1;

          setProgress(10 + Math.round((chunkNum / totalChunks) * 80));

          try {
            const report = await addTransactions(chunk);
            importedCount += report.imported;
            apiSkippedCount += report.skipped;
            if (report.errors) {
              allErrors.push(...report.errors);
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            allErrors.push({ line: chunkNum, message: `Chunk ${chunkNum}: ${message}` });
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setProgress(100);
        setImportResult({
          totalRecords: totalBeforeImport,
          successCount: importedCount,
          errorCount: allErrors.length,
          skippedCount: duplicateSkips.length + apiSkippedCount,
          errors: allErrors,
        });
      } else {
        setProgress(50);
        const report = validRows.length > 0 ? await addTransactions(validRows) : { imported: 0, skipped: 0 };
        setProgress(100);
        setImportResult({
          totalRecords: totalBeforeImport,
          successCount: report.imported,
          errorCount: parseErrors.length + duplicateSkips.length + (report.errors?.length ?? 0),
          skippedCount: duplicateSkips.length + report.skipped,
          errors: [...parseErrors, ...duplicateSkips, ...(report.errors ?? [])],
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setImportResult({
        totalRecords: totalBeforeImport,
        successCount: 0,
        errorCount: parseErrors.length + duplicateSkips.length + 1,
        skippedCount: 0,
        errors: [...parseErrors, ...duplicateSkips, { line: 0, message }]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(5);
    setParseErrors([]);

    try {
      let result;
      if (file.name.endsWith('.csv')) {
        result = await ImportService.parseCSV(file);
      } else if (file.name.endsWith('.pdf')) {
        result = await ImportService.parsePDF(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Use .csv ou .pdf');
      }

      setProgress(30);

      const valid: ImportRow[] = [];
      const errors: ImportError[] = [];
      
      result.transactions.forEach((tx, idx) => {
        const normalized = normalizeDateToISO(tx.date);
        
        if (!isValidDescription(tx.description)) {
          errors.push({ line: idx + 2, message: 'Descrição deve ter entre 3 e 255 caracteres.' });
          return;
        }
        
        if (!normalized || normalized.trim() === '') {
          errors.push({ line: idx + 2, message: 'Formato de data inválido.' });
          return;
        }

        const amount = parseAmount(tx.amount);
        if (isNaN(amount)) {
          errors.push({ line: idx + 2, message: 'Valor inválido.' });
          return;
        }

        valid.push(mapToTransaction(tx, normalized));
      });

      result.result.errors.forEach(err => {
        errors.push({ line: err.row, message: err.message });
      });

      setProgress(70);

      const dups: ImportError[] = [];
      const nonDuplicates: ImportRow[] = [];
      for (let i = 0; i < valid.length; i++) {
        const row = valid[i];
        const isDuplicate = transactions.some(
          tx => tx.data === row.data &&
                tx.categoria === row.categoria &&
                tx.descricao === row.descricao &&
                tx.valor === row.valor
        );
        if (isDuplicate) {
          dups.push({ line: i + 2, message: 'Registro duplicado: já existe no sistema' });
        } else {
          nonDuplicates.push(row);
        }
      }

      setDuplicateSkips(dups);
      setParseErrors(errors);
      setValidRows(nonDuplicates);
      
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setImportResult({
        totalRecords: 0,
        successCount: 0,
        errorCount: 1,
        skippedCount: 0,
        errors: [{ line: 0, message }]
      });
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay">
      <div className="bg-bg-modal w-full max-w-lg rounded-3xl shadow-xl border border-border-default overflow-hidden transition-all animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <h3 className="text-xl font-bold text-text-primary">Importar Dados Financeiros</h3>
          <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-full transition-colors text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!importResult ? (
            <div className="space-y-6">
              <div
                className={`relative group border-2 border-dashed rounded-2xl p-8 transition-all text-center ${
                  file ? 'border-primary bg-primary-light/30' : 'border-border-default hover:border-primary/50 hover:bg-bg-surface'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full ${file ? 'bg-primary text-text-inverse' : 'bg-bg-surface text-text-muted group-hover:text-primary'}`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-secondary">
                      {file ? file.name : 'Clique para enviar ou arraste e solte'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Formatos suportados: CSV, PDF</p>
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Processando...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!file || isProcessing}
                className="w-full py-4 px-6 bg-primary hover:bg-primary-hover disabled:bg-text-disabled text-text-inverse font-bold rounded-2xl transition-all shadow-primary flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Iniciar Importação
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-bg-success rounded-2xl border border-success/30 text-center">
                  <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-lg font-bold text-success">{importResult.successCount}</p>
                  <p className="text-xs text-success/80">Importadas</p>
                </div>
                {importResult.skippedCount > 0 && (
                  <div className="p-4 bg-bg-warning rounded-2xl border border-warning/30 text-center">
                    <AlertCircle className="w-6 h-6 text-warning mx-auto mb-2" />
                    <p className="text-lg font-bold text-warning">{importResult.skippedCount}</p>
                    <p className="text-xs text-warning/80">Ignoradas</p>
                  </div>
                )}
                <div className="p-4 bg-bg-error rounded-2xl border border-error/30 text-center">
                  <AlertCircle className="w-6 h-6 text-error mx-auto mb-2" />
                  <p className="text-lg font-bold text-error">{importResult.errorCount}</p>
                  <p className="text-xs text-error/80">Erros</p>
                </div>
              </div>

              <div className="text-center text-sm text-text-muted">
                {importResult.totalRecords} registros processados no total
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 p-4 rounded-xl border bg-bg-error border-error/30">
                  <p className="text-xs font-semibold mb-2 text-error">Detalhes:</p>
                  {importResult.errors.slice(0, 20).map((err, i) => (
                    <div key={i} className="text-xs flex gap-2"
                         style={{ color: err.message.includes('duplicado') ? '#92400e' : '#991b1b' }}>
                      <span className="font-bold shrink-0">Linha {err.line ?? '—'}:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                  {importResult.errors.length > 20 && (
                    <p className="text-xs italic text-error">
                      ...e mais {importResult.errors.length - 20} ocorrências
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 px-6 bg-bg-elevated hover:bg-border-hover text-text-primary font-bold rounded-2xl transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
