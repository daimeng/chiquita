export function scoreBracket(players, results) {
    let points = 0

    for (let i = 0; i < players.length; i++) {
        // game not played yet
        if (results[i] === null || results[i] === 0) continue

        if (results[i] === players[i]) {
            points += 1
        }
    }

    return points
}
