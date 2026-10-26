// MongoDB Initialization Script
// Runs on first MongoDB startup to create indexes and initial data

// Switch to the application database
db = db.getSiblingDB('stellarsentry');

// Create collections with validation
db.createCollection('guilds', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId'],
      properties: {
        guildId: { bsonType: 'string' },
        name: { bsonType: 'string' },
        features: { bsonType: 'object' },
        moderation: { bsonType: 'object' },
        welcome: { bsonType: 'object' },
        leveling: { bsonType: 'object' },
        economy: { bsonType: 'object' },
        tickets: { bsonType: 'object' },
        reactionRoles: { bsonType: 'object' },
        giveaways: { bsonType: 'object' },
        suggestions: { bsonType: 'object' },
        starboard: { bsonType: 'object' },
        music: { bsonType: 'object' },
        logging: { bsonType: 'object' },
      },
    },
  },
});

db.createCollection('members', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'userId'],
      properties: {
        guildId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        leveling: { bsonType: 'object' },
        economy: { bsonType: 'object' },
        inventory: { bsonType: 'array' },
        warnings: { bsonType: 'array' },
      },
    },
  },
});

db.createCollection('warnings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'userId', 'moderatorId', 'caseNumber', 'reason'],
      properties: {
        guildId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        moderatorId: { bsonType: 'string' },
        caseNumber: { bsonType: 'int' },
        reason: { bsonType: 'string' },
        severity: { bsonType: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  },
});

db.createCollection('tickets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'channelId', 'userId', 'status'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        claimedBy: { bsonType: 'string' },
        status: { bsonType: 'string', enum: ['open', 'closed', 'claimed'] },
        reason: { bsonType: 'string' },
      },
    },
  },
});

db.createCollection('shopitems', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'name', 'price'],
      properties: {
        guildId: { bsonType: 'string' },
        itemId: { bsonType: 'string' },
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        price: { bsonType: 'int', minimum: 1 },
        roleId: { bsonType: 'string' },
        stock: { bsonType: 'int' },
        maxPerUser: { bsonType: 'int', minimum: 1 },
        sold: { bsonType: 'int', minimum: 0 },
        hidden: { bsonType: 'bool' },
      },
    },
  },
});

db.createCollection('reactionroles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'channelId', 'messageId'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        messageId: { bsonType: 'string' },
        title: { bsonType: 'string' },
        description: { bsonType: 'string' },
        roles: { bsonType: 'array' },
      },
    },
  },
});

db.createCollection('reminders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'userId', 'message', 'remindAt'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        message: { bsonType: 'string' },
        remindAt: { bsonType: 'date' },
        dm: { bsonType: 'bool' },
        sent: { bsonType: 'bool' },
      },
    },
  },
});

db.createCollection('giveaways', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'channelId', 'messageId', 'hostId', 'prize', 'winners', 'endsAt', 'status'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        messageId: { bsonType: 'string' },
        hostId: { bsonType: 'string' },
        prize: { bsonType: 'string' },
        winners: { bsonType: 'int', minimum: 1 },
        endsAt: { bsonType: 'date' },
        status: { bsonType: 'string', enum: ['scheduled', 'active', 'ended', 'cancelled', 'rerolled'] },
        requirements: { bsonType: 'object' },
        entries: { bsonType: 'array' },
        entryCount: { bsonType: 'int', minimum: 0 },
        blacklistedRoles: { bsonType: 'array' },
      },
    },
  },
});

db.createCollection('starboardentries', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'channelId', 'messageId', 'starboardMessageId', 'authorId'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        messageId: { bsonType: 'string' },
        starboardMessageId: { bsonType: 'string' },
        authorId: { bsonType: 'string' },
        starCount: { bsonType: 'int', minimum: 0 },
        starredBy: { bsonType: 'array' },
        content: { bsonType: 'string' },
        embeds: { bsonType: 'array' },
        attachments: { bsonType: 'array' },
        locked: { bsonType: 'bool' },
        deleted: { bsonType: 'bool' },
      },
    },
  },
});

