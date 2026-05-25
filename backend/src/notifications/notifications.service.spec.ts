import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * Couvre :
 *   - create (passe data JSON et accepte un client tx optionnel)
 *   - list : pagination + total + unreadCount
 *   - markAsRead : update + idempotent si déjà lue
 *   - markAsRead/remove : NotFound si la notif appartient à un autre user
 *   - createIfNotSentSince : idempotent — ne crée pas si déjà envoyé
 */

interface FakeNotif {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

function makePrisma(seed: FakeNotif[] = []) {
  const store = [...seed];
  let counter = 0;

  return {
    notification: {
      create: jest.fn(({ data }: { data: Partial<FakeNotif> }) => {
        const n: FakeNotif = {
          id: `n-${++counter}`,
          userId: data.userId!,
          type: data.type!,
          title: data.title!,
          body: data.body!,
          data: data.data ?? null,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        };
        store.push(n);
        return Promise.resolve(n);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(store.find((n) => n.id === where.id) ?? null),
      ),
      findFirst: jest.fn(({ where }: any) => {
        const out = store.find(
          (n) =>
            n.userId === where.userId &&
            n.type === where.type &&
            (!where.createdAt || n.createdAt >= where.createdAt.gte),
        );
        return Promise.resolve(out ?? null);
      }),
      findMany: jest.fn(({ where, skip, take }: any) => {
        const out = store
          .filter((n) => n.userId === where.userId)
          .filter((n) => (where.isRead === false ? !n.isRead : true))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(skip, skip + take);
        return Promise.resolve(out);
      }),
      count: jest.fn(({ where }: any) => {
        const out = store
          .filter((n) => n.userId === where.userId)
          .filter((n) => (where.isRead === false ? !n.isRead : true));
        return Promise.resolve(out.length);
      }),
      update: jest.fn(({ where, data }: any) => {
        const n = store.find((x) => x.id === where.id);
        if (!n) throw new Error('not found');
        if (data.isRead !== undefined) n.isRead = data.isRead;
        if (data.readAt !== undefined) n.readAt = data.readAt;
        return Promise.resolve(n);
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        let count = 0;
        for (const n of store) {
          if (n.userId === where.userId && !n.isRead) {
            n.isRead = true;
            n.readAt = data.readAt;
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        const idx = store.findIndex((n) => n.id === where.id);
        if (idx >= 0) store.splice(idx, 1);
        return Promise.resolve({});
      }),
    },
    _store: store,
  };
}

async function buildService(prisma: ReturnType<typeof makePrisma>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      NotificationsService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return moduleRef.get(NotificationsService);
}

describe('NotificationsService.create', () => {
  it('crée une notification avec les bons champs', async () => {
    const prisma = makePrisma();
    const service = await buildService(prisma);

    const notif = await service.create({
      userId: 'u1',
      type: 'CONTRIBUTION_PAYMENT_RECEIVED' as any,
      title: 'Bob a cotisé',
      body: '5 000 ajoutés à « Vacances ».',
      data: { moneyPotId: 'pot-1' },
    });

    expect(notif.userId).toBe('u1');
    expect(notif.isRead).toBe(false);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('accepte un client de transaction explicite', async () => {
    const prisma = makePrisma();
    const service = await buildService(prisma);

    const txClient = {
      notification: { create: jest.fn(() => Promise.resolve({ id: 'tx-n' })) },
    } as any;

    await service.create(
      {
        userId: 'u1',
        type: 'AVATAR_UNLOCKED' as any,
        title: 't',
        body: 'b',
      },
      txClient,
    );

    expect(txClient.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.list', () => {
  it('renvoie items + total + unreadCount + pageCount', async () => {
    const now = Date.now();
    const prisma = makePrisma([
      mkNotif('n1', 'u1', false, now - 3000),
      mkNotif('n2', 'u1', true, now - 2000),
      mkNotif('n3', 'u1', false, now - 1000),
      mkNotif('n4', 'u2', false, now), // autre user
    ]);
    const service = await buildService(prisma);

    const result = await service.list('u1', { page: 1, limit: 10 } as any);

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.unreadCount).toBe(2);
    expect(result.pageCount).toBe(1);
  });

  it('filtre sur unreadOnly', async () => {
    const now = Date.now();
    const prisma = makePrisma([
      mkNotif('n1', 'u1', false, now - 1000),
      mkNotif('n2', 'u1', true, now),
    ]);
    const service = await buildService(prisma);

    const result = await service.list('u1', {
      page: 1,
      limit: 10,
      unreadOnly: true,
    } as any);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('n1');
  });
});

describe('NotificationsService.markAsRead', () => {
  it('marque comme lue + remplit readAt', async () => {
    const prisma = makePrisma([mkNotif('n1', 'u1', false, Date.now())]);
    const service = await buildService(prisma);

    const updated = await service.markAsRead('u1', 'n1');

    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeInstanceOf(Date);
  });

  it("renvoie tel quel si déjà lue (pas d'update)", async () => {
    const prisma = makePrisma([mkNotif('n1', 'u1', true, Date.now())]);
    const service = await buildService(prisma);

    await service.markAsRead('u1', 'n1');
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('jette NotFound si la notif appartient à un autre user', async () => {
    const prisma = makePrisma([mkNotif('n1', 'u2', false, Date.now())]);
    const service = await buildService(prisma);

    await expect(service.markAsRead('u1', 'n1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('NotificationsService.remove', () => {
  it('supprime la notif si elle appartient au user', async () => {
    const prisma = makePrisma([mkNotif('n1', 'u1', false, Date.now())]);
    const service = await buildService(prisma);

    await service.remove('u1', 'n1');
    expect(prisma._store).toHaveLength(0);
  });

  it('jette NotFound si la notif appartient à un autre user', async () => {
    const prisma = makePrisma([mkNotif('n1', 'u2', false, Date.now())]);
    const service = await buildService(prisma);

    await expect(service.remove('u1', 'n1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('NotificationsService.createIfNotSentSince', () => {
  it('crée si aucune notif du même type depuis sinceDate', async () => {
    const prisma = makePrisma();
    const service = await buildService(prisma);

    const created = await service.createIfNotSentSince(
      {
        userId: 'u1',
        type: 'DAILY_REMINDER' as any,
        title: 'Hey',
        body: 'cotise',
      },
      new Date(Date.now() - 24 * 3600_000),
    );

    expect(created).toBe(true);
    expect(prisma._store).toHaveLength(1);
  });

  it('ne crée pas si déjà envoyé après sinceDate', async () => {
    const recent: FakeNotif = {
      id: 'n1',
      userId: 'u1',
      type: 'DAILY_REMINDER',
      title: '',
      body: '',
      data: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };
    const prisma = makePrisma([recent]);
    const service = await buildService(prisma);

    const created = await service.createIfNotSentSince(
      {
        userId: 'u1',
        type: 'DAILY_REMINDER' as any,
        title: 'X',
        body: 'Y',
      },
      new Date(Date.now() - 3600_000),
    );

    expect(created).toBe(false);
    expect(prisma._store).toHaveLength(1); // toujours 1 — pas créé
  });
});

// ---------------------------------------------------------------------------
function mkNotif(
  id: string,
  userId: string,
  isRead: boolean,
  createdAtMs: number,
): FakeNotif {
  return {
    id,
    userId,
    type: 'CONTRIBUTION_PAYMENT_RECEIVED',
    title: 't',
    body: 'b',
    data: null,
    isRead,
    readAt: isRead ? new Date(createdAtMs) : null,
    createdAt: new Date(createdAtMs),
  };
}
