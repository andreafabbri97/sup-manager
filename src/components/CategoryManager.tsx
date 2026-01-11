import React, { useState } from 'react'

type Props = {
  categories: { id: string; name: string }[]
  onCreate: (name: string) => Promise<void>
  onUpdate: (id: string, name: string) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export default function CategoryManager({ categories, onCreate, onUpdate, onDelete, onRefresh }: Props) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{id:string;name:string}|null>(null)
  const [editName, setEditName] = useState('')

  async function handleAdd(e: React.FormEvent){
    e.preventDefault()
    if (!newName.trim()) return
    await onCreate(newName.trim())
    setNewName('')
    await onRefresh()
  }

  async function handleUpdate(){
    if (!editing) return
    await onUpdate(editing.id, editName.trim())
    setEditing(null)
    setEditName('')
    await onRefresh()
  }

  async function handleDelete(id:string, name:string){
    if (!confirm(`Eliminare la categoria "${name}"?`)) return
    await onDelete(id, name)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input value={newName} onChange={(e)=>setNewName(e.target.value)} className="border px-2 py-1 rounded flex-1" placeholder="Nuova categoria" />
        <button className="px-3 py-1 rounded bg-amber-500 text-white">Aggiungi</button>
      </form>

      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            {editing && editing.id === c.id ? (
              <>
                <input value={editName} onChange={(e)=>setEditName(e.target.value)} className="border px-2 py-1 rounded flex-1" />
                <button onClick={handleUpdate} className="px-3 py-1 rounded bg-green-600 text-white">Salva</button>
                <button onClick={()=>{ setEditing(null); setEditName('') }} className="px-3 py-1 rounded border">Annulla</button>
              </>
            ) : (
              <>
                <div className="flex-1 truncate">{c.name}</div>
                <button onClick={()=>{ setEditing(c); setEditName(c.name) }} className="px-3 py-1 rounded border">Modifica</button>
                <button onClick={()=>handleDelete(c.id, c.name)} className="px-3 py-1 rounded border text-red-600">Elimina</button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && <div className="text-neutral-500">Nessuna categoria</div>}
      </div>
    </div>
  )
}
