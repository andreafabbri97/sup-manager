import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Equipment from '../Equipment'
import { supabase } from '../../lib/supabaseClient'

describe('Equipment categories integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'equipment_category') {
        return { select: () => ({ order: async () => ({ data: [{ id: 'c1', name: 'SUP' }, { id: 'c2', name: 'Barca' }], error: null }) }) } as any
      }
      if (table === 'equipment') {
        return { select: () => ({ order: async () => ({ data: [], error: null }) }) } as any
      }
      return { select: async () => ({ data: [], error: null }) } as any
    })
  })

  it('opens category manager and shows categories', async () => {
    render(<Equipment />)
    // wait for page title
    await waitFor(() => expect(screen.getByText('Attrezzatura')).toBeTruthy())

    const btn = screen.getByText('Modifica categorie')
    await userEvent.click(btn)

    // modal should show categories
    expect(await screen.findByText('SUP')).toBeTruthy()
    expect(await screen.findByText('Barca')).toBeTruthy()
  })
})