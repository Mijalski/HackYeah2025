import { useState, useRef, useEffect } from 'react';
import { DroneEvent, ClusteredEvent } from '../types';
import { getVisibleTiles, getTilePosition, getMarkerPosition, viewportClickToLatLng, Tile } from '../lib/mapUtils';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';

interface MapViewProps {
  events: DroneEvent[];
  clusteredEvents: ClusteredEvent[];
  aiMode: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

export function MapView({ events, clusteredEvents, aiMode, onMapClick }: MapViewProps) {
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

      {/* Trajectories - AI Mode */}
      {aiMode && clusteredEvents.map(cluster => {
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
              // Add last actual point as first projected point for continuity
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
                {/* Glow effect */}
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
                {/* Main path */}
                <path
                  d={actualPathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="5"
                  strokeOpacity="0.95"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Add arrows along the path */}
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
                {/* Glow effect for projection */}
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
                {/* Main projected path */}
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
                {/* Arrows along projected path */}
                {projectedPoints.slice(0, -1).map((point, i) => {
                  if (i % 2 !== 0) return null; // Show fewer arrows on projected path
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
                {/* Large arrow at the end of projected path */}
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

      {/* Markers - AI Mode: Clustered events */}
      {aiMode && clusteredEvents.map(cluster => {
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

        if (!isVisible) return null;

        return (
          <div
            key={cluster.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 1000 : 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(selectedEvent === cluster.id ? null : cluster.id);
            }}
          >
            <div
              className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
              style={{ backgroundColor: color }}
            >
              <span className="text-white">{cluster.events.length}</span>
            </div>
            
            {selectedEvent === cluster.id && (
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[280px] border border-gray-200 marker-popup">
                <h3 className="mb-2">Cluster Analysis</h3>
                <div className="space-y-1 text-foreground">
                  <div><strong>Events:</strong> {cluster.events.length}</div>
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
                      <strong>Trajectory Points:</strong> {cluster.trajectory.filter(p => !p.isProjected).length} actual, {cluster.trajectory.filter(p => p.isProjected).length} projected
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

      {/* Markers - Simple Mode: Individual events */}
      {!aiMode && events.map(event => {
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
        
        const color = getEventColor(event.type);
        const isVisible = pos.x >= -50 && pos.x <= dimensions.width + 50 && 
                         pos.y >= -50 && pos.y <= dimensions.height + 50;
        const isSelected = selectedEvent === event.id;

        if (!isVisible) return null;

        return (
          <div
            key={event.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
            style={{ left: pos.x, top: pos.y, zIndex: isSelected ? 1000 : 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(selectedEvent === event.id ? null : event.id);
            }}
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: color }}
            />
            
            {selectedEvent === event.id && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 marker-popup">
                <h3 className="mb-2">Event #{event.id}</h3>
                <div className="space-y-1 text-foreground">
                  <div><strong>Type:</strong> {event.type.toUpperCase()}</div>
                  {event.confidence && (
                    <div><strong>Confidence:</strong> {(event.confidence * 100).toFixed(0)}%</div>
                  )}
                  {event.altitude && (
                    <div><strong>Altitude:</strong> {event.altitude}m</div>
                  )}
                  {event.heading !== undefined && (
                    <div><strong>Heading:</strong> {event.heading}°</div>
                  )}
                  {event.speed && (
                    <div><strong>Speed:</strong> {event.speed} km/h</div>
                  )}
                  {event.reportedBy && (
                    <div><strong>Reported by:</strong> {event.reportedBy}</div>
                  )}
                  <div className="pt-2 border-t border-gray-200 text-muted-foreground">
                    {event.description || 'No description'}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
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