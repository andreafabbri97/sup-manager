import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PayrollPage from '../Payroll'
import * as payrollLib from '../../lib/payroll'
import * as auth from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/auth', () => ({ getCurrentUserRole: vi.fn().mockResolvedValue('admin'), getCurrentUserId: vi.fn() }))

describe('Payroll create run respects employee filter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // ensure auth.getCurrentUserRole still returns admin after reset
    // ensure getCurrentUserRole returns admin after reset
    vi.spyOn(auth, 'getCurrentUserRole').mockResolvedValue('admin')

    // stub employees list and basic rpc/from chains used on mount
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'employees') {
        return { select: () => ({ order: async () => ({ data: [{ id: 'emp-1', name: 'Alice' }, { id: 'emp-2', name: 'Bob' }], error: null }) }) } as any
      }
      if (table === 'payroll_runs') {
        return {
          select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ single: async () => ({ data: null, error: null }) }) }) }) })
        } as any
      }
      if (table === 'payroll_items') {
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) } as any
      }
      return { select: async () => ({ data: [], error: null }) } as any
    })
  })

  it('passes selected employee id to createPayrollRun', async () => {
    const createSpy = vi.spyOn(payrollLib, 'createPayrollRun').mockResolvedValue([{ payroll_run_id: 'r1' }] as any)

    render(<PayrollPage />)

    // wait for role resolution and UI update (create button appears for admin)
    await waitFor(() => expect(auth.getCurrentUserRole).toHaveBeenCalled())
    const createBtn = await screen.findByText('Crea payroll run')

    // select employee: find the first combobox on the page (employee select)
    const selects = screen.getAllByRole('combobox')
    const select = selects.length > 1 ? selects[1] : selects[0]
    await userEvent.selectOptions(select, 'emp-1')

    // click create run
    const btn = createBtn
    const confSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(btn)
    confSpy.mockRestore()

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String), undefined, undefined, expect.any(String), 'emp-1')
  })
})