import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let healthController: HealthController;
  const ping = vi.fn();

  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });

  beforeEach(async () => {
    ping.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getConnectionToken(),
          useValue: { db: { admin: () => ({ ping }) } },
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('sends status ok when the database answers', async () => {
    ping.mockResolvedValue({ ok: 1 });
    const res = makeRes();

    await healthController.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 200,
      message: 'API is up',
      data: { status: 'ok', database: 'up' },
    });
  });

  it('sends 503 when the database does not answer', async () => {
    ping.mockRejectedValue(new Error('timeout'));
    const res = makeRes();

    await healthController.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: 503,
      message: 'Database is down',
      data: { status: 'error', database: 'down' },
    });
  });
});