db.createCollection('suggestions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'channelId', 'messageId', 'authorId', 'title', 'content', 'status'],
      properties: {
        guildId: { bsonType: 'string' },
        channelId: { bsonType: 'string' },
        messageId: { bsonType: 'string' },
        authorId: { bsonType: 'string' },
        title: { bsonType: 'string' },
        content: { bsonType: 'string' },
        anonymous: { bsonType: 'bool' },
        status: { bsonType: 'string', enum: ['pending', 'approved', 'denied', 'considered', 'implemented', 'archived'] },
        votes: { bsonType: 'object' },
        reviewedBy: { bsonType: 'string' },
        reviewedAt: { bsonType: 'date' },
        reviewReason: { bsonType: 'string' },
        reviewNotes: { bsonType: 'string' },
        implementedBy: { bsonType: 'string' },
        implementedAt: { bsonType: 'date' },
        implementationNotes: { bsonType: 'string' },
        threadId: { bsonType: 'string' },
      },
    },
  },
});

db.createCollection('auditlogs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['guildId', 'eventType', 'eventCategory'],
      properties: {
        guildId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        moderatorId: { bsonType: 'string' },
        eventType: { bsonType: 'string' },
        eventCategory: { bsonType: 'string' },
        reason: { bsonType: 'string' },
        caseNumber: { bsonType: 'int' },
        data: { bsonType: 'object' },
        severity: { bsonType: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  },
});

// Create indexes
db.guilds.createIndex({ guildId: 1 }, { unique: true });
db.guilds.createIndex({ 'features.automod': 1 });
db.guilds.createIndex({ 'features.welcome': 1 });
db.guilds.createIndex({ 'features.leveling': 1 });
db.guilds.createIndex({ 'features.economy': 1 });
db.guilds.createIndex({ 'features.tickets': 1 });
db.guilds.createIndex({ 'features.reactionRoles': 1 });
db.guilds.createIndex({ 'features.giveaways': 1 });
db.guilds.createIndex({ 'features.suggestions': 1 });
db.guilds.createIndex({ 'features.starboard': 1 });
db.guilds.createIndex({ 'features.music': 1 });
db.guilds.createIndex({ 'features.logging': 1 });

db.members.createIndex({ guildId: 1, userId: 1 }, { unique: true });
db.members.createIndex({ 'leveling.xp': -1 });
db.members.createIndex({ 'economy.netWorth': -1 });

db.warnings.createIndex({ guildId: 1, userId: 1 });
db.warnings.createIndex({ caseNumber: 1 });
db.warnings.createIndex({ createdAt: -1 });

db.tickets.createIndex({ guildId: 1, status: 1 });
db.tickets.createIndex({ channelId: 1 });
db.tickets.createIndex({ userId: 1 });

db.shopitems.createIndex({ guildId: 1, itemId: 1 });

db.reactionroles.createIndex({ guildId: 1, messageId: 1 });

db.reminders.createIndex({ guildId: 1, userId: 1 });
db.reminders.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.giveaways.createIndex({ guildId: 1, status: 1 });
db.giveaways.createIndex({ endsAt: 1 });
db.giveaways.createIndex({ messageId: 1 });

db.starboardentries.createIndex({ guildId: 1, messageId: 1 }, { unique: true });
db.starboardentries.createIndex({ guildId: 1, starCount: -1, createdAt: -1 });
db.starboardentries.createIndex({ authorId: 1, guildId: 1, createdAt: -1 });

db.suggestions.createIndex({ guildId: 1, status: 1, createdAt: -1 });
db.suggestions.createIndex({ guildId: 1, authorId: 1, createdAt: -1 });
db.suggestions.createIndex({ messageId: 1 }, { unique: true });

db.auditlogs.createIndex({ guildId: 1, eventCategory: 1 });
db.auditlogs.createIndex({ guildId: 1, userId: 1 });
db.auditlogs.createIndex({ createdAt: -1 });
db.auditlogs.createIndex({ guildId: 1, createdAt: -1 });

// TTL indexes for automatic cleanup
db.reminders.createIndex({ remindAt: 1 }, { expireAfterSeconds: 0 });
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days default

print('Database initialization completed successfully!');
print('Collections created with validation and indexes.');