import { Module } from '@nestjs/common';
import { QuotesModule } from './quotes/quotes.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [StoreModule, QuotesModule],
})
export class AppModule {}
