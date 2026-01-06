import React from 'react'
import { render, screen } from '@testing-library/react'
import TimesheetPage from './Timesheet'

test('renders Turni page heading', () => {
  render(<TimesheetPage />)
  expect(screen.getByRole('heading', { name: /Turni/i })).toBeTruthy()
})
