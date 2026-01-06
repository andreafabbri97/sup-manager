import React from 'react'
import { render, screen } from '@testing-library/react'
import PayrollPage from './Payroll'

test('renders Paghe page heading', () => {
  render(<PayrollPage />)
  expect(screen.getByRole('heading', { name: /Paghe/i })).toBeTruthy()
})
