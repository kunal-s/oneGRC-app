import { Module } from '@nestjs/common'
import { ClausesController } from './clauses.controller'

@Module({ controllers: [ClausesController] })
export class ClausesModule {}
