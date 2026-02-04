import React from "react";
import { MapPin } from "lucide-react";
import MasterDataTable from "@/components/MasterDataTable";
import LocationFormFields from "@/components/forms/LocationFormFields";
import { locationApi } from "@/lib/api";

const columns = [
  { key: "masjid_name", label: "Masjid Name" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "created_by", label: "Created By" },
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
