import { useState, useRef, useEffect, useMemo } from "react";
import {
  DroneEvent,
  ClusteredEvent,
  Shelter,
  UserMode,
  EvacuationOrder,
} from "../types";
import {
  getVisibleTiles,
  getTilePosition,
  getMarkerPosition,
  viewportClickToLatLng,
} from "../lib/mapUtils";
import {
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Info,
  AlertCircle,
  AlertOctagon,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export type MilitaryViewMode = "datapoints" | "incidents";

interface MapViewProps {
  events: DroneEvent[];
  clusteredEvents: ClusteredEvent[];
  shelters: Shelter[];
  userMode: UserMode;
  militaryViewMode: MilitaryViewMode;
  evacuationOrders: EvacuationOrder[];
  onMapClick?: (lat: number, lng: number) => void;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function normalizeBearingDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function angleDeltaDeg(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function initialBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeBearingDeg(toDeg(Math.atan2(y, x)));
}

function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number
): { lat: number; lng: number } {
  const R = 6371;
  const δ = distanceKm / R;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinθ = Math.sin(θ);
  const cosθ = Math.cos(θ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosθ;
  const φ2 = Math.asin(sinφ2);
  const y = sinθ * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

function median(a: number[]): number {
  if (a.length === 0) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function pathLengthKm(points: { lat: number; lng: number }[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += calculateDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return sum;
}

function buildProjectedFromActual(
  actual: { lat: number; lng: number }[],
  points: number
): { lat: number; lng: number; isProjected: true }[] {
  if (actual.length < 2) return [];
  const n = actual.length;
  const segBearings: number[] = [];
  const segDists: number[] = [];
  for (let i = 1; i < n; i++) {
    segBearings.push(
      initialBearing(
        actual[i - 1].lat,
        actual[i - 1].lng,
        actual[i].lat,
        actual[i].lng
      )
    );
    segDists.push(
      calculateDistance(
        actual[i - 1].lat,
        actual[i - 1].lng,
        actual[i].lat,
        actual[i].lng
      )
    );
  }
  const k = Math.min(5, segBearings.length);
  const start = segBearings.length - k;
  const turnRates: number[] = [];
  for (let i = start + 1; i < segBearings.length; i++) {
    const d = Math.max(segDists[i], 1e-3);
    turnRates.push(angleDeltaDeg(segBearings[i - 1], segBearings[i]) / d);
  }
  const rateDegPerKm = clamp(median(turnRates), -30, 30);
  const totalLenKm = pathLengthKm(actual);
  const projLenKm = totalLenKm;
  const stepKm = projLenKm / points;
  let pos = actual[n - 1];
  let brg = segBearings[segBearings.length - 1];
  const out: { lat: number; lng: number; isProjected: true }[] = [];
  for (let i = 0; i < points; i++) {
    pos = destinationPoint(pos.lat, pos.lng, brg, stepKm);
    out.push({ lat: pos.lat, lng: pos.lng, isProjected: true });
    brg = normalizeBearingDeg(brg + rateDegPerKm * stepKm);
  }
  return out;
}

function getRiskIcon(riskLevel?: string) {
  console.log("riskLevel=>", riskLevel);
  switch (riskLevel) {
    case "low":
      return Info;
    case "medium":
      return AlertCircle;
    case "high":
      return AlertTriangle;
    case "critical":
      return AlertOctagon;
    default:
      return Info;
  }
}

function getSensorTypeColor(sensorType: string): string {
  switch (sensorType) {
    case "microphone":
      return "#a855f7";
    case "camera":
      return "#22c55e";
    case "radar":
      return "#3b82f6";
    case "visual":
    case "manual":
      return "#f97316";
    default:
      return "#6b7280";
  }
}

export function MapView({
  events,
  clusteredEvents,
  shelters,
  userMode,
  militaryViewMode,
  evacuationOrders,
  onMapClick,
}: MapViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [center, setCenter] = useState({ lat: 53.0, lng: 23.5 });
  const [zoom, setZoom] = useState(8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Focused incident: controls which incident is "active"
  const [focusedIncidentId, setFocusedIncidentId] = useState<string | null>(
    null
  );

  // Datapoint IDs belonging to the focused incident (for filtering in datapoints view)
  const focusedEventIds = useMemo(() => {
    if (!focusedIncidentId) return null;
    const cluster = clusteredEvents.find((c) => c.id === focusedIncidentId);
    if (!cluster) return null;
    const ids = new Set<string>();
    for (const ev of cluster.events) {
      ids.add((ev as any).detection_id ?? (ev as any).id);
    }
    return ids;
  }, [focusedIncidentId, clusteredEvents]);

  // The actual focused cluster object (for the top-left popup)
  const focusedCluster = useMemo<ClusteredEvent | null>(() => {
    if (!focusedIncidentId) return null;
    return clusteredEvents.find((c) => c.id === focusedIncidentId) ?? null;
  }, [focusedIncidentId, clusteredEvents]);

  useEffect(() => {
    const updateDimensions = () => {
      if (mapRef.current) {
        setDimensions({
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(
        ".marker-popup, .zoom-controls, .map-info, .incident-panel"
      )
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX + offset.x, y: e.clientY + offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newOffsetX = -(e.clientX - dragStart.x);
    const newOffsetY = -(e.clientY - dragStart.y);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(3, Math.min(18, zoom + delta));
    if (newZoom !== zoom) {
      const zoomFactor = Math.pow(2, newZoom - zoom);
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const newOffsetX =
          centerX + (offset.x + mouseX - centerX) * zoomFactor - mouseX;
        const newOffsetY =
          centerY + (offset.y + mouseY - centerY) * zoomFactor - mouseY;
        setOffset({ x: newOffsetX, y: newOffsetY });
      }
      setZoom(newZoom);
    }
  };

  // Do NOT clear focus on background clicks; dragging/clicking map won't hide focused incident
  const handleMapClick = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }
    // keep selectedEvent and focusedIncidentId intact

    if (!onMapClick) {
      return;
    }
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const latLng = viewportClickToLatLng(
      clickX,
      clickY,
      center.lat,
      center.lng,
      zoom,
      dimensions.width,
      dimensions.height,
      offset.x,
      offset.y
    );
    onMapClick(latLng.lat, latLng.lng);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(18, z + 1));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(3, z - 1));
  };

  const tiles = getVisibleTiles(
    center.lat,
    center.lng,
    zoom,
    dimensions.width,
    dimensions.height,
    offset.x,
    offset.y
  );

  const getEventColor = (type: DroneEvent["type"]) => {
    switch (type) {
      case "microphone":
        return "#8b5cf6";
      case "photo":
        return "#10b981";
      case "written":
        return "#3b82f6";
      case "manual":
        return "#f59e0b";
    }
  };

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#f59e0b";
      default:
        return "#84cc16";
    }
  };

  const safeShelters = useMemo(() => {
    if (userMode !== "civilian") return [];
    const shelterSafety = shelters.map((shelter) => {
      const distances = clusteredEvents.map((cluster) =>
        calculateDistance(
          shelter.latitude,
          shelter.longitude,
          cluster.latitude,
          cluster.longitude
        )
      );
      const avgDistance =
        distances.reduce((a, b) => a + b, 0) / distances.length;
      return { shelter, avgDistance };
    });
    return shelterSafety
      .sort((a, b) => b.avgDistance - a.avgDistance)
      .slice(0, 5)
      .map((s) => s.shelter);
  }, [shelters, clusteredEvents, userMode]);

  const [evacuationZone, setEvacuationZone] = useState<{
    lat: number;
    lng: number;
    range: number;
  } | null>(null);

  const [evacuationPath, setEvacuationPath] = useState<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
  } | null>(null);

  const issueEvacuation = (
    latitude: number,
    longitude: number,
    range: number
  ) => {
    setEvacuationZone({ lat: latitude, lng: longitude, range });
    if (shelters.length > 0) {
      let closest = shelters[0];
      let minDist = Infinity;
      for (const s of shelters) {
        const dist = Math.sqrt(
          Math.pow(s.latitude - latitude, 2) +
            Math.pow(s.longitude - longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closest = s;
        }
      }
      setEvacuationPath({
        from: { lat: closest.latitude, lng: closest.longitude },
        to: { lat: latitude, lng: longitude },
      });
    }
  };

  return (
    <div
      ref={mapRef}
      className="w-full h-full relative overflow-hidden bg-[#aad3df] select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleMapClick}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {tiles.map((tile) => {
        const pos = getTilePosition(
          tile,
          center.lat,
          center.lng,
          dimensions.width,
          dimensions.height,
          offset.x,
          offset.y
        );

        return (
          <img
            key={`${tile.z}-${tile.x}-${tile.y}`}
            src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
            alt=""
            className="absolute pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y,
              width: 256,
              height: 256,
            }}
            draggable={false}
          />
        );
      })}

      {/* Zoom controls (top-left) */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 zoom-controls">
        <Button
          size="icon"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          className="shadow-lg"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          className="shadow-lg"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm text-center shadow-lg">
          Z: {zoom}
        </div>
      </div>

      {/* ALWAYS-SHOWN INCIDENT POPUP (top-left area). Appears when an incident is focused. */}
      {focusedCluster && (
        <div
          style={{ marginLeft: 75, zIndex: 20000 }}
          className="incident-panel absolute top-4 left-75 z-40 bg-white rounded-lg shadow-2xl  p-4 min-w-[300px] max-w-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="m-0">
              Incident #{focusedCluster.id.replace("cluster-", "")}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFocusedIncidentId(null)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1 text-foreground">
            <div>
              <strong>Events:</strong> {focusedCluster.events.length} signals
            </div>
            <div>
              <strong>Pattern:</strong> {focusedCluster.pattern || "Unknown"}
            </div>
            <div>
              <strong>Risk Level:</strong>{" "}
              <span
                style={{ color: getRiskColor(focusedCluster.riskLevel) }}
                className="uppercase"
              >
                {focusedCluster.riskLevel}
              </span>
            </div>

            {focusedCluster.projectedHeading !== undefined && (
              <div className="pt-2 border-t border-gray-200">
                <strong>Projected Heading:</strong>{" "}
                {Math.round(focusedCluster.projectedHeading)}°
              </div>
            )}

            {focusedCluster.estimatedSpeed !== undefined &&
              focusedCluster.estimatedSpeed > 0 && (
                <div>
                  <strong>Estimated Speed:</strong>{" "}
                  {Math.round(focusedCluster.estimatedSpeed)} km/h
                </div>
              )}

            {focusedCluster.trajectory && (
              <div>
                <strong>Trajectory:</strong>{" "}
                {focusedCluster.trajectory.filter((p) => !p.isProjected).length}{" "}
                actual,{" "}
                {focusedCluster.trajectory.filter((p) => p.isProjected).length}{" "}
                projected
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 text-muted-foreground">
              {new Date(focusedCluster.timestamp).toLocaleString()}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() =>
                  issueEvacuation(
                    focusedCluster.latitude,
                    focusedCluster.longitude,
                    5
                  )
                }
              >
                Issue Evacuation
              </Button>
            </div>
          </div>
        </div>
      )}

      {userMode === "civilian" && evacuationOrders.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 max-w-md">
          {evacuationOrders.map((order) => {
            const shelter = shelters.find(
              (s) => s.id === order.targetShelterId
            );
            const priorityColors = {
              low: "bg-blue-600",
              medium: "bg-yellow-600",
              high: "bg-orange-600",
              critical: "bg-red-600",
            };
            return (
              <div
                key={order.id}
                className={`${
                  priorityColors[order.priority]
                } text-white rounded-lg shadow-2xl p-4 mb-2 border-2 border-white animate-pulse`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white">EVACUATION ORDER</h3>
                      <Badge variant="secondary" className="text-xs">
                        {order.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-white/90 mb-2">
                      Proceed immediately to{" "}
                      <strong>{shelter?.name || "designated shelter"}</strong>
                    </p>
                    {order.message && (
                      <p className="text-white/80 text-sm border-t border-white/20 pt-2 mt-2">
                        {order.message}
                      </p>
                    )}
                    <p className="text-white/70 text-sm mt-2">
                      Issued {new Date(order.issuedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {userMode === "civilian" &&
        evacuationOrders.map((order) => {
          const incident = clusteredEvents.find(
            (i) => i.id === order.incidentId
          );
          const shelter = shelters.find((s) => s.id === order.targetShelterId);

          if (!incident || !shelter) return null;

          const startPos = getMarkerPosition(
            incident.latitude,
            incident.longitude,
            center.lat,
            center.lng,
            zoom,
            dimensions.width,
            dimensions.height,
            offset.x,
            offset.y
          );

          const endPos = getMarkerPosition(
            shelter.latitude,
            shelter.longitude,
            center.lat,
            center.lng,
            zoom,
            dimensions.width,
            dimensions.height,
            offset.x,
            offset.y
          );

          const priorityColors = {
            low: "#3b82f6",
            medium: "#eab308",
            high: "#f97316",
            critical: "#dc2626",
          };

          const routeColor = priorityColors[order.priority];

          return (
            <svg
              key={`evac-route-${order.id}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <path
                d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke={routeColor}
                strokeWidth="12"
                strokeOpacity="0.3"
                filter="blur(8px)"
              />
              <path
                d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke={routeColor}
                strokeWidth="6"
                strokeOpacity="0.9"
              />
              <path
                d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeOpacity="0.8"
                strokeDasharray="15 10"
              />
              <polygon
                points="0,-10 20,0 0,10"
                fill={routeColor}
                fillOpacity="1"
                transform={`translate(${endPos.x}, ${endPos.y}) rotate(${
                  (Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) *
                    180) /
                  Math.PI
                })`}
                stroke="white"
                strokeWidth="2"
              />
              <circle
                cx={startPos.x}
                cy={startPos.y}
                r="15"
                fill="none"
                stroke={routeColor}
                strokeWidth="3"
                strokeOpacity="0.6"
                className="animate-ping"
              />
              <circle
                cx={startPos.x}
                cy={startPos.y}
                r="8"
                fill={routeColor}
                fillOpacity="0.8"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          );
        })}

      {userMode === "civilian" &&
        evacuationOrders.length === 0 &&
        safeShelters.map((shelter, idx) => {
          return clusteredEvents.slice(0, 3).map((cluster) => {
            const startPos = getMarkerPosition(
              cluster.latitude,
              cluster.longitude,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            );

            const endPos = getMarkerPosition(
              shelter.latitude,
              shelter.longitude,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            );

            const routeColor =
              idx === 0 ? "#10b981" : idx === 1 ? "#3b82f6" : "#8b5cf6";

            return (
              <svg
                key={`route-${shelter.id}-${cluster.id}`}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 3 }}
              >
                <path
                  d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="6"
                  strokeOpacity="0.2"
                  strokeDasharray="10 5"
                  filter="blur(3px)"
                />
                <path
                  d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="3"
                  strokeOpacity="0.7"
                  strokeDasharray="10 5"
                />
                <polygon
                  points="0,-6 12,0 0,6"
                  fill={routeColor}
                  fillOpacity="0.8"
                  transform={`translate(${endPos.x}, ${endPos.y}) rotate(${
                    (Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) *
                      180) /
                    Math.PI
                  })`}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
            );
          });
        })}

      {/* INCIDENT TRAJECTORIES — show lines ONLY when the incident is focused AND only in incidents view */}
      {userMode === "military" &&
        militaryViewMode === "incidents" &&
        focusedCluster &&
        focusedCluster.trajectory &&
        focusedCluster.trajectory.length >= 2 &&
        (() => {
          const color = getRiskColor(focusedCluster.riskLevel);

          const actualLatLngs = (focusedCluster.trajectory || [])
            .filter((p) => !p.isProjected)
            .map((p) => ({ lat: p.lat, lng: p.lng }));

          const projectedLatLngs = buildProjectedFromActual(actualLatLngs, 12);

          const actualPoints = actualLatLngs.map((p) =>
            getMarkerPosition(
              p.lat,
              p.lng,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            )
          );

          const projectedPoints = actualPoints.length
            ? [
                { ...actualPoints[actualPoints.length - 1] },
                ...projectedLatLngs.map((p) =>
                  getMarkerPosition(
                    p.lat,
                    p.lng,
                    center.lat,
                    center.lng,
                    zoom,
                    dimensions.width,
                    dimensions.height,
                    offset.x,
                    offset.y
                  )
                ),
              ]
            : [];

          const actualPathD = actualPoints
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          const projectedPathD = projectedPoints
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            >
              {actualPathD && (
                <>
                  <path
                    d={actualPathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="blur(4px)"
                  />
                  <path
                    d={actualPathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeOpacity="0.95"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {actualPoints.slice(0, -1).map((point, i) => {
                    const next = actualPoints[i + 1];
                    const angle =
                      (Math.atan2(next.y - point.y, next.x - point.x) * 180) /
                      Math.PI;
                    const midX = (point.x + next.x) / 2;
                    const midY = (point.y + next.y) / 2;

                    return (
                      <polygon
                        key={`arrow-actual-${i}`}
                        points="0,-6 12,0 0,6"
                        fill={color}
                        fillOpacity="0.95"
                        transform={`translate(${midX}, ${midY}) rotate(${angle})`}
                        stroke="white"
                        strokeWidth="1"
                      />
                    );
                  })}
                </>
              )}

              {projectedPathD && projectedPoints.length > 1 && (
                <>
                  <path
                    d={projectedPathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeOpacity="0.2"
                    strokeDasharray="12 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="blur(4px)"
                  />
                  <path
                    d={projectedPathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeOpacity="0.7"
                    strokeDasharray="12 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {projectedPoints.slice(0, -1).map((point, i) => {
                    if (i % 2 !== 0) return null;
                    const next = projectedPoints[i + 1];
                    const angle =
                      (Math.atan2(next.y - point.y, next.x - point.x) * 180) /
                      Math.PI;
                    const midX = (point.x + next.x) / 2;
                    const midY = (point.y + next.y) / 2;

                    return (
                      <polygon
                        key={`arrow-projected-${i}`}
                        points="0,-6 12,0 0,6"
                        fill={color}
                        fillOpacity="0.7"
                        transform={`translate(${midX}, ${midY}) rotate(${angle})`}
                        stroke="white"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {projectedPoints.length >= 2 && (
                    <polygon
                      points="0,-8 16,0 0,8"
                      fill={color}
                      fillOpacity="0.8"
                      transform={`translate(${
                        projectedPoints[projectedPoints.length - 1].x
                      }, ${
                        projectedPoints[projectedPoints.length - 1].y
                      }) rotate(${
                        (Math.atan2(
                          projectedPoints[projectedPoints.length - 1].y -
                            projectedPoints[projectedPoints.length - 2].y,
                          projectedPoints[projectedPoints.length - 1].x -
                            projectedPoints[projectedPoints.length - 2].x
                        ) *
                          180) /
                        Math.PI
                      })`}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  )}
                </>
              )}

              {actualPoints.map((point, i) => (
                <circle
                  key={`trajectory-point-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="white"
                  stroke={color}
                  strokeWidth="3"
                />
              ))}
            </svg>
          );
        })()}

      {(userMode === "military" ? shelters : safeShelters).map((shelter) => {
        const pos = getMarkerPosition(
          shelter.latitude,
          shelter.longitude,
          center.lat,
          center.lng,
          zoom,
          dimensions.width,
          dimensions.height,
          offset.x,
          offset.y
        );

        const isVisible =
          pos.x >= -50 &&
          pos.x <= dimensions.width + 50 &&
          pos.y >= -50 &&
          pos.y <= dimensions.height + 50;
        const isSelected = selectedEvent === shelter.id;

        if (!isVisible) return null;

        const shelterColor =
          shelter.type === "military" ? "#7c3aed" : "#2563eb";

        const isRecommended =
          userMode === "civilian" && safeShelters.indexOf(shelter) < 3;

        return (
          <div
            key={shelter.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 9999 : 8 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(
                selectedEvent === shelter.id ? null : shelter.id
              );
            }}
          >
            {isRecommended && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            )}
            <div
              className={`w-5 h-5 border-2 border-white shadow-lg ${
                isRecommended ? "ring-2 ring-green-500" : ""
              }`}
              style={{ backgroundColor: shelterColor }}
            />

            {selectedEvent === shelter.id && (
              <div
                className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 marker-popup"
                style={{ zIndex: 10 }}
              >
                <h3 className="mb-2">{shelter.name}</h3>
                <div className="space-y-1 text-foreground">
                  <div>
                    <strong>Type:</strong> {shelter.type.toUpperCase()}
                  </div>
                  <div>
                    <strong>Capacity:</strong> {shelter.capacity} people
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        shelter.available ? "text-green-600" : "text-red-600"
                      }
                    >
                      {shelter.available ? "Available" : "Full"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-muted-foreground">
                    {shelter.latitude.toFixed(4)},{" "}
                    {shelter.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* DATAPOINTS VIEW — no incident lines here; only markers (filtered by focus if any) */}
      {userMode === "military" &&
        militaryViewMode === "datapoints" &&
        (focusedEventIds
          ? events.filter((event) =>
              focusedEventIds.has(event.detection_id ?? event.id)
            )
          : events
        ).map((event) => {
          const pos = getMarkerPosition(
            event.latitude,
            event.longitude,
            center.lat,
            center.lng,
            zoom,
            dimensions.width,
            dimensions.height,
            offset.x,
            offset.y
          );

          const color = getSensorTypeColor(event.sensor_type);

          const isVisible =
            pos.x >= -50 &&
            pos.x <= dimensions.width + 50 &&
            pos.y >= -50 &&
            pos.y <= dimensions.height + 50;
          const isSelected = selectedEvent === (event.detection_id || event.id);

          if (!isVisible) return null;

          return (
            <div
              key={event.detection_id || event.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: isSelected ? 9999 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                const eventId = event.detection_id || event.id;
                setSelectedEvent(selectedEvent === eventId ? null : eventId);
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: color }}
              />

              {selectedEvent === (event.detection_id || event.id) && (
                <div
                  className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[320px] max-w-[380px] border border-gray-200 marker-popup"
                  style={{ zIndex: 10 }}
                >
                  <h3 className="mb-2">Detection {event.detection_id}</h3>
                  <div className="space-y-1.5 text-foreground">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <strong>Sensor:</strong> {event.sensor_id}
                      </div>
                      <div>
                        <strong>Type:</strong> {event.sensor_type}
                      </div>
                      <div>
                        <strong>Source:</strong> {event.detection_source}
                      </div>
                      <div>
                        <strong>Classification:</strong>{" "}
                        <span className="capitalize">
                          {event.classification}
                        </span>
                      </div>
                    </div>

                    {event.drone_id && (
                      <div className="pt-1.5 border-t border-gray-200">
                        <div>
                          <strong>Drone ID:</strong> {event.drone_id}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <strong>Altitude:</strong>{" "}
                        {event.altitude_m ? `${event.altitude_m}m` : "N/A"}
                      </div>
                      <div>
                        <strong>Speed:</strong>{" "}
                        {event.speed_mps
                          ? `${event.speed_mps.toFixed(1)} m/s`
                          : "N/A"}
                      </div>
                      <div>
                        <strong>Heading:</strong>{" "}
                        {event.heading_deg ? `${event.heading_deg}°` : "N/A"}
                      </div>
                      <div>
                        <strong>Course:</strong> {event.course_vector || "N/A"}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <strong>Confidence:</strong>{" "}
                        {Math.round(event.confidence * 100)}%
                      </div>
                      {event.signal_strength_dbm && (
                        <div>
                          <strong>Signal:</strong> {event.signal_strength_dbm}{" "}
                          dBm
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <div className="pt-1.5 border-t border-gray-200">
                        <div className="text-muted-foreground">
                          {event.description}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-gray-200 text-muted-foreground">
                      <div>
                        Detected:{" "}
                        {new Date(event.timestamp_utc).toLocaleString()}
                      </div>
                      <div>
                        Ingested:{" "}
                        {new Date(event.ingestion_time).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-muted-foreground">
                      {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* INCIDENT MARKERS (no per-marker popups; popup is top-left panel). Clicking toggles focus. */}
      {userMode === "military" &&
        militaryViewMode === "incidents" &&
        (focusedIncidentId
          ? clusteredEvents.filter((c) => c.id === focusedIncidentId)
          : clusteredEvents
        ).map((cluster) => {
          const pos = getMarkerPosition(
            cluster.latitude,
            cluster.longitude,
            center.lat,
            center.lng,
            zoom,
            dimensions.width,
            dimensions.height,
            offset.x,
            offset.y
          );

          const color = getRiskColor(cluster.riskLevel);
          const isVisible =
            pos.x >= -50 &&
            pos.x <= dimensions.width + 50 &&
            pos.y >= -50 &&
            pos.y <= dimensions.height + 50;
          const isFocused = focusedIncidentId === cluster.id;
          const RiskIcon = getRiskIcon(cluster.riskLevel);

          if (!isVisible) return null;

          return (
            <div
              key={cluster.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110`}
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: isFocused ? 9999 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFocusedIncidentId((prev) =>
                  prev === cluster.id ? null : cluster.id
                );
              }}
              title={`Incident #${cluster.id.replace("cluster-", "")}`}
            >
              <div
                className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
                style={{ backgroundColor: color }}
              >
                <RiskIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
          );
        })}

      {evacuationZone && (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 20 }}
        >
          {(() => {
            const centerPos = getMarkerPosition(
              evacuationZone.lat,
              evacuationZone.lng,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            );

            const kmPerPixel =
              (80075 / Math.pow(2, zoom + 8)) *
              Math.cos((center.lat * Math.PI) / 180);
            const radiusPx = evacuationZone.range / kmPerPixel;

            return (
              <circle
                cx={centerPos.x}
                cy={centerPos.y}
                r={radiusPx}
                fill="rgba(220, 38, 38, 0.15)"
                stroke="rgba(220, 38, 38, 0.8)"
                strokeWidth="3"
              />
            );
          })()}
        </svg>
      )}

      {evacuationPath && (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 25 }}
        >
          {(() => {
            const fromPos = getMarkerPosition(
              evacuationPath.from.lat,
              evacuationPath.from.lng,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            );
            const toPos = getMarkerPosition(
              evacuationPath.to.lat,
              evacuationPath.to.lng,
              center.lat,
              center.lng,
              zoom,
              dimensions.width,
              dimensions.height,
              offset.x,
              offset.y
            );

            return (
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="rgba(37, 99, 235, 0.8)"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
            );
          })()}
        </svg>
      )}

      <div
        className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded text-sm map-info"
        style={{ zIndex: 999999 }}
      >
        Drag to pan • Scroll to zoom • Click to set coordinates
      </div>
    </div>
  );
}
