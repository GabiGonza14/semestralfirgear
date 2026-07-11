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
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">Exportar Inventario</p>
        <p className="text-xs text-slate-400">
          Descarga el estado actual del inventario (stock, valor y stock bajo) en CSV o PDF.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCsv}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'csv' ? 'Generando...' : 'Exportar CSV'}
        </button>
        <button
          type="button"
          onClick={handlePdf}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'pdf' ? 'Generando...' : 'Exportar PDF'}
        </button>
      </div>

      {error ? (
        <p className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 sm:order-last">
          {error}
        </p>
      ) : null}
    </div>
  )
}
