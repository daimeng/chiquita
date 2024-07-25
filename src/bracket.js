import './bracket.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DRAWS from './draws2024.json'
import { playerById } from './idb'

export function BracketMatch({ p1, p2, players, setPlayer, idx }) {
	if (p1 === 0 || p2 === 0) {
		return (
			<div className="bracket-match bracket-hidden">
				<div className="bracket-player"></div>
				<div className="bracket-player"></div>
			</div>
		)
	}
	return (
		<div className="bracket-match">
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

// [0, 1, 1, 2, 2, 2, 2]
// 0, 1, 3, 7
export function BracketRound({ r, players, setPlayer }) {
	const match_count = r / 2
	const base_idx = match_count - 1

	const matches = new Array(match_count)
	for (let i = 0; i < match_count; i++) {
		const a_id = players[r - 1 + 2 * i]
		const x_id = players[r + 2 * i]
		matches[i] = <BracketMatch
			key={i}
			p1={a_id}
			p2={x_id}
			idx={base_idx + i}
			players={players}
			setPlayer={setPlayer}
		/>
	}

	return (
		<div className="bracket-round">
			{matches}
		</div>
	)
}

// winners is an Array of 0 or 1
export function Bracket({ players, setPlayer }) {
	return (
		<>
			<div className="bracket">
				<BracketRound r={128} key={7} players={players} setPlayer={setPlayer} />
				<BracketRound r={64} key={6} players={players} setPlayer={setPlayer} />
				<BracketRound r={32} key={5} players={players} setPlayer={setPlayer} />
				<BracketRound r={16} key={4} players={players} setPlayer={setPlayer} />
				<BracketRound r={8} key={3} players={players} setPlayer={setPlayer} />
				<BracketRound r={4} key={2} players={players} setPlayer={setPlayer} />
				<BracketRound r={2} key={1} players={players} setPlayer={setPlayer} />
			</div>
		</>
	)
}

export function BracketCard({ hideBracket, hasPrelims = true }) {
	const draws = DRAWS.M
	const [players, setPlayers] = useState(() => {
		// check if prelims
		let len = 0
		for (let i = 1; i <= draws.length; i *= 2) {
			len += i
		}
		// 1 + 2 + 4 + 8 + 16 + 32
		const draw_idx = draws.length - 1

		const p = new Array(len).fill(null)
		if (hasPrelims) {
			p.push(...new Array(128).fill(0))
		}

		for (let i = 0; i < draws.length; i++) {
			const idx = draw_idx + i
			if (Number.isInteger(draws[i])) {
				p[idx] = draws[i]
			} else {
				const [a_id, x_id] = draws[i].split(':')
				p[idx] = null
				p[idx * 2 + 1] = Number(a_id)
				p[idx * 2 + 2] = Number(x_id)
			}
		}
		return p
	})

	const setPlayer = useCallback((e) => {
		const { idx, id } = e.target.dataset
		setPlayers(p => {
			const n = [...p]

			let parent = Number(idx)
			while (parent >= 0) {
				const replaced = n[parent]
				// toggle off
				if (n[parent] === Number(id)) {
					n[parent] = null
				} else { // toggle on
					n[parent] = Number(id)
				}
				// don't fill to root
				if (replaced == null) break

				// check if parent is same as replaced
				parent = Math.floor((parent - 1) / 2)
				if (n[parent] != replaced) break
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
