import { createClient } from '@connectrpc/connect'

import { GuildService } from '@/gen/api/v1/guild_pb'

import { apiTransport } from '@/api/client'

export const guildClient = createClient(GuildService, apiTransport)
