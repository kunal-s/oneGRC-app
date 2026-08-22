import { Global, Module } from '@nestjs/common'
import { IdAllocator } from '@onegrc/domain'
import { PrismaSequenceSource } from './prisma-sequence-source'

@Global()
@Module({
  providers: [
    PrismaSequenceSource,
    {
      provide: IdAllocator,
      useFactory: (source: PrismaSequenceSource) => new IdAllocator(source),
      inject: [PrismaSequenceSource],
    },
  ],
  exports: [IdAllocator, PrismaSequenceSource],
})
export class IdsModule {}
