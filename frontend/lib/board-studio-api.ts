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
  custom_field_values: Record<string, string>;
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

export async function getBoardTemplates(): Promise<BoardTemplate[]> {
  const res = await fetch(`${API_URL}/board-templates/`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load railway board templates.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function getBoardTemplate(id: string): Promise<BoardTemplate> {
  const res = await fetch(`${API_URL}/board-templates/${id}/`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Board template '${id}' not found.`);
  }
  return res.json();
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
    throw new Error("Failed to load your saved boards.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function saveUserCustomBoard(payload: {
  id?: number;
  template: string;
  title: string;
  custom_field_values: Record<string, string>;
  preview_image_url?: string;
}): Promise<UserCustomBoard> {
  const isUpdate = Boolean(payload.id);
  const url = isUpdate ? `${API_URL}/custom-boards/${payload.id}/` : `${API_URL}/custom-boards/`;
  const method = isUpdate ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to save customized board.");
  }
  return data;
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

export async function createBoardOrder(templateId: string): Promise<any> {
  const res = await fetch(`${API_URL}/create-order/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ board_template_id: templateId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Could not initiate checkout for this board template.");
  }
  return data;
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

