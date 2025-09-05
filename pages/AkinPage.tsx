// src/pages/AkinPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { api as apiSvc } from '../services/api';
import Badge from '../components/Badge';

/** =========================
 *  Tipos (compatíveis com backend atual)
 *  ========================= */
type Characteristics = { int: number; per: number; str: number; sta: number; pre: number; com: number; dex: number; qik: number; };
type Arts = {
    creo: number; intellego: number; muto: number; perdo: number; rego: number;
    animal: number; aquam: number; auram: number; corpus: number; herbam: number;
    ignem: number; imaginem: number; mentem: number; terram: number; vim: number;
};
type AkinProfile = {
    id?: string;
    name: string;
    house: string;
    age: number | null;
    characteristics: Characteristics;
    arts: Arts;
    /** Backend guarda TEXT. Aqui usamos JSON stringificado de Spell[] */
    spells: string;
    notes: string;
    created_at?: string;
    updated_at?: string;
} | null;

type Ability = { id: string; name: string; value: number; specialty?: string | null };
type Virtue  = { id: string; name: string; description: string; is_major: boolean; page?: number | null };
type Flaw    = { id: string; name: string; description: string; is_major: boolean; page?: number | null };

type AkinState = { profile: AkinProfile; abilities: Ability[]; virtues: Virtue[]; flaws: Flaw[] };

/** Magias (apenas front; salvas no TEXT `profile.spells` como JSON) */
export type Spell = {
    id: string;
    name: string;
    technique: 'Creo' | 'Intellego' | 'Muto' | 'Perdo' | 'Rego';
    form: 'Animal' | 'Aquam' | 'Auram' | 'Corpus' | 'Herbam' | 'Ignem' | 'Imaginem' | 'Mentem' | 'Terram' | 'Vim';
    level: number;
    bonus?: string;
    range: string;
    duration: string;
    target: string;
    exp: number;
    mastery?: string;
    notes?: string;
};

/** =========================
 *  Helpers de API e estado
 *  ========================= */
function ns() {
    const hasNs = !!(apiSvc as any).akin;
    return {
        get: () => hasNs ? apiSvc.akin.get() : (apiSvc.getAkin?.() as Promise<any>),
        upsert: (p: any) => hasNs ? apiSvc.akin.upsert(p) : (apiSvc.saveAkinProfile?.(p) as Promise<any>),

        createAbility: (p: any) => hasNs ? apiSvc.akin.createAbility(p) : (apiSvc.addAbility?.(p) as Promise<any>),
        updateAbility: (id: string, p: any) => hasNs ? apiSvc.akin.updateAbility(id, p) : (apiSvc.updateAbility?.(id, p) as Promise<any>),
        deleteAbility: (id: string) => hasNs ? apiSvc.akin.deleteAbility(id) : (apiSvc.deleteAbility?.(id) as Promise<void>),

        createVirtue: (p: any) => hasNs ? apiSvc.akin.createVirtue(p) : (apiSvc.addVirtue?.(p) as Promise<any>),
        updateVirtue: (id: string, p: any) => hasNs ? apiSvc.akin.updateVirtue(id, p) : (apiSvc.updateVirtue?.(id, p) as Promise<any>),
        deleteVirtue: (id: string) => hasNs ? apiSvc.akin.deleteVirtue(id) : (apiSvc.deleteVirtue?.(id) as Promise<void>),

        createFlaw: (p: any) => hasNs ? apiSvc.akin.createFlaw(p) : (apiSvc.addFlaw?.(p) as Promise<any>),
        updateFlaw: (id: string, p: any) => hasNs ? apiSvc.akin.updateFlaw(id, p) : (apiSvc.updateFlaw?.(id, p) as Promise<any>),
        deleteFlaw: (id: string) => hasNs ? apiSvc.akin.deleteFlaw(id) : (apiSvc.deleteFlaw?.(id) as Promise<void>),
    };
}

function emptyProfile(): NonNullable<AkinProfile> {
    return {
        id: 'akin',
        name: '',
        house: '',
        age: null,
        characteristics: { int: 0, per: 0, str: 0, sta: 0, pre: 0, com: 0, dex: 0, qik: 0 },
        arts: { creo: 0, intellego: 0, muto: 0, perdo: 0, rego: 0, animal: 0, aquam: 0, auram: 0, corpus: 0, herbam: 0, ignem: 0, imaginem: 0, mentem: 0, terram: 0, vim: 0 },
        spells: '[]', // JSON de Spell[]
        notes: '',
    };
}

