import { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@skribbl/shared'

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>
