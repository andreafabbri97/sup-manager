import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryManager from '../CategoryManager'

describe('CategoryManager', () => {
  it('adds, edits and deletes categories via callbacks', async () => {
    const categories = [{ id: 'c1', name: 'SUP' }]
    const onCreate = vi.fn().mockResolvedValue(undefined)
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    render(<CategoryManager categories={categories} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} onRefresh={onRefresh} />)

    // add
    const input = screen.getByPlaceholderText('Nuova categoria')
    await userEvent.type(input, 'Barca')
    const addBtn = screen.getByText('Aggiungi')
    await userEvent.click(addBtn)
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Barca'))

    // start edit
    const modBtn = screen.getByText('Modifica')
    await userEvent.click(modBtn)
    // target the existing category input (avoid the new-category textbox)
    const editInput = screen.getByDisplayValue('SUP')
    await userEvent.clear(editInput)
    await userEvent.type(editInput, 'SUP2')
    const saveBtn = screen.getByText('Salva')
    await userEvent.click(saveBtn)
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())

    // delete (confirm will be window.confirm; mock it)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const delBtn = screen.getByText('Elimina')
    await userEvent.click(delBtn)
    // confirm handler is synchronous in our component; wait a tick for async handlers
    await new Promise((r) => setTimeout(r, 0))
    if ((onDelete as any).mock.calls.length === 0) throw new Error('onDelete not called')
    (window.confirm as any).mockRestore()
  })
})