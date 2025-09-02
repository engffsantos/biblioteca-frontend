
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Database, Character, VirtueFlaw, Ability } from '../types';
import { initialData } from '../data/initialData';
import Badge from '../components/Badge';

// --- Reusable Components ---

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  min?: number;
}> = ({ label, name, value, onChange, type = 'number', min = 0 }) => (
    <div className="flex flex-col">
        <label htmlFor={name} className="text-sm font-medium text-gray-400 mb-1 print:text-black">{label}</label>
        <input id={name} name={name} type={type} min={min} value={value} onChange={onChange} className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-accent print:bg-transparent print:border-none print:p-0 print:text-black" />
    </div>
);

// --- Main Page Component ---

const AkinPage: React.FC = () => {
    const [db, setDb] = useLocalStorage<Database>('ars-magica-db', initialData);
    const [akin, setAkin] = useState<Character>(db.akin);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Editing States
    const [editingArt, setEditingArt] = useState<{key: string | null, value: number}>({key: null, value: 0});
    const [editingAbility, setEditingAbility] = useState<Ability | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{type: 'virtue' | 'flaw', item: VirtueFlaw | null}>({type: 'virtue', item: null});
    
    // Sync local state with localStorage on db change
    useEffect(() => {
        setAkin(db.akin);
    }, [db.akin]);
    
    // --- Handlers ---
    
    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const keys = name.split('.');
        setAkin(prev => {
            const newAkin = JSON.parse(JSON.stringify(prev));
            let current: any = newAkin;
            for(let i = 0; i < keys.length - 1; i++) { current = current[keys[i]]; }
            current[keys[keys.length - 1]] = type === 'number' ? Number(value) : value;
            return newAkin;
        });
    };

    // Arts
    const handleArtChange = (artKey: keyof Character['arts'], value: number) => {
        setAkin(prev => ({...prev, arts: {...prev.arts, [artKey]: value}}));
    };

    // Abilities
    const handleAddAbility = () => {
        const newAbility: Ability = { id: Date.now().toString(), name: 'Nova Habilidade', value: 0, specialty: '' };
        setAkin(prev => ({...prev, abilities: [...prev.abilities, newAbility]}));
        setEditingAbility(newAbility);
    };

    const handleUpdateAbility = () => {
        if (!editingAbility) return;
        setAkin(prev => ({
            ...prev,
            abilities: prev.abilities.map(a => a.id === editingAbility.id ? editingAbility : a),
        }));
        setEditingAbility(null);
    };
    
    const handleDeleteAbility = (id: string) => {
        setAkin(prev => ({ ...prev, abilities: prev.abilities.filter(a => a.id !== id) }));
    };

    // Virtues & Flaws Modal
    const openModal = (type: 'virtue' | 'flaw', item: VirtueFlaw | null = null) => {
        setModalData({ type, item: item || { id: '', name: '', description: '', isMajor: false, page: 0 } });
        setIsModalOpen(true);
    };

    const handleSaveVirtueFlaw = (itemToSave: VirtueFlaw) => {
        const type = modalData.type;
        if (itemToSave.id) { // Editing existing
            setAkin(prev => ({ ...prev, [type]: prev[type].map(v => v.id === itemToSave.id ? itemToSave : v) }));
        } else { // Adding new
            const newItem = { ...itemToSave, id: Date.now().toString() };
            setAkin(prev => ({ ...prev, [type]: [...prev[type], newItem] }));
        }
        setIsModalOpen(false);
    };

    const handleDeleteVirtueFlaw = (type: 'virtue' | 'flaw', id: string) => {
        setAkin(prev => ({ ...prev, [type]: prev[type].filter(v => v.id !== id) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        setDb(prevDb => ({ ...prevDb, akin }));
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };
    
    const renderAbility = (ability: Ability) => {
        if (editingAbility?.id === ability.id) {
            return (
                 <div key={ability.id} className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-gray-700 p-2 rounded-md w-full print:bg-transparent print:p-0 print:gap-4">
                    <input type="text" placeholder="Nome" value={editingAbility.name} onChange={e => setEditingAbility(p => p && ({...p, name: e.target.value}))} className="w-full sm:w-1/3 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"/>
                    <input type="text" placeholder="Especialidade" value={editingAbility.specialty} onChange={e => setEditingAbility(p => p && ({...p, specialty: e.target.value}))} className="w-full sm:w-1/3 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"/>
                    <input type="number" value={editingAbility.value} onChange={e => setEditingAbility(p => p && ({...p, value: Number(e.target.value)}))} className="w-20 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"/>
                    <div className="flex gap-2 print:hidden">
                        <button type="button" onClick={handleUpdateAbility} className="text-green-accent hover:text-green-400">Salvar</button>
                        <button type="button" onClick={() => setEditingAbility(null)} className="text-gray-400 hover:text-white">Cancelar</button>
                    </div>
                </div>
            )
        }
        return (
             <div key={ability.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md group print:bg-transparent print:p-0">
                <span className="text-white print:text-black">{ability.name} {ability.specialty && `(${ability.specialty})`}</span>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-purple-accent print:text-black">{ability.value}</span>
                    <button type="button" onClick={() => setEditingAbility({...ability})} className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleDeleteAbility(ability.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        )
    }

    // --- Render ---
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white print:text-black">Ficha de Personagem: {akin.name}</h1>
                </div>

                <div className="bg-gray-900 p-6 rounded-lg shadow-lg space-y-8 print:bg-white print:shadow-none print:p-0">
                    {/* Identidade & Características */}
                    <section><h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Identidade</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><InputField label="Nome" name="name" value={akin.name} onChange={handleSimpleChange} type="text" /><InputField label="Casa" name="house" value={akin.house} onChange={handleSimpleChange} type="text" /><InputField label="Idade" name="age" value={akin.age} onChange={handleSimpleChange} /></div></section>
                    <section><h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Características</h2><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">{Object.entries(akin.characteristics).map(([key, value]) => (<InputField key={key} label={key.toUpperCase()} name={`characteristics.${key}`} value={value} onChange={handleSimpleChange} />))}</div></section>
                    
                    {/* Artes Herméticas */}
                    <section>
                        <h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Artes Herméticas</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                             <div><h3 className="text-lg font-medium text-gray-300 mb-3 print:text-black">Técnicas</h3><div className="space-y-3">{(['creo', 'intellego', 'muto', 'perdo', 'rego'] as const).map(key => (<div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md print:bg-transparent print:p-0">{editingArt.key === key ? <><input type="number" value={editingArt.value} onChange={(e) => setEditingArt(p => ({...p, value: Number(e.target.value)}))} className="w-16 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white print:bg-transparent print:border-none print:text-black" autoFocus/><button type="button" onClick={() => { handleArtChange(key, editingArt.value); setEditingArt({key: null, value: 0})}} className="text-green-accent hover:text-green-400 print:hidden">Salvar</button></> : <><span className="font-medium text-white capitalize print:text-black">{key}</span><div className="flex items-center gap-3"><span className="font-bold text-lg text-purple-accent print:text-black">{akin.arts[key]}</span><button type="button" onClick={() => setEditingArt({key, value: akin.arts[key]})} className="text-gray-400 hover:text-white print:hidden"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button></div></>}</div>))}</div></div>
                             <div className="lg:col-span-2"><h3 className="text-lg font-medium text-gray-300 mb-3 print:text-black">Formas</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(['animal', 'aquam', 'auram', 'corpus', 'herbam', 'ignem', 'imaginem', 'mentem', 'terram', 'vim'] as const).map(key => (<div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md print:bg-transparent print:p-0">{editingArt.key === key ? <><input type="number" value={editingArt.value} onChange={(e) => setEditingArt(p => ({...p, value: Number(e.target.value)}))} className="w-16 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white print:bg-transparent print:border-none print:text-black" autoFocus/><button type="button" onClick={() => { handleArtChange(key, editingArt.value); setEditingArt({key: null, value: 0})}} className="text-green-accent hover:text-green-400 print:hidden">Salvar</button></> : <><span className="font-medium text-white capitalize print:text-black">{key}</span><div className="flex items-center gap-3"><span className="font-bold text-lg text-purple-accent print:text-black">{akin.arts[key]}</span><button type="button" onClick={() => setEditingArt({key, value: akin.arts[key]})} className="text-gray-400 hover:text-white print:hidden"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button></div></>}</div>))}</div></div>
                        </div>
                    </section>

                    {/* Habilidades */}
                    <section><h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Habilidades</h2><div className="space-y-2">{akin.abilities.map(renderAbility)}</div><button type="button" onClick={handleAddAbility} className="mt-4 text-sm bg-gray-700 hover:bg-gray-600 text-purple-accent font-semibold py-2 px-4 rounded-lg transition-colors print:hidden">+ Adicionar Habilidade</button></section>

                    {/* Virtudes e Defeitos */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 print:break-inside-avoid">
                        <div><div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 print:border-black"><h2 className="text-xl font-semibold text-purple-accent print:text-black">Virtudes</h2><button type="button" onClick={() => openModal('virtue')} className="text-sm bg-gray-700 hover:bg-gray-600 text-green-accent font-semibold py-1 px-3 rounded-lg print:hidden">+ Adicionar</button></div><div className="space-y-4">{akin.virtues.map(v => (<div key={v.id} className="bg-gray-800/50 p-4 rounded-lg group print:bg-transparent print:p-0 print:pb-2 print:border-b print:border-gray-300 print:rounded-none"><div className="flex justify-between items-start"><h3 className="font-bold text-white pr-2 print:text-black">{v.name}</h3><Badge text={v.isMajor ? 'Grande' : 'Menor'} color={v.isMajor ? 'orange' : 'blue'}/></div><p className="text-sm text-gray-400 my-2 print:text-black">{v.description}</p><div className="flex justify-between items-center text-xs text-gray-500 print:text-gray-600"><span>Pág. {v.page || 'N/A'}</span><div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"><button type="button" onClick={() => openModal('virtue', v)} className="hover:text-white">Editar</button><button type="button" onClick={() => handleDeleteVirtueFlaw('virtue', v.id)} className="hover:text-red-400">Excluir</button></div></div></div>))}</div></div>
                        <div><div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 print:border-black"><h2 className="text-xl font-semibold text-purple-accent print:text-black">Defeitos</h2><button type="button" onClick={() => openModal('flaw')} className="text-sm bg-gray-700 hover:bg-gray-600 text-red-accent font-semibold py-1 px-3 rounded-lg print:hidden">+ Adicionar</button></div><div className="space-y-4">{akin.flaws.map(f => (<div key={f.id} className="bg-gray-800/50 p-4 rounded-lg group print:bg-transparent print:p-0 print:pb-2 print:border-b print:border-gray-300 print:rounded-none"><div className="flex justify-between items-start"><h3 className="font-bold text-white pr-2 print:text-black">{f.name}</h3><Badge text={f.isMajor ? 'Grande' : 'Menor'} color={f.isMajor ? 'red' : 'blue'}/></div><p className="text-sm text-gray-400 my-2 print:text-black">{f.description}</p><div className="flex justify-between items-center text-xs text-gray-500 print:text-gray-600"><span>Pág. {f.page || 'N/A'}</span><div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"><button type="button" onClick={() => openModal('flaw', f)} className="hover:text-white">Editar</button><button type="button" onClick={() => handleDeleteVirtueFlaw('flaw', f.id)} className="hover:text-red-400">Excluir</button></div></div></div>))}</div></div>
                    </section>
                </div>

                <div className="flex justify-end pt-4 gap-4 print:hidden">
                    <button type="button" onClick={() => window.print()} className="bg-blue-accent text-gray-950 font-bold py-2 px-6 rounded-lg hover:bg-blue-accent/80 transition-all duration-300 text-center shadow-lg flex items-center justify-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        Imprimir Ficha
                    </button>
                    <button type="submit" className="bg-purple-accent text-gray-950 font-bold py-2 px-6 rounded-lg hover:bg-purple-accent/80 transition-all duration-300 w-48 text-center shadow-lg" disabled={saveStatus === 'saving'}>{saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo!' : 'Salvar Ficha'}</button>
                </div>
            </form>
            
            {/* Modal for Virtues/Flaws */}
            {isModalOpen && <VirtueFlawModal data={modalData} onClose={() => setIsModalOpen(false)} onSave={handleSaveVirtueFlaw} />}
        </div>
    );
};


// --- Modal Component ---

const VirtueFlawModal: React.FC<{
    data: { type: 'virtue' | 'flaw', item: VirtueFlaw | null },
    onClose: () => void,
    onSave: (item: VirtueFlaw) => void
}> = ({ data, onClose, onSave }) => {
    const [formData, setFormData] = useState<VirtueFlaw>(data.item || { id: '', name: '', description: '', page: 0, isMajor: false });

    useEffect(() => {
        setFormData(data.item || { id: '', name: '', description: '', page: 0, isMajor: false });
    }, [data.item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const title = `${formData.id ? 'Editar' : 'Adicionar'} ${data.type === 'virtue' ? 'Virtude' : 'Defeito'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full shadow-2xl border border-gray-700">
                <h3 id="modal-title" className="text-lg font-bold text-white mb-6">{title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label htmlFor="name" className="text-sm font-medium text-gray-400 block mb-1">Nome</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white" required /></div>
                    <div><label htmlFor="description" className="text-sm font-medium text-gray-400 block mb-1">Descrição</label><textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white" /></div>
                    <div className="flex gap-4">
                        <div className="flex-grow"><label htmlFor="page" className="text-sm font-medium text-gray-400 block mb-1">Página</label><input type="number" name="page" id="page" value={formData.page} onChange={handleChange} className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white" /></div>
                        <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-white cursor-pointer"><input type="checkbox" name="isMajor" checked={formData.isMajor} onChange={handleChange} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-accent focus:ring-purple-accent" /> É uma qualidade Grande?</label></div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">Cancelar</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-purple-accent hover:bg-purple-accent/80 text-white font-semibold transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AkinPage;