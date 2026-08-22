import { Module } from '@nestjs/common'
import { InstrumentService } from './instrument.service'

@Module({
  providers: [InstrumentService],
  exports: [InstrumentService],
})
export class InstrumentsModule {}
