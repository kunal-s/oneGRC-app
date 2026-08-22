import { SetMetadata } from '@nestjs/common'
import { PUBLIC_ROUTE } from './actor.guard'

/** Marks a route as reachable without a session. Use sparingly. */
export const Public = () => SetMetadata(PUBLIC_ROUTE, true)
