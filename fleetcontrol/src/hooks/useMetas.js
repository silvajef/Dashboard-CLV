import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { METAS_DEFAULT } from '../lib/constants'

export function useMetas() {
  const [metas,   setMetas]   = useState(METAS_DEFAULT)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('metas')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) setMetas(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const saveMetas = async (novasMetas) => {
    const { data, error } = await supabase
      .from('metas')
      .upsert({ id: 1, ...novasMetas })
      .select()
      .single()
    if (error) throw error
    setMetas(data)
    return data
  }

  return { metas, loading, saveMetas }
}
