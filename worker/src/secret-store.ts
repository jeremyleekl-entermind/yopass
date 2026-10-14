import { DurableObject } from 'cloudflare:workers';

export interface StoredSecret {
  message: string;
  expiration: number;
  one_time: boolean;
  expires_at: number; // epoch ms
}

export interface SecretStatus {
  oneTime: boolean;
  requireAuth: boolean;
}

const KEY = 'secret';

// One Durable Object per secret ID. A Durable Object handles one event at a
// time and storage reads/deletes below are synchronous, so the claim on a
// one-time secret cannot interleave with a second read: exactly one reader
// gets it. An alarm at the expiry time removes the data; reads also check the
// deadline in case the alarm has not fired yet.
export class SecretStore extends DurableObject {
  private current(): StoredSecret | undefined {
    const secret = this.ctx.storage.kv.get<StoredSecret>(KEY);
    if (secret && secret.expires_at <= Date.now()) {
      this.ctx.storage.kv.delete(KEY);
      return undefined;
    }
    return secret;
  }

  async create(secret: StoredSecret): Promise<boolean> {
    if (this.ctx.storage.kv.get(KEY) !== undefined) return false;
    this.ctx.storage.kv.put(KEY, secret);
    await this.ctx.storage.setAlarm(secret.expires_at);
    return true;
  }

  async read(): Promise<StoredSecret | null> {
    const secret = this.current();
    if (!secret) return null;
    if (secret.one_time) {
      this.ctx.storage.kv.delete(KEY);
      await this.ctx.storage.deleteAll();
    }
    return secret;
  }

  status(): SecretStatus | null {
    const secret = this.current();
    return secret ? { oneTime: secret.one_time, requireAuth: false } : null;
  }

  async remove(): Promise<boolean> {
    if (!this.current()) return false;
    this.ctx.storage.kv.delete(KEY);
    await this.ctx.storage.deleteAll();
    return true;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
