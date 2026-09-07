import { Global, Module } from '@nestjs/common'
import { PdfTextService } from '../../ingestion/pdf-text.service'
import { DocumentStoreService } from './document-store.service'
import { FileIntakeService } from './file-intake.service'
import { FILE_SCANNER, StructuralFileScanner } from './file-scanner'

/**
 * `PdfTextService` is provided here too, alongside `IngestionModule`'s own
 * copy: it has no constructor dependencies of its own, so a second instance
 * costs nothing and this module stays free to be global without importing
 * ingestion's module graph.
 */
@Global()
@Module({
  providers: [
    DocumentStoreService,
    FileIntakeService,
    PdfTextService,
    { provide: FILE_SCANNER, useClass: StructuralFileScanner },
  ],
  exports: [DocumentStoreService, FileIntakeService, FILE_SCANNER],
})
export class DocumentsModule {}
