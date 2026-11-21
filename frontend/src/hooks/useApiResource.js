import { useCallback, useEffect, useState } from 'react'

export default function useApiResource(fetcher, initialData = []) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetcher()
      setData(response?.data?.data ?? response?.data ?? initialData)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load data. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    data,
    setData,
    loading,
    error,
    reload,
  }
}
