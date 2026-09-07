import { Injectable } from '@nestjs/common'

export interface ScanResult {
  clean: boolean
  /** Why it failed. Never set when clean is true. */
  reason?: string
}

/**
 * One port, behind which a scanner implementation sits (FIL-011), the way
 * `EnrichmentProvider` sits behind ENG-11.
 */
export interface FileScanner {
  /** Reported on the health endpoint and in the drawer (SCR-100-035). */
  readonly name: string
  /** The sentence a person reads to know what they got. */
  readonly description: string
  scan(bytes: Buffer): Promise<ScanResult>
}

export const FILE_SCANNER = Symbol('FILE_SCANNER')

const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

/**
 * FIL-013: the default where no scanner is configured. Structural checks
 * only: the type, size and zero-byte checks already ran by the time this is
 * called (FIL-005, FIL-006, FIL-008), so the one thing left this can honestly
 * add is the EICAR test signature. It is not a malware scanner and says so,
 * on the health endpoint and in the drawer, rather than simulating one
 * quietly.
 *
 * FIL-012's ClamAV adapter is deferred at this session's direction (DN-039,
 * D-055): a local scanning daemon is a real dependency to stand up and prove
 * against, and building it unverified would be simulating it quietly, the
 * one thing FIL-013 exists to avoid. Raised as ER-017 for a future slice.
 * This port is what lets that adapter be added later without touching a
 * caller.
 */
@Injectable()
export class StructuralFileScanner implements FileScanner {
  readonly name = 'structural'
  readonly description = 'Structural checks only. No malware scanner is configured.'

  async scan(bytes: Buffer): Promise<ScanResult> {
    if (bytes.includes(Buffer.from(EICAR_SIGNATURE, 'ascii'))) {
      return { clean: false, reason: 'matches the EICAR antivirus test signature' }
    }
    return { clean: true }
  }
}
