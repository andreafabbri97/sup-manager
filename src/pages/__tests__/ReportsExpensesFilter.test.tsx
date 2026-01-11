import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
vi.mock('react-chartjs-2', () => ({ Line: () => (<div data-testid="chart" />) }))
import Reports from '../Reports'
import { supabase } from '../../lib/supabaseClient'

beforeEach(() => {
  // clear any persisted tab selection to avoid cross-test contamination
  window.localStorage.removeItem('reports_tab')
  // ensure starting with empty keyword
  window.localStorage.removeItem('reports_keyword')
})
vi.mock('../../lib/auth', () => ({ getCurrentUserRole: vi.fn().mockResolvedValue('admin'), getCurrentUserId: vi.fn() }))

describe('Expenses keyword filter', () => {
  it('uses keyword to filter by category or notes', async () => {
    let capturedOr: string | null = null

    // mock supabase.from for expense and other selects used during mount
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const chain: any = {
        _gte: null,
        _lte: null,
        gte(s:any) { this._gte = s; return this },
        lte(s:any) { this._lte = s; return this },
        order() { return this },
        limit() { return this },
        or(s: string) { capturedOr = s; return this },
        in() { return this },
        select() { return this },
        eq() { return this },
        single: async () => ({ data: null, error: null }),
        then(resolve: any) { resolve({ data: [] }); return Promise.resolve() }
      }
      return chain
    })

    // ensure admin tab is selected
    window.localStorage.setItem('reports_tab', 'admin')
    render(<Reports />)

    // wait for admin section to be visible
    await waitFor(() => expect(screen.getByText('Gestione Spese')).toBeTruthy())

    const input = screen.getByPlaceholderText('Cerca categoria / note')
    await userEvent.type(input, 'tax')

    const btn = screen.getByText('Applica filtro')
    await userEvent.click(btn)

    await waitFor(() => expect(capturedOr).not.toBeNull())
    expect(capturedOr).toContain('category.ilike.%tax%')
    expect(capturedOr).toContain('notes.ilike.%tax%')

    // Reset button should not exist anymore
    expect(screen.queryByText('Reset')).toBeNull()

    // layout sanity: on small screens the two buttons should be in the same row (we test by checking DOM order)
    const firstButton = screen.getByText('+ Spesa')
    const applyButton = screen.getByText('Applica filtro')
    expect(firstButton.compareDocumentPosition(applyButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0)
  })
})