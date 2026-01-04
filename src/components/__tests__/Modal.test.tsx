import React from 'react'
import { render } from '@testing-library/react'
import Modal from '../ui/Modal'

describe('Modal', () => {
  it('renders content and matches snapshot', () => {
    const { container } = render(<Modal isOpen={true} onClose={()=>{}} title="Test Modal"><div>Contenuto</div></Modal>)
    expect(container).toMatchSnapshot()
  })
})
