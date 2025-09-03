import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api'; // <-- usa o serviço REST com /api/akin*
import Badge from '../components/Badge';

// TIPOS mínimos (ajuste para usar de '../types' se preferir)
type Characteristics = {
    int: number; per: number; str: number; sta: number; pre: number; com: number; dex: number; qik: number;
};
type Arts = {
    creo: number; intellego: number; muto: number; perdo: number; rego: number;
    animal: number; aquam: number; auram: number; corpus: number; herbam: number;
    ignem: number; imaginem: number; mentem: number; terram: number; vim: number;
};
type AkinProfile = {
    id: string;
    name: string;
    house: string;
    age: number | null;
    characteristics: Characteristics;
    arts: Arts;
    spells: string;
    notes: string;
    created_at?: string;
    updated_at?: string;
} | null;

type Ability = { id: string; name: string; value: number; specialty?: string | null };
type Virtue = { id: string; name: string; description: string; is_major: boolean; page?: number | null };
type Flaw   = { id: string; name: string; description: string; is_major: boolean; page?: number | null };

type AkinState = {
    profile: AkinProfile;
    abilities: Ability[];
    virtues: Virtue[];
    flaws: Flaw[];
};

// UI helper
const Field: React.FC<{
    label: string; name: string; value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: 'text' | 'number' | 'textarea';
}> = ({ label, name, value, onChange, type = 'text' }) => (
    <div className="flex flex-col gap-1">
        <label htmlFor={name} className="text-sm text-gray-400">{label}</label>
        {type === 'textarea' ? (
            <textarea id={name} name={name} value={value as string} onChange={onChange}
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white" rows={3}/>
        ) : (
            <input id={name} name={name} value={value} onChange={onChange} type={type}
                   className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"/>
        )}
    </div>
);

