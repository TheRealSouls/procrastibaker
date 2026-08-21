import { pastrySprites } from "../data/pastrySprites";
import type { CrumbTile } from "./crumbMap";

const BG = "#fff7df";
const PANEL = "#fff8e8";
const INK = "#5b351f";
const MUTED = "#c77b30";
const GRID = "rgba(91, 53, 31, 0.16)";
const FONT = '"Trebuchet MS", "Avenir Next", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Renders a Crumb Map to a shareable PNG: the same spiral, on the bakery
 * background, with a title and totals. Mirrors how the heatmap is shared.
 */
export async function crumbMapToBlob(
  tiles: CrumbTile[],
  title: string,
): Promise<Blob | null> {
  if (tiles.length === 0) {
    return null;
  }

  const radius = tiles.reduce(
    (max, tile) => Math.max(max, Math.abs(tile.x), Math.abs(tile.y)),
    0,
  );
  const cells = radius * 2 + 1;
  // Scale the tile so a small map still fills the card and a huge one still fits.
  const tileSize = Math.max(10, Math.min(34, Math.floor(760 / cells)));
  const boardSize = cells * tileSize;

  const padding = 48;
  const headerHeight = 96;
  const width = Math.max(560, boardSize + padding * 2);
  const height = headerHeight + boardSize + padding * 2;

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio > 1 ? 2 : 1;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = INK;
  ctx.font = `700 26px ${FONT}`;
  ctx.textBaseline = "top";
  ctx.fillText(title, padding, 34);

  ctx.fillStyle = MUTED;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText(
    `${tiles.length} ${tiles.length === 1 ? "bake" : "bakes"}`,
    padding,
    68,
  );

  const boardX = (width - boardSize) / 2;
  const boardY = headerHeight;

  ctx.fillStyle = PANEL;
  ctx.fillRect(boardX, boardY, boardSize, boardSize);

  // The lined grid, matching what is shown on screen.
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= cells; i += 1) {
    const offset = i * tileSize + 0.5;
    ctx.moveTo(boardX + offset, boardY);
    ctx.lineTo(boardX + offset, boardY + boardSize);
    ctx.moveTo(boardX, boardY + offset);
    ctx.lineTo(boardX + boardSize, boardY + offset);
  }
  ctx.stroke();

  // Load each distinct sprite once, then stamp every tile.
  const ids = [...new Set(tiles.map((tile) => tile.pastryId))];
  const loaded = await Promise.all(
    ids.map(async (id) => [id, await loadImage(pastrySprites[id] ?? "")] as const),
  );
  const sprites = new Map(loaded);

  ctx.imageSmoothingEnabled = false;

  for (const tile of tiles) {
    const image = sprites.get(tile.pastryId);

    if (!image) {
      continue;
    }

    ctx.drawImage(
      image,
      boardX + (tile.x + radius) * tileSize,
      boardY + (tile.y + radius) * tileSize,
      tileSize,
      tileSize,
    );
  }

  ctx.fillStyle = MUTED;
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText("Procrastibaker", padding, height - padding + 8);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
