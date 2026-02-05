const API_BASE_URL = "https://ngrchatbot.whindia.in/fpda";

export interface ApiResponse {
  status: string;
  message: string;
  data?: any;
}

export interface UserSession {
  user_name: string;
  user_code: string;
  role_selection: string;
}

// Helper to create form data from object
const createFormData = (data: Record<string, string>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

// Generic POST request with form data
const postFormData = async (endpoint: string, data: Record<string, string>): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: createFormData(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Generic GET request
const getData = async (endpoint: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Auth endpoints
export const authApi = {
  register: (data: {
    user_name: string;
    user_code: string;
    user_pwd: string;
    role_selection: string;
  }) => postFormData("/users/", data),

  login: (data: { user_name: string; user_pwd: string }) =>
    postFormData("/user_login/", data),
};

// Master Location endpoints
export const locationApi = {
  create: (data: {
    masjid_name: string;
    address: string;
    city: string;
    created_by: string;
  }) => postFormData("/masterlocation/", data),
  
  getAll: () => getData("/get_masterlocation/"),
};

// Item Category endpoints
export const itemCategoryApi = {
  create: (data: {
    cat_name: string;
    created_by: string;
  }) => postFormData("/masteritemcategory/", data),
  
  getAll: () => getData("/get_masteritemcategory/"),
};

// Unit endpoints
export const unitApi = {
  create: (data: {
    unit_name: string;
    unit_short: string;
    created_by: string;
  }) => postFormData("/masterunit/", data),
  
  getAll: () => getData("/get_masterunit/"),
};

// Item endpoints
export const itemApi = {
  create: (data: {
    item_name: string;
    cat_name: string;
    unit_short: string;
    created_by: string;
  }) => postFormData("/masteritem/", data),
  
  getAll: () => getData("/get_masteritem/"),
};

// Supplier endpoints
export const supplierApi = {
  create: (data: {
    sup_name: string;
    sup_add: string;
    sup_city: string;
    sup_mobile: string;
    created_by: string;
  }) => postFormData("/mastersupplier/", data),
  
  getAll: () => getData("/get_mastersupplier/"),
};

// Recipe Type endpoints
export const recipeTypeApi = {
  create: (data: {
    recipe_type: string;
    created_by: string;
  }) => postFormData("/masterrecipttype/", data),
  
  getAll: () => getData("/get_masterrecipttype/"),
};

// Category and Unit combined endpoint
export const categoryUnitApi = {
  getAll: () => getData("/get_mastercatunit/"),
};

// Recipe endpoints
export const recipeApi = {
  create: (data: {
    recipe_type: string;
    recipe_code: string;
    item_name: string;
    item_code: string;
    cat_name: string;
    cat_code: string;
    unit_short: string;
    req_qty: string;
    created_by: string;
  }) => postFormData("/masterrecipe/", data),
  
  getAll: () => getData("/get_masterrecipe/"),
};

// Item with codes endpoint (for Recipe form)
export const itemSendApi = {
  getAll: () => getData("/get_master_item/"),
};

// Item details endpoint (for Recipe form - gets cat_code, unit_short)
export const itemDetailsApi = {
  getAll: () => getData("/get_masteritem/"),
};

// Delivery Plan Schedule endpoints
export const deliveryScheduleApi = {
  create: (data: {
    schd_date: string;
    recipe_type: string;
    recipe_code: string;
    created_by: string;
  }) => postFormData("/Deliveryplanschedule/", data),
  
  getAll: () => getData("/get_Deliveryplanschedule/"),
};

// Delivery Plan Requirement endpoints
export const deliveryRequirementApi = {
  create: (data: {
    req_date: string;
    masjid_name: string;
    masjid_code: string;
    req_qty: string;
    created_by: string;
  }) => postFormData("/Deliveryplanrequirement/", data),
  
  getAll: () => getData("/get_Deliveryplanrequirement/"),
};

// Masjid list endpoint (for Requirement form)
export const masjidListApi = {
  getAll: () => getData("/get_masjid_list/"),
};

// Recipe type with codes endpoint (for Schedule form)
export const recipeTypeListApi = {
  getAll: () => getData("/get_master_recipttype/"),
};
