export function decodePlayers(datastring) {
    const packed = Uint8Array.from(atob(datastring), v => v.charCodeAt(0))
    const unpacked = new Uint8Array(packed.length * 4)
    for (let i = 0; i < packed.length; i++) {
        unpacked[i * 4 + 3] = (packed[i] & 3)
        unpacked[i * 4 + 2] = ((packed[i] >> 2) & 3)
        unpacked[i * 4 + 1] = ((packed[i] >> 4) & 3)
        unpacked[i * 4 + 0] = ((packed[i] >> 6) & 3)
    }
    return unpacked
}

export function encodePlayers(players) {
    const len = (players.length + 1) / 2
    const code = new Array(len).fill(2)

    for (let i = 1; i < len; i++) {
        if (players[2 * i - 1] === players[i - 1]) {
            code[i - 1] = 0
        } else if (players[2 * i] === players[i - 1]) {
            code[i - 1] = 1
        } else {
            code[i - 1] = 2
        }
    }
    const packed = new Uint8Array(len / 4)
    for (let i = 0; i < len / 4; i++) {
        packed[i] |= (code[i * 4 + 0] << 6)
        packed[i] |= (code[i * 4 + 1] << 4)
        packed[i] |= (code[i * 4 + 2] << 2)
        packed[i] |= (code[i * 4 + 3])
    }
    return btoa(String.fromCharCode.apply(null, packed))
}

