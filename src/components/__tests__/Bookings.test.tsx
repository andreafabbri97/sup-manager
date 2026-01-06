import React from 'react'
import { render, screen } from '@testing-library/react'
import Bookings from '../Bookings'

describe('Bookings', () => {
  it('renders booking page heading and helper text', () => {
    render(<Bookings />)
    expect(screen.getByText(/Prenotazioni/)).toBeTruthy()
    expect(screen.getByText(/Gestisci le prenotazioni della tua attrezzatura/)).toBeTruthy()
  })
})
