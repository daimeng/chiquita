export function decodePlayers(datastring) {
    return Uint8Array.from(atob(datastring), v => v.charCodeAt(0))
}

export function encodePlayers(players) {
    const len = (players.length + 1) / 2
    const code = new Uint8Array(len)

    for (let i = 1; i < len; i++) {
        if (players[2 * i - 1] === players[i - 1]) {
            code[i - 1] = 0
        } else if (players[2 * i] === players[i - 1]) {
            code[i - 1] = 1
        } else {
            code[i - 1] = 2
        }
    }

    return btoa(String.fromCharCode.apply(null, code))
}

