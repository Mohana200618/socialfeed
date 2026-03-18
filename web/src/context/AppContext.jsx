import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    theme: 'light'
  })

  const value = {
    state,
    setState
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
