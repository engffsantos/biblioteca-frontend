import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Database, LibraryItem, ItemType, LabTextCategory, Summae, Tractatus, LabText } from '../types';
import { initialData } from '../data/initialData';

const ItemFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [db, setDb] = useLocalStorage<Database>('ars-magica-db', initialData);
  const isEditing = Boolean(id);

  // FIX: Added a type assertion to the initial state to resolve the TypeScript error.
  // The form state needs to hold all possible fields for different item types,
  // and the assertion bypasses excess property checks for the discriminated union.
  const [formData, setFormData] = useState<Partial<LibraryItem>>({
    type: ItemType.Tractatus,
    title: '',
    author: '',
    language: 'Latim',
    notes: '',
    quality: 5,
    subject: '',
    level: 5,
    category: LabTextCategory.Magia,
    effect: '',
    labTotal: 10,
  } as Partial<LibraryItem>);

  useEffect(() => {
    if (isEditing) {
      const item = db.library.find(i => i.id === id);
      if (item) {
        setFormData(item);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'level' || name === 'quality' || name === 'labTotal' ? parseInt(value) : value }));
  };
  
  // FIX: Refactored handleSubmit to ensure only relevant data for the item type is saved.
  // This prevents persisting extraneous properties and ensures data integrity.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
        alert('O título é obrigatório.');
        return;
    }

    const now = new Date().toISOString();
    
    const getCleanData = (): Partial<LibraryItem> => {
        const commonData = {
            type: formData.type,
            title: formData.title,
            author: formData.author,
            language: formData.language,
            notes: formData.notes,
        };
        switch (formData.type) {
            case ItemType.Summae:
                return {
                    ...commonData,
                    subject: formData.subject,
                    level: formData.level,
                    quality: formData.quality,
                } as Partial<Summae>;
            case ItemType.Tractatus:
                return {
                    ...commonData,
                    subject: formData.subject,
                    quality: formData.quality,
                } as Partial<Tractatus>;
            case ItemType.LabText:
                return {
                    ...commonData,
                    category: formData.category,
                    effect: formData.effect,
                    level: formData.level,
                    labTotal: formData.labTotal,
                } as Partial<LabText>;
            default:
                return commonData;
        }
    }
    
    const cleanData = getCleanData();

    if (isEditing) {
      setDb(prevDb => ({
        ...prevDb,
        library: prevDb.library.map(item => item.id === id ? { ...item, ...cleanData, updatedAt: now } as LibraryItem : item),
      }));
    } else {
      const newItem: LibraryItem = {
        id: Date.now().toString(),
        createdAt: now,
        updatedAt: now,
        ...cleanData,
      } as LibraryItem;
      setDb(prevDb => ({
        ...prevDb,
        library: [...prevDb.library, newItem],
      }));
    }
    navigate('/library');
  };

  const formGroupClass = "flex flex-col gap-2";
  const labelClass = "text-sm font-medium text-gray-300";
  const inputClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent";

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-white mb-6">{isEditing ? 'Editar Item' : 'Adicionar Novo Item'}</h1>
      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={formGroupClass}>
            <label htmlFor="title" className={labelClass}>Título</label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className={inputClass} required />
          </div>
          <div className={formGroupClass}>
            <label htmlFor="author" className={labelClass}>Autor</label>
            <input type="text" id="author" name="author" value={formData.author} onChange={handleChange} className={inputClass} />
          </div>
          <div className={formGroupClass}>
            <label htmlFor="type" className={labelClass}>Tipo de Item</label>
            <select id="type" name="type" value={formData.type} onChange={handleChange} className={inputClass}>
              {Object.values(ItemType).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-700 my-6"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {formData.type === ItemType.Summae && (
            <>
              <div className={formGroupClass}><label htmlFor="subject" className={labelClass}>Assunto</label><input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} className={inputClass} /></div>
              <div className={formGroupClass}><label htmlFor="level" className={labelClass}>Nível</label><input type="number" id="level" name="level" value={formData.level} onChange={handleChange} className={inputClass} /></div>
              <div className={formGroupClass}><label htmlFor="quality" className={labelClass}>Qualidade</label><input type="number" id="quality" name="quality" value={formData.quality} onChange={handleChange} className={inputClass} /></div>
            </>
          )}
          {formData.type === ItemType.Tractatus && (
            <>
              <div className={formGroupClass}><label htmlFor="subject" className={labelClass}>Assunto</label><input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} className={inputClass} /></div>
              <div className={formGroupClass}><label htmlFor="quality" className={labelClass}>Qualidade</label><input type="number" id="quality" name="quality" value={formData.quality} onChange={handleChange} className={inputClass} /></div>
            </>
          )}
          {formData.type === ItemType.LabText && (
            <>
              <div className={formGroupClass}>
                <label htmlFor="category" className={labelClass}>Categoria</label>
                <select id="category" name="category" value={formData.category} onChange={handleChange} className={inputClass}>
                    {Object.values(LabTextCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className={formGroupClass}><label htmlFor="level" className={labelClass}>Nível</label><input type="number" id="level" name="level" value={formData.level} onChange={handleChange} className={inputClass} /></div>
              <div className={formGroupClass}><label htmlFor="labTotal" className={labelClass}>Total de Laboratório</label><input type="number" id="labTotal" name="labTotal" value={formData.labTotal} onChange={handleChange} className={inputClass} /></div>
              <div className={`${formGroupClass} md:col-span-3`}><label htmlFor="effect" className={labelClass}>Efeito</label><input type="text" id="effect" name="effect" value={formData.effect} onChange={handleChange} className={inputClass} /></div>
            </>
          )}
           <div className={formGroupClass}>
            <label htmlFor="language" className={labelClass}>Idioma</label>
            <input type="text" id="language" name="language" value={formData.language} onChange={handleChange} className={inputClass} />
          </div>
        </div>
        
        <div className={formGroupClass}>
            <label htmlFor="notes" className={labelClass}>Notas</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={5} className={inputClass}></textarea>
        </div>

        <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => navigate('/library')} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold">Cancelar</button>
            <button type="submit" className="py-2 px-4 rounded-lg bg-purple-accent hover:bg-purple-accent/80 text-white font-semibold">{isEditing ? 'Salvar Alterações' : 'Adicionar Item'}</button>
        </div>
      </form>
    </div>
  );
};

export default ItemFormPage;