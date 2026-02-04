import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const menuItems = [
  { to: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { to: "/dashboard/location", icon: <MapPin className="w-5 h-5" />, label: "Location" },
  { to: "/dashboard/item-category", icon: <Tag className="w-5 h-5" />, label: "Item Category" },
  { to: "/dashboard/unit", icon: <Ruler className="w-5 h-5" />, label: "Unit" },
  { to: "/dashboard/item", icon: <Package className="w-5 h-5" />, label: "Item" },
  { to: "/dashboard/supplier", icon: <Truck className="w-5 h-5" />, label: "Supplier" },
  { to: "/dashboard/recipe-type", icon: <BookOpen className="w-5 h-5" />, label: "Recipe Type" },
  { to: "/dashboard/recipe", icon: <UtensilsCrossed className="w-5 h-5" />, label: "Recipe" },
];

const DashboardSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        {menuItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
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
