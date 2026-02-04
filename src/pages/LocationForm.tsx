import React from "react";
import { MapPin } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import LocationFormFields from "@/components/forms/LocationFormFields";
import { locationApi } from "@/lib/api";

const columns = [
  { key: "masjid_name", label: "masjid_name" },
  { key: "address", label: "address" },
  { key: "city", label: "city" },
  { key: "created_by", label: "created_by" },
];

const LocationPage: React.FC = () => {
  return (
    <MasterDataTable
      title="Location"
      description="Manage masjid locations"
      icon={<MapPin className="w-5 h-5 text-emerald-600" />}
      columns={columns}
      fetchData={locationApi.getAll}
      formComponent={<LocationFormFields />}
      onFormSuccess={() => {}}
    />
  );
};

export default LocationPage;
