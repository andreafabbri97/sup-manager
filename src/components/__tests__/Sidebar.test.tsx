import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from '../Sidebar'
import TopBar from '../TopBar'

describe('Sidebar (mobile)', () => {
  test('hamburger opens and closes sidebar, backdrop closes and ESC closes', async () => {
    render(<><TopBar /><Sidebar onNav={() => {}} /></>)
    const user = userEvent.setup()

    const burger = screen.getByRole('button', { name: /Apri menu|Chiudi menu/i })
    expect(burger).toBeInTheDocument()

    // Open
    await user.click(burger)
    // Now we expect to find at least one close button (could be the hamburger toggled and the internal close)
    const closes = screen.getAllByRole('button', { name: /Chiudi menu/i })
    expect(closes.length).toBeGreaterThanOrEqual(1)

    // Click backdrop -> closes
    const backdrop = document.querySelector('[class*=bg-black]') as HTMLElement
    expect(backdrop).toBeTruthy()
    if (backdrop) await user.click(backdrop)
    expect(screen.queryByRole('button', { name: /Chiudi menu/i })).toBeNull()

    // Open and press ESC
    await user.click(burger)
    const closes2 = screen.getAllByRole('button', { name: /Chiudi menu/i })
    expect(closes2.length).toBeGreaterThanOrEqual(1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: /Chiudi menu/i })).toBeNull()
  })
})