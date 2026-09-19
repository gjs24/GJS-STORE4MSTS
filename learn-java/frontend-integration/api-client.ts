/**
 * Spring Boot 3 API Client for Next.js
 * Automatically handles JWT Bearer tokens and standardized JSON responses
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class ApiClient {
  private tokenKey = "msts_token";

  private getAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem(this.tokenKey);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  public clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.tokenKey);
    }
  }

  public async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
    });

    return this.handleResponse<T>(res);
  }

  public async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(res);
  }

  public async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(res);
  }

  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
    });

    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage = data?.message || data?.error || `HTTP Error: ${res.status}`;
      throw new Error(errorMessage);
    }

    return data as ApiResponse<T>;
  }
}

export const apiClient = new ApiClient();

