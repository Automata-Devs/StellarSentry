$files = @(
    "src\utils\logger.js",
    "src\utils\helpers.js",
    "src\utils\cache.js",
    "src\services\music.service.js",
    "src\loaders\routeLoader.js",
    "src\services\guild.service.js",
    "src\loaders\eventLoader.js",
    "src\loaders\commandLoader.js",
    "src\loaders\componentLoader.js",
    "src\database\models\Warning.js",
    "src\database\models\Suggestion.js",
    "src\database\models\Ticket.js",
    "src\database\models\User.js",
    "src\database\models\ReactionRole.js",
    "src\database\models\StarboardEntry.js",
    "src\database\models\Guild.js",
    "src\database\models\Giveaway.js",
    "src\database\models\AuditLog.js",
    "src\dashboard\routes\welcome.routes.js",
    "src\dashboard\server\server.js",
    "src\dashboard\routes\overview.routes.js",
    "src\dashboard\routes\moderation.routes.js",
    "src\dashboard\routes\home.routes.js",
    "src\dashboard\routes\leveling.routes.js",
    "src\dashboard\routes\health.routes.js",
    "src\dashboard\routes\guilds.routes.js",
    "src\dashboard\routes\auth.routes.js",
    "src\dashboard\middleware\guildAccess.js",
    "src\dashboard\middleware\rateLimit.js",
    "src\dashboard\routes\api\index.routes.js",
    "src\core\cooldowns.js",
    "src\core\index.js",
    "src\dashboard\middleware\auth.js",
    "src\dashboard\middleware\csrf.js",
    "src\dashboard\middleware\errorHandler.js",
    "src\core\client.js",
    "src\config\constants.js",
    "src\bot\events\client\ready.js",
    "src\bot\components\buttons\suggestion.js",
    "src\bot\components\buttons\music.js",
    "src\bot\commands\music\seek.js",
    "src\bot\commands\moderation\timeout.js",
    "src\bot\commands\leveling\setxp.js",
    "src\bot\commands\moderation\slowmode.js",
    "src\bot\commands\leveling\leaderboard.js",
    "src\bot\commands\general\botinfo.js",
    "src\bot\commands\economy\leaderboard.js",
    "src\bot\commands\admin\reload.js",
    "src\bot\commands\admin\config.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match '<<<<<<< HEAD') {
            # Resolve by keeping HEAD version (between <<<<<<< HEAD and =======)
            $resolved = $content -replace '(?s)<<<<<<< HEAD\s*(.*?)\s*=======\s*.*?\s*>>>>>>>.*?\n', '$1'
            $resolved = $resolved -replace '(?s)<<<<<<< HEAD\s*(.*?)\s*=======\s*.*?\s*>>>>>>>.*?$', '$1'
            Set-Content -Path $file -Value $resolved
            Write-Host "Resolved: $file"
        } else {
            Write-Host "No conflicts in: $file"
        }
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done resolving conflicts!"
