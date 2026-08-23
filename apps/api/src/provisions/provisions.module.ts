import { Module } from "@nestjs/common"
import { ProvisionsController } from "./provisions.controller"

@Module({ controllers: [ProvisionsController] })
export class ProvisionsModule {}
