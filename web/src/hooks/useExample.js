import { useState, useEffect } from 'react'

/**
 * Example custom hook
 */
export function useExample(initialValue) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    // Example effect
    console.log('Value changed:', value)
  }, [value])

  return [value, setValue]
}
