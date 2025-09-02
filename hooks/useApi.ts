import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { LibraryItem, Character } from '../types';

export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getLibraryItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newItem = await apiService.createLibraryItem(item);
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar item');
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<LibraryItem>) => {
    try {
      const updatedItem = await apiService.updateLibraryItem(id, updates);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await apiService.deleteLibraryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar item');
      throw err;
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
}

export function useAkin() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacter = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAkin();
      setCharacter(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const updateCharacter = async (updates: Partial<Character>) => {
    try {
      const updatedCharacter = await apiService.updateAkin(updates);
      setCharacter(updatedCharacter);
      return updatedCharacter;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar personagem');
      throw err;
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, []);

  return {
    character,
    loading,
    error,
    updateCharacter,
    refetch: fetchCharacter,
  };
}

