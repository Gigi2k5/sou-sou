import { Module } from '@nestjs/common';

import { GeminiService } from './gemini.service';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  controllers: [ImportController],
  providers: [ImportService, GeminiService],
  exports: [ImportService],
})
export class ImportModule {}
