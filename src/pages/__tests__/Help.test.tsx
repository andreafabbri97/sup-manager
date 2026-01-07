import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpPage from '../Help'
import * as auth from '../../lib/auth'

vi.mock('../../lib/auth', () => ({
  getCurrentUserRole: vi.fn()
}))

describe('Help page role-aware sections', () => {
  it('shows admin sections for admin', async () => {
    (auth.getCurrentUserRole as any).mockResolvedValue('admin')
    render(<HelpPage />)
    // wait for effect to set role
    await waitFor(() => expect(auth.getCurrentUserRole).toHaveBeenCalled())
    // switch to Operativa tab using userEvent (wraps in act)
    const tabBtn = screen.getByText('Guida operativa')
    await userEvent.click(tabBtn)
    expect(await screen.findByText(/Gestire utenti/)).toBeTruthy()
  })

  it('does not show admin sections for staff', async () => {
    (auth.getCurrentUserRole as any).mockResolvedValue('staff')
    render(<HelpPage />)
    await waitFor(() => expect(auth.getCurrentUserRole).toHaveBeenCalled())
    // switch to Operativa tab using userEvent (wraps in act)
    const tabBtn = screen.getByText('Guida operativa')
    await userEvent.click(tabBtn)
    // admin-only section should not be present
    await waitFor(() => expect(screen.queryByText(/Gestire utenti/)).toBeNull())
  })
})
