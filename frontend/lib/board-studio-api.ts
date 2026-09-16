import { API_URL, clearAuth } from "@/lib/api";

export type BoardSlotDefinition = {
  id: string;
  label: string;
  default_text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font?: string;
  font_size?: number;
  color?: string;
  glow_color?: string;
  dot_pitch?: number; // 0 for solid text, 3-6 for LED dot matrix
  matrix_mode?: boolean;
};

export type BoardFixedGraphic = {
  type: "border" | "separator" | "rivets" | "logo";
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  color?: string;
  border_width?: number;
};

export type BoardTemplate = {
  id: string;
  name: string;
  category: "LED_MATRIX" | "ACRYLIC_METAL" | "LOCO_HEADCODE" | string;
  description: string;
  base_width: number;
  base_height: number;
  background_image?: string | null;
  background_image_url?: string;
  is_paid: boolean;
  price: string;
  published: boolean;
  fields: BoardSlotDefinition[];
  fixed_graphics: BoardFixedGraphic[];
  can_customize: boolean;
  is_unlocked: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserCustomBoard = {
  id: number;
  template: string;
  template_details?: BoardTemplate;
  title: string;
  custom_field_values: Record<string, any>;
  preview_image_url?: string;
  saved_at: string;
  created_at: string;
};

function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || "";
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponseJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 401) {
      clearAuth();
      throw new Error("Please log in again to continue.");
    }
    if (res.status === 404) {
      throw new Error("Requested board template was not found on the server.");
    }
    throw new Error(fallbackError || `Server returned error (${res.status}).`);
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      throw new Error("Please log in again to continue.");
    }
    throw new Error(data.detail || data.non_field_errors?.[0] || fallbackError);
  }
  return data;
}

export async function getBoardTemplates(): Promise<BoardTemplate[]> {
  const res = await fetch(`${API_URL}/board-templates/`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) return [];
    const errText = await res.text().catch(() => "");
    console.warn("Failed to load railway board templates:", res.status, errText);
    return [];
  }
  const data = await parseResponseJson<any>(res, "Failed to load railway board templates.");
  return Array.isArray(data) ? data : data.results || [];
}

export async function getBoardTemplate(id: string): Promise<BoardTemplate> {
  const res = await fetch(`${API_URL}/board-templates/${id}/`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  return parseResponseJson<BoardTemplate>(res, `Board template '${id}' not found.`);
}

export async function getUserCustomBoards(): Promise<UserCustomBoard[]> {
  const token = getAccessToken();
  if (!token) return [];
  const res = await fetch(`${API_URL}/custom-boards/`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      return [];
    }
    return [];
  }
  const data = await parseResponseJson<any>(res, "Failed to load your saved boards.");
  return Array.isArray(data) ? data : data.results || [];
}

export async function saveUserCustomBoard(payload: {
  id?: number;
  template?: string;
  template_id?: string;
  title: string;
  custom_field_values: Record<string, any>;
  preview_image_url?: string;
  preview_image?: string;
}): Promise<UserCustomBoard> {
  const isUpdate = Boolean(payload.id);
  const url = isUpdate ? `${API_URL}/custom-boards/${payload.id}/` : `${API_URL}/custom-boards/`;
  const method = isUpdate ? "PATCH" : "POST";
  const body = {
    ...payload,
    template: payload.template || payload.template_id,
  };

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  return parseResponseJson<UserCustomBoard>(res, "Failed to save customized board.");
}

export async function deleteUserCustomBoard(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/custom-boards/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to delete saved board.");
  }
}

export async function createBoardOrder(templateId: string, customerPhone?: string): Promise<any> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Please log in to purchase or customize this board template.");
  }
  const phone = customerPhone || (typeof window !== "undefined" ? localStorage.getItem("gjs_customer_phone") || undefined : undefined);
  const payload: Record<string, any> = { board_template_id: templateId };
  if (phone) payload.customer_phone = phone;
  const res = await fetch(`${API_URL}/create-order/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponseJson(res, "Could not initiate checkout for this board template.");
}

export async function adminSaveBoardTemplate(template: Partial<BoardTemplate>): Promise<BoardTemplate> {
  const isUpdate = Boolean(template.id);
  // Check if template exists to decide POST or PATCH
  let method = "POST";
  let url = `${API_URL}/board-templates/`;

  if (isUpdate) {
    method = "PUT";
    url = `${API_URL}/board-templates/${template.id}/`;
  }

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(template),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

export async function adminDeleteBoardTemplate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/board-templates/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to delete board template.");
  }
}

