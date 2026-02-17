// Permission types and route mapping for role-based access control

export interface UserPermission {
  module_id: string;
  mod_name: number | string;
  sub_mod_name: number | string | null;
  sub_mod_id: string;
  user_code: number | string;
}

// Maps module_id + sub_mod_id from API to sidebar routes
const permissionRouteMap: Record<string, string> = {
  // Master
  "master:location": "/dashboard/location",
  "master:item_category": "/dashboard/item-category",
  "master:unit": "/dashboard/unit",
  "master:item": "/dashboard/item",
  "master:supplier": "/dashboard/supplier",
  "master:recipe_type": "/dashboard/recipe-type",
  "master:recipe_for_a_kg": "/dashboard/recipe",
  // Delivery Plan
  "delivery_plan:schedule": "/dashboard/schedule",
  "delivery_plan:requirement": "/dashboard/requirement",
  // Preparation
  "preparation:day_requirements": "/dashboard/day-requirements",
  "preparation:material_receipt": "/dashboard/material-receipt",
  "preparation:request_for_supplier": "/dashboard/request-supplier",
  // Packing (standalone)
  "packing:": "/dashboard/packing",
  "packing:packing": "/dashboard/packing",
  // Cooking (standalone)
  "cooking:": "/dashboard/cooking",
  "cooking:cooking": "/dashboard/cooking",
  // Cleaning
  "cleaning:material": "/dashboard/cleaning/material",
  "cleaning:vessel": "/dashboard/cleaning/vessel",
  "cleaning:preparation_area": "/dashboard/cleaning/prep",
  "cleaning:packing_area": "/dashboard/cleaning/pack",
  // Distribution
  "distribution:food_allocation": "/dashboard/food-allocation",
  "distribution:delivery": "/dashboard/delivery",
  // View Media (standalone)
  "view_media:": "/dashboard/view-media",
  "view_media:view_media": "/dashboard/view-media",
  // Settings
  "settings:module_master": "/dashboard/settings/module-master",
  "settings:user_rights": "/dashboard/settings/user-rights",
};

/**
 * Build a Set of allowed routes from the API permissions array.
 * Always includes /dashboard (home).
 */
export function buildAllowedRoutes(permissions: UserPermission[]): Set<string> {
  const routes = new Set<string>(["/dashboard"]);

  for (const p of permissions) {
    const moduleKey = String(p.module_id).toLowerCase();
    const subKey = String(p.sub_mod_id || "").toLowerCase();
    const compositeKey = `${moduleKey}:${subKey}`;

    const route = permissionRouteMap[compositeKey];
    if (route) routes.add(route);
  }

  return routes;
}

/**
 * Check if a given path is allowed by the user's permissions.
 */
export function isRouteAllowed(path: string, allowedRoutes: Set<string>): boolean {
  if (path === "/dashboard") return true;
  return allowedRoutes.has(path);
}
