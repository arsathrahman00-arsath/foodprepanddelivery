import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ChefHat,
  MapPin,
  Tag,
  Ruler,
  Package,
  Truck,
  BookOpen,
  UtensilsCrossed,
  LogOut,
  LayoutDashboard,
  User,
  ChevronDown,
  Database,
  Calendar,
  CalendarDays,
  ClipboardList,
  ChefHat as PrepIcon,
  ListChecks,
  PackageCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "sidebar-item",
        isActive && "sidebar-item-active"
      )
    }
  >
    {icon}
    <span className="font-medium">{label}</span>
  </NavLink>
);

const masterMenuItems = [
  { to: "/dashboard/location", icon: <MapPin className="w-4 h-4" />, label: "Location" },
  { to: "/dashboard/item-category", icon: <Tag className="w-4 h-4" />, label: "Item Category" },
  { to: "/dashboard/unit", icon: <Ruler className="w-4 h-4" />, label: "Unit" },
  { to: "/dashboard/item", icon: <Package className="w-4 h-4" />, label: "Item" },
  { to: "/dashboard/supplier", icon: <Truck className="w-4 h-4" />, label: "Supplier" },
  { to: "/dashboard/recipe-type", icon: <BookOpen className="w-4 h-4" />, label: "Recipe Type" },
  { to: "/dashboard/recipe", icon: <UtensilsCrossed className="w-4 h-4" />, label: "Recipe" },
];

const deliveryPlanMenuItems = [
  { to: "/dashboard/schedule", icon: <CalendarDays className="w-4 h-4" />, label: "Schedule" },
  { to: "/dashboard/requirement", icon: <ClipboardList className="w-4 h-4" />, label: "Requirement" },
];

const preparationMenuItems = [
  { to: "/dashboard/day-requirements", icon: <ListChecks className="w-4 h-4" />, label: "Day Requirements" },
  { to: "/dashboard/material-receipt", icon: <Package className="w-4 h-4" />, label: "Material Receipt" },
  { to: "/dashboard/packing", icon: <PackageCheck className="w-4 h-4" />, label: "Packing" },
];

const DashboardSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if any master submenu is active
  const isMasterActive = masterMenuItems.some(item => location.pathname === item.to);
  const [isMasterOpen, setIsMasterOpen] = useState(isMasterActive);
  
  // Check if any delivery plan submenu is active
  const isDeliveryPlanActive = deliveryPlanMenuItems.some(item => location.pathname === item.to);
  const [isDeliveryPlanOpen, setIsDeliveryPlanOpen] = useState(isDeliveryPlanActive);
  
  // Check if any preparation submenu is active
  const isPreparationActive = preparationMenuItems.some(item => location.pathname === item.to);
  const [isPreparationOpen, setIsPreparationOpen] = useState(isPreparationActive);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col shadow-xl z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">FPDA</h1>
            <p className="text-xs text-sidebar-foreground/60">Master Data</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard Link */}
        <NavItem 
          to="/dashboard" 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Dashboard" 
        />
        
        {/* Master Menu with Submenu */}
        <Collapsible open={isMasterOpen} onOpenChange={setIsMasterOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "sidebar-item w-full justify-between",
                isMasterActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5" />
                <span className="font-medium">Master</span>
              </div>
              <ChevronDown 
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isMasterOpen && "rotate-180"
                )} 
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {masterMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "sidebar-item text-sm py-2",
                    isActive && "sidebar-item-active"
                  )
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Delivery Plan Menu with Submenu */}
        <Collapsible open={isDeliveryPlanOpen} onOpenChange={setIsDeliveryPlanOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "sidebar-item w-full justify-between",
                isDeliveryPlanActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Delivery Plan</span>
              </div>
              <ChevronDown 
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isDeliveryPlanOpen && "rotate-180"
                )} 
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {deliveryPlanMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "sidebar-item text-sm py-2",
                    isActive && "sidebar-item-active"
                  )
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Preparation Menu with Submenu */}
        <Collapsible open={isPreparationOpen} onOpenChange={setIsPreparationOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "sidebar-item w-full justify-between",
                isPreparationActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <PrepIcon className="w-5 h-5" />
                <span className="font-medium">Preparation</span>
              </div>
              <ChevronDown 
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isPreparationOpen && "rotate-180"
                )} 
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {preparationMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "sidebar-item text-sm py-2",
                    isActive && "sidebar-item-active"
                  )
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center">
            <User className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_name || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {user?.role_selection || "Guest"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
