'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FaGoogle } from 'react-icons/fa'
import LogoMark from '@/components/LogoMark'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setErrorMsg('')
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con Google Auth')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans p-4">
      {/* Contenedor Principal Plano y Corporativo */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-md">
        
        {/* Logo Minimalista */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark className="w-9 h-9" />
          <span className="text-xl font-bold tracking-tight text-slate-100">
            Arca<span className="text-emerald-500">Finanzas</span>
          </span>
        </div>

        {/* Título de la Sección */}
        <h1 className="text-xl font-bold text-slate-100 text-center mb-1">
          Iniciar Sesión
        </h1>
        <p className="text-slate-400 text-xs text-center mb-8">
          Accede de forma segura utilizando tu cuenta de Google.
        </p>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-xs rounded-md text-center">
            {errorMsg}
          </div>
        )}

        {/* Botón de Google Real */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-md font-bold text-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Conectando...</span>
            </div>
          ) : (
            <>
              <FaGoogle className="w-4 h-4 text-red-500" />
              <span>Entrar con Google</span>
            </>
          )}
        </button>

        {/* Pie de página sutil */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-[10px] text-center text-slate-500">
          Esta aplicación utiliza Supabase Auth para verificar tu sesión mediante tokens JWT firmados.
        </div>
      </div>
    </div>
  )
}
