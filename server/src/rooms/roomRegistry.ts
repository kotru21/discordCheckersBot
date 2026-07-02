import { CheckersRoom } from "./checkersRoom";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

interface RoomEntry {
  room: CheckersRoom;
  lastActiveAt: number;
}

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomEntry>();

  constructor() {
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref();
  }

  get(instanceId: string): CheckersRoom {
    const existing = this.rooms.get(instanceId);
    if (existing) {
      existing.lastActiveAt = Date.now();
      return existing.room;
    }

    const room = new CheckersRoom(instanceId);
    this.rooms.set(instanceId, { room, lastActiveAt: Date.now() });
    return room;
  }

  touch(instanceId: string): void {
    const entry = this.rooms.get(instanceId);
    if (entry) {
      entry.lastActiveAt = Date.now();
    }
  }

  sweep(): void {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [instanceId, entry] of this.rooms) {
      if (entry.lastActiveAt < cutoff) {
        this.rooms.delete(instanceId);
      }
    }
  }
}
