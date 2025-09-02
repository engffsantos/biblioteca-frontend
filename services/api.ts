import { LibraryItem, Character } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Para DELETE requests que retornam 204, não tentar fazer parse do JSON
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Library endpoints
  async getLibraryItems(): Promise<LibraryItem[]> {
    return this.request<LibraryItem[]>('/library');
  }

  async getLibraryItem(id: string): Promise<LibraryItem> {
    return this.request<LibraryItem>(`/library/${id}`);
  }

  async createLibraryItem(item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<LibraryItem> {
    return this.request<LibraryItem>('/library', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateLibraryItem(id: string, item: Partial<LibraryItem>): Promise<LibraryItem> {
    return this.request<LibraryItem>(`/library/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteLibraryItem(id: string): Promise<void> {
    return this.request<void>(`/library/${id}`, {
      method: 'DELETE',
    });
  }

  // Akin endpoints
  async getAkin(): Promise<Character> {
    return this.request<Character>('/akin');
  }

  async updateAkin(character: Partial<Character>): Promise<Character> {
    return this.request<Character>('/akin', {
      method: 'PUT',
      body: JSON.stringify(character),
    });
  }

  async createAbility(ability: { name: string; value: number; specialty?: string }) {
    return this.request('/akin/abilities', {
      method: 'POST',
      body: JSON.stringify(ability),
    });
  }

  async updateAbility(id: string, ability: { name: string; value: number; specialty?: string }) {
    return this.request(`/akin/abilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ability),
    });
  }

  async deleteAbility(id: string): Promise<void> {
    return this.request<void>(`/akin/abilities/${id}`, {
      method: 'DELETE',
    });
  }

  async createVirtue(virtue: { name: string; description: string; isMajor: boolean; page?: number }) {
    return this.request('/akin/virtues', {
      method: 'POST',
      body: JSON.stringify(virtue),
    });
  }

  async updateVirtue(id: string, virtue: { name: string; description: string; isMajor: boolean; page?: number }) {
    return this.request(`/akin/virtues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(virtue),
    });
  }

  async deleteVirtue(id: string): Promise<void> {
    return this.request<void>(`/akin/virtues/${id}`, {
      method: 'DELETE',
    });
  }

  async createFlaw(flaw: { name: string; description: string; isMajor: boolean; page?: number }) {
    return this.request('/akin/flaws', {
      method: 'POST',
      body: JSON.stringify(flaw),
    });
  }

  async updateFlaw(id: string, flaw: { name: string; description: string; isMajor: boolean; page?: number }) {
    return this.request(`/akin/flaws/${id}`, {
      method: 'PUT',
      body: JSON.stringify(flaw),
    });
  }

  async deleteFlaw(id: string): Promise<void> {
    return this.request<void>(`/akin/flaws/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

