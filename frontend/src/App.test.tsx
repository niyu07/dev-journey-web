import { render, screen } from '@testing-library/react'
import App from './App'

test('renders frontend + backend heading', () => {
  render(<App />)
  expect(screen.getByText(/Frontend \+ Backend/i)).toBeInTheDocument()
})