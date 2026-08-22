import { Module } from '@nestjs/common'
import { IngestionService } from './ingestion.service'
import { PdfTextService } from './pdf-text.service'

@Module({
  providers: [IngestionService, PdfTextService],
  exports: [IngestionService],
})
export class IngestionModule {}