/** Serialização de magias em TEXT profile.spells (JSON) */
function parseSpells(spellsText: string | undefined | null): Spell[] {
    if (!spellsText) return [];
    try {
        const arr = JSON.parse(spellsText);
        return Array.isArray(arr) ? arr as Spell[] : [];
    } catch {
        return [];
    }
}
function stringifySpells(spells: Spell[]): string {
    return JSON.stringify(spells ?? []);
}

/** =========================
 *  UI Reutilizáveis
 *  ========================= */
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
        <input
            id={name}
            name={name}
            type={type}
            min={min}
            value={value}
            onChange={onChange}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-accent print:bg-transparent print:border-none print:p-0 print:text-black"
        />
    </div>
);

/** =========================
 *  Página principal
 *  ========================= */
const AkinPage: React.FC = () => {
    const [state, setState] = useState<AkinState>({ profile: null, abilities: [], virtues: [], flaws: [] });
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Edição inline
    const [editingCharacteristic, setEditingCharacteristic] = useState<{ key: keyof Characteristics | null, value: number }>({ key: null, value: 0 });
    const [editingArt, setEditingArt] = useState<{ key: keyof Arts | null, value: number }>({ key: null, value: 0 });
    const [editingAbility, setEditingAbility] = useState<Ability | null>(null);

    // Magias (front-only, serializa em profile.spells)
    const [spells, setSpells] = useState<Spell[]>([]);
    const [isSpellModalOpen, setIsSpellModalOpen] = useState(false);
    const [spellModalData, setSpellModalData] = useState<Spell | null>(null);

    // Virtudes/Falhas modal
    const [vfModal, setVfModal] = useState<{ open: boolean; type: 'virtue' | 'flaw'; item: Virtue | Flaw | null }>({ open: false, type: 'virtue', item: null });

    /** Carregar do backend */
    useEffect(() => {
        let cancel = false;
        (async () => {
            setLoading(true);
            try {
                const svc = ns();
                const data = await svc.get();
                if (cancel) return;

                const profile: NonNullable<AkinProfile> = data?.profile ?? emptyProfile();
                setState({
                    profile,
                    abilities: Array.isArray(data?.abilities) ? data.abilities : [],
                    virtues: Array.isArray(data?.virtues) ? data.virtues : [],
                    flaws: Array.isArray(data?.flaws) ? data.flaws : [],
                });
                setSpells(parseSpells(profile.spells));
            } catch (e) {
                console.error('Falha ao carregar AKIN', e);
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, []);

    /** Handlers gerais */
    const handleSimpleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const { name, value, type } = e.target;
        setState(prev => {
            const p = (prev.profile ?? emptyProfile()) as NonNullable<AkinProfile>;
            const next: any = { ...p };
            next[name] = type === 'number' ? (value === '' ? null : Number(value)) : value;
            return { ...prev, profile: next };
        });
    };

    const handleCharacteristicChange = (key: keyof Characteristics, value: number) => {
        setState(prev => {
            const p = (prev.profile ?? emptyProfile()) as NonNullable<AkinProfile>;
            return { ...prev, profile: { ...p, characteristics: { ...p.characteristics, [key]: value } } };
        });
    };

    const handleArtChange = (key: keyof Arts, value: number) => {
        setState(prev => {
            const p = (prev.profile ?? emptyProfile()) as NonNullable<AkinProfile>;
            return { ...prev, profile: { ...p, arts: { ...p.arts, [key]: value } } };
        });
    };

    /** Habilidades (backend) */
    const handleAddAbility = async () => {
        try {
            const svc = ns();
            const created = await svc.createAbility({ name: 'Nova Habilidade', value: 0, specialty: '' });
            setState(prev => ({ ...prev, abilities: [...prev.abilities, created] }));
            setEditingAbility(created);
        } catch (e) { console.error(e); }
    };
    const handleUpdateAbility = async () => {
        if (!editingAbility) return;
        try {
            const svc = ns();
            const upd = await svc.updateAbility(editingAbility.id, {
                name: editingAbility.name,
                value: Number(editingAbility.value) || 0,
                specialty: editingAbility.specialty ?? '',
            });
            setState(prev => ({ ...prev, abilities: prev.abilities.map(a => a.id === upd.id ? upd : a) }));
            setEditingAbility(null);
        } catch (e) { console.error(e); }
    };
    const handleDeleteAbility = async (id: string) => {
        try {
            const svc = ns();
            await svc.deleteAbility(id);
            setState(prev => ({ ...prev, abilities: prev.abilities.filter(a => a.id !== id) }));
        } catch (e) { console.error(e); }
    };

    /** Virtudes/Falhas (backend) */
    const openVirtueFlawModal = (type: 'virtue' | 'flaw', item?: Virtue | Flaw | null) => {
        setVfModal({ open: true, type, item: item ?? null });
    };
    const closeVF = () => setVfModal({ open: false, type: 'virtue', item: null });
    const saveVF = async () => {
        if (!vfModal.open) return;
        const isVirtue = vfModal.type === 'virtue';
        const body = vfModal.item as any;
        try {
            const svc = ns();
            if (body?.id) {
                const upd = isVirtue ? await svc.updateVirtue(body.id, body) : await svc.updateFlaw(body.id, body);
                setState(prev => ({
                    ...prev,
                    [isVirtue ? 'virtues' : 'flaws']: (prev as any)[isVirtue ? 'virtues' : 'flaws'].map((x: any) => x.id === upd.id ? upd : x)
                }));
            } else {
                const created = isVirtue ? await svc.createVirtue(body) : await svc.createFlaw(body);
                setState(prev => ({
                    ...prev,
                    [isVirtue ? 'virtues' : 'flaws']: [ ...(prev as any)[isVirtue ? 'virtues' : 'flaws'], created ]
                }));
            }
            closeVF();
        } catch (e) { console.error(e); }
    };
    const handleDeleteVirtueFlaw = async (type: 'virtue' | 'flaw', id: string) => {
        try {
            const svc = ns();
            if (type === 'virtue') await svc.deleteVirtue(id);
            else await svc.deleteFlaw(id);
            setState(prev => ({
                ...prev,
                [type === 'virtue' ? 'virtues' : 'flaws']: (prev as any)[type === 'virtue' ? 'virtues' : 'flaws'].filter((v: any) => v.id !== id)
            }));
        } catch (e) { console.error(e); }
    };

    /** Magias (front-only, persistidas dentro de profile.spells TEXT) */
    const openSpellModal = (spell: Spell | null = null) => {
        setSpellModalData(spell);
        setIsSpellModalOpen(true);
    };
    const handleSaveSpell = (spellToSave: Omit<Spell, 'id'> & { id?: string }) => {
        setSpells(prev => {
            if (spellToSave.id) {
                return prev.map(s => s.id === spellToSave.id ? (spellToSave as Spell) : s);
            }
            return [...prev, { ...(spellToSave as Spell), id: Date.now().toString() }];
        });
        setIsSpellModalOpen(false);
    };
    const handleDeleteSpell = (id: string) => {
        setSpells(prev => prev.filter(s => s.id !== id));
    };

    /** Salvar perfil (inclui serialização das magias no TEXT `profile.spells`) */
    const handleSubmit: React.FormEventHandler = async (e) => {
        e.preventDefault();
        if (!state.profile) return;
        setSaveStatus('saving');
        try {
            const svc = ns();
            const payload = {
                name: state.profile.name,
                house: state.profile.house,
                age: state.profile.age,
                characteristics: state.profile.characteristics,
                arts: state.profile.arts,
                spells: stringifySpells(spells),
                notes: state.profile.notes,
            };
            const updated = await svc.upsert(payload);
            setState(prev => ({ ...prev, profile: updated?.profile ?? { ...(prev.profile ?? emptyProfile()), ...payload } }));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 1500);
        }
    };

    /** Ordenações */
    const abilitiesSorted = useMemo(() => [...state.abilities].sort((a, b) => a.name.localeCompare(b.name)), [state.abilities]);
    const virtuesSorted   = useMemo(() => [...state.virtues].sort((a, b) => a.name.localeCompare(b.name)), [state.virtues]);
    const flawsSorted     = useMemo(() => [...state.flaws].sort((a, b) => a.name.localeCompare(b.name)), [state.flaws]);

    if (loading) return <div className="p-6 text-white">Carregando AKIN…</div>;

    const akin = (state.profile ?? emptyProfile());

    /** Render de habilidade (estilo do seu exemplo) */
    const renderAbility = (ability: Ability) => {
        if (editingAbility?.id === ability.id) {
            return (
                <div key={ability.id} className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-gray-700 p-2 rounded-md w-full print:bg-transparent print:p-0 print:gap-4">
                    <input
                        type="text"
                        placeholder="Nome"
                        value={editingAbility.name}
                        onChange={e => setEditingAbility(p => p && ({ ...p, name: e.target.value }))}
                        className="w-full sm:w-1/3 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"
                    />
                    <input
                        type="text"
                        placeholder="Especialidade"
                        value={editingAbility.specialty ?? ''}
                        onChange={e => setEditingAbility(p => p && ({ ...p, specialty: e.target.value }))}
                        className="w-full sm:w-1/3 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"
                    />
                    <input
                        type="number"
                        value={editingAbility.value}
                        onChange={e => setEditingAbility(p => p && ({ ...p, value: Number(e.target.value) || 0 }))}
                        className="w-20 bg-gray-800 border-gray-600 rounded px-2 py-1 print:bg-transparent print:border-none print:p-0 print:text-black"
                    />
                    <div className="flex gap-2 print:hidden">
                        <button type="button" onClick={handleUpdateAbility} className="text-green-accent hover:text-green-400">Salvar</button>
                        <button type="button" onClick={() => setEditingAbility(null)} className="text-gray-400 hover:text-white">Cancelar</button>
                    </div>
                </div>
            );
        }
        return (
            <div key={ability.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md group print:bg-transparent print:p-0">
        <span className="text-white print:text-black">
          {ability.name} {ability.specialty ? `(${ability.specialty})` : ''}
        </span>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-purple-accent print:text-black">{ability.value}</span>
                    <button type="button" onClick={() => setEditingAbility({ ...ability })} className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleDeleteAbility(ability.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white print:text-black">Ficha de Personagem: {akin.name || 'AKIN'}</h1>
                    <div className="hidden print:block text-sm">Impressão</div>
                </div>

                <div className="bg-gray-900 p-6 rounded-lg shadow-lg space-y-8 print:bg-white print:shadow-none print:p-0">
                    {/* Identidade */}
                    <section>
                        <h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Identidade</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="Nome"  name="name"  value={akin.name ?? ''}  onChange={handleSimpleChange} type="text" />
                            <InputField label="Casa"  name="house" value={akin.house ?? ''} onChange={handleSimpleChange} type="text" />
                            <InputField label="Idade" name="age"   value={akin.age ?? ''}   onChange={handleSimpleChange} />
                        </div>
                    </section>

                    {/* Características */}
                    <section>
                        <h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Características</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                            {(Object.keys(akin.characteristics) as Array<keyof Characteristics>).map((key) => (
                                <div key={key} className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-400 mb-1 print:text-black">{key.toUpperCase()}</label>
                                    {editingCharacteristic.key === key ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={editingCharacteristic.value}
                                                onChange={(e) => setEditingCharacteristic(p => ({ ...p, value: Number(e.target.value) }))}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white print:bg-transparent print:border-none print:text-black"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCharacteristicChange(key, editingCharacteristic.value);
                                                    setEditingCharacteristic({ key: null, value: 0 });
                                                }}
                                                className="text-green-accent hover:text-green-400 print:hidden"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group bg-gray-800 rounded-md px-3 py-2 print:bg-transparent print:p-0">
                                            <span className="font-bold text-lg text-purple-accent print:text-black">{akin.characteristics[key]}</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditingCharacteristic({ key, value: akin.characteristics[key] })}
                                                className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Artes Herméticas */}
                    <section>
                        <h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Artes Herméticas</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div>
                                <h3 className="text-lg font-medium text-gray-300 mb-3 print:text-black">Técnicas</h3>
                                <div className="space-y-3">
                                    {(['creo', 'intellego', 'muto', 'perdo', 'rego'] as const).map(key => (
                                        <div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md print:bg-transparent print:p-0">
                                            {editingArt.key === key ? (
                                                <>
                                                    <input
                                                        type="number"
                                                        value={editingArt.value}
                                                        onChange={(e) => setEditingArt(p => ({ ...p, value: Number(e.target.value) }))}
                                                        className="w-16 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white print:bg-transparent print:border-none print:text-black"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { handleArtChange(key, editingArt.value); setEditingArt({ key: null, value: 0 }); }}
                                                        className="text-green-accent hover:text-green-400 print:hidden"
                                                    >
                                                        Salvar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-white capitalize print:text-black">{key}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg text-purple-accent print:text-black">{akin.arts[key]}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingArt({ key, value: akin.arts[key] })}
                                                            className="text-gray-400 hover:text-white print:hidden"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <h3 className="text-lg font-medium text-gray-300 mb-3 print:text-black">Formas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(['animal', 'aquam', 'auram', 'corpus', 'herbam', 'ignem', 'imaginem', 'mentem', 'terram', 'vim'] as const).map(key => (
                                        <div key={key} className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md print:bg-transparent print:p-0">
                                            {editingArt.key === key ? (
                                                <>
                                                    <input
                                                        type="number"
                                                        value={editingArt.value}
                                                        onChange={(e) => setEditingArt(p => ({ ...p, value: Number(e.target.value) }))}
                                                        className="w-16 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white print:bg-transparent print:border-none print:text-black"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { handleArtChange(key, editingArt.value); setEditingArt({ key: null, value: 0 }); }}
                                                        className="text-green-accent hover:text-green-400 print:hidden"
                                                    >
                                                        Salvar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-white capitalize print:text-black">{key}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg text-purple-accent print:text-black">{akin.arts[key]}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingArt({ key, value: akin.arts[key] })}
                                                            className="text-gray-400 hover:text-white print:hidden"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Habilidades */}
                    <section>
                        <h2 className="text-xl font-semibold text-purple-accent mb-4 border-b border-gray-700 pb-2 print:text-black print:border-black">Habilidades</h2>
                        <div className="space-y-2">
                            {abilitiesSorted.map(renderAbility)}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddAbility}
                            className="mt-4 text-sm bg-gray-700 hover:bg-gray-600 text-purple-accent font-semibold py-2 px-4 rounded-lg transition-colors print:hidden"
                        >
                            + Adicionar Habilidade
                        </button>
                    </section>

                    {/* Magias (front-only, salvas em profile.spells como JSON) */}
                    <section className="print:break-inside-avoid">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 print:border-black">
                            <h2 className="text-xl font-semibold text-purple-accent print:text-black">Magias</h2>
                            <button type="button" onClick={() => openSpellModal()} className="text-sm bg-gray-700 hover:bg-gray-600 text-green-accent font-semibold py-1 px-3 rounded-lg print:hidden">+ Adicionar Magia</button>
                        </div>
                        <div className="space-y-4">
                            {spells.map(spell => (
                                <div key={spell.id} className="bg-gray-800/50 p-4 rounded-lg group print:bg-transparent print:p-0 print:pb-2 print:border-b print:border-gray-300 print:rounded-none">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white text-lg pr-2 print:text-black">
                                            {spell.name}{' '}
                                            <span className="text-sm font-normal text-gray-400">
                        ({spell.technique} {spell.form} {spell.level})
                      </span>
                                        </h3>
                                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                            <button type="button" onClick={() => openSpellModal(spell)} className="hover:text-white text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                            </button>
                                            <button type="button" onClick={() => handleDeleteSpell(spell.id)} className="hover:text-red-400 text-red-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 mt-3 text-sm">
                                        <p><strong className="text-gray-400 print:text-gray-600">Bônus:</strong> {spell.bonus || '–'}</p>
                                        <p><strong className="text-gray-400 print:text-gray-600">Alcance:</strong> {spell.range}</p>
                                        <p><strong className="text-gray-400 print:text-gray-600">Duração:</strong> {spell.duration}</p>
                                        <p><strong className="text-gray-400 print:text-gray-600">Alvo:</strong> {spell.target}</p>
                                        <p><strong className="text-gray-400 print:text-gray-600">Exp:</strong> {spell.exp}</p>
                                        <p><strong className="text-gray-400 print:text-gray-600">Maestria:</strong> {spell.mastery || '–'}</p>
                                    </div>
                                    {spell.notes && <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-gray-700/50 print:text-black">{spell.notes}</p>}
                                </div>
                            ))}
                            {spells.length === 0 && <p className="text-gray-500 text-center py-4">Nenhuma magia adicionada.</p>}
                        </div>
                    </section>

                    {/* Virtudes e Defeitos */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 print:break-inside-avoid">
                        <div>
                            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 print:border-black">
                                <h2 className="text-xl font-semibold text-purple-accent print:text-black">Virtudes</h2>
                                <button type="button" onClick={() => openVirtueFlawModal('virtue', { id: '', name: '', description: '', is_major: false, page: null })} className="text-sm bg-gray-700 hover:bg-gray-600 text-green-accent font-semibold py-1 px-3 rounded-lg print:hidden">+ Adicionar</button>
                            </div>
                            <div className="space-y-4">
                                {virtuesSorted.map(v => (
                                    <div key={v.id} className="bg-gray-800/50 p-4 rounded-lg group print:bg-transparent print:p-0 print:pb-2 print:border-b print:border-gray-300 print:rounded-none">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-white pr-2 print:text-black">{v.name}</h3>
                                            <Badge text={v.is_major ? 'Grande' : 'Menor'} color={v.is_major ? 'orange' : 'blue'} />
                                        </div>
                                        <p className="text-sm text-gray-400 my-2 print:text-black">{v.description}</p>
                                        <div className="flex justify-between items-center text-xs text-gray-500 print:text-gray-600">
                                            <span>Pág. {v.page ?? 'N/A'}</span>
                                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                                <button type="button" onClick={() => openVirtueFlawModal('virtue', v)} className="hover:text-white">Editar</button>
                                                <button type="button" onClick={() => handleDeleteVirtueFlaw('virtue', v.id)} className="hover:text-red-400">Excluir</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 print:border-black">
                                <h2 className="text-xl font-semibold text-purple-accent print:text-black">Defeitos</h2>
                                <button type="button" onClick={() => openVirtueFlawModal('flaw', { id: '', name: '', description: '', is_major: false, page: null })} className="text-sm bg-gray-700 hover:bg-gray-600 text-red-accent font-semibold py-1 px-3 rounded-lg print:hidden">+ Adicionar</button>
                            </div>
                            <div className="space-y-4">
                                {flawsSorted.map(f => (
                                    <div key={f.id} className="bg-gray-800/50 p-4 rounded-lg group print:bg-transparent print:p-0 print:pb-2 print:border-b print:border-gray-300 print:rounded-none">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-white pr-2 print:text-black">{f.name}</h3>
                                            <Badge text={f.is_major ? 'Grande' : 'Menor'} color={f.is_major ? 'red' : 'blue'} />
                                        </div>
                                        <p className="text-sm text-gray-400 my-2 print:text-black">{f.description}</p>
                                        <div className="flex justify-between items-center text-xs text-gray-500 print:text-gray-600">
                                            <span>Pág. {f.page ?? 'N/A'}</span>
                                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                                <button type="button" onClick={() => openVirtueFlawModal('flaw', f)} className="hover:text-white">Editar</button>
                                                <button type="button" onClick={() => handleDeleteVirtueFlaw('flaw', f.id)} className="hover:text-red-400">Excluir</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Ações */}
                <div className="flex justify-end pt-4 gap-4 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="bg-blue-accent text-gray-950 font-bold py-2 px-6 rounded-lg hover:bg-blue-accent/80 transition-all duration-300 text-center shadow-lg flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        Imprimir Ficha
                    </button>

                    <button
                        type="submit"
                        className="bg-purple-accent text-gray-950 font-bold py-2 px-6 rounded-lg hover:bg-purple-accent/80 transition-all duration-300 w-48 text-center shadow-lg disabled:opacity-60"
                        disabled={saveStatus === 'saving'}
                    >
                        {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo!' : 'Salvar Ficha'}
                    </button>
                </div>
            </form>

            {/* Modal Virtudes/Falhas */}
            {vfModal.open && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="modal-vf">
                    <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full shadow-2xl border border-gray-700">
                        <h3 id="modal-vf" className="text-lg font-bold text-white mb-6">
                            {(vfModal.item as any)?.id ? 'Editar' : 'Adicionar'} {vfModal.type === 'virtue' ? 'Virtude' : 'Defeito'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={(vfModal.item as any)?.name ?? ''}
                                    onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item as any), name: e.target.value } }))}
                                    className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-1">Descrição</label>
                                <textarea
                                    rows={3}
                                    value={(vfModal.item as any)?.description ?? ''}
                                    onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item as any), description: e.target.value } }))}
                                    className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-grow">
                                    <label className="text-sm font-medium text-gray-400 block mb-1">Página</label>
                                    <input
                                        type="number"
                                        value={(vfModal.item as any)?.page ?? ''}
                                        onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item as any), page: e.target.value === '' ? null : Number(e.target.value) } }))}
                                        className="w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!(vfModal.item as any)?.is_major}
                                            onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item as any), is_major: e.target.checked } }))}
                                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-accent focus:ring-purple-accent"
                                        />
                                        É uma qualidade Grande?
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={closeVF} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">Cancelar</button>
                                <button type="button" onClick={saveVF} className="py-2 px-4 rounded-lg bg-purple-accent hover:bg-purple-accent/80 text-white font-semibold transition-colors">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Magias */}
            {isSpellModalOpen && (
                <SpellModal
                    spell={spellModalData}
                    onClose={() => setIsSpellModalOpen(false)}
                    onSave={(item) => handleSaveSpell(item)}
                />
            )}
        </div>
    );
};

