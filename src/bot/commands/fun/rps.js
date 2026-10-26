/**
 * RPS Command - Play Rock Paper Scissors
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

const choices = [
  { name: 'Rock', emoji: '🪨', value: 'rock', beats: 'scissors' },
  { name: 'Paper', emoji: '📄', value: 'paper', beats: 'rock' },
  { name: 'Scissors', emoji: '✂️', value: 'scissors', beats: 'paper' },
];

export default {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('Play against another user (default: bot)')
        .setRequired(false)
    ),

  category: 'fun',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const opponent = interaction.options.getUser('opponent');

    if (opponent && opponent.bot) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You cannot play against a bot!`,
        ephemeral: true,
      });
    }

    if (opponent && opponent.id === interaction.user.id) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You cannot play against yourself!`,
        ephemeral: true,
      });
    }

    if (opponent) {
      // Two-player mode
      await startTwoPlayerGame(interaction, opponent);
    } else {
      // Single player vs bot
      await startSinglePlayerGame(interaction);
    }
  },
};

async function startSinglePlayerGame(interaction) {
  const row = new ActionRowBuilder().addComponents(
    choices.map(c => new ButtonBuilder()
      .setCustomId(`rps_bot_${c.value}`)
      .setLabel(c.name)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(c.emoji)
    )
  );

  const embed = {
    title: `${EMOJIS.INFO} Rock Paper Scissors`,
    color: COLORS.PRIMARY,
    description: `Choose your move! You're playing against **StellarSentry**.`,
    timestamp: new Date(),
    footer: { text: `Challenge by ${interaction.user.tag}` },
  };

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    filter: i => i.user.id === interaction.user.id && i.customId.startsWith('rps_bot_'),
  });

  collector.on('collect', async i => {
    const playerChoice = i.customId.split('_')[2];
    await playSinglePlayerRound(i, playerChoice);
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      choices.map(c => new ButtonBuilder()
        .setCustomId(`rps_bot_${c.value}_disabled`)
        .setLabel(c.name)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(c.emoji)
        .setDisabled(true)
      )
    );
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

async function playSinglePlayerRound(interaction, playerChoice) {
  const player = choices.find(c => c.value === playerChoice);
  const botChoice = choices[Math.floor(Math.random() * choices.length)];

  let result;
  if (player.value === botChoice.value) {
    result = 'tie';
  } else if (player.beats === botChoice.value) {
    result = 'win';
  } else {
    result = 'lose';
  }

  const resultText = {
    win: 'You win! 🎉',
    lose: 'You lose! 😢',
    tie: "It's a tie! 🤝",
  }[result];

  const resultColor = {
    win: COLORS.SUCCESS,
    lose: COLORS.ERROR,
    tie: COLORS.WARNING,
  }[result];

  const embed = {
    title: `${EMOJIS.INFO} Rock Paper Scissors - Result`,
    color: resultColor,
    fields: [
      { name: 'You', value: `${player.emoji} ${player.name}`, inline: true },
      { name: 'StellarSentry', value: `${botChoice.emoji} ${botChoice.name}`, inline: true },
      { name: 'Result', value: resultText, inline: false },
    ],
    timestamp: new Date(),
  };

  const row = new ActionRowBuilder().addComponents(
    choices.map(c => new ButtonBuilder()
      .setCustomId(`rps_bot_${c.value}`)
      .setLabel(c.name)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(c.emoji)
    ),
    new ButtonBuilder()
      .setCustomId('rps_quit')
      .setLabel('Quit')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🛑')
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function startTwoPlayerGame(interaction, opponent) {
  // Send challenge to opponent
  const challengeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps_accept_${interaction.user.id}_${opponent.id}`)
      .setLabel('Accept Challenge')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`rps_decline_${interaction.user.id}_${opponent.id}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const challengeEmbed = {
    title: `${EMOJIS.INFO} Rock Paper Scissors Challenge!`,
    color: COLORS.PRIMARY,
    description: `${opponent} has been challenged by ${interaction.user}!\nDo you accept?`,
    timestamp: new Date(),
  };

  await interaction.reply({
    embeds: [challengeEmbed],
    components: [challengeRow],
    fetchReply: true,
  });

  // Wait for acceptance
  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    filter: i => i.user.id === opponent.id && (i.customId.startsWith('rps_accept_') || i.customId.startsWith('rps_decline_')),
  });

  collector.on('collect', async i => {
    if (i.customId.startsWith('rps_decline_')) {
      await i.update({
        content: `${opponent} declined the challenge.`,
        embeds: [],
        components: [],
      });
      collector.stop();
      return;
    }

    // Accepted - start the game
    await i.update({
      content: `${opponent} accepted! Both players choose your moves.`,
      embeds: [],
      components: [],
    });

    // Start the two-player game
    await playTwoPlayerGame(interaction.channel, interaction.user, opponent, i.message);
  });

  collector.on('end', async () => {
    await interaction.editReply({
      content: 'Challenge expired.',
      embeds: [],
      components: [],
    }).catch(() => {});
  });
}

async function playTwoPlayerGame(channel, player1, player2, challengeMessage) {
  const moves = new Map();
  const gameMessage = await channel.send({
    embeds: [{
      title: `${EMOJIS.INFO} Rock Paper Scissors - ${player1.username} vs ${player2.username}`,
      color: COLORS.PRIMARY,
      description: 'Both players, choose your moves!',
      fields: [
        { name: player1.username, value: '❓ Waiting...', inline: true },
        { name: player2.username, value: '❓ Waiting...', inline: true },
      ],
      timestamp: new Date(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        choices.map(c => new ButtonBuilder()
          .setCustomId(`rps_2p_${player1.id}_${player2.id}_${c.value}`)
          .setLabel(c.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(c.emoji)
        )
      ),
    ],
  });

  const collector = gameMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: i => [player1.id, player2.id].includes(i.user.id) && i.customId.startsWith('rps_2p_'),
  });

  collector.on('collect', async i => {
    const [, p1Id, p2Id, move] = i.customId.split('_');
    const player = i.user.id === p1Id ? player1 : player2;
    const other = i.user.id === p1Id ? player2 : player1;

    if (moves.has(i.user.id)) {
      return i.reply({ content: 'You already chose!', ephemeral: true });
    }

    const choice = choices.find(c => c.value === move);
    moves.set(i.user.id, choice);

    // Update embed
    const p1Move = moves.get(player1.id);
    const p2Move = moves.get(player2.id);

    const embed = {
      title: `${EMOJIS.INFO} Rock Paper Scissors - ${player1.username} vs ${player2.username}`,
      color: COLORS.PRIMARY,
      description: moves.size === 2 ? 'Both players chose! Revealing...' : 'Waiting for both players...',
      fields: [
        { name: player1.username, value: p1Move ? `${p1Move.emoji} Chosen` : '❓ Waiting...', inline: true },
        { name: player2.username, value: p2Move ? `${p2Move.emoji} Chosen` : '❓ Waiting...', inline: true },
      ],
      timestamp: new Date(),
    };

    await i.update({ embeds: [embed] });

    if (moves.size === 2) {
      collector.stop();

      // Determine winner
      const p1Choice = moves.get(player1.id);
      const p2Choice = moves.get(player2.id);

      let result;
      if (p1Choice.value === p2Choice.value) {
        result = 'tie';
      } else if (p1Choice.beats === p2Choice.value) {
        result = 'p1';
      } else {
        result = 'p2';
      }

      const resultEmbed = {
        title: `${EMOJIS.INFO} Rock Paper Scissors - Result`,
        color: result === 'tie' ? COLORS.WARNING : COLORS.SUCCESS,
        fields: [
          { name: player1.username, value: `${p1Choice.emoji} ${p1Choice.name}`, inline: true },
          { name: player2.username, value: `${p2Choice.emoji} ${p2Choice.name}`, inline: true },
          { name: 'Result', value: result === 'tie'
            ? "It's a tie! 🤝"
            : result === 'p1'
              ? `${player1} wins! 🎉`
              : `${player2} wins! 🎉`, inline: false },
        ],
        timestamp: new Date(),
      };

      await gameMessage.edit({ embeds: [resultEmbed], components: [] });
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && moves.size < 2) {
      await gameMessage.edit({
        content: 'Game timed out - not all players chose.',
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  });
}