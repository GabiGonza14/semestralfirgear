import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { InventoryReport } from '../services/inventoryReportService'

// HU-53: renders an inventory report as a real PDF file (no browser print dialog).
// Uses pdf-lib (pure JS, works in Bun) with the standard Helvetica font. Served
// as a direct download by the export endpoint.

// A4 landscape in points — wide enough for the table columns.
const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595
const MARGIN = 40
const ROW_HEIGHT = 18
const FONT_SIZE = 9
const HEADER_SIZE = 9

// Column x anchors. Numeric columns are right-aligned to their `right` edge.
const COL = {
  name: MARGIN,
  category: 380,
  stockRight: 540,
  priceRight: 640,
  valueRight: 745,
  status: 755,
}

const colors = {
  text: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.42, 0.45, 0.5),
  headerBg: rgb(0.94, 0.96, 0.98),
  lowBg: rgb(1, 0.96, 0.9),
  lowText: rgb(0.6, 0.2, 0.05),
  line: rgb(0.88, 0.9, 0.93),
  accent: rgb(0.29, 0.48, 0.05),
}

// pdf-lib's standard fonts use WinAnsi encoding — keep printable ASCII + Latin-1
// (covers Spanish accents), replacing anything else so no exotic char can throw.
function sanitize(value: string): string {
  return value.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

// Truncates text to fit `maxWidth` at the given size, adding an ellipsis.
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = sanitize(text)
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean
  let truncated = clean
  while (truncated.length > 1 && font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}...`
}

function drawRightAligned(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  font: PDFFont,
  size: number,
  color = colors.text,
) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: right - width, y, size, font, color })
}

function drawTableHeader(page: PDFPage, y: number, bold: PDFFont) {
  page.drawRectangle({
    x: MARGIN - 4,
    y: y - 4,
    width: PAGE_WIDTH - 2 * MARGIN + 8,
    height: ROW_HEIGHT,
    color: colors.headerBg,
  })
  page.drawText('Nombre', { x: COL.name, y, size: HEADER_SIZE, font: bold, color: colors.muted })
  page.drawText('Categoria', { x: COL.category, y, size: HEADER_SIZE, font: bold, color: colors.muted })
  drawRightAligned(page, 'Stock', COL.stockRight, y, bold, HEADER_SIZE, colors.muted)
  drawRightAligned(page, 'Precio unit.', COL.priceRight, y, bold, HEADER_SIZE, colors.muted)
  drawRightAligned(page, 'Valor total', COL.valueRight, y, bold, HEADER_SIZE, colors.muted)
  page.drawText('Estado', { x: COL.status, y, size: HEADER_SIZE, font: bold, color: colors.muted })
}

/**
 * Builds the inventory report PDF and returns its bytes. Low-stock rows get a
 * highlighted background and a "Bajo" marker (AC: marked visually). Paginates
 * automatically, repeating the table header on each page.
 */
export async function toInventoryPdf(report: InventoryReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const generatedAt = new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(report.generatedAt))

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  // Title + metadata.
  page.drawText('Reporte de inventario - FITGEAR', {
    x: MARGIN,
    y,
    size: 16,
    font: bold,
    color: colors.text,
  })
  y -= 18
  page.drawText(`Generado el ${sanitize(generatedAt)}`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: colors.muted,
  })
  y -= 16

  // Summary line.
  const { summary } = report
  const summaryText =
    `Productos: ${summary.productCount}   |   ` +
    `Unidades: ${summary.totalUnits}   |   ` +
    `Valor de inventario: ${money(summary.totalInventoryValue)}   |   ` +
    `Stock bajo: ${summary.lowStockCount}`
  page.drawText(summaryText, { x: MARGIN, y, size: 10, font: bold, color: colors.accent })
  y -= 22

  drawTableHeader(page, y, bold)
  y -= ROW_HEIGHT

  const nameWidth = COL.category - COL.name - 8

  for (const row of report.rows) {
    // New page when we run out of vertical space; repeat the header.
    if (y < MARGIN + ROW_HEIGHT) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
      drawTableHeader(page, y, bold)
      y -= ROW_HEIGHT
    }

    if (row.lowStock) {
      page.drawRectangle({
        x: MARGIN - 4,
        y: y - 4,
        width: PAGE_WIDTH - 2 * MARGIN + 8,
        height: ROW_HEIGHT,
        color: colors.lowBg,
      })
    }

    const rowText = row.lowStock ? colors.lowText : colors.text
    const stockLabel = row.lowStock ? `${row.stock} (Bajo)` : String(row.stock)

    page.drawText(fit(row.name, font, FONT_SIZE, nameWidth), {
      x: COL.name,
      y,
      size: FONT_SIZE,
      font,
      color: rowText,
    })
    page.drawText(fit(row.category, font, FONT_SIZE, COL.stockRight - COL.category - 40), {
      x: COL.category,
      y,
      size: FONT_SIZE,
      font,
      color: rowText,
    })
    drawRightAligned(page, stockLabel, COL.stockRight, y, font, FONT_SIZE, rowText)
    drawRightAligned(page, money(row.unitPrice), COL.priceRight, y, font, FONT_SIZE, rowText)
    drawRightAligned(page, money(row.totalValue), COL.valueRight, y, font, FONT_SIZE, rowText)
    page.drawText(row.isActive ? 'Activo' : 'Inactivo', {
      x: COL.status,
      y,
      size: FONT_SIZE,
      font,
      color: rowText,
    })

    y -= 2
    page.drawLine({
      start: { x: MARGIN - 4, y: y - 2 },
      end: { x: PAGE_WIDTH - MARGIN + 4, y: y - 2 },
      thickness: 0.5,
      color: colors.line,
    })
    y -= ROW_HEIGHT - 2
  }

  return doc.save()
}

// Date-stamped filename for the download (e.g. inventario-2026-07-11.pdf).
export function inventoryPdfFilename(generatedAt: string): string {
  const date = new Date(generatedAt).toISOString().slice(0, 10)
  return `inventario-${date}.pdf`
}
