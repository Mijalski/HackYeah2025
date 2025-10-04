import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Info,
  CheckCircle2,
  Paperclip,
  X,
  FileImage,
  FileText,
  File,
} from "lucide-react";
import { DroneEvent } from "../types";
import { toast } from "sonner@2.0.3";

interface ReportEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: Omit<DroneEvent, "id" | "timestamp">) => void;
  selectedLocation?: { lat: number; lng: number };
}

export function ReportEventDialog({
  open,
  onOpenChange,
  onSubmit,
  selectedLocation,
}: ReportEventDialogProps) {
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    type: "manual" as DroneEvent["type"],
    description: "",
    reportedBy: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update coordinates when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        latitude: selectedLocation.lat.toFixed(6),
        longitude: selectedLocation.lng.toFixed(6),
      }));

      // Show toast notification when coordinates are copied
      // toast.success('Coordinates set from map', {
      //   description: `Location: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
      //   duration: 3000,
      // });
    }
  }, [selectedLocation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);

    // Show toast for each file added
    files.forEach((file) => {
      toast.success("Attachment added", {
        description: file.name,
        duration: 2000,
      });
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const removedFile = attachments[index];
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    toast.info("Attachment removed", {
      description: removedFile.name,
      duration: 2000,
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <FileImage className="w-4 h-4" />;
    } else if (file.type.startsWith("text/") || file.type.includes("pdf")) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      type: formData.type,
      description: formData.description || undefined,
      reportedBy: formData.reportedBy || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      confidence: 0.95,
    });

    // Reset form
    setFormData({
      latitude: "",
      longitude: "",
      type: "manual",
      description: "",
      reportedBy: "",
    });
    setAttachments([]);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Event</DialogTitle>
          <DialogDescription>
            Submit a manual UAV sighting report. Click on the map to set
            coordinates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {selectedLocation ? (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Location set from map:</strong>{" "}
                <span className="text-green-950 dark:text-green-100">
                  {selectedLocation.lat.toFixed(6)},{" "}
                  {selectedLocation.lng.toFixed(6)}
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Click anywhere on the map to set the event location before
                submitting.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  readOnly
                  required
                  placeholder="Click map to set"
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  readOnly
                  required
                  placeholder="Click map to set"
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Detection Type</Label>
              <Input
                id="type"
                value="Manual input"
                readOnly
                className="bg-muted"
              />
              <p className="text-muted-foreground mt-1.5">
                Other detection types (photo, microphone, written) are
                automatically reported via backend systems.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By</Label>
              <Input
                id="reportedBy"
                value={formData.reportedBy}
                onChange={(e) =>
                  setFormData({ ...formData, reportedBy: e.target.value })
                }
                placeholder="Observer post or station"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the sighting..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Add Files
                </Button>

                {attachments.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted rounded-md"
                      >
                        <div className="text-muted-foreground">
                          {getFileIcon(file)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{file.name}</p>
                          <p className="text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                          className="h-8 w-8 p-0 shrink-0 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
