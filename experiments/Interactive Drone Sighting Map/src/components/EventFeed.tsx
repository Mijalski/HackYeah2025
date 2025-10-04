import { DroneEvent } from "../types";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { RadioTower, Eye, Volume2, MapPin } from "lucide-react";

interface EventFeedProps {
  events: DroneEvent[];
}

export function EventFeed({ events }: EventFeedProps) {
  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.timestamp_utc || b.timestamp).getTime() -
      new Date(a.timestamp_utc || a.timestamp).getTime()
  );

  const getEventIcon = (sensorType: DroneEvent["sensor_type"]) => {
    switch (sensorType) {
      case "microphone":
        return <Volume2 className="w-4 h-4" />;
      case "camera":
        return <Eye className="w-4 h-4" />;
      case "radar":
        return <RadioTower className="w-4 h-4" />;
      case "visual":
      case "manual":
        return <MapPin className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getEventColor = (sensorType: DroneEvent["sensor_type"]) => {
    switch (sensorType) {
      case "microphone":
        return "bg-purple-500";
      case "camera":
        return "bg-green-500";
      case "radar":
        return "bg-blue-500";
      case "visual":
      case "manual":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {sortedEvents.map((event) => (
          <div
            key={event.detection_id || event.id}
            className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`${getEventColor(
                  event.sensor_type
                )} text-white p-2 rounded-lg shrink-0`}
              >
                {getEventIcon(event.sensor_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground">
                    {event.detection_id || `Event #${event.id}`}
                  </span>
                  <Badge variant="outline" className="uppercase">
                    {event.sensor_type}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {event.classification}
                  </Badge>
                  {event.confidence && (
                    <Badge variant="secondary">
                      {(event.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                {event.drone_id && (
                  <div className="mb-1 text-muted-foreground">
                    Drone: {event.drone_id}
                  </div>
                )}
                <p className="text-foreground mb-2">
                  {event.description || "No description available"}
                </p>
                <div className="flex flex-wrap gap-3 text-muted-foreground">
                  <span>Sensor: {event.sensor_id}</span>
                  {event.altitude_m && <span>Alt: {event.altitude_m}m</span>}
                  {event.heading_deg !== undefined && (
                    <span>Heading: {event.heading_deg}°</span>
                  )}
                  {/* {event.speed_mps && (
                    <span>Speed: {event.speed_mps.toFixed(1)} m/s</span>
                  )} */}
                  {event.signal_strength_dbm && (
                    <span>Signal: {event.signal_strength_dbm} dBm</span>
                  )}
                  {event.reportedBy && <span>By: {event.reportedBy}</span>}
                </div>
                <div className="text-muted-foreground mt-2">
                  {formatTimeAgo(event.timestamp_utc || event.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
