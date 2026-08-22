import { Global, Module } from '@nestjs/common'
import { DocumentStoreService } from './document-store.service'

@Global()
@Module({
  providers: [DocumentStoreService],
  exports: [DocumentStoreService],
})
export class DocumentsModule {}