const AkinPage: React.FC = () => {
    const [state, setState] = useState<AkinState>({ profile: null, abilities: [], virtues: [], flaws: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Edição inline
    const [editingAbility, setEditingAbility] = useState<Ability | null>(null);
    const [vfModal, setVfModal] = useState<{ open: boolean; type: 'virtue' | 'flaw'; item: Virtue | Flaw | null }>({ open: false, type: 'virtue', item: null });

    // ============ LOAD ============

    useEffect(() => {
        let cancel = false;
        async function load() {
            setLoading(true);
            try {
                // GET /api/akin  -> { profile, abilities, virtues, flaws }
                const data = await api.akin.get(); // backend: router.get('/', ...) :contentReference[oaicite:3]{index=3}
                if (!cancel) setState({
                    profile: data.profile,
                    abilities: data.abilities ?? [],
                    virtues: data.virtues ?? [],
                    flaws: data.flaws ?? [],
                });
            } catch (e) {
                console.error('Falha ao carregar AKIN', e);
            } finally {
                if (!cancel) setLoading(false);
            }
        }
        void load();
        return () => { cancel = true; };
    }, []);

    // ============ PROFILE (PUT /api/akin) ============

    const onProfileChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
        const { name, value, type } = e.target;
        setState(prev => {
            const p = prev.profile ?? {
                id: 'akin', name: '', house: '', age: null,
                characteristics: { int:0, per:0, str:0, sta:0, pre:0, com:0, dex:0, qik:0 },
                arts: {
                    creo:0, intellego:0, muto:0, perdo:0, rego:0,
                    animal:0, aquam:0, auram:0, corpus:0, herbam:0,
                    ignem:0, imaginem:0, mentem:0, terram:0, vim:0,
                },
                spells: '', notes: '',
            } as AkinProfile;

            // campos simples no root (name, house, age, spells, notes)
            const next: any = { ...p };
            if (name === 'age') next.age = value === '' ? null : Number(value);
            else (next as any)[name] = type === 'number' ? Number(value) : value;

            return { ...prev, profile: next };
        });
    };

    const onCharacteristicChange = (key: keyof Characteristics, value: number) => {
        setState(prev => {
            if (!prev.profile) return prev;
            return {
                ...prev,
                profile: { ...prev.profile, characteristics: { ...prev.profile.characteristics, [key]: value } }
            };
        });
    };

    const onArtChange = (key: keyof Arts, value: number) => {
        setState(prev => {
            if (!prev.profile) return prev;
            return {
                ...prev,
                profile: { ...prev.profile, arts: { ...prev.profile.arts, [key]: value } }
            };
        });
    };

    const saveProfile = async () => {
        if (!state.profile) return;
        setSaving('saving');
        try {
            // PUT /api/akin (upsert)  :contentReference[oaicite:4]{index=4}
            const payload = {
                name: state.profile.name,
                house: state.profile.house,
                age: state.profile.age,
                characteristics: state.profile.characteristics,
                arts: state.profile.arts,
                spells: state.profile.spells,
                notes: state.profile.notes,
            };
            const updated = await api.akin.upsert(payload);
            setState(prev => ({ ...prev, profile: updated.profile }));
            setSaving('saved');
            setTimeout(() => setSaving('idle'), 1500);
        } catch (e) {
            console.error(e); setSaving('error');
            setTimeout(() => setSaving('idle'), 2000);
        }
    };

    // ============ ABILITIES (POST/PUT/DELETE /api/akin/abilities) ============

    const addAbility = async () => {
        try {
            const created = await api.akin.createAbility({ name: 'Nova Habilidade', value: 0, specialty: '' });
            setState(prev => ({ ...prev, abilities: [...prev.abilities, created] }));
            setEditingAbility(created);
        } catch (e) { console.error(e); }
    };

    const saveAbility = async () => {
        if (!editingAbility) return;
        try {
            const upd = await api.akin.updateAbility(editingAbility.id, {
                name: editingAbility.name, value: editingAbility.value, specialty: editingAbility.specialty ?? ''
            });
            setState(prev => ({
                ...prev,
                abilities: prev.abilities.map(a => a.id === upd.id ? upd : a)
            }));
            setEditingAbility(null);
        } catch (e) { console.error(e); }
    };

    const deleteAbility = async (id: string) => {
        try {
            await api.akin.deleteAbility(id);
            setState(prev => ({ ...prev, abilities: prev.abilities.filter(a => a.id !== id) }));
        } catch (e) { console.error(e); }
    };

    // ============ VIRTUES / FLAWS (POST/PUT/DELETE /api/akin/virtues|flaws) ============

    const openVF = (type: 'virtue' | 'flaw', item?: Virtue | Flaw) => setVfModal({ open: true, type, item: item ?? null });
    const closeVF = () => setVfModal({ open: false, type: 'virtue', item: null });

    const saveVF = async () => {
        if (!vfModal.open) return;
        const isVirtue = vfModal.type === 'virtue';
        const body = vfModal.item as any;
        try {
            if (body?.id) {
                const upd = isVirtue
                    ? await api.akin.updateVirtue(body.id, body)
                    : await api.akin.updateFlaw(body.id, body);
                setState(prev => ({
                    ...prev,
                    [isVirtue ? 'virtues' : 'flaws']: (prev as any)[isVirtue ? 'virtues' : 'flaws'].map((x: any) => x.id === upd.id ? upd : x)
                }));
            } else {
                const created = isVirtue
                    ? await api.akin.createVirtue(body)
                    : await api.akin.createFlaw(body);
                setState(prev => ({
                    ...prev,
                    [isVirtue ? 'virtues' : 'flaws']: [ ...(prev as any)[isVirtue ? 'virtues' : 'flaws'], created ]
                }));
            }
            closeVF();
        } catch (e) { console.error(e); }
    };

    const deleteVF = async (type: 'virtue' | 'flaw', id: string) => {
        try {
            if (type === 'virtue') await api.akin.deleteVirtue(id);
            else await api.akin.deleteFlaw(id);
            setState(prev => ({
                ...prev,
                [type === 'virtue' ? 'virtues' : 'flaws']: (prev as any)[type === 'virtue' ? 'virtues' : 'flaws'].filter((v: any) => v.id !== id)
            }));
        } catch (e) { console.error(e); }
    };

    // ============ RENDER ============

    const abilitiesSorted = useMemo(() => [...state.abilities].sort((a, b) => a.name.localeCompare(b.name)), [state.abilities]);
    const virtuesSorted   = useMemo(() => [...state.virtues].sort((a, b) => a.name.localeCompare(b.name)), [state.virtues]);
    const flawsSorted     = useMemo(() => [...state.flaws].sort((a, b) => a.name.localeCompare(b.name)), [state.flaws]);

    if (loading) return <div className="p-6 text-white">Carregando AKIN…</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-white">AKIN</h1>
                <div className="flex items-center gap-2">
                    <Badge text={saving === 'saving' ? 'Salvando…' : saving === 'saved' ? 'Salvo' : ' '} color="green" />
                    <button onClick={saveProfile} className="bg-green-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-green-accent/80">Salvar Perfil</button>
                </div>
            </div>

            {/* Perfil básico */}
            <div className="bg-gray-900 rounded-lg p-4 md:p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Nome"  name="name"  value={state.profile?.name || ''} onChange={onProfileChange}/>
                    <Field label="Casa"  name="house" value={state.profile?.house || ''} onChange={onProfileChange}/>
                    <Field label="Idade" name="age"   value={state.profile?.age ?? ''} onChange={onProfileChange} type="number"/>
                </div>

                <div className="border-t border-gray-700 my-4" />

                {/* Características (abreviado para o essencial; pode expandir conforme sua UI antiga) */}
                <h2 className="text-xl text-white font-semibold mb-2">Características</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['int','per','str','sta','pre','com','dex','qik'] as (keyof Characteristics)[]).map(k => (
                        <div key={k} className="flex items-center gap-2">
                            <span className="text-gray-400 w-10 uppercase">{k}</span>
                            <input type="number" value={state.profile?.characteristics[k] ?? 0}
                                   onChange={e => onCharacteristicChange(k, Number(e.target.value))}
                                   className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white w-20"/>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-700 my-4" />

                {/* Artes (abreviado) */}
                <h2 className="text-xl text-white font-semibold mb-2">Artes</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['creo','intellego','muto','perdo','rego','animal','aquam','auram','corpus','herbam','ignem','imaginem','mentem','terram','vim'] as (keyof Arts)[]).map(k => (
                        <div key={k} className="flex items-center gap-2">
                            <span className="text-gray-400 w-24 capitalize">{k}</span>
                            <input type="number" value={state.profile?.arts[k] ?? 0}
                                   onChange={e => onArtChange(k, Number(e.target.value))}
                                   className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white w-20"/>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Field label="Feitiços (livre)" name="spells" value={state.profile?.spells || ''} onChange={onProfileChange} type="textarea"/>
                    <Field label="Notas"             name="notes"  value={state.profile?.notes  || ''} onChange={onProfileChange} type="textarea"/>
                </div>
            </div>

            {/* Habilidades */}
            <div className="bg-gray-900 rounded-lg p-4 md:p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl text-white font-semibold">Habilidades</h2>
                    <button onClick={addAbility} className="bg-blue-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-blue-accent/80">Adicionar</button>
                </div>

                <div className="space-y-3">
                    {abilitiesSorted.map(a => (
                        <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-800 rounded-md p-3">
                            {editingAbility?.id === a.id ? (
                                <>
                                    <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white md:w-1/3"
                                           value={editingAbility.name}
                                           onChange={e => setEditingAbility(p => p && ({ ...p, name: e.target.value }))}/>
                                    <input type="number" className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24"
                                           value={editingAbility.value}
                                           onChange={e => setEditingAbility(p => p && ({ ...p, value: Number(e.target.value) }))}/>
                                    <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white md:flex-1"
                                           placeholder="Especialidade"
                                           value={editingAbility.specialty ?? ''}
                                           onChange={e => setEditingAbility(p => p && ({ ...p, specialty: e.target.value }))}/>
                                    <div className="flex gap-2">
                                        <button onClick={saveAbility} className="bg-green-accent text-gray-950 font-bold py-1 px-3 rounded">Salvar</button>
                                        <button onClick={() => setEditingAbility(null)} className="bg-gray-700 text-white font-bold py-1 px-3 rounded">Cancelar</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 text-white">{a.name}</div>
                                    <Badge text={`Valor: ${a.value}`} color="purple"/>
                                    {a.specialty && <Badge text={`Esp.: ${a.specialty}`} color="orange"/>}
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingAbility(a)} className="bg-blue-accent text-gray-950 font-bold py-1 px-3 rounded">Editar</button>
                                        <button onClick={() => void deleteAbility(a.id)} className="bg-red-accent text-gray-950 font-bold py-1 px-3 rounded">Excluir</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {abilitiesSorted.length === 0 && <div className="text-gray-400">Nenhuma habilidade cadastrada.</div>}
                </div>
            </div>

            {/* Virtudes e Falhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-gray-900 rounded-lg p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl text-white font-semibold">Virtudes</h2>
                        <button onClick={() => openVF('virtue')} className="bg-blue-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-blue-accent/80">Adicionar</button>
                    </div>
                    <div className="space-y-3">
                        {virtuesSorted.map(v => (
                            <div key={v.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-800 rounded-md p-3">
                                <div className="flex-1">
                                    <div className="text-white font-semibold">{v.name}</div>
                                    <div className="text-gray-300 text-sm">{v.description}</div>
                                </div>
                                <Badge text={v.is_major ? 'Maior' : 'Menor'} color={v.is_major ? 'red' : 'green'}/>
                                {!!v.page && <Badge text={`p. ${v.page}`} color="orange"/>}
                                <div className="flex gap-2">
                                    <button onClick={() => openVF('virtue', v)} className="bg-blue-accent text-gray-950 font-bold py-1 px-3 rounded">Editar</button>
                                    <button onClick={() => void deleteVF('virtue', v.id)} className="bg-red-accent text-gray-950 font-bold py-1 px-3 rounded">Excluir</button>
                                </div>
                            </div>
                        ))}
                        {virtuesSorted.length === 0 && <div className="text-gray-400">Nenhuma virtude.</div>}
                    </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl text-white font-semibold">Falhas</h2>
                        <button onClick={() => openVF('flaw')} className="bg-blue-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-blue-accent/80">Adicionar</button>
                    </div>
                    <div className="space-y-3">
                        {flawsSorted.map(f => (
                            <div key={f.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-800 rounded-md p-3">
                                <div className="flex-1">
                                    <div className="text-white font-semibold">{f.name}</div>
                                    <div className="text-gray-300 text-sm">{f.description}</div>
                                </div>
                                <Badge text={f.is_major ? 'Maior' : 'Menor'} color={f.is_major ? 'red' : 'green'}/>
                                {!!f.page && <Badge text={`p. ${f.page}`} color="orange"/>}
                                <div className="flex gap-2">
                                    <button onClick={() => openVF('flaw', f)} className="bg-blue-accent text-gray-950 font-bold py-1 px-3 rounded">Editar</button>
                                    <button onClick={() => void deleteVF('flaw', f.id)} className="bg-red-accent text-gray-950 font-bold py-1 px-3 rounded">Excluir</button>
                                </div>
                            </div>
                        ))}
                        {flawsSorted.length === 0 && <div className="text-gray-400">Nenhuma falha.</div>}
                    </div>
                </div>
            </div>

            {/* Modal simples p/ Virtudes/Falhas */}
            {vfModal.open && (
                <div className="fixed inset-0 bg-black/60 grid place-items-center p-4">
                    <div className="bg-gray-900 rounded-lg p-4 md:p-6 w-full max-w-2xl">
                        <h3 className="text-white text-xl font-semibold mb-3">{vfModal.type === 'virtue' ? 'Virtude' : 'Falha'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Nome" name="name" value={(vfModal.item as any)?.name ?? ''} onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item ?? {} as any), name: e.target.value } }))}/>
                            <Field label="Página" name="page" value={(vfModal.item as any)?.page ?? ''} onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item ?? {} as any), page: e.target.value === '' ? null : Number(e.target.value) } }))} />
                            <div className="flex items-center gap-2">
                                <input id="is_major" type="checkbox" checked={Boolean((vfModal.item as any)?.is_major)} onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item ?? {} as any), is_major: e.target.checked } }))}/>
                                <label htmlFor="is_major" className="text-gray-300">Maior</label>
                            </div>
                            <div className="md:col-span-2">
                                <Field label="Descrição" name="description" value={(vfModal.item as any)?.description ?? ''} onChange={e => setVfModal(m => ({ ...m, item: { ...(m.item ?? {} as any), description: e.target.value } }))} type="textarea"/>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={saveVF} className="bg-green-accent text-gray-950 font-bold py-2 px-4 rounded-lg">Salvar</button>
                            <button onClick={closeVF} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AkinPage;
