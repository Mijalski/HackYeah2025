// Web Mercator projection utilities for OpenStreetMap

export interface Point {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Tile {
  x: number;
  y: number;
  z: number;
}

const TILE_SIZE = 256;

// Convert latitude/longitude to tile coordinates
export function latLngToTile(lat: number, lng: number, zoom: number): Tile {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    z: zoom
  };
}

// Convert latitude/longitude to pixel coordinates at given zoom level
export function latLngToPixel(lat: number, lng: number, zoom: number): Point {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n * TILE_SIZE;
  const y = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n * TILE_SIZE;
  
  return { x, y };
}

// Convert pixel coordinates to latitude/longitude at given zoom level
export function pixelToLatLng(x: number, y: number, zoom: number): LatLng {
  const n = Math.pow(2, zoom);
  const lng = (x / (n * TILE_SIZE)) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (n * TILE_SIZE))));
  const lat = (latRad * 180) / Math.PI;
  
  return { lat, lng };
}

// Get the tiles that should be visible for the current viewport
export function getVisibleTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): Tile[] {
  const centerPixel = latLngToPixel(centerLat, centerLng, zoom);
  
  // Calculate viewport bounds in pixels
  const minX = centerPixel.x - viewportWidth / 2 + offsetX;
  const maxX = centerPixel.x + viewportWidth / 2 + offsetX;
  const minY = centerPixel.y - viewportHeight / 2 + offsetY;
  const maxY = centerPixel.y + viewportHeight / 2 + offsetY;
  
  // Convert to tile coordinates
  const minTileX = Math.floor(minX / TILE_SIZE);
  const maxTileX = Math.floor(maxX / TILE_SIZE);
  const minTileY = Math.floor(minY / TILE_SIZE);
  const maxTileY = Math.floor(maxY / TILE_SIZE);
  
  const tiles: Tile[] = [];
  const maxTile = Math.pow(2, zoom) - 1;
  
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      // Clamp tiles to valid range
      if (x >= 0 && x <= maxTile && y >= 0 && y <= maxTile) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }
  
  return tiles;
}

// Get tile position relative to viewport
export function getTilePosition(
  tile: Tile,
  centerLat: number,
  centerLng: number,
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): Point {
  const centerPixel = latLngToPixel(centerLat, centerLng, tile.z);
  
  const tilePixelX = tile.x * TILE_SIZE;
  const tilePixelY = tile.y * TILE_SIZE;
  
  const relativeX = tilePixelX - centerPixel.x + viewportWidth / 2 - offsetX;
  const relativeY = tilePixelY - centerPixel.y + viewportHeight / 2 - offsetY;
  
  return { x: relativeX, y: relativeY };
}

// Get marker position relative to viewport
export function getMarkerPosition(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): Point {
  const markerPixel = latLngToPixel(lat, lng, zoom);
  const centerPixel = latLngToPixel(centerLat, centerLng, zoom);
  
  const x = markerPixel.x - centerPixel.x + viewportWidth / 2 - offsetX;
  const y = markerPixel.y - centerPixel.y + viewportHeight / 2 - offsetY;
  
  return { x, y };
}

// Convert viewport click position to lat/lng
export function viewportClickToLatLng(
  clickX: number,
  clickY: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): LatLng {
  const centerPixel = latLngToPixel(centerLat, centerLng, zoom);
  
  const worldX = centerPixel.x + (clickX - viewportWidth / 2) + offsetX;
  const worldY = centerPixel.y + (clickY - viewportHeight / 2) + offsetY;
  
  return pixelToLatLng(worldX, worldY, zoom);
}