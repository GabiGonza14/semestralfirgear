import { useState } from 'react'
import { downloadInventoryReportCsv, downloadInventoryReportPdf } from '../../api/fitgearApi'

// HU-53: "Exportar Inventario" control. Offers CSV and PDF — both server-generated
// files downloaded directly (no browser print dialog), reflecting inventory state
// at click time (each export fetches fresh from the backend).
export function InventoryExportControls() {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCsv = async () => {
    setError(null)
    setExporting('csv')
    try {
      await downloadInventoryReportCsv()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar el CSV.')
    } finally {
      setExporting(null)
    }
  }

  const handlePdf = async () => {
    setError(null)
    setExporting('pdf')
    try {
      await downloadInventoryReportPdf()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar el PDF.')
    } finally {
      setExporting(null)
    }
  }

  const busy = exporting !== null

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">Exportar inventario</p>
        <p className="text-xs text-slate-500">
          Descarga el estado actual del inventario (stock, valor y stock bajo) en CSV o PDF.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCsv}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'csv' ? 'Generando...' : 'Exportar CSV'}
        </button>
        <button
          type="button"
          onClick={handlePdf}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'pdf' ? 'Generando...' : 'Exportar PDF'}
        </button>
      </div>

      {error ? (
        <p className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:order-last">
          {error}
        </p>
      ) : null}
    </div>
  )
}
