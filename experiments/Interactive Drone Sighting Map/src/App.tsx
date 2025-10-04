import { useState } from 'react';
import { MapView } from './components/MapView';
import { EventFeed } from './components/EventFeed';
import { ReportEventDialog } from './components/ReportEventDialog';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { MapPin, Activity, Sparkles, Plus } from 'lucide-react';
import { mockEvents, mockClusteredEvents } from './lib/mockData';
import { DroneEvent } from './types';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import logoImage from 'figma:asset/39b0edce24ff5dfe942b0f8630d07a3a7127cea9.png';

export default function App() {
  const [events, setEvents] = useState<DroneEvent[]>(mockEvents);
  const [aiMode, setAiMode] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>();

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };

  const handleReportSubmit = (eventData: Omit<DroneEvent, 'id' | 'timestamp'>) => {
    const newEvent: DroneEvent = {
      ...eventData,
      id: `${Date.now()}`,
      timestamp: new Date(),
    };
    
    setEvents([newEvent, ...events]);
    toast.success('Event reported successfully', {
      description: `New ${eventData.type} sighting added to the system.`,
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <Toaster position="bottom-center" />
      
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black border border-border p-2 rounded-lg">
              <img src={logoImage} alt="UAVO Logo" className="w-8 h-8" />
            </div>
            <div>
              <h1>UAVO</h1>
              <p className="text-muted-foreground">Unmanned Aerial Vehicle Observance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-muted-foreground">System Active</span>
              <Badge variant="secondary">{events.length} Events</Badge>
            </div>
            
            <Button onClick={() => setReportDialogOpen(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Report Event
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs defaultValue="map" className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card px-6 shrink-0">
            <TabsList className="h-12">
              <TabsTrigger value="map" className="gap-2">
                <MapPin className="w-4 h-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-2">
                <Activity className="w-4 h-4" />
                Live Event Feed
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="map" className="flex-1 m-0 relative">
            {/* AI Toggle Overlay */}
            <div className="absolute top-4 right-4 z-10 bg-card border border-border rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Sparkles className={`w-5 h-5 ${aiMode ? 'text-blue-500' : 'text-muted-foreground'}`} />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ai-mode" className="cursor-pointer">
                    AI Analysis Mode
                  </Label>
                  <span className="text-muted-foreground">
                    {aiMode ? 'Clustered view with trajectory projection' : 'Individual event markers'}
                  </span>
                </div>
                <Switch
                  id="ai-mode"
                  checked={aiMode}
                  onCheckedChange={setAiMode}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-card border border-border rounded-lg p-4 shadow-lg">
              <h3 className="mb-3">Legend</h3>
              {aiMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#84cc16] border-2 border-white"></div>
                    <span>Low Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f59e0b] border-2 border-white"></div>
                    <span>Medium Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#ea580c] border-2 border-white"></div>
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#dc2626] border-2 border-white"></div>
                    <span>Critical Risk</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#8b5cf6] border-2 border-white"></div>
                    <span>Microphone drone signal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#10b981] border-2 border-white"></div>
                    <span>Drone photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-white"></div>
                    <span>Written drone reporting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white"></div>
                    <span>Manual input</span>
                  </div>
                </div>
              )}
            </div>

            <MapView
              events={events}
              clusteredEvents={mockClusteredEvents}
              aiMode={aiMode}
              onMapClick={handleMapClick}
            />
          </TabsContent>

          <TabsContent value="feed" className="flex-1 m-0">
            <EventFeed events={events} />
          </TabsContent>
        </Tabs>
      </div>

      <ReportEventDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        onSubmit={handleReportSubmit}
        selectedLocation={selectedLocation}
      />
    </div>
  );
}
