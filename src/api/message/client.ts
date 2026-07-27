import { createClient } from '@connectrpc/connect'

import { MessageService } from '@/gen/api/v1/message_pb'

import { apiTransport } from '@/api/client'

export const messageClient = createClient(MessageService, apiTransport)