/** =========================
 *  Modal de Magia (front-only)
 *  ========================= */
const TECHNIQUES = ['Creo', 'Intellego', 'Muto', 'Perdo', 'Rego'] as const;
const FORMS = ['Animal', 'Aquam', 'Auram', 'Corpus', 'Herbam', 'Ignem', 'Imaginem', 'Mentem', 'Terram', 'Vim'] as const;

const SPELL_DEFAULTS: Omit<Spell, 'id'> = {
    name: '',
    technique: 'Creo',
    form: 'Animal',
    level: 5,
    bonus: '',
    range: 'Toque',
    duration: 'Momento',
    target: 'Individual',
    exp: 0,
    mastery: '',
    notes: ''
};

const SpellModal: React.FC<{
    spell: Spell | null;
    onClose: () => void;
    onSave: (item: Spell | Omit<Spell, 'id'> & { id?: string }) => void;
}> = ({ spell, onClose, onSave }) => {
    const [formData, setFormData] = useState<Omit<Spell, 'id'>>(() => spell ? { ...spell } : SPELL_DEFAULTS);
    const isEditing = !!spell;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert("O nome da magia é obrigatório.");
            return;
        }
        onSave({ ...formData, id: spell?.id });
    };

    const inputClass = "w-full bg-gray-800 border-gray-700 rounded-md px-3 py-2 text-white";
    const labelClass = "text-sm font-medium text-gray-400 block mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title-spell">
            <div className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <h3 id="modal-title-spell" className="text-lg font-bold text-white mb-6">{isEditing ? 'Editar' : 'Adicionar'} Magia</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className={labelClass}>Nome da Magia</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="technique" className={labelClass}>Técnica</label>
                            <select name="technique" id="technique" value={formData.technique} onChange={handleChange} className={inputClass}>
                                {TECHNIQUES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="form" className={labelClass}>Forma</label>
                            <select name="form" id="form" value={formData.form} onChange={handleChange} className={inputClass}>
                                {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="level" className={labelClass}>Nível</label>
                            <input type="number" name="level" id="level" value={formData.level} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label htmlFor="range" className={labelClass}>Alcance</label><input type="text" name="range" id="range" value={formData.range} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="duration" className={labelClass}>Duração</label><input type="text" name="duration" id="duration" value={formData.duration} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="target" className={labelClass}>Alvo</label><input type="text" name="target" id="target" value={formData.target} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="bonus" className={labelClass}>Bônus</label><input type="text" name="bonus" id="bonus" value={formData.bonus} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="mastery" className={labelClass}>Maestria</label><input type="text" name="mastery" id="mastery" value={formData.mastery} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="exp" className={labelClass}>Exp</label><input type="number" name="exp" id="exp" value={formData.exp} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div><label htmlFor="notes" className={labelClass}>Notas</label><textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClass} /></div>
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
