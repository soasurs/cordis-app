import { createClient } from '@connectrpc/connect'

import { UserService } from '@/gen/api/v1/user_pb'

import { apiTransport } from '@/api/client'

export const relationshipClient = createClient(UserService, apiTransport)
