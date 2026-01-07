import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PayrollPage from '../Payroll'
import * as payrollLib from '../../lib/payroll'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/auth', () => ({ getCurrentUserRole: vi.fn().mockResolvedValue('admin'), getCurrentUserId: vi.fn() }))

describe('Payroll page -> create expenses flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls RPC and hides payroll run after creating expenses', async () => {
    // Mock a last payroll run unpaid
    const mockRun = { id: 'run-1', name: 'Paga periodo dal 05/01/2026 al 07/01/2026', total_amount: 40, paid: false }

    // Unified mock for supabase.from(...) to handle select and update chains
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'payroll_runs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  single: async () => ({ data: mockRun, error: null })
                })
              })
            })
          }),
          update: (_payload: any) => ({ eq: async () => ({ error: null }) })
        } as any
      }

      if (table === 'payroll_items') {
        return {
          select: () => ({ eq: () => ({ limit: async () => ({ data: [{ expense_created: false }], error: null }) }) })
        } as any
      }

      if (table === 'employees') {
        return {
          select: () => ({ order: async () => ({ data: [], error: null }) })
        } as any
      }

      // Fallback stub
      return { select: async () => ({ data: [], error: null }) } as any
    })

    // Mock RPC
    const rpcSpy = vi.spyOn(payrollLib, 'createExpensesFromPayrollRun').mockResolvedValue(null as any)

    render(<PayrollPage />)

    // Wait for the run card to be visible
    expect(await screen.findByText(mockRun.name)).toBeTruthy()

    const btn = screen.getByText('Aggiungi alle spese')
    await userEvent.click(btn)

    await waitFor(() => expect(rpcSpy).toHaveBeenCalledWith(mockRun.id))

    // After creation the run card should be hidden (lastRunName cleared)
    await waitFor(() => expect(screen.queryByText(mockRun.name)).toBeNull())
  })
})