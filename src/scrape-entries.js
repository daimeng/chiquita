function scrape() {
    const entries = []
    const comments = document.querySelectorAll('shreddit-comment')

    for (let i = 0; i < comments.length; i++) {
        const times = comments[i].querySelectorAll('time')
        const latest = times[times.length - 1]

        const entry = {
            user: comments[i].__author,
            updated_at: latest.dateTime,
        }

        const text = comments[i].querySelector('#-post-rtjson-content').innerText
        const M = text.match(/M:([\w+=]+)/)
        const W = text.match(/W:([\w+=]+)/)
        const X = text.match(/X:([\w+=]+)/)
        const MT = text.match(/MT:([\w+=]+)/)
        const WT = text.match(/WT:([\w+=]+)/)
        if (M) entry.M = M[1]
        if (W) entry.W = W[1]
        if (X) entry.X = X[1]
        if (MT) entry.MT = MT[1]
        if (WT) entry.WT = WT[1]

        entries.append(entry)
    }
    return entries
}
