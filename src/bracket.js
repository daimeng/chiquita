import './bracket.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'

export function BracketMatch({ p1, p2, hidden, players, setPlayer, idx }) {
	return (
		<div className={`bracket-match ${hidden ? 'bracket-hidden' : ''}`}>
			{p1 != null
				? <div data-id={p1} data-idx={idx} onClick={setPlayer} className={`bracket-player ${players[idx] === p1 ? 'bracket-winner' : ''}`}>{playerById.get(p1).name}</div>
				: <div className="bracket-player"></div>
			}
			{p2 != null
				? <div data-id={p2} data-idx={idx} onClick={setPlayer} className={`bracket-player ${players[idx] === p2 ? 'bracket-winner' : ''}`}>{playerById.get(p2).name}</div>
				: <div className="bracket-player"></div>
			}
		</div>
	)
}

export function PrelimRound({ prelims, players, setPlayer }) {
	const matches = new Array(64)
	for (let i = 0; i < 64; i++) {
		if (prelims.has(i)) {
			let [a_id, x_id] = prelims.get(i).split(':')
			a_id = Number(a_id)
			x_id = Number(x_id)
			matches[i] = <BracketMatch key={i} hidden={false}
				p1={a_id}
				p2={x_id}
				idx={63 + i}
				players={players}
				setPlayer={setPlayer}
			/>
		} else {
			matches[i] = <BracketMatch key={i} hidden={true}
				p1={null}
				p2={null}
				idx={63 + i}
				players={players}
				setPlayer={setPlayer}
			/>
		}
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ r, players, setPlayer }) {
	const match_count = r / 2
	const base_idx = match_count - 1

	const matches = new Array(match_count)
	if (players) {
		for (let i = 0; i < match_count; i++) {
			const a_id = players[2 * i]
			const x_id = players[2 * i + 1]
			matches[i] = <BracketMatch
				key={i}
				p1={a_id}
				p2={x_id}
				idx={base_idx + i}
				players={players}
				setPlayer={setPlayer}
			/>
		}
	} else {
		for (let i = 0; i < match_count; i++) {
			matches[i] = <BracketMatch key={i} p1={null} p2={null} idx={0} players={players} />
		}
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

// winners is an Array of 0 or 1
export function Bracket({ players, setPlayer, draws }) {
	const [prelims, setPrelims] = useState(() => {
		const plims = new Map()
		for (let i = 0; i < draws.length; i++) {
			if (!Number.isInteger(draws[i])) {
				plims.set(i, draws[i])
			}
		}

		return plims
	})

	return (
		<>
			<div className="bracket">
				{prelims.size && <PrelimRound prelims={prelims} players={players.slice(127, 255)} setPlayer={setPlayer} />}
				<BracketRound r={64} key={6} players={players.slice(63, 127)} setPlayer={setPlayer} />
				<BracketRound r={32} key={5} players={players.slice(31, 63)} setPlayer={setPlayer} />
				<BracketRound r={16} key={4} players={players.slice(15, 31)} setPlayer={setPlayer} />
				<BracketRound r={8} key={3} players={players.slice(7, 15)} setPlayer={setPlayer} />
				<BracketRound r={4} key={2} players={players.slice(3, 7)} setPlayer={setPlayer} />
				<BracketRound r={2} key={1} players={players.slice(1, 3)} setPlayer={setPlayer} />
			</div>
		</>
	)
}

export function BracketCard({ hideBracket, hasPrelims = true }) {
	const draws = DRAWS.M
	const [players, setPlayers] = useState(() => {
		// check if prelims
		let len = 0
		for (let i = 1; i < draws.length; i *= 2) {
			len += i
		}
		const drawlen = len
		if (hasPrelims) len += 128

		const p = new Array(len).fill(null)
		for (let i = 0; i < draws.length; i++) {
			const idx = drawlen + i
			if (Number.isInteger(draws[i])) {
				p[idx] = draws[i]
			} else {
				const [a_id, x_id] = draws[i].split(':')
				p[idx * 2] = Number(a_id)
				p[idx * 2 + 1] = Number(x_id)
			}
		}

		return p
	})

	const setPlayer = useCallback((e) => {
		const { idx, id } = e.target.dataset
		setPlayers(p => {
			const n = [...p]

			const parent = Number(idx)
			console.log(id, parent, n[parent])
			// toggle off
			if (n[parent] === Number(id)) {
				n[parent] = null
			} else { // toggle on
				n[parent] = Number(id)
			}

			return n
		})
	}, [setPlayers])

	return (
		<div className="bracket-card card">
			<div className="card-header">
				<div className="card-close" onClick={hideBracket}>x</div>
			</div>
			<div className="card-content">
				<div>
					<Bracket players={players} draws={draws} setPlayer={setPlayer} />
				</div>
			</div>
		</div>
	)
}
