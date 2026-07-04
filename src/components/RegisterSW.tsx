'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado con éxito: ', registration.scope)
          })
          .catch((error) => {
            console.error('Fallo al registrar el Service Worker: ', error)
          })
      })
    }
  }, [])

  return null
}
