import { Module } from '@nestjs/common';
import { TenantGuard } from '../common/tenant.guard';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, TenantGuard],
})
export class QuotesModule {}
