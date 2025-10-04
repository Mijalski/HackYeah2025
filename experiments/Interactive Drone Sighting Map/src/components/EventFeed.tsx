import { DroneEvent } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { RadioTower, Eye, Volume2, MapPin } from 'lucide-react';

interface EventFeedProps {
  events: DroneEvent[];
}

export function EventFeed({ events }: EventFeedProps) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEventIcon = (type: DroneEvent['type']) => {
    switch (type) {
      case 'microphone': return <Volume2 className="w-4 h-4" />;
      case 'photo': return <Eye className="w-4 h-4" />;
      case 'written': return <RadioTower className="w-4 h-4" />;
      case 'manual': return <MapPin className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: DroneEvent['type']) => {
    switch (type) {
      case 'microphone': return 'bg-purple-500';
      case 'photo': return 'bg-green-500';
      case 'written': return 'bg-blue-500';
      case 'manual': return 'bg-orange-500';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
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
            key={event.id}
            className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`${getEventColor(event.type)} text-white p-2 rounded-lg shrink-0`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground">Event #{event.id}</span>
                  <Badge variant="outline" className="uppercase">
                    {event.type}
                  </Badge>
                  {event.confidence && (
                    <Badge variant="secondary">
                      {(event.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                <p className="text-foreground mb-2">
                  {event.description || 'No description available'}
                </p>
                <div className="flex flex-wrap gap-3 text-muted-foreground">
                  {event.altitude && (
                    <span>Alt: {event.altitude}m</span>
                  )}
                  {event.heading !== undefined && (
                    <span>Heading: {event.heading}°</span>
                  )}
                  {event.speed && (
                    <span>Speed: {event.speed} km/h</span>
                  )}
                  {event.reportedBy && (
                    <span>By: {event.reportedBy}</span>
                  )}
                </div>
                <div className="text-muted-foreground mt-2">
                  {formatTimeAgo(event.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
