import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, Image, Film, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mediaApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const MEDIA_TYPES = [
  { value: "material", label: "Material Cleaning" },
  { value: "vessel", label: "Vessel Cleaning" },
  { value: "prep", label: "Preparation Area" },
  { value: "packing", label: "Packing Area" },
  { value: "cooking", label: "Cooking" },
];

interface MediaItem {
  photo_url?: string;
  video_url?: string;
}

const ViewMediaPage: React.FC = () => {
  const [date, setDate] = useState<Date>();
  const [mediaType, setMediaType] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!date || !mediaType) {
      toast({ title: "Please select both date and type", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await mediaApi.getMedia(format(date, "yyyy-MM-dd"), mediaType);
      if (response.status === "success" && response.data) {
        setMediaItems(response.data);
      } else {
        setMediaItems([]);
      }
    } catch (error) {
      toast({ title: "Failed to fetch media", variant: "destructive" });
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPhotos = mediaItems.filter((m) => m.photo_url).length;
  const totalVideos = mediaItems.filter((m) => m.video_url).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">View Media</h1>
        <p className="text-muted-foreground">Browse photos and videos by date and activity type</p>
      </div>

      {/* Search Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">Activity Type</label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              <Search className="w-4 h-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {searched && !loading && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="w-4 h-4" />
            {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Film className="w-4 h-4" />
            {totalVideos} video{totalVideos !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Media Grid */}
      {searched && !loading && mediaItems.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No media found</p>
            <p className="text-sm">Try a different date or activity type</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaItems.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            {item.photo_url && (
              <div>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" /> Photo
                  </CardTitle>
                </CardHeader>
                <AspectRatio ratio={4 / 3}>
                  <img
                    src={item.photo_url}
                    alt={`Cleaning photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </AspectRatio>
              </div>
            )}
            {item.video_url && (
              <div>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" /> Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <video
                    controls
                    className="w-full rounded-md"
                    preload="metadata"
                  >
                    <source src={item.video_url} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                </CardContent>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ViewMediaPage;
