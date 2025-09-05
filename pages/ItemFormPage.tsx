// src/pages/ItemFormPage.tsx
// Formulário de criação/edição. >>> Correção crucial:
// - Não interromper o render em modo "novo" (sem id). O hook ainda é chamado,
//   mas só mostramos loading/erro quando realmente estamos editando.

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibrary, useLibraryItem } from '../hooks/useApi';
import { ItemType, LabTextCategory, type LibraryItem, type Summae, type Tractatus, type LabText } from '../types';

const ItemFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    // >>> Passa o id (string | undefined). O hook não deve "errar" sem id.
    const { item, loading: loadingItem, error: errorItem } = useLibraryItem(id as string | undefined);

    const { addItem, updateItem } = useLibrary();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        type: ItemType.Tractatus,
        title: '',
        author: '',
        language: 'Latim',
        notes: '',
        subject: '',
        quality: 5,
        level: 5,
        category: LabTextCategory.Magia,
        effect: '',
        labTotal: 10,
    } as Partial<LibraryItem>);

    useEffect(() => {
        if (isEditing && item) setFormData(item as Partial<LibraryItem>);
    }, [isEditing, item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numeric = name === 'level' || name === 'quality' || name === 'labTotal';
        setFormData(prev => ({ ...(prev as any), [name]: numeric ? Number(value) : value }) as Partial<LibraryItem>);
    };

    const getCleanData = (): Partial<LibraryItem> => {
        const common = {
            type: formData.type,
            title: formData.title,
            author: formData.author,
            language: formData.language,
            notes: formData.notes,
        };
        switch (formData.type) {
            case ItemType.Summae:
                return { ...common, subject: formData.subject, level: formData.level, quality: formData.quality } as Partial<Summae>;
            case ItemType.Tractatus:
                return { ...common, subject: formData.subject, quality: formData.quality } as Partial<Tractatus>;
            case ItemType.LabText:
                return { ...common, category: formData.category, effect: formData.effect, level: formData.level, labTotal: formData.labTotal } as Partial<LabText>;
            default:
                return common as Partial<LibraryItem>;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) { alert('O título é obrigatório.'); return; }
        const payload = getCleanData();

        if (isEditing && id) {
            await updateItem(id, payload);   // PUT /api/library/:id
        } else {
            await addItem(payload);          // POST /api/library
        }
        navigate('/library');
    };

    const formGroupClass = "flex flex-col gap-2";
    const labelClass = "text-sm font-medium text-gray-300";
    const inputClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent";

    // >>> Só bloqueia a tela se for EDIÇÃO e ainda estiver carregando/erro.
    if (isEditing && loadingItem) return <div className="p-6 text-white">Carregando...</div>;
    if (isEditing && errorItem)   return <div className="p-6 text-red-400">Erro: {errorItem}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-white mb-6">{isEditing ? 'Editar Item' : 'Adicionar Novo Item'}</h1>
            <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={formGroupClass}>
                        <label htmlFor="title" className={labelClass}>Título</label>
                        <input id="title" name="title" value={formData.title || ''} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div className={formGroupClass}>
                        <label htmlFor="author" className={labelClass}>Autor</label>
                        <input id="author" name="author" value={formData.author || ''} onChange={handleChange} className={inputClass} />
                    </div>
                    <div className={formGroupClass}>
                        <label htmlFor="type" className={labelClass}>Tipo de Item</label>
                        <select id="type" name="type" value={formData.type || ItemType.Tractatus} onChange={handleChange} className={inputClass}>
                            {Object.values(ItemType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="border-t border-gray-700 my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {formData.type === ItemType.Summae && (
                        <>
                            <div className={formGroupClass}><label className={labelClass}>Assunto</label><input name="subject" value={formData.subject || ''} onChange={handleChange} className={inputClass} /></div>
                            <div className={formGroupClass}><label className={labelClass}>Nível</label><input type="number" name="level" value={formData.level ?? 0} onChange={handleChange} className={inputClass} /></div>
                            <div className={formGroupClass}><label className={labelClass}>Qualidade</label><input type="number" name="quality" value={formData.quality ?? 0} onChange={handleChange} className={inputClass} /></div>
                        </>
                    )}

                    {formData.type === ItemType.Tractatus && (
                        <>
                            <div className={formGroupClass}><label className={labelClass}>Assunto</label><input name="subject" value={formData.subject || ''} onChange={handleChange} className={inputClass} /></div>
                            <div className={formGroupClass}><label className={labelClass}>Qualidade</label><input type="number" name="quality" value={formData.quality ?? 0} onChange={handleChange} className={inputClass} /></div>
                        </>
                    )}

                    {formData.type === ItemType.LabText && (
                        <>
                            <div className={formGroupClass}>
                                <label className={labelClass}>Categoria</label>
                                <select name="category" value={formData.category || LabTextCategory.Magia} onChange={handleChange} className={inputClass}>
                                    {Object.values(LabTextCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className={formGroupClass}><label className={labelClass}>Efeito</label><input name="effect" value={formData.effect || ''} onChange={handleChange} className={inputClass} /></div>
                            <div className={formGroupClass}><label className={labelClass}>Nível</label><input type="number" name="level" value={formData.level ?? 0} onChange={handleChange} className={inputClass} /></div>
                            <div className={formGroupClass}><label className={labelClass}>Total de Laboratório</label><input type="number" name="labTotal" value={formData.labTotal ?? 0} onChange={handleChange} className={inputClass} /></div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={formGroupClass}><label className={labelClass}>Idioma</label><input name="language" value={formData.language || ''} onChange={handleChange} className={inputClass} /></div>
                    <div className={formGroupClass}><label className={labelClass}>Notas</label><textarea name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className={inputClass} /></div>
                </div>

                <div className="flex gap-3">
                    <button type="submit" className="bg-purple-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-purple-accent/80 transition-colors">
                        {isEditing ? 'Salvar alterações' : 'Adicionar'}
                    </button>
                    <button type="button" onClick={() => navigate('/library')} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ItemFormPage;
