import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator.js';
import type { Result } from '../common/interfaces/result.interface.js';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** Answers 200 when MongoDB replies to a ping, and 503 when it does not. */
  @Get()
  @ApiOperation({
    summary: 'Check the API and the database',
    description: 'Role: Public',
  })
  async check(@Res() res: Response) {
    const databaseUp = await this.pingDatabase();
    const result: Result = databaseUp
      ? {
          status: HttpStatus.OK,
          message: 'API is up',
          data: { status: 'ok', database: 'up' },
        }
      : {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database is down',
          data: { status: 'error', database: 'down' },
        };
    res.status(result.status).json(result);
  }

  private async pingDatabase(): Promise<boolean> {
    try {
      await this.connection.db?.admin().ping();
      return !!this.connection.db;
    } catch {
      return false;
    }
  }
}
