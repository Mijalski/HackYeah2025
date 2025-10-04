import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ClusteredEvent, Shelter, EvacuationOrder } from '../types';
import { AlertTriangle } from 'lucide-react';

interface EvacuationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: ClusteredEvent[];
  shelters: Shelter[];
  onIssue: (order: Omit<EvacuationOrder, 'id' | 'issuedAt'>) => void;
}

export function EvacuationDialog({ 
  open, 
  onOpenChange, 
  incidents,
  shelters,
  onIssue 
}: EvacuationDialogProps) {
  const [selectedIncident, setSelectedIncident] = useState<string>('');
  const [selectedShelter, setSelectedShelter] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [radius, setRadius] = useState<string>('5');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedIncident || !selectedShelter) return;

    onIssue({
      incidentId: selectedIncident,
      targetShelterId: selectedShelter,
      priority,
      radius: parseFloat(radius),
      message: message || undefined,
    });

    // Reset form
    setSelectedIncident('');
    setSelectedShelter('');
    setPriority('medium');
    setRadius('5');
    setMessage('');
    onOpenChange(false);
  };

  const selectedIncidentData = incidents.find(i => i.id === selectedIncident);
  const selectedShelterData = shelters.find(s => s.id === selectedShelter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <DialogTitle>Issue Evacuation Order</DialogTitle>
          </div>
          <DialogDescription>
            Create an evacuation directive for civilians in the affected area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="incident">Select Incident</Label>
            <Select value={selectedIncident} onValueChange={setSelectedIncident}>
              <SelectTrigger id="incident">
                <SelectValue placeholder="Choose incident to evacuate from..." />
              </SelectTrigger>
              <SelectContent>
                {incidents.map((incident) => (
                  <SelectItem key={incident.id} value={incident.id}>
                    Incident #{incident.id.replace('cluster-', '')} - {incident.riskLevel?.toUpperCase()} Risk ({incident.events.length} signals)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shelter">Target Shelter</Label>
            <Select value={selectedShelter} onValueChange={setSelectedShelter}>
              <SelectTrigger id="shelter">
                <SelectValue placeholder="Choose destination shelter..." />
              </SelectTrigger>
              <SelectContent>
                {shelters.filter(s => s.available).map((shelter) => (
                  <SelectItem key={shelter.id} value={shelter.id}>
                    {shelter.name} - {shelter.type.toUpperCase()} (Capacity: {shelter.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val as any)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Advisory</SelectItem>
                <SelectItem value="medium">Medium - Recommended</SelectItem>
                <SelectItem value="high">High - Urgent</SelectItem>
                <SelectItem value="critical">Critical - Immediate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Evacuation Radius (km)</Label>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger id="radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 km</SelectItem>
                <SelectItem value="5">5 km</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="15">15 km</SelectItem>
                <SelectItem value="20">20 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to Civilians (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Additional instructions or information..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {selectedIncidentData && selectedShelterData && (
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-muted-foreground">Preview:</p>
              <p>
                <strong>From:</strong> Incident near ({selectedIncidentData.latitude.toFixed(4)}, {selectedIncidentData.longitude.toFixed(4)})
              </p>
              <p>
                <strong>To:</strong> {selectedShelterData.name}
              </p>
              <p>
                <strong>Affected area:</strong> {radius} km radius
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedIncident || !selectedShelter}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Issue Evacuation Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
