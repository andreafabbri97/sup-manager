import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PayrollPage from '../Payroll'
import * as payrollLib from '../../lib/payroll'
import * as auth from '../../lib/auth'

vi.mock('../../lib/auth', () => ({ getCurrentUserRole: vi.fn().mockResolvedValue('admin'), getCurrentUserId: vi.fn() }))

describe('Payroll calculate shows aggregated employees', () => {
  it('renders employee aggregates after calculate', async () => {
    const sample = {
      totals: { total_hours: 4, total_amount: 80 },
      items: [
        { shift_id: 's1', employee_id: 'a', employee_name: 'A', start_at: new Date('2026-01-05T10:00:00Z'), end_at: new Date('2026-01-05T11:00:00Z'), duration_hours: 1, hours_paid: 1, rate: 20, amount: 20 },
        { shift_id: 's2', employee_id: 'a', employee_name: 'A', start_at: new Date('2026-01-07T10:00:00Z'), end_at: new Date('2026-01-07T11:00:00Z'), duration_hours: 1, hours_paid: 1, rate: 20, amount: 20 },
        { shift_id: 's3', employee_id: 'b', employee_name: 'B', start_at: new Date('2026-01-05T10:00:00Z'), end_at: new Date('2026-01-05T11:00:00Z'), duration_hours: 1, hours_paid: 1, rate: 20, amount: 20 },
        { shift_id: 's4', employee_id: 'b', employee_name: 'B', start_at: new Date('2026-01-07T10:00:00Z'), end_at: new Date('2026-01-07T11:00:00Z'), duration_hours: 1, hours_paid: 1, rate: 20, amount: 20 }
      ],
      employees: [
        { employee_id: 'a', employee_name: 'A', total_hours: 2, total_amount: 40 },
        { employee_id: 'b', employee_name: 'B', total_hours: 2, total_amount: 40 }
      ]
    }

    const calcSpy = vi.spyOn(payrollLib, 'calculatePayroll').mockResolvedValue(sample as any)

    render(<PayrollPage />)

    // wait for role resolution (component loads role asynchronously)
    await waitFor(() => expect(auth.getCurrentUserRole).toHaveBeenCalled())

    const btn = await screen.findByText('Calcola')
    await userEvent.click(btn)

    await waitFor(() => expect(calcSpy).toHaveBeenCalled())

    expect(await screen.findByText('Totali per dipendente')).toBeTruthy()

    // There should be two aggregated entries (A and B)
    const aggHours = screen.getAllByText(/Ore totali:/)
    expect(aggHours.length).toBe(2)

    // Aggregated amounts should appear inline (at least one of them should equal Importo totale: 40.00€)
    const amounts = screen.getAllByText(/Importo totale:\s*40\.00\s*€/)
    expect(amounts.length).toBeGreaterThanOrEqual(1)
  })
})