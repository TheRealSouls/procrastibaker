import { formatMinutes } from "./sessionUtils";
import type { HeatmapData } from "./statsUtils";

// Single source of truth for the heatmap intensity colours (kept in step with the
// `[data-level]` rules in styles.css).
export const HEATMAP_LEVEL_COLORS = [
  "#efe3c6",
  "#ffe49b",
  "#ffce62",
  "#f6b73c",
  "#c77b30",
] as const;

const BG = "#fff7df";
const INK = "#5b351f";
const MUTED = "#c77b30";
const FONT = '"Trebuchet MS", "Avenir Next", system-ui, sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Renders the focus heatmap to a shareable PNG blob (retina-scaled). */
export async function heatmapToBlob(data: HeatmapData): Promise<Blob | null> {
  const scale = 2;
  const cell = 14;
  const gap = 3;
  const rows = 7;
  const cols = data.weeks.length;
  const pad = 28;
  const headerH = 92;
  const monthH = 18;
  const legendH = 30;

  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const width = pad * 2 + gridW;
  const height = pad + headerH + monthH + gridH + legendH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.scale(scale, scale);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText("Procrastibaker", pad, pad);

  ctx.fillStyle = MUTED;
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText("My focus · last 4 months", pad, pad + 34);

  ctx.fillStyle = INK;
  ctx.font = `700 15px ${FONT}`;
  const dayWord = data.activeDays === 1 ? "day" : "days";
  ctx.fillText(
    `${data.activeDays} active ${dayWord} · ${formatMinutes(data.totalMinutes)} focused`,
    pad,
    pad + 56,
  );

  const gridTop = pad + headerH + monthH;
  const gridLeft = pad;

  ctx.fillStyle = MUTED;
  ctx.font = `600 11px ${FONT}`;
  for (const month of data.monthLabels) {
    ctx.fillText(month.label, gridLeft + month.column * (cell + gap), pad + headerH);
  }

  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const item = data.weeks[col][row];
      if (!item) {
        continue;
      }
      ctx.fillStyle = HEATMAP_LEVEL_COLORS[item.level];
      roundRect(
        ctx,
        gridLeft + col * (cell + gap),
        gridTop + row * (cell + gap),
        cell,
        cell,
        3,
      );
      ctx.fill();
    }
  }

  const legendY = gridTop + gridH + 10;
  ctx.textBaseline = "middle";
  ctx.fillStyle = MUTED;
  ctx.font = `600 11px ${FONT}`;
  let lx = gridLeft;
  ctx.fillText("Less", lx, legendY + cell / 2);
  lx += 30;
  for (const color of HEATMAP_LEVEL_COLORS) {
    ctx.fillStyle = color;
    roundRect(ctx, lx, legendY, cell, cell, 3);
    ctx.fill();
    lx += cell + 4;
  }
  ctx.fillStyle = MUTED;
  ctx.fillText("More", lx + 2, legendY + cell / 2);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Shares the image via the Web Share API where supported (mobile), otherwise
 * downloads it. A user-cancelled share is a no-op (not a fallback download).
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] }) &&
    navigator.share
  ) {
    try {
      await navigator.share({ files: [file], title: "Procrastibaker focus" });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        downloadBlob(blob, filename);
      }
    }
    return;
  }

  downloadBlob(blob, filename);
}
