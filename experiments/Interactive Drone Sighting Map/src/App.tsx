import { useState, useEffect } from "react";
import { MapView } from "./components/MapView";
import { EventFeed } from "./components/EventFeed";
import { ReportEventDialog } from "./components/ReportEventDialog";
import { EvacuationDialog } from "./components/EvacuationDialog";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  MapPin,
  Activity,
  Shield,
  Plus,
  Users,
  AlertTriangle,
  Info,
  AlertCircle,
  AlertOctagon,
  Brain,
  Circle,
  RefreshCw,
} from "lucide-react";
import { mockShelters } from "./lib/mockData";
import { fetchDetections, fetchSummaries } from "./lib/api";
import { DroneEvent, UserMode, EvacuationOrder, ClusteredEvent } from "./types";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";
import logoImage from "figma:asset/39b0edce24ff5dfe942b0f8630d07a3a7127cea9.png";

export type MilitaryViewMode = "datapoints" | "incidents";

export default function App() {
  const [events, setEvents] = useState<DroneEvent[]>([]);
  const [incidents, setIncidents] = useState<ClusteredEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [userMode, setUserMode] = useState<UserMode>("civilian");
  const [militaryViewMode, setMilitaryViewMode] =
    useState<MilitaryViewMode>("incidents");
  const [isMilitaryLoggedIn, setIsMilitaryLoggedIn] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [evacuationDialogOpen, setEvacuationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  }>();
  const [evacuationOrders, setEvacuationOrders] = useState<EvacuationOrder[]>(
    []
  );

  // Fetch detections from API
  const loadDetections = async (manualRefresh = false) => {
    try {
      setIsLoadingEvents(true);
      const detections = await fetchDetections();
      setEvents(detections);
      setLastFetchTime(new Date());
      setUsingMockData(false);

      if (manualRefresh) {
        toast.success("Connected to API", {
          description: `Loaded ${detections.length} live detections`,
        });
      }
    } catch (error) {
      // No fallback to mock data - show error and keep empty
      setUsingMockData(true);

      if (manualRefresh) {
        toast.error("Cannot connect to API", {
          description:
            "API unavailable due to CORS. Please configure CORS on your Lambda endpoint or connect Supabase.",
        });
      }
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Fetch incident summaries from API
  const loadIncidents = async (manualRefresh = false) => {
    try {
      setIsLoadingIncidents(true);
      const summaries = await fetchSummaries();
      setIncidents(summaries);

      if (manualRefresh) {
        toast.success("Incidents Updated", {
          description: `Loaded ${summaries.length} incident reports`,
        });
      }
    } catch (error) {
      // Keep empty on error
      if (manualRefresh) {
        toast.error("Cannot load incidents", {
          description:
            "Incident API unavailable due to CORS. Please configure CORS on your Lambda endpoint or connect Supabase.",
        });
      }
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDetections();
    loadIncidents();
  }, []);

  // Auto-refresh every 30 seconds (only if connected to API)
  useEffect(() => {
    if (usingMockData) return; // Don't auto-refresh in demo mode

    const interval = setInterval(() => {
      loadDetections(false);
      loadIncidents(false);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [usingMockData]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };

  const handleReportSubmit = (
    eventData: Omit<DroneEvent, "id" | "timestamp">
  ) => {
    const now = new Date();
    const detectionId = `DET-USR-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const newEvent: DroneEvent = {
      ...eventData,
      detection_id: detectionId,
      timestamp_utc: now,
      ingestion_time: now,
      sensor_id: "SNR-USER-REPORT",
      sensor_type:
        eventData.type === "microphone"
          ? "microphone"
          : eventData.type === "photo"
          ? "camera"
          : "manual",
      detection_source:
        eventData.type === "microphone"
          ? "acoustic"
          : eventData.type === "photo"
          ? "optical"
          : "human",
      classification: "possible",
      // Legacy fields for backward compatibility
      id: `${Date.now()}`,
      timestamp: now,
    };

    setEvents([newEvent, ...events]);
    toast.success("Event reported successfully", {
      description: `New ${eventData.type} sighting added to the system.`,
    });
  };

  const militaryModeToggle = () => {
    if (isMilitaryLoggedIn) handleMilitaryLogout();
    else handleMilitaryLogin();
  };

  const handleMilitaryLogin = () => {
    setIsMilitaryLoggedIn(true);
    setUserMode("military");
  };

  const handleMilitaryLogout = () => {
    setIsMilitaryLoggedIn(false);
    setUserMode("civilian");
    // toast.info("Logged out", {
    //   description: "Switched to civilian mode",
    // });
  };

  const handleEvacuationIssue = (
    orderData: Omit<EvacuationOrder, "id" | "issuedAt">
  ) => {
    const newOrder: EvacuationOrder = {
      ...orderData,
      id: `evac-${Date.now()}`,
      issuedAt: new Date(),
    };

    setEvacuationOrders([...evacuationOrders, newOrder]);

    const shelter = mockShelters.find(
      (s) => s.id === orderData.targetShelterId
    );
    const incident = incidents.find((i) => i.id === orderData.incidentId);

    toast.warning("Evacuation Order Issued", {
      description: `Directing civilians to ${
        shelter?.name || "shelter"
      }. Priority: ${orderData.priority.toUpperCase()}`,
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
              <p className="text-muted-foreground">
                Unmanned Aerial Vehicle Observance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <TooltipProvider>
              <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                <Activity
                  className={`w-4 h-4 ${
                    events.length > 0
                      ? "text-green-500 animate-pulse"
                      : "text-orange-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  System {events.length > 0 ? "Active" : "Waiting"}
                </span>
                <Badge variant="secondary">{events.length} Events</Badge>
                {usingMockData && events.length === 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-600 cursor-help gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        API Unavailable
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Cannot connect to API - configure CORS or use Supabase
                        proxy
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {lastFetchTime && !usingMockData && events.length > 0 && (
                  <span className="text-muted-foreground text-xs ml-2">
                    Live • Updated {lastFetchTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </TooltipProvider>

            <Button
              onClick={militaryModeToggle}
              style={{ width: "140px" }}
              className="cursor-pointer"
            >
              {isMilitaryLoggedIn ? "Military View" : "Civilian View"}
            </Button>

            <Button
              onClick={() => setReportDialogOpen(true)}
              size="lg"
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Event
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs defaultValue="map" className="flex-1 flex flex-col">
          <div className="border-border bg-card px-6 pt-2">
            <TabsList className="h-12 px-2 py-1">
              <TabsTrigger value="map" className="gap-2 cursor-pointer px-4">
                <MapPin className="w-4 h-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-2 cursor-pointer px-4">
                <Activity className="w-4 h-4" />
                Live Event Feed
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="map" className="flex-1 m-0 relative">
            {/* User Mode Indicator */}
            <div
              className="absolute top-4 right-4 z-10 bg-card border border-border rounded-lg p-4 shadow-lg"
              style={{ zIndex: 999999 }}
            >
              <div className="flex items-center gap-3">
                {userMode === "military" ? (
                  <Shield className="w-5 h-5 text-blue-600" />
                ) : (
                  <Users className="w-5 h-5 text-green-600" />
                )}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span>
                      {userMode === "military"
                        ? "Military Mode"
                        : "Civilian Mode"}
                    </span>
                    {userMode === "military" && (
                      <Badge variant="secondary">Tactical</Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {userMode === "military"
                      ? "Routes to intercept threats"
                      : "Routes to nearest shelters"}
                  </span>
                </div>
              </div>

              {/* AI Mode Filter - Military Only */}
              {userMode === "military" && (
                <div className="mt-4 pt-4 border-t border-border z-[99999]">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-muted-foreground">AI Mode</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        militaryViewMode === "datapoints"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setMilitaryViewMode("datapoints")}
                      className="flex-1 cursor-pointer"
                    >
                      <Circle className="w-3 h-3 mr-1.5" />
                      Data Points
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        militaryViewMode === "incidents" ? "default" : "outline"
                      }
                      onClick={() => setMilitaryViewMode("incidents")}
                      className="flex-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1.5" />
                      Incidents
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* Legend */}
            <div
              className="absolute bottom-4 left-4 z-10 bg-card border border-border rounded-lg p-4 shadow-lg"
              style={{ zIndex: 9999999 }}
            >
              <h3 className="mb-3">Legend</h3>
              {userMode === "military" ? (
                <div className="space-y-2.5">
                  {militaryViewMode === "incidents" ? (
                    <>
                      <h4 className="text-muted-foreground mb-2">
                        Threat Levels
                      </h4>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#84cc16] border-2 border-white shadow-md flex items-center justify-center">
                          <Info
                            className="w-4 h-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <span>Low Risk</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#f59e0b] border-2 border-white shadow-md flex items-center justify-center">
                          <AlertCircle
                            className="w-4 h-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <span>Medium Risk</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#ea580c] border-2 border-white shadow-md flex items-center justify-center">
                          <AlertTriangle
                            className="w-4 h-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <span>High Risk</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#dc2626] border-2 border-white shadow-md flex items-center justify-center">
                          <AlertOctagon
                            className="w-4 h-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <span>Critical Risk</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-muted-foreground mb-2">
                        Sensor Types
                      </h4>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#a855f7] border-2 border-white shadow-sm"></div>
                        <span>Microphone (Acoustic)</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#22c55e] border-2 border-white shadow-sm"></div>
                        <span>Camera (Optical)</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#3b82f6] border-2 border-white shadow-sm"></div>
                        <span>Radar (EM)</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#f97316] border-2 border-white shadow-sm"></div>
                        <span>Visual/Manual</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-border my-2 pt-2">
                    <h4 className="text-muted-foreground mb-2">Shelters</h4>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 bg-[#2563eb] border-2 border-white shadow-sm"></div>
                      <span>Public Shelter</span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div className="w-5 h-5 bg-[#7c3aed] border-2 border-white shadow-sm"></div>
                      <span>Military Shelter</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {evacuationOrders.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 dark:text-red-400">
                          Active Evacuation
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-red-600"></div>
                        <span>Priority Route</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#2563eb] border-2 border-white"></div>
                        <span>Destination Shelter</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#2563eb] border-2 border-white"></div>
                        <span>Safe Shelter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative w-4 h-4 bg-[#2563eb] border-2 border-white">
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                        </div>
                        <span>Recommended</span>
                      </div>
                      <div className="border-t border-border my-2 pt-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-1 bg-[#10b981] opacity-70"
                            style={{
                              clipPath:
                                "polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%)",
                            }}
                          ></div>
                          <span>Evacuation Route</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {(isLoadingEvents && events.length === 0) ||
            (isLoadingIncidents && incidents.length === 0) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Loading detection data...
                  </p>
                </div>
              </div>
            ) : (
              <MapView
                events={events}
                clusteredEvents={incidents}
                shelters={mockShelters}
                userMode={userMode}
                militaryViewMode={militaryViewMode}
                evacuationOrders={evacuationOrders}
                onMapClick={handleMapClick}
              />
            )}
          </TabsContent>
          {/* <EvacuationDialog
            open={true}
            onOpenChange={setEvacuationDialogOpen}
            incidents={incidents}
            shelters={mockShelters}
            onIssue={handleEvacuationIssue}
          /> */}
          <TabsContent value="feed" className="flex-1 m-0">
            {isLoadingEvents && events.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Loading detection data...
                  </p>
                </div>
              </div>
            ) : (
              <EventFeed events={events} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReportEventDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        onSubmit={handleReportSubmit}
        selectedLocation={selectedLocation}
      />

      <EvacuationDialog
        open={evacuationDialogOpen}
        onOpenChange={setEvacuationDialogOpen}
        incidents={incidents}
        shelters={mockShelters}
        onIssue={handleEvacuationIssue}
      />
    </div>
  );
}
