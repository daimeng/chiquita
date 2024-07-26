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

export function playersFromDraw(draws) {
    // 1 + 2 + 4 + 8 + 16 + 32
    const draw_idx = draws.length - 1

    const p = new Array(draws.length * 2 - 1).fill(null)

    // add prelims
    p.push(...new Array(draws.length * 2).fill(0))

    for (let i = 0; i < draws.length; i++) {
        const idx = draw_idx + i
        if (Array.isArray(draws[i])) {
            const [a_id, x_id] = draws[i]
            p[idx] = null
            p[idx * 2 + 1] = String(a_id)
            p[idx * 2 + 2] = String(x_id)
        } else {
            p[idx] = String(draws[i])
        }
    }

    return p
}

export function hydratePlayers(p, data) {
    const winners = decodePlayers(data)

    // apply winners from bottom up in reverse
    for (let i = winners.length - 1; i >= 0; i--) {
        if (winners[i] !== 2) {
            p[i] = p[2 * i + 1 + winners[i]]
        }
    }
}

