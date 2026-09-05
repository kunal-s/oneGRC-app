import { Module } from '@nestjs/common'
import { LadderModule } from '../core/ladder/ladder.module'
import { ChainController } from './chain.controller'
import { ChainService } from './chain.service'

@Module({ imports: [LadderModule], controllers: [ChainController], providers: [ChainService] })
export class ChainModule {}
