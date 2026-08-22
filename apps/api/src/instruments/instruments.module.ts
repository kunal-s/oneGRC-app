import { Module } from '@nestjs/common'
import { InstrumentsController } from "./instruments.controller"
import { InstrumentService } from './instrument.service'

@Module({
  controllers: [InstrumentsController],
  providers: [InstrumentService],
  exports: [InstrumentService],
})
export class InstrumentsModule {}
