import { PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTour } from './TourProvider'

/**
 * The single entry point into the guided tour. Same copy for every persona, so
 * the affordance reads identically whoever is signed in.
 */
export function StartTourButton({ className }: { className?: string }) {
  const { start, active, steps } = useTour()
  if (steps.length === 0 || active) return null
  return (
    <Button variant="outline" size="sm" className={className} onClick={start}>
      <PlayCircle className="size-4" /> Start guided tour
    </Button>
  )
}
