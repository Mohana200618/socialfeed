import React from 'react'

function Example({ title, children }) {
  return (
    <div className="example-component">
      <h2>{title}</h2>
      <div className="content">
        {children}
      </div>
    </div>
  )
}

export default Example
