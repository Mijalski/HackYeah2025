import { useState, useRef, useEffect, useMemo } from 'react';
import { DroneEvent, ClusteredEvent, Shelter, UserMode, EvacuationOrder } from '../types';
import { getVisibleTiles, getTilePosition, getMarkerPosition, viewportClickToLatLng, Tile } from '../lib/mapUtils';
import { ZoomIn, ZoomOut, AlertTriangle, Info, AlertCircle, AlertOctagon } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export type MilitaryViewMode = 'datapoints' | 'incidents';

interface MapViewProps {
  events: DroneEvent[];
  clusteredEvents: ClusteredEvent[];
  shelters: Shelter[];
  userMode: UserMode;
  militaryViewMode: MilitaryViewMode;
  evacuationOrders: EvacuationOrder[];
  onMapClick?: (lat: number, lng: number) => void;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get icon component based on risk level
function getRiskIcon(riskLevel?: string) {
  switch (riskLevel) {
    case 'low':
      return Info;
    case 'medium':
      return AlertCircle;
    case 'high':
      return AlertTriangle;
    case 'critical':
      return AlertOctagon;
    default:
      return Info;
  }
}

// Get color based on sensor type
function getSensorTypeColor(sensorType: string): string {
  switch (sensorType) {
    case 'microphone':
      return '#a855f7'; // purple
    case 'camera':
      return '#22c55e'; // green
    case 'radar':
      return '#3b82f6'; // blue
    case 'visual':
    case 'manual':
      return '#f97316'; // orange
    default:
      return '#6b7280'; // gray
  }
}

export function MapView({ events, clusteredEvents, shelters, userMode, militaryViewMode, evacuationOrders, onMapClick }: MapViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Map state - centered on Polish-Belarusian border
  const [center, setCenter] = useState({ lat: 53.0, lng: 23.5 });
  const [zoom, setZoom] = useState(8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (mapRef.current) {
        setDimensions({
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.marker-popup, .zoom-controls, .map-info')) {
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
      // Calculate zoom factor
      const zoomFactor = Math.pow(2, newZoom - zoom);
      
      // Adjust offset to zoom toward mouse position
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        
        const newOffsetX = centerX + (offset.x + mouseX - centerX) * zoomFactor - mouseX;
        const newOffsetY = centerY + (offset.y + mouseY - centerY) * zoomFactor - mouseY;
        
        setOffset({ x: newOffsetX, y: newOffsetY });
      }
      
      setZoom(newZoom);
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    // Close any open popup
    setSelectedEvent(null);
    
    if (!onMapClick) return;
    
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    
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
    setZoom(z => Math.min(18, z + 1));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(3, z - 1));
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

  const getEventColor = (type: DroneEvent['type']) => {
    switch (type) {
      case 'microphone': return '#8b5cf6';
      case 'photo': return '#10b981';
      case 'written': return '#3b82f6';
      case 'manual': return '#f59e0b';
    }
  };

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      default: return '#84cc16';
    }
  };

  // Calculate safe shelters for civilian mode
  const safeShelters = useMemo(() => {
    if (userMode !== 'civilian') return [];
    
    // Calculate average distance from each shelter to all threats
    const shelterSafety = shelters.map(shelter => {
      const distances = clusteredEvents.map(cluster => 
        calculateDistance(shelter.latitude, shelter.longitude, cluster.latitude, cluster.longitude)
      );
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      return { shelter, avgDistance };
    });
    
    // Sort by average distance (farther is safer) and take top 5
    return shelterSafety
      .sort((a, b) => b.avgDistance - a.avgDistance)
      .slice(0, 5)
      .map(s => s.shelter);
  }, [shelters, clusteredEvents, userMode]);

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
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* OpenStreetMap Tiles */}
      {tiles.map(tile => {
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
              height: 256
            }}
            draggable={false}
          />
        );
      })}

      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 zoom-controls">
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

      {/* Evacuation Order Alert - Civilian Mode */}
      {userMode === 'civilian' && evacuationOrders.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 max-w-md">
          {evacuationOrders.map((order) => {
            const shelter = shelters.find(s => s.id === order.targetShelterId);
            const incident = clusteredEvents.find(i => i.id === order.incidentId);
            
            const priorityColors = {
              low: 'bg-blue-600',
              medium: 'bg-yellow-600',
              high: 'bg-orange-600',
              critical: 'bg-red-600'
            };
            
            return (
              <div 
                key={order.id}
                className={`${priorityColors[order.priority]} text-white rounded-lg shadow-2xl p-4 mb-2 border-2 border-white animate-pulse`}
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
                      Proceed immediately to <strong>{shelter?.name || 'designated shelter'}</strong>
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

      {/* Evacuation Routes - Civilian Mode with Active Orders */}
      {userMode === 'civilian' && evacuationOrders.map(order => {
        const incident = clusteredEvents.find(i => i.id === order.incidentId);
        const shelter = shelters.find(s => s.id === order.targetShelterId);
        
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
          low: '#3b82f6',
          medium: '#eab308',
          high: '#f97316',
          critical: '#dc2626'
        };
        
        const routeColor = priorityColors[order.priority];
        
        return (
          <svg
            key={`evac-route-${order.id}`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          >
            {/* Glow effect */}
            <path
              d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
              fill="none"
              stroke={routeColor}
              strokeWidth="12"
              strokeOpacity="0.3"
              filter="blur(8px)"
            />
            {/* Main route - thicker and more prominent */}
            <path
              d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
              fill="none"
              stroke={routeColor}
              strokeWidth="6"
              strokeOpacity="0.9"
            />
            {/* White center line */}
            <path
              d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.8"
              strokeDasharray="15 10"
            />
            {/* Large arrow at shelter end */}
            <polygon
              points="0,-10 20,0 0,10"
              fill={routeColor}
              fillOpacity="1"
              transform={`translate(${endPos.x}, ${endPos.y}) rotate(${
                Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * 180 / Math.PI
              })`}
              stroke="white"
              strokeWidth="2"
            />
            {/* Pulsing circle at evacuation point */}
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

      {/* Routes to safe shelters - Civilian Mode */}
      {userMode === 'civilian' && evacuationOrders.length === 0 && safeShelters.map((shelter, idx) => {
        // Draw routes from threat clusters to this safe shelter
        return clusteredEvents.slice(0, 3).map((cluster, clusterIdx) => {
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
          
          // Color based on priority (top shelters get brighter colors)
          const routeColor = idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : '#8b5cf6';
          
          return (
            <svg
              key={`route-${shelter.id}-${cluster.id}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 3 }}
            >
              {/* Glow effect */}
              <path
                d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke={routeColor}
                strokeWidth="6"
                strokeOpacity="0.2"
                strokeDasharray="10 5"
                filter="blur(3px)"
              />
              {/* Main route */}
              <path
                d={`M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke={routeColor}
                strokeWidth="3"
                strokeOpacity="0.7"
                strokeDasharray="10 5"
              />
              {/* Arrow at shelter end */}
              <polygon
                points="0,-6 12,0 0,6"
                fill={routeColor}
                fillOpacity="0.8"
                transform={`translate(${endPos.x}, ${endPos.y}) rotate(${
                  Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * 180 / Math.PI
                })`}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
          );
        });
      })}

      {/* Trajectories - Military Mode */}
      {userMode === 'military' && clusteredEvents.map(cluster => {
        if (!cluster.trajectory || cluster.trajectory.length < 2) return null;
        
        const color = getRiskColor(cluster.riskLevel);
        
        // Convert trajectory points to screen coordinates
        const trajectoryPath = cluster.trajectory.map(point => 
          getMarkerPosition(
            point.lat,
            point.lng,
            center.lat,
            center.lng,
            zoom,
            dimensions.width,
            dimensions.height,
            offset.x,
            offset.y
          )
        );
        
        // Split into actual and projected paths
        const actualPoints = [];
        const projectedPoints = [];
        
        for (let i = 0; i < cluster.trajectory.length; i++) {
          const point = trajectoryPath[i];
          if (cluster.trajectory[i].isProjected) {
            if (projectedPoints.length === 0 && actualPoints.length > 0) {
              projectedPoints.push(actualPoints[actualPoints.length - 1]);
            }
            projectedPoints.push(point);
          } else {
            actualPoints.push(point);
          }
        }
        
        // Create SVG path strings
        const actualPathD = actualPoints.map((p, i) => 
          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
        
        const projectedPathD = projectedPoints.map((p, i) => 
          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
        
        return (
          <svg
            key={`trajectory-${cluster.id}`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          >
            {/* Actual trajectory path */}
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
                  const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
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
            
            {/* Projected trajectory path (dashed) */}
            {projectedPathD && (
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
                  const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
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
                    transform={`translate(${projectedPoints[projectedPoints.length - 1].x}, ${projectedPoints[projectedPoints.length - 1].y}) rotate(${
                      Math.atan2(
                        projectedPoints[projectedPoints.length - 1].y - projectedPoints[projectedPoints.length - 2].y,
                        projectedPoints[projectedPoints.length - 1].x - projectedPoints[projectedPoints.length - 2].x
                      ) * 180 / Math.PI
                    })`}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                )}
              </>
            )}
            
            {/* Event markers on trajectory */}
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
      })}

      {/* Shelters - Show all in military mode, only safe ones in civilian mode */}
      {(userMode === 'military' ? shelters : safeShelters).map(shelter => {
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
        
        const isVisible = pos.x >= -50 && pos.x <= dimensions.width + 50 && 
                         pos.y >= -50 && pos.y <= dimensions.height + 50;
        const isSelected = selectedEvent === shelter.id;

        if (!isVisible) return null;

        const shelterColor = shelter.type === 'military' ? '#7c3aed' : '#2563eb';

        // Highlight recommended shelters in civilian mode
        const isRecommended = userMode === 'civilian' && safeShelters.indexOf(shelter) < 3;

        return (
          <div
            key={shelter.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 9999 : 8 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(selectedEvent === shelter.id ? null : shelter.id);
            }}
          >
            {isRecommended && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            )}
            <div
              className={`w-5 h-5 border-2 border-white shadow-lg ${isRecommended ? 'ring-2 ring-green-500' : ''}`}
              style={{ backgroundColor: shelterColor }}
            />
            
            {selectedEvent === shelter.id && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 marker-popup" style={{ zIndex: 10 }}>
                <h3 className="mb-2">{shelter.name}</h3>
                <div className="space-y-1 text-foreground">
                  <div><strong>Type:</strong> {shelter.type.toUpperCase()}</div>
                  <div><strong>Capacity:</strong> {shelter.capacity} people</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={shelter.available ? 'text-green-600' : 'text-red-600'}>
                      {shelter.available ? 'Available' : 'Full'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-muted-foreground">
                    {shelter.latitude.toFixed(4)}, {shelter.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Individual Data Points - Military Mode with Data Points view */}
      {userMode === 'military' && militaryViewMode === 'datapoints' && events.map(event => {
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
        const isVisible = pos.x >= -50 && pos.x <= dimensions.width + 50 && 
                         pos.y >= -50 && pos.y <= dimensions.height + 50;
        const isSelected = selectedEvent === (event.detection_id || event.id);

        if (!isVisible) return null;

        return (
          <div
            key={event.detection_id || event.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 9999 : 10 }}
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
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[320px] max-w-[380px] border border-gray-200 marker-popup" style={{ zIndex: 10 }}>
                <h3 className="mb-2">Detection {event.detection_id}</h3>
                <div className="space-y-1.5 text-foreground">
                  {/* Detection Info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div><strong>Sensor:</strong> {event.sensor_id}</div>
                    <div><strong>Type:</strong> {event.sensor_type}</div>
                    <div><strong>Source:</strong> {event.detection_source}</div>
                    <div><strong>Classification:</strong> <span className="capitalize">{event.classification}</span></div>
                  </div>
                  
                  {/* Drone Info */}
                  {event.drone_id && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <div><strong>Drone ID:</strong> {event.drone_id}</div>
                    </div>
                  )}
                  
                  {/* Location & Movement */}
                  <div className="pt-1.5 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-1">
                    <div><strong>Altitude:</strong> {event.altitude_m ? `${event.altitude_m}m` : 'N/A'}</div>
                    <div><strong>Speed:</strong> {event.speed_mps ? `${event.speed_mps.toFixed(1)} m/s` : 'N/A'}</div>
                    <div><strong>Heading:</strong> {event.heading_deg ? `${event.heading_deg}°` : 'N/A'}</div>
                    <div><strong>Course:</strong> {event.course_vector || 'N/A'}</div>
                  </div>
                  
                  {/* Signal Quality */}
                  <div className="pt-1.5 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-1">
                    <div><strong>Confidence:</strong> {Math.round(event.confidence * 100)}%</div>
                    {event.signal_strength_dbm && (
                      <div><strong>Signal:</strong> {event.signal_strength_dbm} dBm</div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {event.description && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <div className="text-muted-foreground">{event.description}</div>
                    </div>
                  )}
                  
                  {/* Timestamps */}
                  <div className="pt-1.5 border-t border-gray-200 text-muted-foreground">
                    <div>Detected: {new Date(event.timestamp_utc).toLocaleString()}</div>
                    <div>Ingested: {new Date(event.ingestion_time).toLocaleString()}</div>
                  </div>
                  
                  {/* Coordinates */}
                  <div className="text-muted-foreground">
                    {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Clustered Incidents - Military Mode with Incidents view */}
      {userMode === 'military' && militaryViewMode === 'incidents' && clusteredEvents.map(cluster => {
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
        const isVisible = pos.x >= -50 && pos.x <= dimensions.width + 50 && 
                         pos.y >= -50 && pos.y <= dimensions.height + 50;
        const isSelected = selectedEvent === cluster.id;
        const RiskIcon = getRiskIcon(cluster.riskLevel);

        if (!isVisible) return null;

        return (
          <div
            key={cluster.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 9999 : 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(selectedEvent === cluster.id ? null : cluster.id);
            }}
          >
            <div
              className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
              style={{ backgroundColor: color }}
            >
              <RiskIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            
            {selectedEvent === cluster.id && (
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[280px] border border-gray-200 marker-popup" style={{ zIndex: 10 }}>
                <h3 className="mb-2">Incident #{cluster.id.replace('cluster-', '')}</h3>
                <div className="space-y-1 text-foreground">
                  <div><strong>Events:</strong> {cluster.events.length} signals</div>
                  <div><strong>Pattern:</strong> {cluster.pattern || 'Unknown'}</div>
                  <div>
                    <strong>Risk Level:</strong>{' '}
                    <span style={{ color }} className="uppercase">
                      {cluster.riskLevel}
                    </span>
                  </div>
                  {cluster.projectedHeading !== undefined && (
                    <div className="pt-2 border-t border-gray-200">
                      <strong>Projected Heading:</strong> {Math.round(cluster.projectedHeading)}°
                    </div>
                  )}
                  {cluster.estimatedSpeed !== undefined && cluster.estimatedSpeed > 0 && (
                    <div>
                      <strong>Estimated Speed:</strong> {Math.round(cluster.estimatedSpeed)} km/h
                    </div>
                  )}
                  {cluster.trajectory && (
                    <div>
                      <strong>Trajectory:</strong> {cluster.trajectory.filter(p => !p.isProjected).length} actual, {cluster.trajectory.filter(p => p.isProjected).length} projected
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 text-muted-foreground">
                    {new Date(cluster.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Map Info */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded text-sm map-info">
        Drag to pan • Scroll to zoom • Click to set coordinates
      </div>
    </div>
  );
}
