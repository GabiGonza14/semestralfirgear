import { useEffect, useState } from 'react'
import { getCategories } from '../api/fitgearApi'
import { WordMarquee } from './WordMarquee'

// Fetches category names from the DB and hands them to the shared
// WordMarquee strip.
export function Marquee() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let active = true

    void getCategories()
      .then((result) => {
        if (active) {
          setCategories(result.map((category) => category.name))
        }
      })
      .catch(() => {
        if (active) {
          setCategories([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  return <WordMarquee words={categories} />
}
