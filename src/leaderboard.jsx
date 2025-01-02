import { ISO3to2 } from "./country-map"
import { playerById } from "./idb"

export function SinglesWinners({ p, idx, event, onClick, scores }) {
    return <td data-idx={idx} data-event={event} onClick={onClick}>
        <div>
            {p[0] && <span className={`fi fi-${ISO3to2[playerById.get(Number(p[0])).org]} fis`}></span>}
            {' '}
            {p[0] && playerById.get(Number(p[0])).name}
        </div>
        {p[1] !== p[0] && <div>
            {p[1] && <span className={`fi fi-${ISO3to2[playerById.get(Number(p[1])).org]} fis`}></span>}
            {' '}
            {p[1] && playerById.get(Number(p[1])).name}
        </div>}
        {p[2] !== p[0] && <div>
            {p[2] && <span className={`fi fi-${ISO3to2[playerById.get(Number(p[2])).org]} fis`}></span>}
            {' '}
            {p[2] && playerById.get(Number(p[2])).name}
        </div>}
        <div className="score">
            Score: {scores[idx][event]}
        </div>
    </td>
}

const LASTNAME = /([A-Z'-\s]+)/
export function DoublesWinners({ p, idx, event, onClick, scores }) {
    let a, a2, b, b2
    if (p[0]) {
        const [a_id, b_id] = p[0].split(':')
        a = playerById.get(Number(a_id))
        b = playerById.get(Number(b_id))
    }

    let second = null
    if (p[1] && p[1] !== p[0]) {
        const [a_id, b_id] = p[1].split(':')
        a2 = playerById.get(Number(a_id))
        b2 = playerById.get(Number(b_id))
        second = <div>
            <span className={`fi fi-${ISO3to2[a2.org]} fis`}></span>
            {' '}
            {a2.name.match(LASTNAME)[1]}/{b2.name.match(LASTNAME)[1]}
        </div>
    }

    if (p[2] && p[2] !== p[0]) {
        const [a_id, b_id] = p[2].split(':')
        a2 = playerById.get(Number(a_id))
        b2 = playerById.get(Number(b_id))
        second = <div>
            <span className={`fi fi-${ISO3to2[a2.org]} fis`}></span>
            {' '}
            {a2.name.match(LASTNAME)[1]}/{b2.name.match(LASTNAME)[1]}
        </div>
    }

    return <td data-idx={idx} data-event={event} onClick={onClick}>
        <div>
            {p[0] && <span className={`fi fi-${ISO3to2[a.org]} fis`}></span>}
            {' '}
            {p[0] && `${a.name.match(LASTNAME)[1]}/${b.name.match(LASTNAME)[1]}`}
        </div>
        {second}
        <div className="score">
            Score: {scores[idx][event]}
        </div>
    </td>
}

export function TeamWinners({ p, idx, event, onClick, scores }) {
    return <td data-idx={idx} data-event={event} onClick={onClick}>
        <div>
            {p[0] && <span className={`fi fi-${ISO3to2[p[0]]} fis`}></span>}
            {' '}
            {p[0]}
        </div>
        {p[0] !== p[1] && <div>
            {p[1] && <span className={`fi fi-${ISO3to2[p[1]]} fis`}></span>}
            {' '}
            {p[1]}
        </div>}
        {p[0] !== p[2] && <div>
            {p[2] && <span className={`fi fi-${ISO3to2[p[2]]} fis`}></span>}
            {' '}
            {p[2]}
        </div>}
        <div className="score">
            Score: {scores[idx][event]}
        </div>
    </td>

}