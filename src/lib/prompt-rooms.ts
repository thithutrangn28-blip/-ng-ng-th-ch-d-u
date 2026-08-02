import { getRoomCatalog, getAllRoomCatalogs, validateRoomCatalog, RoomCatalog, RoomTask, roomMetadata } from "./room-tasks-catalog";

export { getRoomCatalog, getAllRoomCatalogs, validateRoomCatalog, type RoomCatalog, type RoomTask };

export const rooms = roomMetadata.map(r => [r.name, r.purpose]);

export function getTasks(roomIndex: number): RoomTask[] {
  const catalog = getRoomCatalog(roomIndex);
  return catalog.tasks;
}

