import React from 'react'
import { render, screen } from '@testing-library/react'
import Bookings from '../Bookings'

describe('Bookings', () => {
  it('renders booking page snapshot', () => {
    const { container } = render(<Bookings />)
    expect(container).toMatchSnapshot()
  })
})
