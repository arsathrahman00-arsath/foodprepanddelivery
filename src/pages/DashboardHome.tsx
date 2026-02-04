import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MapPin, 
  Tag, 
  Ruler, 
  Package, 
  Truck, 
  BookOpen, 
  UtensilsCrossed,
  ArrowRight 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const dashboardCards = [
  {
    title: "Location",
    description: "Manage masjid locations and addresses",
    icon: MapPin,
    to: "/dashboard/location",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Item Category",
    description: "Organize items into categories",
    icon: Tag,
    to: "/dashboard/item-category",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Unit",
    description: "Define measurement units",
    icon: Ruler,
    to: "/dashboard/unit",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Item",
    description: "Manage inventory items",
    icon: Package,
    to: "/dashboard/item",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Supplier",
    description: "Track supplier information",
    icon: Truck,
    to: "/dashboard/supplier",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    title: "Recipe Type",
    description: "Categorize recipes",
    icon: BookOpen,
    to: "/dashboard/recipe-type",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    title: "Recipe",
    description: "Create and manage recipes",
    icon: UtensilsCrossed,
    to: "/dashboard/recipe",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

const DashboardHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, <span className="text-gradient-warm">{user?.user_name}</span>
        </h1>
        <p className="text-muted-foreground">
          Manage your food preparation master data from here
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-gradient-warm">7</p>
              <p className="text-sm text-muted-foreground mt-1">Master Sections</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground capitalize">{user?.role_selection}</p>
              <p className="text-sm text-muted-foreground mt-1">Your Role</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">{user?.user_code}</p>
              <p className="text-sm text-muted-foreground mt-1">User Code</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <h2 className="text-xl font-semibold mb-4">Master Data Sections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dashboardCards.map((card) => (
          <Link key={card.to} to={card.to}>
            <Card className="stat-card group cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <CardTitle className="text-lg flex items-center justify-between">
                  {card.title}
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
