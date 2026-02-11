import * as signalR from "@microsoft/signalr";

export interface UserPresence {
  connectionId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
}

type UsersChangedCallback = (users: UserPresence[]) => void;

let connection: signalR.HubConnection | null = null;
let currentDocumentId: string | null = null;
let connectedUsers: UserPresence[] = [];
let onUsersChanged: UsersChangedCallback | null = null;

// @ts-ignore - Vite env
const API_URL = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

/**
 * Connect to the document presence hub.
 */
export async function connectPresence(): Promise<void> {
  if (connection) return;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/document`)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // Handle events from server
  connection.on("UserJoined", (presence: UserPresence) => {
    connectedUsers = [...connectedUsers.filter(u => u.userId !== presence.userId), presence];
    onUsersChanged?.(connectedUsers);
  });

  connection.on("UserLeft", (userId: string) => {
    connectedUsers = connectedUsers.filter(u => u.userId !== userId);
    onUsersChanged?.(connectedUsers);
  });

  connection.on("CurrentUsers", (users: UserPresence[]) => {
    connectedUsers = users;
    onUsersChanged?.(connectedUsers);
  });

  connection.onreconnected(async () => {
    // Rejoin the document after reconnect
    if (currentDocumentId) {
      await joinDocument(currentDocumentId, "User", undefined);
    }
  });

  try {
    await connection.start();
  } catch (error) {
    console.warn("Failed to connect to presence hub:", error);
    connection = null;
  }
}

/**
 * Join a document room to track presence.
 */
export async function joinDocument(
  documentId: string,
  displayName: string,
  avatarUrl?: string
): Promise<void> {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    await connectPresence();
  }

  if (currentDocumentId) {
    await leaveDocument();
  }

  currentDocumentId = documentId;

  try {
    await connection?.invoke("JoinDocument", documentId, displayName, avatarUrl ?? null);
  } catch (error) {
    console.warn("Failed to join document:", error);
  }
}

/**
 * Leave the current document room.
 */
export async function leaveDocument(): Promise<void> {
  if (!connection || !currentDocumentId) return;

  try {
    await connection.invoke("LeaveDocument", currentDocumentId);
  } catch (error) {
    console.warn("Failed to leave document:", error);
  }

  currentDocumentId = null;
  connectedUsers = [];
  onUsersChanged?.(connectedUsers);
}

/**
 * Disconnect from the presence hub entirely.
 */
export async function disconnectPresence(): Promise<void> {
  if (currentDocumentId) {
    await leaveDocument();
  }

  if (connection) {
    await connection.stop();
    connection = null;
  }
}

/**
 * Register a callback for when the connected users list changes.
 */
export function onPresenceChanged(callback: UsersChangedCallback): () => void {
  onUsersChanged = callback;
  // Immediately call with current state
  callback(connectedUsers);

  return () => {
    if (onUsersChanged === callback) {
      onUsersChanged = null;
    }
  };
}

/**
 * Get the current list of connected users.
 */
export function getConnectedUsers(): UserPresence[] {
  return connectedUsers;
}

/**
 * Check if connected to the presence hub.
 */
export function isConnected(): boolean {
  return connection?.state === signalR.HubConnectionState.Connected;
}
