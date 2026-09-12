import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareDatabase } from '../../src/config/database-indexes.js';
import * as models from '../../src/models/index.js';

describe('production database preparation', () => {
  const originalDatabase = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');
  const command = vi.fn();

  beforeEach(() => {
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      value: { admin: () => ({ command }) },
    });
    command.mockResolvedValue({ setName: 'test-replica' });
    for (const model of Object.values(models)) {
      vi.spyOn(model, 'createIndexes').mockResolvedValue(undefined);
    }
  });

  afterEach(() => {
    if (originalDatabase) Object.defineProperty(mongoose.connection, 'db', originalDatabase);
    else Reflect.deleteProperty(mongoose.connection, 'db');
    vi.restoreAllMocks();
    command.mockReset();
  });

  it('creates every registered model index without dropping existing indexes', async () => {
    await prepareDatabase();
    expect(command).toHaveBeenCalledWith({ hello: 1 });
    expect(
      Object.values(models)
        .map((model) => model.modelName)
        .sort(),
    ).toEqual(mongoose.modelNames().sort());
    for (const model of Object.values(models)) expect(model.createIndexes).toHaveBeenCalledOnce();
  });

  it('accepts a sharded cluster', async () => {
    command.mockResolvedValue({ msg: 'isdbgrid' });
    await expect(prepareDatabase()).resolves.toBeUndefined();
  });

  it('rejects a standalone database before building indexes', async () => {
    command.mockResolvedValue({ isWritablePrimary: true });
    await expect(prepareDatabase()).rejects.toThrow('requires a MongoDB replica set');
    for (const model of Object.values(models)) expect(model.createIndexes).not.toHaveBeenCalled();
  });

  it('requires an active database connection', async () => {
    Object.defineProperty(mongoose.connection, 'db', { configurable: true, value: undefined });
    await expect(prepareDatabase()).rejects.toThrow('Connect to MongoDB');
    expect(command).not.toHaveBeenCalled();
  });

  it('does not hide failed index creation', async () => {
    vi.mocked(models.UserModel.createIndexes).mockRejectedValue(new Error('Duplicate email'));
    await expect(prepareDatabase()).rejects.toThrow('Duplicate email');
  });
});
