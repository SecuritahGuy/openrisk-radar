export interface PushQueueMessage {
  deliveryId: string;
}

export interface WatchAuditQueueMessage {
  watchAuditJobId: string;
}

export type WorkerQueueMessage = PushQueueMessage | WatchAuditQueueMessage;

export interface WorkerQueueBinding {
  send(message: WorkerQueueMessage): Promise<void>;
  sendBatch?(messages: Array<{ body: WorkerQueueMessage }>): Promise<void>;
}

export function isWatchAuditQueueMessage(
  message: WorkerQueueMessage
): message is WatchAuditQueueMessage {
  return "watchAuditJobId" in message;
}
